# syntax=docker/dockerfile:1
# Build context is the repo root (npm workspaces need the whole tree to
# resolve `@parkap/shared`). Build with:
#   docker build -f apps/api/Dockerfile -t parkap-api .

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
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build -w @parkap/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

USER node
EXPOSE 4000
# `prisma migrate deploy` is a release step run before this starts (CI/Coolify),
# never `migrate dev` in prod (docs/DATA-MODEL.md).
CMD ["node", "apps/api/dist/main.js"]
