import type { Booking } from '../lib/api';
import { SOURCE_LABELS } from '../constants/booking';

/**
 * Pure utility functions for booking capability checks.
 * Zero framework coupling — no Vue refs, no Pinia imports, no API calls.
 */

export function canGenerateContract(booking: Booking): boolean {
  const client = booking.primaryClient;
  if (!client) return false;

  const hasCompleteClient =
    !!client.firstName &&
    !!client.lastName &&
    !!client.address &&
    !!client.city &&
    !!client.postalCode &&
    !!client.country &&
    !!client.phone;

  return hasCompleteClient && booking.rentalPrice != null && booking.occupantsCount != null;
}

// Note: The typeof checks below are currently always true because the Prisma schema
// defines these fields as non-nullable Boolean @default(false). They are kept as a
// safeguard in case the schema evolves to allow nullable option fields (e.g. to
// distinguish "not yet decided" from "explicitly set to false").
export function canGenerateInvoice(booking: Booking): boolean {
  if (!canGenerateContract(booking)) return false;

  return (
    typeof booking.cleaningIncluded === 'boolean' &&
    typeof booking.linenIncluded === 'boolean' &&
    typeof booking.touristTaxIncluded === 'boolean'
  );
}

export function canSendEmail(booking: Booking): boolean {
  return !!booking.primaryClient?.email;
}

export function getDisabledReason(
  booking: Booking,
  action: 'contract' | 'invoice' | 'email'
): string | null {
  switch (action) {
    case 'contract':
      return canGenerateContract(booking)
        ? null
        : 'Informations client complètes et tarification requises';
    case 'invoice':
      return canGenerateInvoice(booking)
        ? null
        : 'Informations client, tarification et options de séjour requises';
    case 'email':
      if (canSendEmail(booking)) return null;
      return booking.primaryClient ? 'Adresse email du client requise' : 'Client non renseigné';
  }
}

export function formatClientName(client: Booking['primaryClient']): string {
  if (!client) return 'Non renseigné';
  return `${client.firstName} ${client.lastName}`;
}

export function isQuickBooking(booking: Booking): boolean {
  return booking.bookingType === 'EXTERNAL' || booking.bookingType === 'PERSONAL';
}

export function getSourceDisplayName(booking: Booking): string {
  if (!booking.source) return 'Direct';
  if (booking.source === 'OTHER' && booking.sourceCustomName) {
    return booking.sourceCustomName;
  }
  return SOURCE_LABELS[booking.source];
}

export function getSourceBadgeColor(booking: Booking): { bg: string; text: string } {
  switch (booking.bookingType) {
    case 'EXTERNAL':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'PERSONAL':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'DIRECT':
    default:
      return { bg: 'bg-rose-100', text: 'text-rose-800' };
  }
}
