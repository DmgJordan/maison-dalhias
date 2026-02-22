---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Système de réservation multi-source avec modèle unifié et traitements différenciés'
session_goals: 'Architecture données flexible, UX seniors, compatibilité évolutions futures, arbitrage unifier/distinguer'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Morphological Analysis', 'Decision Tree Mapping']
ideas_generated: [26]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Jordan
**Date:** 2026-02-19

## Session Overview

**Topic:** Système de réservation multi-source (directe, plateformes tierces, perso/amis) avec modèle unifié mais traitements différenciés
**Goals:** Architecture données flexible pour un seul modèle Booking étendu, UX seniors (60+), compatibilité avec futures fonctionnalités (statuts paiement, revue des comptes), équilibre entre unification et distinction des traitements

### Context Guidance

_Projet existant : modèle Booking avec processus complet (client, tarifs, options), wizard 6 étapes, planning des disponibilités, dashboard admin mobile-first pour seniors. Besoin d'un parcours alternatif allégé pour réservations non-directes (plateformes tierces, perso, amis) tout en maintenant un écosystème unifié._

### Session Setup

_Approche AI-Recommended sélectionnée. Trois techniques choisies : Role Playing (empathie utilisateur), Morphological Analysis (analyse systématique des paramètres), Decision Tree Mapping (structuration des parcours et anticipation évolutions)._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Réservation multi-source avec focus sur arbitrage unifier/distinguer et UX seniors

**Recommended Techniques:**

- **Role Playing:** Se mettre dans la peau de la mère face aux 3 cas d'usage réels pour cartographier les besoins par type
- **Morphological Analysis:** Identifier systématiquement chaque paramètre et explorer toutes les combinaisons pour décider ce qui est commun vs spécifique
- **Decision Tree Mapping:** Cartographier tous les chemins de création et anticiper les connexions avec futures fonctionnalités

**AI Rationale:** Sujet combinant architecture de données et UX multi-parcours. La séquence empathie utilisateur → analyse systématique → structuration des parcours garantit une solution à la fois humaine et techniquement solide.

## Technique Execution Results

### Phase 1: Role Playing

**Focus:** Se mettre dans la peau de la mère (senior 60+) face aux 3 cas d'usage réels

**Scénarios explorés:**
1. Réservation plateforme tierce (Abritel) — notification reçue, besoin de bloquer les dates
2. Réservation perso/amis — bloquer une semaine pour la famille ou des amis
3. Transition rapide → complète — un client appelle en direct après une réservation rapide

**Key Ideas Generated:**

**[UX #1]**: Formulaire ultra-court "réservation externe"
_Concept_: 3-4 champs max : dates (obligatoire), source (obligatoire), nom client (optionnel), montant reversé (optionnel). L'absence de champs inutiles EST la fonctionnalité.
_Novelty_: Moins c'est plus pour un senior. Zéro friction.

**[UX #2]**: Source de réservation comme identifiant visuel
_Concept_: La source (Abritel, Airbnb, Booking, Perso, Ami...) s'affiche comme un badge coloré sur le planning et dans la liste. Reconnaissance visuelle instantanée.
_Novelty_: Pas besoin de lire les détails pour savoir "d'où ça vient" — le cerveau reconnaît la couleur.

**[UX #3]**: Création depuis le futur calendrier
_Concept_: Sélectionner des dates sur le calendrier → choix "Réservation complète" ou "Réservation rapide" → formulaire adapté s'ouvre.
_Novelty_: Le point d'entrée est les dates (ce que la mère a en premier), pas un formulaire. (Reporté au module calendrier futur)

**[UX #4]**: Montant optionnel "pour vos comptes"
_Concept_: Un champ montant facultatif avec un libellé explicite "Montant reçu (pour vos comptes personnels)". Présent mais jamais bloquant.
_Novelty_: Prépare le terrain pour un futur module comptable sans alourdir le présent.

**[UX #5]**: Source flexible avec suggestions mémorisées
_Concept_: Liste déroulante avec sources courantes (Abritel, Airbnb, Booking) + option "Autre" avec saisie libre. Les nouvelles sources saisies sont mémorisées.
_Novelty_: Pas de maintenance d'une liste figée, le système apprend les habitudes.

**[UX #6]**: Un seul parcours rapide, la source fait la différence
_Concept_: Pas de parcours séparé "amis" vs "plateforme". Le même formulaire court avec un champ source. La source détermine le badge visuel et le BookingType automatiquement.
_Novelty_: Zéro complexité cognitive — un seul chemin à retenir.

**[UX #7]**: Badges visuels par catégorie de source
_Concept_: Sources regroupées en catégories visuelles : plateformes tierces (bleu), personnel/famille (violet), amis (vert). Chaque catégorie a sa couleur.
_Novelty_: Distinction subtile mais immédiate en un coup d'œil.

**[UX #8]**: Pas de notion de tarif pour les réservations rapides
_Concept_: Le formulaire rapide n'a aucun champ de tarification (pas de prix/nuit, pas d'options ménage/linge). Seul le montant global optionnel existe.
_Novelty_: Élimine toute la complexité tarifaire quand elle n'a pas lieu d'être.

**[UX #9]**: Bouton "Compléter les informations"
_Concept_: Sur la fiche d'une réservation rapide, un bouton bien visible permet de basculer vers le wizard partiel pré-rempli pour enrichir les données. Le type reste inchangé.
_Novelty_: Enrichissement progressif sans transformation de type.

**[UX #10]**: Évolution unidirectionnelle uniquement
_Concept_: Une réservation rapide peut être enrichie, jamais l'inverse. Pas de risque de "perdre" un contrat en rétrogradant.
_Novelty_: Contrainte volontaire qui protège l'intégrité des données.

**[UX #11]**: Statuts de paiement optionnels universels
_Concept_: Les futurs statuts (acompte payé, payé, en attente) sont disponibles sur TOUTES les réservations mais jamais obligatoires sur les rapides.
_Novelty_: Même écosystème de suivi, intensité d'usage au choix.

**[UX #12]**: Pré-remplissage intelligent à l'enrichissement
_Concept_: Quand on enrichit une réservation rapide, les données existantes (dates, nom, montant) pré-remplissent le wizard. Donnée saisie une fois = jamais ressaisie.
_Novelty_: Respecte le temps du senior.

### Phase 2: Morphological Analysis

**Focus:** Décomposer systématiquement chaque paramètre et explorer les options

**Decisions on 8 parameters:**

| Parameter | Decision | Justification |
|-----------|----------|---------------|
| A. Modèle de données | Un seul Booking étendu avec enum BookingType | Zéro duplication, transition naturelle, un seul écosystème |
| B. Champs formulaire rapide | 2 obligatoires (dates, source) + 4 optionnels (nom, montant, occupants, notes) | Minimum vital, tout sur 1-2 écrans |
| C. Point d'entrée | Choix à l'étape 1 du wizard existant (C2) | Pas de nouveau bouton menu, parcours se spécialise dès la première interaction |
| D. Nombre d'étapes rapide | 2 étapes (R1: dates+source, R2: optionnels+récap) | Écrans aérés, adapté seniors |
| E. Contrainte min nuits | Aucune pour rapides (seule validation: fin > début) | Plateformes gèrent leurs règles, amis/perso c'est libre |
| F. Vérification conflits | Stricte, identique pour tous les types | Un créneau occupé est occupé, point |
| G. Affichage liste | Liste unique mixte triée chronologiquement | La date est le critère naturel de consultation |
| H. Fiche détail | Même page, édition adaptée au type + modale légère | Modifier ≠ Compléter, deux actions distinctes |

**Additional ideas from Morphological Analysis:**

**[UX #13]**: Champ notes transversal sur toutes les réservations
_Concept_: Un champ texte libre disponible sur TOUTES les réservations. "Ils arrivent tard", "ami de Martine", "clés chez le voisin".
_Novelty_: Comble le fossé entre le structuré et la réalité humaine.

**[UX #14]**: Switch visuel clair à l'étape 1
_Concept_: Deux grosses cartes côte à côte : "Réservation directe" et "Réservation rapide". Gros icônes, texte explicite, choix impossible à rater.
_Novelty_: Le choix du parcours est un acte conscient et visible.

**[UX #15]**: Deux actions distinctes sur la fiche rapide
_Concept_: Deux boutons clairement séparés : "Modifier" (édition légère) et "Compléter les informations" (wizard partiel). Pas de confusion.
_Novelty_: Modifier garde le format rapide, compléter enrichit les données.

**[UX #16]**: Boutons d'action conditionnels sur la fiche détail
_Concept_: "Générer contrat", "Générer facture", "Envoyer par email" apparaissent uniquement quand les données nécessaires sont renseignées, quel que soit le type.
_Novelty_: L'interface s'adapte aux données, pas au type. Récompense naturelle de l'enrichissement.

**[UX #17]**: Libellé "Compléter les informations"
_Concept_: Libellé explicite et concret. "Compléter" implique un enrichissement progressif, pas une transformation.
_Novelty_: Cohérent avec le type immuable.

### Phase 3: Decision Tree Mapping

**Focus:** Cartographier les parcours et anticiper les connexions futures

**Decision Trees:**

**Arbre 1 — Parcours de création:**
```
Nouvelle réservation (bouton admin)
├─ Étape 1 : Choix du type
│  ├─ "Directe" → Wizard 6 étapes existant (inchangé)
│  └─ "Rapide" → Étape R1 (dates+source) → Étape R2 (optionnels+récap) → Booking créé
```

**Arbre 2 — Cycle de vie réservation rapide:**
```
Réservation rapide créée (EXTERNAL ou PERSONAL — permanent)
├─ "Modifier" → Modale légère (champs rapides)
├─ "Compléter les informations" → Wizard partiel pré-rempli → Type INCHANGÉ, données enrichies
│  ├─ Client complet ? → Contrat débloqué
│  ├─ Tarifs renseignés ? → Facture débloquée
│  └─ Email client ? → Envoi email débloqué
├─ "Annuler" → Status: CANCELLED
└─ "Supprimer" → Supprimée
```

**Arbre 3 — Futures fonctionnalités:**
```
Statuts paiement (enum universel, optionnel):
├─ DIRECT : En attente → Acompte reçu → Soldé
├─ EXTERNAL : En attente → Versement reçu → Payé
└─ PERSONAL : En attente → Payé / Gratuit

Module comptable (futur):
├─ Toutes réservations avec montant participent au bilan
├─ Source = dimension de filtrage/agrégation
└─ "Revenus Abritel 2026", "Revenus directs Q3"...
```

**Key Architecture Ideas from Decision Tree Mapping:**

**[Archi #1]**: Modèle Booking unique étendu avec champ `type`
_Concept_: Un enum BookingType (DIRECT/EXTERNAL/PERSONAL). Les champs client, tarifs, options deviennent optionnels. Le type détermine le comportement UI et les validations.
_Novelty_: Zéro duplication, un seul écosystème pour tous les futurs modules.

**[Archi #2]**: Formulaire rapide — 2 obligatoires, 4 optionnels
_Concept_: Dates + source obligatoires. Nom client, montant, occupants, notes = optionnels. Formulaire tenant sur 1-2 écrans.
_Novelty_: 2 champs pour créer une réservation. Le reste est du bonus.

**[Archi #3]**: Point d'entrée unifié — choix du type à l'étape 1
_Concept_: Dans le wizard existant, l'étape 1 intègre un sélecteur visuel. Si rapide → 2 étapes. Si complète → 6 étapes inchangées.
_Novelty_: Un seul bouton menu, le parcours se spécialise à la première interaction.

**[Archi #4]**: Parcours rapide en 2 étapes
_Concept_: Étape R1 (dates + source) + Étape R2 (optionnels + récap + valider). Écrans aérés, adapté seniors.

**[Archi #5]**: Aucune contrainte de nuits minimum pour les réservations rapides
_Concept_: Seule validation : date fin > date début. Les contraintes tarifaires ne s'appliquent qu'aux directes.

**[Archi #6]**: Vérification stricte des conflits pour tous les types
_Concept_: Les réservations rapides participent au même système de vérification. Un créneau occupé est occupé.

**[Archi #7]**: Liste unique mixte triée par date
_Concept_: Toutes les réservations dans une seule liste chronologique. Badge coloré source/type pour distinction visuelle.

**[Archi #8]**: Page détail unique avec édition adaptée au type
_Concept_: Même page pour tous les types. "Modifier" → modale légère. "Compléter les informations" → wizard partiel.

**[Archi #9]**: La source détermine le type automatiquement
_Concept_: Abritel/Airbnb/Booking → EXTERNAL. Personnel/Amis/Famille → PERSONAL. L'utilisateur choisit la source, le système déduit le type.

**[Archi #10]**: Le type est immuable, les capacités sont liées aux données
_Concept_: Une réservation EXTERNAL reste EXTERNAL même enrichie. Les actions (contrat, facture) dépendent de la présence des données, pas du type.

**[Archi #11]**: Statuts de paiement universels et optionnels
_Concept_: Un enum unique (PENDING/PARTIAL/PAID/FREE/null). Même champ pour tous les types, toujours optionnel sur les rapides.

**[Archi #12]**: Source comme dimension d'analyse future
_Concept_: Le champ source est une dimension de filtrage et d'agrégation pour le futur module comptable. Investissement minimal aujourd'hui.

**[Archi #13]**: Label OU nom client comme identifiant
_Concept_: Un champ label optionnel sert d'identifiant alternatif. Affichage : "source + (nom client || label)". Au moins l'un des deux renseigné.

**[Archi #14]**: Ajout de adultsCount au modèle Prisma
_Concept_: Corriger l'incohérence store frontend vs DB. Ajout au modèle Booking, optionnel pour rapides, utile pour taxe de séjour sur complètes.

## Data Model

```prisma
enum BookingType {
  DIRECT
  EXTERNAL
  PERSONAL
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  FREE
}

model Booking {
  // Champs existants
  id                   String    @id @default(uuid())
  startDate            DateTime
  endDate              DateTime
  status               Status    @default(PENDING) // PENDING | CONFIRMED | CANCELLED
  userId               String
  user                 User      @relation(fields: [userId], references: [id])

  // NOUVEAUX champs
  bookingType          BookingType @default(DIRECT)
  source               String?    // "Abritel", "Airbnb", "Booking", "Personnel", "Amis"...
  label                String?    // Identifiant alternatif au nom client
  externalAmount       Decimal?   @db.Decimal(10, 2) // Montant reversé plateforme
  notes                String?    // Commentaire libre (tous types)
  paymentStatus        PaymentStatus? // Statut de paiement (optionnel)
  adultsCount          Int?       // Nombre d'adultes (taxe de séjour)

  // Champs existants rendus optionnels pour rapides
  primaryClientId      String?
  secondaryClientId    String?
  occupantsCount       Int?       // Optionnel pour rapides (était @default(1))
  rentalPrice          Decimal?   @db.Decimal(10, 2) // Optionnel pour rapides
  touristTaxIncluded   Boolean    @default(false)
  cleaningIncluded     Boolean    @default(false)
  linenIncluded        Boolean    @default(false)

  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt
}
```

## Idea Organization and Prioritization

### Theme 1: Unified Data Model

| # | Idea | Key Insight |
|---|------|-------------|
| Archi #1 | Single Booking model with BookingType enum | One ecosystem, zero duplication |
| Archi #5 | No min nights constraint for quick bookings | Type determines validation rules |
| Archi #6 | Strict conflict checking for all types | One calendar truth |
| Archi #9 | Source auto-determines type | Less choice = less friction |
| Archi #10 | Immutable type, data-driven capabilities | "Where it comes from" ≠ "what you can do with it" |
| Archi #13 | Label OR client name as identifier | Flexibility: user enters what they have |
| Archi #14 | Add adultsCount to Prisma model | Opportunistic tech debt fix |

### Theme 2: Quick Creation Flow

| # | Idea | Key Insight |
|---|------|-------------|
| Archi #2 | 2 required + 4 optional fields | 2 fields to create, rest is bonus |
| Archi #3 | Unified entry point, choice at step 1 | Single "New booking" button |
| Archi #4 | Quick flow in 2 steps | Airy screens, senior-friendly |
| UX #1 | Ultra-short form | Absence of fields IS the feature |
| UX #14 | Clear visual switch (cards) at step 1 | Conscious and visible choice |

### Theme 3: Visual Display and Identification

| # | Idea | Key Insight |
|---|------|-------------|
| UX #2 | Source as colored badge | Instant visual recognition |
| UX #6 | One quick flow, source makes the difference | Zero cognitive complexity |
| UX #7 | Badges by source category | Subtle but immediate distinction |
| UX #8 | No pricing in quick form | Zero friction |
| Archi #7 | Single mixed list sorted by date | Date trumps source for navigation |

### Theme 4: Lifecycle and Enrichment

| # | Idea | Key Insight |
|---|------|-------------|
| UX #9 | "Compléter les informations" button | Progressive enrichment, not transformation |
| UX #10 | Unidirectional evolution only | Enrich, never downgrade |
| UX #12 | Smart pre-fill on enrichment | Data entered once = never re-entered |
| UX #15 | Modify ≠ Complete (two distinct actions) | No confusion between edit and enrich |
| UX #16 | Conditional action buttons | Interface adapts to present data |
| UX #17 | "Compléter les informations" label | Concrete and explicit for seniors |
| Archi #8 | Lightweight edit modal for quick bookings | Quick edit stays quick |

### Theme 5: Future Feature Preparation

| # | Idea | Key Insight |
|---|------|-------------|
| UX #4 | Optional amount "for your records" | Prepares accounting module |
| UX #5 | Flexible source with memorized suggestions | System learns habits |
| UX #11 | Optional universal payment statuses | Same tracking, intensity by choice |
| UX #13 | Cross-cutting notes field | Bridges structured and human reality |
| Archi #11 | Universal status enum | One field, contextual display |
| Archi #12 | Source as analysis dimension | Minimal investment, major future return |

### Cross-cutting Principles

- **"Immutable type, dynamic capabilities"** — type reflects origin, actions depend on data
- **"Fewer fields = more value"** — every absent field is friction removed
- **"One ecosystem"** — same calendar, same future modules, no second-class citizens

### Prioritization Results

**Phase 1 — Foundations (Backend):**
1. Prisma migration: BookingType enum, new fields (source, label, notes, externalAmount, paymentStatus), existing fields made optional, add adultsCount
2. Adapt bookings service: differentiated validation by type, unified conflict checking
3. Adapt DTOs: CreateQuickBookingDto, UpdateQuickBookingDto
4. New or adapted endpoint for quick booking creation

**Phase 2 — Creation Flow (Frontend):**
5. Wizard step 1: add type selector (visual cards Direct/Quick)
6. Pinia store: state and validations for quick flow (2 steps)
7. Quick step components (R1: dates+source, R2: optionals+recap)
8. Source → BookingType auto-mapping + source list with memorization

**Phase 3 — Display and Lifecycle (Frontend):**
9. Booking list: colored badges by source/type, chronological sort
10. Adapted detail page: conditional display based on present data
11. Lightweight edit modal for quick bookings
12. "Compléter les informations" button → partial pre-filled wizard
13. Conditional action buttons (contract, invoice, email if sufficient data)

**Phase 4 — Future Preparation (Optional):**
14. Cross-cutting notes field (add to all bookings)
15. Optional payment statuses (enum + contextual display)
16. Source as filter/analysis dimension

## Session Summary and Insights

**Key Achievements:**

- 26 ideas generated across 3 complementary techniques
- 5 organized themes covering the full feature lifecycle
- Complete data model designed and validated (Prisma schema)
- 16-step prioritized implementation plan in 4 phases
- 3 cross-cutting UX/architecture principles identified

**Creative Breakthroughs:**

- The "immutable type, data-driven capabilities" principle emerged as the key architectural insight — separating origin identity from functional capabilities
- The unidirectional enrichment model (quick → enriched, never the reverse) elegantly solves the transition problem without data loss
- "Source auto-determines type" eliminates an abstraction layer the senior user would never understand
- Label OR client name as alternative identifiers provides maximum flexibility with minimum friction

**Session Reflections:**

This session focused on balancing unification (one model, one calendar, one ecosystem) with differentiation (different creation flows, different validations, different display). The Role Playing technique revealed that the 3 use cases (platform, personal, friends) share almost identical needs — only the source differs. The Morphological Analysis systematically validated 8 architectural parameters with clear, justified decisions. The Decision Tree Mapping confirmed the viability of the unified approach and mapped clean connections to future features (payment statuses, accounting module).

**Primary usage: Desktop PC for admin dashboard.**
**Target users: Seniors (60+), parents of the developer, non-technical.**
