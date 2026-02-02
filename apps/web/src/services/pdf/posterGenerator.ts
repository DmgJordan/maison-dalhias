import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import homepageImage from '@/assets/hero/homepage.png';
import logoImage from '@/assets/branding/pierre-vacance.png';
import { ACCOMMODATION_DETAILS, AMENITIES, BAILLEUR } from '../../constants/property';

/**
 * Charge une image et la convertit en Data URL
 */
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = (): void => {
      const canvas = document.createElement('canvas');
      const aspectRatio = img.width / img.height;
      canvas.width = 1700;
      canvas.height = canvas.width / aspectRatio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      const isTransparentPng = url.toLowerCase().endsWith('.png');
      const format = isTransparentPng ? 'image/png' : 'image/jpeg';
      const quality = isTransparentPng ? 1.0 : 0.95;

      resolve(canvas.toDataURL(format, quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Génère l'affiche promotionnelle PDF avec QR code
 */
export async function generatePromotionalPoster(): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const websiteUrl = window.location.origin;
  const qrCodeDataUrl = await QRCode.toDataURL(websiteUrl);
  const imageDataUrl = await loadImage(homepageImage);
  const logoDataUrl = await loadImage(logoImage);

  // En-tête blanc
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 50, 'F');

  // Ligne de séparation
  doc.setDrawColor(200, 200, 200);
  doc.line(0, 50, 210, 50);

  // Titre principal
  doc.setTextColor(237, 66, 86);
  doc.setFontSize(30);
  doc.text('Maison Dalhias 19', 15, 25);
  doc.setFontSize(18);
  doc.text('Village Vacances Le Rouret - Ardèche', 15, 35);

  // Logo Pierre & Vacances
  const logoWidth = 50;
  const logoHeight = 30;
  doc.addImage(logoDataUrl, 'PNG', 150, 10, logoWidth, logoHeight);

  // Image principale
  const imageWidth = 180;
  const imageHeight = 80;
  doc.addImage(imageDataUrl, 'JPEG', 15, 60, imageWidth, imageHeight, undefined, 'MEDIUM');

  // Description
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Découvrez notre magnifique location de vacances au cœur de l'Ardèche,", 15, 155);
  doc.text('dans le Domaine du Rouret - Pierre & Vacances.', 15, 162);

  // Section Hébergement
  doc.setFillColor(248, 248, 248);
  doc.rect(15, 175, 180, 35, 'F');
  doc.setTextColor(237, 66, 86);
  doc.setFontSize(14);
  doc.text('Hébergement', 20, 185);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let yPos = 192;
  ACCOMMODATION_DETAILS.forEach((detail, index) => {
    if (index % 2 === 0) {
      doc.text(`• ${detail}`, 20, yPos);
    } else {
      doc.text(`• ${detail}`, 110, yPos);
      yPos += 7;
    }
  });

  // Section Services
  doc.setFillColor(237, 66, 86);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, 220, 180, 8, 'F');
  doc.setFontSize(14);
  doc.text('Services inclus', 20, 225);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  yPos = 235;
  AMENITIES.forEach((amenity, index) => {
    if (index % 2 === 0) {
      doc.text(`• ${amenity}`, 20, yPos);
    } else {
      doc.text(`• ${amenity}`, 110, yPos);
      yPos += 7;
    }
  });

  // Pied de page avec QR code et contact
  doc.setFillColor(248, 248, 248);
  doc.rect(0, 260, 210, 37, 'F');

  doc.addImage(qrCodeDataUrl, 'PNG', 15, 265, 30, 30);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Scannez ce QR code pour consulter', 50, 275);
  doc.text('nos tarifs et disponibilités en ligne', 50, 280);
  doc.text('sur notre site web', 50, 285);

  doc.setTextColor(255, 56, 92);
  doc.setFontSize(12);
  doc.text('Contact', 140, 275);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Tél: ${BAILLEUR.telephone}`, 140, 282);
  doc.text(`Email: ${BAILLEUR.email}`, 140, 289);

  // Télécharger le PDF
  doc.save('maison-dalhias-19-presentation.pdf');
}
