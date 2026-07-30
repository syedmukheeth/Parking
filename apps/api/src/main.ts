import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorrelationIdInterceptor } from './common/logging/correlation-id.interceptor';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { loadEnv } from './config/env';
import { initSentry } from './observability/sentry';

async function bootstrap(): Promise<void> {
  // Validates the environment and refuses to boot with stub providers under
  // NODE_ENV=production. Runs before the Nest container is created.
  const env = loadEnv();
  initSentry(env.SENTRY_DSN);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({ origin: env.API_CORS_ORIGINS, credentials: true });
  app.enableShutdownHooks();
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  await app.listen(env.API_PORT);
  new Logger('bootstrap').log(`api listening on :${env.API_PORT} (${env.NODE_ENV})`);
}

void bootstrap();
