# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Application web de location de vacances "Maison Dalhias 19" dans le Domaine du Rouret - Pierre & Vacances. Il s'agit d'une SPA Vue 3 avec TypeScript utilisant Vite comme bundler et Supabase comme backend.

## Development Commands

```bash
# Démarrer le serveur de développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser le build de production
npm run preview
```

## Tech Stack & Architecture

- **Frontend**: Vue 3 avec Composition API, TypeScript, Vite
- **Styling**: Tailwind CSS avec PostCSS
- **Routing**: Vue Router avec guards d'authentification
- **State Management**: Pinia pour la gestion d'état
- **Backend**: Supabase (authentification, base de données, edge functions)
- **PDF**: jsPDF pour génération de documents
- **QR Codes**: bibliothèque qrcode
- **Images**: Sharp pour optimisation

## Architecture Structure

### Frontend Structure
- `src/views/` - Pages principales (Home, Admin, Login)
- `src/components/` - Composants organisés par type :
  - `src/components/modals/` - **OBLIGATOIRE** : Toutes les modales doivent être dans ce dossier
  - `src/components/` - Sections et composants réutilisables (Gallery, Pricing, Availability, Contact, etc.)
- `src/types/` - **OBLIGATOIRE** : Types TypeScript centralisés et isolés
  - `src/types/index.ts` - Point d'entrée pour tous les types
  - Fichiers de types séparés par domaine (client.ts, booking.ts, etc.)
- `src/stores/` - Stores Pinia pour la gestion d'état (booking.ts)
- `src/lib/` - Utilitaires et configuration (supabase.ts)
- `src/router/` - Configuration des routes avec authentification

### Backend (Supabase)
- `supabase/functions/` - Edge functions (ex: send-contact-email)
- `supabase/migrations/` - Migrations de base de données

## Standards de Développement

### Typage TypeScript
- **INTERDIT** : Utilisation du type `any` - toujours utiliser un typage fort et spécifique
- **OBLIGATOIRE** : Tous les types doivent être définis dans `src/types/` et importés via `src/types/index.ts`
- **OBLIGATOIRE** : Séparer les types par domaine métier (un fichier par entité)
- **OBLIGATOIRE** : Définir des interfaces spécifiques pour la création vs lecture (ex: `CreateClientData` vs `Client`)

### Organisation des Composants
- **OBLIGATOIRE** : Les modales doivent être dans `src/components/modals/`
- **INTERDIT** : Mélanger les modales avec les sections dans le dossier racine `components/`
- **CONVENTION** : Nommage en PascalCase pour tous les composants Vue
- **STRUCTURE** : Séparer clairement les responsabilités (UI, logique métier, types)

## Key Features

1. **Système de réservation** - Vérification des disponibilités et réservations
2. **Galerie d'images** - Affichage des photos avec thumbnails optimisés
3. **Authentification** - Login admin avec protection des routes
4. **Contact** - Formulaire de contact avec envoi d'email via edge function
5. **Tarification** - Section pricing dynamique
6. **Responsive design** - Interface mobile-first avec Tailwind

## Environment Setup

Variables d'environnement requises :
- `VITE_SUPABASE_URL` - URL du projet Supabase
- `VITE_SUPABASE_ANON_KEY` - Clé anonyme Supabase

## Supabase Integration

Le projet dispose d'un accès complet aux fonctionnalités Supabase via le MCP (Model Context Protocol) configuré dans Claude Code.

### Fonctionnalités Supabase disponibles :
- **Gestion de projet** : Création, pause, restauration de projets
- **Branches de développement** : Création, fusion, reset, rebase des branches
- **Base de données** : Exécution de requêtes SQL, migrations, gestion des tables
- **Authentification** : Gestion des utilisateurs et sessions
- **Edge Functions** : Déploiement et gestion des fonctions
- **Documentation** : Recherche dans la documentation Supabase
- **Monitoring** : Logs, advisors de sécurité et performance
- **Types TypeScript** : Génération automatique des types depuis le schéma DB

## Special Notes

- Les images sont organisées avec thumbnails WebP pour l'optimisation
- Build configuré avec chunking optimisé pour les assets (js, css, images)
- Navigation avec scroll behavior smooth et hash support