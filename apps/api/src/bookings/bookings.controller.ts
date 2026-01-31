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
import { BookingsService, BookingWithRelations, DeleteResponse } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Booking } from '@prisma/client';

interface AuthenticatedRequest {
  user: { id: string };
}

interface ConflictResponse {
  hasConflict: boolean;
}

@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  findAll(): Promise<BookingWithRelations[]> {
    return this.bookingsService.findAll();
  }

  @Get('dates')
  getBookedDates(): Promise<string[]> {
    return this.bookingsService.getBookedDates();
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
  @Patch(':id/confirm')
  confirm(@Param('id') id: string): Promise<BookingWithRelations> {
    return this.bookingsService.confirm(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.cancel(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  delete(@Param('id') id: string): Promise<DeleteResponse> {
    return this.bookingsService.delete(id);
  }

  @Post('check-conflicts')
  async checkConflicts(
    @Body() body: { startDate: string; endDate: string; bookingId?: string }
  ): Promise<ConflictResponse> {
    const hasConflict = await this.bookingsService.checkConflicts(
      new Date(body.startDate),
      new Date(body.endDate),
      body.bookingId
    );
    return { hasConflict };
  }
}
