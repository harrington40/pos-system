import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrientDBService } from './orientdb.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [OrientDBService, RedisService],
  exports: [OrientDBService, RedisService]
})
export class DatabaseModule {}
