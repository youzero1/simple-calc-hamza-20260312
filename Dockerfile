FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm i

COPY . .

RUN mkdir -p ./data

RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=./data/calculator.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=base /app/node_modules/bindings ./node_modules/bindings
COPY --from=base /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

RUN mkdir -p ./data && chown -R nextjs:nodejs ./data
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
