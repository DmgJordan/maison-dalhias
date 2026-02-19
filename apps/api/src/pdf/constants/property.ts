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
  acompte: number;
}

export const BAILLEUR: Bailleur = {
  nom: process.env.BAILLEUR_NOM ?? 'Dominguez Alvarez Christelle',
  adresse: process.env.BAILLEUR_ADRESSE ?? '12 rue du grand clos, Villers la Montagne 54920',
  adresse1: process.env.BAILLEUR_ADRESSE1 ?? '12 rue du grand clos',
  adresse2: process.env.BAILLEUR_ADRESSE2 ?? '54920 Villers la Montagne',
  dateNaissance: process.env.BAILLEUR_DATE_NAISSANCE ?? '22/07/1969',
  telephone: process.env.BAILLEUR_TELEPHONE ?? '+33 7 87 86 43 58',
  email: process.env.BAILLEUR_EMAIL ?? 'dominguez-juan@orange.fr',
  iban: process.env.BAILLEUR_IBAN ?? 'FR76 1027 8043 1300 0477 8024 032',
  bic: process.env.BAILLEUR_BIC ?? 'CMCIFR2A',
};

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

export const TARIFS: Tarifs = {
  menage: 80,
  linge: 15,
  taxeSejour: 0.8,
  caution: 500,
  acompte: 30,
};

export const PDF_COLORS = {
  primary: { r: 34, g: 34, b: 34 },
  secondary: { r: 100, g: 100, b: 100 },
  light: { r: 245, g: 245, b: 245 },
  border: { r: 200, g: 200, b: 200 },
  accent: { r: 255, g: 56, b: 92 },
} as const;
