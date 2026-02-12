import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendDocumentEmailDto {
  @IsUUID()
  bookingId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['contract', 'invoice'], { each: true })
  documentTypes: ('contract' | 'invoice')[];

  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personalMessage?: string;
}
