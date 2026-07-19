import { Module } from '@nestjs/common';
import { BcController } from './bc.controller';
import { BcService } from './bc.service';

@Module({
  controllers: [BcController],
  providers: [BcService],
})
export class BcModule {}