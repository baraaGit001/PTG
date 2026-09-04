import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { NotificationCountsDto, NotificationDto, NotificationType } from '@ptg/types';
import { PrismaService } from '../../prisma/prisma.service.js';
import { buildPaginationMeta, type PaginatedResult, type PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  code: string;
  title: string;
  body: string;
  params?: Record<string, string | number>;
  linkPath?: string;
}

/** In-app notifications. Architected so an email/push channel can subscribe to the same `create` call later (see docs/ARCHITECTURE.md). */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateNotificationParams): Promise<NotificationDto> {
    const row = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        code: params.code,
        title: params.title,
        body: params.body,
        params: (params.params ?? undefined) as Prisma.InputJsonValue,
        linkPath: params.linkPath,
      },
    });
    return toDto(row);
  }

  async list(userId: string, query: PaginationQueryDto & { type?: NotificationType; unreadOnly?: boolean }): Promise<PaginatedResult<NotificationDto>> {
    const where: Prisma.NotificationWhereInput = { userId, type: query.type, readAt: query.unreadOnly ? null : undefined };
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.notification.count({ where }),
    ]);
    return { items: rows.map(toDto), pagination: buildPaginationMeta({ page, pageSize }, total) };
  }

  async counts(userId: string): Promise<NotificationCountsDto> {
    const [total, unread] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { total, unread };
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}

function toDto(row: {
  id: string; type: NotificationType; code: string; title: string; body: string; params: Prisma.JsonValue; linkPath: string | null; readAt: Date | null; createdAt: Date;
}): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    code: row.code,
    title: row.title,
    body: row.body,
    params: (row.params as Record<string, string | number>) ?? null,
    linkPath: row.linkPath,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
