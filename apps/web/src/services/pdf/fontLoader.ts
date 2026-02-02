import jsPDF from 'jspdf';

// Cache pour la police chargée
let fontCache: string | null = null;
let fontBoldCache: string | null = null;

// URL des polices Roboto (Google Fonts - Apache License 2.0)
const ROBOTO_REGULAR_URL =
  'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf';
const ROBOTO_BOLD_URL =
  'https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf';

/**
 * Convertit un ArrayBuffer en chaîne base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Charge une police depuis une URL et la convertit en base64
 */
async function loadFontFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur lors du chargement de la police: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

/**
 * Charge les polices Roboto et les met en cache
 */
async function loadRobotoFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache && fontBoldCache) {
    return { regular: fontCache, bold: fontBoldCache };
  }

  // Charger les deux polices en parallèle
  const [regular, bold] = await Promise.all([
    loadFontFromUrl(ROBOTO_REGULAR_URL),
    loadFontFromUrl(ROBOTO_BOLD_URL),
  ]);

  fontCache = regular;
  fontBoldCache = bold;

  return { regular, bold };
}

/**
 * Configure jsPDF avec la police Roboto pour le support UTF-8 complet
 */
export async function configurePdfWithFrenchFont(doc: jsPDF): Promise<void> {
  try {
    const { regular, bold } = await loadRobotoFonts();

    // Ajouter les polices au système de fichiers virtuel de jsPDF
    doc.addFileToVFS('Roboto-Regular.ttf', regular);
    doc.addFileToVFS('Roboto-Bold.ttf', bold);

    // Enregistrer les polices
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Définir Roboto comme police par défaut
    doc.setFont('Roboto', 'normal');
  } catch (error) {
    console.warn('Impossible de charger la police Roboto, utilisation de Helvetica:', error);
    // Fallback sur Helvetica si le chargement échoue
    doc.setFont('helvetica', 'normal');
  }
}

/**
 * Vérifie si les polices sont déjà en cache
 */
export function areFontsCached(): boolean {
  return fontCache !== null && fontBoldCache !== null;
}

/**
 * Précharge les polices en arrière-plan
 */
export async function preloadFonts(): Promise<void> {
  try {
    await loadRobotoFonts();
  } catch (error) {
    console.warn('Préchargement des polices échoué:', error);
  }
}
