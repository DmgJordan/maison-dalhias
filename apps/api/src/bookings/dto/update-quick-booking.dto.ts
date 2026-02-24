import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { BookingSource, PaymentStatus } from '@prisma/client';

export class UpdateQuickBookingDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @ValidateIf((o: UpdateQuickBookingDto) => o.source === BookingSource.OTHER)
  @IsString()
  @IsNotEmpty()
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

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
