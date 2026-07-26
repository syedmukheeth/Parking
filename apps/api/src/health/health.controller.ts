import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Liveness — the process is up. */
  @Get()
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  /**
   * Readiness — dependencies are reachable. Dependency probes are added as the
   * dependencies land (Postgres in Phase 1, Redis in Phase 4).
   */
  @Get('ready')
  ready(): { status: 'ok'; checks: Record<string, 'ok' | 'skipped'> } {
    return { status: 'ok', checks: {} };
  }
}
