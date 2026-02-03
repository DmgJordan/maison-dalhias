import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_SETTINGS_ID = 'default';
const FALLBACK_DEFAULT_PRICE = 100;

export interface SettingsData {
  defaultPricePerNight: number;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<SettingsData> {
    const settings = await this.prisma.settings.findUnique({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (!settings) {
      // Créer les settings par défaut s'ils n'existent pas
      const created = await this.prisma.settings.create({
        data: {
          id: DEFAULT_SETTINGS_ID,
          defaultPricePerNight: FALLBACK_DEFAULT_PRICE,
        },
      });
      return {
        defaultPricePerNight: Number(created.defaultPricePerNight),
      };
    }

    return {
      defaultPricePerNight: Number(settings.defaultPricePerNight),
    };
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsData> {
    const settings = await this.prisma.settings.upsert({
      where: { id: DEFAULT_SETTINGS_ID },
      update: {
        defaultPricePerNight: dto.defaultPricePerNight,
      },
      create: {
        id: DEFAULT_SETTINGS_ID,
        defaultPricePerNight: dto.defaultPricePerNight,
      },
    });

    return {
      defaultPricePerNight: Number(settings.defaultPricePerNight),
    };
  }

  async getDefaultPricePerNight(): Promise<number> {
    const settings = await this.getSettings();
    return settings.defaultPricePerNight;
  }
}
