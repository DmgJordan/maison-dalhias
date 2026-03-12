import type { BookingSource, BookingStatus } from '../lib/api';

export const SOURCE_LABELS: Record<BookingSource, string> = {
  ABRITEL: 'Abritel',
  AIRBNB: 'Airbnb',
  BOOKING_COM: 'Booking.com',
  PERSONNEL: 'Personnel',
  FAMILLE: 'Famille',
  OTHER: 'Autre',
};

export const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: '#94a3b8' },
  VALIDATED: { label: 'Validée', color: '#3b82f6' },
  CONTRACT_SENT: { label: 'Contrat envoyé', color: '#f59e0b' },
  DEPOSIT_PAID: { label: 'Acompte payé', color: '#8b5cf6' },
  FULLY_PAID: { label: 'Soldée', color: '#10b981' },
  CANCELLED: { label: 'Annulée', color: '#ef4444' },
};

export const NEXT_STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  DRAFT: 'Valider',
  VALIDATED: 'Marquer contrat envoyé',
  CONTRACT_SENT: 'Marquer acompte reçu',
  DEPOSIT_PAID: 'Marquer soldée',
};
