import { Controller, Post, Get, Body, Query, ParseIntPipe } from '@nestjs/common';
import { PricingService, PriceCalculation, PublicPricingGrid } from './pricing.service';
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

  @Get('public-grid')
  getPublicGrid(@Query('year', ParseIntPipe) year: number): Promise<PublicPricingGrid> {
    return this.pricingService.getPublicGrid(year);
  }

  @Get('min-nights')
  async getMinNights(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<{ minNights: number }> {
    const minNights = await this.pricingService.getMinNightsForPeriod(
      new Date(startDate),
      new Date(endDate)
    );
    return { minNights };
  }
}
