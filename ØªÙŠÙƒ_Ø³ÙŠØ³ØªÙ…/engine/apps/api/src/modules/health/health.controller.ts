import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  check() {
    let dbStatus = 'disconnected';
    try {
      const db = this.dbService.getDb();
      const result = db.prepare('SELECT 1 as alive').get() as { alive: number };
      if (result && result.alive === 1) {
        dbStatus = 'connected';
      }
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      service: 'tech-api',
      version: '1.0.0',
    };
  }
}
