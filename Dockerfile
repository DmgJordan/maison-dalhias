FROM node:20-slim AS builder

WORKDIR /app

# Copier tout le code source
COPY . .

# Installer les dépendances sans husky
RUN npm pkg delete scripts.prepare && npm ci

# Générer Prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

# Builder l'API explicitement
RUN cd apps/api && npx nest build

# Vérifier que le build a fonctionné
RUN ls -la apps/api/dist/

# --- Image de production ---
FROM node:20-slim

WORKDIR /app

# OpenSSL nécessaire pour Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copier package.json et installer uniquement les deps de production
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# Copier le build et Prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

# Appliquer les migrations Prisma puis démarrer l'API
CMD npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js
