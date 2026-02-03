import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SeasonsService, SeasonWithPeriods, DeleteResponse } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Season } from '@prisma/client';

@Controller('seasons')
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  @Get()
  findAll(): Promise<SeasonWithPeriods[]> {
    return this.seasonsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SeasonWithPeriods> {
    return this.seasonsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createSeasonDto: CreateSeasonDto): Promise<Season> {
    return this.seasonsService.create(createSeasonDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSeasonDto: UpdateSeasonDto): Promise<Season> {
    return this.seasonsService.update(id, updateSeasonDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  delete(@Param('id') id: string): Promise<DeleteResponse> {
    return this.seasonsService.delete(id);
  }
}
