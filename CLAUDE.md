# CLAUDE.md

Guide pour Claude Code lors du travail sur ce repository.

## Vue d'ensemble

Application web de location de vacances **"Maison Dalhias 19"** dans le Domaine du Rouret - Pierre & Vacances (Grospierres, Ardèche). Monorepo avec frontend Vue 3 et backend NestJS.

## Déploiement & Infrastructure

| Service | Plateforme | Branche |
|---------|-----------|---------|
| **Frontend** | Cloudflare Pages | `main` |
| **Backend API** | Railway | `main` |
| **Base de données** | Neon (PostgreSQL) | - |

### Stratégie de branches

- **`main`** : Production - déployé automatiquement sur Cloudflare Pages + Railway
- **`dev`** : Développement - tests en local uniquement, merge vers `main` pour déployer
- **`feat/*`, `fix/*`** : Branches de travail créées depuis `dev`, mergées dans `dev`

### Dockerfile (Backend)

Build multi-stage avec `node:20-slim`. Prisma génère le client avec `binaryTargets = ["native", "debian-openssl-3.0.x"]`. Point d'entrée : `node apps/api/dist/src/main.js`, port 3000.

## Structure Monorepo

```
maison-dalhias/
├── apps/
│   ├── web/                    # Frontend Vue 3
│   │   ├── src/
│   │   │   ├── assets/         # Images, logos
│   │   │   ├── components/     # Composants Vue
│   │   │   ├── constants/      # Constantes métier (property.ts, pricing.ts)
│   │   │   ├── lib/
│   │   │   │   └── api.ts      # Client API Axios (intercepteurs JWT + 401)
│   │   │   ├── router/         # Vue Router (guards meta.requiresAuth)
│   │   │   ├── services/pdf/   # Générateurs PDF (contrat, facture, affiche, grille)
│   │   │   ├── stores/         # Pinia stores (newBookingForm: wizard 6 étapes)
│   │   │   ├── utils/          # Utilitaires (formatting.ts : dates, prix)
│   │   │   └── views/          # Pages (HomeView, LoginView, AdminView)
│   │   ├── package.json
│   │   └── vite.config.ts      # Alias @ → ./src
│   │
│   └── api/                    # Backend NestJS
│       ├── src/
│       │   ├── auth/           # Authentification JWT (guards: jwt-auth, admin)
│       │   ├── users/          # Gestion utilisateurs
│       │   ├── bookings/       # Réservations CRUD + calcul prix
│       │   ├── contacts/       # Messages contact + envoi email
│       │   ├── email/          # Service Resend
│       │   ├── seasons/        # Saisons tarifaires dynamiques
│       │   ├── date-periods/   # Périodes par année (copie entre années)
│       │   ├── pricing/        # Calcul prix (tarifs hebdo, jours non couverts)
│       │   ├── settings/       # Configuration globale (prix par défaut)
│       │   └── prisma/         # Service Prisma
│       ├── prisma/
│       │   ├── schema.prisma   # Schéma BDD (7 modèles)
│       │   └── seed.ts         # Seed admin + saisons par défaut
│       └── package.json
│
├── docker-compose.yml          # PostgreSQL 16 + pgAdmin (dev local)
├── Dockerfile                  # Build multi-stage backend (Railway)
├── eslint.config.mjs           # ESLint strict TS + Vue
├── .prettierrc                 # Semi, single quotes, width 100
└── package.json                # Root workspaces (Node >=18)
```

## Commandes de développement

```bash
# Installation
npm install                     # Installer toutes les dépendances

# Docker (PostgreSQL local)
docker-compose up -d            # Démarrer PostgreSQL et pgAdmin

# Base de données
npm run db:generate             # Générer le client Prisma
npm run db:migrate              # Appliquer les migrations
npm run db:push                 # Pousser le schéma sans migration
npm run db:studio               # Interface Prisma Studio
npm run db:seed                 # Seeder admin + saisons par défaut

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
| **Styling** | Tailwind CSS 3.3, PostCSS, Autoprefixer, police "Circular" |
| **Routing** | Vue Router 4.2 avec guards JWT + lazy loading admin |
| **State** | Pinia 2.1, @vueuse/core 10.7 |
| **HTTP Client** | Axios (intercepteurs Bearer token + redirect 401) |
| **Backend** | NestJS 10, TypeScript, ValidationPipe global (whitelist + transform) |
| **ORM** | Prisma 5 (binaryTargets: native + debian-openssl-3.0.x) |
| **Database** | PostgreSQL 16 (Neon en prod, Docker en local) |
| **Auth** | JWT (passport-jwt, bcrypt), guards: JwtAuthGuard + AdminGuard |
| **Email** | Resend API |
| **PDF** | jsPDF 2.5 (contrat, facture, affiche, grille tarifaire) |
| **QR Codes** | qrcode 1.5 |

## API Endpoints

Préfixe global : `/api` (configuré dans `main.ts`). CORS activé avec `CORS_ORIGIN`.

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
| POST | `/recalculate-price` | Recalculer le prix | JWT |
| PATCH | `/:id` | Modifier réservation | JWT+Admin |
| PATCH | `/:id/confirm` | Confirmer | JWT+Admin |
| PATCH | `/:id/cancel` | Annuler | JWT+Admin |
| DELETE | `/:id` | Supprimer | JWT+Admin |

### Contacts `/api/contacts`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/` | Envoyer message | Non |
| GET | `/` | Liste messages | JWT |
| PATCH | `/:id/read` | Marquer lu | JWT |

### Seasons `/api/seasons`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/` | Liste saisons | Non |
| POST | `/` | Créer saison | JWT+Admin |
| PATCH | `/:id` | Modifier saison | JWT+Admin |
| DELETE | `/:id` | Supprimer saison | JWT+Admin |

### Date Periods `/api/date-periods`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/` | Liste périodes (filtre ?year=) | Non |
| GET | `/years` | Années disponibles | Non |
| POST | `/` | Créer période | JWT+Admin |
| POST | `/copy` | Copier périodes d'une année | JWT+Admin |
| PATCH | `/:id` | Modifier période | JWT+Admin |
| DELETE | `/:id` | Supprimer période | JWT+Admin |

### Pricing `/api/pricing`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/calculate` | Calculer prix d'un séjour | Non |
| GET | `/grid` | Grille tarifaire publique | Non |
| GET | `/min-nights` | Nuits minimum par saison | Non |

### Settings `/api/settings`
| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/` | Configuration globale | JWT+Admin |
| PATCH | `/` | Modifier configuration | JWT+Admin |

## Schéma Prisma

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  role      Role      @default(USER)  // USER | ADMIN
  createdAt DateTime  @default(now())
  bookings  Booking[]
}

model Booking {
  id                   String   @id @default(uuid())
  startDate            DateTime
  endDate              DateTime
  status               Status   @default(PENDING)  // PENDING | CONFIRMED | CANCELLED
  userId               String
  primaryClientId      String?
  secondaryClientId    String?
  occupantsCount       Int      @default(1)
  rentalPrice          Decimal  @db.Decimal(10, 2)
  touristTaxIncluded   Boolean  @default(false)
  cleaningIncluded     Boolean  @default(false)
  linenIncluded        Boolean  @default(false)
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

model Season {
  id              String       @id @default(uuid())
  name            String       @unique
  pricePerNight   Decimal      @db.Decimal(10, 2)
  weeklyNightRate Decimal?     @db.Decimal(10, 2)
  minNights       Int          @default(3)
  color           String?
  order           Int          @default(0)
  datePeriods     DatePeriod[]
}

model DatePeriod {
  id        String   @id @default(uuid())
  startDate DateTime
  endDate   DateTime
  year      Int
  seasonId  String
  season    Season   @relation(onDelete: Cascade)
  @@index([year])
  @@index([startDate, endDate])
}

model Settings {
  id                   String  @id @default("default")
  defaultPricePerNight Decimal @default(100) @db.Decimal(10, 2)
}
```

## Architecture frontend

### Client API (`apps/web/src/lib/api.ts`)
- Intercepteur request : injecte le Bearer token depuis `localStorage`
- Intercepteur response : sur 401, supprime le token et redirige vers `/login`
- 21+ opérations organisées par domaine (auth, bookings, contacts, seasons, datePeriods, pricing, settings)

### Store Pinia (`apps/web/src/stores/newBookingForm.ts`)
Wizard de réservation en **6 étapes** : Dates → Client → Occupants → Options → Tarification → Récapitulatif. Getters calculés pour nightsCount, cleaningPrice, linenPrice, touristTaxPrice, totalPrice, depositAmount (30%), balanceAmount. Validation par étape (isStep1Valid → isStep5Valid).

### Utilitaires (`apps/web/src/utils/formatting.ts`)
Fonctions de formatage : `formatPrice`, `formatDateShort`, `formatDateFr`, `formatDateLong`, `formatDateMedium`, `formatDateNumeric`, `formatDateForInput`, `countNights`, `countDays`, `isDateInRange`, `normalizeToMidnight`.

### Constantes métier (`apps/web/src/constants/`)
- `property.ts` : Données bailleur, logement, tarifs, équipements, couleurs PDF
- `pricing.ts` : Prix par saison (fallback), options (ménage 80€, linge 15€/pers, taxe séjour 0,80€/nuit, dépôt 500€), contraintes (min 3 nuits, max 6 occupants)

### Services PDF (`apps/web/src/services/pdf/`)
Générateurs : `contractGenerator.ts`, `invoiceGenerator.ts`, `posterGenerator.ts`, `pricingGridGenerator.ts`, `fontLoader.ts`.

### Routes (`apps/web/src/router/`)
- `/` : HomeView (page publique)
- `/login` : LoginView
- `/admin` : AdminView (lazy-loaded, `meta.requiresAuth`)
  - `/admin/reservations` : Liste des réservations
  - `/admin/reservations/:id` : Détail réservation
  - `/admin/messages` : Messages de contact
  - `/admin/nouveau` : Nouvelle réservation (wizard)
  - `/admin/tarifs` : Gestion saisons + périodes

## Architecture backend

### Configuration globale (`apps/api/src/main.ts`)
- Préfixe global : `/api`
- CORS : configurable via `CORS_ORIGIN`
- ValidationPipe global : `whitelist`, `forbidNonWhitelisted`, `transform`

### Guards d'authentification
- **JwtAuthGuard** (`auth/guards/jwt-auth.guard.ts`) : Vérifie le token Bearer JWT
- **AdminGuard** (`auth/guards/admin.guard.ts`) : Vérifie `user.role === 'ADMIN'`, renvoie `ForbiddenException`

### Seed (`apps/api/prisma/seed.ts`)
- Crée un admin : `admin@maison-dalhias.fr` (mot de passe via `ADMIN_SEED_PASSWORD` ou "admin123")
- Crée les settings par défaut (100€/nuit)
- Crée 4 saisons : Basse (80€), Moyenne (120€), Haute (150€), Très haute (180€) avec tarifs hebdo
- Seed les périodes pour 2025

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

| Outil | Description | Configuration |
|-------|-------------|---------------|
| **ESLint** | Linting TypeScript strict | `eslint.config.mjs` |
| **Prettier** | Semi, single quotes, tab 2, trailing comma es5, width 100 | `.prettierrc` |
| **Husky** | Git hooks pre-commit (`npx lint-staged`) | `.husky/pre-commit` |
| **lint-staged** | `.{ts,vue}` → eslint --fix + prettier, `.{js,json}` → prettier | `package.json` |

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
ADMIN_SEED_PASSWORD="admin123"
```

### `apps/web/.env`
```env
VITE_API_URL="http://localhost:3000/api"
```

## Design system (Tailwind)

```javascript
// tailwind.config.js
fontFamily: { sans: ['Circular', ...systemFonts] }
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
3. Tarifs - 4 périodes (80€ à 180€/nuit) + tarifs hebdo
4. Galerie - Photos avec lightbox
5. Activités - Vidéo Vimeo + images
6. Disponibilités - Calendrier interactif
7. Contact - Formulaire avec validation

### Dashboard admin (AdminView)
- Réservations : Liste, confirmation, édition, suppression
- Messages : Non-lus/lus, marquage comme lu
- Nouvelle réservation : Wizard 6 étapes
- Gestion tarifs : Saisons + périodes par année (copie entre années)
- Export PDF : Contrat, facture, affiche promotionnelle avec QR code, grille tarifaire

### Système de réservation
- Minimum 3 nuits (configurable par saison, 7 pour haute/très haute)
- Vérification conflits en temps réel
- Calcul automatique selon période tarifaire (tarifs nuit + hebdo)
- Options : ménage (80€), linge (15€/pers), taxe séjour (0,80€/nuit/adulte)
- Acompte 30%, solde 15 jours avant arrivée, dépôt garantie 500€

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
| Taxe de séjour | 0,80 €/jour/adulte |
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
