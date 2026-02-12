import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { PdfModule } from '../pdf/pdf.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [PdfModule, BookingsModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
