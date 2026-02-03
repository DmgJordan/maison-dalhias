import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { configurePdfWithFrenchFont } from './fontLoader';
import { BAILLEUR, LOGEMENT, TARIFS, BOOKING_CONSTANTS } from '../../constants/property';
import logoImage from '@/assets/branding/pierre-vacance.png';
import type { Season, DatePeriod } from '../../lib/api';
import { formatDateShort as formatDateShortUtil, formatPriceSimple } from '../../utils/formatting';

// Couleurs du design
const COLORS = {
  primary: { r: 34, g: 34, b: 34 }, // Noir/gris foncé
  secondary: { r: 107, g: 114, b: 128 }, // Gris moyen
  light: { r: 243, g: 244, b: 246 }, // Gris très clair
  accent: { r: 255, g: 56, b: 92 }, // Rouge/rose
  white: { r: 255, g: 255, b: 255 },
};

interface SeasonWithPeriods {
  season: Season;
  periods: DatePeriod[];
}

/**
 * Charge une image et la convertit en Data URL
 */
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = (): void => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Utilise les fonctions de formatage centralisées
const formatDateShort = (dateString: string): string => formatDateShortUtil(dateString, true);
const formatPrice = formatPriceSimple;

/**
 * Groupe les périodes par saison
 */
function groupPeriodsBySeason(periods: DatePeriod[], seasons: Season[]): SeasonWithPeriods[] {
  const grouped: SeasonWithPeriods[] = [];
  const sortedSeasons = [...seasons].sort((a, b) => a.order - b.order);

  for (const season of sortedSeasons) {
    const seasonPeriods = periods
      .filter((p) => p.season.id === season.id)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (seasonPeriods.length > 0) {
      grouped.push({ season, periods: seasonPeriods });
    }
  }

  return grouped;
}

/**
 * Dessine une ligne horizontale fine
 */
function drawLine(doc: jsPDF, y: number, marginLeft: number, marginRight: number): void {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, 210 - marginRight, y);
}

/**
 * Génère le PDF de la grille tarifaire
 */
export async function generatePricingGrid(
  year: number,
  seasons: Season[],
  periods: DatePeriod[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await configurePdfWithFrenchFont(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;

  // Charger les assets
  const websiteUrl = LOGEMENT.site.startsWith('http') ? LOGEMENT.site : `https://${LOGEMENT.site}`;
  const [qrCodeDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(websiteUrl, { width: 200, margin: 1 }),
    loadImage(logoImage),
  ]);

  let y = margin;

  // ============================================================================
  // EN-TÊTE
  // ============================================================================

  // Titre à gauche
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(LOGEMENT.nom.toUpperCase(), margin, y + 8);

  // Sous-titre
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text('Village Le Rouret  •  Ardèche', margin, y + 15);

  // Logo à droite
  const logoWidth = 45;
  const logoHeight = 18;
  doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoWidth, y, logoWidth, logoHeight);

  y += 25;

  // Ligne de séparation
  drawLine(doc, y, margin, margin);
  y += 10;

  // Titre de la grille
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
  doc.text(`GRILLE TARIFAIRE ${String(year)}`, pageWidth / 2, y, { align: 'center' });

  y += 15;

  // ============================================================================
  // TABLEAU DES TARIFS
  // ============================================================================

  const groupedData = groupPeriodsBySeason(periods, seasons);

  // En-tête du tableau
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text('SAISON', margin, y);
  doc.text('PÉRIODES', margin + 55, y);
  doc.text('TARIF', pageWidth - margin - 20, y);

  y += 3;
  drawLine(doc, y, margin, margin);
  y += 8;

  // Lignes du tableau
  doc.setFontSize(11);

  for (const group of groupedData) {
    // Nom de la saison
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(group.season.name, margin, y);

    // Périodes
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);

    let periodY = y;
    for (const period of group.periods) {
      const periodText = `${formatDateShort(period.startDate)}  →  ${formatDateShort(period.endDate)}`;
      doc.text(periodText, margin + 55, periodY);
      periodY += 5;
    }

    // Prix (aligné à droite, centré verticalement)
    const priceY = group.periods.length > 1 ? y + 2.5 : y;
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.text(formatPrice(group.season.pricePerNight), pageWidth - margin, priceY, {
      align: 'right',
    });

    y += Math.max(group.periods.length * 5, 5) + 8;
  }

  y += 5;
  drawLine(doc, y, margin, margin);
  y += 15;

  // ============================================================================
  // OPTIONS & INFORMATIONS (2 colonnes)
  // ============================================================================

  const col1X = margin;
  const col2X = pageWidth / 2 + 5;
  const colWidth = (pageWidth - 2 * margin - 10) / 2;

  // Titres des colonnes
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('OPTIONS', col1X, y);
  doc.text('INFORMATIONS', col2X, y);

  y += 3;

  // Lignes sous les titres
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(0.5);
  doc.line(col1X, y, col1X + 25, y);
  doc.line(col2X, y, col2X + 40, y);

  y += 10;

  // Contenu des colonnes
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);

  const options = [
    { label: 'Ménage fin de séjour', value: formatPrice(TARIFS.menage) },
    { label: 'Linge de maison', value: `${formatPrice(TARIFS.linge)}/pers` },
    { label: 'Dépôt de garantie', value: formatPrice(TARIFS.caution) },
  ];

  const infos = [
    { label: 'Séjour minimum', value: `${String(BOOKING_CONSTANTS.minStayDays)} nuits` },
    { label: 'Capacité max', value: `${String(LOGEMENT.capaciteMax)} personnes` },
  ];

  let optY = y;
  for (const opt of options) {
    doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.text(opt.label, col1X, optY);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(opt.value, col1X + colWidth - 5, optY, { align: 'right' });
    doc.setFont('Roboto', 'normal');
    optY += 8;
  }

  let infoY = y;
  for (const info of infos) {
    doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.text(info.label, col2X, infoY);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(info.value, col2X + colWidth - 5, infoY, { align: 'right' });
    doc.setFont('Roboto', 'normal');
    infoY += 8;
  }

  // ============================================================================
  // PIED DE PAGE
  // ============================================================================

  const footerY = pageHeight - 55;

  drawLine(doc, footerY, margin, margin);

  // QR Code à gauche
  const qrSize = 28;
  doc.addImage(qrCodeDataUrl, 'PNG', margin, footerY + 5, qrSize, qrSize);

  // Texte à côté du QR code
  const qrTextX = margin + qrSize + 8;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Réservez en ligne', qrTextX, footerY + 15);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
  doc.text(LOGEMENT.site, qrTextX, footerY + 22);

  // Contact à droite
  const contactX = pageWidth - margin;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text(BAILLEUR.telephone, contactX, footerY + 15, { align: 'right' });
  doc.text(BAILLEUR.email, contactX, footerY + 22, { align: 'right' });

  // Adresse en bas
  const addressY = pageHeight - 15;
  drawLine(doc, addressY - 5, margin, margin);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.text(
    `${LOGEMENT.adresseComplete}, ${LOGEMENT.codePostal} ${LOGEMENT.ville}`,
    pageWidth / 2,
    addressY,
    { align: 'center' }
  );

  // ============================================================================
  // TÉLÉCHARGEMENT
  // ============================================================================

  doc.save(`grille-tarifaire-${String(year)}.pdf`);
}
