/**
 * Constantes métier centralisées pour Maison Dalhias 19
 * Ce fichier regroupe toutes les données fixes de la propriété
 */

// ============================================================================
// PAYS
// ============================================================================

export const COUNTRIES = [
  'France',
  'Belgique',
  'Suisse',
  'Luxembourg',
  'Allemagne',
  'Pays-Bas',
  'Espagne',
  'Italie',
  'Portugal',
  'Royaume-Uni',
] as const;

// ============================================================================
// INTERFACES
// ============================================================================

export interface Bailleur {
  nom: string;
  adresse: string;
  adresse1: string;
  adresse2: string;
  dateNaissance: string;
  telephone: string;
  email: string;
  iban: string;
  bic: string;
}

export interface Logement {
  nom: string;
  type: string;
  adresse: string;
  adresseComplete: string;
  adresseContrat: string;
  codePostal: string;
  ville: string;
  pieces: number;
  chambres: number;
  surface: string;
  surfaceM2: number;
  capaciteMax: number;
  site: string;
}

export interface Tarifs {
  menage: number;
  linge: number;
  taxeSejour: number;
  caution: number;
  acompte: number; // Pourcentage (30%)
}

export interface PricingPeriod {
  name: string;
  dates: string;
  price: number;
  pricePerNight: number;
}

// ============================================================================
// BAILLEUR
// ============================================================================

export const BAILLEUR: Bailleur = {
  nom: 'Dominguez Alvarez Christelle',
  adresse: '12 rue du grand clos, Villers la Montagne 54920',
  adresse1: '12 rue du grand clos',
  adresse2: '54920 Villers la Montagne',
  dateNaissance: '22/07/1969',
  telephone: '+33 7 87 86 43 58',
  email: 'dominguez-juan@orange.fr',
  iban: 'FR76 1027 8043 1300 0477 8024 032',
  bic: 'CMCIFR2A',
};

// ============================================================================
// LOGEMENT
// ============================================================================

export const LOGEMENT: Logement = {
  nom: 'Maison Dalhias 19',
  type: 'Maison mitoyenne de 3 pièces en duplex avec terrasse',
  adresse: 'Village Le Rouret - Pierre & Vacances',
  adresseComplete: '675 route du château du rouret',
  adresseContrat: 'Village Le Rouret en Ardèche, 675 route du château du rouret 07120 Grospierres',
  codePostal: '07120',
  ville: 'Grospierres',
  pieces: 3,
  chambres: 2,
  surface: '39m²',
  surfaceM2: 39,
  capaciteMax: 6,
  site: 'https://maison-dalhias.fr',
};

// ============================================================================
// TARIFS
// ============================================================================

export const TARIFS: Tarifs = {
  menage: 80,
  linge: 15,
  taxeSejour: 0.8,
  caution: 500,
  acompte: 30,
};

// ============================================================================
// PERIODES TARIFAIRES
// ============================================================================

export const PRICING_PERIODS: PricingPeriod[] = [
  {
    name: 'Hors Saison',
    dates: 'Du 1 Mai au 28 Juin / Du 30 Août au 27 Septembre',
    price: 400,
    pricePerNight: 80,
  },
  {
    name: "Début et Fin d'Été",
    dates: 'Du 28 Juin au 13 Juillet / Du 23 Août au 30 Août',
    price: 650,
    pricePerNight: 120,
  },
  {
    name: 'Période Estivale',
    dates: 'Du 13 Juillet au 26 Juillet',
    price: 750,
    pricePerNight: 150,
  },
  {
    name: "Cœur de l'Été",
    dates: 'Du 26 Juillet au 23 Août',
    price: 950,
    pricePerNight: 180,
  },
];

// ============================================================================
// DETAILS HEBERGEMENT
// ============================================================================

export const ACCOMMODATION_DETAILS: string[] = [
  'Surface : 39m²',
  'Capacité maximale : 6 personnes',
  'Chambre principale avec lit 140*200',
  'Chambre secondaire avec 2 lits simples',
  'Salon avec canapé-lit confortable 160*200',
];

// ============================================================================
// SERVICES & EQUIPEMENTS
// ============================================================================

export const AMENITIES: string[] = [
  'Cuisine équipée',
  'Accès piscine',
  'WiFi gratuit',
  'Parking gratuit',
  'Animations quotidiennes',
  'Vue panoramique',
  'Terrasse privative',
  'Accès aux installations du domaine',
];

export const INCLUDED_SERVICES: string[] = [
  'Accès aux installations du domaine',
  'Accès piscine (01 Avril - 30 Septembre)',
  'Parking gratuit',
  'WiFi inclus',
  'Animations quotidiennes (selon saison)',
];

// ============================================================================
// COULEURS PDF
// ============================================================================

export const PDF_COLORS = {
  primary: { r: 34, g: 34, b: 34 },
  secondary: { r: 100, g: 100, b: 100 },
  light: { r: 245, g: 245, b: 245 },
  border: { r: 200, g: 200, b: 200 },
  accent: { r: 255, g: 56, b: 92 },
} as const;

// ============================================================================
// CONSTANTES RESERVATION
// ============================================================================

export const BOOKING_CONSTANTS = {
  minStayDays: 3,
  depositPercentage: 30,
  balanceDaysBefore: 15,
} as const;
