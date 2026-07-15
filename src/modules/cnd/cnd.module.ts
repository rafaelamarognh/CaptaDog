import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CndController } from './cnd.controller';
import { CndService } from './cnd.service';

@Module({
  imports: [HttpModule],
  controllers: [CndController],
  providers: [CndService],
})
export class CndModule {}