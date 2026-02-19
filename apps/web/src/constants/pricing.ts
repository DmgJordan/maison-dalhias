/**
 * Constantes de tarification pour la location
 * Ces valeurs sont utilisées comme fallback quand l'API n'est pas disponible
 */

// Tarifs par défaut selon la période (fallback)
export const FALLBACK_PRICES = {
  LOW_SEASON: 80, // Basse saison (Nov-Mars)
  MID_SEASON: 120, // Moyenne saison (Avr-Juin, Sept-Oct)
  HIGH_SEASON: 150, // Haute saison (Juillet-Août)
} as const;

// Options fixes
export const OPTION_PRICES = {
  CLEANING: 80, // Ménage fin de séjour
  LINEN_PER_PERSON: 15, // Linge de maison par personne
  TOURIST_TAX_PER_ADULT_PER_NIGHT: 0.8, // Taxe de séjour par adulte par nuit
  SECURITY_DEPOSIT: 500, // Dépôt de garantie (non encaissé)
} as const;

// Pourcentages
export const PAYMENT_PERCENTAGES = {
  DEPOSIT: 0.3, // Acompte (30%)
} as const;

// Contraintes de réservation
export const BOOKING_CONSTRAINTS = {
  MIN_NIGHTS: 3, // Minimum de nuits
  MAX_OCCUPANTS: 6, // Maximum de personnes
} as const;

/**
 * Détermine le prix par nuit de secours basé sur le mois
 */
export function getFallbackPricePerNight(month: number): number {
  // Juillet-Août = Haute saison
  if (month >= 7 && month <= 8) {
    return FALLBACK_PRICES.HIGH_SEASON;
  }
  // Avril-Juin ou Septembre-Octobre = Moyenne saison
  if ((month >= 4 && month <= 6) || month === 9 || month === 10) {
    return FALLBACK_PRICES.MID_SEASON;
  }
  // Reste = Basse saison
  return FALLBACK_PRICES.LOW_SEASON;
}
