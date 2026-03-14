import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BookingSource } from '@prisma/client';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationMessage } from './dto/whatsapp-webhook.dto';

const SYSTEM_PROMPT = `Tu es l'assistant de réservation de Maison Dalhias 19, une maison de vacances en Ardèche.
Tu aides à créer des réservations. Tu communiques en français, de manière concise et chaleureuse, avec des emojis pour la lisibilité sur mobile.

RÈGLE ABSOLUE : Tu dois TOUJOURS envoyer un récapitulatif et attendre la confirmation explicite (oui, ok, c'est bon, etc.) AVANT de créer une réservation.

Types de réservation et infos requises :

1. EXTERNE (Airbnb, Abritel, Booking.com) :
   - Minimum : dates + source
   - Optionnel : nombre de personnes, montant externe, label, notes

2. DIRECTE (client contacte directement) :
   - Minimum : dates + infos client (nom, prénom, adresse, ville, code postal, téléphone) + nombre de personnes + nombre d'adultes
   - Optionnel : email, options (ménage, linge), second locataire

3. PERSONNELLE (Personnel, Famille) :
   - Minimum : dates + source (Personnel ou Famille)
   - Optionnel : label, nombre de personnes, notes

Sources possibles : ABRITEL, AIRBNB, BOOKING_COM, PERSONNEL, FAMILLE, OTHER (préciser le nom)

Options disponibles :
- Ménage fin de séjour : 80 €
- Linge de maison : 15 € par personne
- Taxe de séjour : 0,80 € par jour par adulte
- Dépôt de garantie : 500 € (fixe, informatif)
- Acompte : 30% du total

Contrainte technique : tes messages ne doivent pas dépasser 4 096 caractères (limite WhatsApp).

Quand tu fais un récapitulatif, utilise ce format :
📌 Type/Source
👤 Client (si directe)
📅 Dates (nombre de nuits)
👥 Personnes (adultes)
💰 Prix (si calculé)
🧹 Options

Tu dois toujours vérifier la disponibilité avant de proposer un récapitulatif.
Pour les réservations directes, calcule le prix et propose les options.
Pour les réservations externes/personnelles, le prix n'est pas nécessaire sauf si demandé.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description:
      'Vérifie si les dates sont disponibles (pas de conflit avec une réservation existante). Retourne aussi le nombre minimum de nuits requis pour la période.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_min_nights',
    description:
      'Retourne le nombre minimum de nuits requis pour une période donnée (dépend de la saison).',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'calculate_price',
    description:
      'Calcule le prix de location brut pour une période. Retourne le détail par saison. Les options (ménage, linge, taxe de séjour) sont à ajouter séparément.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD)',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'create_quick_booking',
    description:
      'Crée une réservation externe ou personnelle (pas directe). Le type est déduit automatiquement de la source. NE PAS appeler sans confirmation explicite de l\'utilisateur.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD)',
        },
        source: {
          type: 'string',
          enum: ['ABRITEL', 'AIRBNB', 'BOOKING_COM', 'PERSONNEL', 'FAMILLE', 'OTHER'],
          description: 'Source de la réservation',
        },
        sourceCustomName: {
          type: 'string',
          description: 'Nom personnalisé si source = OTHER',
        },
        label: { type: 'string', description: 'Label/description de la réservation' },
        externalAmount: {
          type: 'number',
          description: 'Montant externe (ex: montant Airbnb)',
        },
        occupantsCount: { type: 'number', description: 'Nombre total d\'occupants (1-6)' },
        adultsCount: { type: 'number', description: 'Nombre d\'adultes (1-6)' },
        notes: { type: 'string', description: 'Notes libres' },
      },
      required: ['startDate', 'endDate', 'source'],
    },
  },
  {
    name: 'create_direct_booking',
    description:
      'Crée une réservation directe avec les informations client complètes. NE PAS appeler sans confirmation explicite de l\'utilisateur.',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string',
          description: 'Date de début au format ISO (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'Date de fin au format ISO (YYYY-MM-DD)',
        },
        primaryClient: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            phone: { type: 'string' },
          },
          required: ['firstName', 'lastName', 'address', 'city', 'postalCode', 'phone'],
        },
        occupantsCount: { type: 'number', description: 'Nombre total d\'occupants (1-6)' },
        adultsCount: { type: 'number', description: 'Nombre d\'adultes (1-6)' },
        cleaningIncluded: { type: 'boolean', description: 'Ménage inclus (80 €)' },
        linenIncluded: { type: 'boolean', description: 'Linge inclus (15 €/personne)' },
        touristTaxIncluded: {
          type: 'boolean',
          description: 'Taxe de séjour incluse (0,80 €/jour/adulte)',
        },
        secondaryClient: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            phone: { type: 'string' },
          },
          required: ['firstName', 'lastName', 'address', 'city', 'postalCode', 'phone'],
        },
      },
      required: ['startDate', 'endDate', 'primaryClient', 'occupantsCount', 'adultsCount'],
    },
  },
];

@Injectable()
export class WhatsAppAgentService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppAgentService.name);
  private client: Anthropic | undefined;
  private adminUserId: string;

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly pricingService: PricingService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY non définie — l\'agent WhatsApp ne fonctionnera pas');
      return;
    }
    this.client = new Anthropic({ apiKey });

    // Récupérer l'userId admin pour la création de réservations
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (!admin) {
      this.logger.error('Aucun utilisateur admin trouvé — l\'agent ne pourra pas créer de réservations');
      return;
    }
    this.adminUserId = admin.id;
    this.logger.log('Agent WhatsApp initialisé');
  }

  async processMessage(
    userMessage: string,
    conversationHistory: ConversationMessage[],
  ): Promise<string> {
    if (!this.client) {
      return 'Désolé, je rencontre un problème technique. Réessayez dans quelques minutes.';
    }

    // Construire les messages pour Claude
    const messages: Anthropic.MessageParam[] = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.push({ role: 'user', content: userMessage });

    try {
      return await this.runAgentLoop(messages);
    } catch (error) {
      this.logger.error('Erreur agent Claude:', error);
      return 'Désolé, je rencontre un problème technique. Réessayez dans quelques minutes.';
    }
  }

  private async runAgentLoop(messages: Anthropic.MessageParam[]): Promise<string> {
    if (!this.client) {
      throw new Error('Client Anthropic non initialisé');
    }

    const MAX_ITERATIONS = 10;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      // Collecter le texte de la réponse
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      // Si pas d'appels d'outils, retourner le texte
      if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
        return textBlocks.map((b) => b.text).join('\n') || 'Je n\'ai pas compris, pouvez-vous reformuler ?';
      }

      // Traiter les appels d'outils
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    return 'Désolé, la conversation est devenue trop complexe. Pouvez-vous reformuler votre demande ?';
  }

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      switch (toolName) {
        case 'check_availability':
          return await this.toolCheckAvailability(input);
        case 'get_min_nights':
          return await this.toolGetMinNights(input);
        case 'calculate_price':
          return await this.toolCalculatePrice(input);
        case 'create_quick_booking':
          return await this.toolCreateQuickBooking(input);
        case 'create_direct_booking':
          return await this.toolCreateDirectBooking(input);
        default:
          return { error: `Outil inconnu: ${toolName}` };
      }
    } catch (error) {
      this.logger.error(`Erreur outil ${toolName}:`, error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return { error: message };
    }
  }

  private async toolCheckAvailability(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const startDate = new Date(input.startDate as string);
    const endDate = new Date(input.endDate as string);
    const hasConflict = await this.bookingsService.checkConflicts(startDate, endDate);
    return { available: !hasConflict };
  }

  private async toolGetMinNights(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const startDate = new Date(input.startDate as string);
    const endDate = new Date(input.endDate as string);
    const minNights = await this.pricingService.getMinNightsForPeriod(startDate, endDate);
    return { minNights };
  }

  private async toolCalculatePrice(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const startDate = new Date(input.startDate as string);
    const endDate = new Date(input.endDate as string);
    const result = await this.pricingService.calculatePrice(startDate, endDate);
    return {
      totalPrice: result.totalPrice,
      totalNights: result.totalNights,
      isWeeklyRate: result.isWeeklyRate,
      minNightsRequired: result.minNightsRequired,
      details: result.details,
      hasUncoveredDays: result.hasUncoveredDays,
      uncoveredDays: result.uncoveredDays,
      defaultPricePerNight: result.defaultPricePerNight,
    };
  }

  private async toolCreateQuickBooking(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const booking = await this.bookingsService.createQuick(this.adminUserId, {
      startDate: input.startDate as string,
      endDate: input.endDate as string,
      source: input.source as BookingSource,
      sourceCustomName: input.sourceCustomName as string | undefined,
      label: input.label as string | undefined,
      externalAmount: input.externalAmount as number | undefined,
      occupantsCount: input.occupantsCount as number | undefined,
      adultsCount: input.adultsCount as number | undefined,
      notes: input.notes as string | undefined,
    });
    return {
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
      source: booking.source,
    };
  }

  private async toolCreateDirectBooking(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const primaryClient = input.primaryClient as Record<string, string>;
    const secondaryClient = input.secondaryClient as Record<string, string> | undefined;

    const dto = {
      startDate: input.startDate as string,
      endDate: input.endDate as string,
      primaryClient: {
        firstName: primaryClient.firstName,
        lastName: primaryClient.lastName,
        email: primaryClient.email,
        address: primaryClient.address,
        city: primaryClient.city,
        postalCode: primaryClient.postalCode,
        country: (primaryClient.country as string | undefined) ?? 'France',
        phone: primaryClient.phone,
      },
      occupantsCount: input.occupantsCount as number,
      adultsCount: input.adultsCount as number,
      cleaningIncluded: (input.cleaningIncluded as boolean | undefined) ?? false,
      linenIncluded: (input.linenIncluded as boolean | undefined) ?? false,
      touristTaxIncluded: (input.touristTaxIncluded as boolean | undefined) ?? false,
      secondaryClient: secondaryClient
        ? {
            firstName: secondaryClient.firstName,
            lastName: secondaryClient.lastName,
            email: secondaryClient.email,
            address: secondaryClient.address,
            city: secondaryClient.city,
            postalCode: secondaryClient.postalCode,
            country: (secondaryClient.country as string | undefined) ?? 'France',
            phone: secondaryClient.phone,
          }
        : undefined,
    };

    const booking = await this.bookingsService.create(this.adminUserId, dto as CreateBookingDto);
    return {
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
      rentalPrice: booking.rentalPrice?.toString(),
    };
  }
}
