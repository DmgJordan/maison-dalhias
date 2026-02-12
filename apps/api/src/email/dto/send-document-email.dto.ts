import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendDocumentEmailDto {
  @IsUUID()
  bookingId: string;

  @IsArray()
  @IsIn(['contract', 'invoice'], { each: true })
  documentTypes: string[];

  @IsEmail()
  recipientEmail: string;

  @IsString()
  recipientName: string;

  @IsOptional()
  @IsString()
  personalMessage?: string;
}
