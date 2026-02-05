import {
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientDto } from './client.dto';

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  primaryClient?: ClientDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  secondaryClient?: ClientDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  occupantsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalPrice?: number;

  @IsOptional()
  @IsBoolean()
  touristTaxIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  cleaningIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  linenIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  recalculatePrice?: boolean;
}
