import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import jsPDF from 'jspdf';
import { BAILLEUR, LOGEMENT, TARIFS } from './constants/property';

export interface ContractGenerateData {
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientCountry: string;
  clientPhone: string;
  startDate: Date;
  endDate: Date;
  occupantsCount: number;
  rentalPrice: number;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  cleaningPrice: number;
  linenPrice: number;
  touristTaxPrice: number;
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(date: Date): string {
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

// Cache signature base64 at module level
let signatureBase64Cache: string | null = null;

function getSignatureBase64(): string {
  if (signatureBase64Cache) return signatureBase64Cache;
  const signaturePath = path.join(__dirname, 'assets', 'signature.png');
  const buffer = fs.readFileSync(signaturePath);
  signatureBase64Cache = 'data:image/png;base64,' + buffer.toString('base64');
  return signatureBase64Cache;
}

@Injectable()
export class ContractGeneratorService {
  generate(data: ContractGenerateData): Buffer {
    const { totalPrice, depositAmount, balanceAmount, cleaningPrice, linenPrice, touristTaxPrice } =
      data;
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

    // Section: Entre les soussignes
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ENTRE LES SOUSSIGNES :', margin, y);
    y += 8;

    // Bailleur
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = addWrappedText(
      doc,
      `${BAILLEUR.nom}, demeurant a : ${BAILLEUR.adresse}`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 2;
    doc.text(`Ne le ${BAILLEUR.dateNaissance}`, margin, y);
    y += 5;
    doc.text(`Telephone portable : ${BAILLEUR.telephone}`, margin, y);
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
    const clientName = `${data.clientFirstName} ${data.clientLastName}`;
    const clientAddress = `${data.clientAddress}, ${data.clientPostalCode} ${data.clientCity}`;
    const clientPhone = data.clientPhone;

    doc.text(clientName + ',', margin, y);
    y += 5;
    if (clientAddress) {
      y = addWrappedText(doc, `demeurant a : ${clientAddress}`, margin, y, contentWidth, 5);
      y += 2;
    }
    if (clientPhone) {
      doc.text(`Telephone portable : ${clientPhone}`, margin, y);
      y += 5;
    }
    doc.setFont('helvetica', 'italic');
    doc.text('(le Preneur)', margin, y);
    y += 12;

    // Section 1: Objet du contrat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. OBJET DU CONTRAT DE LOCATION SAISONNIERE', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const section1Text = `Les parties conviennent que la location faisant l'objet des presentes est une location saisonniere, dont la duree ne peut exceder 90 jours.

Le Bailleur declare etre proprietaire du logement et en avoir la libre disposition et la pleine jouissance durant la periode de location definie dans les presentes.

Le Bailleur pourra justifier de la propriete de son bien en fournissant les justificatifs demandes par le Preneur.`;
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
      `Le logement faisant l'objet des presentes est une : ${LOGEMENT.type}`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 2;
    y = addWrappedText(doc, `situe a ${LOGEMENT.adresseContrat}`, margin, y, contentWidth, 5);
    y += 5;
    doc.text(`- Nombre de pieces principales : ${String(LOGEMENT.pieces)}`, margin, y);
    y += 5;
    doc.text(`- Nombres de chambres : ${String(LOGEMENT.chambres)}`, margin, y);
    y += 5;
    doc.text(`- Surface habitable : ${LOGEMENT.surface}`, margin, y);
    y += 5;
    doc.text(`Site et reference de l'annonce : ${LOGEMENT.site}`, margin, y);
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
      `Le bien est loue pour ${String(data.occupantsCount)} occupant${data.occupantsCount > 1 ? 's' : ''}. Le Preneur s'engage expressement a ne pas depasser ce nombre sans autorisation du proprietaire.`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    // Section 4: Periode de location
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. PERIODE DE LOCATION', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Le Bailleur loue au Preneur le logement saisonnier', margin, y);
    y += 5;
    doc.text(`du ${formatDateShort(data.startDate)} a 16h00`, margin, y);
    y += 5;
    y = addWrappedText(
      doc,
      `au ${formatDateShort(data.endDate)} a 11h00, date et heure a laquelle le Preneur s'engage a avoir integralement libere le logement.`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    // Section 5: Remise des cles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. REMISE DES CLES', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      'Le Bailleur et le Preneur definissent les modalites de remise des cles suivantes :',
      margin,
      y
    );
    y += 6;
    doc.text("Remise des cles au Preneur a l'arrivee : Arrivee autonome via boitier", margin, y);
    y += 5;
    doc.text('Remise des cles au Bailleur au depart : Depart autonome via boitier', margin, y);
    y += 10;

    // Nouvelle page si necessaire
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
      `Les Parties ont convenu de fixer le loyer a ${String(totalPrice)} Euros (${totalWords} euros) pour l'integralite de la periode de location.`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      'Le loyer ci-dessus comprend, pour toute la duree de la location, le paiement de toutes les charges locatives.',
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    doc.text('Il comprend aussi :', margin, y);
    y += 5;

    if (touristTaxPrice > 0) {
      doc.text(
        `- La taxe de sejour ${String(TARIFS.taxeSejour)} euro/jour/pers : ${String(touristTaxPrice)} euros`,
        margin,
        y
      );
      y += 5;
    }
    if (cleaningPrice > 0) {
      doc.text(`- Le menage de fin de sejour : ${String(cleaningPrice)} euros`, margin, y);
      y += 5;
    }
    if (linenPrice > 0) {
      doc.text(
        `- La location de linge de maison ${String(TARIFS.linge)} euros/pers : ${String(linenPrice)} euros`,
        margin,
        y
      );
      y += 5;
    }
    y += 5;

    // Section 7: Reservation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('7. RESERVATION', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const depositDeadline = new Date(data.startDate);
    depositDeadline.setMonth(depositDeadline.getMonth() - 2);
    const depositDeadlineStr = formatDateFr(depositDeadline);

    y = addWrappedText(
      doc,
      `Afin de proceder a la reservation du logement, le Preneur retourne au Bailleur le present contrat paraphe a chaque page et signe accompagne du versement d'arrhes a hauteur de ${String(depositAmount)} Euros, a verser imperativement avant le ${depositDeadlineStr} (2 mois avant l'arrivee), par le moyen suivant :`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    doc.text("- Cheque a l'ordre du Bailleur a l'adresse du dessus", margin, y);
    y += 5;
    doc.text(
      `- Virement sur le compte (IBAN et code BIC) ${BAILLEUR.iban} BIC:${BAILLEUR.bic}`,
      margin,
      y
    );
    y += 10;

    // Nouvelle page si necessaire
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    // Section 8: Reglement du solde
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('8. REGLEMENT DU SOLDE DU LOYER', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const balanceDate = new Date(data.startDate);
    balanceDate.setDate(balanceDate.getDate() - 15);
    const balanceDateStr = formatDateFr(balanceDate);

    y = addWrappedText(
      doc,
      `Le solde du montant du loyer, soit ${String(balanceAmount)} Euros sera verse par le Preneur au plus tard le ${balanceDateStr}, par le moyen suivant :`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    doc.text("- Cheque a l'ordre du Bailleur", margin, y);
    y += 5;
    doc.text('- Virement sur le compte (IBAN et BIC): voir au dessus', margin, y);
    y += 5;
    doc.text('- Espece', margin, y);
    y += 10;

    // Section 9: Depot de garantie
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('9. DEPOT DE GARANTIE', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = addWrappedText(
      doc,
      `Au plus tard lors du solde du loyer, le Preneur remettra au Bailleur un cheque d'un montant de ${String(TARIFS.caution)} Euros (cinq cent euros) a l'ordre du Bailleur a titre de depot de garantie destine a couvrir les eventuels dommages locatifs.`,
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      "Sont compris comme dommages locatifs, tous dommages, degradations du logement, ainsi que les dommages, pertes ou vols causes aux biens mobiliers garnissant l'hebergement, pendant la periode de location.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      "En l'absence de dommages locatifs le depot de garantie sera restitue au Preneur dans un delai maximum de 15 jours apres son depart.",
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
      'Le present contrat de location saisonniere est conclu au profit du seul Preneur signataire des presentes. La cession du bail, sous-location totale ou partielle, sont rigoureusement interdites.',
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    // Section 11: Etat des lieux
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('11. ETAT DES LIEUX', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Etat des lieux realise sans la presence du Bailleur', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(
      doc,
      "Un etat des lieux sera mis a disposition du Preneur qui aura alors 48 heures pour faire des contestations eventuelles, par sms, email, courrier. A defaut de contestation par le Preneur dans un delai de 48 heures, l'etat des lieux etabli par le Bailleur sera repute accepte par le Preneur.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      "Le Preneur etablira seul l'etat des lieux de sortie et le transmettra le jour de sortie au Bailleur. Le Bailleur pourra contester l'etat des lieux dans un delai courant jusqu'a l'arrivee du prochain locataire, dans une limite de 48 heures.",
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
      'Le Preneur fera un usage paisible du logement loue. Il entretiendra le logement loue et le rendra en bon etat de proprete. Il devra respecter le voisinage.',
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      "Il s'engage a faire un usage normal et raisonnable des moyens de confort (chauffage, climatisation, eau, etc.), ainsi que des equipements (electromenager, multimedia, cuisine, etc.) mis a sa disposition.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    doc.text('Il lui est interdit de faire une copie des cles remises par le Bailleur.', margin, y);
    y += 5;
    y = addWrappedText(
      doc,
      "Il s'engage a informer le Bailleur dans les meilleurs delais de toute panne, dommage, incidents, ou dysfonctionnement.",
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
      "La presence d'animaux de compagnie dans l'hebergement est strictement interdite, quelle que soit sa duree, sauf autorisation expresse et ecrite du Bailleur.",
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
      "Le Bailleur s'engage a maintenir la location faisant l'objet du present contrat dans un etat satisfaisant d'entretien, de proprete et de securite.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 5;
    y = addWrappedText(
      doc,
      "Il devra s'assurer que le Preneur beneficie d'une jouissance pleine et entiere du bien loue, sur la periode. Il veillera a la remise des cles. Il s'abstiendra de perturber le confort ou la tranquillite du Preneur pendant la duree du sejour.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    // Nouvelle page pour les dernieres sections — section 15 intentionally skipped
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
      "Le Preneur indique beneficier d'une assurance couvrant les risques locatifs. Une copie de la police d'assurance pourra etre demandee par le Bailleur au Preneur lors de la reservation ou a l'entree dans les lieux.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    // Section 17: Resiliation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('17. RESILIATION', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = addWrappedText(
      doc,
      "En cas de manquement par le Preneur a l'une de ses obligations contractuelles, le present bail sera resilie de plein droit. Cette resiliation prendra effet apres un delai de 48 heures apres une simple sommation par lettre recommandee ou lettre remise en main propre restee infructueuse.",
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
      "Pour l'execution des presentes, le Bailleur et le Preneur font election de domicile dans leurs domiciles respectifs, indiques en entete des presentes. Toutefois, en cas de litige, le tribunal du domicile du Bailleur sera seul competent. Le present contrat est soumis a la loi francaise.",
      margin,
      y,
      contentWidth,
      5
    );
    y += 10;

    doc.text('Realise en 2 exemplaires', margin, y);
    y += 15;

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.text('Le Bailleur Signature', margin, y);
    doc.text('Le Preneur Signature', pageWidth - margin - 50, y);
    y += 5;

    // Ajouter l'image de signature du bailleur
    const signatureDataUrl = getSignatureBase64();
    doc.addImage(signatureDataUrl, 'PNG', margin, y, 40, 20);

    doc.setFont('helvetica', 'italic');
    doc.text('lu et approuve', margin, y + 25);
    doc.text('lu et approuve', pageWidth - margin - 50, y + 20);
    y += 35;

    const today = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Date: ${today}`, margin, y);

    return Buffer.from(doc.output('arraybuffer'));
  }
}
