# Build context is the repo root (npm workspaces need the whole monorepo to
# resolve deps against the single root lockfile) — see docker-compose.yml.

FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY services/driver-service/package.json services/driver-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=libraries/observability --workspace=services/driver-service --include-workspace-root --ignore-scripts

FROM deps AS build
COPY libraries/event-schema libraries/event-schema
COPY libraries/observability libraries/observability
COPY services/driver-service services/driver-service
RUN npm run build --workspace=libraries/event-schema \
 && npm run build --workspace=libraries/observability \
 && npm run build --workspace=services/driver-service

FROM node:22-alpine AS prod-deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY services/driver-service/package.json services/driver-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=libraries/observability --workspace=services/driver-service --include-workspace-root --omit=dev --ignore-scripts
COPY services/driver-service/prisma services/driver-service/prisma
RUN npx prisma generate --schema=services/driver-service/prisma/schema.prisma

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl \
 && addgroup -S rydtrip && adduser -S rydtrip -G rydtrip
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=rydtrip:rydtrip /app/node_modules ./node_modules
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/dist ./libraries/event-schema/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/package.json ./libraries/event-schema/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/dist ./libraries/observability/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/package.json ./libraries/observability/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/services/driver-service/dist ./services/driver-service/dist
COPY --from=build --chown=rydtrip:rydtrip /app/services/driver-service/package.json ./services/driver-service/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/services/driver-service/prisma ./services/driver-service/prisma
COPY --from=build --chown=rydtrip:rydtrip /app/services/driver-service/prisma-client ./services/driver-service/prisma-client
USER rydtrip
WORKDIR /app/services/driver-service
EXPOSE 3002
CMD ["npm", "run", "start:prod"]
