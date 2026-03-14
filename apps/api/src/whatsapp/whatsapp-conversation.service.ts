import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WhatsAppConversation } from '@prisma/client';
import { ConversationMessage } from './dto/whatsapp-webhook.dto';

const CONVERSATION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class WhatsAppConversationService {
  private readonly logger = new Logger(WhatsAppConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(phone: string): Promise<WhatsAppConversation> {
    // Purge des anciennes conversations (> 7 jours)
    await this.purgeOldConversations(phone);

    const existing = await this.prisma.whatsAppConversation.findFirst({
      where: { phone },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      const elapsed = Date.now() - existing.updatedAt.getTime();
      if (elapsed < CONVERSATION_EXPIRY_MS) {
        return existing;
      }
      // Conversation expirée → supprimer et en créer une nouvelle
      await this.prisma.whatsAppConversation.delete({ where: { id: existing.id } });
    }

    return this.prisma.whatsAppConversation.create({
      data: {
        phone,
        messages: [],
      },
    });
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<WhatsAppConversation> {
    const conversation = await this.prisma.whatsAppConversation.findUniqueOrThrow({
      where: { id: conversationId },
    });

    const messages = conversation.messages as unknown as ConversationMessage[];
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { messages: messages as unknown as Prisma.InputJsonValue },
    });
  }

  getMessages(conversation: WhatsAppConversation): ConversationMessage[] {
    return conversation.messages as unknown as ConversationMessage[];
  }

  async deleteConversation(phone: string): Promise<void> {
    await this.prisma.whatsAppConversation.deleteMany({ where: { phone } });
  }

  private async purgeOldConversations(phone: string): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.whatsAppConversation.deleteMany({
      where: {
        phone,
        updatedAt: { lt: sevenDaysAgo },
      },
    });
    if (count > 0) {
      this.logger.log(`Purgé ${String(count)} conversation(s) expirée(s) pour ${phone.slice(-4)}`);
    }
  }
}
