# Plan d'amélioration UX/UI Desktop - Admin

## Objectif

Optimiser l'expérience desktop des pages admin tout en conservant la version mobile intacte. L'approche est "desktop-enhanced" : améliorer l'utilisation de l'espace sur grands écrans sans casser le responsive mobile existant.

---

## Analyse des problèmes actuels

### Problèmes identifiés sur desktop (≥768px)

| Page | Problème | Impact |
|------|----------|--------|
| BookingsView | `max-width: 600px` - Contenu centré étroit | Espace gaspillé, peu de réservations visibles |
| MessagesView | `max-width: 600px` - Même problème | Espace gaspillé |
| BookingDetailView | Layout linéaire | Informations éparpillées, scroll excessif |
| NewBookingView | Wizard vertical | Étapes difficiles à visualiser |
| AdminLayout | Sidebar 240px basique | Pas d'infos contextuelles |

### Ce qui fonctionne bien (à conserver)

- ✅ Navigation mobile (bottom tabs)
- ✅ Header mobile avec actions
- ✅ Cartes responsive (BookingCard, MessageCard)
- ✅ Sidebar desktop basique
- ✅ Toasts et feedbacks

---

## Plan de développement

### Phase 1 : BookingsView - Layout en grille (Priorité haute)

**Objectif** : Afficher les réservations en grille sur desktop (2-3 colonnes)

**Fichier** : `apps/web/src/views/admin/BookingsView.vue`

**Modifications** :
```css
/* Mobile : liste verticale (inchangé) */
.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Desktop : grille responsive */
@media (min-width: 768px) {
  .bookings-view {
    max-width: 100%; /* Retirer la limite 600px */
  }

  .bookings-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1200px) {
  .bookings-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Tâches** :
- [ ] 1.1 Retirer `max-width: 600px` sur desktop
- [ ] 1.2 Ajouter grid layout 2 colonnes (≥768px)
- [ ] 1.3 Ajouter grid layout 3 colonnes (≥1200px)
- [ ] 1.4 Améliorer la barre de filtres (plus large, avec compteur)
- [ ] 1.5 Ajouter un header de section avec statistiques rapides

---

### Phase 2 : MessagesView - Layout en grille (Priorité haute)

**Objectif** : Afficher les messages en grille sur desktop

**Fichier** : `apps/web/src/views/admin/MessagesView.vue`

**Modifications** :
- Retirer `max-width: 600px` sur desktop
- Grille 2 colonnes pour les messages
- Section "Non lus" mise en avant avec compteur visible

**Tâches** :
- [ ] 2.1 Retirer `max-width: 600px` sur desktop
- [ ] 2.2 Ajouter grid layout 2 colonnes (≥768px)
- [ ] 2.3 Améliorer les titres de sections (plus visibles)

---

### Phase 3 : BookingDetailView - Layout 2 colonnes (Priorité moyenne)

**Objectif** : Afficher les informations sur 2 colonnes pour réduire le scroll

**Fichier** : `apps/web/src/views/admin/BookingDetailView.vue`

**Layout proposé desktop** :
```
┌─────────────────────────────────────────────────────┐
│ [← Retour]           Réservation #123               │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│  📅 SÉJOUR               │  💰 TARIFICATION         │
│  ─────────────           │  ──────────────          │
│  Arrivée: 15 juil 2025   │  Location: 540 €         │
│  Départ: 22 juil 2025    │  Ménage: 80 €            │
│  7 nuits                 │  Linge: 30 €             │
│                          │  Taxe séjour: 14 €       │
│  👤 CLIENT               │  ─────────────           │
│  ─────────               │  TOTAL: 664 €            │
│  Jean Dupont             │                          │
│  12 rue de Paris         │  Acompte (30%): 199 €    │
│  75001 Paris             │  Solde: 465 €            │
│  +33 6 12 34 56 78       │  Échéance: 1 juil 2025   │
│                          │                          │
├──────────────────────────┴──────────────────────────┤
│                                                     │
│  [Générer contrat]  [Générer facture]              │
│                                                     │
│  [Confirmer]  [Annuler]  [Supprimer]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tâches** :
- [ ] 3.1 Créer layout 2 colonnes pour desktop (≥1024px)
- [ ] 3.2 Colonne gauche : Séjour + Client
- [ ] 3.3 Colonne droite : Tarification + Paiement
- [ ] 3.4 Actions groupées en bas (sticky sur desktop)
- [ ] 3.5 Retirer `max-width` sur desktop

---

### Phase 4 : NewBookingView - Wizard amélioré (Priorité moyenne)

**Objectif** : Afficher les étapes du wizard de manière plus compacte sur desktop

**Fichier** : `apps/web/src/views/admin/NewBookingView.vue`

**Layout proposé desktop** :
```
┌─────────────────────────────────────────────────────┐
│ Nouvelle réservation                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ① Dates  →  ② Client  →  ③ Occupants  →  ...     │
│  ═══════                                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│           ┌─────────────────────────┐              │
│           │                         │              │
│           │   [Contenu de l'étape]  │              │
│           │                         │              │
│           └─────────────────────────┘              │
│                                                     │
│           [Précédent]    [Suivant]                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tâches** :
- [ ] 4.1 Ajouter un stepper horizontal visible sur desktop
- [ ] 4.2 Centrer le contenu avec largeur max 800px
- [ ] 4.3 Afficher le récapitulatif en sidebar (≥1200px)

---

### Phase 5 : AdminLayout - Sidebar enrichie (Priorité basse)

**Objectif** : Ajouter des informations contextuelles dans la sidebar

**Fichier** : `apps/web/src/views/admin/AdminLayout.vue`

**Améliorations** :
- Ajouter un mini-dashboard dans la sidebar :
  - Réservations à venir (nombre)
  - Messages non lus (déjà fait)
  - Prochaine arrivée (date)
- Largeur sidebar : 280px sur grands écrans

**Tâches** :
- [ ] 5.1 Augmenter largeur sidebar à 280px (≥1200px)
- [ ] 5.2 Ajouter section "Aperçu rapide" avec stats
- [ ] 5.3 Afficher la prochaine arrivée

---

### Phase 6 : Composants - Optimisations desktop (Priorité basse)

**Fichiers** :
- `apps/web/src/components/admin/BookingCard.vue`
- `apps/web/src/components/admin/MessageCard.vue`

**Améliorations** :
- BookingCard : Afficher plus d'infos inline sur desktop (client, prix)
- MessageCard : Afficher aperçu plus long sur desktop

**Tâches** :
- [ ] 6.1 BookingCard - Afficher nom client sur desktop
- [ ] 6.2 BookingCard - Afficher prix total visible
- [ ] 6.3 MessageCard - Aperçu 200 caractères sur desktop

---

## Breakpoints utilisés

| Breakpoint | Usage |
|------------|-------|
| < 768px | Mobile (inchangé) |
| ≥ 768px | Tablet/Desktop - Grilles 2 colonnes |
| ≥ 1024px | Desktop - Layouts 2 colonnes |
| ≥ 1200px | Large Desktop - Grilles 3 colonnes, sidebar élargie |

---

## Ordre d'exécution recommandé

1. **Phase 1** : BookingsView (impact visuel immédiat)
2. **Phase 2** : MessagesView (cohérence avec Phase 1)
3. **Phase 3** : BookingDetailView (amélioration UX significative)
4. **Phase 4** : NewBookingView (wizard amélioré)
5. **Phase 5** : AdminLayout (enrichissement)
6. **Phase 6** : Composants (polish final)

---

## Fichiers concernés

| Fichier | Phases |
|---------|--------|
| `views/admin/BookingsView.vue` | 1 |
| `views/admin/MessagesView.vue` | 2 |
| `views/admin/BookingDetailView.vue` | 3 |
| `views/admin/NewBookingView.vue` | 4 |
| `views/admin/AdminLayout.vue` | 5 |
| `components/admin/BookingCard.vue` | 6 |
| `components/admin/MessageCard.vue` | 6 |

---

## Principes de design

1. **Mobile-first préservé** : Toutes les modifications sont dans des media queries
2. **Pas de breaking changes** : Le mobile reste identique
3. **Utilisation de l'espace** : Grilles et colonnes pour exploiter la largeur
4. **Cohérence** : Mêmes patterns sur toutes les pages
5. **Performance** : Pas de nouveaux composants, juste du CSS

---

## Notes techniques

- Utiliser CSS Grid pour les layouts en grille
- Utiliser Flexbox pour les layouts en colonnes
- Éviter les largeurs fixes, préférer `max-width` avec `width: 100%`
- Tester sur Chrome, Firefox, Safari
- Vérifier le comportement entre 768px et 1024px (zone de transition)
