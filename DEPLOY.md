# Nasazení — autoritativní měřicí server

Stejná aplikace, dvě role (jeden image): **autoritativní server** (měřicí zařízení
míří sem, sdílená data → multi-device + failover) a volitelně **cloudové read-only
zrcadlo** (plněné pushem `/api/sync`). Tento návod řeší roli autoritativního serveru.

## Co deploy dělá

`docker-compose.yml` postaví kompletní instanci:
`db` (PostgreSQL + volume) → `migrate` (jednorázově `npm run db:migrate`) →
`web` (`next start`, healthcheck na `/api/health`). Migrace i healthcheck jsou
automatické; web nastartuje až po zdravé DB a doběhlé migraci.

## Proměnné prostředí

| Proměnná | Povinná | K čemu |
|---|---|---|
| `AUTH_SECRET` | **ano** | podpis session (`openssl rand -base64 32`) |
| `DATABASE_URL` | ne¹ | default `postgres://casomira:casomira@db:5432/casomira` |
| `APP_BASE_URL` | doporučeno | veřejná adresa instance (odkazy, QR) |
| `POSTGRES_USER/PASSWORD/DB` | ne | default `casomira` |
| `SYNC_TOKEN` | ne | jen pro režim cloud zrcadla (`/api/sync`) |

¹ Compose ho složí z `POSTGRES_*`. Vlastní externí DB → nastav `DATABASE_URL`.

## A) Coolify

1. Nová „Docker Compose" resource → repo casomira, soubor `docker-compose.yml`.
2. Doména: **`casomira.calderon.cz`** (DNS A/AAAA na Coolify server; Traefik + TLS).
   `APP_BASE_URL` má tuto doménu už jako default v compose — netřeba nastavovat.
3. Environment Variables: `AUTH_SECRET` (povinné), `ADMIN_EMAIL` + `ADMIN_PASSWORD`
   (auto-založí org účet), příp. `POSTGRES_PASSWORD`.
4. Deploy. Traefik vystaví `web` (interní port 3000) na doméně; host porty se neřeší.
5. Health: Coolify čte `/api/health` (v compose healthcheck už je).

## B) Generický server / LAN krabice (docker compose)

```bash
export AUTH_SECRET=$(openssl rand -base64 32)
export APP_BASE_URL=http://<IP-nebo-doména>:3000
docker compose up -d --build           # db → migrate → web
docker compose ps                      # web = healthy
```

Bez internetu (na místě): pusť totéž na notebooku/mini-PC v LAN; zařízení se
připojí přes jeho IP (`http://<IP>:3000`) po lokální WiFi.

## Org účet (přihlášení)

**Automaticky při deployi (doporučeno):** nastav `ADMIN_EMAIL` + `ADMIN_PASSWORD`
(min. 8 znaků) v env → `migrate` service po migraci účet založí/přenastaví
(idempotentní). Čerstvý server má rovnou login.

**Nebo ručně kdykoli:**

```bash
docker compose exec web npm run create-admin -- org@akce.cz tajneheslo123
```

## Provoz měření + failover

1. Každé měřicí zařízení (notebook/tablet) otevře v prohlížeči `APP_BASE_URL`,
   přihlásí se, jde na akci → **Měření**.
2. Průchody: klik → IndexedDB outbox → **background worker** je pošle na server
   (`/api/mereni/sync`) hned + průběžně. Data jsou na serveru.
3. **Spadne zařízení** → otevři jiné, přihlas se, otevři **Měření** téže akce —
   načte všechny dosavadní průchody ze serveru a měříš dál. V riziku jsou jen
   poslední nesynchronizované kliky (sekundy).
4. Lokální záloha à 30 s (v prohlížeči) je navíc pojistka; stažení JSON na
   **Publikování → Lokální zálohy**.

> Pozn.: pro *souběžné* měření víc zařízení naráz (ne jen failover) chybí živý
> *pull* nových serverových průchodů — viz „Další krok" v `CLAUDE.md`. Pro failover
> (sekvenční převzetí) stačí stávající načtení při otevření obrazovky.

## Lokální ověření produkčního runtime (bez Dockeru)

```bash
npm run build
AUTH_SECRET=$(openssl rand -base64 32) PORT=3011 npm run start
curl -s localhost:3011/api/health      # {"ok":true,"db":"up"}
```

(Lokální dev port casomiry je **3011** — viz `Vyvoj/PORTS.md`.)
