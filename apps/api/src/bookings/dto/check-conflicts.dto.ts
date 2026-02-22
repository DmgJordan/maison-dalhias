import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CheckConflictsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
