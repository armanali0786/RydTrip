# Build context is the repo root (npm workspaces need the whole monorepo to
# resolve deps against the single root lockfile) — see docker-compose.yml.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY libraries/redis-client/package.json libraries/redis-client/package.json
COPY services/location-service/package.json services/location-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=libraries/observability --workspace=libraries/redis-client --workspace=services/location-service --include-workspace-root --ignore-scripts

FROM deps AS build
COPY libraries/event-schema libraries/event-schema
COPY libraries/observability libraries/observability
COPY libraries/redis-client libraries/redis-client
COPY services/location-service services/location-service
RUN npm run build --workspace=libraries/event-schema \
 && npm run build --workspace=libraries/observability \
 && npm run build --workspace=libraries/redis-client \
 && npm run build --workspace=services/location-service

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY libraries/redis-client/package.json libraries/redis-client/package.json
COPY services/location-service/package.json services/location-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=libraries/observability --workspace=libraries/redis-client --workspace=services/location-service --include-workspace-root --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
RUN addgroup -S rydtrip && adduser -S rydtrip -G rydtrip
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=rydtrip:rydtrip /app/node_modules ./node_modules
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/dist ./libraries/event-schema/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/package.json ./libraries/event-schema/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/dist ./libraries/observability/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/package.json ./libraries/observability/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/redis-client/dist ./libraries/redis-client/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/redis-client/package.json ./libraries/redis-client/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/services/location-service/dist ./services/location-service/dist
COPY --from=build --chown=rydtrip:rydtrip /app/services/location-service/package.json ./services/location-service/package.json
USER rydtrip
WORKDIR /app/services/location-service
EXPOSE 3004
CMD ["npm", "run", "start:prod"]
