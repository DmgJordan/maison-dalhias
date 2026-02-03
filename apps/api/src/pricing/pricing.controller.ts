import { Controller, Post, Body } from '@nestjs/common';
import { PricingService, PriceCalculation } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';

@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Post('calculate')
  calculate(@Body() calculatePriceDto: CalculatePriceDto): Promise<PriceCalculation> {
    return this.pricingService.calculatePrice(
      new Date(calculatePriceDto.startDate),
      new Date(calculatePriceDto.endDate)
    );
  }
}
