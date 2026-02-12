import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import jsPDF from 'jspdf';
import { BAILLEUR, TARIFS, PDF_COLORS as COLORS } from './constants/property';

export interface PriceDetailForInvoice {
  nights: number;
  seasonName: string;
  pricePerNight: number;
  subtotal: number;
}

export interface InvoiceGenerateData {
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientCountry: string;
  invoiceNumber: string;
  startDate: Date;
  endDate: Date;
  rentalPrice: number;
  nightsCount: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
  priceDetails?: PriceDetailForInvoice[];
}

// Cache Roboto fonts at module level
let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

function loadRobotoFonts(): { regular: string; bold: string } {
  if (robotoRegularBase64 && robotoBoldBase64) {
    return { regular: robotoRegularBase64, bold: robotoBoldBase64 };
  }
  const regularPath = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
  const boldPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
  robotoRegularBase64 = fs.readFileSync(regularPath).toString('base64');
  robotoBoldBase64 = fs.readFileSync(boldPath).toString('base64');
  return { regular: robotoRegularBase64, bold: robotoBoldBase64 };
}

function configurePdfWithRoboto(doc: jsPDF): void {
  const { regular, bold } = loadRobotoFonts();
  doc.addFileToVFS('Roboto-Regular.ttf', regular);
  doc.addFileToVFS('Roboto-Bold.ttf', bold);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

interface InvoiceLine {
  designation: string;
  montant: number;
}

function drawHeader(doc: jsPDF, pageWidth: number, margin: number): number {
  let y = 25;

  doc.setFontSize(20);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(BAILLEUR.nom, margin, y);

  doc.setFontSize(28);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('FACTURE', pageWidth - margin, y, { align: 'right' });

  y += 10;

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text(BAILLEUR.adresse1, margin, y);
  y += 5;
  doc.text(BAILLEUR.adresse2, margin, y);

  return y + 25;
}

function drawClientInfo(
  doc: jsPDF,
  data: InvoiceGenerateData,
  pageWidth: number,
  margin: number,
  startY: number
): number {
  let y = startY;

  const clientName = `${data.clientFirstName} ${data.clientLastName}`;
  const clientAddress = data.clientAddress;
  const clientCityPostal = `${data.clientPostalCode} ${data.clientCity}`;

  const rightColLabel = pageWidth - margin - 80;
  const rightColValue = pageWidth - margin;

  doc.setFontSize(11);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Facturé à', margin, y);

  doc.text('Facture n°', rightColLabel, y);
  doc.setFont('Roboto', 'normal');
  doc.text(data.invoiceNumber, rightColValue, y, { align: 'right' });

  y += 8;

  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(clientName, margin, y);

  doc.setFont('Roboto', 'bold');
  doc.text('Date', rightColLabel, y);
  doc.setFont('Roboto', 'normal');
  doc.text(formatDateFr(new Date()), rightColValue, y, { align: 'right' });

  y += 6;

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

  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.rect(margin, y - 6, tableWidth, 12);

  y += 14;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);

  const tableContentStartY = y - 6;

  for (const line of lines) {
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    const designationLines = line.designation.split('\n');
    doc.text(designationLines[0], colDesignation + 8, y);
    doc.text(formatPrice(line.montant), colMontant + 25, y, { align: 'right' });

    if (designationLines.length > 1) {
      doc.setFontSize(9);
      doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
      for (let i = 1; i < designationLines.length; i++) {
        y += 5;
        doc.text(designationLines[i], colDesignation + 12, y);
      }
      doc.setFontSize(10);
    }

    y += 4;
    doc.setDrawColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  const tableContentEndY = y - 6;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, tableContentStartY, margin, tableContentEndY);
  doc.line(pageWidth - margin, tableContentStartY, pageWidth - margin, tableContentEndY);
  doc.line(margin, tableContentEndY, pageWidth - margin, tableContentEndY);

  // Ligne TOTAL
  y += 5;

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

function drawPaymentConditions(
  doc: jsPDF,
  depositAmount: number,
  balanceAmount: number,
  margin: number,
  startY: number
): void {
  let y = startY;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Conditions et modalités de paiement', margin, y);

  y += 10;

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

@Injectable()
export class InvoiceGeneratorService {
  generate(data: InvoiceGenerateData): Buffer {
    const { totalPrice, depositAmount, balanceAmount, cleaningPrice, linenPrice, touristTaxPrice } =
      data;

    const doc = new jsPDF();

    configurePdfWithRoboto(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 1. En-tête
    let y = drawHeader(doc, pageWidth, margin);

    // 2. Informations client et numéro de facture
    y = drawClientInfo(doc, data, pageWidth, margin, y);

    // 3. Tableau des prestations
    let locationDesignation = `Location du ${formatDateShort(data.startDate)} au ${formatDateShort(data.endDate)}`;
    if (data.priceDetails && data.priceDetails.length > 1) {
      const detailLines = data.priceDetails.map(
        (d) =>
          `  ${String(d.nights)} nuit${d.nights > 1 ? 's' : ''} ${d.seasonName} x ${formatPrice(d.pricePerNight)} EUR`
      );
      locationDesignation += '\n' + detailLines.join('\n');
    }

    const lines: InvoiceLine[] = [
      {
        designation: locationDesignation,
        montant: data.rentalPrice,
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

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export function generateInvoiceNumber(startDate: Date, clientLastName: string): string {
  const dateStr = startDate.toISOString().split('T')[0];
  const normalizedName = clientLastName
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  return `${dateStr}-${normalizedName}`;
}
