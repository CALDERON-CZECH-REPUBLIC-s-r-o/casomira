@AGENTS.md

# Stav & roadmap

Všechny obrazovky dle Calderon design handoffu postaveny (Fáze 0–7): admin sidebar,
veřejná část, brány + splity, moderátor, tabule, nastavení, onboarding, PDF import
historických výsledků, auto-pohlaví. Měřicí obrazovka: blokace bez startu, editace/mazání
historie, návrat do menu, **background sync worker** (`src/lib/mereni-sync.worker.ts` +
`/api/mereni/sync`) běžící dál po odchodu z obrazovky, **lokální záloha à 30 s** do
IndexedDB (`/api/mereni/snapshot` + `src/lib/zalohy.ts`).

## Nově hotovo — SaaS / business vrstva (multi-tenant)

Aplikace je **multi-tenant** (viz `docs/multi-tenant.md`):

- **Veřejná registrace pořadatele** `/registrace` (podléhá schválení; honeypot +
  time-trap + rate-limit + Turnstile). Neschválený vidí jen `/admin/ceka`.
- **Role** `uzivatel.role` (organizator/superadmin) + **stav** (ceka/schvalen/zamitnut);
  guardy v `src/auth/guard.ts` čtou DB (schválení platí bez re-loginu).
- **Tvrdá izolace**: `akce.uzivatelId` (vlastník); `vyzadujAkci` na všech event
  stránkách, `overitVlastnictviAkce` na všech event server akcích, `smiNaAkci` v route
  handlerech → cizí akce = 404. Dashboard scoping (superadmin vidí vše).
- **Panel globálního admina** `/admin/zakaznici`: schvalování, přehled zákazníků,
  **fakturace** (cena za akci → `akce.fakturaceUhrazeno`; QR podklad SPAYD).
- **Mailer** (Office 365 SMTP, nodemailer, best-effort) `/admin/email` — notifikace
  o registraci a schválení.
- Migrace `0013` (role/stav/vlastník/fakturace); `0011` historie, `0012` zastavení času.
- **Provoz**: po nasazení jednou `EMAIL=… npm run promote-superadmin` (superadmin +
  převzetí osiřelých akcí), pak nastavit fakturaci a mailer v adminu.

Další nedávné: samostatná statistika **historických výsledků** (`historicky_vysledek`,
párování dle jména+roku; projekce „Historie vítězů"), **tabule** (QR akce, fit-to-screen,
rotace obrazovek), měření **„Zastavit čas"** (zmrazí i tabuli/web), skrytí **DNS** v mřížce,
sjednocení časové zóny na **Europe/Prague** (`src/lib/cas.ts`).

## Provozní model: AUTORITATIVNÍ server (zvoleno)

Server (cloud nebo LAN krabice) drží data; měřicí zařízení jsou prohlížečoví klienti
s IndexedDB outboxem + background workerem. Dává **multi-device + failover** (spadne
notebook → otevři jiný, přihlas se, měř dál — server má vše; převzímající zařízení
načte při otevření měřicí obrazovky všechny průchody ze serveru). Deploy = existující
`docker-compose.yml` (db + migrace + web); `SYNC_TOKEN` je volitelný (jen pro režim
odděleného cloud zrcadla přes `/api/sync`). Bez internetu: tentýž compose na LAN krabici,
zařízení přes lokální WiFi.

**Další krok (zvýšení robustnosti multi-device/failover):** měřicí obrazovka zatím jen
*pushuje* svoje průchody a *pulluje* stav jen při načtení (mountu) — pro failover stačí.
Pro **živý** souběh víc zařízení doplnit periodický *pull* nových serverových průchodů
(nový GET `/api/mereni/pruchody?akceId=&since=`) a merge do stavu bez přepsání lokálních
nesynchronizovaných. `poradiDoteku` je pak jen tie-break (per-zařízení monotónní, kolize
neškodí). Konflikty/duplicity už řeší `/konflikty` (domain/konflikty.ts).

# Roadmap / backlog (alternativní směry, nezačato)

Níže zůstávají pro případ jiného rozhodnutí; zvolený směr výše je autoritativní server.

## 1. Standalone desktop aplikace s embedded DB

Cíl: operátor dostane `.app` / `.exe`, dvojklik → měří. **Žádný Docker ani instalace
Postgresu** (viz DEVELOPMENT.md — Docker na tomto stroji nefunkční, jede se přes nativní
Postgres; to je pro distribuci zákazníkům friction).

- **DB → PGlite** (Postgres ve WASM, běží in-process, persist do složky/souboru).
  Zachová Drizzle, `timestamptz` i **stávající SQL migrace** → minimum přepisu.
  Drizzle má pglite driver. (Alternativa SQLite = víc práce na schématu kvůli
  Postgres-specifickým typům.)
- **Balení:** Next.js standalone build + PGlite jako desktop shell — **Tauri v2**
  (malý binár, systémový webview) nebo **Electron** (jednodušší s Next, těžší binár).
  Případně single-file Node binárka (SEA / `bun build --compile`).
- Jednosměrný sync na cloud (M8) i celý datový model zůstávají beze změny — mění se
  jen zdroj DB (externí Postgres → embedded PGlite).

## 2. iPad / mobilní měření (samostatné)

- **Nejrychlejší cesta = PWA.** Měřicí obrazovka už je offline-first (IndexedDB outbox,
  wall-clock razítka, Wake Lock — Safari 16.4+). Doplnit **service worker + manifest**
  → instalovatelné na plochu, celoobrazovkové, bez App Store. Míří na cloud instanci
  (nebo laptop-hotspot), syncuje když je online. Řádově **dny** práce, UI stojí.
  - Pozor: iOS může evikovat storage PWA → spolehnout se na outbox + sync jako
    durabilitu, ne na lokální data jako jediný zdroj.
- **Native / App Store cesta = Capacitor** — zabalí stávající web do nativní schránky,
  znovupoužije veškerý kód. Jen když je potřeba App Store presence nebo background běh.
  Větší, ale ne od nuly.

## Produktové balení pro zákazníky (rozhodnutí k učinění)

- **Tier A — self-hosted standalone** (laptop, embedded DB, bez internetu): prodej jako
  stažitelná aplikace; pro akce bez konektivity. Staví na iniciativě 1.
- **Tier B — SaaS cloud + iPad PWA**: nižší friction, předplatné, výsledky živě na
  veřejném webu. Staví na iniciativě 2 + existující cloud instanci. **Základ hotov**:
  multi-tenant registrace/schvalování/izolace + fakturace + mailer (`docs/multi-tenant.md`);
  zbývá PWA (iniciativa 2) a případně automatizace plateb/předplatného.
