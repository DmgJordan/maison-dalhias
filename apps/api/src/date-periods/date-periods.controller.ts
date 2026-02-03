import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { DatePeriodsService, DatePeriodWithSeason, DeleteResponse } from './date-periods.service';
import { CreateDatePeriodDto } from './dto/create-date-period.dto';
import { UpdateDatePeriodDto } from './dto/update-date-period.dto';
import { CopyDatePeriodsDto } from './dto/copy-date-periods.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('date-periods')
export class DatePeriodsController {
  constructor(private datePeriodsService: DatePeriodsService) {}

  @Get()
  findAll(@Query('year') year?: string): Promise<DatePeriodWithSeason[]> {
    if (year) {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum)) {
        throw new BadRequestException('Année invalide');
      }
      return this.datePeriodsService.findByYear(yearNum);
    }
    return this.datePeriodsService.findAll();
  }

  @Get('years')
  getAvailableYears(): Promise<number[]> {
    return this.datePeriodsService.getAvailableYears();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<DatePeriodWithSeason> {
    return this.datePeriodsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createDatePeriodDto: CreateDatePeriodDto): Promise<DatePeriodWithSeason> {
    return this.datePeriodsService.create(createDatePeriodDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDatePeriodDto: UpdateDatePeriodDto
  ): Promise<DatePeriodWithSeason> {
    return this.datePeriodsService.update(id, updateDatePeriodDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  delete(@Param('id') id: string): Promise<DeleteResponse> {
    return this.datePeriodsService.delete(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('copy')
  copyFromYear(@Body() copyDto: CopyDatePeriodsDto): Promise<{ copiedCount: number }> {
    return this.datePeriodsService.copyFromYear(copyDto.sourceYear, copyDto.targetYear);
  }
}
