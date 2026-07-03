# Produkční image kompletní aplikace (vč. devDeps kvůli migracím `db:migrate`).
# Stejný image umí obě role (viz docker-compose.yml):
#  1) autoritativní měřicí server — zařízení míří prohlížečem sem (multi-device
#     + failover), 2) cloudové read-only zrcadlo plněné pushem /api/sync.
#
# Base = slim (glibc), ne alpine — spolehlivější pro nativní @node-rs/argon2.
FROM node:24-slim
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Závislosti (vč. dev — drizzle-kit/tsx pro migrace a build).
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Zdroj + build (context filtruje .dockerignore — .env, vzory, design handoff…).
COPY . .
RUN npm run build

EXPOSE 3000

# Healthcheck přes node (žádná závislost na curl/wget); ověří i DB přes /api/health.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["npm", "run", "start"]
