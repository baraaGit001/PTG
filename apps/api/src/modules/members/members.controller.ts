import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type {
  MemberDetailDto,
  MemberReportSummaryDto,
  MemberSummaryDto,
  TreeResponse,
} from '@ptg/types';
import { hasAnyPermission } from '@ptg/types';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { MembersService } from './members.service.js';
import { MemberListQueryDto, SetRelationshipDto, TreeQueryDto } from './members.dto.js';

class ReportQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@ApiTags('members')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermissions('members.read')
  async list(@CurrentUser() user: RequestUser, @Query() query: MemberListQueryDto): Promise<PaginatedResult<MemberSummaryDto>> {
    const canViewAll = hasAnyPermission(user.permissions, ['members.manage']);
    return this.membersService.listMembers(user.id, canViewAll, query);
  }

  @Get('report')
  @RequirePermissions('members.read')
  async myReport(@CurrentUser() user: RequestUser, @Query() query: ReportQueryDto): Promise<MemberReportSummaryDto> {
    return this.membersService.getMemberReport(user.id, query.from, query.to);
  }

  @Get('tree/sponsor')
  @RequirePermissions('members.tree.read')
  async sponsorTree(@CurrentUser() user: RequestUser, @Query() query: TreeQueryDto): Promise<TreeResponse> {
    return this.membersService.getTree('SPONSOR', user.id, query);
  }

  @Get('tree/placement')
  @RequirePermissions('members.tree.read')
  async placementTree(@CurrentUser() user: RequestUser, @Query() query: TreeQueryDto): Promise<TreeResponse> {
    return this.membersService.getTree('PLACEMENT', user.id, query);
  }

  @Get(':id')
  @RequirePermissions('members.read')
  async detail(@Param('id') id: string): Promise<MemberDetailDto> {
    return this.membersService.getMemberDetail(id);
  }

  @Get(':id/report')
  @RequirePermissions('members.read')
  async memberReport(@Param('id') id: string, @Query() query: ReportQueryDto): Promise<MemberReportSummaryDto> {
    return this.membersService.getMemberReport(id, query.from, query.to);
  }
}

@ApiTags('admin/members')
@Controller('admin/members')
export class AdminMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Patch(':id/sponsor')
  @RequirePermissions('members.tree.manage')
  async setSponsor(@Param('id') id: string, @Body() dto: SetRelationshipDto): Promise<{ ok: true }> {
    await this.membersService.reassignParent('SPONSOR', id, dto.parentMemberId ?? null);
    return { ok: true };
  }

  @Patch(':id/placement-parent')
  @RequirePermissions('members.tree.manage')
  async setPlacementParent(@Param('id') id: string, @Body() dto: SetRelationshipDto): Promise<{ ok: true }> {
    await this.membersService.reassignParent('PLACEMENT', id, dto.parentMemberId ?? null);
    return { ok: true };
  }
}
