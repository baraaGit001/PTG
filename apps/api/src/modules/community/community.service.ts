import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { SETTING_KEYS, AUDIT_ACTIONS } from '@ptg/config';
import type {
  CommunityCommentDto,
  CommunityPostDto,
  CommunityReportDto,
  ContentStatus,
  ReactionType,
} from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { buildPaginationMeta, type PaginatedResult, type PaginationQueryDto } from '../../common/dto/pagination.dto.js';

const REACTION_TYPES_LIST = ['LIKE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL'] as const;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async listFeed(
    viewerId: string | null,
    isModerator: boolean,
    query: PaginationQueryDto & { tag?: string; authorId?: string; moderationStatus?: ContentStatus },
  ): Promise<PaginatedResult<CommunityPostDto>> {
    const where: Prisma.CommunityPostWhereInput = {
      moderationStatus: isModerator ? query.moderationStatus : 'PUBLISHED',
      authorId: query.authorId,
      tags: query.tag ? { has: query.tag } : undefined,
    };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const [rows, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } },
          reactions: true,
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toPostDto(row, viewerId)),
      pagination: buildPaginationMeta({ page, pageSize }, total),
    };
  }

  async createPost(authorId: string, dto: { title?: string | null; body: string; imageUrls?: string[]; tags?: string[] }): Promise<CommunityPostDto> {
    const moderationRequired = await this.settings.requireBoolean(SETTING_KEYS.communityModerationRequired, false);
    const post = await this.prisma.communityPost.create({
      data: {
        authorId,
        title: dto.title,
        body: dto.body,
        imageUrls: dto.imageUrls ?? [],
        tags: dto.tags ?? [],
        moderationStatus: moderationRequired ? 'PENDING_REVIEW' : 'PUBLISHED',
      },
      include: { author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, reactions: true, _count: { select: { comments: true } } },
    });
    return this.toPostDto(post, authorId);
  }

  async deletePost(actorId: string, postId: string, isModerator: boolean): Promise<void> {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new ApiException('POST_NOT_FOUND', 'Post not found.');
    if (!isModerator && post.authorId !== actorId) throw new ApiException('FORBIDDEN', 'You cannot delete this post.');
    await this.prisma.communityPost.delete({ where: { id: postId } });
  }

  async moderatePost(actorId: string, postId: string, status: ContentStatus): Promise<CommunityPostDto> {
    const post = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { moderationStatus: status },
      include: { author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, reactions: true, _count: { select: { comments: true } } },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.contentModerated, entityType: 'CommunityPost', entityId: postId, after: { status } });
    return this.toPostDto(post, actorId);
  }

  async listComments(postId: string): Promise<CommunityCommentDto[]> {
    const comments = await this.prisma.communityComment.findMany({
      where: { postId, moderationStatus: { not: 'REMOVED' } },
      include: { author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      author: c.author,
      body: c.body,
      moderationStatus: c.moderationStatus,
      createdAt: c.createdAt.toISOString(),
      canDelete: false,
    }));
  }

  async addComment(authorId: string, postId: string, body: string): Promise<CommunityCommentDto> {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new ApiException('POST_NOT_FOUND', 'Post not found.');
    if (post.moderationStatus !== 'PUBLISHED') throw new ApiException('POST_NOT_PUBLISHED', 'This post is not open for comments.');

    const comment = await this.prisma.communityComment.create({
      data: { postId, authorId, body },
      include: { author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } } },
    });
    return { id: comment.id, postId: comment.postId, author: comment.author, body: comment.body, moderationStatus: comment.moderationStatus, createdAt: comment.createdAt.toISOString(), canDelete: true };
  }

  async react(userId: string, postId: string, type: ReactionType): Promise<CommunityPostDto> {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new ApiException('POST_NOT_FOUND', 'Post not found.');

    await this.prisma.communityReaction.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, type },
      update: { type },
    });

    const updated = await this.prisma.communityPost.findUniqueOrThrow({
      where: { id: postId },
      include: { author: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, reactions: true, _count: { select: { comments: true } } },
    });
    return this.toPostDto(updated, userId);
  }

  async removeReaction(userId: string, postId: string): Promise<void> {
    await this.prisma.communityReaction.deleteMany({ where: { postId, userId } });
  }

  async report(reporterId: string, targetType: 'POST' | 'COMMENT', targetId: string, reason: string, details?: string): Promise<CommunityReportDto> {
    const existing = await this.prisma.communityReport.findFirst({
      where: { reporterId, ...(targetType === 'POST' ? { postId: targetId } : { commentId: targetId }) },
    });
    if (existing) throw new ApiException('ALREADY_REPORTED', 'You have already reported this content.');

    const report = await this.prisma.communityReport.create({
      data: {
        targetType,
        postId: targetType === 'POST' ? targetId : undefined,
        commentId: targetType === 'COMMENT' ? targetId : undefined,
        reporterId,
        reason,
        details,
      },
      include: { reporter: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, post: true, comment: true },
    });
    return this.toReportDto(report);
  }

  async listReports(status?: string): Promise<CommunityReportDto[]> {
    const reports = await this.prisma.communityReport.findMany({
      where: { status: status as never },
      include: { reporter: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, post: true, comment: true },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => this.toReportDto(r));
  }

  async resolveReport(actorId: string, reportId: string, status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED'): Promise<CommunityReportDto> {
    const report = await this.prisma.communityReport.update({
      where: { id: reportId },
      data: { status, resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' ? new Date() : undefined },
      include: { reporter: { select: { id: true, memberId: true, displayName: true, avatarUrl: true } }, post: true, comment: true },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.contentModerated, entityType: 'CommunityReport', entityId: reportId, after: { status } });
    return this.toReportDto(report);
  }

  private toPostDto(
    post: {
      id: string;
      author: { id: string; memberId: string; displayName: string; avatarUrl: string | null };
      title: string | null;
      body: string;
      imageUrls: string[];
      tags: string[];
      moderationStatus: ContentStatus;
      reactions: Array<{ userId: string; type: ReactionType }>;
      _count: { comments: number };
      createdAt: Date;
      updatedAt: Date;
    },
    viewerId: string | null,
  ): CommunityPostDto {
    const reactionCounts = Object.fromEntries(REACTION_TYPES_LIST.map((t) => [t, 0])) as Record<ReactionType, number>;
    for (const reaction of post.reactions) reactionCounts[reaction.type] += 1;
    const myReaction = viewerId ? post.reactions.find((r) => r.userId === viewerId)?.type ?? null : null;

    return {
      id: post.id,
      author: post.author,
      title: post.title,
      body: post.body,
      imageUrls: post.imageUrls,
      tags: post.tags,
      moderationStatus: post.moderationStatus,
      reactionCounts,
      myReaction,
      commentCount: post._count.comments,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      canEdit: viewerId === post.author.id,
      canDelete: viewerId === post.author.id,
    };
  }

  private toReportDto(report: {
    id: string;
    targetType: string;
    postId: string | null;
    commentId: string | null;
    reason: string;
    details: string | null;
    status: string;
    reporter: { id: string; memberId: string; displayName: string; avatarUrl: string | null };
    post: { body: string } | null;
    comment: { body: string } | null;
    createdAt: Date;
    resolvedAt: Date | null;
  }): CommunityReportDto {
    const excerptSource = report.post?.body ?? report.comment?.body ?? '';
    return {
      id: report.id,
      targetType: report.targetType as 'POST' | 'COMMENT',
      targetId: (report.postId ?? report.commentId) as string,
      excerpt: excerptSource.slice(0, 140),
      reason: report.reason,
      details: report.details,
      status: report.status as CommunityReportDto['status'],
      reporter: report.reporter,
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    };
  }
}
