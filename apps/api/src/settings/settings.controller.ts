import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService, SettingsData } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(): Promise<SettingsData> {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSettings(@Body() dto: UpdateSettingsDto): Promise<SettingsData> {
    return this.settingsService.updateSettings(dto);
  }
}
