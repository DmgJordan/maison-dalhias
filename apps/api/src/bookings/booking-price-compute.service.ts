import { Injectable, BadRequestException } from '@nestjs/common';
import { BookingsService, BookingWithRelations } from './bookings.service';
import { TARIFS } from '../pdf/constants/property';
import type { PriceDetailForInvoice } from '../pdf/invoice-generator.service';

export interface BookingPriceResult {
  booking: BookingWithRelations;
  rentalPrice: number;
  nightsCount: number;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  priceDetails?: PriceDetailForInvoice[];
}

@Injectable()
export class BookingPriceComputeService {
  constructor(private bookingsService: BookingsService) {}

  async computeForBooking(
    bookingId: string,
    includePriceDetails = false
  ): Promise<BookingPriceResult> {
    const booking = await this.bookingsService.findById(bookingId);

    if (!booking.primaryClient) {
      throw new BadRequestException('Aucun client principal associé à cette réservation');
    }

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

    let priceDetails: PriceDetailForInvoice[] | undefined;

    if (includePriceDetails) {
      try {
        const priceCalc = await this.bookingsService.recalculatePrice(booking.id);
        if (priceCalc.details.length > 0) {
          priceDetails = priceCalc.details.map((d) => ({
            nights: d.nights,
            seasonName: d.seasonName,
            pricePerNight: d.pricePerNight,
            subtotal: d.subtotal,
          }));
        }
      } catch {
        // Silencieux si erreur de recalcul
      }
    }

    return {
      booking,
      rentalPrice,
      nightsCount,
      cleaningPrice,
      linenPrice,
      touristTaxPrice,
      totalPrice,
      depositAmount,
      balanceAmount,
      priceDetails,
    };
  }
}
