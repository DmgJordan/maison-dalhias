import { IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class CreateSeasonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

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
