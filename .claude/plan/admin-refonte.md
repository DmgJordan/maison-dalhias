# Plan de refonte - Admin Dashboard

## Vision

Refondre l'interface admin de Maison Dalhias pour qu'elle soit **user-friendly pour des utilisateurs seniors (60+ ans, non tech-savvy)**. L'interface doit être **mobile-first**, intuitive, avec des boutons larges et du texte explicite.

---

## Données métier extraites des PDFs

### Bailleur (données fixes)

| Champ | Valeur |
|-------|--------|
| Nom | Dominguez Alvarez Christelle |
| Adresse | 12 rue du grand clos, 54920 Villers la Montagne |
| Date de naissance | 22/07/1969 |
| Téléphone | +33 7 87 86 43 58 |
| Email | dominguez-juan@orange.fr |
| IBAN | FR76 1027 8043 1300 0477 8024 032 |
| BIC | CMCIFR2A |

### Logement (données fixes)

| Champ | Valeur |
|-------|--------|
| Type | Maison mitoyenne 3 pièces duplex avec terrasse |
| Surface | 39 m² |
| Chambres | 2 |
| Pièces principales | 3 |
| Adresse | Village Le Rouret, 675 route du château du rouret, 07120 Grospierres |
| Capacité max | 6 personnes |
| Site web | https://maison-dalhias.fr |

### Preneur (données à saisir)

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Nom complet | Texte (peut être un couple : "Nom1 et Nom2") | Oui |
| Adresse (rue) | Texte | Oui |
| Code postal | Texte (5 chiffres) | Oui |
| Ville | Texte | Oui |
| Téléphone | Texte (format +33...) | Oui |
| Email | Email | Oui |

### Réservation (données à saisir)

| Champ | Type | Défaut | Notes |
|-------|------|--------|-------|
| Date début | Date | - | - |
| Heure arrivée | Heure | 16:00 | Check-in |
| Date fin | Date | - | - |
| Heure départ | Heure | 11:00 | Check-out |
| Nombre d'occupants | Nombre (1-6) | 1 | Max 6 |
| Nombre d'adultes | Nombre | - | Pour taxe séjour |
| Prix location de base | Montant (€) | Calculé | Selon période |

### Options et tarifs

| Option | Tarif | Notes |
|--------|-------|-------|
| Ménage fin de séjour | 80 € | Fixe (sauf coin cuisine) |
| Linge de maison | 15 €/personne | Lit + serviettes |
| Taxe de séjour | 1 €/jour/adulte | Mineurs exemptés |

### Paiements

| Type | Calcul | Échéance |
|------|--------|----------|
| Acompte | 30% du total | À la réservation |
| Solde | 70% du total | 15 jours avant arrivée |
| Dépôt de garantie | 500 € (fixe) | Avec le solde (chèque non encaissé) |

### Facture

| Champ | Source |
|-------|--------|
| Numéro de facture | Auto-incrémenté (ex: 003) |
| Date | Date de création |
| Client (nom, adresse) | Depuis preneur |
| Ligne : Location | "location du [date début] au [date fin]" + montant |
| Ligne : Ménage | 80 € ou 0 si non inclus |
| Ligne : Linge | 15€ x nb personnes ou 0 si non inclus |
| Ligne : Taxe séjour | 1€ x nb adultes x nb jours |
| Total HT | Somme des lignes |
| Conditions | Acompte 30%, Solde 15j avant, Caution 500€ |

---

## Principes UI/UX

### Cible utilisateur
- Personnes 60+ ans
- Non familières avec la technologie
- Utilisation principale sur mobile (375px)

### Règles de design

1. **Mobile-first** : Conception pour écran 375px, puis adaptation tablette/desktop
2. **Gros boutons** : Minimum 48px de hauteur, texte explicite (pas d'icônes seules)
3. **Navigation simple** : Maximum 3 onglets principaux
4. **Feedback clair** : Message de confirmation après chaque action ("Réservation confirmée !")
5. **Cartes visuelles** : Préférer les cartes aux tableaux pour afficher les données
6. **Actions limitées** : Maximum 2 actions principales par écran
7. **Couleurs du design system** : primary (#FF385C), secondary (#E9C46A), etc.
8. **Texte lisible** : Taille minimum 16px, contraste élevé
9. **Espacement généreux** : Padding/margin confortables pour éviter les erreurs de clic

---

## Tâches par phase

### Phase 1 : Layout et navigation

- [ ] 1.1 Créer le composant `AdminLayout.vue` avec navigation bottom-tab mobile
- [ ] 1.2 Définir 3 onglets : "Réservations", "Messages", "Nouveau"
- [ ] 1.3 Ajouter header avec titre de page et bouton retour si nécessaire
- [ ] 1.4 Implémenter la navigation entre onglets
- [ ] 1.5 Adapter pour tablette/desktop (sidebar au lieu de bottom-tab)

### Phase 2 : Onglet Réservations

- [ ] 2.1 Créer le composant `BookingCard.vue` (carte visuelle pour une réservation)
- [ ] 2.2 Afficher : dates, nom client, statut (badge coloré), montant
- [ ] 2.3 Créer la liste scrollable des réservations avec filtres simples (À venir / Passées)
- [ ] 2.4 Implémenter l'écran de détail d'une réservation
- [ ] 2.5 Ajouter boutons d'action : "Confirmer", "Annuler", "Générer PDF"
- [ ] 2.6 Implémenter la modal de confirmation pour actions destructives
- [ ] 2.7 Ajouter feedback visuel après chaque action

### Phase 3 : Onglet Messages

- [ ] 3.1 Créer le composant `MessageCard.vue` (carte pour un message)
- [ ] 3.2 Afficher : nom expéditeur, sujet, date, indicateur non-lu
- [ ] 3.3 Créer la liste avec séparation Non-lus / Lus
- [ ] 3.4 Implémenter l'écran de lecture d'un message
- [ ] 3.5 Ajouter bouton "Marquer comme lu" avec feedback
- [ ] 3.6 Afficher badge de compteur non-lus sur l'onglet

### Phase 4 : Onglet Nouvelle réservation

- [ ] 4.1 Créer le formulaire multi-étapes (wizard)
- [ ] 4.2 **Étape 1 - Dates** : Sélection dates début/fin avec calendrier visuel
- [ ] 4.3 **Étape 2 - Client** : Formulaire preneur (nom, adresse, téléphone, email)
- [ ] 4.4 **Étape 3 - Détails** : Nombre d'occupants, adultes/mineurs
- [ ] 4.5 **Étape 4 - Options** : Checkboxes pour ménage, linge
- [ ] 4.6 **Étape 5 - Tarif** : Prix de base (suggéré selon période), calcul automatique total
- [ ] 4.7 **Étape 6 - Récapitulatif** : Résumé complet avant validation
- [ ] 4.8 Implémenter la navigation entre étapes (précédent/suivant)
- [ ] 4.9 Ajouter indicateur de progression visuel
- [ ] 4.10 Validation des champs à chaque étape
- [ ] 4.11 Créer la réservation en BDD après confirmation
- [ ] 4.12 Bloquer automatiquement les dates dans le calendrier public

### Phase 5 : Génération PDF

- [ ] 5.1 Créer le service de génération de contrat PDF
- [ ] 5.2 Implémenter le template contrat avec données dynamiques
- [ ] 5.3 Créer le service de génération de facture PDF
- [ ] 5.4 Implémenter le template facture avec numérotation auto
- [ ] 5.5 Ajouter boutons "Télécharger contrat" et "Télécharger facture" dans le détail réservation
- [ ] 5.6 Tester le rendu sur mobile (téléchargement/aperçu)

### Phase 6 : Finitions

- [ ] 6.1 Ajouter les états de chargement (spinners)
- [ ] 6.2 Ajouter les messages d'erreur explicites
- [ ] 6.3 Tester l'accessibilité (taille des zones cliquables, contrastes)
- [ ] 6.4 Tester sur différents appareils mobiles
- [ ] 6.5 Optimiser les performances (lazy loading si nécessaire)

---

## Structure de fichiers prévue

```
apps/web/src/
├── views/
│   └── admin/
│       ├── AdminLayout.vue          # Layout avec navigation
│       ├── BookingsView.vue         # Liste réservations
│       ├── BookingDetailView.vue    # Détail d'une réservation
│       ├── MessagesView.vue         # Liste messages
│       ├── MessageDetailView.vue    # Lecture d'un message
│       └── NewBookingView.vue       # Formulaire nouvelle réservation
├── components/
│   └── admin/
│       ├── BookingCard.vue          # Carte réservation
│       ├── MessageCard.vue          # Carte message
│       ├── StatusBadge.vue          # Badge de statut
│       ├── ActionButton.vue         # Bouton d'action large
│       ├── ConfirmModal.vue         # Modal de confirmation
│       ├── StepIndicator.vue        # Indicateur d'étape wizard
│       └── DateRangePicker.vue      # Sélecteur de dates
└── services/
    └── pdf/
        ├── contractGenerator.ts     # Génération contrat
        └── invoiceGenerator.ts      # Génération facture
```

---

## API à ajouter/modifier

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/bookings/manual` | Créer réservation manuelle (sans user) |
| GET | `/api/invoices/next-number` | Obtenir prochain numéro facture |
| GET | `/api/bookings/:id/contract-data` | Données pour génération contrat |
| GET | `/api/bookings/:id/invoice-data` | Données pour génération facture |

---

## Dépendances à vérifier

- `jsPDF` : Déjà installé, à utiliser pour la génération PDF
- Calendrier : Vérifier si un composant existe déjà ou en ajouter un simple

---

## Notes techniques

1. **Formulaire wizard** : Utiliser un store Pinia temporaire pour conserver les données entre étapes
2. **PDF** : Génération côté client avec jsPDF pour éviter la charge serveur
3. **Numéro facture** : Stocker en BDD pour persistance et unicité
4. **Dates bloquées** : La création d'une réservation manuelle doit automatiquement bloquer les dates
