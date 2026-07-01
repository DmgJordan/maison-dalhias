import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendAccessEmailDto {
  @IsUUID()
  bookingId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}
