import {
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientDto } from './client.dto';

export class CreateBookingDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

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
  @Max(6)
  occupantsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  adultsCount?: number;

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
}
