# Spec : Agent WhatsApp de réservation

**Date** : 2026-03-14
**Statut** : En cours de validation

---

## 1. Contexte et objectif

### Problème

L'administratrice du logement (la mère du développeur) gère les réservations de Maison Dalhias 19 via l'interface admin web. Elle souhaite pouvoir créer des réservations plus simplement, directement depuis WhatsApp, sans avoir à se connecter à l'application.

### Objectif

Ajouter un module WhatsApp à l'API NestJS existante qui permet de créer des réservations par message en langage naturel, via un agent conversationnel propulsé par Claude Sonnet.

### Utilisateur cible

Un seul utilisateur : l'administratrice, identifiée par son numéro de téléphone whitelisté.

---

## 2. Périmètre

### Inclus (v1)

- Création de réservations de tous types (externe, directe, personnelle)
- Vérification automatique des disponibilités
- Calcul automatique du prix
- Récapitulatif obligatoire avant confirmation
- Gestion conversationnelle en langage naturel (l'agent complète les infos manquantes)
- Historique de conversation avec expiration (30 minutes d'inactivité)
- Sécurité : whitelist numéro + vérification signature HMAC
- Déduplication des webhooks (idempotence par `message_id`)

### Exclu (v1)

- Consultation de réservations existantes
- Modification ou annulation de réservations
- Traitement de messages vocaux ou médias (photos, documents)
- Multi-utilisateurs (un seul numéro autorisé)

---

## 3. Architecture

### Vue d'ensemble

```
Administratrice (WhatsApp)
    │
    ▼
Meta Cloud API  ──webhook POST──►  NestJS API (module WhatsApp)
    ▲                                   │
    │                              1. Réponse 200 immédiate
    │                              2. Traitement asynchrone
    │                                   │
    │                                   ▼
    │                             WhatsAppService
    │                                   │
    │                                   ▼
    │                          WhatsAppAgentService
    │                          (Claude Sonnet + outils)
    │                                   │
    │                     ┌─────────────┼─────────────┐
    │                     ▼             ▼             ▼
    │              checkConflicts  calcPrice   createBooking
    │                     │             │             │
    │                     └─────────────┴─────────────┘
    │                                   │
    └──── réponse WhatsApp ─────────────┘
```

### Flux de traitement d'un message

1. L'administratrice envoie un message WhatsApp au numéro Business
2. Meta envoie un webhook POST à `/api/whatsapp/webhook`
3. Le controller vérifie la signature HMAC du header `X-Hub-Signature-256` (nécessite accès au raw body)
4. Le controller répond immédiatement **200 OK** à Meta (évite les timeouts — le traitement LLM peut prendre 15-30s)
5. Le traitement se poursuit de manière asynchrone :
   - Vérifie que le numéro de l'expéditeur est whitelisté
   - Vérifie l'idempotence via le `message_id` Meta (ignore les doublons)
   - Charge l'historique de conversation depuis la BDD (ou crée une nouvelle si expirée)
   - Envoie le message + historique à Claude Sonnet via l'API Anthropic
   - Claude traite le message, utilise ses outils si nécessaire
   - La réponse est renvoyée à l'administratrice via l'API Meta
   - L'historique de conversation est mis à jour en BDD

### Intégration dans le monorepo

Le module s'intègre dans l'API NestJS existante (`apps/api/`). Aucune modification du frontend.

---

## 4. Structure des fichiers

```
apps/api/src/whatsapp/
├── whatsapp.module.ts                  # Module NestJS, imports des services
├── whatsapp.controller.ts              # Webhook Meta (GET vérification + POST messages)
├── whatsapp.service.ts                 # Orchestration : réception → agent → réponse
├── whatsapp-agent.service.ts           # Configuration agent Claude Sonnet + définition des outils
├── whatsapp-conversation.service.ts    # CRUD historique de conversation (Prisma)
└── dto/
    └── whatsapp-webhook.dto.ts         # Types pour le payload webhook Meta
```

---

## 5. Modèle de données

### Nouveau modèle Prisma

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

- `messages` : tableau JSON des échanges de la conversation en cours
- `updatedAt` : sert à déterminer l'expiration (> 30 minutes → nouvelle conversation)
- Index sur `phone` pour recherche rapide de la conversation active
- Conventions `@map` / `@@map` cohérentes avec le schéma existant (snake_case en BDD)

### Pas de migration destructive

Ajout d'un modèle uniquement, aucun modèle existant n'est modifié.

---

## 6. Agent conversationnel

### Modèle LLM

Claude Sonnet (`claude-sonnet-4-20250514`) via l'API Anthropic (`@anthropic-ai/sdk`).

### Prompt système

L'agent reçoit un prompt système qui définit :
- Son rôle : assistant de réservation pour Maison Dalhias 19
- Les types de réservation possibles (externe, directe, personnelle) et les infos requises pour chacun
- La règle de récapitulatif obligatoire avant toute création
- Les sources disponibles (Airbnb, Abritel, Booking.com, Personnel, Famille, Autre)
- Les options disponibles (ménage 80 €, linge 15 €/pers, taxe séjour 0,80 €/jour/adulte)
- Le format de communication (concis, avec emojis pour la lisibilité sur mobile)
- La contrainte de longueur de message (max 4 096 caractères par message WhatsApp)

### Infos requises par type

| Type | Minimum requis | Optionnel |
|------|---------------|-----------|
| **Externe** (Airbnb, Abritel, Booking) | Dates + source | Nombre de personnes, montant externe, label, notes |
| **Directe** | Dates + infos client (nom, prénom, adresse, téléphone) + nombre de personnes + adultes | Email, options (ménage, linge), second locataire |
| **Personnelle** | Dates + source (Personnel/Famille) | Label, nombre de personnes, notes |

### Identité utilisateur pour la création

Les réservations créées via WhatsApp utilisent le compte admin existant (`admin@maison-dalhias.fr`). Son `userId` est récupéré au démarrage du module via `PrismaService.user.findFirst({ where: { role: 'ADMIN' } })` et mis en cache.

### Statut initial des réservations

Toutes les réservations créées via WhatsApp sont en statut **`DRAFT`** (statut par défaut du schéma Prisma). L'administratrice peut ensuite les faire évoluer via l'interface admin web (DRAFT → VALIDATED → CONTRACT_SENT → ...).

### Outils de l'agent

5 outils qui appellent les services NestJS existants en interne (appels de méthodes, pas HTTP) :

#### `check_availability`
- **Entrée** : `startDate` (ISO), `endDate` (ISO)
- **Service** : `BookingsService.checkConflicts(startDate, endDate)` — retourne `boolean`
- **Sortie pour l'agent** : `{ available: boolean }`. Si conflit, un message indique que les dates sont prises (pas de détails sur la réservation en conflit pour la v1).
- **Usage** : Appelé systématiquement avant de proposer un récapitulatif

#### `get_min_nights`
- **Entrée** : `startDate` (ISO), `endDate` (ISO)
- **Service** : `PricingService.getMinNightsForPeriod(startDate, endDate)` — retourne `number`
- **Sortie pour l'agent** : `{ minNights: number }`
- **Usage** : Appelé après `check_availability` pour valider que le séjour respecte le minimum de nuits

#### `calculate_price`
- **Entrée** : `startDate` (ISO), `endDate` (ISO)
- **Service** : `PricingService.calculatePrice(startDate, endDate)` — retourne `PriceCalculation`
- **Sortie pour l'agent** : `{ totalPrice, totalNights, isWeeklyRate, details[], hasUncoveredDays, uncoveredDays }`
- **Note** : Le calcul retourne le prix de location brut. Les options (ménage, linge, taxe de séjour) sont calculées par l'agent lui-même à partir des constantes connues dans son prompt (ménage 80 €, linge 15 €/pers, taxe 0,80 €/jour/adulte).
- **Usage** : Appelé pour les réservations directes et sur demande pour les autres

#### `create_quick_booking`
- **Entrée** : `startDate`, `endDate`, `source` (ABRITEL | AIRBNB | BOOKING_COM | PERSONNEL | FAMILLE | OTHER), `occupantsCount?`, `adultsCount?`, `label?`, `externalAmount?`, `notes?`, `sourceCustomName?` (si source = OTHER)
- **Service** : `BookingsService.createQuick(adminUserId, dto)` — le `bookingType` est déduit automatiquement de la `source` par le service
- **Sortie pour l'agent** : `{ id, startDate, endDate, status, source }`
- **Usage** : Création de réservations externes et personnelles

#### `create_direct_booking`
- **Entrée** : `startDate`, `endDate`, `primaryClient` (firstName, lastName, address, city, postalCode, country, phone, email?), `occupantsCount`, `adultsCount`, `cleaningIncluded?`, `linenIncluded?`, `touristTaxIncluded?`, `secondaryClient?`
- **Service** : `BookingsService.create(adminUserId, dto)`
- **Sortie pour l'agent** : `{ id, startDate, endDate, status, rentalPrice }`
- **Usage** : Création de réservations directes avec infos client

### Flux conversationnel

#### Réservation externe (cas nominal)

```
Mère : "Airbnb du 10 au 17 août, 4 personnes"
Agent : [check_availability(2026-08-10, 2026-08-17)] → available: true
        [get_min_nights(2026-08-10, 2026-08-17)] → minNights: 7, OK (7 nuits)
        "Récap :
         📌 Airbnb
         📅 10 → 17 août 2026 (7 nuits)
         👥 4 personnes
         Je crée cette réservation ?"
Mère : "Oui"
Agent : [create_quick_booking(...)] → OK
        "Réservation créée ✅"
```

#### Réservation directe (infos manquantes)

```
Mère : "Réservation directe du 5 au 12 juillet"
Agent : [check_availability(2026-07-05, 2026-07-12)] → available: true
        "C'est libre ! 👍 Combien de personnes et quel est le nom du client ?"
Mère : "Famille Martin, 5 personnes dont 3 adultes"
Agent : "Il me faut les coordonnées de M./Mme Martin : adresse, téléphone, et email si disponible"
Mère : "12 rue de la paix Paris 75001, 06 12 34 56 78, martin@email.fr"
Agent : [calculate_price(2026-07-05, 2026-07-12)] → totalPrice: 1200€
        "Récap :
         📌 Réservation directe
         👤 Martin — 12 rue de la paix, 75001 Paris
         📅 5 → 12 juillet 2026 (7 nuits)
         👥 5 personnes (3 adultes)
         💰 1 200 €
         Options ménage (80 €) ou linge (15 €/pers) ?"
Mère : "Avec ménage, sans linge"
Agent : "Récap final :
         💰 1 280 € (1 200 € + 80 € ménage)
         Je crée ?"
Mère : "Oui"
Agent : [create_direct_booking(...)] → OK
        "Réservation créée ✅ — Total 1 280 €"
```

#### Dates indisponibles

```
Mère : "Booking du 14 au 21 août"
Agent : [check_availability(2026-08-14, 2026-08-21)] → available: false
        "❌ Ces dates sont prises. D'autres dates ?"
```

---

## 7. Intégration Meta Cloud API

### Configuration requise

1. Créer une app sur [Meta for Developers](https://developers.facebook.com/)
2. Activer le produit « WhatsApp » dans l'app
3. Configurer le webhook avec l'URL `https://<domain-railway>/api/whatsapp/webhook`
4. S'abonner aux événements `messages`
5. Obtenir un token d'accès permanent (System User token)

### Endpoints webhook

#### `GET /api/whatsapp/webhook` — Vérification

Appelé une seule fois par Meta lors de la configuration du webhook.

```typescript
// Meta envoie : ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
// Réponse : renvoyer hub.challenge si verify_token correspond
```

#### `POST /api/whatsapp/webhook` — Réception des messages

Payload Meta (simplifié) :

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "wamid.xxxx",
          "from": "33787864358",
          "type": "text",
          "text": { "body": "Airbnb du 10 au 17 août" },
          "timestamp": "1234567890"
        }]
      }
    }]
  }]
}
```

Le champ `id` (message_id) sert à la déduplication : si un message avec le même `id` a déjà été traité, il est ignoré.

### Envoi de réponses

```typescript
// POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
{
  "messaging_product": "whatsapp",
  "to": "33787864358",
  "type": "text",
  "text": { "body": "Réservation créée ✅" }
}
```

Pas besoin de templates Meta pour les réponses (réponses dans la fenêtre de 24h après le message de l'utilisateur).

### Limite de taille

Les messages WhatsApp sont limités à **4 096 caractères**. Le prompt système de l'agent inclut cette contrainte. Si un récapitulatif dépasse cette limite (peu probable en pratique), l'agent découpe en plusieurs messages.

### Traitement asynchrone

Le webhook répond **200 OK immédiatement** à Meta, puis traite le message de manière asynchrone. Cela évite les timeouts côté Meta (qui s'attend à une réponse rapide) alors que le traitement LLM + outils peut prendre 15-30 secondes.

---

## 8. Sécurité

| Mesure | Implémentation |
|--------|---------------|
| **Whitelist numéro** | Variable d'env `WHATSAPP_ALLOWED_PHONE` (un seul numéro pour la v1). Les messages d'autres numéros sont ignorés silencieusement (réponse 200 à Meta pour éviter les retries). |
| **Signature HMAC** | Vérification du header `X-Hub-Signature-256` avec le secret de l'app Meta (`WHATSAPP_APP_SECRET`). Nécessite l'accès au raw body — configurer `app.useBodyParser()` avec option `verify` dans `main.ts`, ou un middleware dédié pour la route webhook. |
| **Endpoint public** | Le webhook est public (Meta doit y accéder), protégé par HMAC + whitelist. Pas de JWT. |
| **Idempotence** | Chaque `message_id` Meta traité est stocké temporairement pour éviter le double traitement (Meta peut renvoyer le même webhook). |
| **Données en BDD** | Les conversations de plus de 7 jours sont purgées (nettoyage à la volée lors de chaque requête : avant de charger la conversation active, supprimer les conversations expirées du même numéro). |
| **Logs** | Pas de données personnelles (noms, téléphones) dans les logs applicatifs. |

---

## 9. Gestion d'erreurs

| Situation | Comportement |
|-----------|-------------|
| Numéro non whitelisté | Ignorer silencieusement (200 OK à Meta) |
| Signature HMAC invalide | Rejeter (401) |
| Erreur API Anthropic (timeout, quota, indisponibilité) | Répondre : *"Désolé, je rencontre un problème technique. Réessayez dans quelques minutes."* |
| Erreur création réservation (conflit inattendu, erreur Prisma) | Répondre avec le message d'erreur lisible |
| Message incompréhensible | L'agent Claude demande de reformuler (géré par le LLM) |
| Message non textuel (photo, vocal, document) | Répondre : *"Je ne traite que les messages texte pour le moment."* |
| Webhook Meta indisponible | Meta retente automatiquement (jusqu'à 7 jours) |
| Conversation expirée (> 30 min) | Nouvelle conversation, l'agent repart de zéro |
| Message dupliqué (même `message_id`) | Ignorer silencieusement (200 OK) |

---

## 10. Variables d'environnement

Ajouts au fichier `apps/api/.env` :

```env
# WhatsApp - Meta Cloud API
WHATSAPP_VERIFY_TOKEN="un-token-secret-de-verification"
WHATSAPP_ACCESS_TOKEN="token-permanent-meta"
WHATSAPP_APP_SECRET="secret-de-lapp-meta-pour-hmac"
WHATSAPP_PHONE_NUMBER_ID="id-du-numero-business"
WHATSAPP_ALLOWED_PHONE="+33787864358"

# Anthropic - Claude API
ANTHROPIC_API_KEY="sk-ant-xxx"
```

---

## 11. Dépendances à ajouter

```json
{
  "@anthropic-ai/sdk": "latest"
}
```

Les appels à l'API Meta (envoi de messages, graph API) se font avec l'API native `fetch` de Node.js (disponible depuis Node 18+, version minimum requise par le projet). Pas besoin de `@nestjs/axios` ou d'`axios` supplémentaire.

---

## 12. Configuration `main.ts`

Pour la vérification HMAC, le raw body de la requête doit être accessible. Ajouter dans `main.ts` :

```typescript
// Activer le raw body pour la vérification HMAC WhatsApp
app.useBodyParser('json', {
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf;
  },
});
```

Cela permet au guard/middleware HMAC de recalculer la signature à partir du body brut et de la comparer au header `X-Hub-Signature-256`.

---

## 13. Estimation des coûts

| Poste | Coût mensuel estimé |
|-------|-------------------|
| Meta Cloud API (WhatsApp) | 0 € (< 1 000 conversations/mois) |
| Claude Sonnet (API Anthropic) | 2-5 € (~50-100 conversations/mois, ~3-6 messages/conversation) |
| Railway (hébergement) | 0 € (inclus dans l'abonnement Hobby existant) |
| Neon (BDD) | 0 € (inclus dans le plan existant) |
| Numéro de téléphone | 0 € (numéro de test Meta ou numéro virtuel gratuit) |
| **Total** | **~2-5 €/mois** |

---

## 14. Limites et évolutions futures possibles

### Limites v1

- Création uniquement (pas de consultation, modification, annulation)
- Messages texte uniquement
- Un seul numéro autorisé
- Pas de pièces jointes (contrat PDF, facture)

### Évolutions possibles (hors périmètre)

- Consultation des réservations (*"Qu'est-ce que j'ai en août ?"*)
- Envoi automatique du contrat PDF après création
- Notifications proactives (*"Rappel : arrivée de la famille Martin demain"*)
- Multi-utilisateurs avec rôles
- Support des messages vocaux (transcription → texte)
