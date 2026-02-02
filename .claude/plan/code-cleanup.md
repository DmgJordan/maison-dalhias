# Plan de nettoyage - Code obsolète

## Objectif

Supprimer le code mort, obsolète et dupliqué suite à la refonte admin. Ce plan identifie les fichiers et le code à nettoyer pour maintenir une codebase propre et maintenable.

---

## Analyse effectuée

- Date : 2 février 2025
- Contexte : Post-refonte admin dashboard (phases 1-6 complétées)
- Méthode : Analyse statique des imports, routes et appels API

---

## Tâches par priorité

### Phase 1 : Suppression fichiers obsolètes (Haute priorité) ✅ TERMINÉE

- [x] 1.1 Supprimer `apps/web/src/views/AdminView.vue`
  - Raison : Ancienne version monolithique remplacée par l'architecture modulaire
  - Remplacé par : AdminLayout.vue + BookingsView.vue + MessagesView.vue + NewBookingView.vue + BookingDetailView.vue
  - Vérification : Aucune route ne pointe vers ce fichier
  - Impact : Aucun - fichier orphelin

- [x] 1.2 Supprimer `apps/web/src/stores/booking.ts`
  - Raison : Store Pinia jamais utilisé
  - Remplacé par : État local dans les views + newBookingForm.ts pour le wizard
  - Vérification : Aucun import de `useBookingStore` dans le codebase
  - Impact : Aucun - fichier orphelin

- [x] 1.3 Supprimer `apps/web/assets/templates/maison-dalhias-19-presentation.pdf`
  - Raison : Fichier PDF généré précédemment, non utilisé (le PDF est généré dynamiquement)
  - Taille : 7.4 MB (poids inutile dans le repo)
  - Impact : Aucun - fichier statique non référencé

---

### Phase 2 : Nettoyage API client (Moyenne priorité) ✅ TERMINÉE

- [x] 2.1 Supprimer `authApi.register()` dans `apps/web/src/lib/api.ts`
  - Raison : Endpoint défini mais jamais appelé depuis le frontend
  - Décision : Supprimé (pas de page d'inscription prévue)

- [x] 2.2 Supprimer `authApi.me()` dans `apps/web/src/lib/api.ts`
  - Raison : Endpoint défini mais jamais appelé depuis le frontend
  - Décision : Supprimé (profil récupéré au login via localStorage)

---

### Phase 3 : Centralisation des constantes (Moyenne priorité) ✅ TERMINÉE

- [x] 3.1 Créer `apps/web/src/constants/property.ts` pour centraliser les données métier
  - Déplacer depuis : AdminView.vue (lignes 21-72), posterGenerator.ts (lignes 6-23)
  - Contenu à centraliser :
    - `BAILLEUR` (nom, adresse, contact)
    - `LOGEMENT` (type, surface, capacité)
    - `TARIFS` (ménage, linge, taxe séjour, caution)
    - `pricingPeriods` (périodes tarifaires)
    - `amenities` (services inclus)
    - `accommodationDetails` (détails hébergement)

- [x] 3.2 Mettre à jour les imports dans les fichiers concernés
  - `posterGenerator.ts` : Importer depuis constants
  - `PricingSection.vue` : Importer depuis constants
  - `AvailabilitySection.vue` : Importer depuis constants
  - `invoiceGenerator.ts` : Importer depuis constants
  - `contractGenerator.ts` : Importer depuis constants

---

### Phase 4 : Nettoyage backend (Basse priorité) ✅ TERMINÉE

- [x] 4.1 Supprimer `POST /auth/register`
  - Supprimé : auth.controller.ts, auth.service.ts, register.dto.ts
  - Décision : Pas de page d'inscription prévue

- [x] 4.2 Supprimer `GET /auth/me`
  - Supprimé : auth.controller.ts
  - Décision : Profil récupéré au login via localStorage

- [x] 4.3 Conserver `POST /auth/logout`
  - Gardé tel quel : retourne un message de confirmation
  - Le frontend gère la suppression du localStorage

---

### Phase 5 : Nettoyage divers (Basse priorité) ✅ TERMINÉE

- [x] 5.1 Vérifier et supprimer les imports non utilisés
  - Commande exécutée : `npm run lint:fix`
  - Résultat : Aucun import non utilisé détecté

- [x] 5.2 Fichiers de configuration
  - `.claude/plan/admin-refonte.md` : Conservé pour référence historique

- [x] 5.3 Supprimer le dossier `supabase/`
  - Contenu supprimé : 8 migrations SQL + 1 edge function
  - Raison : Ancien backend remplacé par NestJS + Prisma

---

## Fichiers concernés - Récapitulatif

### À supprimer

| Fichier | Taille | Raison |
|---------|--------|--------|
| `apps/web/src/views/AdminView.vue` | ~15 KB | Remplacé par architecture modulaire |
| `apps/web/src/stores/booking.ts` | ~1.2 KB | Store non utilisé |
| `apps/web/assets/templates/maison-dalhias-19-presentation.pdf` | 7.4 MB | PDF généré dynamiquement |

### À modifier

| Fichier | Modification |
|---------|--------------|
| `apps/web/src/lib/api.ts` | Supprimer authApi.register et authApi.me |
| `apps/web/src/services/pdf/posterGenerator.ts` | Importer constantes depuis fichier centralisé |
| `apps/web/src/services/pdf/invoiceGenerator.ts` | Importer constantes depuis fichier centralisé |
| `apps/web/src/services/pdf/contractGenerator.ts` | Importer constantes depuis fichier centralisé |

### À créer

| Fichier | Contenu |
|---------|---------|
| `apps/web/src/constants/property.ts` | Constantes métier centralisées |

---

## Ordre d'exécution recommandé

1. **Phase 1** : Suppression des fichiers obsolètes (impact nul, nettoyage simple)
2. **Phase 3** : Centralisation des constantes (améliore la maintenabilité)
3. **Phase 2** : Nettoyage API client (dépend de la décision sur les fonctionnalités futures)
4. **Phase 5** : Nettoyage divers (peut être fait à tout moment)
5. **Phase 4** : Nettoyage backend (nécessite une décision sur les fonctionnalités auth)

---

## Estimation

| Phase | Complexité | Risque |
|-------|------------|--------|
| Phase 1 | Faible | Nul |
| Phase 2 | Faible | Faible |
| Phase 3 | Moyenne | Faible |
| Phase 4 | Moyenne | Moyen (nécessite tests) |
| Phase 5 | Faible | Nul |

---

## Notes

- Avant suppression, vérifier une dernière fois que les fichiers ne sont pas importés
- Faire un commit séparé pour chaque phase pour faciliter le rollback si nécessaire
- Exécuter les tests après chaque phase (quand ils existeront)
