import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CONTENT_STATUSES, type ArticleDetailDto, type ArticleSummaryDto, type ContentStatus } from '@ptg/types';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { ContentService } from './content.service.js';

class ArticleListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBoolean()
  featuredOnly?: boolean;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  status?: ContentStatus;
}

class ArticleInputDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  excerpt?: string | null;

  @IsString()
  bodyHtml!: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  authorName?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsIn(CONTENT_STATUSES)
  status!: ContentStatus;
}

@ApiTags('health/articles')
@Controller('health/articles')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  async list(@Query() query: ArticleListQueryDto): Promise<PaginatedResult<ArticleSummaryDto>> {
    return this.content.listArticles(true, query);
  }

  @Public()
  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<ArticleDetailDto> {
    return this.content.getBySlug(slug, false);
  }
}

@ApiTags('admin/health/articles')
@Controller('admin/health/articles')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @RequirePermissions('content.read')
  async list(@Query() query: ArticleListQueryDto): Promise<PaginatedResult<ArticleSummaryDto>> {
    return this.content.listArticles(false, query);
  }

  @Post()
  @RequirePermissions('content.write')
  async create(@CurrentUser() actor: RequestUser, @Body() dto: ArticleInputDto): Promise<ArticleDetailDto> {
    return this.content.createArticle(actor.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('content.write')
  async update(@CurrentUser() actor: RequestUser, @Param('id') id: string, @Body() dto: Partial<ArticleInputDto>): Promise<ArticleDetailDto> {
    return this.content.updateArticle(actor.id, id, dto);
  }
}
