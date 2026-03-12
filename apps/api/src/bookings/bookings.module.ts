import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingPriceComputeService } from './booking-price-compute.service';
import { StatusMachineService } from './status-machine.service';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PricingModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingPriceComputeService, StatusMachineService],
  exports: [BookingsService, BookingPriceComputeService],
})
export class BookingsModule {}
