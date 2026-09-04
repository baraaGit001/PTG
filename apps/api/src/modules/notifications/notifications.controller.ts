import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { NOTIFICATION_TYPES, type NotificationCountsDto, type NotificationDto, type NotificationType } from '@ptg/types';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginationQueryDto, type PaginatedResult } from '../../common/dto/pagination.dto.js';
import { NotificationsService } from './notifications.service.js';

class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: NotificationQueryDto): Promise<PaginatedResult<NotificationDto>> {
    return this.notifications.list(user.id, query);
  }

  @Get('counts')
  async counts(@CurrentUser() user: RequestUser): Promise<NotificationCountsDto> {
    return this.notifications.counts(user.id);
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.notifications.markRead(user.id, id);
    return { ok: true };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: RequestUser): Promise<{ ok: true }> {
    await this.notifications.markAllRead(user.id);
    return { ok: true };
  }
}
