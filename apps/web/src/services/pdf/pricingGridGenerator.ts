import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { configurePdfWithFrenchFont } from './fontLoader';
import { LOGEMENT, TARIFS, BAILLEUR } from '../../constants/property';
import logoImage from '@/assets/branding/pierre-vacance.png';
import type { Season, DatePeriod } from '../../lib/api';

// Couleurs inspirées du template
const COLORS = {
  black: { r: 0, g: 0, b: 0 },
  darkGray: { r: 80, g: 80, b: 80 },
  gray: { r: 120, g: 120, b: 120 },
  lightGray: { r: 200, g: 200, b: 200 },
  coral: { r: 255, g: 107, b: 107 }, // Couleur accent pour titre et prix
};

/**
 * Charge une image et la convertit en Data URL optimisée pour PDF
 */
function loadImage(url: string, maxWidth = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = (): void => {
      const canvas = document.createElement('canvas');
      // Redimensionner pour réduire la taille du PDF
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      // PNG pour préserver la transparence du logo
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface PeriodRow {
  period: string;
  weeklyPrice: string;
  nightlyPrice: string;
}

/**
 * Formate une date pour le PDF (ex: "26 Avril")
 */
function formatDateForPdf(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
}

/**
 * Prépare les données du tableau pour le PDF
 */
function preparePeriodRows(
  periods: DatePeriod[],
  seasons: Season[]
): { rows: PeriodRow[]; minNightsGlobal: number } {
  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  let minNightsGlobal = 2;
  const rows: PeriodRow[] = [];

  for (const period of sortedPeriods) {
    const season = seasons.find((s) => s.id === period.season.id);
    if (!season) continue;

    // Utiliser le minimum le plus bas comme global (pour l'affichage en en-tête)
    if (season.minNights < minNightsGlobal || minNightsGlobal === 2) {
      minNightsGlobal = Math.max(2, season.minNights);
    }

    const periodText = `Du ${formatDateForPdf(period.startDate)} au ${formatDateForPdf(period.endDate)}`;

    // Calculer le prix semaine
    const weeklyPrice = season.weeklyNightRate
      ? season.weeklyNightRate * 7
      : season.pricePerNight * 7;

    // Toujours afficher le tarif nuit
    const nightlyPrice = `${String(Math.round(season.pricePerNight))}€`;

    rows.push({
      period: periodText,
      weeklyPrice: `${String(Math.round(weeklyPrice))}€`,
      nightlyPrice,
    });
  }

  return { rows, minNightsGlobal };
}

/**
 * Génère le PDF de la grille tarifaire - Style moderne inspiré du template Pierre & Vacances
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

  // Charger le logo et générer le QR code (optimisés pour taille PDF réduite)
  const logoDataUrl = await loadImage(logoImage, 250);
  const websiteUrl = LOGEMENT.site;
  const qrCodeDataUrl = await QRCode.toDataURL(websiteUrl, {
    width: 80, // Réduit de 200 à 80 pour optimiser la taille du PDF
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = 35;

  // ============================================================================
  // EN-TÊTE - Style moderne avec logo
  // ============================================================================

  // Titre principal du lieu (gras, noir, aligné à gauche)
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text('MAISON DALHIAS 19', marginLeft, y);

  // Logo Pierre & Vacances (en haut à droite)
  const logoWidth = 40;
  const logoHeight = 22;
  doc.addImage(
    logoDataUrl,
    'PNG',
    pageWidth - marginRight - logoWidth,
    y - 12,
    logoWidth,
    logoHeight
  );

  y += 8;

  // Sous-titre localisation
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Village Le Rouret  •  Ardèche', marginLeft, y);

  y += 25;

  // ============================================================================
  // TITRE GRILLE TARIFAIRE - Couleur corail
  // ============================================================================

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.coral.r, COLORS.coral.g, COLORS.coral.b);
  doc.text(`GRILLE TARIFAIRE ${String(year)}`, pageWidth / 2, y, {
    align: 'center',
  });

  y += 20;

  // Préparer les données
  const { rows, minNightsGlobal } = preparePeriodRows(periods, seasons);

  // ============================================================================
  // TABLEAU DES TARIFS - Nouveau design
  // ============================================================================

  // Définition des colonnes (3 colonnes: Période, tarif/Semaine, tarif/Nuit)
  const col1X = marginLeft; // Période
  const col2X = marginLeft + contentWidth - 70; // tarif/Semaine
  const col3X = marginLeft + contentWidth - 25; // tarif/Nuit
  const col2Width = 45;
  const col3Width = 45;

  const rowHeight = 12;

  // En-tête du tableau (texte gris, majuscules)
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text('PÉRIODE', col1X, y);
  doc.text('TARIF/SEMAINE', col2X + col2Width / 2, y, { align: 'center' });
  doc.text('TARIF/NUIT', col3X + col3Width / 2, y, { align: 'center' });

  y += 5;

  // Ligne de séparation fine sous l'en-tête
  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);

  y += rowHeight;

  // Lignes du tableau
  doc.setFontSize(10);

  for (const row of rows) {
    // Période (aligné à gauche, gras)
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
    doc.text(row.period, col1X, y);

    // Prix semaine (centré, couleur corail, gras)
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(COLORS.coral.r, COLORS.coral.g, COLORS.coral.b);
    doc.text(row.weeklyPrice, col2X + col2Width / 2, y, { align: 'center' });

    // Prix nuit (centré, couleur corail)
    doc.setFont('Roboto', 'normal');
    doc.text(row.nightlyPrice, col3X + col3Width / 2, y, { align: 'center' });

    y += rowHeight;
  }

  y += 15;

  // ============================================================================
  // SECTIONS OPTIONS ET INFORMATIONS (côte à côte) - Design amélioré
  // ============================================================================

  const midPoint = pageWidth / 2;

  // Titre OPTIONS (à gauche)
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text('OPTIONS', marginLeft, y);

  // Titre INFORMATIONS (à droite)
  doc.text('INFORMATIONS', midPoint + 15, y);

  y += 3;

  // Lignes de soulignement sous les titres (couleur corail)
  doc.setDrawColor(COLORS.coral.r, COLORS.coral.g, COLORS.coral.b);
  doc.setLineWidth(1);
  doc.line(marginLeft, y, marginLeft + 32, y);
  doc.line(midPoint + 15, y, midPoint + 62, y);

  y += 12;

  // Contenu OPTIONS
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);

  doc.text('Ménage fin de séjour', marginLeft, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text(`${String(TARIFS.menage)} €`, marginLeft + 70, y, { align: 'right' });

  // Contenu INFORMATIONS (même ligne)
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Séjour minimum', midPoint + 15, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text(`${String(minNightsGlobal)} nuits`, pageWidth - marginRight, y, { align: 'right' });

  y += 9;

  // Linge de maison
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Linge de maison', marginLeft, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text(`${String(TARIFS.linge)} €/pers`, marginLeft + 70, y, { align: 'right' });

  // Capacité max
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Capacité max', midPoint + 15, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text(`${String(LOGEMENT.capaciteMax)} personnes`, pageWidth - marginRight, y, {
    align: 'right',
  });

  y += 9;

  // Dépôt de garantie
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Dépôt de garantie', marginLeft, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text(`${String(TARIFS.caution)} €`, marginLeft + 70, y, { align: 'right' });

  // Juillet et août : 7 nuits minimum
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text('Juillet et août', midPoint + 15, y);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text('7 nuits min.', pageWidth - marginRight, y, { align: 'right' });

  // ============================================================================
  // FOOTER - Design moderne avec QR code (position fixe en bas de page)
  // ============================================================================

  // Ligne de séparation élégante
  const footerLineY = pageHeight - 48;
  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, footerLineY, pageWidth - marginRight, footerLineY);

  // Zone QR code (à gauche)
  const qrSize = 25;
  const qrX = marginLeft;
  const qrY = footerLineY + 5;
  doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Texte à côté du QR code
  const textStartX = qrX + qrSize + 8;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.black.r, COLORS.black.g, COLORS.black.b);
  doc.text('Réservez en ligne', textStartX, qrY + 8);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.coral.r, COLORS.coral.g, COLORS.coral.b);
  doc.text(LOGEMENT.site, textStartX, qrY + 14);

  // Contact (à droite)
  const contactX = pageWidth - marginRight;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b);
  doc.text(BAILLEUR.telephone, contactX, qrY + 8, { align: 'right' });
  doc.text(BAILLEUR.email, contactX, qrY + 14, { align: 'right' });

  // Adresse en bas, centrée
  const addressY = pageHeight - 10;
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
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
