# --- Étape 1 : compilation TypeScript -----------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copier les manifestes seuls d'abord : tant que package-lock.json ne change
# pas, Docker réutilise le cache de cette couche et saute le npm ci.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Étape 2 : dépendances de production uniquement ---------------------
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Étape 3 : image finale ---------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# L'image node fournit déjà un utilisateur non-root `node`.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node sql ./sql

USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
