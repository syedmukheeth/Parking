import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RedisCacheStore } from '../common/cache/redis-cache.store';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheStore,
  ) {}

  /** Liveness — the process is up. */
  @Get()
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  /** Readiness — dependencies are reachable. */
  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    const checks: Record<string, 'ok' | 'error'> = { postgres: 'ok', redis: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.postgres = 'error';
    }

    if (!(await this.cache.ping())) {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    res
      .status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: healthy ? 'ok' : 'error', checks });
  }
}
