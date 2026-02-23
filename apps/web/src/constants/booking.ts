import type { BookingSource, PaymentStatus } from '../lib/api';

export const SOURCE_LABELS: Record<BookingSource, string> = {
  ABRITEL: 'Abritel',
  AIRBNB: 'Airbnb',
  BOOKING_COM: 'Booking.com',
  PERSONNEL: 'Personnel',
  FAMILLE: 'Famille',
  OTHER: 'Autre',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  PARTIAL: 'Partiel',
  PAID: 'Payé',
  FREE: 'Gratuit',
};
