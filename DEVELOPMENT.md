# Vývojářská dokumentace

## Struktura

```
src/
  app/
    page.tsx                 # veřejná home (seznam akcí)
    layout.tsx               # root layout (lang=cs)
    prihlaseni/page.tsx      # login organizátora (Credentials)
    admin/page.tsx           # rozcestník administrace (chráněno)
    api/auth/[...nextauth]/  # NextAuth route handler
  auth/
    config.ts                # edge-safe auth config (pro proxy/middleware)
    nextauth.ts              # plný auth (Credentials + argon2, Node runtime)
  db/
    client.ts                # singleton Drizzle klient (postgres-js)
    migrate.ts               # release-step migrátor (advisory lock)
    seed.ts                  # dev seed
    create-admin.ts          # bootstrap org účtu
    schema/                  # Drizzle schéma (po doménách)
    migrations/              # vygenerované SQL migrace
  lib/
    env.ts                   # zod-validované prostředí
  proxy.ts                   # ochrana /admin (Next 16 „proxy", dříve middleware)
vzory/                       # vzory výstupů (dodá zadavatel)
```

## Datový model

Schéma je v `src/db/schema/`, rozdělené po doménách. Tabulky odpovídají `SPEC.md` sekci 4:

- **`akce`** — jeden závod. `cas_startu` = hromadný start; `rok` = referenční rok pro zařazení.
- **`kategorie`** — pohlaví (`M`/`Z`/`smisene`) + rozsah ročníků; volitelný vlastní `cas_startu`.
- **`zavodnik`** — pohlaví nullable (nejednoznačný import → k doplnění); `unique(akce_id, startovni_cislo)`;
  `kategorie_id` se přiřazuje automaticky, lze přepsat.
- **`cilovy_zaznam`** — průchod cílem. `cas_cile` ms přesnost, **neměnné**. `client_id` unikátní (idempotentní sync).
  Stav `platny`/`neprirazeno`/`smazany`/`DNF`.
- **`uzivatel`** — org účet (argon2 hash hesla).

**Výsledky se nepočítají natvrdo** — odvozují se dotazem (join `cilovy_zaznam` ↔ `zavodnik`,
čistý čas = `cas_cile − cas_startu` kategorie/akce, řazení v rámci kategorie). Zůstávají
konzistentní i po opravách průchodů.

### Workflow migrací

1. uprav schéma v `src/db/schema/`
2. `npm run db:generate` → vznikne SQL migrace v `src/db/migrations/`
3. `npm run db:migrate` → aplikuje

Nikdy nespouštěj `drizzle-kit pull/introspect` (přepsalo by ruční úpravy migrací).

## Auth

next-auth v5, **Credentials + JWT** (žádná veřejná registrace). Účty zakládá `create-admin`.

Rozdělení kvůli Edge runtime (proxy nesmí importovat nativní moduly):

- `auth/config.ts` — edge-safe: session, pages, `authorized` callback (ochrana `/admin`). Bez DB/argon2.
- `auth/nextauth.ts` — plný: spread `authConfig` + Credentials provider s argon2 verify proti DB.
- `proxy.ts` — `NextAuth(authConfig).auth`, matcher `/admin/:path*`.

## Konvence

- Texty, identifikátory v doméně a komentáře **česky** (kód anglicky/mix dle stacku).
- TS strict, žádné `any` bez důvodu.
- DB časy v UTC (`timestamptz`), zobrazení jako uplynulý/lokální čas (luxon).
- Před commitem: `npm run typecheck` + `npm run build`.

## Známá specifika tohoto stroje

- **Docker Desktop nefunkční** (rozbitý symlink z AppTranslocation) → lokálně se používá
  nativní homebrew `postgresql@16` na `localhost:5432`. `docker-compose.dev.yml` zůstává pro stroje s Dockerem.
- Port 3000 občas obsazený jinou aplikací → `npm run dev` přepne na další volný port (3001/3002…).

## Deploy (Coolify) — výhled

Veřejný web je read-only kopie na cloudu, plněná jednosměrným syncem z lokální instance
(M8). Produkční `docker-compose.yml` + `Dockerfile` (standalone build) se doplní v rámci M8.
