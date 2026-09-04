import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CommunityCommentDto, CommunityPostDto, CommunityReportDto } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CommunityService } from './community.service.js';
import {
  CreateCommentDto,
  CreatePostDto,
  FeedQueryDto,
  ModeratePostDto,
  ModerateReportDto,
  ReactDto,
  ReportContentDto,
} from './community.dto.js';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Public()
  @Get('posts')
  async listPosts(@CurrentUser() user: RequestUser | undefined, @Query() query: FeedQueryDto): Promise<PaginatedResult<CommunityPostDto>> {
    return this.community.listFeed(user?.id ?? null, false, query);
  }

  @Post('posts')
  async createPost(@CurrentUser() user: RequestUser, @Body() dto: CreatePostDto): Promise<CommunityPostDto> {
    return this.community.createPost(user.id, dto);
  }

  @Delete('posts/:id')
  async deletePost(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.community.deletePost(user.id, id, false);
    return { ok: true };
  }

  @Get('posts/:id/comments')
  @Public()
  async comments(@Param('id') id: string): Promise<CommunityCommentDto[]> {
    return this.community.listComments(id);
  }

  @Post('posts/:id/comments')
  async addComment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateCommentDto): Promise<CommunityCommentDto> {
    return this.community.addComment(user.id, id, dto.body);
  }

  @Post('posts/:id/reactions')
  async react(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ReactDto): Promise<CommunityPostDto> {
    return this.community.react(user.id, id, dto.type);
  }

  @Delete('posts/:id/reactions')
  async removeReaction(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.community.removeReaction(user.id, id);
    return { ok: true };
  }

  @Post('posts/:id/report')
  async reportPost(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ReportContentDto): Promise<CommunityReportDto> {
    return this.community.report(user.id, 'POST', id, dto.reason, dto.details);
  }

  @Post('comments/:id/report')
  async reportComment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ReportContentDto): Promise<CommunityReportDto> {
    return this.community.report(user.id, 'COMMENT', id, dto.reason, dto.details);
  }
}

@ApiTags('admin/community')
@Controller('admin/community')
export class AdminCommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('posts')
  @RequirePermissions('community.moderate')
  async listPosts(@CurrentUser() user: RequestUser, @Query() query: FeedQueryDto): Promise<PaginatedResult<CommunityPostDto>> {
    return this.community.listFeed(user.id, true, query);
  }

  @Patch('posts/:id/moderation')
  @RequirePermissions('community.moderate')
  async moderatePost(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ModeratePostDto): Promise<CommunityPostDto> {
    return this.community.moderatePost(user.id, id, dto.status);
  }

  @Delete('posts/:id')
  @RequirePermissions('community.moderate')
  async deletePost(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.community.deletePost(user.id, id, true);
    return { ok: true };
  }

  @Get('reports')
  @RequirePermissions('community.moderate')
  async listReports(@Query('status') status?: string): Promise<CommunityReportDto[]> {
    return this.community.listReports(status);
  }

  @Patch('reports/:id')
  @RequirePermissions('community.moderate')
  async resolveReport(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ModerateReportDto): Promise<CommunityReportDto> {
    return this.community.resolveReport(user.id, id, dto.status);
  }
}
