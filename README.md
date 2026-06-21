# Časomíra

Webová aplikace pro **organizaci a měření amatérských/mládežnických závodů** (běh, atletika).
Jádrem je práce cílového rozhodčího, který v cíli odklikává průchody závodníků. Aplikace dál
spravuje přihlášené závodníky (import z Excelu), kategorie a generuje startovní a výsledkové
listiny. Výsledky jsou online na veřejném webu akce.

## Klíčový princip: offline-first měření

Měření běží **lokálně na notebooku operátora** a nesmí záviset na internetu. Síť není
v kritické cestě záznamu průchodu:

- klik → IndexedDB outbox → lokální Postgres,
- časové razítko (wall-clock, ms přesnost) se bere v okamžiku kliknutí a je **neměnné**,
- každý záznam má `client_id` (UUID) → idempotentní sync a deduplikace,
- na cloud se výsledky **jednosměrně synchronizují** pro veřejný read-only web.

Detaily viz `SPEC.md`, sekce 7.

## Stack

Next.js 16 (App Router) · TypeScript strict · PostgreSQL + Drizzle ORM · Tailwind CSS ·
Auth.js (next-auth v5, Credentials + JWT) · `@react-pdf/renderer` (PDF) · `exceljs` (Excel) ·
Coolify / Docker deploy.

## Lokální vývoj

### 1. Databáze

Potřebuješ PostgreSQL na `localhost:5432`. Dvě varianty:

**A) Nativní Postgres (doporučeno na tomto stroji — Docker zde není funkční):**

```bash
# jednorázově: role + databáze (psql z homebrew postgresql@16)
/usr/local/opt/postgresql@16/bin/psql -d postgres \
  -c "CREATE ROLE casomira LOGIN PASSWORD 'casomira'" \
  -c "CREATE DATABASE casomira OWNER casomira"
```

**B) Docker (kde funguje Docker Desktop):**

```bash
npm run db:up      # nastartuje Postgres v kontejneru (docker-compose.dev.yml)
```

### 2. Env

```bash
cp .env.example .env
# vygeneruj AUTH_SECRET: openssl rand -base64 32
```

### 3. Migrace, seed, org účet

```bash
npm install
npm run db:migrate                                   # vytvoří schéma
npm run db:seed                                       # ukázková akce + závodníci (volitelné)
npm run create-admin -- org@akce.cz tajneheslo123     # přihlašovací účet organizátora
```

### 4. Spuštění

```bash
npm run dev        # http://localhost:3000 (nebo první volný port)
```

- Veřejná home: `/` — seznam akcí
- Administrace: `/admin` (vyžaduje přihlášení)
- Přihlášení: `/prihlaseni`

## Příkazy

| Příkaz | Popis |
| --- | --- |
| `npm run dev` | Vývojový server |
| `npm run build` | Produkční build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Vygeneruje SQL migraci ze schématu |
| `npm run db:migrate` | Spustí migrace |
| `npm run db:seed` | Naplní ukázková data |
| `npm run db:studio` | Drizzle Studio |
| `npm run create-admin` | Založí/přenastaví org účet |

## Stav vývoje

Fázování dle `SPEC.md`, sekce 8. Hotovo / probíhá:

- [x] **M0** — scaffold, infra, Auth.js (org login), veřejná home + admin rozcestník
- [x] **M1** — datový model (Drizzle) + migrace + seed
- [x] **M2** — správa akcí + kategorie (CRUD, přepočet zařazení), výpis závodníků
- [x] **M3** — import z Excelu (.xls/.xlsx, mapování sloupců, slité jméno, normalizace + heuristika pohlaví, náhled/validace, šablona)
- [x] **M4** — měřicí obrazovka (offline IndexedDB outbox, idempotentní sync dle client_id, Wake Lock, hromadný start, fronta „K doplnění", inline číslo, DNF/smazání)
- [~] **M5** — opravy průchodů: doplnění/změna čísla, DNF, smazání, neměnné razítko (hotovo v M4); zbývá ruční úprava času + ruční vložení + historie změn
- [x] **M6** — listiny: odvozovací vrstva (ties, DNF/DNS/DSQ, ztráta), tisková HTML (A4), generovaný PDF (@react-pdf + Noto font), XLSX (exceljs); celková i po kategoriích
- [ ] **M7** — veřejný web s živými výsledky
- [ ] **M8** — sync na cloud + zálohy

Vzory výstupů (startovní/výsledková listina, ukázkový Excel) patří do složky `vzory/` —
podle nich se 1:1 řídí layout generovaných listin a výchozí mapování importu.

Vývojářské detaily: viz `DEVELOPMENT.md`.
