import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

interface ContactFormData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}

export interface DocumentEmailParams {
  recipientEmail: string;
  recipientName: string;
  documentTypes: string[];
  startDate: Date;
  endDate: Date;
  personalMessage?: string;
  contractPdf?: Buffer;
  invoicePdf?: Buffer;
}

export interface DocumentEmailResult {
  resendMessageId: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private resend: Resend;
  private senderEmail: string;
  private contactEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.senderEmail = process.env.SENDER_EMAIL ?? 'contact@maison-dalhias.fr';
    this.contactEmail = process.env.CONTACT_EMAIL ?? 'dominguez-juan@orange.fr';
  }

  async sendContactEmail(contact: ContactFormData): Promise<void> {
    const html = `
      <h2>Nouveau message de contact - Maison Dalhias 19</h2>
      <p><strong>De:</strong> ${contact.name} (${contact.email})</p>
      ${contact.phone ? `<p><strong>Téléphone:</strong> ${contact.phone}</p>` : ''}
      <p><strong>Sujet:</strong> ${contact.subject}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p>${contact.message.replace(/\n/g, '<br />')}</p>
    `;

    await this.resend.emails.send({
      from: this.senderEmail,
      to: this.contactEmail,
      reply_to: contact.email,
      subject: `[Maison Dalhias] ${contact.subject}`,
      html,
    });
  }

  async sendDocumentEmail(params: DocumentEmailParams): Promise<DocumentEmailResult> {
    const {
      recipientEmail,
      recipientName,
      documentTypes,
      startDate,
      endDate,
      personalMessage,
      contractPdf,
      invoicePdf,
    } = params;

    // Build subject
    let subject: string;
    if (documentTypes.length === 2) {
      subject = '[Maison Dalhias] Vos documents de réservation';
    } else if (documentTypes.includes('contract')) {
      subject = '[Maison Dalhias] Votre contrat de location';
    } else {
      subject = '[Maison Dalhias] Votre facture';
    }

    // Format dates for email body
    const startDateStr = startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const endDateStr = endDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Build document list
    const docNames: string[] = [];
    if (documentTypes.includes('contract')) docNames.push('le contrat de location');
    if (documentTypes.includes('invoice')) docNames.push('la facture');
    const docListText = docNames.join(' et ');

    // Build HTML
    const personalSection = personalMessage
      ? `<div style="margin: 20px 0; padding: 15px; background-color: #f7f7f7; border-left: 3px solid #FF385C; border-radius: 4px;">
          <p style="margin: 0; color: #484848; font-style: italic;">${escapeHtml(personalMessage).replace(/\n/g, '<br />')}</p>
        </div>`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #484848;">
        <div style="background-color: #FF385C; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Maison Dalhias 19</h1>
        </div>
        <div style="padding: 30px 20px;">
          <p>Bonjour ${escapeHtml(recipientName)},</p>
          <p>Veuillez trouver ci-joint ${docListText} pour votre réservation du <strong>${startDateStr}</strong> au <strong>${endDateStr}</strong>.</p>
          ${personalSection}
          <p>Nous vous souhaitons un agréable séjour.</p>
          <p>Cordialement,<br />
          <strong>Maison Dalhias 19</strong><br />
          Domaine du Rouret - Pierre & Vacances<br />
          07120 Grospierres, Ardèche</p>
        </div>
        <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 12px; color: #999;">
          <p style="margin: 0;">Ce message a été envoyé depuis le système de gestion Maison Dalhias 19.</p>
        </div>
      </div>
    `;

    // Build attachments
    const attachments: Array<{ filename: string; content: Buffer }> = [];
    if (contractPdf) {
      attachments.push({ filename: 'contrat_location.pdf', content: contractPdf });
    }
    if (invoicePdf) {
      attachments.push({ filename: 'facture.pdf', content: invoicePdf });
    }

    const result = await this.resend.emails.send({
      from: this.senderEmail,
      to: recipientEmail,
      subject,
      html,
      attachments,
    });

    return { resendMessageId: result.data?.id ?? '' };
  }
}
