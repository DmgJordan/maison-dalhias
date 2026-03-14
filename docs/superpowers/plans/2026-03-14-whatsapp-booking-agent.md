# Agent WhatsApp de réservation — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un module WhatsApp à l'API NestJS pour créer des réservations par message en langage naturel via un agent Claude Sonnet.

**Architecture:** Nouveau module `WhatsappModule` dans `apps/api/src/whatsapp/` qui reçoit les webhooks Meta, orchestre un agent conversationnel Claude Sonnet avec des outils appelant les services existants (`BookingsService`, `PricingService`), et persiste l'historique de conversation en BDD via un nouveau modèle Prisma `WhatsAppConversation`.

**Tech Stack:** NestJS 10, Prisma 5, `@anthropic-ai/sdk`, API Meta Cloud (WhatsApp Business), `fetch` natif Node.js 18+

**Spec:** `docs/superpowers/specs/2026-03-14-whatsapp-booking-agent-design.md`

**Note sur les tests :** Le projet n'a aucune infrastructure de test (pas de Jest, pas de `@nestjs/testing`, aucun fichier `.spec.ts`). Le plan ne prévoit pas de TDD. Les validations se font manuellement et par typecheck (`npm run typecheck:api`).

---

## Structure des fichiers

| Action | Fichier | Responsabilité |
|--------|---------|---------------|
| Créer | `apps/api/src/whatsapp/whatsapp.module.ts` | Module NestJS, imports et providers |
| Créer | `apps/api/src/whatsapp/whatsapp.controller.ts` | Webhook Meta (GET vérification + POST messages) |
| Créer | `apps/api/src/whatsapp/whatsapp.service.ts` | Orchestration : réception → agent → réponse Meta |
| Créer | `apps/api/src/whatsapp/whatsapp-agent.service.ts` | Configuration Claude Sonnet + définition des 5 outils |
| Créer | `apps/api/src/whatsapp/whatsapp-conversation.service.ts` | CRUD historique de conversation (Prisma) |
| Créer | `apps/api/src/whatsapp/dto/whatsapp-webhook.dto.ts` | Types/interfaces pour le payload webhook Meta |
| Modifier | `apps/api/prisma/schema.prisma` | Ajout modèle `WhatsAppConversation` |
| Modifier | `apps/api/src/app.module.ts` | Import du `WhatsappModule` |
| Modifier | `apps/api/src/main.ts` | Configuration raw body pour HMAC |
| Modifier | `apps/api/package.json` | Ajout dépendance `@anthropic-ai/sdk` |

---

## Chunk 1 : Fondations (dépendances, schéma, types)

### Task 1 : Installer la dépendance Anthropic SDK

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Installer `@anthropic-ai/sdk`**

```bash
cd apps/api && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Vérifier l'installation**

```bash
node -e "require('@anthropic-ai/sdk')"
```

Expected: Pas d'erreur

---

### Task 2 : Ajouter le modèle Prisma `WhatsAppConversation`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Ajouter le modèle à la fin du fichier schema.prisma**

```prisma
model WhatsAppConversation {
  id        String   @id @default(uuid())
  phone     String
  messages  Json     // [{role: "user"|"assistant", content: string, timestamp: string}]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([phone])
  @@map("whatsapp_conversations")
}
```

Ajouter après le dernier modèle existant (`InvoiceSnapshot`).

- [ ] **Step 2: Générer la migration**

```bash
cd apps/api && npx prisma migrate dev --name add-whatsapp-conversation
```

Expected: Migration créée et appliquée sans erreur.

- [ ] **Step 3: Régénérer le client Prisma**

```bash
npm run db:generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Vérifier le typecheck**

```bash
npm run typecheck:api
```

Expected: Pas de nouvelles erreurs.

---

### Task 3 : Créer les types/interfaces pour le webhook Meta

**Files:**
- Create: `apps/api/src/whatsapp/dto/whatsapp-webhook.dto.ts`

- [ ] **Step 1: Créer le fichier avec les interfaces**

```typescript
export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: string;
}

export interface WhatsAppChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'reaction' | 'sticker';
  text?: { body: string };
}

export interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

Ce fichier définit uniquement des interfaces TypeScript (pas de classes DTO avec class-validator) car le payload Meta ne passe pas par le ValidationPipe de NestJS — on le valide manuellement.

---

## Chunk 2 : Services de conversation et agent

### Task 4 : Créer le service de conversation

**Files:**
- Create: `apps/api/src/whatsapp/whatsapp-conversation.service.ts`

- [ ] **Step 1: Créer le service**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppConversation } from '@prisma/client';
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

    const messages = conversation.messages as ConversationMessage[];
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { messages },
    });
  }

  getMessages(conversation: WhatsAppConversation): ConversationMessage[] {
    return (conversation.messages as ConversationMessage[]) ?? [];
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
      this.logger.log(`Purgé ${count} conversation(s) expirée(s) pour ${phone.slice(-4)}`);
    }
  }
}
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npm run typecheck:api
```

Expected: Pas de nouvelles erreurs.

---

### Task 5 : Créer le service agent Claude

**Files:**
- Create: `apps/api/src/whatsapp/whatsapp-agent.service.ts`

Ce service est le cœur de la fonctionnalité. Il configure Claude Sonnet avec le prompt système et les 5 outils, puis orchestre la conversation.

- [ ] **Step 1: Créer le service avec le prompt système et les définitions d'outils**

```typescript
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
  private client: Anthropic;
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
          return this.toolCheckAvailability(input);
        case 'get_min_nights':
          return this.toolGetMinNights(input);
        case 'calculate_price':
          return this.toolCalculatePrice(input);
        case 'create_quick_booking':
          return this.toolCreateQuickBooking(input);
        case 'create_direct_booking':
          return this.toolCreateDirectBooking(input);
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
        country: primaryClient.country ?? 'France',
        phone: primaryClient.phone,
      },
      occupantsCount: input.occupantsCount as number,
      adultsCount: input.adultsCount as number,
      cleaningIncluded: (input.cleaningIncluded as boolean) ?? false,
      linenIncluded: (input.linenIncluded as boolean) ?? false,
      touristTaxIncluded: (input.touristTaxIncluded as boolean) ?? false,
      secondaryClient: secondaryClient
        ? {
            firstName: secondaryClient.firstName,
            lastName: secondaryClient.lastName,
            email: secondaryClient.email,
            address: secondaryClient.address,
            city: secondaryClient.city,
            postalCode: secondaryClient.postalCode,
            country: secondaryClient.country ?? 'France',
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
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npm run typecheck:api
```

Expected: Pas de nouvelles erreurs. Si des erreurs de typage apparaissent sur les DTOs passés à `createQuick` ou `create`, ajuster les casts `as any` ou créer des objets DTO instanciés.

---

## Chunk 3 : Service d'orchestration et controller

### Task 6 : Créer le service d'orchestration WhatsApp

**Files:**
- Create: `apps/api/src/whatsapp/whatsapp.service.ts`

Ce service gère : la réception d'un message, le chargement de la conversation, l'appel à l'agent, la sauvegarde de l'historique, et l'envoi de la réponse via l'API Meta.

- [ ] **Step 1: Créer le service**

```typescript
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
        this.processedMessageIds.delete(iterator.next().value!);
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
        this.logger.error(`Erreur envoi WhatsApp (${response.status}): ${errorBody}`);
      }
    } catch (error) {
      this.logger.error('Erreur envoi WhatsApp:', error);
    }
  }
}
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npm run typecheck:api
```

---

### Task 7 : Créer le controller webhook

**Files:**
- Create: `apps/api/src/whatsapp/whatsapp.controller.ts`

- [ ] **Step 1: Créer le controller**

```typescript
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
    this.processPayloadAsync(payload).catch((error) => {
      this.logger.error('Erreur traitement webhook:', error);
    });

    return { status: 'ok' };
  }

  private async processPayloadAsync(payload: WhatsAppWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') return;

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages;
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
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npm run typecheck:api
```

---

## Chunk 4 : Module, intégration et configuration

### Task 8 : Créer le module WhatsApp

**Files:**
- Create: `apps/api/src/whatsapp/whatsapp.module.ts`

- [ ] **Step 1: Créer le module**

```typescript
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppAgentService } from './whatsapp-agent.service';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { BookingsModule } from '../bookings/bookings.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [BookingsModule, PricingModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppAgentService, WhatsAppConversationService],
})
export class WhatsAppModule {}
```

---

### Task 9 : Intégrer le module dans l'application

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Ajouter l'import du WhatsAppModule**

Ajouter l'import en haut du fichier :

```typescript
import { WhatsAppModule } from './whatsapp/whatsapp.module';
```

Ajouter `WhatsAppModule` à la fin du tableau `imports` dans `@Module({})` :

```typescript
@Module({
  imports: [
    // ... modules existants ...
    SettingsModule,
    WhatsAppModule,  // ← Ajouter ici
  ],
})
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npm run typecheck:api
```

---

### Task 10 : Configurer le raw body pour la vérification HMAC

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Activer le raw body dans NestFactory**

Dans `main.ts`, modifier la création de l'app pour activer l'option `rawBody` native de NestJS :

```typescript
// Avant :
const app = await NestFactory.create(AppModule);

// Après :
const app = await NestFactory.create(AppModule, {
  rawBody: true,
});
```

Cela rend `req.rawBody` disponible nativement sur toutes les routes (utilisé par le controller WhatsApp pour la vérification HMAC via `RawBodyRequest<Request>`).

- [ ] **Step 2: Vérifier que le serveur démarre correctement**

```bash
cd apps/api && npx ts-node -e "console.log('OK')"
npm run typecheck:api
```

---

### Task 11 : Ajouter les variables d'environnement

**Files:**
- Modify: `apps/api/.env` (local uniquement, ne pas committer)

- [ ] **Step 1: Ajouter les variables au fichier .env**

```env
# WhatsApp - Meta Cloud API
WHATSAPP_VERIFY_TOKEN="maison-dalhias-webhook-verify-token"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_APP_SECRET=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ALLOWED_PHONE="+33787864358"

# Anthropic - Claude API
ANTHROPIC_API_KEY=""
```

Les valeurs réelles seront remplies après la configuration de l'app Meta et de la clé Anthropic.

- [ ] **Step 2: Vérifier que `.env` est dans `.gitignore`**

```bash
grep -q ".env" apps/api/.gitignore && echo "OK" || echo "ATTENTION: .env non dans .gitignore"
```

---

### Task 12 : Vérification finale et lint

- [ ] **Step 1: Typecheck complet**

```bash
npm run typecheck:api
```

Expected: Pas de nouvelles erreurs par rapport à l'état initial.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Si des erreurs de lint apparaissent sur les nouveaux fichiers, les corriger.

- [ ] **Step 3: Vérifier que le serveur démarre**

```bash
cd apps/api && npx nest start --watch
```

Expected: Le serveur démarre sans erreur. Le log devrait afficher "Agent WhatsApp initialisé" (si `ANTHROPIC_API_KEY` est définie) ou un warning.

- [ ] **Step 4: Tester le webhook de vérification manuellement**

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=maison-dalhias-webhook-verify-token&hub.challenge=test123"
```

Expected: Réponse `test123` avec status 200.

---

## Chunk 5 : Guide de configuration Meta

### Task 13 : Documenter la configuration Meta Cloud API

Ce n'est pas du code, mais c'est nécessaire pour que la fonctionnalité marche en production.

- [ ] **Step 1: Après déploiement sur Railway, configurer l'app Meta**

1. Aller sur https://developers.facebook.com/
2. Créer une nouvelle app (type Business)
3. Ajouter le produit "WhatsApp"
4. Dans WhatsApp > Configuration :
   - URL du webhook : `https://<ton-domaine-railway>/api/whatsapp/webhook`
   - Token de vérification : la valeur de `WHATSAPP_VERIFY_TOKEN`
   - S'abonner au champ `messages`
5. Dans WhatsApp > Numéros de téléphone :
   - Utiliser le numéro de test ou ajouter un numéro
   - Copier le Phone Number ID → `WHATSAPP_PHONE_NUMBER_ID`
6. Dans Paramètres de l'app :
   - Copier le App Secret → `WHATSAPP_APP_SECRET`
7. Créer un System User token permanent → `WHATSAPP_ACCESS_TOKEN`
8. Ajouter `ANTHROPIC_API_KEY` avec une clé valide
9. Déployer avec les variables d'environnement mises à jour sur Railway
