import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { Season, Prisma } from '@prisma/client';
import { DeleteResponse } from '../common/types';

// Réexport pour les contrôleurs
export { DeleteResponse };

export interface SeasonWithPeriods extends Season {
  datePeriods: {
    id: string;
    startDate: Date;
    endDate: Date;
    year: number;
  }[];
}

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<SeasonWithPeriods[]> {
    return this.prisma.season.findMany({
      include: {
        datePeriods: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            year: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string): Promise<SeasonWithPeriods> {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        datePeriods: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            year: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(`Saison avec l'id ${id} non trouvée`);
    }

    return season;
  }

  async create(createSeasonDto: CreateSeasonDto): Promise<Season> {
    // Validation métier : weeklyNightRate doit être ≤ pricePerNight
    if (
      createSeasonDto.weeklyNightRate !== undefined &&
      createSeasonDto.weeklyNightRate > createSeasonDto.pricePerNight
    ) {
      throw new BadRequestException(
        'Le tarif hebdomadaire ne peut pas être supérieur au tarif standard'
      );
    }

    const data: Prisma.SeasonCreateInput = {
      name: createSeasonDto.name,
      pricePerNight: new Prisma.Decimal(createSeasonDto.pricePerNight),
      weeklyNightRate:
        createSeasonDto.weeklyNightRate !== undefined
          ? new Prisma.Decimal(createSeasonDto.weeklyNightRate)
          : null,
      minNights: createSeasonDto.minNights ?? 3,
      color: createSeasonDto.color,
      order: createSeasonDto.order ?? 0,
    };

    return this.prisma.season.create({ data });
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto): Promise<Season> {
    const existingSeason = await this.findOne(id);

    // Déterminer les valeurs finales pour la validation
    const finalPricePerNight =
      updateSeasonDto.pricePerNight ?? Number(existingSeason.pricePerNight);
    const finalWeeklyRate =
      updateSeasonDto.weeklyNightRate === null
        ? null
        : (updateSeasonDto.weeklyNightRate ??
          (existingSeason.weeklyNightRate ? Number(existingSeason.weeklyNightRate) : null));

    // Validation métier : weeklyNightRate doit être ≤ pricePerNight
    if (finalWeeklyRate !== null && finalWeeklyRate > finalPricePerNight) {
      throw new BadRequestException(
        'Le tarif hebdomadaire ne peut pas être supérieur au tarif standard'
      );
    }

    const data: Prisma.SeasonUpdateInput = {};

    if (updateSeasonDto.name !== undefined) {
      data.name = updateSeasonDto.name;
    }
    if (updateSeasonDto.pricePerNight !== undefined) {
      data.pricePerNight = new Prisma.Decimal(updateSeasonDto.pricePerNight);
    }
    if (updateSeasonDto.weeklyNightRate !== undefined) {
      data.weeklyNightRate =
        updateSeasonDto.weeklyNightRate === null
          ? null
          : new Prisma.Decimal(updateSeasonDto.weeklyNightRate);
    }
    if (updateSeasonDto.minNights !== undefined) {
      data.minNights = updateSeasonDto.minNights;
    }
    if (updateSeasonDto.color !== undefined) {
      data.color = updateSeasonDto.color;
    }
    if (updateSeasonDto.order !== undefined) {
      data.order = updateSeasonDto.order;
    }

    return this.prisma.season.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<DeleteResponse> {
    const season = await this.findOne(id);
    const periodsCount = season.datePeriods.length;

    await this.prisma.season.delete({ where: { id } });

    return {
      message:
        periodsCount > 0
          ? `Saison "${season.name}" supprimée avec ${String(periodsCount)} plage(s) de dates associée(s)`
          : `Saison "${season.name}" supprimée`,
    };
  }
}
