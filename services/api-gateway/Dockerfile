# Build context is the repo root (npm workspaces need the whole monorepo to
# resolve deps against the single root lockfile) — see docker-compose.yml.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/api-gateway/package.json services/api-gateway/package.json
RUN npm ci --workspace=services/api-gateway --include-workspace-root --ignore-scripts

FROM deps AS build
COPY services/api-gateway services/api-gateway
RUN npm run build --workspace=services/api-gateway

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY services/api-gateway/package.json services/api-gateway/package.json
RUN npm ci --workspace=services/api-gateway --include-workspace-root --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
RUN addgroup -S rydtrip && adduser -S rydtrip -G rydtrip
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=rydtrip:rydtrip /app/node_modules ./node_modules
COPY --from=build --chown=rydtrip:rydtrip /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=build --chown=rydtrip:rydtrip /app/services/api-gateway/package.json ./services/api-gateway/package.json
USER rydtrip
WORKDIR /app/services/api-gateway
EXPOSE 3000
CMD ["node", "dist/main.js"]
