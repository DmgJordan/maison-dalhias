import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Booking, BookingSource, BookingType, Client, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService, PriceCalculation } from '../pricing/pricing.service';
import { StatusMachineService } from './status-machine.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateQuickBookingDto } from './dto/create-quick-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateQuickBookingDto } from './dto/update-quick-booking.dto';
import { EnrichBookingDto } from './dto/enrich-booking.dto';

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

export interface ConflictDetail {
  id: string;
  source: BookingSource | null;
  label: string | null;
  clientName: string | null;
  startDate: Date;
  endDate: Date;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  minNightsRequired: number;
  conflictDetail?: ConflictDetail;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private readonly statusMachine: StatusMachineService
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
        cleaningOffered: createBookingDto.cleaningOffered,
        linenIncluded: createBookingDto.linenIncluded,
        linenOffered: createBookingDto.linenOffered,
      },
      include: {
        primaryClient: true,
        secondaryClient: true,
      },
    });
  }

  async update(id: string, updateBookingDto: UpdateBookingDto): Promise<BookingWithRelations> {
    const booking = await this.findById(id);

    // Allow notes-only updates regardless of booking status
    const hasNonNotesChanges =
      updateBookingDto.startDate !== undefined ||
      updateBookingDto.endDate !== undefined ||
      updateBookingDto.primaryClient !== undefined ||
      updateBookingDto.secondaryClient !== undefined ||
      updateBookingDto.occupantsCount !== undefined ||
      updateBookingDto.adultsCount !== undefined ||
      updateBookingDto.rentalPrice !== undefined ||
      updateBookingDto.touristTaxIncluded !== undefined ||
      updateBookingDto.cleaningIncluded !== undefined ||
      updateBookingDto.cleaningOffered !== undefined ||
      updateBookingDto.linenIncluded !== undefined ||
      updateBookingDto.linenOffered !== undefined ||
      updateBookingDto.recalculatePrice !== undefined;

    if (booking.status !== Status.DRAFT && hasNonNotesChanges) {
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
    if (updateBookingDto.cleaningOffered !== undefined)
      updateData.cleaningOffered = updateBookingDto.cleaningOffered;
    if (updateBookingDto.linenIncluded !== undefined)
      updateData.linenIncluded = updateBookingDto.linenIncluded;
    if (updateBookingDto.linenOffered !== undefined)
      updateData.linenOffered = updateBookingDto.linenOffered;
    if (updateBookingDto.notes !== undefined) updateData.notes = updateBookingDto.notes;

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

  async changeStatus(id: string, targetStatus: Status): Promise<BookingWithRelations> {
    const booking = await this.findById(id);
    this.statusMachine.validateTransition(booking.status, targetStatus, booking.bookingType);

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: targetStatus },
      include: {
        primaryClient: true,
        secondaryClient: true,
      },
    });
  }

  async getTransitions(id: string): Promise<{
    currentStatus: Status;
    availableTransitions: Status[];
    steps: Status[];
  }> {
    const booking = await this.findById(id);
    return {
      currentStatus: booking.status,
      availableTransitions: this.statusMachine.getAvailableTransitions(booking.status, booking.bookingType),
      steps: this.statusMachine.getSteps(booking.bookingType),
    };
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
        status: { not: Status.CANCELLED },
        OR: [
          {
            startDate: { lt: endDate },
            endDate: { gt: startDate },
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
    const conflicting = await this.checkConflictsDetailed(startDate, endDate, excludeBookingId);
    const minNightsRequired = await this.pricingService.getMinNightsForPeriod(startDate, endDate);

    const result: ConflictCheckResult = {
      hasConflict: conflicting !== null,
      minNightsRequired,
    };

    if (conflicting) {
      const clientName = conflicting.primaryClient
        ? `${conflicting.primaryClient.firstName} ${conflicting.primaryClient.lastName}`
        : null;
      result.conflictDetail = {
        id: conflicting.id,
        source: conflicting.source,
        label: conflicting.label,
        clientName,
        startDate: conflicting.startDate,
        endDate: conflicting.endDate,
      };
    }

    return result;
  }

  private mapSourceToType(source: BookingSource): BookingType {
    switch (source) {
      case BookingSource.ABRITEL:
      case BookingSource.AIRBNB:
      case BookingSource.BOOKING_COM:
      case BookingSource.OTHER:
        return BookingType.EXTERNAL;
      case BookingSource.PERSONNEL:
      case BookingSource.FAMILLE:
        return BookingType.PERSONAL;
    }
  }

  async checkConflictsDetailed(
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<BookingWithRelations | null> {
    const conflicting = await this.prisma.booking.findFirst({
      where: {
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { not: Status.CANCELLED },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: {
        user: { select: { id: true, email: true } },
        primaryClient: true,
        secondaryClient: true,
      },
    });
    return conflicting as BookingWithRelations | null;
  }

  async createQuick(userId: string, dto: CreateQuickBookingDto): Promise<BookingWithRelations> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    const bookingType = this.mapSourceToType(dto.source);

    return this.prisma.$transaction(async (tx) => {
      const conflicting = await tx.booking.findFirst({
        where: {
          status: { not: Status.CANCELLED },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (conflicting) {
        throw new ConflictException({
          message: 'Ces dates chevauchent une réservation existante',
          conflictingBooking: {
            id: conflicting.id,
            source: conflicting.source,
            label: conflicting.label,
            startDate: conflicting.startDate,
            endDate: conflicting.endDate,
          },
        });
      }

      const booking = await tx.booking.create({
        data: {
          startDate,
          endDate,
          bookingType,
          source: dto.source,
          sourceCustomName: dto.sourceCustomName ?? null,
          label: dto.label ?? null,
          externalAmount: dto.externalAmount ?? null,
          occupantsCount: dto.occupantsCount ?? null,
          adultsCount: dto.adultsCount ?? 1,
          notes: dto.notes ?? null,
          userId,
          status: Status.DRAFT,
        },
        include: {
          user: { select: { id: true, email: true } },
          primaryClient: true,
          secondaryClient: true,
        },
      });

      return booking as BookingWithRelations;
    });
  }

  async updateQuick(id: string, dto: UpdateQuickBookingDto): Promise<BookingWithRelations> {
    const booking = await this.findById(id); // throws 404 if not found

    // Only EXTERNAL/PERSONAL bookings — reject DIRECT
    if (booking.bookingType === BookingType.DIRECT) {
      throw new BadRequestException(
        'Cet endpoint est réservé aux réservations rapides (EXTERNAL/PERSONAL)'
      );
    }

    const startDate = dto.startDate !== undefined ? new Date(dto.startDate) : booking.startDate;
    const endDate = dto.endDate !== undefined ? new Date(dto.endDate) : booking.endDate;

    // Validate dates if modified
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      if (endDate <= startDate) {
        throw new BadRequestException('La date de fin doit être postérieure à la date de début');
      }
    }

    // Build update data — only include provided fields (partial update)
    const updateData: Record<string, unknown> = {};
    if (dto.startDate !== undefined) updateData.startDate = startDate;
    if (dto.endDate !== undefined) updateData.endDate = endDate;
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.sourceCustomName !== undefined) updateData.sourceCustomName = dto.sourceCustomName;
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.externalAmount !== undefined) updateData.externalAmount = dto.externalAmount;
    if (dto.occupantsCount !== undefined) updateData.occupantsCount = dto.occupantsCount;
    if (dto.adultsCount !== undefined) updateData.adultsCount = dto.adultsCount;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    // NEVER include bookingType — it is immutable (NFR8)

    // sourceCustomName coherence: only meaningful when source is OTHER
    const effectiveSource = dto.source ?? booking.source;
    if (dto.sourceCustomName !== undefined && effectiveSource !== BookingSource.OTHER) {
      delete updateData.sourceCustomName; // ignore when effective source is not OTHER
    }
    if (dto.source !== undefined && dto.source !== BookingSource.OTHER) {
      updateData.sourceCustomName = null; // clear stale value when source changes away from OTHER
    }

    // Short-circuit — nothing to update
    if (Object.keys(updateData).length === 0) {
      return booking;
    }

    // If dates changed: atomic conflict check + update in transaction
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        const conflicting = await tx.booking.findFirst({
          where: {
            id: { not: id },
            status: { not: Status.CANCELLED },
            startDate: { lt: endDate },
            endDate: { gt: startDate },
          },
        });

        if (conflicting) {
          throw new ConflictException({
            message: 'Ces dates chevauchent une réservation existante',
            conflictingBooking: {
              id: conflicting.id,
              source: conflicting.source,
              label: conflicting.label,
              startDate: conflicting.startDate,
              endDate: conflicting.endDate,
            },
          });
        }

        const updated = await tx.booking.update({
          where: { id },
          data: updateData,
          include: {
            user: { select: { id: true, email: true } },
            primaryClient: true,
            secondaryClient: true,
          },
        });
        return updated as BookingWithRelations;
      });
    }

    // No date changes — update directly
    const updated = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true } },
        primaryClient: true,
        secondaryClient: true,
      },
    });
    return updated as BookingWithRelations;
  }

  async enrich(id: string, dto: EnrichBookingDto): Promise<BookingWithRelations> {
    const booking = await this.findById(id); // throws 404 if not found

    // Only EXTERNAL/PERSONAL bookings — reject DIRECT
    if (booking.bookingType === BookingType.DIRECT) {
      throw new BadRequestException(
        'Cet endpoint est réservé aux réservations rapides (EXTERNAL/PERSONAL)'
      );
    }

    // Only allow enrichment in DRAFT or VALIDATED states
    if (booking.status !== Status.DRAFT && booking.status !== Status.VALIDATED) {
      throw new BadRequestException(
        "L'enrichissement n'est possible que pour les réservations en brouillon ou validées"
      );
    }

    // Cross-field validation: cannot provide both inline client AND client ID
    if (dto.primaryClientId !== undefined && dto.primaryClient !== undefined) {
      throw new BadRequestException('Fournir primaryClient OU primaryClientId, pas les deux');
    }
    if (dto.secondaryClientId !== undefined && dto.secondaryClient !== undefined) {
      throw new BadRequestException('Fournir secondaryClient OU secondaryClientId, pas les deux');
    }

    // Handle primary client — upsert (update existing or create new) or ID reference
    let primaryClientId: string | undefined;
    if (dto.primaryClient) {
      if (booking.primaryClientId) {
        await this.prisma.client.update({
          where: { id: booking.primaryClientId },
          data: dto.primaryClient,
        });
        primaryClientId = booking.primaryClientId;
      } else {
        const client = await this.prisma.client.create({ data: dto.primaryClient });
        primaryClientId = client.id;
      }
    } else if (dto.primaryClientId !== undefined) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.primaryClientId },
      });
      if (!client) {
        throw new BadRequestException('Client primaire introuvable');
      }
      primaryClientId = dto.primaryClientId;
    }

    // Handle secondary client — upsert (update existing or create new) or ID reference
    let secondaryClientId: string | undefined;
    if (dto.secondaryClient) {
      if (booking.secondaryClientId) {
        await this.prisma.client.update({
          where: { id: booking.secondaryClientId },
          data: dto.secondaryClient,
        });
        secondaryClientId = booking.secondaryClientId;
      } else {
        const client = await this.prisma.client.create({ data: dto.secondaryClient });
        secondaryClientId = client.id;
      }
    } else if (dto.secondaryClientId !== undefined) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.secondaryClientId },
      });
      if (!client) {
        throw new BadRequestException('Client secondaire introuvable');
      }
      secondaryClientId = dto.secondaryClientId;
    }

    // Build updateData — only include provided fields (unidirectional enrichment)
    const updateData: Record<string, unknown> = {};
    if (primaryClientId !== undefined) updateData.primaryClientId = primaryClientId;
    if (secondaryClientId !== undefined) updateData.secondaryClientId = secondaryClientId;
    if (dto.rentalPrice !== undefined) updateData.rentalPrice = dto.rentalPrice;
    if (dto.cleaningIncluded !== undefined) updateData.cleaningIncluded = dto.cleaningIncluded;
    if (dto.cleaningOffered !== undefined) updateData.cleaningOffered = dto.cleaningOffered;
    if (dto.linenIncluded !== undefined) updateData.linenIncluded = dto.linenIncluded;
    if (dto.linenOffered !== undefined) updateData.linenOffered = dto.linenOffered;
    if (dto.touristTaxIncluded !== undefined)
      updateData.touristTaxIncluded = dto.touristTaxIncluded;
    if (dto.occupantsCount !== undefined) updateData.occupantsCount = dto.occupantsCount;
    if (dto.adultsCount !== undefined) updateData.adultsCount = dto.adultsCount;
    // NEVER include bookingType — it is immutable (NFR8)

    // Short-circuit: nothing to update
    if (Object.keys(updateData).length === 0) {
      return booking;
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true } },
        primaryClient: true,
        secondaryClient: true,
      },
    });
    return updated as BookingWithRelations;
  }

  async getBookedDates(): Promise<{ checkinDisabled: string[]; checkoutDisabled: string[] }> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { not: Status.CANCELLED },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    const checkinSet = new Set<string>();
    const checkoutSet = new Set<string>();

    for (const booking of bookings) {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);

      // Dates désactivées pour le checkin : [start, end-1]
      // On ne peut pas arriver un jour où un séjour est en cours
      const current = new Date(start);
      while (current < end) {
        checkinSet.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Dates désactivées pour le checkout : (start, end]
      // On ne peut pas partir un jour où un séjour est en cours,
      // mais on peut partir le jour d'arrivée d'un autre séjour
      const currentOut = new Date(start);
      currentOut.setDate(currentOut.getDate() + 1);
      while (currentOut <= end) {
        checkoutSet.add(currentOut.toISOString().split('T')[0]);
        currentOut.setDate(currentOut.getDate() + 1);
      }
    }

    return {
      checkinDisabled: [...checkinSet],
      checkoutDisabled: [...checkoutSet],
    };
  }
}
