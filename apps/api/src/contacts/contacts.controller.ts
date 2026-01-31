import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ContactForm } from '@prisma/client';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<ContactForm[]> {
    return this.contactsService.findAll();
  }

  @Post()
  create(@Body() createContactDto: CreateContactDto): Promise<ContactForm> {
    return this.contactsService.create(createContactDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string): Promise<ContactForm> {
    return this.contactsService.markAsRead(id);
  }
}
