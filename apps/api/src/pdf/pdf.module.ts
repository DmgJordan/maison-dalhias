import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { ContractGeneratorService } from './contract-generator.service';
import { InvoiceGeneratorService } from './invoice-generator.service';

@Module({
  providers: [PdfService, ContractGeneratorService, InvoiceGeneratorService],
  exports: [PdfService],
})
export class PdfModule {}
