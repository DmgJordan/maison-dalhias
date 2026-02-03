import { Module } from '@nestjs/common';
import { DatePeriodsService } from './date-periods.service';
import { DatePeriodsController } from './date-periods.controller';

@Module({
  controllers: [DatePeriodsController],
  providers: [DatePeriodsService],
  exports: [DatePeriodsService],
})
export class DatePeriodsModule {}
