import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Validates the environment and refuses to boot with stub providers under
  // NODE_ENV=production. Runs before the Nest container is created.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({ origin: env.API_CORS_ORIGINS, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  new Logger('bootstrap').log(`api listening on :${env.API_PORT} (${env.NODE_ENV})`);
}

void bootstrap();
