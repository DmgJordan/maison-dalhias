# Plan - Améliorations système de tarification

## Objectif

Améliorer le système de tarification existant avec :
1. **Tarif hebdomadaire** : tarif/nuit réduit pour les séjours ≥ 7 nuits
2. **Minimum de nuits par saison** : certaines saisons peuvent imposer 7 nuits minimum
3. **Refonte du PDF** : nouveau design inspiré du template fourni
4. **PricingSection dynamique** : connecter la page publique aux tarifs API

---

## Logique métier clarifiée

### Tarifs

| Durée réservation | Tarif appliqué |
|-------------------|----------------|
| < 7 nuits | `pricePerNight` (tarif standard) |
| ≥ 7 nuits | `weeklyNightRate` (tarif réduit par nuit) |

**Affichage PDF/Site :**
- Colonne "Tarif/Nuit" = `pricePerNight`
- Colonne "Tarif/Semaine" = `weeklyNightRate × 7`

**Exemple :**
- Basse saison : 90€/nuit, 80€/nuit (hebdo) → 560€/semaine
- Réservation 10 nuits = 10 × 80€ = 800€

### Chevauchement de saisons (≥ 7 nuits)

```
Réservation 10 nuits : 28 juin → 8 juillet
- 3 nuits en Moyenne saison (80€/nuit hebdo) = 240€
- 7 nuits en Haute saison (120€/nuit hebdo) = 840€
- Total = 1080€
```

Chaque nuit utilise le tarif hebdo de SA saison car durée totale ≥ 7 nuits.

### Minimum de nuits

- Chaque saison peut définir un `minNights` (défaut = 3, global)
- Si une réservation touche une saison avec min 7 nuits → la réservation entière doit être ≥ 7 nuits
- **Règle** : le minimum le plus restrictif parmi les saisons touchées s'applique

---

## Architecture

### Modifications du modèle Prisma

```prisma
model Season {
  id              String       @id @default(uuid())
  name            String       @unique
  pricePerNight   Decimal      @map("price_per_night") @db.Decimal(10, 2)
  weeklyNightRate Decimal?     @map("weekly_night_rate") @db.Decimal(10, 2) // Nouveau : tarif/nuit pour 7+ nuits
  minNights       Int          @default(3) @map("min_nights") // Nouveau : minimum de nuits
  color           String?
  order           Int          @default(0)
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")
  datePeriods     DatePeriod[]

  @@map("seasons")
}
```

### Nouveaux champs

| Champ | Type | Description |
|-------|------|-------------|
| `weeklyNightRate` | Decimal? | Tarif par nuit pour réservations ≥7 nuits. Si null, pas de réduction hebdo. |
| `minNights` | Int (default 3) | Minimum de nuits pour réserver dans cette saison |

---

## Phases de développement

### Phase 1 : Backend - Modification du modèle Season

**Fichiers concernés :**
- `apps/api/prisma/schema.prisma`
- `apps/api/src/seasons/dto/create-season.dto.ts`
- `apps/api/src/seasons/dto/update-season.dto.ts`

**Tâches :**

- [ ] 1.1 Ajouter `weeklyNightRate` et `minNights` au schéma Prisma
- [ ] 1.2 Générer et appliquer la migration (`npx prisma db push`)
- [ ] 1.3 Mettre à jour les DTOs avec validation :
  - `weeklyNightRate` : optionnel, doit être > 0 et ≤ pricePerNight
  - `minNights` : min 1, max 30, défaut 3
- [ ] 1.4 Mettre à jour le seed avec les données par défaut

**Migration des données existantes :**
```sql
-- Les saisons existantes gardent minNights = 3 (défaut)
-- weeklyNightRate sera NULL (pas de réduction hebdo configurée)
```

---

### Phase 2 : Backend - Modification du PricingService

**Fichiers concernés :**
- `apps/api/src/pricing/pricing.service.ts`
- `apps/api/src/pricing/dto/calculate-price.dto.ts`

**Tâches :**

- [ ] 2.1 Modifier `calculatePrice()` pour utiliser `weeklyNightRate` si durée ≥ 7 nuits
- [ ] 2.2 Ajouter la validation du minimum de nuits :
  - Récupérer toutes les saisons touchées par la réservation
  - Prendre le `minNights` le plus élevé
  - Retourner une erreur si durée < minimum
- [ ] 2.3 Ajouter le champ `minNightsRequired` dans la réponse
- [ ] 2.4 Ajouter un endpoint pour récupérer le minimum requis pour une période

**Nouvelle réponse de l'API :**
```typescript
interface PriceCalculation {
  totalPrice: number;
  nightsCount: number;
  isWeeklyRate: boolean; // true si ≥7 nuits
  minNightsRequired: number; // minimum parmi les saisons touchées
  details: {
    startDate: string;
    endDate: string;
    nights: number;
    season: string;
    pricePerNight: number; // standard ou weekly selon durée
    subtotal: number;
  }[];
}
```

---

### Phase 3 : Backend - Validation des réservations

**Fichiers concernés :**
- `apps/api/src/bookings/bookings.service.ts`
- `apps/api/src/bookings/dto/create-booking.dto.ts`

**Tâches :**

- [ ] 3.1 Modifier la validation de création de réservation :
  - Vérifier le minimum de nuits dynamique (plus seulement la constante globale)
  - Message d'erreur explicite : "Cette période nécessite un minimum de X nuits"
- [ ] 3.2 Modifier l'endpoint `/check-conflicts` pour retourner aussi le minimum requis

---

### Phase 4 : Frontend - Interface admin SeasonModal

**Fichiers concernés :**
- `apps/web/src/components/admin/SeasonModal.vue`
- `apps/web/src/views/admin/PricingView.vue`
- `apps/web/src/lib/api.ts`

**Tâches :**

- [ ] 4.1 Mettre à jour les types TypeScript (`Season`)
- [ ] 4.2 Modifier `SeasonModal.vue` :
  - Ajouter champ "Tarif/nuit (7+ nuits)" optionnel
  - Ajouter champ "Minimum de nuits" (select : 1, 2, 3, 7, 14)
  - Validation : tarif hebdo ≤ tarif standard
- [ ] 4.3 Modifier `PricingView.vue` :
  - Afficher le tarif hebdo et le minimum dans la liste des saisons
  - Afficher "560€/sem" à côté du tarif si weeklyNightRate configuré

**Maquette SeasonModal :**
```
┌─────────────────────────────────────────────────────┐
│ Modifier la saison                              [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Nom de la saison *                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Haute saison                                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Tarif par nuit *                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 150                                           € │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Tarif par nuit (7+ nuits)          ℹ️ Optionnel    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 130                                           € │ │
│ └─────────────────────────────────────────────────┘ │
│ → Soit 910€ par semaine                            │
│                                                     │
│ Minimum de nuits                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 7 nuits (semaine complète)                    ▼│ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
├─────────────────────────────────────────────────────┤
│                        [Annuler]  [Enregistrer]     │
└─────────────────────────────────────────────────────┘
```

---

### Phase 5 : Frontend - PricingSection dynamique

**Fichiers concernés :**
- `apps/web/src/components/PricingSection.vue`
- `apps/web/src/lib/api.ts`

**Tâches :**

- [ ] 5.1 Créer un endpoint API `/api/pricing/public-grid?year=2025` (non authentifié)
  - Retourne les saisons avec leurs périodes pour l'année demandée
  - Groupé par saison, trié par ordre
- [ ] 5.2 Modifier `PricingSection.vue` :
  - Appeler l'API au montage pour récupérer les tarifs de l'année en cours
  - Déterminer l'année : si on est avant le 1er avril, afficher l'année en cours, sinon l'année suivante aussi ?
  - Afficher les données dynamiques au lieu des constantes
  - Gérer le loading et les erreurs
- [ ] 5.3 Afficher les deux colonnes : Tarif/Nuit ET Tarif/Semaine
- [ ] 5.4 Indiquer le minimum de nuits par période si différent de 3

**Maquette mise à jour :**
```
┌───────────────────────────────────────────────────────────────┐
│                  Tarifs de la Maison Dalhia 19                │
│         Domaine du Rouret - Pierre & Vacances                 │
├───────────────────┬─────────────────┬───────────┬─────────────┤
│ Période           │ Dates           │ Prix/Nuit │ Prix/Semaine│
├───────────────────┼─────────────────┼───────────┼─────────────┤
│ Basse saison      │ 01/01 - 31/03   │    90€    │    560€     │
│                   │ 01/11 - 31/12   │           │             │
├───────────────────┼─────────────────┼───────────┼─────────────┤
│ Moyenne saison    │ 01/04 - 30/06   │   120€    │    770€     │
│                   │ 01/09 - 31/10   │           │             │
├───────────────────┼─────────────────┼───────────┼─────────────┤
│ Haute saison ⚠️   │ 01/07 - 15/08   │   150€    │    910€     │
│ (min. 7 nuits)    │                 │           │             │
├───────────────────┼─────────────────┼───────────┼─────────────┤
│ Très haute saison │ 16/08 - 31/08   │   180€    │   1120€     │
│ (min. 7 nuits)    │                 │           │             │
└───────────────────┴─────────────────┴───────────┴─────────────┘
```

---

### Phase 6 : Frontend - Refonte du PDF de tarification

**Fichiers concernés :**
- `apps/web/src/services/pdf/pricingGridGenerator.ts`

**Template de référence :** `apps/web/assets/templates/exemple fiche de tarification.PNG`

**Tâches :**

- [ ] 6.1 Refondre complètement le layout du PDF :
  - Titre : "GRILLE TARIFAIRE - LOCATION DE VACANCES [ANNÉE]"
  - Sous-titre : "Minimum X nuits de location" (ou dynamique par période)
  - Tableau avec colonnes : Période | tarif/Semaine | tarif/Nuit
- [ ] 6.2 Respecter le format du template :
  - Alignement des colonnes
  - Espacement des lignes
  - Police sobre et lisible
- [ ] 6.3 Section "Informations complémentaires" en bas :
  - Forfait ménage : 80€
  - Draps + Serviettes : 15€ par personne
  - Taxe de séjour : 1€ par personne et par jour
- [ ] 6.4 Retirer le QR code et le footer actuel (simplifier)

**Layout PDF cible :**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Le Rouret - Dalhias 19                        │
│              07120 Grospierres                              │
│                                                             │
│    GRILLE TARIFAIRE - LOCATION DE VACANCES 2025            │
│                                                             │
│              Minimum 2 nuits de location                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Période                      │ tarif/Semaine │ tarif/Nuit │
│  ─────────────────────────────┼───────────────┼────────────│
│  Du 26 Avril au 23 Mai        │     550€      │     90€    │
│  Du 03 Mai au 06 Juin         │     600€      │     -      │
│  Du 05 Juillet au 19 Juillet  │     1050€     │     150€   │
│  Du 19 Juillet au 02 Août     │     1050€     │     -      │
│  Du 02 Août au 23 Août        │     1120€     │     -      │
│  Du 23 Août au 30 Août        │     950€      │     -      │
│  Du 30 Août au 27 Septembre   │     650€      │     100€   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Informations complémentaires :                             │
│  • Forfait ménage : 80€                                    │
│  • Draps + Serviettes : 15€ par personne                   │
│  • Taxe de séjour : 1€ par personne et par jour            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note :** Dans le template original, certaines périodes n'ont pas de tarif/nuit (tiret), ce qui signifie réservation à la semaine obligatoire. C'est géré par `minNights = 7`.

---

### Phase 7 : Frontend - Validation formulaire réservation

**Fichiers concernés :**
- `apps/web/src/stores/newBookingForm.ts`
- `apps/web/src/views/admin/NewBookingView.vue`

**Tâches :**

- [ ] 7.1 Modifier le store pour récupérer le minimum requis via l'API
- [ ] 7.2 Afficher un message d'erreur si durée < minimum :
  "Cette période nécessite un minimum de 7 nuits (haute saison)"
- [ ] 7.3 Afficher le tarif appliqué (standard vs hebdo) dans le récapitulatif
- [ ] 7.4 Indiquer clairement si le tarif hebdomadaire est appliqué

---

## Ordre d'exécution

1. **Phase 1** : Backend - Modèle Season (fondation)
2. **Phase 2** : Backend - PricingService (logique de calcul)
3. **Phase 3** : Backend - Validation réservations
4. **Phase 4** : Frontend - Interface admin
5. **Phase 5** : Frontend - PricingSection publique
6. **Phase 6** : Frontend - Refonte PDF
7. **Phase 7** : Frontend - Validation formulaire réservation

---

## Cas particuliers à gérer

### 1. Période sans tarif hebdo configuré

Si `weeklyNightRate` est NULL :
- Toujours appliquer `pricePerNight`
- Sur le PDF, afficher "—" dans la colonne semaine
- Ou calculer automatiquement : semaine = nuit × 7

**Recommandation** : Calculer automatiquement `pricePerNight × 7` si pas de tarif hebdo.

### 2. Minimum 7 nuits sur certaines périodes seulement

Exemple : Haute saison (min 7) + Basse saison (min 3)
- Si réservation touche les deux → minimum = 7 nuits
- Message explicite à l'utilisateur

### 3. Saison sans période pour l'année

Si une saison existe mais n'a pas de `DatePeriod` pour 2025 :
- Ne pas l'afficher dans le PDF 2025
- Ne pas l'afficher dans PricingSection

### 4. Année à afficher sur le site public

**Logique proposée :**
- Afficher l'année en cours
- Si après le 1er octobre, proposer aussi l'année suivante
- Ou : afficher toutes les années configurées avec un sélecteur

---

## Résumé des fichiers modifiés

| Fichier | Phase | Action |
|---------|-------|--------|
| `prisma/schema.prisma` | 1 | Ajouter `weeklyNightRate`, `minNights` |
| `seasons/dto/*.dto.ts` | 1 | Mise à jour validation |
| `pricing/pricing.service.ts` | 2 | Logique tarif hebdo + min nuits |
| `bookings/bookings.service.ts` | 3 | Validation min nuits dynamique |
| `lib/api.ts` | 4, 5 | Types TypeScript |
| `SeasonModal.vue` | 4 | Nouveaux champs |
| `PricingView.vue` | 4 | Affichage tarifs |
| `PricingSection.vue` | 5 | Connexion API, affichage dynamique |
| `pricingGridGenerator.ts` | 6 | Refonte complète |
| `newBookingForm.ts` | 7 | Validation min nuits |
| `NewBookingView.vue` | 7 | Messages d'erreur |

---

## Tests à effectuer

- [ ] Réservation < 7 nuits → tarif standard
- [ ] Réservation ≥ 7 nuits → tarif hebdo
- [ ] Réservation chevauchant 2 saisons (≥7 nuits) → chaque nuit au bon tarif
- [ ] Réservation touchant une saison min 7 nuits avec durée 5 → erreur
- [ ] PDF avec périodes sans tarif hebdo → tiret ou calcul auto
- [ ] PricingSection affiche bien les tarifs de l'année en cours
- [ ] Formulaire admin permet de saisir/modifier weeklyNightRate et minNights
