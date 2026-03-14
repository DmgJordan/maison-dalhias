import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { WhatsAppAgentService } from './whatsapp-agent.service';
import { WhatsAppMessage } from './dto/whatsapp-webhook.dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  // Note : le Set est en mémoire et perdu au redémarrage du serveur.
  // Risque minime de double traitement ponctuel lors d'un déploiement.
  // Acceptable pour un usage mono-utilisateur à faible volume.
  private readonly processedMessageIds = new Set<string>();
  private readonly allowedPhone: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly conversationService: WhatsAppConversationService,
    private readonly agentService: WhatsAppAgentService,
  ) {
    this.allowedPhone = process.env.WHATSAPP_ALLOWED_PHONE ?? '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
  }

  async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    // Déduplication
    if (this.processedMessageIds.has(message.id)) {
      this.logger.debug(`Message ${message.id} déjà traité, ignoré`);
      return;
    }
    this.processedMessageIds.add(message.id);

    // Nettoyage du set de déduplication (garder max 1000 IDs)
    if (this.processedMessageIds.size > 1000) {
      const iterator = this.processedMessageIds.values();
      for (let i = 0; i < 500; i++) {
        const next = iterator.next();
        if (!next.done) {
          this.processedMessageIds.delete(next.value);
        }
      }
    }

    // Vérification whitelist
    const senderPhone = message.from;
    if (!this.isAllowedPhone(senderPhone)) {
      this.logger.debug(`Message de ${senderPhone.slice(-4)} ignoré (non whitelisté)`);
      return;
    }

    // Vérifier que c'est un message texte
    if (message.type !== 'text' || !message.text?.body) {
      await this.sendWhatsAppMessage(
        senderPhone,
        'Je ne traite que les messages texte pour le moment.',
      );
      return;
    }

    const userText = message.text.body;
    this.logger.log(`Message reçu de ****${senderPhone.slice(-4)}`);

    try {
      // Charger ou créer la conversation
      const conversation = await this.conversationService.getOrCreateConversation(senderPhone);
      const history = this.conversationService.getMessages(conversation);

      // Appeler l'agent
      const response = await this.agentService.processMessage(userText, history);

      // Sauvegarder les messages dans l'historique
      await this.conversationService.addMessage(conversation.id, 'user', userText);
      await this.conversationService.addMessage(conversation.id, 'assistant', response);

      // Envoyer la réponse via WhatsApp
      await this.sendWhatsAppMessage(senderPhone, response);
    } catch (error) {
      this.logger.error('Erreur traitement message:', error);
      await this.sendWhatsAppMessage(
        senderPhone,
        'Désolé, je rencontre un problème technique. Réessayez dans quelques minutes.',
      );
    }
  }

  private isAllowedPhone(phone: string): boolean {
    if (!this.allowedPhone) return false;
    // Meta envoie le numéro sans '+', normaliser
    const normalized = phone.replace(/\+/g, '');
    const allowed = this.allowedPhone.replace(/\+/g, '');
    return normalized === allowed;
  }

  async sendWhatsAppMessage(to: string, body: string): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp non configuré (token ou phoneNumberId manquant)');
      return;
    }

    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Erreur envoi WhatsApp (${String(response.status)}): ${errorBody}`);
      }
    } catch (error) {
      this.logger.error('Erreur envoi WhatsApp:', error);
    }
  }
}
