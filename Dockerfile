# Jednoduchý produkční image pro cloudové (read-only) zrcadlo na Coolify.
# Plný image (vč. devDeps) — umožní spustit migrace přes `npm run db:migrate`.
# Měření běží lokálně na notebooku; tento image slouží veřejnému webu + ingestu.
FROM node:24-alpine
WORKDIR /app

# Závislosti (vč. dev — drizzle-kit/tsx pro migrace).
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Zdroj + build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
