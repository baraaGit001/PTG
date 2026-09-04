import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { MembersModule } from './modules/members/members.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { CommunityModule } from './modules/community/community.module.js';
import { SportModule } from './modules/sport/sport.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { PromotionsModule } from './modules/promotions/promotions.module.js';
import { InvestmentModule } from './modules/investment/investment.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { LocalizationModule } from './modules/localization/localization.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { ObservabilityController } from './modules/observability/observability.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { TimingInterceptor } from './common/interceptors/timing.interceptor.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    PrismaModule,
    RedisModule,
    RbacModule,
    AuditModule,
    SettingsModule,
    NotificationsModule,

    AuthModule,
    UsersModule,
    MembersModule,
    WalletModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    HealthModule,
    CommunityModule,
    SportModule,
    ContentModule,
    PromotionsModule,
    InvestmentModule,
    DashboardModule,
    LocalizationModule,
    UploadsModule,
  ],
  controllers: [ObservabilityController],
  providers: [
    // Order matters: JwtAuthGuard resolves req.user first, PermissionsGuard
    // reads it second, ThrottlerGuard applies independently of auth state.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}
