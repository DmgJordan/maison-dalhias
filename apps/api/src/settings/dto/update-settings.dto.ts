import { IsNumber, IsPositive } from 'class-validator';

export class UpdateSettingsDto {
  @IsNumber()
  @IsPositive()
  defaultPricePerNight: number;
}
