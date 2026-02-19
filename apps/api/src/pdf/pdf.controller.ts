import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BookingPriceComputeService } from '../bookings/booking-price-compute.service';
import { PdfService } from './pdf.service';
import { generateInvoiceNumber } from './invoice-generator.service';
import type { ContractGenerateData } from './contract-generator.service';
import type { InvoiceGenerateData } from './invoice-generator.service';

@Controller('pdf')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PdfController {
  constructor(
    private bookingPriceComputeService: BookingPriceComputeService,
    private pdfService: PdfService
  ) {}

  @Get('bookings/:bookingId/contract')
  async downloadContract(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Res() res: Response
  ): Promise<void> {
    const prices = await this.bookingPriceComputeService.computeForBooking(bookingId);
    const client = prices.booking.primaryClient as NonNullable<typeof prices.booking.primaryClient>;

    const contractData: ContractGenerateData = {
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientAddress: client.address,
      clientCity: client.city,
      clientPostalCode: client.postalCode,
      clientCountry: client.country,
      clientPhone: client.phone,
      startDate: new Date(prices.booking.startDate),
      endDate: new Date(prices.booking.endDate),
      occupantsCount: prices.booking.occupantsCount,
      rentalPrice: prices.rentalPrice,
      totalPrice: prices.totalPrice,
      depositAmount: prices.depositAmount,
      balanceAmount: prices.balanceAmount,
      cleaningPrice: prices.cleaningPrice,
      linenPrice: prices.linenPrice,
      touristTaxPrice: prices.touristTaxPrice,
      cleaningOffered: prices.booking.cleaningOffered,
      linenOffered: prices.booking.linenOffered,
    };

    const pdfBuffer = this.pdfService.generateContract(contractData);

    const filename = `contrat-${client.lastName.toLowerCase()}-${prices.booking.startDate.toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.end(pdfBuffer);
  }

  @Get('bookings/:bookingId/invoice')
  async downloadInvoice(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Res() res: Response
  ): Promise<void> {
    const prices = await this.bookingPriceComputeService.computeForBooking(bookingId, true);
    const client = prices.booking.primaryClient as NonNullable<typeof prices.booking.primaryClient>;

    const invoiceNumber = generateInvoiceNumber(
      new Date(prices.booking.startDate),
      client.lastName
    );

    const invoiceData: InvoiceGenerateData = {
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientAddress: client.address,
      clientCity: client.city,
      clientPostalCode: client.postalCode,
      clientCountry: client.country,
      invoiceNumber,
      startDate: new Date(prices.booking.startDate),
      endDate: new Date(prices.booking.endDate),
      rentalPrice: prices.rentalPrice,
      nightsCount: prices.nightsCount,
      totalPrice: prices.totalPrice,
      depositAmount: prices.depositAmount,
      balanceAmount: prices.balanceAmount,
      cleaningPrice: prices.cleaningPrice,
      cleaningIncluded: prices.booking.cleaningIncluded,
      cleaningOffered: prices.booking.cleaningOffered,
      linenPrice: prices.linenPrice,
      linenIncluded: prices.booking.linenIncluded,
      linenOffered: prices.booking.linenOffered,
      touristTaxPrice: prices.touristTaxPrice,
      priceDetails: prices.priceDetails,
    };

    const pdfBuffer = this.pdfService.generateInvoice(invoiceData);

    const filename = `facture-${invoiceNumber}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.end(pdfBuffer);
  }
}
