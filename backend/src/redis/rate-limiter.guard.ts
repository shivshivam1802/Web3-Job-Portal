import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';
    
    const userId = request.user?.id;
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const key = `rate:limit:${identifier}`;

    const limit = 60; 
    const ttl = 60;   

    const client = this.redisService.getClient();
    
    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, ttl);
    }

    if (current > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again in a minute.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
