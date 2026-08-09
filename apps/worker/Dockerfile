# syntax=docker/dockerfile:1
# Build context is the repo root. Build with:
#   docker build -f apps/worker/Dockerfile -t parkap-worker .

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w @parkap/shared
# The worker's own PrismaClient generation reads the same schema as the api.
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build -w @parkap/worker

FROM node:22-alpine AS runtime
# Set by the host, not the image — the worker must match the api's NODE_ENV
# so both read the same provider configuration. See docs/DEPLOYMENT.md.
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json

USER node
CMD ["node", "apps/worker/dist/main.js"]
