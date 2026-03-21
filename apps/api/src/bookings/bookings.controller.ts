import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  BookingsService,
  BookingWithRelations,
  DeleteResponse,
  ConflictCheckResult,
} from './bookings.service';
import { PriceCalculation } from '../pricing/pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateQuickBookingDto } from './dto/create-quick-booking.dto';
import { CheckConflictsDto } from './dto/check-conflicts.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateQuickBookingDto } from './dto/update-quick-booking.dto';
import { EnrichBookingDto } from './dto/enrich-booking.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { Status } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  findAll(): Promise<BookingWithRelations[]> {
    return this.bookingsService.findAll();
  }

  @Get('dates')
  getBookedDates(): Promise<{ checkinDisabled: string[]; checkoutDisabled: string[] }> {
    return this.bookingsService.getBookedDates();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('quick')
  createQuick(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateQuickBookingDto
  ): Promise<BookingWithRelations> {
    return this.bookingsService.createQuick(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id/transitions')
  async getTransitions(@Param('id') id: string): Promise<{
    currentStatus: Status;
    availableTransitions: Status[];
    steps: Status[];
  }> {
    return this.bookingsService.getTransitions(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto
  ): Promise<BookingWithRelations> {
    return this.bookingsService.changeStatus(id, dto.status);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<BookingWithRelations> {
    return this.bookingsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBookingDto: CreateBookingDto
  ): Promise<BookingWithRelations> {
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/recalculate-price')
  recalculatePrice(@Param('id') id: string): Promise<PriceCalculation> {
    return this.bookingsService.recalculatePrice(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto
  ): Promise<BookingWithRelations> {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/quick')
  updateQuick(
    @Param('id') id: string,
    @Body() dto: UpdateQuickBookingDto
  ): Promise<BookingWithRelations> {
    return this.bookingsService.updateQuick(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/enrich')
  enrich(@Param('id') id: string, @Body() dto: EnrichBookingDto): Promise<BookingWithRelations> {
    return this.bookingsService.enrich(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  delete(@Param('id') id: string): Promise<DeleteResponse> {
    return this.bookingsService.delete(id);
  }

  @Post('check-conflicts')
  async checkConflicts(@Body() dto: CheckConflictsDto): Promise<ConflictCheckResult> {
    return this.bookingsService.checkConflictsWithMinNights(
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.bookingId
    );
  }
}
