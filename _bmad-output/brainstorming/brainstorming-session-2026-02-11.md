---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Système emailing admin pour envoi contrats/factures aux clients'
session_goals: 'Interface simple seniors, envoi en 1-2 clics, suivi des envois, autonomie complète'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Reverse Brainstorming', 'Morphological Analysis']
ideas_generated: [27]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Jordan
**Date:** 2026-02-11

## Session Overview

**Topic:** Système d'emailing intégré au dashboard admin pour envoyer les documents contractuels (contrat, facture) aux clients des réservations
**Goals:** Interface ultra-simple pour utilisateurs seniors (60+), envoi en 1-2 clics des PDF, suivi clair des envois, backend solide

### Context Guidance

_Projet existant : service email Resend, générateurs PDF (contrat, facture), modèle Booking lié à Clients, dashboard admin avec vue détail réservation. Utilisateurs cibles : parents du développeur, seniors, besoin d'autonomie totale sans complexité._

### Session Setup

_Approche AI-Recommended sélectionnée. Trois techniques choisies pour explorer l'UX seniors, identifier les pièges, et construire systématiquement la solution._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Emailing admin pour seniors, focus sur simplicité et suivi

**Recommended Techniques:**

- **Role Playing:** Se mettre dans la peau des parents/utilisateurs seniors pour comprendre le parcours idéal
- **Reverse Brainstorming:** Identifier tout ce qui pourrait rendre le système inutilisable pour des seniors
- **Morphological Analysis:** Explorer systématiquement toutes les combinaisons de paramètres pour la solution optimale

**AI Rationale:** Sujet concret orienté UX pour utilisateurs spécifiques (seniors). La séquence empathie -> identification risques -> construction systématique garantit une solution robuste et accessible.

## Technique Execution Results

### Phase 1: Role Playing

**Focus:** Se mettre dans la peau des parents (seniors 60+) utilisant le dashboard admin

**Parcours utilisateur identifié:**
Appel téléphone -> Créer la réservation dans l'appli -> Générer les PDF -> Envoyer par email

**Key Ideas Generated:**

**[UX #1]**: Choix flexible du contenu email
_Concept_: L'interface propose 3 options d'envoi : contrat seul, facture seule, ou les deux ensemble. Pas un envoi "tout ou rien".
_Novelty_: Respecte le workflow réel où contrat et facture n'ont pas forcément le même timing d'envoi.

**[UX #2]**: Email client déjà disponible dans la réservation
_Concept_: L'email est capturé à la création de la réservation. Au moment d'envoyer, zéro saisie supplémentaire.
_Novelty_: Élimine la friction majeure (chercher/recopier l'adresse).

**[UX #3]**: Remplacement du flux multi-app par single-app
_Concept_: Le processus manuel (télécharger PDF -> ouvrir boîte mail -> joindre -> envoyer) est remplacé par des clics dans l'appli.
_Novelty_: Passage de 4-5 étapes multi-app à 1-2 clics single-app.

**[UX #4]**: Aperçu complet avant envoi
_Concept_: Écran de prévisualisation montrant le mail tel que le client le recevra (destinataire, objet, corps, pièces jointes) avec possibilité de modifier le texte.
_Novelty_: Transforme un acte de foi en acte contrôlé ("je vois et je valide").

**[UX #5]**: Message pré-rempli mais personnalisable
_Concept_: Un texte standard professionnel est généré automatiquement mais la mère peut ajouter un petit mot perso avant d'envoyer.
_Novelty_: Le meilleur des deux mondes — pas besoin de rédiger from scratch, mais liberté de touche personnelle.

**[UX #6]**: Historique des envois par réservation
_Concept_: Sur la fiche réservation, une section "Emails envoyés" listant chaque envoi (date, document, destinataire).
_Novelty_: Le suivi est attaché à la réservation, pas perdu dans une boîte mail externe.

**[UX #7]**: Renvoi facile après modification
_Concept_: Si le contrat/facture est regénéré après correction, l'appli signale le changement. Un bouton "Renvoyer" reprend le même flux.
_Novelty_: Gère le cas d'erreur sans stress.

**[UX #8]**: Destinataire flexible sans modification de fiche
_Concept_: Le destinataire par défaut est le client principal, mais un champ permet d'ajouter/modifier l'adresse ponctuellement sans toucher aux données.
_Novelty_: Sépare "à qui j'envoie ce mail" de "qui est le client enregistré".

**[UX #9]**: Sélecteur rapide de destinataire
_Concept_: Boutons radio : Client principal / Client secondaire / Autre adresse. Client principal pré-sélectionné.
_Novelty_: Cas courant = 0 action, cas alternatifs = 1 clic de plus.

### Phase 2: Reverse Brainstorming

**Focus:** Identifier tout ce qui pourrait rendre le système inutilisable pour des seniors

**Anti-patterns identifiés:**

**[Anti #1]**: Absence de feedback visuel = double envoi + anxiété
_Concept_: Sans confirmation claire et immédiate, l'utilisateur doute et renvoie. Le client reçoit des doublons.
_Guard_: Confirmation modale impossible à rater.

**[Anti #2]**: Feedback trop discret (toast qui disparaît)
_Concept_: Un petit toast vert qui disparaît en 2 secondes. La mère ne l'a pas vu.
_Guard_: Pour des seniors, le feedback doit être gros, central, persistant.

**[Anti #3]**: Confusion entre réservations = erreur de destinataire
_Concept_: Si l'aperçu ne montre pas clairement le contexte de la réservation, confusion entre clients.
_Guard_: L'aperçu doit rappeler le contexte (nom client, dates) à côté du destinataire.

**[Anti #4]**: Historique sans contexte = impuissance face au client
_Concept_: Un historique qui dit juste "email envoyé" sans détails ne résout rien quand le client appelle.
_Guard_: Historique riche : date, document, destinataire, version.

**[Anti #5]**: Perte de saisie = frustration et abandon
_Concept_: Si le message personnalisé est perdu par un clic malheureux, c'est le moment où un senior abandonne.
_Guard_: Bouton "remettre le texte par défaut" + texte toujours récupérable.

**[Anti #6]**: Mail en spam = système inutile
_Concept_: L'expéditeur, l'objet, le format des PJ influencent la délivrabilité. Si le client ne reçoit rien, la mère pense que l'appli ne marche pas.
_Guard_: Objet clair, expéditeur identifiable, PDF de taille raisonnable.

**[Anti #7]**: Variables non résolues dans le mail = image non professionnelle
_Concept_: Si le corps du mail contient des placeholders non remplis parce qu'il manque une info.
_Guard_: Vérification données complètes AVANT de proposer l'envoi. Bouton grisé si incomplet.

### Phase 3: Morphological Analysis

**Focus:** Explorer systématiquement toutes les combinaisons de paramètres

**Decisions on 8 parameters:**

| Parameter | Decision |
|-----------|----------|
| A. Point d'entrée | Boutons sur la fiche réservation (proximité action/contexte) + historique en dessous |
| B. Sélection documents | Bouton "Envoyer" par document + "Envoyer les deux" (mix B2/B4, mobile-friendly en cartes empilées) |
| C. Destinataire | Boutons radio : client principal (pré-sélectionné) / secondaire / autre adresse |
| D+E. Message + Aperçu | Écran fusionné : texte pro en lecture seule + zone message personnel optionnel + PJ listées |
| F. Feedback post-envoi | Écran de succès plein remplaçant l'aperçu (récap : quoi, à qui, quand) |
| G. Historique | Mini-cartes avec statut Resend (envoyé/délivré/erreur) + bouton renvoyer |
| H. Modèle de données | EmailLog + ContractSnapshot + InvoiceSnapshot (collections typées, pas de JSON blob) |

**Additional ideas from Morphological Analysis:**

**[UX #10]**: Snapshot des données au moment de l'envoi
_Concept_: Au lieu de stocker le PDF, on stocke en DB les données clés figées. Permet de regénérer le PDF exact même si la réservation a changé.
_Novelty_: Zéro stockage fichier, traçabilité totale.

**[UX #11]**: Alerte de version obsolète
_Concept_: Si la réservation est modifiée APRÈS le dernier envoi, l'appli affiche "Modifié depuis le dernier envoi". Pousse à renvoyer.
_Novelty_: L'appli fait le travail de mémoire pour l'utilisateur.

**[UX #12]**: Données typées pour regénération à la volée
_Concept_: Collections ContractSnapshot et InvoiceSnapshot avec champs typés plutôt que JSON. Queryable et maintenable.
_Novelty_: Architecture propre, chaque snapshot peut regénérer le PDF exact de l'époque.

## Data Model

```prisma
model EmailLog {
  id              String      @id @default(uuid())
  bookingId       String
  booking         Booking     @relation(fields: [bookingId])
  recipientEmail  String
  recipientName   String
  documentTypes   String[]    // ["contract", "invoice"]
  subject         String
  personalMessage String?
  resendMessageId String?
  status          EmailStatus @default(SENT)
  sentAt          DateTime    @default(now())
  deliveredAt     DateTime?
  failedAt        DateTime?
  failureReason   String?
  contractSnapshotId String?
  contractSnapshot   ContractSnapshot? @relation(fields: [contractSnapshotId])
  invoiceSnapshotId  String?
  invoiceSnapshot    InvoiceSnapshot?  @relation(fields: [invoiceSnapshotId])
  createdAt       DateTime    @default(now())
  @@index([bookingId])
}

enum EmailStatus {
  SENT
  DELIVERED
  FAILED
}

model ContractSnapshot {
  id               String   @id @default(uuid())
  bookingId        String
  booking          Booking  @relation(fields: [bookingId])
  clientFirstName  String
  clientLastName   String
  clientAddress    String
  clientCity       String
  clientPostalCode String
  clientCountry    String
  clientEmail      String
  clientPhone      String
  startDate        DateTime
  endDate          DateTime
  occupantsCount   Int
  rentalPrice      Decimal  @db.Decimal(10, 2)
  cleaningIncluded Boolean
  linenIncluded    Boolean
  touristTaxIncluded Boolean
  depositAmount    Decimal  @db.Decimal(10, 2)
  createdAt        DateTime @default(now())
  emailLogs        EmailLog[]
  @@index([bookingId])
}

model InvoiceSnapshot {
  id               String   @id @default(uuid())
  bookingId        String
  booking          Booking  @relation(fields: [bookingId])
  clientFirstName  String
  clientLastName   String
  clientAddress    String
  clientCity       String
  clientPostalCode String
  clientCountry    String
  rentalPrice      Decimal  @db.Decimal(10, 2)
  nightsCount      Int
  cleaningPrice    Decimal? @db.Decimal(10, 2)
  linenPrice       Decimal? @db.Decimal(10, 2)
  touristTaxPrice  Decimal? @db.Decimal(10, 2)
  totalPrice       Decimal  @db.Decimal(10, 2)
  depositAmount    Decimal  @db.Decimal(10, 2)
  balanceAmount    Decimal  @db.Decimal(10, 2)
  createdAt        DateTime @default(now())
  emailLogs        EmailLog[]
  @@index([bookingId])
}
```

## Idea Organization and Prioritization

### Theme 1: Sending Flow (User Journey)

| # | Idea | Insight |
|---|------|---------|
| UX #1 | Flexible document choice (contract/invoice/both) | Respects real timing of document sending |
| UX #3 | Single-app replaces multi-app manual flow | Main value proposition: 4-5 steps -> 1-2 clicks |
| UX #8 | Flexible recipient without modifying booking | Separates "who I send to" from booking data |
| UX #9 | Radio selector: primary / secondary / other | Common case = 0 action, special cases = 1 click |
| Archi B | Send button per document + "Send both" | One button = one action principle for seniors |
| Archi A | Entry point on booking detail page | Action/context proximity |

### Theme 2: Trust and Control (Pre-send Reassurance)

| # | Idea | Insight |
|---|------|---------|
| UX #4 | Full preview before sending | "I see what will be sent" = confidence |
| UX #5 | Pre-filled text + personal note area | Pro text protected, freedom for personal touch |
| Anti #3 | Show booking context in preview | Prevents sending to wrong client |
| Anti #5 | Default text always recoverable | Safety net against input errors |
| Anti #7 | Complete data verification before send | Greyed button if data incomplete |
| Archi D+E | Merged preview + customization screen | Fewer screens = less confusion |

### Theme 3: Feedback and Tracking (Post-send)

| # | Idea | Insight |
|---|------|---------|
| UX #6 | Email history per booking | Tracking attached to booking, not lost in external mailbox |
| UX #7 | Easy resend after modification | "Sent wrong version" is no longer a problem |
| Anti #1 | Unmissable confirmation | Full success screen, not a discreet toast |
| Anti #2 | Large, central, persistent feedback | Senior-proof |
| Anti #4 | Rich history (date, doc, recipient) | Enables answering client calls with confidence |
| Archi F | Success screen replaces preview | Prevents anxious double-clicking |
| Archi G | Mini-cards with Resend status + resend button | Scannable at a glance |

### Theme 4: Document Versioning and Integrity

| # | Idea | Insight |
|---|------|---------|
| UX #10 | Data snapshot at send time | Full traceability without file storage |
| UX #11 | "Modified since last send" alert | App does the remembering for the user |
| UX #12 | Typed data for on-the-fly regeneration | Zero blob storage, exact PDF regeneration |
| Anti #6 | Deliverability (clear subject, identifiable sender) | Invisible but critical technical foundation |
| Archi H | EmailLog + ContractSnapshot + InvoiceSnapshot | Clean, typed, queryable data model |

### Cross-cutting Principles

- **"One button = one action"** — UX thread for seniors
- **"The app remembers for you"** — version alerts, history, snapshots
- **"No silent point of no return"** — always a preview, always feedback

### Prioritization Results

**Implementation Order (impact x feasibility):**

**Phase 1 - Foundations (Backend):**
1. Data model (EmailLog, ContractSnapshot, InvoiceSnapshot) + Prisma migration
2. API endpoint for email sending with Resend + PDF generation
3. Resend webhook for delivery status tracking

**Phase 2 - Core Feature (Frontend):**
4. Send buttons on booking detail page
5. Preview/customization screen
6. Success screen post-send

**Phase 3 - Polish and Safety:**
7. History mini-cards with delivery status
8. "Modified since last send" alert
9. Complete data verification (greyed button)
10. "Resend" button from history

## Session Summary and Insights

**Key Achievements:**

- 27 ideas generated across 3 complementary techniques
- 4 organized themes covering the full feature lifecycle
- Complete data model designed and validated
- 10-step prioritized implementation plan
- 3 cross-cutting UX principles identified for senior users

**Creative Breakthroughs:**

- The snapshot approach (typed collections instead of file storage) emerged as an elegant solution to versioning without blob storage
- The "modified since last send" alert transforms passive history into proactive guidance
- Merging preview + customization into one screen reduces cognitive load significantly

**Session Reflections:**

This session focused on a concrete, user-centric feature. The Role Playing technique was particularly effective for uncovering the real user journey (phone call -> create booking -> send documents). The Reverse Brainstorming revealed critical UX pitfalls (silent feedback, data loss, confusion between bookings) that would have been easy to miss in a feature-first approach. The Morphological Analysis provided systematic coverage of all design parameters with clear, justified decisions for each.

**Primary usage: Desktop PC, with mobile as fallback.**
**Target users: Seniors (60+), parents of the developer, non-technical.**
