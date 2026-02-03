import { IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerNight?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être au format hexadécimal (#RRGGBB)',
  })
  color?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
