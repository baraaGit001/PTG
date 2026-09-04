import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PAGINATION } from '@ptg/config';
import type { PaginationMeta } from '@ptg/types';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION.defaultPage;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.maxPageSize)
  pageSize?: number = PAGINATION.defaultPageSize;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export function paginationArgs(query: PaginationQueryDto): { skip: number; take: number } {
  const page = query.page && query.page > 0 ? query.page : PAGINATION.defaultPage;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, PAGINATION.maxPageSize) : PAGINATION.defaultPageSize;
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(query: PaginationQueryDto, total: number): PaginationMeta {
  const page = query.page && query.page > 0 ? query.page : PAGINATION.defaultPage;
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, PAGINATION.maxPageSize) : PAGINATION.defaultPageSize;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function toPaginatedResult<T>(items: T[], query: PaginationQueryDto, total: number): PaginatedResult<T> {
  return { items, pagination: buildPaginationMeta(query, total) };
}

export function dateRangeFilter(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return filter;
}
