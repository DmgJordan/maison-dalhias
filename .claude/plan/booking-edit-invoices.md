# Plan - Modification des réservations et vérification facturation

## Objectif

1. **Modifier les réservations non confirmées** : Permettre la modification complète et intuitive des réservations en statut `PENDING`
2. **Vérifier la facturation** : S'assurer que la génération des factures utilise correctement la configuration des saisons (tarifs hebdomadaires, etc.)

---

## Contexte technique actuel

### État des lieux

| Fonctionnalité | État actuel |
|----------------|-------------|
| Modifier dates | ❌ Impossible |
| Modifier clients | ❌ Impossible |
| Modifier occupants | ❌ Impossible |
| Modifier options | ❌ Impossible |
| Modifier prix | ❌ Impossible |
| Confirmer/Annuler | ✅ Fonctionne |
| Supprimer | ✅ Fonctionne |

### Calcul des prix actuel

1. **À la création** : `PricingService.calculatePrice()` utilise la config saisons (weeklyNightRate, minNights)
2. **Stockage** : Seul `rentalPrice` (total) est stocké dans `Booking`
3. **Facture** : Utilise `booking.rentalPrice` + options hardcodées (80€ ménage, 15€/pers linge, 1€/jour taxe)

### Problème identifié

Les factures ne recalculent PAS le prix via la config saisons. Si on modifie les dates après création, le prix ne sera pas mis à jour automatiquement.

---

## Phases de développement

### Phase 1 : Backend - Endpoint de modification

**Fichiers concernés :**
- `apps/api/src/bookings/dto/update-booking.dto.ts` (nouveau)
- `apps/api/src/bookings/bookings.service.ts`
- `apps/api/src/bookings/bookings.controller.ts`

**Tâches :**

- [x] 1.1 Créer `UpdateBookingDto` avec tous les champs modifiables :
  ```typescript
  {
    startDate?: string;
    endDate?: string;
    primaryClient?: ClientDto;
    secondaryClient?: ClientDto;
    occupantsCount?: number;
    rentalPrice?: number;
    touristTaxIncluded?: boolean;
    cleaningIncluded?: boolean;
    linenIncluded?: boolean;
  }
  ```
- [x] 1.2 Ajouter méthode `update(id, dto)` dans `BookingsService` :
  - Vérifier que la réservation existe
  - Vérifier que le status est `PENDING` (sinon erreur 400)
  - Vérifier les conflits de dates si dates modifiées
  - Valider le minimum de nuits si dates modifiées
  - Mettre à jour les clients (upsert)
  - Mettre à jour la réservation
- [x] 1.3 Ajouter endpoint `PATCH /api/bookings/:id` dans le controller
- [ ] 1.4 Ajouter tests unitaires

**Validation :**
```typescript
// Seules les réservations PENDING peuvent être modifiées
if (booking.status !== 'PENDING') {
  throw new BadRequestException('Seules les réservations en attente peuvent être modifiées');
}
```

---

### Phase 2 : Backend - Recalcul automatique du prix

**Fichiers concernés :**
- `apps/api/src/bookings/bookings.service.ts`
- `apps/api/src/pricing/pricing.service.ts`

**Tâches :**

- [x] 2.1 Ajouter option `recalculatePrice` dans `UpdateBookingDto` :
  ```typescript
  recalculatePrice?: boolean; // Si true, recalcule via PricingService
  ```
- [x] 2.2 Si dates modifiées + `recalculatePrice: true` :
  - Appeler `PricingService.calculatePrice(newStartDate, newEndDate)`
  - Mettre à jour `rentalPrice` avec le nouveau total
  - Retourner le détail du calcul dans la réponse
- [x] 2.3 Ajouter endpoint `POST /api/bookings/:id/recalculate-price` :
  - Recalcule le prix selon les dates actuelles
  - Retourne le détail sans modifier la réservation
  - Utile pour prévisualisation

---

### Phase 3 : Frontend - Interface de modification

**Fichiers concernés :**
- `apps/web/src/views/admin/BookingDetailView.vue`
- `apps/web/src/components/admin/BookingEditModal.vue` (nouveau)
- `apps/web/src/lib/api.ts`

**Tâches :**

- [x] 3.1 Mettre à jour `api.ts` avec les nouveaux endpoints :
  ```typescript
  updateBooking(id: string, data: UpdateBookingData): Promise<Booking>
  recalculateBookingPrice(id: string): Promise<PriceCalculation>
  ```
- [x] 3.2 Créer `BookingEditModal.vue` avec édition par sections :
  - Section Dates (calendrier inline)
  - Section Client principal (formulaire)
  - Section Client secondaire (optionnel)
  - Section Occupants (compteur)
  - Section Options (toggles)
  - Section Prix (auto ou manuel)
- [x] 3.3 Ajouter bouton "Modifier" dans `BookingDetailView.vue` (visible si PENDING)
- [x] 3.4 Afficher les modifications en temps réel
- [x] 3.5 Recalcul automatique du prix si dates changées (avec confirmation)

**UX pour utilisateur senior :**

```
┌─────────────────────────────────────────────────────────────┐
│ Modifier la réservation                                 [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📅 DATES                                         [✏️]  │ │
│ │ Du 15/07/2025 au 22/07/2025 (7 nuits)                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👤 CLIENT PRINCIPAL                              [✏️]  │ │
│ │ Jean DUPONT                                            │ │
│ │ 12 rue de Paris, 75001 Paris                          │ │
│ │ 06 12 34 56 78                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👥 OCCUPANTS                                     [✏️]  │ │
│ │ 4 personnes (3 adultes, 1 enfant)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🧹 OPTIONS                                       [✏️]  │ │
│ │ ✅ Ménage fin de séjour (80 €)                        │ │
│ │ ✅ Linge de maison (60 €)                             │ │
│ │ ✅ Taxe de séjour (21 €)                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💰 TARIF                                         [✏️]  │ │
│ │ Location : 910 € (7 nuits × 130 €/nuit - tarif hebdo) │ │
│ │ ─────────────────────────────────────────────────────  │ │
│ │ TOTAL : 1 071 €                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    [Annuler]  [Enregistrer les modifications]│
└─────────────────────────────────────────────────────────────┘
```

**Comportement bouton [✏️] :**
- Clic → La section passe en mode édition
- Fond légèrement coloré pour indiquer l'édition
- Boutons "Annuler" et "OK" dans la section

---

### Phase 4 : Vérification facturation et configuration saisons

**Fichiers concernés :**
- `apps/web/src/services/pdf/invoiceGenerator.ts`
- `apps/web/src/views/admin/BookingDetailView.vue`

**Tâches :**

- [x] 4.1 Vérifier que `rentalPrice` de la réservation reflète bien le calcul PricingService :
  - Tracer le flux : création → stockage → facture
  - Vérifier que weeklyNightRate est appliqué pour réservations ≥7 nuits
- [x] 4.2 Ajouter affichage du détail tarifaire dans BookingDetailView :
  - Si la réservation chevauche plusieurs saisons, afficher le détail
  - Appeler `recalculateBookingPrice` pour obtenir le détail actuel
- [x] 4.3 Comparer prix stocké vs prix recalculé :
  - Si différence → afficher avertissement
  - Proposer de mettre à jour le prix
- [x] 4.4 Améliorer la facture PDF pour afficher le détail par saison (optionnel) :
  ```
  Location du 28 juin au 8 juillet :
    - 3 nuits Moyenne saison × 80€ = 240€
    - 7 nuits Haute saison × 120€ = 840€
  Sous-total location : 1 080€
  ```

**Tests de vérification :**

| Scénario | Attendu |
|----------|---------|
| Résa 5 nuits basse saison | Prix = 5 × pricePerNight |
| Résa 7 nuits haute saison | Prix = 7 × weeklyNightRate |
| Résa 10 nuits sur 2 saisons | Prix = somme (nuits × tarif/saison) |
| Modification dates après création | Prix recalculé correctement |

---

### Phase 5 : Tests et finalisation

**Tâches :**

- [ ] 5.1 Tester modification de chaque champ individuellement
- [ ] 5.2 Tester modification combinée (dates + occupants + options)
- [ ] 5.3 Tester recalcul automatique du prix
- [ ] 5.4 Tester génération facture après modification
- [ ] 5.5 Tester qu'une réservation CONFIRMED ne peut pas être modifiée
- [ ] 5.6 Vérifier l'affichage mobile du modal de modification

---

## Ordre d'exécution

1. **Phase 1** : Backend - Endpoint de modification (fondation)
2. **Phase 2** : Backend - Recalcul automatique du prix
3. **Phase 4** : Vérification facturation (peut être fait en parallèle)
4. **Phase 3** : Frontend - Interface de modification
5. **Phase 5** : Tests et finalisation

---

## Fichiers concernés (résumé)

| Fichier | Phase | Action |
|---------|-------|--------|
| `dto/update-booking.dto.ts` | 1 | Créer |
| `bookings.service.ts` | 1, 2 | Modifier |
| `bookings.controller.ts` | 1, 2 | Modifier |
| `lib/api.ts` | 3 | Modifier |
| `BookingDetailView.vue` | 3, 4 | Modifier |
| `BookingEditModal.vue` | 3 | Créer |
| `invoiceGenerator.ts` | 4 | Vérifier/Modifier |

---

## Règles métier importantes

1. **Seules les réservations PENDING peuvent être modifiées**
   - CONFIRMED et CANCELLED sont figées

2. **Modification des dates** :
   - Vérifier les conflits avec autres réservations
   - Respecter le minimum de nuits des saisons touchées
   - Proposer recalcul automatique du prix

3. **Modification du prix** :
   - Peut être saisi manuellement (override)
   - Ou recalculé automatiquement via config saisons

4. **Clients** :
   - Upsert : mise à jour si existe, création sinon
   - Client secondaire optionnel

---

## Notes UX pour utilisateur senior

- Gros boutons (min 48px)
- Textes explicites (pas d'icônes seules)
- Confirmation avant enregistrement
- Messages de succès/erreur clairs
- Pas de scroll horizontal
- Sections collapsibles pour ne pas surcharger

