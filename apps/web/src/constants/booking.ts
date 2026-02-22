import type { BookingSource } from '../lib/api';

export const SOURCE_LABELS: Record<BookingSource, string> = {
  ABRITEL: 'Abritel',
  AIRBNB: 'Airbnb',
  BOOKING_COM: 'Booking.com',
  PERSONNEL: 'Personnel',
  FAMILLE: 'Famille',
  OTHER: 'Autre',
};
