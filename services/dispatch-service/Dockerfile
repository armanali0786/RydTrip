# Build context is the repo root (npm workspaces need the whole monorepo to
# resolve deps against the single root lockfile) — see docker-compose.yml.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/circuit-breaker/package.json libraries/circuit-breaker/package.json
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY libraries/redis-client/package.json libraries/redis-client/package.json
COPY services/dispatch-service/package.json services/dispatch-service/package.json
RUN npm ci --workspace=libraries/circuit-breaker --workspace=libraries/event-schema --workspace=libraries/observability --workspace=libraries/redis-client --workspace=services/dispatch-service --include-workspace-root --ignore-scripts

FROM deps AS build
COPY libraries/circuit-breaker libraries/circuit-breaker
COPY libraries/event-schema libraries/event-schema
COPY libraries/observability libraries/observability
COPY libraries/redis-client libraries/redis-client
COPY services/dispatch-service services/dispatch-service
RUN npm run build --workspace=libraries/circuit-breaker \
 && npm run build --workspace=libraries/event-schema \
 && npm run build --workspace=libraries/observability \
 && npm run build --workspace=libraries/redis-client \
 && npm run build --workspace=services/dispatch-service

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/circuit-breaker/package.json libraries/circuit-breaker/package.json
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY libraries/observability/package.json libraries/observability/package.json
COPY libraries/redis-client/package.json libraries/redis-client/package.json
COPY services/dispatch-service/package.json services/dispatch-service/package.json
RUN npm ci --workspace=libraries/circuit-breaker --workspace=libraries/event-schema --workspace=libraries/observability --workspace=libraries/redis-client --workspace=services/dispatch-service --include-workspace-root --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
RUN addgroup -S rydtrip && adduser -S rydtrip -G rydtrip
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=rydtrip:rydtrip /app/node_modules ./node_modules
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/circuit-breaker/dist ./libraries/circuit-breaker/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/circuit-breaker/package.json ./libraries/circuit-breaker/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/dist ./libraries/event-schema/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/event-schema/package.json ./libraries/event-schema/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/dist ./libraries/observability/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/observability/package.json ./libraries/observability/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/redis-client/dist ./libraries/redis-client/dist
COPY --from=build --chown=rydtrip:rydtrip /app/libraries/redis-client/package.json ./libraries/redis-client/package.json
COPY --from=build --chown=rydtrip:rydtrip /app/services/dispatch-service/dist ./services/dispatch-service/dist
COPY --from=build --chown=rydtrip:rydtrip /app/services/dispatch-service/package.json ./services/dispatch-service/package.json
USER rydtrip
WORKDIR /app/services/dispatch-service
EXPOSE 3005
CMD ["npm", "run", "start:prod"]
