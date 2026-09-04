import { Injectable } from '@nestjs/common';
import type {
  MemberDetailDto,
  MemberListQuery,
  MemberReportSummaryDto,
  MemberSummaryDto,
  TreeKind,
  TreeQuery,
  TreeResponse,
} from '@ptg/types';
import { TREE } from '@ptg/config';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  buildPaginationMeta,
  paginationArgs,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { assembleTree, type RelationshipRow } from './tree.util.js';
import { ROOT_LOCATION, computeChildLocation, descendantPrefix, isWithinSubtree, rebasePath } from './path.util.js';

const MEMBER_SELECT = {
  id: true,
  memberId: true,
  fullName: true,
  displayName: true,
  avatarUrl: true,
} as const;

const PARTNER_SELECT = {
  membershipStatus: true,
  rank: true,
  level: true,
  joinedAt: true,
} as const;

/**
 * Prisma rejects `select` and `include` on the same object, so the partner
 * profile has to be selected as a relation *inside* the member select rather
 * than included alongside it.
 */
const MEMBER_WITH_PARTNER_SELECT = {
  ...MEMBER_SELECT,
  partnerProfile: { select: PARTNER_SELECT },
} as const;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- tree reads --------------------------------------------------------------

  async getTree(kind: TreeKind, requesterId: string, query: TreeQuery): Promise<TreeResponse> {
    const rootMemberId = query.rootMemberId ?? requesterId;
    const depth = Math.min(query.depth ?? TREE.defaultDepth, TREE.maxDepth);

    const rootRow = await this.findRelationshipRow(kind, rootMemberId);
    if (!rootRow) throw new ApiException('MEMBER_NOT_FOUND', 'Member not found.');

    const prefix = descendantPrefix({ path: rootRow.path, depth: rootRow.depth }, rootMemberId);
    const maxDepthAbsolute = rootRow.depth + depth;

    const descendants = await this.findDescendantRows(kind, prefix, maxDepthAbsolute, query.status, query.search);

    if (descendants.length > TREE.maxTraversalNodes) {
      throw new ApiException(
        'TREE_DEPTH_EXCEEDED',
        `This subtree is too large to render in one request (limit ${TREE.maxTraversalNodes} nodes). Narrow the search or reduce the depth.`,
      );
    }

    const boundaryIds = descendants.filter((row) => row.depth === maxDepthAbsolute).map((row) => row.memberId);
    const boundaryHasChildren = await this.anyChildrenExist(kind, boundaryIds);

    const { root, totalNodes } = assembleTree(rootRow, descendants, depth, boundaryHasChildren);
    return { kind, root, maxDepth: depth, totalNodes };
  }

  private async findRelationshipRow(kind: TreeKind, memberId: string): Promise<RelationshipRow | null> {
    if (kind === 'SPONSOR') {
      const row = await this.prisma.sponsorRelationship.findUnique({
        where: { memberId },
        include: { member: { select: MEMBER_SELECT, }, },
      });
      if (!row) return null;
      const partnerProfile = await this.prisma.partnerProfile.findUnique({ where: { userId: memberId }, select: PARTNER_SELECT });
      return { memberId: row.memberId, parentId: row.sponsorId, path: row.path, depth: row.depth, user: row.member, partnerProfile };
    }
    const row = await this.prisma.placementRelationship.findUnique({
      where: { memberId },
      include: { member: { select: MEMBER_SELECT } },
    });
    if (!row) return null;
    const partnerProfile = await this.prisma.partnerProfile.findUnique({ where: { userId: memberId }, select: PARTNER_SELECT });
    return { memberId: row.memberId, parentId: row.placementParentId, path: row.path, depth: row.depth, user: row.member, partnerProfile };
  }

  private async findDescendantRows(
    kind: TreeKind,
    pathPrefix: string,
    maxDepthAbsolute: number,
    status?: string,
    search?: string,
  ): Promise<RelationshipRow[]> {
    const memberFilter = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { memberId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;
    const partnerFilter = status ? { partnerProfile: { membershipStatus: status as never } } : undefined;

    if (kind === 'SPONSOR') {
      const rows = await this.prisma.sponsorRelationship.findMany({
        where: { path: { startsWith: pathPrefix }, depth: { lte: maxDepthAbsolute }, member: { ...memberFilter, ...partnerFilter } },
        include: { member: { select: MEMBER_WITH_PARTNER_SELECT } },
        orderBy: { depth: 'asc' },
        take: TREE.maxTraversalNodes + 1,
      });
      return rows.map((row) => ({
        memberId: row.memberId,
        parentId: row.sponsorId,
        path: row.path,
        depth: row.depth,
        user: row.member,
        partnerProfile: row.member.partnerProfile,
      }));
    }

    const rows = await this.prisma.placementRelationship.findMany({
      where: { path: { startsWith: pathPrefix }, depth: { lte: maxDepthAbsolute }, member: { ...memberFilter, ...partnerFilter } },
      include: { member: { select: MEMBER_WITH_PARTNER_SELECT } },
      orderBy: { depth: 'asc' },
      take: TREE.maxTraversalNodes + 1,
    });
    return rows.map((row) => ({
      memberId: row.memberId,
      parentId: row.placementParentId,
      path: row.path,
      depth: row.depth,
      user: row.member,
      partnerProfile: row.member.partnerProfile,
    }));
  }

  private async anyChildrenExist(kind: TreeKind, memberIds: string[]): Promise<Set<string>> {
    if (memberIds.length === 0) return new Set();
    if (kind === 'SPONSOR') {
      const rows = await this.prisma.sponsorRelationship.findMany({
        where: { sponsorId: { in: memberIds } },
        select: { sponsorId: true },
        distinct: ['sponsorId'],
      });
      return new Set(rows.map((r) => r.sponsorId).filter((id): id is string => Boolean(id)));
    }
    const rows = await this.prisma.placementRelationship.findMany({
      where: { placementParentId: { in: memberIds } },
      select: { placementParentId: true },
      distinct: ['placementParentId'],
    });
    return new Set(rows.map((r) => r.placementParentId).filter((id): id is string => Boolean(id)));
  }

  // --- directory / detail --------------------------------------------------------

  async listMembers(requesterId: string, canViewAll: boolean, query: MemberListQuery): Promise<PaginatedResult<MemberSummaryDto>> {
    const kind = query.tree ?? 'SPONSOR';
    let pathScope: { path: string; prefixId: string } | null = null;

    if (query.parentMemberId) {
      const row = await this.findRelationshipRow(kind, query.parentMemberId);
      if (!row) throw new ApiException('MEMBER_NOT_FOUND', 'Member not found.');
      pathScope = { path: descendantPrefix({ path: row.path, depth: row.depth }, query.parentMemberId), prefixId: query.parentMemberId };
    } else if (!canViewAll) {
      const row = await this.findRelationshipRow(kind, requesterId);
      if (row) pathScope = { path: descendantPrefix({ path: row.path, depth: row.depth }, requesterId), prefixId: requesterId };
    }

    const where = {
      ...(pathScope ? { path: { startsWith: pathScope.path } } : {}),
      ...(query.status ? { member: { partnerProfile: { membershipStatus: query.status } } } : {}),
      ...(query.search
        ? {
            member: {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' as const } },
                { memberId: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const delegate = kind === 'SPONSOR' ? this.prisma.sponsorRelationship : this.prisma.placementRelationship;
    const [rows, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (delegate as any).findMany({
        where,
        include: { member: { select: MEMBER_WITH_PARTNER_SELECT } },
        orderBy: { depth: 'asc' },
        ...paginationArgs(query),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (delegate as any).count({ where }),
    ]);

    const items: MemberSummaryDto[] = (rows as Array<{ member: { id: string; memberId: string; fullName: string; displayName: string; avatarUrl: string | null; partnerProfile: { membershipStatus: string; rank: string | null; level: number; joinedAt: Date | null } | null }; depth: number; memberId: string }>).map((row) => ({
      id: row.member.id,
      memberId: row.member.memberId,
      fullName: row.member.fullName,
      displayName: row.member.displayName,
      avatarUrl: row.member.avatarUrl,
      membershipStatus: (row.member.partnerProfile?.membershipStatus as MemberSummaryDto['membershipStatus']) ?? 'PENDING',
      rank: row.member.partnerProfile?.rank ?? null,
      level: row.member.partnerProfile?.level ?? 0,
      joinedAt: row.member.partnerProfile?.joinedAt?.toISOString() ?? null,
      depth: row.depth,
      directChildCount: 0,
    }));

    return { items, pagination: buildPaginationMeta(query, total) };
  }

  async getMemberDetail(memberId: string): Promise<MemberDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
      include: { partnerProfile: true },
    });
    if (!user) throw new ApiException('MEMBER_NOT_FOUND', 'Member not found.');

    const [sponsorRel, placementRel, directSponsorCount, totalSponsorDownline, orderCount, pointsWallet] = await Promise.all([
      this.prisma.sponsorRelationship.findUnique({ where: { memberId }, include: { sponsor: { select: MEMBER_SELECT } } }),
      this.prisma.placementRelationship.findUnique({ where: { memberId }, include: { placementParent: { select: MEMBER_SELECT } } }),
      this.prisma.sponsorRelationship.count({ where: { sponsorId: memberId } }),
      sponsorRel_countDownline(this.prisma, memberId),
      this.prisma.order.count({ where: { userId: memberId } }),
      this.prisma.wallet.findUnique({ where: { userId_type: { userId: memberId, type: 'PERSONAL_POINTS' } } }),
    ]);

    return {
      id: user.id,
      memberId: user.memberId,
      fullName: user.fullName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      country: null,
      avatarUrl: user.avatarUrl,
      membershipStatus: user.partnerProfile?.membershipStatus ?? 'PENDING',
      rank: user.partnerProfile?.rank ?? null,
      level: user.partnerProfile?.level ?? 0,
      joinedAt: user.partnerProfile?.joinedAt?.toISOString() ?? null,
      depth: sponsorRel?.depth ?? 0,
      directChildCount: directSponsorCount,
      sponsor: sponsorRel?.sponsor
        ? { ...sponsorRel.sponsor, membershipStatus: 'ACTIVE', rank: null, level: 0, joinedAt: null, depth: 0, directChildCount: 0 }
        : null,
      placementParent: placementRel?.placementParent
        ? { ...placementRel.placementParent, membershipStatus: 'ACTIVE', rank: null, level: 0, joinedAt: null, depth: 0, directChildCount: 0 }
        : null,
      stats: {
        directMemberCount: directSponsorCount,
        totalDownlineCount: totalSponsorDownline,
        orderCount,
        personalPoints: Number(pointsWallet?.balanceMinor ?? 0n),
      },
    };
  }

  async getMemberReport(memberId: string, from?: string, to?: string): Promise<MemberReportSummaryDto> {
    const detail = await this.getMemberDetail(memberId);
    const dateFilter = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

    const [newMembersInPeriod, fulfillmentOrderCount, placementRel] = await Promise.all([
      this.prisma.sponsorRelationship.count({
        where: { path: { startsWith: descendantPrefix({ path: '.', depth: 0 }, memberId) }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      }),
      this.prisma.order.count({ where: { userId: memberId, status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } } }),
      this.prisma.placementRelationship.findUnique({ where: { memberId } }),
    ]);

    return {
      joinedAt: detail.joinedAt,
      membershipStatus: detail.membershipStatus,
      rank: detail.rank,
      level: detail.level,
      directMemberCount: detail.stats.directMemberCount,
      totalDownlineCount: detail.stats.totalDownlineCount,
      newMembersInPeriod,
      fulfillmentOrderCount,
      sponsorTreeDepth: detail.depth,
      placementTreeDepth: placementRel?.depth ?? 0,
    };
  }

  // --- relationship management (admin) --------------------------------------------

  async initializeRelationships(memberId: string, sponsorId: string | null, placementParentId: string | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const sponsorLocation = sponsorId
        ? computeChildLocation(await this.locationOrThrow(tx.sponsorRelationship, sponsorId, 'SPONSOR_NOT_FOUND'), sponsorId)
        : ROOT_LOCATION;
      await tx.sponsorRelationship.create({
        data: { memberId, sponsorId, path: sponsorLocation.path, depth: sponsorLocation.depth },
      });

      const placementLocation = placementParentId
        ? computeChildLocation(
            await this.locationOrThrow(tx.placementRelationship, placementParentId, 'PLACEMENT_PARENT_NOT_FOUND'),
            placementParentId,
          )
        : ROOT_LOCATION;
      await tx.placementRelationship.create({
        data: { memberId, placementParentId, path: placementLocation.path, depth: placementLocation.depth },
      });
    });
  }

  /**
   * SponsorRelationship and PlacementRelationship are structurally identical
   * but Prisma generates unrelated delegate types for them, so there is no
   * shared interface to type this against without duplicating the method
   * body twice. The `any` casts below are confined to this one method.
   */
  async reassignParent(kind: TreeKind, memberId: string, newParentId: string | null): Promise<void> {
    const delegate = kind === 'SPONSOR' ? this.prisma.sponsorRelationship : this.prisma.placementRelationship;
    const parentField = kind === 'SPONSOR' ? 'sponsorId' : 'placementParentId';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (delegate as any).findUnique({ where: { memberId } });
    if (!member) throw new ApiException('MEMBER_NOT_FOUND', 'Member not found.');

    const oldLocation = { path: member.path, depth: member.depth };
    let newLocation = ROOT_LOCATION;

    if (newParentId) {
      if (newParentId === memberId) throw new ApiException('CIRCULAR_RELATIONSHIP', 'A member cannot sponsor themself.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newParent = await (delegate as any).findUnique({ where: { memberId: newParentId } });
      if (!newParent) throw new ApiException('SPONSOR_NOT_FOUND', 'The new parent member was not found.');
      if (isWithinSubtree(oldLocation, memberId, { path: newParent.path, depth: newParent.depth }, newParentId)) {
        throw new ApiException('CIRCULAR_RELATIONSHIP', 'A member cannot be placed under their own descendant.');
      }
      newLocation = computeChildLocation({ path: newParent.path, depth: newParent.depth }, newParentId);
    }

    const oldPrefix = descendantPrefix(oldLocation, memberId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const descendants: Array<{ memberId: string; path: string; depth: number }> = await (delegate as any).findMany({
      where: { path: { startsWith: oldPrefix } },
      select: { memberId: true, path: true, depth: true },
      take: TREE.maxTraversalNodes + 1,
    });
    if (descendants.length > TREE.maxTraversalNodes) {
      throw new ApiException('TREE_DEPTH_EXCEEDED', 'This member has too many descendants to reassign in one operation.');
    }

    await this.prisma.$transaction(async (tx) => {
      const d = kind === 'SPONSOR' ? tx.sponsorRelationship : tx.placementRelationship;
      await (d as never as typeof this.prisma.sponsorRelationship).update({
        where: { memberId },
        data: { [parentField]: newParentId, path: newLocation.path, depth: newLocation.depth } as never,
      });
      for (const descendant of descendants) {
        const rebased = rebasePath(descendant.path, descendant.depth, oldLocation, memberId, newLocation, memberId);
        await (d as never as typeof this.prisma.sponsorRelationship).update({
          where: { memberId: descendant.memberId },
          data: { path: rebased.path, depth: rebased.depth } as never,
        });
      }
    });
  }

  private async locationOrThrow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: any,
    memberId: string,
    notFoundCode: 'SPONSOR_NOT_FOUND' | 'PLACEMENT_PARENT_NOT_FOUND',
  ): Promise<{ path: string; depth: number }> {
    const row = await delegate.findUnique({ where: { memberId } });
    if (!row) throw new ApiException(notFoundCode, 'The specified parent member was not found.');
    return { path: row.path, depth: row.depth };
  }
}

async function sponsorRel_countDownline(prisma: PrismaService, memberId: string): Promise<number> {
  const self = await prisma.sponsorRelationship.findUnique({ where: { memberId } });
  if (!self) return 0;
  const prefix = descendantPrefix({ path: self.path, depth: self.depth }, memberId);
  return prisma.sponsorRelationship.count({ where: { path: { startsWith: prefix } } });
}
