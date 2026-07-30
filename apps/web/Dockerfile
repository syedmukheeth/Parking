# syntax=docker/dockerfile:1
# Build context is the repo root. Build with:
#   docker build -f apps/web/Dockerfile -t parkap-web .

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
RUN npm run build -w @parkap/web

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Next's standalone output traces only the dependencies actually used —
# smaller and simpler than copying the whole monorepo node_modules. In an npm
# workspaces monorepo, Next mirrors the workspace path under .next/standalone
# (apps/web/server.js) — verify this path against a real `next build` output
# before deploying; it has not been run in this environment.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
