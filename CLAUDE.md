# CLAUDE.md

Guide pour Claude Code lors du travail sur ce repository.

## Vue d'ensemble

Application web de location de vacances **"Maison Dalhias 19"** dans le Domaine du Rouret - Pierre & Vacances (Grospierres, Ardèche). Monorepo avec frontend Vue 3 et backend NestJS.

## Structure Monorepo

```
maison-dalhias/
├── apps/
│   ├── web/                    # Frontend Vue 3
│   │   ├── src/
│   │   │   ├── assets/         # Images, logos
│   │   │   ├── components/     # Composants Vue
│   │   │   ├── lib/
│   │   │   │   └── api.ts      # Client API Axios
│   │   │   ├── router/         # Vue Router
│   │   │   ├── stores/         # Pinia stores
│   │   │   └── views/          # Pages
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                    # Backend NestJS
│       ├── src/
│       │   ├── auth/           # Authentification JWT
│       │   ├── users/          # Gestion utilisateurs
│       │   ├── bookings/       # Réservations CRUD
│       │   ├── contacts/       # Messages contact
│       │   ├── email/          # Service Resend
│       │   └── prisma/         # Service Prisma
│       ├── prisma/
│       │   └── schema.prisma   # Schéma BDD
│       └── package.json
│
├── docker-compose.yml          # PostgreSQL + pgAdmin
└── package.json                # Root workspaces
```

## Commandes de développement

```bash
# Installation
npm install                     # Installer toutes les dépendances

# Docker (PostgreSQL)
docker-compose up -d            # Démarrer PostgreSQL et pgAdmin

# Base de données
npm run db:generate             # Générer le client Prisma
npm run db:migrate              # Appliquer les migrations
npm run db:push                 # Pousser le schéma sans migration
npm run db:studio               # Interface Prisma Studio

# Développement
npm run dev:web                 # Frontend (http://localhost:5173)
npm run dev:api                 # Backend (http://localhost:3000)

# Build
npm run build:web               # Build frontend
npm run build:api               # Build backend
npm run build                   # Build tout

# Qualité de code
npm run lint                    # Vérifier le linting ESLint
npm run lint:fix                # Corriger automatiquement les erreurs de lint
npm run format                  # Formater le code avec Prettier
npm run format:check            # Vérifier le formatage
npm run typecheck               # Vérifier les types TypeScript
npm run typecheck:web           # Vérifier les types du frontend
npm run typecheck:api           # Vérifier les types du backend
```

## Stack technique

| Catégorie | Technologies |
|-----------|-------------|
| **Frontend** | Vue 3.4 (Composition API), TypeScript 5.5, Vite 5.4 |
| **Styling** | Tailwind CSS 3.3, PostCSS, Autoprefixer |
| **Routing** | Vue Router 4.2 avec guards JWT |
| **State** | Pinia 2.1 |
| **HTTP Client** | Axios |
| **Backend** | NestJS 10, TypeScript |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT (passport-jwt, bcrypt) |
| **Email** | Resend API |
| **PDF** | jsPDF 2.5 |
| **QR Codes** | qrcode 1.5 |

## API Endpoints

### Auth `/api/auth`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/login` | Connexion | Non |
| POST | `/register` | Inscription | Non |
| GET | `/me` | Profil courant | JWT |
| POST | `/logout` | Déconnexion | JWT |

### Bookings `/api/bookings`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/` | Liste réservations | Non |
| GET | `/dates` | Dates réservées | Non |
| POST | `/` | Créer réservation | JWT |
| POST | `/check-conflicts` | Vérifier conflits | Non |
| PATCH | `/:id/confirm` | Confirmer | JWT+Admin |
| PATCH | `/:id/cancel` | Annuler | JWT+Admin |
| DELETE | `/:id` | Supprimer | JWT+Admin |

### Contacts `/api/contacts`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/` | Envoyer message | Non |
| GET | `/` | Liste messages | JWT |
| PATCH | `/:id/read` | Marquer lu | JWT |

## Schéma Prisma

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  role      Role      @default(USER)  // USER | ADMIN
  bookings  Booking[]
}

model Booking {
  id                String   @id @default(uuid())
  startDate         DateTime
  endDate           DateTime
  status            Status   @default(PENDING)  // PENDING | CONFIRMED | CANCELLED
  userId            String
  primaryClientId   String?
  secondaryClientId String?
  occupantsCount    Int      @default(1)
  rentalPrice       Decimal
  // ... options
}

model Client {
  id         String  @id @default(uuid())
  firstName  String
  lastName   String
  address    String
  city       String
  postalCode String
  country    String  @default("France")
  phone      String
}

model ContactForm {
  id      String  @id @default(uuid())
  name    String
  email   String
  phone   String?
  subject String
  message String
  status  String  @default("pending")  // pending | sent | read
}
```

## Standards de développement

### TypeScript

- **INTERDIT** : Utilisation de `any` - toujours typage fort et spécifique
- **OBLIGATOIRE** : Types de retour explicites sur toutes les fonctions
- **OBLIGATOIRE** : Types exportés depuis `apps/web/src/lib/api.ts`
- **OBLIGATOIRE** : DTOs avec class-validator dans le backend
- **OBLIGATOIRE** : Interfaces typées pour les requests authentifiées
- **RECOMMANDÉ** : Utiliser `??` au lieu de `||` pour les valeurs par défaut
- **RECOMMANDÉ** : Utiliser optional chaining `?.` quand approprié

### Qualité de code

Le projet utilise les outils suivants pour garantir la qualité :

| Outil | Description | Configuration |
|-------|-------------|---------------|
| **ESLint** | Linting TypeScript strict | `eslint.config.mjs` |
| **Prettier** | Formatage uniforme | `.prettierrc` |
| **Husky** | Git hooks pre-commit | `.husky/pre-commit` |
| **lint-staged** | Lint fichiers modifiés | `package.json` |

**Règles ESLint activées :**
- `@typescript-eslint/no-explicit-any` : Interdit `any`
- `@typescript-eslint/explicit-function-return-type` : Types de retour obligatoires
- `@typescript-eslint/no-floating-promises` : Promesses non gérées interdites
- `vue/component-api-style` : Script setup obligatoire
- `vue/define-props-declaration` : Props typées obligatoires

### Commits

Standard Conventional Commits :
- `feat:` - Nouvelles fonctionnalités
- `fix:` - Corrections de bugs
- `refactor:` - Refactorisation sans changement fonctionnel
- `docs:` - Documentation
- `style:` - Formatage, espaces
- `test:` - Tests
- `chore:` - Maintenance (dépendances, config)
- `perf:` - Améliorations de performance
- `ci:` - CI/CD

**Pre-commit hook** : À chaque commit, les fichiers modifiés sont automatiquement lintés et formatés.

## Configuration environnement

### `apps/api/.env`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maison_dalhias"
JWT_SECRET="secret-jwt-32-chars-minimum"
RESEND_API_KEY="re_xxx"
SENDER_EMAIL="contact@maison-dalhias.fr"
CONTACT_EMAIL="dominguez-juan@orange.fr"
CORS_ORIGIN="http://localhost:5173"
PORT=3000
```

### `apps/web/.env`
```env
VITE_API_URL="http://localhost:3000/api"
```

## Design system (Tailwind)

```javascript
// tailwind.config.js
colors: {
  primary: '#FF385C',    // Rouge principal
  secondary: '#E9C46A',  // Or/jaune
  dark: '#222222',       // Gris foncé
  accent: '#E76F51',     // Orange/terracotta
  background: '#F7F7F7', // Gris clair
  text: '#484848'        // Gris texte
}
```

## Fonctionnalités principales

### Page publique (HomeView)
1. Hero - Image de fond, CTAs
2. Infos - 39m², 6 personnes
3. Tarifs - 4 périodes (80€ à 180€/nuit)
4. Galerie - Photos avec lightbox
5. Activités - Vidéo Vimeo + images
6. Disponibilités - Calendrier interactif
7. Contact - Formulaire avec validation

### Dashboard admin (AdminView)
- Réservations : Liste, confirmation, suppression
- Messages : Non-lus/lus, marquage comme lu
- Export PDF : Affiche promotionnelle avec QR code

### Système de réservation
- Minimum 3 nuits
- Vérification conflits en temps réel
- Calcul automatique selon période tarifaire
- Options : ménage, linge, taxe séjour

## Informations propriété

```
Maison Dalhias 19
Domaine du Rouret - Pierre & Vacances
07120 GROSPIERRES, Ardèche
Tél: +33 7 87 86 43 58
Email: dominguez-juan@orange.fr
```

## Admin Dashboard - Refonte

### Plan de développement

Le plan détaillé de la refonte du dashboard admin est disponible dans :
**`.claude/plan/admin-refonte.md`**

### Objectif

Créer une interface **mobile-first** et **user-friendly** pour des utilisateurs seniors (60+ ans).

### Données métier clés

#### Bailleur (fixe)
- **Nom** : Dominguez Alvarez Christelle
- **Adresse** : 12 rue du grand clos, 54920 Villers la Montagne
- **IBAN** : FR76 1027 8043 1300 0477 8024 032 / BIC: CMCIFR2A

#### Logement (fixe)
- **Type** : Maison mitoyenne 3 pièces duplex avec terrasse (39 m²)
- **Adresse** : Village Le Rouret, 675 route du château du rouret, 07120 Grospierres
- **Capacité** : 6 personnes max, 2 chambres

#### Tarifs options
| Option | Tarif |
|--------|-------|
| Ménage fin de séjour | 80 € |
| Linge de maison | 15 €/personne |
| Taxe de séjour | 1 €/jour/adulte |
| Dépôt de garantie | 500 € (fixe) |
| Acompte | 30% du total |
| Solde | 15 jours avant arrivée |

### Principes UI/UX

1. Gros boutons (min 48px) avec texte explicite
2. Navigation 3 onglets max
3. Cartes visuelles (pas de tableaux)
4. Feedback clair après chaque action
5. Maximum 2 actions principales par écran

### Templates PDF

Les modèles de contrat et facture sont dans :
- `apps/web/assets/templates/model_contrat_location.pdf`
- `apps/web/assets/templates/model_faccture.pdf`
