import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  @Get()
  async checkHealth() {
    let dbStatus = 'down';
    let redisStatus = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (e) {
      console.error('Database health check failed:', e);
    }

    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();
      if (pong === 'PONG') {
        redisStatus = 'up';
      }
    } catch (e) {
      console.error('Redis health check failed:', e);
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    const healthReport = {
      status: isHealthy ? 'ok' : 'error',
      details: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(healthReport);
    }

    return healthReport;
  }

  @Get('metrics')
  async getMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return `
# HELP node_uptime_seconds Uptime of the node process in seconds.
# TYPE node_uptime_seconds gauge
node_uptime_seconds ${uptime}

# HELP node_memory_rss_bytes Resident set size in bytes.
# TYPE node_memory_rss_bytes gauge
node_memory_rss_bytes ${memoryUsage.rss}

# HELP node_memory_heap_total_bytes Total heap memory allocated in bytes.
# TYPE node_memory_heap_total_bytes gauge
node_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP node_memory_heap_used_bytes Used heap memory in bytes.
# TYPE node_memory_heap_used_bytes gauge
node_memory_heap_used_bytes ${memoryUsage.heapUsed}
`.trim();
  }
}
