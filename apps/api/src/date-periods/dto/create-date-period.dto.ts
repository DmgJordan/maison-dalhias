import { IsDateString, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class CreateDatePeriodDto {
  @IsDateString({ strict: true })
  startDate: string;

  @IsDateString({ strict: true })
  endDate: string;

  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsUUID()
  seasonId: string;
}
