import { IsString, IsNumber, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateSeasonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Le tarif hebdomadaire doit être supérieur à 0' })
  weeklyNightRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Le minimum de nuits doit être au moins 1' })
  @Max(30, { message: 'Le minimum de nuits ne peut pas dépasser 30' })
  minNights?: number;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être au format hexadécimal (ex: #FF385C)',
  })
  color?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
