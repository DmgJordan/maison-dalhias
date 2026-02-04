import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export interface PriceDetail {
  startDate: string;
  endDate: string;
  nights: number;
  seasonId: string;
  seasonName: string;
  pricePerNight: number;
  subtotal: number;
}

export interface PriceCalculation {
  totalPrice: number;
  totalNights: number;
  isWeeklyRate: boolean;
  minNightsRequired: number;
  details: PriceDetail[];
  hasUncoveredDays: boolean;
  uncoveredDays: number;
  defaultPricePerNight: number;
}

export interface PublicPricingPeriod {
  seasonName: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  weeklyPrice: number;
  minNights: number;
  color: string | null;
}

export interface PublicPricingGrid {
  year: number;
  periods: PublicPricingPeriod[];
}

@Injectable()
export class PricingService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService
  ) {}

  async calculatePrice(
    startDate: Date,
    endDate: Date,
    validateMinNights = false
  ): Promise<PriceCalculation> {
    const details: PriceDetail[] = [];
    let totalPrice = 0;
    let uncoveredDays = 0;

    // Récupérer le tarif par défaut depuis les settings
    const defaultPricePerNight = await this.settingsService.getDefaultPricePerNight();

    const totalNights = this.countNights(startDate, endDate);
    const isWeeklyRate = totalNights >= 7;

    // Récupérer toutes les périodes pertinentes en une seule requête
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    const periods = await this.prisma.datePeriod.findMany({
      where: {
        year: { in: years },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: { season: true },
      orderBy: { startDate: 'asc' },
    });

    // Calculer le minimum de nuits requis (le max parmi les saisons touchées)
    const touchedSeasons = new Set<string>();
    let minNightsRequired = 3; // Valeur par défaut

    // Parcourir chaque jour et trouver la période correspondante
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate < end) {
      // Trouver la période qui couvre cette date
      const period = periods.find((p) => p.startDate <= currentDate && p.endDate > currentDate);

      if (period) {
        // Calculer jusqu'où cette période s'applique
        const periodEndDate = new Date(Math.min(period.endDate.getTime(), end.getTime()));

        const nights = this.countNights(currentDate, periodEndDate);

        // Utiliser weeklyNightRate si ≥7 nuits ET que la saison a un tarif hebdo
        const pricePerNight =
          isWeeklyRate && period.season.weeklyNightRate
            ? Number(period.season.weeklyNightRate)
            : Number(period.season.pricePerNight);

        const subtotal = nights * pricePerNight;

        // Mettre à jour le minimum de nuits requis
        if (!touchedSeasons.has(period.seasonId)) {
          touchedSeasons.add(period.seasonId);
          minNightsRequired = Math.max(minNightsRequired, period.season.minNights);
        }

        // Fusionner avec le détail précédent si même saison et contigu
        const existingDetail = details.find(
          (d) => d.seasonId === period.seasonId && d.endDate === this.formatDate(currentDate)
        );

        if (existingDetail) {
          existingDetail.endDate = this.formatDate(periodEndDate);
          existingDetail.nights += nights;
          existingDetail.subtotal += subtotal;
        } else {
          details.push({
            startDate: this.formatDate(currentDate),
            endDate: this.formatDate(periodEndDate),
            nights,
            seasonId: period.seasonId,
            seasonName: period.season.name,
            pricePerNight,
            subtotal,
          });
        }

        totalPrice += subtotal;
        currentDate.setTime(periodEndDate.getTime());
      } else {
        uncoveredDays++;
        totalPrice += defaultPricePerNight;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Valider le minimum de nuits si demandé
    if (validateMinNights && totalNights < minNightsRequired) {
      throw new BadRequestException(
        `Cette période nécessite un minimum de ${String(minNightsRequired)} nuits`
      );
    }

    return {
      totalPrice,
      totalNights,
      isWeeklyRate,
      minNightsRequired,
      details,
      hasUncoveredDays: uncoveredDays > 0,
      uncoveredDays,
      defaultPricePerNight,
    };
  }

  async getSeasonForDate(date: Date): Promise<{
    seasonId: string;
    seasonName: string;
    pricePerNight: number;
  } | null> {
    const year = date.getFullYear();

    const period = await this.prisma.datePeriod.findFirst({
      where: {
        year,
        startDate: { lte: date },
        endDate: { gt: date },
      },
      include: {
        season: true,
      },
    });

    if (!period) {
      return null;
    }

    return {
      seasonId: period.seasonId,
      seasonName: period.season.name,
      pricePerNight: Number(period.season.pricePerNight),
    };
  }

  async getPublicGrid(year: number): Promise<PublicPricingGrid> {
    const periods = await this.prisma.datePeriod.findMany({
      where: { year },
      include: { season: true },
      orderBy: [{ season: { order: 'asc' } }, { startDate: 'asc' }],
    });

    const publicPeriods: PublicPricingPeriod[] = periods.map((period) => ({
      seasonName: period.season.name,
      startDate: this.formatDate(period.startDate),
      endDate: this.formatDate(period.endDate),
      pricePerNight: Number(period.season.pricePerNight),
      weeklyPrice: period.season.weeklyNightRate
        ? Number(period.season.weeklyNightRate) * 7
        : Number(period.season.pricePerNight) * 7,
      minNights: period.season.minNights,
      color: period.season.color,
    }));

    return {
      year,
      periods: publicPeriods,
    };
  }

  async getMinNightsForPeriod(startDate: Date, endDate: Date): Promise<number> {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    const periods = await this.prisma.datePeriod.findMany({
      where: {
        year: { in: years },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: { season: true },
    });

    if (periods.length === 0) {
      return 3; // Valeur par défaut
    }

    return Math.max(...periods.map((p) => p.season.minNights));
  }

  private countNights(start: Date, end: Date): number {
    // Normaliser les dates à minuit pour éviter les problèmes de fuseaux horaires
    const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffTime = endNormalized.getTime() - startNormalized.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
