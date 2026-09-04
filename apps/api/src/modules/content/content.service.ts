import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ArticleDetailDto, ArticleInput, ArticleSummaryDto } from '@ptg/types';
import { ApiException } from '../../common/errors/api.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '@ptg/config';
import { buildPaginationMeta, type PaginatedResult, type PaginationQueryDto } from '../../common/dto/pagination.dto.js';

function estimateReadingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listArticles(
    forcePublished: boolean,
    query: PaginationQueryDto & { categorySlug?: string; tag?: string; featuredOnly?: boolean; status?: string },
  ): Promise<PaginatedResult<ArticleSummaryDto>> {
    const where: Prisma.HealthArticleWhereInput = {
      status: forcePublished ? 'PUBLISHED' : (query.status as never),
      category: query.categorySlug ? { slug: query.categorySlug } : undefined,
      tags: query.tag ? { has: query.tag } : undefined,
      isFeatured: query.featuredOnly ? true : undefined,
      OR: query.search ? [{ title: { contains: query.search, mode: 'insensitive' } }] : undefined,
    };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

    const [rows, total] = await Promise.all([
      this.prisma.healthArticle.findMany({
        where,
        include: { category: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.healthArticle.count({ where }),
    ]);

    return { items: rows.map(toSummary), pagination: buildPaginationMeta({ page, pageSize }, total) };
  }

  async getBySlug(slug: string, includeUnpublished: boolean): Promise<ArticleDetailDto> {
    const article = await this.prisma.healthArticle.findUnique({ where: { slug }, include: { category: true } });
    if (!article || (!includeUnpublished && article.status !== 'PUBLISHED')) {
      throw new ApiException('ARTICLE_NOT_FOUND', 'Article not found.');
    }
    const related = await this.prisma.healthArticle.findMany({
      where: { categoryId: article.categoryId ?? undefined, status: 'PUBLISHED', id: { not: article.id } },
      include: { category: true },
      take: 4,
    });
    return {
      ...toSummary(article),
      bodyHtml: article.bodyHtml,
      tags: article.tags,
      relatedArticles: related.map(toSummary),
      updatedAt: article.updatedAt.toISOString(),
    };
  }

  async createArticle(actorId: string, input: ArticleInput): Promise<ArticleDetailDto> {
    const existing = await this.prisma.healthArticle.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ApiException('SLUG_TAKEN', 'An article with this slug already exists.');
    const article = await this.prisma.healthArticle.create({
      data: {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        bodyHtml: input.bodyHtml,
        coverImageUrl: input.coverImageUrl,
        categoryId: input.categoryId,
        authorName: input.authorName,
        tags: input.tags ?? [],
        isFeatured: input.isFeatured ?? false,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
      include: { category: true },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.contentPublished, entityType: 'HealthArticle', entityId: article.id, after: { slug: input.slug, status: input.status } });
    return this.getBySlug(article.slug, true);
  }

  async updateArticle(actorId: string, id: string, input: Partial<ArticleInput>): Promise<ArticleDetailDto> {
    const before = await this.prisma.healthArticle.findUnique({ where: { id } });
    if (!before) throw new ApiException('ARTICLE_NOT_FOUND', 'Article not found.');
    const article = await this.prisma.healthArticle.update({
      where: { id },
      data: {
        title: input.title,
        excerpt: input.excerpt,
        bodyHtml: input.bodyHtml,
        coverImageUrl: input.coverImageUrl,
        categoryId: input.categoryId,
        authorName: input.authorName,
        tags: input.tags,
        isFeatured: input.isFeatured,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' && !before.publishedAt ? new Date() : undefined,
      },
      include: { category: true },
    });
    await this.audit.record({ actorId, action: AUDIT_ACTIONS.contentPublished, entityType: 'HealthArticle', entityId: id, before: { status: before.status }, after: { status: article.status } });
    return this.getBySlug(article.slug, true);
  }
}

function toSummary(article: {
  id: string; slug: string; title: string; excerpt: string | null; coverImageUrl: string | null; category: { id: string; slug: string; name: string } | null; authorName: string | null; bodyHtml: string; isFeatured: boolean; publishedAt: Date | null; status: string;
}): ArticleSummaryDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImageUrl: article.coverImageUrl,
    category: article.category ? { id: article.category.id, slug: article.category.slug, name: article.category.name } : null,
    authorName: article.authorName,
    readingMinutes: estimateReadingMinutes(article.bodyHtml),
    isFeatured: article.isFeatured,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    status: article.status as ArticleSummaryDto['status'],
  };
}
