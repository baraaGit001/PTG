import type { MemberSummaryDto, TreeNodeDto } from '@ptg/types';

export interface RelationshipRow {
  memberId: string;
  parentId: string | null;
  path: string;
  depth: number;
  user: {
    id: string;
    memberId: string;
    fullName: string;
    displayName: string;
    avatarUrl: string | null;
  };
  partnerProfile: {
    membershipStatus: MemberSummaryDto['membershipStatus'];
    rank: string | null;
    level: number;
    joinedAt: Date | null;
  } | null;
}

function toSummary(row: RelationshipRow, relativeDepth: number, directChildCount: number): MemberSummaryDto {
  return {
    id: row.user.id,
    memberId: row.user.memberId,
    fullName: row.user.fullName,
    displayName: row.user.displayName,
    avatarUrl: row.user.avatarUrl,
    membershipStatus: row.partnerProfile?.membershipStatus ?? 'PENDING',
    rank: row.partnerProfile?.rank ?? null,
    level: row.partnerProfile?.level ?? 0,
    joinedAt: row.partnerProfile?.joinedAt?.toISOString() ?? null,
    depth: relativeDepth,
    directChildCount,
  };
}

/**
 * Builds a `TreeNodeDto` tree from a flat list of descendant rows (fetched
 * with a single indexed prefix query over the materialized `path` column) -
 * no per-node database round trip, so this never degrades into N+1.
 *
 * `boundaryHasChildren` supplies, for nodes sitting exactly at the requested
 * depth limit, whether they have further children beyond what was fetched -
 * the client re-queries with that node as the new `rootMemberId` to expand.
 */
export function assembleTree(
  root: RelationshipRow,
  descendants: RelationshipRow[],
  requestedDepth: number,
  boundaryHasChildren: Set<string>,
): { root: TreeNodeDto; totalNodes: number } {
  const childrenByParent = new Map<string, RelationshipRow[]>();
  for (const row of descendants) {
    if (!row.parentId) continue;
    const list = childrenByParent.get(row.parentId) ?? [];
    list.push(row);
    childrenByParent.set(row.parentId, list);
  }

  let totalNodes = 1;

  function build(row: RelationshipRow, relativeDepth: number): TreeNodeDto {
    const children = childrenByParent.get(row.memberId) ?? [];
    const directChildCount = children.length > 0 ? children.length : boundaryHasChildren.has(row.memberId) ? 1 : 0;
    const node: TreeNodeDto = {
      member: toSummary(row, relativeDepth, directChildCount),
      children: [],
      hasMoreChildren: false,
    };

    if (relativeDepth >= requestedDepth) {
      node.hasMoreChildren = boundaryHasChildren.has(row.memberId);
      return node;
    }

    for (const child of children) {
      totalNodes += 1;
      node.children.push(build(child, relativeDepth + 1));
    }
    return node;
  }

  return { root: build(root, 0), totalNodes };
}
