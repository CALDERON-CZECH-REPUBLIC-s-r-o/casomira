@AGENTS.md

# Roadmap / backlog (nezačato — k rozmyšlení směru pro zákazníky)

MVP (M0–M8) hotové; měření běží offline-first lokálně, výsledky se jednosměrně
publikují na cloud (viz README „Stav vývoje"). Níže jsou dvě větší iniciativy, které
otevírají prodej produktu zákazníkům. Zatím **nezačato**, jen zmapované cesty.

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
  veřejném webu. Staví na iniciativě 2 + existující cloud instanci.
