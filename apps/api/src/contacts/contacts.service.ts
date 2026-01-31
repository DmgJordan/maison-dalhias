import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ContactForm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async findAll(): Promise<ContactForm[]> {
    return this.prisma.contactForm.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ContactForm> {
    const contact = await this.prisma.contactForm.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Message non trouvé');
    }

    return contact;
  }

  async create(createContactDto: CreateContactDto): Promise<ContactForm> {
    const contact = await this.prisma.contactForm.create({
      data: {
        name: createContactDto.name,
        email: createContactDto.email,
        phone: createContactDto.phone,
        subject: createContactDto.subject,
        message: createContactDto.message,
        status: 'pending',
      },
    });

    try {
      await this.emailService.sendContactEmail(contact);

      await this.prisma.contactForm.update({
        where: { id: contact.id },
        data: { status: 'sent' },
      });
    } catch (error) {
      this.logger.error('Erreur envoi email:', error);
    }

    return contact;
  }

  async markAsRead(id: string): Promise<ContactForm> {
    const contact = await this.findById(id);

    return this.prisma.contactForm.update({
      where: { id: contact.id },
      data: { status: 'read' },
    });
  }
}
