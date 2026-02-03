/**
 * Utilitaires de formatage partagés
 * Ce fichier centralise les fonctions de formatage pour éviter la duplication de code
 */

/**
 * Formate un prix en euros avec le format français
 * @param price - Le prix à formater
 * @param decimals - Nombre de décimales (0 par défaut)
 */
export function formatPrice(price: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

/**
 * Formate un prix en euros sans le symbole (pour les PDFs)
 * @param price - Le prix à formater
 */
export function formatPriceSimple(price: number): string {
  return `${String(price)} €`;
}

/**
 * Formate une date au format court français (ex: "01 jan" ou "01 janv.")
 * @param dateString - Date au format ISO ou Date object
 * @param removeDot - Supprime le point après le mois abrégé
 */
export function formatDateShort(dateString: string | Date, removeDot: boolean = true): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const formatted = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
  return removeDot ? formatted.replace('.', '') : formatted;
}

/**
 * Formate une date au format français complet (ex: "1 janvier 2025")
 * @param dateString - Date au format ISO ou Date object
 */
export function formatDateFr(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date au format français long avec jour de la semaine (ex: "lundi 1 janvier 2025")
 * @param dateString - Date au format ISO ou Date object
 */
export function formatDateLong(dateString: string | Date): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date au format français court sans année (ex: "1 janvier")
 * @param dateString - Date au format ISO ou Date object
 */
export function formatDateMedium(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formate une date au format JJ/MM/AAAA
 * @param dateString - Date au format ISO ou Date object
 */
export function formatDateNumeric(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une date pour un input HTML de type date (YYYY-MM-DD)
 * @param dateString - Date au format ISO ou Date object
 */
export function formatDateForInput(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toISOString().split('T')[0];
}

/**
 * Normalise une date à minuit (00:00:00) pour éviter les problèmes de fuseaux horaires
 * @param date - Date à normaliser
 */
export function normalizeToMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calcule le nombre de nuits entre deux dates
 * Utilise la normalisation à minuit pour éviter les erreurs de fuseaux horaires
 * @param startDate - Date de début
 * @param endDate - Date de fin
 */
export function countNights(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Normaliser les dates à minuit pour un calcul précis
  const startNormalized = normalizeToMidnight(start);
  const endNormalized = normalizeToMidnight(end);

  const diffTime = endNormalized.getTime() - startNormalized.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Calcule le nombre de jours entre deux dates (alias de countNights pour la clarté)
 * @param startDate - Date de début
 * @param endDate - Date de fin
 */
export function countDays(startDate: string | Date, endDate: string | Date): number {
  return countNights(startDate, endDate);
}

/**
 * Vérifie si une date est dans une plage donnée (inclusive)
 * @param date - Date à vérifier
 * @param startDate - Début de la plage
 * @param endDate - Fin de la plage (exclusive par défaut)
 * @param endInclusive - Si true, la date de fin est inclusive
 */
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date,
  endInclusive: boolean = false
): boolean {
  const d = normalizeToMidnight(typeof date === 'string' ? new Date(date) : date);
  const start = normalizeToMidnight(
    typeof startDate === 'string' ? new Date(startDate) : startDate
  );
  const end = normalizeToMidnight(typeof endDate === 'string' ? new Date(endDate) : endDate);

  if (endInclusive) {
    return d >= start && d <= end;
  }
  return d >= start && d < end;
}
