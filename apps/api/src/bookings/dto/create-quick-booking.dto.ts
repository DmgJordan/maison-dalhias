import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { BookingSource } from '@prisma/client';

export class CreateQuickBookingDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(BookingSource)
  source: BookingSource;

  @ValidateIf((o: CreateQuickBookingDto) => o.source === BookingSource.OTHER)
  @IsString()
  sourceCustomName?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  externalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  occupantsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  adultsCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
