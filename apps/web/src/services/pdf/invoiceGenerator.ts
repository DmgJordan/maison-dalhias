import jsPDF from 'jspdf';
import type { Booking } from '../../lib/api';
import { configurePdfWithFrenchFont } from './fontLoader';
import { BAILLEUR, TARIFS, PDF_COLORS as COLORS } from '../../constants/property';

export interface InvoiceData {
  booking: Booking;
  invoiceNumber: string;
  nightsCount: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
}

/**
 * Formate une date au format français (JJ/MM/AAAA)
 */
function formatDateFr(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une date au format court français (ex: "9 août")
 */
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formate un prix au format français avec séparateur de milliers
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Dessine l'en-tête de la facture
 */
function drawHeader(doc: jsPDF, pageWidth: number, margin: number): number {
  let y = 25;

  // Nom du bailleur (titre principal)
  doc.setFontSize(20);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(BAILLEUR.nom, margin, y);

  // Titre FACTURE à droite
  doc.setFontSize(28);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('FACTURE', pageWidth - margin, y, { align: 'right' });

  y += 10;

  // Adresse du bailleur
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text(BAILLEUR.adresse1, margin, y);
  y += 5;
  doc.text(BAILLEUR.adresse2, margin, y);

  return y + 25;
}

/**
 * Dessine les informations client et numéro de facture
 */
function drawClientInfo(
  doc: jsPDF,
  booking: Booking,
  invoiceNumber: string,
  pageWidth: number,
  margin: number,
  startY: number
): number {
  let y = startY;

  // Informations client
  const clientName = booking.primaryClient
    ? `${booking.primaryClient.firstName} ${booking.primaryClient.lastName}`
    : 'Non renseigné';
  const clientAddress = booking.primaryClient?.address ?? '';
  const clientCityPostal = booking.primaryClient
    ? `${booking.primaryClient.postalCode} ${booking.primaryClient.city}`
    : '';

  // Colonne gauche: "Facturé à"
  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Facturé à', margin, y);

  // Colonne droite: Numéro et date
  const rightColLabel = pageWidth - margin - 80;
  const rightColValue = pageWidth - margin;

  // Ligne facture n°
  doc.text('Facture n°', rightColLabel, y);
  doc.setFont('Roboto', 'normal');
  doc.text(invoiceNumber, rightColValue, y, { align: 'right' });

  y += 8;

  // Nom du client
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(clientName, margin, y);

  // Date
  doc.setFont('Roboto', 'bold');
  doc.text('Date', rightColLabel, y);
  doc.setFont('Roboto', 'normal');
  doc.text(formatDateFr(new Date().toISOString()), rightColValue, y, { align: 'right' });

  y += 6;

  // Adresse du client
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  if (clientAddress) {
    doc.text(clientAddress, margin, y);
    y += 5;
  }
  if (clientCityPostal) {
    doc.text(clientCityPostal, margin, y);
    y += 5;
  }

  return y + 20;
}

interface InvoiceLine {
  designation: string;
  montant: number;
}

/**
 * Dessine le tableau des prestations
 */
function drawTable(
  doc: jsPDF,
  lines: InvoiceLine[],
  totalPrice: number,
  pageWidth: number,
  margin: number,
  startY: number
): number {
  let y = startY;

  const tableWidth = pageWidth - 2 * margin;
  const colDesignation = margin;
  const colMontant = pageWidth - margin - 50;

  // En-tête du tableau
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.rect(margin, y - 6, tableWidth, 12, 'F');

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('DÉSIGNATION', colDesignation + 8, y + 1);
  doc.text('MONTANT', colMontant + 25, y + 1, { align: 'right' });

  // Bordure de l'en-tête
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.rect(margin, y - 6, tableWidth, 12);

  y += 14;

  // Lignes du tableau
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);

  const tableContentStartY = y - 6;

  for (const line of lines) {
    // Texte de la ligne
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(line.designation, colDesignation + 8, y);
    doc.text(formatPrice(line.montant), colMontant + 25, y, { align: 'right' });

    // Ligne de séparation
    y += 4;
    doc.setDrawColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  // Bordure verticale gauche et droite du contenu
  const tableContentEndY = y - 6;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, tableContentStartY, margin, tableContentEndY);
  doc.line(pageWidth - margin, tableContentStartY, pageWidth - margin, tableContentEndY);
  doc.line(margin, tableContentEndY, pageWidth - margin, tableContentEndY);

  // Ligne TOTAL
  y += 5;

  // Fond du total
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.rect(colMontant - 40, y - 6, tableWidth - (colMontant - 40 - margin), 14, 'F');
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(0.8);
  doc.rect(colMontant - 40, y - 6, tableWidth - (colMontant - 40 - margin), 14);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('TOTAL HT', colMontant - 35, y + 2);
  doc.text(`${formatPrice(totalPrice)} €`, colMontant + 25, y + 2, { align: 'right' });

  return y + 20;
}

/**
 * Dessine les conditions de paiement
 */
function drawPaymentConditions(
  doc: jsPDF,
  depositAmount: number,
  balanceAmount: number,
  margin: number,
  startY: number
): void {
  let y = startY;

  // Titre
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Conditions et modalités de paiement', margin, y);

  y += 10;

  // Contenu
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);

  const conditions = [
    `30% d'acompte à la réservation : ${formatPrice(depositAmount)} €`,
    `15 jours avant le départ : ${formatPrice(balanceAmount)} €`,
    `1 chèque de caution de ${String(TARIFS.caution)} € à envoyer à notre adresse en même temps que le solde.`,
    `(celui-ci ne sera pas encaissé) qui vous sera rendu dans les 8 jours après l'état des lieux.`,
  ];

  for (const condition of conditions) {
    doc.text(condition, margin, y);
    y += 6;
  }
}

/**
 * Génère une facture PDF professionnelle
 */
export async function generateInvoice(data: InvoiceData): Promise<void> {
  const {
    booking,
    invoiceNumber,
    totalPrice,
    depositAmount,
    balanceAmount,
    cleaningPrice,
    linenPrice,
    touristTaxPrice,
  } = data;

  const doc = new jsPDF();

  // Configurer la police pour le support UTF-8 (caractères français)
  await configurePdfWithFrenchFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // 1. En-tête
  let y = drawHeader(doc, pageWidth, margin);

  // 2. Informations client et numéro de facture
  y = drawClientInfo(doc, booking, invoiceNumber, pageWidth, margin, y);

  // 3. Tableau des prestations
  const rentalPrice =
    typeof booking.rentalPrice === 'string' ? parseFloat(booking.rentalPrice) : booking.rentalPrice;

  const lines: InvoiceLine[] = [
    {
      designation: `Location du ${formatDateShort(booking.startDate)} au ${formatDateShort(booking.endDate)}`,
      montant: rentalPrice,
    },
    {
      designation: `Ménage ${String(TARIFS.menage)} € (sauf coin cuisine)`,
      montant: cleaningPrice,
    },
    {
      designation: `Linge de lit et serviettes de toilettes ${String(TARIFS.linge)} €/personne`,
      montant: linenPrice,
    },
    {
      designation: `Taxe de séjour ${String(TARIFS.taxeSejour)} €/pers/jour sauf mineur`,
      montant: touristTaxPrice,
    },
  ];

  y = drawTable(doc, lines, totalPrice, pageWidth, margin, y);

  // 4. Conditions de paiement
  drawPaymentConditions(doc, depositAmount, balanceAmount, margin, y + 20);

  // Télécharger le PDF
  const clientFileName = booking.primaryClient
    ? `${booking.primaryClient.lastName}_${booking.primaryClient.firstName}`
    : 'client';
  const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
  doc.save(`facture_${invoiceNumber}_${clientFileName}_${startDateStr}.pdf`);
}

/**
 * Génère un numéro de facture formaté (ex: "001", "002", etc.)
 */
export function generateInvoiceNumber(existingCount: number): string {
  const nextNumber = existingCount + 1;
  return nextNumber.toString().padStart(3, '0');
}
