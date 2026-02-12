import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from './email.service';
import { SendDocumentEmailDto } from './dto/send-document-email.dto';
import { generateInvoiceNumber } from '../pdf/invoice-generator.service';
import type { ContractGenerateData } from '../pdf/contract-generator.service';
import type { InvoiceGenerateData, PriceDetailForInvoice } from '../pdf/invoice-generator.service';
import { EmailLog, ContractSnapshot, InvoiceSnapshot, Prisma } from '@prisma/client';

// Option price constants matching frontend
const OPTION_PRICES = {
  CLEANING: 80,
  LINEN_PER_PERSON: 15,
  TOURIST_TAX_PER_ADULT_PER_NIGHT: 1,
};
const DEPOSIT_PERCENTAGE = 0.3;

interface EmailLogWithSnapshots extends EmailLog {
  contractSnapshot: ContractSnapshot | null;
  invoiceSnapshot: InvoiceSnapshot | null;
}

@Controller('emails')
export class EmailController {
  constructor(
    private bookingsService: BookingsService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private prisma: PrismaService
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async sendDocumentEmail(@Body() dto: SendDocumentEmailDto): Promise<EmailLogWithSnapshots> {
    // 1. Fetch booking with relations
    const booking = await this.bookingsService.findById(dto.bookingId);

    // 2. Validate booking status
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(
        "Impossible d'envoyer des documents pour une réservation annulée"
      );
    }

    // 3. Validate client data
    const client = booking.primaryClient;
    if (!client) {
      throw new BadRequestException('Aucun client principal associé à cette réservation');
    }

    // Compute prices
    const rentalPrice =
      typeof booking.rentalPrice === 'object'
        ? Number(booking.rentalPrice)
        : Number(booking.rentalPrice);
    const nightsCount = Math.round(
      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const cleaningPrice = booking.cleaningIncluded ? OPTION_PRICES.CLEANING : 0;
    const linenPrice = booking.linenIncluded
      ? OPTION_PRICES.LINEN_PER_PERSON * booking.occupantsCount
      : 0;
    const touristTaxPrice = booking.touristTaxIncluded
      ? OPTION_PRICES.TOURIST_TAX_PER_ADULT_PER_NIGHT * booking.occupantsCount * nightsCount
      : 0;
    const totalPrice = rentalPrice + cleaningPrice + linenPrice + touristTaxPrice;
    const depositAmount = Math.round(totalPrice * DEPOSIT_PERCENTAGE);
    const balanceAmount = totalPrice - depositAmount;

    // 4. Create snapshots
    let contractSnapshotId: string | undefined;
    let invoiceSnapshotId: string | undefined;
    let priceDetailsJson: PriceDetailForInvoice[] | undefined;

    if (dto.documentTypes.includes('contract')) {
      const snapshot = await this.prisma.contractSnapshot.create({
        data: {
          bookingId: booking.id,
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientAddress: client.address,
          clientCity: client.city,
          clientPostalCode: client.postalCode,
          clientCountry: client.country,
          clientEmail: client.email,
          clientPhone: client.phone,
          startDate: booking.startDate,
          endDate: booking.endDate,
          occupantsCount: booking.occupantsCount,
          rentalPrice: booking.rentalPrice,
          cleaningIncluded: booking.cleaningIncluded,
          linenIncluded: booking.linenIncluded,
          touristTaxIncluded: booking.touristTaxIncluded,
          depositAmount,
        },
      });
      contractSnapshotId = snapshot.id;
    }

    if (dto.documentTypes.includes('invoice')) {
      // Try to compute price details from pricing service
      try {
        const priceCalc = await this.bookingsService.recalculatePrice(booking.id);
        if (priceCalc.details.length > 0) {
          priceDetailsJson = priceCalc.details.map((d) => ({
            nights: d.nights,
            seasonName: d.seasonName,
            pricePerNight: d.pricePerNight,
            subtotal: d.subtotal,
          }));
        }
      } catch {
        // If price recalculation fails, proceed without details
      }

      const snapshot = await this.prisma.invoiceSnapshot.create({
        data: {
          bookingId: booking.id,
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientAddress: client.address,
          clientCity: client.city,
          clientPostalCode: client.postalCode,
          clientCountry: client.country,
          rentalPrice: booking.rentalPrice,
          nightsCount,
          cleaningPrice: cleaningPrice > 0 ? cleaningPrice : null,
          linenPrice: linenPrice > 0 ? linenPrice : null,
          touristTaxPrice: touristTaxPrice > 0 ? touristTaxPrice : null,
          totalPrice,
          depositAmount,
          balanceAmount,
          priceDetailsJson: priceDetailsJson
            ? (priceDetailsJson as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });
      invoiceSnapshotId = snapshot.id;
    }

    // 5. Generate PDFs
    let contractPdf: Buffer | undefined;
    let invoicePdf: Buffer | undefined;

    try {
      if (dto.documentTypes.includes('contract')) {
        const contractData: ContractGenerateData = {
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientAddress: client.address,
          clientCity: client.city,
          clientPostalCode: client.postalCode,
          clientCountry: client.country,
          clientPhone: client.phone,
          startDate: new Date(booking.startDate),
          endDate: new Date(booking.endDate),
          occupantsCount: booking.occupantsCount,
          rentalPrice,
          totalPrice,
          depositAmount,
          balanceAmount,
          cleaningPrice,
          linenPrice,
          touristTaxPrice,
        };
        contractPdf = this.pdfService.generateContract(contractData);
      }

      if (dto.documentTypes.includes('invoice')) {
        const invoiceData: InvoiceGenerateData = {
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientAddress: client.address,
          clientCity: client.city,
          clientPostalCode: client.postalCode,
          clientCountry: client.country,
          invoiceNumber: generateInvoiceNumber(new Date(booking.startDate), client.lastName),
          startDate: new Date(booking.startDate),
          endDate: new Date(booking.endDate),
          rentalPrice,
          nightsCount,
          totalPrice,
          depositAmount,
          balanceAmount,
          cleaningPrice,
          linenPrice,
          touristTaxPrice,
          priceDetails: priceDetailsJson,
        };
        invoicePdf = this.pdfService.generateInvoice(invoiceData);
      }
    } catch (error) {
      // If PDF generation fails, create FAILED email log and abort
      const emailLog = await this.prisma.emailLog.create({
        data: {
          bookingId: booking.id,
          recipientEmail: dto.recipientEmail,
          recipientName: dto.recipientName,
          documentTypes: dto.documentTypes,
          subject: this.buildSubject(dto.documentTypes),
          personalMessage: dto.personalMessage,
          status: 'FAILED',
          sentAt: new Date(),
          failedAt: new Date(),
          failureReason:
            error instanceof Error
              ? `Erreur de génération PDF: ${error.message}`
              : 'Erreur de génération PDF inconnue',
          contractSnapshotId,
          invoiceSnapshotId,
        },
        include: {
          contractSnapshot: true,
          invoiceSnapshot: true,
        },
      });
      throw new BadRequestException({
        message: 'Erreur lors de la génération des documents PDF',
        emailLog,
      });
    }

    // 6. Send email
    let resendMessageId: string | undefined;
    let status: 'SENT' | 'FAILED' = 'SENT';
    let failureReason: string | undefined;

    try {
      const result = await this.emailService.sendDocumentEmail({
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        documentTypes: dto.documentTypes,
        startDate: new Date(booking.startDate),
        endDate: new Date(booking.endDate),
        personalMessage: dto.personalMessage,
        contractPdf,
        invoicePdf,
      });
      resendMessageId = result.resendMessageId;
    } catch (error) {
      status = 'FAILED';
      failureReason =
        error instanceof Error ? `Erreur d'envoi: ${error.message}` : "Erreur d'envoi inconnue";
    }

    // 7. Create EmailLog
    const emailLog = await this.prisma.emailLog.create({
      data: {
        bookingId: booking.id,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        documentTypes: dto.documentTypes,
        subject: this.buildSubject(dto.documentTypes),
        personalMessage: dto.personalMessage,
        resendMessageId,
        status,
        sentAt: new Date(),
        failedAt: status === 'FAILED' ? new Date() : undefined,
        failureReason,
        contractSnapshotId,
        invoiceSnapshotId,
      },
      include: {
        contractSnapshot: true,
        invoiceSnapshot: true,
      },
    });

    if (status === 'FAILED') {
      throw new BadRequestException({
        message: "L'envoi de l'email a échoué",
        emailLog,
      });
    }

    return emailLog;
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getByBooking(@Param('bookingId') bookingId: string): Promise<EmailLogWithSnapshots[]> {
    return this.prisma.emailLog.findMany({
      where: { bookingId },
      include: {
        contractSnapshot: true,
        invoiceSnapshot: true,
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  private buildSubject(documentTypes: string[]): string {
    if (documentTypes.length === 2) {
      return '[Maison Dalhias] Vos documents de réservation';
    }
    if (documentTypes.includes('contract')) {
      return '[Maison Dalhias] Votre contrat de location';
    }
    return '[Maison Dalhias] Votre facture';
  }
}
