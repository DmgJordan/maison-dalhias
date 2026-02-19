import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { ContractGeneratorService } from './contract-generator.service';
import { InvoiceGeneratorService } from './invoice-generator.service';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [BookingsModule],
  controllers: [PdfController],
  providers: [PdfService, ContractGeneratorService, InvoiceGeneratorService],
  exports: [PdfService],
})
export class PdfModule {}
