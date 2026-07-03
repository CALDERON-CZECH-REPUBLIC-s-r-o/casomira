# Produkční image kompletní aplikace (vč. devDeps kvůli migracím `db:migrate`).
# Stejný image umí obě role (viz docker-compose.yml):
#  1) autoritativní měřicí server — zařízení míří prohlížečem sem (multi-device
#     + failover), 2) cloudové read-only zrcadlo plněné pushem /api/sync.
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
