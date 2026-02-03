import { IsNumber, Min, Max } from 'class-validator';

export class CopyDatePeriodsDto {
  @IsNumber()
  @Min(2020)
  @Max(2100)
  sourceYear: number;

  @IsNumber()
  @Min(2020)
  @Max(2100)
  targetYear: number;
}
