# Plan - Système de gestion des tarifs par saisons

## Objectif

Créer un système complet de gestion des tarifs permettant :
1. Définir des **saisons** avec leurs tarifs
2. Associer des **plages de dates** à ces saisons
3. Gérer plusieurs **années**
4. Générer un **PDF commercial** de grille tarifaire
5. Intégrer ce système avec le reste de l'application

---

## Architecture

### Modèle de données

```prisma
model Season {
  id            String       @id @default(uuid())
  name          String       // "Basse saison", "Haute saison", etc.
  pricePerNight Decimal      // Prix par nuit
  color         String?      // Couleur pour l'affichage (ex: #10B981)
  order         Int          @default(0) // Ordre d'affichage
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  datePeriods   DatePeriod[]
}

model DatePeriod {
  id        String   @id @default(uuid())
  startDate DateTime // Date de début
  endDate   DateTime // Date de fin
  year      Int      // Année (2025, 2026, etc.)
  seasonId  String
  season    Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([year])
  @@index([startDate, endDate])
}
```

### Relations

```
Season (1) ←→ (N) DatePeriod
```

Une saison peut avoir plusieurs plages de dates (même sur différentes années).

---

## Phases de développement

### Phase 1 : Backend - Modèles et API

**Fichiers concernés :**
- `apps/api/prisma/schema.prisma`
- `apps/api/src/seasons/` (nouveau module)
- `apps/api/src/date-periods/` (nouveau module)
- `apps/api/src/pricing/` (nouveau service)

**Tâches :**

- [x] 1.1 Créer le schéma Prisma (Season, DatePeriod)
- [x] 1.2 Générer et appliquer la migration (via `db push`)
- [x] 1.3 Créer le module `SeasonsModule`
  - CRUD complet (create, findAll, findOne, update, delete)
  - DTO avec validation class-validator
- [x] 1.4 Créer le module `DatePeriodsModule`
  - CRUD complet
  - Validation : pas de chevauchement sur la même année
  - Endpoint pour récupérer par année
- [x] 1.5 Créer le service `PricingService`
  - `calculatePrice(startDate, endDate)` : calcule le prix total
  - Gère les réservations qui chevauchent plusieurs plages
  - Retourne le détail par période

**Endpoint API :**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/seasons` | Liste des saisons |
| POST | `/api/seasons` | Créer une saison |
| PATCH | `/api/seasons/:id` | Modifier une saison |
| DELETE | `/api/seasons/:id` | Supprimer une saison |
| GET | `/api/date-periods?year=2025` | Plages par année |
| POST | `/api/date-periods` | Créer une plage |
| PATCH | `/api/date-periods/:id` | Modifier une plage |
| DELETE | `/api/date-periods/:id` | Supprimer une plage |
| POST | `/api/pricing/calculate` | Calculer un tarif |

---

### Phase 2 : Backend - Intégration avec l'existant

**Fichiers concernés :**
- `apps/api/src/bookings/bookings.service.ts`
- `apps/web/src/stores/newBookingForm.ts`

**Tâches :**

- [x] 2.1 Modifier `BookingsService.create()` pour utiliser `PricingService`
- [x] 2.2 Supprimer les tarifs en dur du frontend
- [x] 2.3 Modifier le store `newBookingForm` pour appeler l'API de calcul
- [x] 2.4 Gérer le cas **aucune configuration** :
  - Si aucune saison → utiliser tarif par défaut (configurable)
  - Afficher un avertissement dans l'admin
- [x] 2.5 Ajouter un tarif par défaut dans les settings (fallback)

**Logique de calcul multi-plages :**

```typescript
// Exemple : réservation du 28/06 au 05/07
// 28-30/06 = Moyenne saison (120€) → 3 nuits
// 01-05/07 = Haute saison (150€) → 4 nuits
// Total = (3 × 120) + (4 × 150) = 360 + 600 = 960€
```

---

### Phase 3 : Frontend - Interface de gestion des saisons

**Fichiers concernés :**
- `apps/web/src/views/admin/PricingView.vue` (nouveau)
- `apps/web/src/components/admin/SeasonCard.vue` (nouveau)
- `apps/web/src/components/admin/SeasonModal.vue` (nouveau)

**Layout proposé :**

```
┌─────────────────────────────────────────────────────────────┐
│ Gestion des tarifs                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🏷️ SAISONS                                    [+ Ajouter]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 Basse saison       │  80 €/nuit  │ [✏️] [🗑️]        │ │
│ │ 🟡 Moyenne saison     │ 120 €/nuit  │ [✏️] [🗑️]        │ │
│ │ 🟠 Haute saison       │ 150 €/nuit  │ [✏️] [🗑️]        │ │
│ │ 🔴 Très haute saison  │ 180 €/nuit  │ [✏️] [🗑️]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tâches :**

- [x] 3.1 Créer la route `/admin/tarifs` et l'ajouter à la navigation
- [x] 3.2 Créer `PricingView.vue` avec section saisons
- [x] 3.3 ~~Créer `SeasonCard.vue`~~ (intégré directement dans PricingView.vue)
- [x] 3.4 Créer `SeasonModal.vue` (création/édition)
  - Champs : nom, prix/nuit (couleur supprimée - inutile)
  - Validation : nom requis, prix > 0
- [x] 3.5 Actions : ajouter, modifier, supprimer (avec confirmation inline)

---

### Phase 4 : Frontend - Gestion des plages de dates

**Fichiers concernés :**
- `apps/web/src/views/admin/PricingView.vue`
- `apps/web/src/components/admin/DatePeriodCard.vue` (nouveau)
- `apps/web/src/components/admin/DatePeriodModal.vue` (nouveau)
- `apps/web/src/components/admin/YearSelector.vue` (nouveau)

**Layout proposé :**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ 📅 PLAGES DE DATES                                         │
│                                                             │
│ Année : [2024] [2025 ✓] [2026] [+ Année]                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 01/01 → 31/03  │ 🟢 Basse saison      │  80 € │ [✏️][🗑️]│ │
│ │ 01/04 → 30/06  │ 🟡 Moyenne saison    │ 120 € │ [✏️][🗑️]│ │
│ │ 01/07 → 15/08  │ 🟠 Haute saison      │ 150 € │ [✏️][🗑️]│ │
│ │ 16/08 → 31/08  │ 🔴 Très haute saison │ 180 € │ [✏️][🗑️]│ │
│ │ 01/09 → 31/10  │ 🟡 Moyenne saison    │ 120 € │ [✏️][🗑️]│ │
│ │ 01/11 → 31/12  │ 🟢 Basse saison      │  80 € │ [✏️][🗑️]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ Attention : 15 jours non couverts (01/04 - 15/04)       │
│                                                             │
│                                    [+ Ajouter une plage]    │
└─────────────────────────────────────────────────────────────┘
```

**Tâches :**

- [x] 4.1 ~~Créer `YearSelector.vue`~~ (intégré directement dans PricingView.vue)
- [x] 4.2 ~~Créer `DatePeriodCard.vue`~~ (intégré directement dans PricingView.vue)
- [x] 4.3 Créer `DatePeriodModal.vue` (création/édition)
  - Champs : date début, date fin, saison (select)
  - Validation : dates valides, pas de chevauchement
- [x] 4.4 Afficher les alertes :
  - Jours non couverts (trous)
  - Chevauchements détectés (côté API)
- [x] 4.5 Permettre d'ajouter une nouvelle année
- [x] 4.6 Copier les plages d'une année à l'autre

---

### Phase 5 : Génération PDF - Grille tarifaire

**Fichiers concernés :**
- `apps/web/src/services/pdf/pricingGridGenerator.ts` (nouveau)
- `apps/web/src/views/admin/PricingView.vue`

**Layout PDF proposé (1 page A4) :**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              🏠 MAISON DALHIAS 19                           │
│           Grille tarifaire 2025                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TARIFS PAR SAISON                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Saison            │ Période              │ Prix/nuit│   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Basse saison      │ 01/01 - 31/03        │   80 €   │   │
│  │                   │ 01/11 - 31/12        │          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Moyenne saison    │ 01/04 - 30/06        │  120 €   │   │
│  │                   │ 01/09 - 31/10        │          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Haute saison      │ 01/07 - 15/08        │  150 €   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Très haute saison │ 16/08 - 31/08        │  180 €   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  OPTIONS                                                    │
│  ─────────────────────────────────────────────────────────  │
│  • Ménage fin de séjour : 80 €                             │
│  • Linge de maison : 15 €/personne                         │
│  • Taxe de séjour : 1 €/nuit/adulte                        │
│  • Dépôt de garantie : 500 € (chèque non encaissé)         │
│                                                             │
│  INFORMATIONS                                               │
│  ─────────────────────────────────────────────────────────  │
│  • Séjour minimum : 3 nuits                                │
│  • Capacité : 6 personnes max                              │
│  • Acompte : 30% à la réservation                          │
│  • Solde : 15 jours avant l'arrivée                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📍 Village Le Rouret, 07120 Grospierres                   │
│  📞 +33 7 87 86 43 58                                      │
│  ✉️  dominguez-juan@orange.fr                               │
└─────────────────────────────────────────────────────────────┘
```

**Tâches :**

- [x] 5.1 Créer `pricingGridGenerator.ts` avec jsPDF
- [x] 5.2 Fonction `generatePricingGrid(year: number)`
- [x] 5.3 Récupérer les données (saisons + plages de l'année)
- [x] 5.4 Grouper les plages par saison pour l'affichage
- [x] 5.5 Ajouter le bouton "Générer grille tarifaire" dans PricingView
- [x] 5.6 Sélecteur d'année pour le PDF (utilise l'année sélectionnée)

---

### Phase 6 : Intégration finale et fallback

**Fichiers concernés :**
- `apps/web/src/views/admin/NewBookingView.vue`
- `apps/web/src/stores/newBookingForm.ts`
- `apps/web/src/lib/api.ts`

**Tâches :**

- [x] 6.1 Modifier le formulaire de réservation :
  - Appeler `/api/pricing/calculate` pour le prix suggéré
  - Afficher le détail si plusieurs plages
- [x] 6.2 Gérer le cas "aucune configuration" :
  - Afficher un message d'avertissement
  - Permettre la saisie manuelle du prix
  - Proposer de configurer les tarifs
- [x] 6.3 Supprimer les constantes de prix en dur :
  - `apps/web/src/stores/newBookingForm.ts` → `PRICE_PER_NIGHT_*`
  - Autres fichiers concernés
- [x] 6.4 Ajouter indicateur dans le dashboard si config manquante

---

## Cas particuliers à gérer

### 1. Réservation chevauchant plusieurs plages

```typescript
interface PriceCalculation {
  totalPrice: number;
  details: {
    startDate: string;
    endDate: string;
    nights: number;
    season: string;
    pricePerNight: number;
    subtotal: number;
  }[];
}

// Exemple de retour :
{
  totalPrice: 960,
  details: [
    { startDate: "2025-06-28", endDate: "2025-06-30", nights: 3, season: "Moyenne saison", pricePerNight: 120, subtotal: 360 },
    { startDate: "2025-07-01", endDate: "2025-07-04", nights: 4, season: "Haute saison", pricePerNight: 150, subtotal: 600 }
  ]
}
```

### 2. Aucune configuration

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Tarifs non configurés                                   │
│                                                             │
│ Aucune saison n'est configurée pour l'année 2025.          │
│ Le prix devra être saisi manuellement.                     │
│                                                             │
│ [Configurer les tarifs]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3. Date non couverte

Si une date de réservation n'est couverte par aucune plage :
- Utiliser le tarif par défaut (si configuré)
- Sinon, afficher un avertissement et demander saisie manuelle

### 4. Suppression d'une saison utilisée

Avant de supprimer une saison :
- Vérifier si des plages de dates y sont associées
- Afficher un avertissement : "X plages de dates seront supprimées"
- Demander confirmation

---

## Navigation admin mise à jour

```
┌─────────────────────┐
│ Maison Dalhias      │
│ Administration      │
├─────────────────────┤
│ 📅 Réservations     │
│ ✉️  Messages         │
│ 💰 Tarifs      ← NEW│
│ ➕ Nouveau          │
└─────────────────────┘
```

---

## Migration des données

### Données initiales (seed)

```typescript
// Saisons par défaut
const defaultSeasons = [
  { name: 'Basse saison', pricePerNight: 80, color: '#10B981', order: 1 },
  { name: 'Moyenne saison', pricePerNight: 120, color: '#F59E0B', order: 2 },
  { name: 'Haute saison', pricePerNight: 150, color: '#F97316', order: 3 },
  { name: 'Très haute saison', pricePerNight: 180, color: '#EF4444', order: 4 },
];

// Plages 2025 par défaut (basées sur l'existant)
const defaultPeriods2025 = [
  { start: '2025-01-01', end: '2025-03-31', season: 'Basse saison' },
  { start: '2025-04-01', end: '2025-06-30', season: 'Moyenne saison' },
  { start: '2025-07-01', end: '2025-08-15', season: 'Haute saison' },
  { start: '2025-08-16', end: '2025-08-31', season: 'Très haute saison' },
  { start: '2025-09-01', end: '2025-10-31', season: 'Moyenne saison' },
  { start: '2025-11-01', end: '2025-12-31', season: 'Basse saison' },
];
```

---

## Ordre d'exécution recommandé

1. **Phase 1** : Backend - Modèles et API (fondation)
2. **Phase 2** : Backend - Intégration (connecter à l'existant)
3. **Phase 3** : Frontend - Gestion des saisons
4. **Phase 4** : Frontend - Gestion des plages de dates
5. **Phase 5** : Génération PDF
6. **Phase 6** : Intégration finale et fallback

---

## Fichiers concernés (résumé)

| Fichier | Phases | Statut |
|---------|--------|--------|
| `prisma/schema.prisma` | 1, 2 | ✅ |
| `src/seasons/*` (API) | 1 | ✅ |
| `src/date-periods/*` (API) | 1 | ✅ |
| `src/pricing/*` (API) | 1, 2 | ✅ |
| `src/settings/*` (API) | 2 | ✅ |
| `src/bookings/bookings.service.ts` | 2 | ✅ |
| `views/admin/PricingView.vue` | 2, 3, 4, 5 | ✅ |
| ~~`components/admin/SeasonCard.vue`~~ | 3 | ❌ Supprimé (inline) |
| `components/admin/SeasonModal.vue` | 3 | ✅ |
| ~~`components/admin/DatePeriodCard.vue`~~ | 4 | ❌ Supprimé (inline) |
| `components/admin/DatePeriodModal.vue` | 4 | ✅ |
| ~~`components/admin/YearSelector.vue`~~ | 4 | ❌ Supprimé (inline) |
| `services/pdf/pricingGridGenerator.ts` | 5 | ✅ |
| `stores/newBookingForm.ts` | 6 | ✅ |
| `views/admin/NewBookingView.vue` | 6 | ✅ |
| `views/admin/BookingsView.vue` | 6 (indicateur config) | ✅ |
| `views/admin/AdminLayout.vue` | 3 (navigation) | ✅ |
| `lib/api.ts` | 2 | ✅ |

---

## Estimations

| Phase | Complexité | Statut |
|-------|------------|--------|
| Phase 1 | Moyenne | ✅ Terminé |
| Phase 2 | Moyenne | ✅ Terminé |
| Phase 3 | Faible | ✅ Terminé |
| Phase 4 | Moyenne | ✅ Terminé |
| Phase 5 | Faible | ✅ Terminé |
| Phase 6 | Moyenne | ✅ Terminé |

---

## Notes techniques

- Utiliser `Decimal` de Prisma pour les prix (précision monétaire)
- Validation des dates avec `class-validator` côté API
- Indexes sur `year` et `startDate/endDate` pour les performances
- Transaction lors de la suppression d'une saison (cascade)
- Cache possible pour les calculs de prix fréquents
