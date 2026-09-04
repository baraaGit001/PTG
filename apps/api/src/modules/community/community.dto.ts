import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { COMMUNITY } from '@ptg/config';
import { CONTENT_STATUSES, REACTION_TYPES, type ContentStatus, type ReactionType } from '@ptg/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsString()
  @MaxLength(COMMUNITY.maxPostLength)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(COMMUNITY.maxImagesPerPost)
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(COMMUNITY.maxTagsPerPost)
  @IsString({ each: true })
  tags?: string[];
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(COMMUNITY.maxCommentLength)
  body!: string;
}

export class ReactDto {
  @IsIn(REACTION_TYPES)
  type!: ReactionType;
}

export class ReportContentDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  details?: string;
}

export class FeedQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsIn(CONTENT_STATUSES)
  moderationStatus?: ContentStatus;
}

export class ModerateReportDto {
  @IsIn(['REVIEWING', 'RESOLVED', 'DISMISSED'])
  status!: 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
}

export class ModeratePostDto {
  @IsIn(CONTENT_STATUSES)
  status!: ContentStatus;
}
