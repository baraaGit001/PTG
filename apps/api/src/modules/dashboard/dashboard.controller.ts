import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AdminDashboardDto, DashboardDto } from '@ptg/types';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators.js';
import type { RequestUser } from '../../common/types/request-user.js';
import { DashboardService } from './dashboard.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async get(@CurrentUser() user: RequestUser): Promise<DashboardDto> {
    return this.dashboardService.getDashboard(user.id);
  }
}

@ApiTags('admin/dashboard')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @RequirePermissions('settings.read')
  async get(): Promise<AdminDashboardDto> {
    return this.adminDashboardService.getDashboard();
  }
}
