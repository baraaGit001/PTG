import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from '@ptg/config';
import { AppModule } from './app.module.js';
import { StructuredLogger } from './common/logger/structured-logger.service.js';
import type { AppConfig } from './config/configuration.js';

async function bootstrap(): Promise<void> {
  const usePrettyLogs = process.env.NODE_ENV !== 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: usePrettyLogs ? undefined : new StructuredLogger(),
  });

  const config = app.get(ConfigService<AppConfig, true>);
  const auth = config.get('auth', { infer: true });

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'], objectSrc: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser(auth.cookieSecret));

  app.enableCors({
    origin: config.get('corsOrigins', { infer: true }),
    credentials: true,
  });

  // The bare `/health*` observability probes stay unversioned and outside
  // the API prefix - see ObservabilityController for why.
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''), { exclude: ['health', 'health/live', 'health/ready'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PTG Business API')
    .setDescription('REST API for the PTG Business platform - partner portal, marketplace, wallet/ledger, health & community.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`PTG API listening on port ${port} (docs at /docs)`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
