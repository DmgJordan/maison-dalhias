import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookingPriceComputeService } from '../bookings/booking-price-compute.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from './email.service';
import { SendDocumentEmailDto } from './dto/send-document-email.dto';
import { buildEmailSubject } from './email.service';
import { generateInvoiceNumber } from '../pdf/invoice-generator.service';
import type { ContractGenerateData } from '../pdf/contract-generator.service';
import type { InvoiceGenerateData } from '../pdf/invoice-generator.service';
import { EmailLog, ContractSnapshot, InvoiceSnapshot, Prisma } from '@prisma/client';

interface EmailLogWithSnapshots extends EmailLog {
  contractSnapshot: ContractSnapshot | null;
  invoiceSnapshot: InvoiceSnapshot | null;
}

@Controller('emails')
export class EmailController {
  constructor(
    private bookingPriceComputeService: BookingPriceComputeService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private prisma: PrismaService
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, AdminGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sendDocumentEmail(@Body() dto: SendDocumentEmailDto): Promise<EmailLogWithSnapshots> {
    // 1. Compute prices (also validates client exists)
    const includePriceDetails = dto.documentTypes.includes('invoice');
    const prices = await this.bookingPriceComputeService.computeForBooking(
      dto.bookingId,
      includePriceDetails
    );

    const { booking } = prices;
    // Client is guaranteed to exist by computeForBooking validation
    const client = booking.primaryClient as NonNullable<typeof booking.primaryClient>;

    // 2. Validate booking status
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(
        "Impossible d'envoyer des documents pour une réservation annulée"
      );
    }

    // 3. Create snapshots in transaction
    const { contractSnapshotId, invoiceSnapshotId } = await this.prisma.$transaction(async (tx) => {
      let contractId: string | undefined;
      let invoiceId: string | undefined;

      if (dto.documentTypes.includes('contract')) {
        const snapshot = await tx.contractSnapshot.create({
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
            cleaningOffered: booking.cleaningOffered,
            linenIncluded: booking.linenIncluded,
            linenOffered: booking.linenOffered,
            touristTaxIncluded: booking.touristTaxIncluded,
            depositAmount: prices.depositAmount,
          },
        });
        contractId = snapshot.id;
      }

      if (dto.documentTypes.includes('invoice')) {
        const snapshot = await tx.invoiceSnapshot.create({
          data: {
            bookingId: booking.id,
            clientFirstName: client.firstName,
            clientLastName: client.lastName,
            clientAddress: client.address,
            clientCity: client.city,
            clientPostalCode: client.postalCode,
            clientCountry: client.country,
            rentalPrice: booking.rentalPrice,
            nightsCount: prices.nightsCount,
            cleaningPrice: prices.cleaningPrice > 0 ? prices.cleaningPrice : null,
            cleaningOffered: booking.cleaningOffered,
            linenPrice: prices.linenPrice > 0 ? prices.linenPrice : null,
            linenOffered: booking.linenOffered,
            touristTaxPrice: prices.touristTaxPrice > 0 ? prices.touristTaxPrice : null,
            totalPrice: prices.totalPrice,
            depositAmount: prices.depositAmount,
            balanceAmount: prices.balanceAmount,
            priceDetailsJson: prices.priceDetails
              ? (prices.priceDetails as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        });
        invoiceId = snapshot.id;
      }

      return { contractSnapshotId: contractId, invoiceSnapshotId: invoiceId };
    });

    // 4. Generate PDFs
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
          rentalPrice: prices.rentalPrice,
          totalPrice: prices.totalPrice,
          depositAmount: prices.depositAmount,
          balanceAmount: prices.balanceAmount,
          cleaningPrice: prices.cleaningPrice,
          linenPrice: prices.linenPrice,
          touristTaxPrice: prices.touristTaxPrice,
          cleaningOffered: booking.cleaningOffered,
          linenOffered: booking.linenOffered,
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
          rentalPrice: prices.rentalPrice,
          nightsCount: prices.nightsCount,
          totalPrice: prices.totalPrice,
          depositAmount: prices.depositAmount,
          balanceAmount: prices.balanceAmount,
          cleaningPrice: prices.cleaningPrice,
          cleaningIncluded: booking.cleaningIncluded,
          cleaningOffered: booking.cleaningOffered,
          linenPrice: prices.linenPrice,
          linenIncluded: booking.linenIncluded,
          linenOffered: booking.linenOffered,
          touristTaxPrice: prices.touristTaxPrice,
          priceDetails: prices.priceDetails,
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
          subject: buildEmailSubject(dto.documentTypes),
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

    // 5. Send email
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

    // 6. Create EmailLog
    const emailLog = await this.prisma.emailLog.create({
      data: {
        bookingId: booking.id,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        documentTypes: dto.documentTypes,
        subject: buildEmailSubject(dto.documentTypes),
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
  async getByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string
  ): Promise<EmailLogWithSnapshots[]> {
    return this.prisma.emailLog.findMany({
      where: { bookingId },
      include: {
        contractSnapshot: true,
        invoiceSnapshot: true,
      },
      orderBy: { sentAt: 'desc' },
    });
  }
}
