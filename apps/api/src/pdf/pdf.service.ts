import { Injectable } from '@nestjs/common';
import { ContractGeneratorService, ContractGenerateData } from './contract-generator.service';
import { InvoiceGeneratorService, InvoiceGenerateData } from './invoice-generator.service';

@Injectable()
export class PdfService {
  constructor(
    private contractGenerator: ContractGeneratorService,
    private invoiceGenerator: InvoiceGeneratorService
  ) {}

  generateContract(data: ContractGenerateData): Buffer {
    return this.contractGenerator.generate(data);
  }

  generateInvoice(data: InvoiceGenerateData): Buffer {
    return this.invoiceGenerator.generate(data);
  }
}
