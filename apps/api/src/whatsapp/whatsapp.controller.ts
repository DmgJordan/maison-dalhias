import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Logger,
  HttpCode,
  UnauthorizedException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookPayload } from './dto/whatsapp-webhook.dto';
import * as crypto from 'crypto';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor(private readonly whatsappService: WhatsAppService) {
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
    this.appSecret = process.env.WHATSAPP_APP_SECRET ?? '';
  }

  /**
   * Vérification du webhook par Meta (appelé une seule fois lors de la configuration).
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook vérifié par Meta');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('Échec vérification webhook');
      res.sendStatus(403);
    }
  }

  /**
   * Réception des messages WhatsApp.
   * Répond 200 immédiatement, traite le message de manière asynchrone.
   */
  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Req() req: Request): { status: string } {
    // Vérification HMAC (401 si invalide, conformément à la spec)
    if (this.appSecret && !this.verifySignature(req)) {
      this.logger.warn('Signature HMAC invalide');
      throw new UnauthorizedException('Signature invalide');
    }

    const payload = req.body as WhatsAppWebhookPayload;

    // Traitement asynchrone (ne pas attendre)
    this.processPayloadAsync(payload).catch((error: unknown) => {
      this.logger.error('Erreur traitement webhook:', error);
    });

    return { status: 'ok' };
  }

  private async processPayloadAsync(payload: WhatsAppWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') return;

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages;
        if (!messages) continue;

        for (const message of messages) {
          await this.whatsappService.handleIncomingMessage(message);
        }
      }
    }
  }

  private verifySignature(req: Request): boolean {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;

    const rawBody = (req as RawBodyRequest<Request>).rawBody;
    if (!rawBody) {
      this.logger.warn('Raw body non disponible pour la vérification HMAC');
      return false;
    }

    const expectedSignature =
      'sha256=' + crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
