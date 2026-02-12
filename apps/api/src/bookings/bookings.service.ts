import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Booking, Client } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService, PriceCalculation } from '../pricing/pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

export interface BookingWithRelations extends Booking {
  user?: {
    id: string;
    email: string;
  };
  primaryClient: Client | null;
  secondaryClient: Client | null;
}

export interface DeleteResponse {
  message: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  minNightsRequired: number;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService
  ) {}

  async findAll(): Promise<BookingWithRelations[]> {
    return this.prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        primaryClient: true,
        secondaryClient: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findById(id: string): Promise<BookingWithRelations> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        primaryClient: true,
        secondaryClient: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation non trouvée');
    }

    return booking;
  }

  async create(userId: string, createBookingDto: CreateBookingDto): Promise<BookingWithRelations> {
    const startDate = new Date(createBookingDto.startDate);
    const endDate = new Date(createBookingDto.endDate);

    // Vérifier les conflits de dates
    const hasConflict = await this.checkConflicts(startDate, endDate);
    if (hasConflict) {
      throw new ConflictException('Ces dates sont déjà réservées ou indisponibles');
    }

    // Vérifier le minimum de nuits dynamique
    const minNightsRequired = await this.pricingService.getMinNightsForPeriod(startDate, endDate);
    const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < minNightsRequired) {
      throw new BadRequestException(
        `Cette période nécessite un minimum de ${String(minNightsRequired)} nuits`
      );
    }

    let primaryClientId: string | undefined;
    let secondaryClientId: string | undefined;

    if (createBookingDto.primaryClient) {
      const primaryClient = await this.prisma.client.create({
        data: createBookingDto.primaryClient,
      });
      primaryClientId = primaryClient.id;
    }

    if (createBookingDto.secondaryClient) {
      const secondaryClient = await this.prisma.client.create({
        data: createBookingDto.secondaryClient,
      });
      secondaryClientId = secondaryClient.id;
    }

    return this.prisma.booking.create({
      data: {
        startDate: new Date(createBookingDto.startDate),
        endDate: new Date(createBookingDto.endDate),
        userId,
        primaryClientId,
        secondaryClientId,
        occupantsCount: createBookingDto.occupantsCount,
        adultsCount: createBookingDto.adultsCount,
        rentalPrice: createBookingDto.rentalPrice,
        touristTaxIncluded: createBookingDto.touristTaxIncluded,
        cleaningIncluded: createBookingDto.cleaningIncluded,
        linenIncluded: createBookingDto.linenIncluded,
      },
      include: {
        primaryClient: true,
        secondaryClient: true,
      },
    });
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<BookingWithRelations> {
    const booking = await this.findById(id);

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Seules les réservations en attente peuvent être modifiées');
    }

    const startDate = updateBookingDto.startDate
      ? new Date(updateBookingDto.startDate)
      : booking.startDate;
    const endDate = updateBookingDto.endDate ? new Date(updateBookingDto.endDate) : booking.endDate;

    // Vérifier les conflits si les dates sont modifiées
    if (updateBookingDto.startDate || updateBookingDto.endDate) {
      const hasConflict = await this.checkConflicts(startDate, endDate, id);
      if (hasConflict) {
        throw new ConflictException('Ces dates sont déjà réservées ou indisponibles');
      }

      // Vérifier le minimum de nuits
      const minNightsRequired = await this.pricingService.getMinNightsForPeriod(startDate, endDate);
      const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (nights < minNightsRequired) {
        throw new BadRequestException(
          `Cette période nécessite un minimum de ${String(minNightsRequired)} nuits`
        );
      }
    }

    // Recalcul automatique du prix si demandé
    let rentalPrice = updateBookingDto.rentalPrice;
    if (updateBookingDto.recalculatePrice) {
      const priceCalculation = await this.pricingService.calculatePrice(startDate, endDate);
      rentalPrice = priceCalculation.totalPrice;
    }

    // Mise à jour du client principal (upsert)
    let primaryClientId = booking.primaryClientId;
    if (updateBookingDto.primaryClient) {
      if (booking.primaryClientId) {
        await this.prisma.client.update({
          where: { id: booking.primaryClientId },
          data: updateBookingDto.primaryClient,
        });
      } else {
        const newClient = await this.prisma.client.create({
          data: updateBookingDto.primaryClient,
        });
        primaryClientId = newClient.id;
      }
    }

    // Mise à jour du client secondaire (upsert)
    let secondaryClientId = booking.secondaryClientId;
    if (updateBookingDto.secondaryClient) {
      if (booking.secondaryClientId) {
        await this.prisma.client.update({
          where: { id: booking.secondaryClientId },
          data: updateBookingDto.secondaryClient,
        });
      } else {
        const newClient = await this.prisma.client.create({
          data: updateBookingDto.secondaryClient,
        });
        secondaryClientId = newClient.id;
      }
    }

    // Construire les données de mise à jour
    const updateData: Record<string, unknown> = {};

    if (updateBookingDto.startDate) updateData.startDate = startDate;
    if (updateBookingDto.endDate) updateData.endDate = endDate;
    if (primaryClientId !== booking.primaryClientId) updateData.primaryClientId = primaryClientId;
    if (secondaryClientId !== booking.secondaryClientId)
      updateData.secondaryClientId = secondaryClientId;
    if (updateBookingDto.occupantsCount !== undefined)
      updateData.occupantsCount = updateBookingDto.occupantsCount;
    if (updateBookingDto.adultsCount !== undefined)
      updateData.adultsCount = updateBookingDto.adultsCount;
    if (rentalPrice !== undefined) updateData.rentalPrice = rentalPrice;
    if (updateBookingDto.touristTaxIncluded !== undefined)
      updateData.touristTaxIncluded = updateBookingDto.touristTaxIncluded;
    if (updateBookingDto.cleaningIncluded !== undefined)
      updateData.cleaningIncluded = updateBookingDto.cleaningIncluded;
    if (updateBookingDto.linenIncluded !== undefined)
      updateData.linenIncluded = updateBookingDto.linenIncluded;

    return this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        primaryClient: true,
        secondaryClient: true,
      },
    });
  }

  async recalculatePrice(id: string): Promise<PriceCalculation> {
    const booking = await this.findById(id);
    return this.pricingService.calculatePrice(booking.startDate, booking.endDate);
  }

  async confirm(id: string): Promise<BookingWithRelations> {
    const booking = await this.findById(id);

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
      include: {
        primaryClient: true,
        secondaryClient: true,
      },
    });
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findById(id);

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });
  }

  async delete(id: string): Promise<DeleteResponse> {
    const booking = await this.findById(id);

    await this.prisma.booking.delete({
      where: { id: booking.id },
    });

    return { message: 'Réservation supprimée' };
  }

  async checkConflicts(
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { not: 'CANCELLED' },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    return conflictingBookings.length > 0;
  }

  async checkConflictsWithMinNights(
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<ConflictCheckResult> {
    const hasConflict = await this.checkConflicts(startDate, endDate, excludeBookingId);
    const minNightsRequired = await this.pricingService.getMinNightsForPeriod(startDate, endDate);

    return {
      hasConflict,
      minNightsRequired,
    };
  }

  async getBookedDates(): Promise<string[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    const dates: string[] = [];
    for (const booking of bookings) {
      const current = new Date(booking.startDate);
      const end = new Date(booking.endDate);

      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    return [...new Set(dates)];
  }
}
