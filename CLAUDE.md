# CLAUDE.md

Guide pour Claude Code lors du travail sur ce repository.

## Vue d'ensemble

Application web de location de vacances **"Maison Dalhias 19"** dans le Domaine du Rouret - Pierre & Vacances (Grospierres, Ardèche). SPA Vue 3 avec TypeScript, Vite comme bundler et Supabase comme backend.

## Commandes de développement

```bash
npm run dev      # Serveur de développement (http://localhost:5173)
npm run build    # Build production (type-check + optimisation)
npm run preview  # Prévisualiser le build de production
```

## Stack technique

| Catégorie | Technologies |
|-----------|-------------|
| **Frontend** | Vue 3.4 (Composition API), TypeScript 5.5, Vite 5.4 |
| **Styling** | Tailwind CSS 3.3, PostCSS, Autoprefixer |
| **Routing** | Vue Router 4.2 avec guards d'authentification |
| **State** | Pinia 2.1 |
| **Backend** | Supabase (Auth, PostgreSQL, Edge Functions, RLS) |
| **PDF** | jsPDF 2.5 |
| **QR Codes** | qrcode 1.5 |
| **Utilitaires** | @vueuse/core 10.7, Sharp 0.33 (optimisation images) |

## Structure du projet

```
src/
├── assets/                    # Ressources statiques
│   ├── branding/             # Logos (pierre-vacance.png)
│   ├── gallery/              # Photos propriété
│   │   ├── sources/          # Images haute résolution (PNG, JPG)
│   │   └── thumbnails/       # Miniatures optimisées WebP
│   └── hero/                 # Images hero (homepage.webp)
├── components/                # Composants Vue
│   ├── modals/               # OBLIGATOIRE : Toutes les modales ici
│   │   └── BookingModal.vue  # Formulaire création réservation
│   ├── ActivitySection.vue   # Activités du domaine
│   ├── AvailabilitySection.vue # Calendrier et disponibilités
│   ├── ContactSection.vue    # Formulaire de contact
│   ├── GallerySection.vue    # Galerie avec lightbox
│   ├── NavBar.vue            # Navigation responsive
│   └── PricingSection.vue    # Tarifs par période
├── lib/
│   └── supabase.ts           # Client Supabase initialisé
├── router/
│   └── index.ts              # Routes avec meta.requiresAuth
├── stores/
│   └── booking.ts            # Store Pinia central
├── types/                     # OBLIGATOIRE : Types centralisés
│   ├── index.ts              # Point d'entrée exports
│   ├── availability.ts       # Availability, CalendarDay
│   ├── booking.ts            # Booking, CreateBookingData
│   ├── client.ts             # Client, CreateClientData
│   └── property.ts           # Property
├── views/
│   ├── AdminView.vue         # Dashboard admin (réservations, messages)
│   ├── HomeView.vue          # Page d'accueil (toutes sections)
│   └── LoginView.vue         # Connexion admin
├── App.vue                    # Composant racine
├── main.ts                    # Point d'entrée
└── style.css                  # Styles globaux Tailwind

supabase/
├── functions/
│   └── send-contact-email/   # Edge Function envoi email (Resend API)
│       └── index.ts
└── migrations/                # Migrations SQL chronologiques
    └── *.sql                  # 9 migrations (2025-04-08 à 2025-08-23)
```

## Standards de développement

### TypeScript

- **INTERDIT** : Utilisation de `any` - toujours typage fort et spécifique
- **OBLIGATOIRE** : Types dans `src/types/`, importés via `src/types/index.ts`
- **OBLIGATOIRE** : Fichiers séparés par domaine (client.ts, booking.ts, etc.)
- **OBLIGATOIRE** : Interfaces distinctes création vs lecture (`CreateClientData` vs `Client`)

### Organisation des composants

- **OBLIGATOIRE** : Modales dans `src/components/modals/`
- **INTERDIT** : Mélanger modales et sections dans le dossier racine
- **CONVENTION** : Nommage PascalCase pour tous les composants Vue

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

## Schéma base de données

### Tables principales

```sql
-- clients (gestion locataires)
clients (
  id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  country text DEFAULT 'France',
  phone text NOT NULL,
  created_at timestamptz
)

-- bookings (réservations)
bookings (
  id uuid PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text ('pending' | 'confirmed' | 'cancelled'),
  user_id uuid REFERENCES auth.users,
  primary_client_id uuid REFERENCES clients,
  secondary_client_id uuid REFERENCES clients,
  occupants_count integer DEFAULT 1,
  rental_price decimal(10,2) DEFAULT 0,
  tourist_tax_included boolean DEFAULT false,
  cleaning_included boolean DEFAULT false,
  linen_included boolean DEFAULT false,
  created_at timestamptz
)

-- contact_forms (messages contact)
contact_forms (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text ('pending' | 'sent' | 'read'),
  created_at timestamptz
)

-- availability (disponibilités calendrier)
availability (
  id uuid PRIMARY KEY,
  date date NOT NULL,
  available boolean NOT NULL,
  created_at timestamptz
)
```

### Fonctions RPC

- `check_booking_conflicts(p_start_date, p_end_date, p_booking_id?)` - Vérifie chevauchements réservations
- `confirm_booking(booking_id)` - Confirme une réservation (SECURITY DEFINER)

### Row Level Security

Toutes les tables ont RLS activé :
- `clients` / `bookings` : Authenticated users can manage all
- `contact_forms` : Public insert, Authenticated read

## Fonctionnalités principales

### Page publique (HomeView)

1. **Hero** - Image de fond, CTAs réservation/photos
2. **Infos** - 39m², 6 personnes, 3 lits
3. **Tarifs** - 4 périodes (80€ à 180€/nuit)
4. **Galerie** - 10 photos avec lightbox
5. **Activités** - Vidéo Vimeo + images Pierre & Vacances
6. **Disponibilités** - Calendrier interactif, calcul prix automatique
7. **Contact** - Formulaire avec validation

### Dashboard admin (AdminView)

- **Onglet Réservations** : Liste, confirmation, suppression, ajout via modal
- **Onglet Messages** : Non-lus/lus, marquage comme lu
- **Export PDF** : Affiche promotionnelle avec QR code

### Système de réservation

- Minimum 3 nuits
- Vérification conflits en temps réel (RPC)
- Calcul automatique selon période tarifaire
- Gestion client primaire + secondaire
- Options : ménage (80€), linge (15€/pers), taxe séjour (1€/pers/jour)

## Configuration environnement

Variables requises dans `.env` :

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SENDER_EMAIL=contact@maison-dalhias.fr
```

Edge Function (secrets Supabase) :
- `RESEND_API_KEY` - Clé API Resend pour envoi emails

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

Classes CSS utilitaires définies dans `style.css` :
- `.btn-primary` / `.btn-secondary` - Boutons
- `.container-custom` - Container responsive
- `.card` - Carte avec ombre hover
- `.input-field` - Champs de formulaire
- `.section-title` / `.section-subtitle` - Titres

## Optimisations

- **Images** : Thumbnails WebP, lazy loading, sources haute résolution pour lightbox
- **Build** : Chunking optimisé (js/, css/, img/)
- **Scroll** : Smooth behavior avec support hash

## Intégration Supabase MCP

Accès complet aux fonctionnalités Supabase via MCP :
- Gestion projet (création, pause, restauration)
- Branches de développement
- Exécution SQL et migrations
- Edge Functions
- Logs et advisors (sécurité, performance)
- Génération types TypeScript

## Informations propriété

```
Maison Dalhias 19
Domaine du Rouret - Pierre & Vacances
07120 GROSPIERRES, Ardèche
Tél: +33 7 87 86 43 58
Email: dominguez-juan@orange.fr
```
