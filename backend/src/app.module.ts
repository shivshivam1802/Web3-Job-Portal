import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { FreelancerModule } from './freelancer/freelancer.module';
import { ClientModule } from './client/client.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, FreelancerModule, ClientModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
