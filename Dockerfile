FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build:railway

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist-railway ./dist-railway
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts/start-railway.mjs /app/scripts/sheet-poller.mjs /app/scripts/railway-bootstrap.mjs /app/scripts/migrate-postgres.mjs ./scripts/
COPY --from=build --chown=node:node /app/postgres ./postgres
USER node
CMD ["node","scripts/start-railway.mjs"]
