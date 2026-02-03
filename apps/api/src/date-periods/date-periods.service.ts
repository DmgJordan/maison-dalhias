import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDatePeriodDto } from './dto/create-date-period.dto';
import { UpdateDatePeriodDto } from './dto/update-date-period.dto';
import { DatePeriod } from '@prisma/client';
import { DeleteResponse } from '../common/types';

// Réexport pour les contrôleurs
export { DeleteResponse };

export interface SeasonInfo {
  id: string;
  name: string;
  pricePerNight: number;
  color: string | null;
}

export interface DatePeriodWithSeason extends DatePeriod {
  season: SeasonInfo;
}

// Select clause réutilisable pour les requêtes Prisma
const SEASON_SELECT = {
  id: true,
  name: true,
  pricePerNight: true,
  color: true,
} as const;

@Injectable()
export class DatePeriodsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Transforme le champ pricePerNight de Decimal vers number
   */
  private transformPriceToNumber<T extends { season: { pricePerNight: unknown } }>(
    item: T
  ): T & { season: { pricePerNight: number } } {
    return {
      ...item,
      season: {
        ...item.season,
        pricePerNight: Number(item.season.pricePerNight),
      },
    };
  }

  /**
   * Valide que la date de début est antérieure à la date de fin
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException('La date de début doit être antérieure à la date de fin');
    }
  }

  /**
   * Vérifie que la saison existe
   */
  private async validateSeasonExists(seasonId: string): Promise<void> {
    const seasonExists = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!seasonExists) {
      throw new NotFoundException(`Saison avec l'id ${seasonId} non trouvée`);
    }
  }

  /**
   * Valide qu'il n'y a pas de chevauchement avec les plages existantes
   */
  private async validateNoOverlap(
    startDate: Date,
    endDate: Date,
    year: number,
    excludeId?: string
  ): Promise<void> {
    const hasOverlap = await this.checkOverlap(startDate, endDate, year, excludeId);

    if (hasOverlap) {
      throw new BadRequestException(
        'Cette plage de dates chevauche une plage existante pour cette année'
      );
    }
  }

  async findAll(): Promise<DatePeriodWithSeason[]> {
    const periods = await this.prisma.datePeriod.findMany({
      include: { season: { select: SEASON_SELECT } },
      orderBy: [{ year: 'asc' }, { startDate: 'asc' }],
    });

    return periods.map((p) => this.transformPriceToNumber(p));
  }

  async findByYear(year: number): Promise<DatePeriodWithSeason[]> {
    const periods = await this.prisma.datePeriod.findMany({
      where: { year },
      include: { season: { select: SEASON_SELECT } },
      orderBy: { startDate: 'asc' },
    });

    return periods.map((p) => this.transformPriceToNumber(p));
  }

  async findOne(id: string): Promise<DatePeriodWithSeason> {
    const period = await this.prisma.datePeriod.findUnique({
      where: { id },
      include: { season: { select: SEASON_SELECT } },
    });

    if (!period) {
      throw new NotFoundException('Plage de dates introuvable');
    }

    return this.transformPriceToNumber(period);
  }

  async create(createDatePeriodDto: CreateDatePeriodDto): Promise<DatePeriodWithSeason> {
    const startDate = new Date(createDatePeriodDto.startDate);
    const endDate = new Date(createDatePeriodDto.endDate);

    // Validations extraites
    this.validateDateRange(startDate, endDate);
    await this.validateSeasonExists(createDatePeriodDto.seasonId);
    await this.validateNoOverlap(startDate, endDate, createDatePeriodDto.year);

    const period = await this.prisma.datePeriod.create({
      data: {
        startDate,
        endDate,
        year: createDatePeriodDto.year,
        seasonId: createDatePeriodDto.seasonId,
      },
      include: { season: { select: SEASON_SELECT } },
    });

    return this.transformPriceToNumber(period);
  }

  async update(
    id: string,
    updateDatePeriodDto: UpdateDatePeriodDto
  ): Promise<DatePeriodWithSeason> {
    const existing = await this.findOne(id);

    const startDate = updateDatePeriodDto.startDate
      ? new Date(updateDatePeriodDto.startDate)
      : existing.startDate;
    const endDate = updateDatePeriodDto.endDate
      ? new Date(updateDatePeriodDto.endDate)
      : existing.endDate;
    const year = updateDatePeriodDto.year ?? existing.year;

    // Validations extraites
    this.validateDateRange(startDate, endDate);
    if (updateDatePeriodDto.seasonId) {
      await this.validateSeasonExists(updateDatePeriodDto.seasonId);
    }
    await this.validateNoOverlap(startDate, endDate, year, id);

    const period = await this.prisma.datePeriod.update({
      where: { id },
      data: {
        startDate,
        endDate,
        year,
        seasonId: updateDatePeriodDto.seasonId,
      },
      include: { season: { select: SEASON_SELECT } },
    });

    return this.transformPriceToNumber(period);
  }

  async delete(id: string): Promise<DeleteResponse> {
    await this.findOne(id);
    await this.prisma.datePeriod.delete({ where: { id } });

    return { message: 'Plage de dates supprimée' };
  }

  async getAvailableYears(): Promise<number[]> {
    const periods = await this.prisma.datePeriod.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'asc' },
    });

    return periods.map((p) => p.year);
  }

  async copyFromYear(sourceYear: number, targetYear: number): Promise<{ copiedCount: number }> {
    if (sourceYear === targetYear) {
      throw new BadRequestException("L'année source et l'année cible doivent être différentes");
    }

    // Utiliser une transaction pour garantir l'atomicité
    return this.prisma.$transaction(async (tx) => {
      // Vérifier si des périodes existent déjà pour l'année cible
      const existingPeriods = await tx.datePeriod.findMany({
        where: { year: targetYear },
      });

      if (existingPeriods.length > 0) {
        throw new BadRequestException(
          `L'année ${String(targetYear)} contient déjà ${String(existingPeriods.length)} plage(s). Supprimez-les d'abord.`
        );
      }

      // Récupérer les périodes de l'année source
      const sourcePeriods = await tx.datePeriod.findMany({
        where: { year: sourceYear },
        orderBy: { startDate: 'asc' },
      });

      if (sourcePeriods.length === 0) {
        throw new NotFoundException(
          `Aucune plage de dates trouvée pour l'année ${String(sourceYear)}`
        );
      }

      // Calculer le décalage en années
      const yearDiff = targetYear - sourceYear;

      // Créer les nouvelles périodes
      const newPeriods = sourcePeriods.map((period) => {
        const newStartDate = new Date(period.startDate);
        newStartDate.setFullYear(newStartDate.getFullYear() + yearDiff);

        const newEndDate = new Date(period.endDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + yearDiff);

        return {
          startDate: newStartDate,
          endDate: newEndDate,
          year: targetYear,
          seasonId: period.seasonId,
        };
      });

      // Insérer toutes les nouvelles périodes
      await tx.datePeriod.createMany({
        data: newPeriods,
      });

      return { copiedCount: newPeriods.length };
    });
  }

  private async checkOverlap(
    startDate: Date,
    endDate: Date,
    year: number,
    excludeId?: string
  ): Promise<boolean> {
    const overlapping = await this.prisma.datePeriod.findFirst({
      where: {
        year,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          {
            startDate: { lte: startDate },
            endDate: { gt: startDate },
          },
          {
            startDate: { lt: endDate },
            endDate: { gte: endDate },
          },
          {
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          },
        ],
      },
    });

    return !!overlapping;
  }
}
