import { Prisma } from '@prisma/client';

/**
 * Utilitaires pour la conversion des types Decimal Prisma
 */

/**
 * Convertit un Decimal Prisma en nombre JavaScript
 */
export function toNumber(decimal: Prisma.Decimal | number | null | undefined): number {
  if (decimal === null || decimal === undefined) {
    return 0;
  }
  return Number(decimal);
}

/**
 * Convertit un nombre JavaScript en Decimal Prisma
 */
export function toDecimal(num: number): Prisma.Decimal {
  return new Prisma.Decimal(num);
}
