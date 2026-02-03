import { IsDateString, IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateDatePeriodDto {
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsUUID()
  seasonId?: string;
}
