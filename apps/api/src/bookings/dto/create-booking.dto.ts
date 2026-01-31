import {
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class ClientDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  phone: string;
}

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
}
