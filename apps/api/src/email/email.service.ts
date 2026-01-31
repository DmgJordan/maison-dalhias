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
}
