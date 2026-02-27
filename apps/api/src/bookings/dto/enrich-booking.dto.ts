import { IsBoolean, IsNumber, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientDto } from './client.dto';

export class EnrichBookingDto {
  @IsOptional()
  @IsUUID()
  primaryClientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  primaryClient?: ClientDto;

  @IsOptional()
  @IsUUID()
  secondaryClientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  secondaryClient?: ClientDto;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rentalPrice?: number;

  @IsOptional()
  @IsBoolean()
  cleaningIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  cleaningOffered?: boolean;

  @IsOptional()
  @IsBoolean()
  linenIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  linenOffered?: boolean;

  @IsOptional()
  @IsBoolean()
  touristTaxIncluded?: boolean;

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
}
