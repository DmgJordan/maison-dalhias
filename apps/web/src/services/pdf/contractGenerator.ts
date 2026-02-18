import jsPDF from 'jspdf';
import type { Booking } from '../../lib/api';
import signatureImage from '../../../assets/templates/signature.png';
import { BAILLEUR, LOGEMENT, TARIFS } from '../../constants/property';

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
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface ContractData {
  booking: Booking;
  nightsCount: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
}

function formatDateFr(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function numberToWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = [
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
  ];
  const tens = [
    '',
    'dix',
    'vingt',
    'trente',
    'quarante',
    'cinquante',
    'soixante',
    'soixante-dix',
    'quatre-vingt',
    'quatre-vingt-dix',
  ];

  if (num === 0) return 'zero';
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + '-' + teens[u];
    }
    return tens[t] + (u > 0 ? '-' + units[u] : '');
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? 'cent' : units[h] + ' cent';
    return prefix + (rest > 0 ? ' ' + numberToWords(rest) : '');
  }
  if (num < 10000) {
    const th = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = th === 1 ? 'mille' : numberToWords(th) + ' mille';
    return prefix + (rest > 0 ? ' ' + numberToWords(rest) : '');
  }
  return num.toString();
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function generateContract(data: ContractData): Promise<void> {
  const {
    booking,
    totalPrice,
    depositAmount,
    balanceAmount,
    cleaningPrice,
    linenPrice,
    touristTaxPrice,
  } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Titre
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Contrat de location de vacances', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Section: Entre les soussign\u00e9s
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTRE LES SOUSSIGN\u00c9S :', margin, y);
  y += 8;

  // Bailleur
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `${BAILLEUR.nom}, demeurant \u00e0 : ${BAILLEUR.adresse}`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 2;
  doc.text(`N\u00e9 le ${BAILLEUR.dateNaissance}`, margin, y);
  y += 5;
  doc.text(`T\u00e9l\u00e9phone portable : ${BAILLEUR.telephone}`, margin, y);
  y += 5;
  doc.text(`Email : ${BAILLEUR.email}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.text('(le Bailleur)', margin, y);
  y += 10;

  // "et"
  doc.setFont('helvetica', 'bold');
  doc.text('et', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Preneur
  doc.setFont('helvetica', 'normal');
  const clientName = booking.primaryClient
    ? `${booking.primaryClient.firstName} ${booking.primaryClient.lastName}`
    : 'Non renseign\u00e9';
  const clientAddress = booking.primaryClient
    ? `${booking.primaryClient.address}, ${booking.primaryClient.postalCode} ${booking.primaryClient.city}`
    : '';
  const clientPhone = booking.primaryClient?.phone ?? '';

  doc.text(clientName + ',', margin, y);
  y += 5;
  if (clientAddress) {
    y = addWrappedText(doc, `demeurant \u00e0 : ${clientAddress}`, margin, y, contentWidth, 5);
    y += 2;
  }
  if (clientPhone) {
    doc.text(`T\u00e9l\u00e9phone portable : ${clientPhone}`, margin, y);
    y += 5;
  }
  doc.setFont('helvetica', 'italic');
  doc.text('(le Preneur)', margin, y);
  y += 12;

  // Section 1: Objet du contrat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. OBJET DU CONTRAT DE LOCATION SAISONNI\u00c8RE', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const section1Text = `Les parties conviennent que la location faisant l'objet des pr\u00e9sentes est une location saisonni\u00e8re, dont la dur\u00e9e ne peut exc\u00e9der 90 jours.

Le Bailleur d\u00e9clare \u00eatre propri\u00e9taire du logement et en avoir la libre disposition et la pleine jouissance durant la p\u00e9riode de location d\u00e9finie dans les pr\u00e9sentes.

Le Bailleur pourra justifier de la propri\u00e9t\u00e9 de son bien en fournissant les justificatifs demand\u00e9s par le Preneur.`;
  y = addWrappedText(doc, section1Text, margin, y, contentWidth, 5);
  y += 8;

  // Section 2: Description du logement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DESCRIPTION DU LOGEMENT', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Le logement faisant l'objet des pr\u00e9sentes est une : ${LOGEMENT.type}`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 2;
  y = addWrappedText(
    doc,
    `situ\u00e9 \u00e0 ${LOGEMENT.adresseContrat}`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  doc.text(`- Nombre de pi\u00e8ces principales : ${String(LOGEMENT.pieces)}`, margin, y);
  y += 5;
  doc.text(`- Nombre de chambres : ${String(LOGEMENT.chambres)}`, margin, y);
  y += 5;
  doc.text(`- Surface habitable : ${LOGEMENT.surface}`, margin, y);
  y += 5;
  doc.text(`Site et r\u00e9f\u00e9rence de l'annonce : ${LOGEMENT.site}`, margin, y);
  y += 10;

  // Section 3: Nombre d'occupants
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text("3. NOMBRE D'OCCUPANTS", margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Le bien est lou\u00e9 pour ${String(booking.occupantsCount)} occupant${booking.occupantsCount > 1 ? 's' : ''}. Le Preneur s'engage express\u00e9ment \u00e0 ne pas d\u00e9passer ce nombre sans autorisation du propri\u00e9taire.`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 4: P\u00e9riode de location
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. P\u00c9RIODE DE LOCATION', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Le Bailleur loue au Preneur le logement saisonnier', margin, y);
  y += 5;
  doc.text(`du ${formatDateShort(booking.startDate)} \u00e0 16h00`, margin, y);
  y += 5;
  y = addWrappedText(
    doc,
    `au ${formatDateShort(booking.endDate)} \u00e0 11h00, date et heure \u00e0 laquelle le Preneur s'engage \u00e0 avoir int\u00e9gralement lib\u00e9r\u00e9 le logement.`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 5: Remise des cl\u00e9s
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. REMISE DES CL\u00c9S', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'Le Bailleur et le Preneur d\u00e9finissent les modalit\u00e9s de remise des cl\u00e9s suivantes :',
    margin,
    y
  );
  y += 6;
  doc.text(
    "Remise des cl\u00e9s au Preneur \u00e0 l'arriv\u00e9e : Arriv\u00e9e autonome via bo\u00eetier",
    margin,
    y
  );
  y += 5;
  doc.text(
    'Remise des cl\u00e9s au Bailleur au d\u00e9part : D\u00e9part autonome via bo\u00eetier',
    margin,
    y
  );
  y += 10;

  // Nouvelle page si n\u00e9cessaire
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Section 6: Tarif de la location
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('6. TARIF DE LA LOCATION ET CHARGES', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const totalWords = numberToWords(Math.round(totalPrice));
  y = addWrappedText(
    doc,
    `Les Parties ont convenu de fixer le loyer \u00e0 ${formatPrice(totalPrice)} Euros (${totalWords} euros) pour l'int\u00e9gralit\u00e9 de la p\u00e9riode de location.`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    'Le loyer ci-dessus comprend, pour toute la dur\u00e9e de la location, le paiement de toutes les charges locatives.',
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  doc.text('Il comprend aussi :', margin, y);
  y += 5;

  if (booking.cleaningOffered) {
    doc.text('- Le m\u00e9nage de fin de s\u00e9jour : Offert', margin, y);
    y += 5;
  } else if (cleaningPrice > 0) {
    doc.text(
      `- Le m\u00e9nage de fin de s\u00e9jour : ${formatPrice(cleaningPrice)} euros`,
      margin,
      y
    );
    y += 5;
  }
  if (booking.linenOffered) {
    doc.text('- La location de linge de maison : Offert', margin, y);
    y += 5;
  } else if (linenPrice > 0) {
    doc.text(
      `- La location de linge de maison ${formatPrice(TARIFS.linge)} euros/pers : ${formatPrice(linenPrice)} euros`,
      margin,
      y
    );
    y += 5;
  }

  if (touristTaxPrice > 0) {
    doc.text(
      `- La taxe de s\u00e9jour ${formatPrice(TARIFS.taxeSejour)} euro/jour/pers : ${formatPrice(touristTaxPrice)} euros`,
      margin,
      y
    );
    y += 5;
  }
  y += 5;

  // Section 7: R\u00e9servation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('7. R\u00c9SERVATION', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const depositDeadline = new Date();
  depositDeadline.setDate(depositDeadline.getDate() + 15);
  const depositDeadlineStr = formatDateFr(depositDeadline.toISOString());

  y = addWrappedText(
    doc,
    `Afin de proc\u00e9der \u00e0 la r\u00e9servation du logement, le Preneur retourne au Bailleur le pr\u00e9sent contrat paraph\u00e9 \u00e0 chaque page et sign\u00e9 accompagn\u00e9 du versement d'arrhes \u00e0 hauteur de ${formatPrice(depositAmount)} Euros, \u00e0 verser imp\u00e9rativement avant le ${depositDeadlineStr} (dans les 15 jours suivant la r\u00e9ception du contrat), par le moyen suivant :`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  doc.text("- Ch\u00e8que \u00e0 l'ordre du Bailleur \u00e0 l'adresse du dessus", margin, y);
  y += 5;
  doc.text(
    `- Virement sur le compte (IBAN et code BIC) ${BAILLEUR.iban} BIC:${BAILLEUR.bic}`,
    margin,
    y
  );
  y += 10;

  // Nouvelle page si n\u00e9cessaire
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // Section 8: R\u00e8glement du solde
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('8. R\u00c8GLEMENT DU SOLDE DU LOYER', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const balanceDate = new Date(booking.startDate);
  balanceDate.setDate(balanceDate.getDate() - 15);
  const balanceDateStr = formatDateFr(balanceDate.toISOString());

  y = addWrappedText(
    doc,
    `Le solde du montant du loyer, soit ${formatPrice(balanceAmount)} Euros sera vers\u00e9 par le Preneur au plus tard le ${balanceDateStr}, par le moyen suivant :`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  doc.text("- Ch\u00e8que \u00e0 l'ordre du Bailleur", margin, y);
  y += 5;
  doc.text('- Virement sur le compte (IBAN et BIC) : voir au dessus', margin, y);
  y += 5;
  doc.text('- Esp\u00e8ces', margin, y);
  y += 10;

  // Section 9: D\u00e9p\u00f4t de garantie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('9. D\u00c9P\u00d4T DE GARANTIE', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Au plus tard lors de la r\u00e9cup\u00e9ration des cl\u00e9s, le Preneur remettra au Bailleur un ch\u00e8que d'un montant de ${String(TARIFS.caution)} Euros (cinq cent euros) \u00e0 l'ordre du Bailleur \u00e0 titre de d\u00e9p\u00f4t de garantie destin\u00e9 \u00e0 couvrir les \u00e9ventuels dommages locatifs.`,
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    "Sont compris comme dommages locatifs, tous dommages, d\u00e9gradations du logement, ainsi que les dommages, pertes ou vols caus\u00e9s aux biens mobiliers garnissant l'h\u00e9bergement, pendant la p\u00e9riode de location.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    "En l'absence de dommages locatifs le d\u00e9p\u00f4t de garantie sera restitu\u00e9 au Preneur dans un d\u00e9lai maximum de 15 jours apr\u00e8s son d\u00e9part.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Nouvelle page pour le reste
  doc.addPage();
  y = 20;

  // Section 10: Cession et sous-location
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('10. CESSION ET SOUS-LOCATION', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    'Le pr\u00e9sent contrat de location saisonni\u00e8re est conclu au profit du seul Preneur signataire des pr\u00e9sentes. La cession du bail, sous-location totale ou partielle, sont rigoureusement interdites.',
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 11: \u00c9tat des lieux
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('11. \u00c9TAT DES LIEUX', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('\u00c9tat des lieux r\u00e9alis\u00e9 sans la pr\u00e9sence du Bailleur', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(
    doc,
    "Un \u00e9tat des lieux sera mis \u00e0 disposition du Preneur qui aura alors 48 heures pour faire des contestations \u00e9ventuelles, par sms, email, courrier. \u00c0 d\u00e9faut de contestation par le Preneur dans un d\u00e9lai de 48 heures, l'\u00e9tat des lieux \u00e9tabli par le Bailleur sera r\u00e9put\u00e9 accept\u00e9 par le Preneur.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    "Le Preneur \u00e9tablira seul l'\u00e9tat des lieux de sortie et le transmettra le jour de sortie au Bailleur. Le Bailleur pourra contester l'\u00e9tat des lieux dans un d\u00e9lai courant jusqu'\u00e0 l'arriv\u00e9e du prochain locataire, dans une limite de 48 heures.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 12: Obligations du preneur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('12. OBLIGATIONS DU PRENEUR', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    'Le Preneur fera un usage paisible du logement lou\u00e9. Il entretiendra le logement lou\u00e9 et le rendra en bon \u00e9tat de propret\u00e9. Il devra respecter le voisinage.',
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    "Il s'engage \u00e0 faire un usage normal et raisonnable des moyens de confort (chauffage, climatisation, eau, etc.), ainsi que des \u00e9quipements (\u00e9lectrom\u00e9nager, multim\u00e9dia, cuisine, etc.) mis \u00e0 sa disposition.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  doc.text(
    'Il lui est interdit de faire une copie des cl\u00e9s remises par le Bailleur.',
    margin,
    y
  );
  y += 5;
  y = addWrappedText(
    doc,
    "Il s'engage \u00e0 informer le Bailleur dans les meilleurs d\u00e9lais de toute panne, dommage, incidents, ou dysfonctionnement.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 13: Animaux
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('13. ANIMAUX DE COMPAGNIE', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    "La pr\u00e9sence d'animaux de compagnie dans l'h\u00e9bergement est strictement interdite, quelle que soit sa dur\u00e9e, sauf autorisation expresse et \u00e9crite du Bailleur.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 14: Obligations du bailleur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('14. OBLIGATIONS DU BAILLEUR', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    "Le Bailleur s'engage \u00e0 maintenir la location faisant l'objet du pr\u00e9sent contrat dans un \u00e9tat satisfaisant d'entretien, de propret\u00e9 et de s\u00e9curit\u00e9.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 5;
  y = addWrappedText(
    doc,
    "Il devra s'assurer que le Preneur b\u00e9n\u00e9ficie d'une jouissance pleine et enti\u00e8re du bien lou\u00e9, sur la p\u00e9riode. Il veillera \u00e0 la remise des cl\u00e9s. Il s'abstiendra de perturber le confort ou la tranquillit\u00e9 du Preneur pendant la dur\u00e9e du s\u00e9jour.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Nouvelle page pour les derni\u00e8res sections
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // Section 16: Assurance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('16. ASSURANCE', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    "Le Preneur indique b\u00e9n\u00e9ficier d'une assurance couvrant les risques locatifs. Une copie de la police d'assurance pourra \u00eatre demand\u00e9e par le Bailleur au Preneur lors de la r\u00e9servation ou \u00e0 l'entr\u00e9e dans les lieux.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 17: R\u00e9siliation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('17. R\u00c9SILIATION', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    "En cas de manquement par le Preneur \u00e0 l'une de ses obligations contractuelles, le pr\u00e9sent bail sera r\u00e9sili\u00e9 de plein droit. Cette r\u00e9siliation prendra effet apr\u00e8s un d\u00e9lai de 48 heures apr\u00e8s une simple sommation par lettre recommand\u00e9e ou lettre remise en main propre rest\u00e9e infructueuse.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  // Section 18: Domicile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('18. DOMICILE', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    "Pour l'ex\u00e9cution des pr\u00e9sentes, le Bailleur et le Preneur font \u00e9lection de domicile dans leurs domiciles respectifs, indiqu\u00e9s en en-t\u00eate des pr\u00e9sentes. Toutefois, en cas de litige, le tribunal du domicile du Bailleur sera seul comp\u00e9tent. Le pr\u00e9sent contrat est soumis \u00e0 la loi fran\u00e7aise.",
    margin,
    y,
    contentWidth,
    5
  );
  y += 10;

  doc.text('R\u00e9alis\u00e9 en 2 exemplaires', margin, y);
  y += 15;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text('Le Bailleur Signature', margin, y);
  doc.text('Le Preneur Signature', pageWidth - margin - 50, y);
  y += 5;

  // Ajouter l'image de signature du bailleur
  const signatureDataUrl = await loadImage(signatureImage);
  doc.addImage(signatureDataUrl, 'PNG', margin, y, 40, 20);

  doc.setFont('helvetica', 'italic');
  doc.text('lu et approuv\u00e9', margin, y + 25);
  doc.text('lu et approuv\u00e9', pageWidth - margin - 50, y + 20);
  y += 35;

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Date: ${today}`, margin, y);

  // T\u00e9l\u00e9charger le PDF
  const clientFileName = booking.primaryClient
    ? `${booking.primaryClient.lastName}_${booking.primaryClient.firstName}`
    : 'client';
  const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
  doc.save(`contrat_location_${clientFileName}_${startDateStr}.pdf`);
}
