import { validateEnv, type Env } from './env.validation.js';

/**
 * Typed configuration surface consumed via `ConfigService<AppConfig>`.
 * Grouping keeps each module's `configService.get('wallet', { infer: true })`
 * call self-documenting instead of scattering raw env var names everywhere.
 */
export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  apiUrl: string;
  appUrl: string;
  adminUrl: string;
  corsOrigins: string[];
  database: { url: string };
  redis: { url: string };
  auth: {
    accessSecret: string;
    refreshSecret: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    cookieSecret: string;
    cookieDomain: string;
    cookieSecure: boolean;
  };
  s3: {
    endpoint?: string;
    region: string;
    accessKey?: string;
    secretKey?: string;
    bucket: string;
    forcePathStyle: boolean;
    publicUrl?: string;
  };
  platform: {
    defaultCurrency: string;
    defaultLocale: string;
    demoMode: boolean;
  };
  rateLimit: { ttlSeconds: number; limit: number };
  login: { maxAttempts: number; lockMinutes: number };
}

export function buildConfig(env: Env): AppConfig {
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    apiUrl: env.API_URL,
    appUrl: env.APP_URL,
    adminUrl: env.ADMIN_URL,
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    database: { url: env.DATABASE_URL },
    redis: { url: env.REDIS_URL },
    auth: {
      accessSecret: env.JWT_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtlSeconds: env.JWT_ACCESS_TTL,
      refreshTtlSeconds: env.JWT_REFRESH_TTL,
      cookieSecret: env.COOKIE_SECRET,
      cookieDomain: env.COOKIE_DOMAIN,
      cookieSecure: env.COOKIE_SECURE,
    },
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      publicUrl: env.S3_PUBLIC_URL,
    },
    platform: {
      defaultCurrency: env.DEFAULT_CURRENCY,
      defaultLocale: env.DEFAULT_LOCALE,
      demoMode: env.DEMO_MODE,
    },
    rateLimit: { ttlSeconds: env.RATE_LIMIT_TTL, limit: env.RATE_LIMIT_LIMIT },
    login: { maxAttempts: env.LOGIN_MAX_ATTEMPTS, lockMinutes: env.LOGIN_LOCK_MINUTES },
  };
}

/** NestJS ConfigModule factory: validates process.env once at boot and builds the typed config tree. */
export default (): AppConfig => buildConfig(validateEnv(process.env));
