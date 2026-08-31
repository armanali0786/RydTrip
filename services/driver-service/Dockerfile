# Build context is the repo root (npm workspaces need the whole monorepo to
# resolve deps against the single root lockfile) — see docker-compose.yml.

FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY services/driver-service/package.json services/driver-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=services/driver-service --include-workspace-root --ignore-scripts

FROM deps AS build
COPY libraries/event-schema libraries/event-schema
COPY services/driver-service services/driver-service
RUN npm run build --workspace=libraries/event-schema \
 && npm run build --workspace=services/driver-service

FROM node:22-alpine AS prod-deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY libraries/event-schema/package.json libraries/event-schema/package.json
COPY services/driver-service/package.json services/driver-service/package.json
RUN npm ci --workspace=libraries/event-schema --workspace=services/driver-service --include-workspace-root --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl \
 && addgroup -S ridemesh && adduser -S ridemesh -G ridemesh
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=ridemesh:ridemesh /app/node_modules ./node_modules
COPY --from=build --chown=ridemesh:ridemesh /app/libraries/event-schema/dist ./libraries/event-schema/dist
COPY --from=build --chown=ridemesh:ridemesh /app/libraries/event-schema/package.json ./libraries/event-schema/package.json
COPY --from=build --chown=ridemesh:ridemesh /app/services/driver-service/dist ./services/driver-service/dist
COPY --from=build --chown=ridemesh:ridemesh /app/services/driver-service/package.json ./services/driver-service/package.json
COPY --from=build --chown=ridemesh:ridemesh /app/services/driver-service/prisma ./services/driver-service/prisma
COPY --from=build --chown=ridemesh:ridemesh /app/services/driver-service/prisma-client ./services/driver-service/prisma-client
USER ridemesh
WORKDIR /app/services/driver-service
EXPOSE 3002
CMD ["npm", "run", "start:prod"]
