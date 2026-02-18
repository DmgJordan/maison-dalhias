import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailService } from './email.service';
import { SendDocumentEmailDto } from './dto/send-document-email.dto';
import { buildEmailSubject } from './email.service';
import { generateInvoiceNumber } from '../pdf/invoice-generator.service';
import type { ContractGenerateData } from '../pdf/contract-generator.service';
import type { InvoiceGenerateData, PriceDetailForInvoice } from '../pdf/invoice-generator.service';
import { TARIFS } from '../pdf/constants/property';
import { EmailLog, ContractSnapshot, InvoiceSnapshot, Prisma } from '@prisma/client';

interface EmailLogWithSnapshots extends EmailLog {
  contractSnapshot: ContractSnapshot | null;
  invoiceSnapshot: InvoiceSnapshot | null;
}

@Controller('emails')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private bookingsService: BookingsService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private prisma: PrismaService
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, AdminGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
    const rentalPrice = Number(booking.rentalPrice);
    const nightsCount = Math.ceil(
      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const cleaningPrice = booking.cleaningIncluded
      ? booking.cleaningOffered
        ? 0
        : TARIFS.menage
      : 0;
    const linenPrice = booking.linenIncluded
      ? booking.linenOffered
        ? 0
        : TARIFS.linge * booking.occupantsCount
      : 0;
    const touristTaxPrice = booking.touristTaxIncluded
      ? TARIFS.taxeSejour * booking.adultsCount * nightsCount
      : 0;
    const totalPrice = rentalPrice + cleaningPrice + linenPrice + touristTaxPrice;
    const depositPercentage = TARIFS.acompte / 100;
    const depositAmount = Math.round(totalPrice * depositPercentage);
    const balanceAmount = totalPrice - depositAmount;

    // 4. Create snapshots in transaction
    let priceDetailsJson: PriceDetailForInvoice[] | undefined;

    if (dto.documentTypes.includes('invoice')) {
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
      } catch (err) {
        this.logger.warn(`Échec du recalcul de prix pour la réservation ${booking.id}`, err);
      }
    }

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
            depositAmount,
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
            nightsCount,
            cleaningPrice: cleaningPrice > 0 ? cleaningPrice : null,
            cleaningOffered: booking.cleaningOffered,
            linenPrice: linenPrice > 0 ? linenPrice : null,
            linenOffered: booking.linenOffered,
            touristTaxPrice: touristTaxPrice > 0 ? touristTaxPrice : null,
            totalPrice,
            depositAmount,
            balanceAmount,
            priceDetailsJson: priceDetailsJson
              ? (priceDetailsJson as unknown as Prisma.InputJsonValue)
              : undefined,
          },
        });
        invoiceId = snapshot.id;
      }

      return { contractSnapshotId: contractId, invoiceSnapshotId: invoiceId };
    });

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
          rentalPrice,
          nightsCount,
          totalPrice,
          depositAmount,
          balanceAmount,
          cleaningPrice,
          cleaningIncluded: booking.cleaningIncluded,
          cleaningOffered: booking.cleaningOffered,
          linenPrice,
          linenIncluded: booking.linenIncluded,
          linenOffered: booking.linenOffered,
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
