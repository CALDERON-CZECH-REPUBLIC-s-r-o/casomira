# Multi-tenant: pořadatelé, schvalování, fakturace, mailer

Dokumentace SaaS vrstvy nad měřicím jádrem: veřejná **registrace pořadatelů** (podléhá
schválení), **tvrdá izolace** mezi pořadateli, **panel globálního admina** (schvalování,
přehled zákazníků, fakturace) a **e-mailový mailer** (Office 365 SMTP).

> Měřicí jádro (offline-first cíl, outbox, sync, veřejný web) beze změny — viz `README.md`
> a `SPEC.md`. Tento dokument popisuje jen účty, role a business vrstvu.

## Role a stav účtu

`uzivatel.role`:
- `organizator` — běžný pořadatel; vidí a spravuje **jen své** akce.
- `superadmin` — globální admin; vidí vše + panel `/admin/zakaznici` a `/admin/email`.

`uzivatel.stav` (schvalovací workflow, vzor převzat z `prihlaska`):
- `ceka` — po veřejné registraci; přihlásí se, ale vidí jen `/admin/ceka`.
- `schvalen` — plný přístup (dle role).
- `zamitnut` — **nepřihlásí se** (blokováno v `authorize`).

Migrace `0013` přidala role/stav + fakturační pole a existující účty **backfillnula na
`schvalen`** (byly zakládané jen přes CLI = důvěryhodné).

## Datový model (migrace 0013)

`uzivatel` (`src/db/schema/identity.ts`): `role`, `stav`, `firma`, `ico`, `dic`,
`telefon`, `schvalenoAt` (+ původní email/jmeno/hash/onboarding).

`akce` (`src/db/schema/akce.ts`): `uzivatelId` (vlastník, FK → uzivatel, `on delete set
null`) + `fakturaceUhrazeno` (boolean, řídí globální admin).

Enumy (`src/db/schema/enums.ts`): `uzivatelRoleEnum`, `uzivatelStavEnum`.

Globální konfigurace v `web_obsah` (klíč-hodnota JSON):
- `fakturace` → `{ cenaZaAkci, ucet, firma }` (viz `src/server/fakturace.ts`)
- `email` → `{ povoleno, host, port, uzivatel, heslo, odesilatel, adminEmail }`
  (viz `src/lib/mailer.ts` / `src/server/email.ts`)
- `sms` → SMS brána (starší, gosms.eu)

## Auth a guardy

Login (`src/auth/nextauth.ts`) vrací `role` a `stav`; propisují se do JWT/session
(`src/auth/config.ts`, `src/types/next-auth.d.ts`). **`zamitnut` se nepřihlásí.**

Guardy (`src/auth/guard.ts`) — čtou **aktuální DB stav**, takže schválení platí ihned
bez re-loginu:

| Guard | Použití | Chování |
|---|---|---|
| `vyzadujPrihlaseni()` | základ | není session → redirect `/prihlaseni` |
| `nactiUzivatele()` | načte účet z DB | vrací `{ session, uzivatel }` |
| `vyzadujSchvaleneho()` | dashboard, `/admin/akce/nova`, globální sekce | `stav ≠ schvalen` → redirect `/admin/ceka` |
| `vyzadujSuperAdmina()` | `/admin/zakaznici`, `/admin/email`, fakturace | jinak `notFound()` |
| `vyzadujAkci(id)` | **každá** event stránka `/admin/akce/[id]/**` | cizí/neexist. akce → `notFound()`; vrací `{ akce }` |
| `overitVlastnictviAkce(id)` | **každá** event server akce (mutace) | tichá varianta, cizí → `notFound()` |
| `smiNaAkci(uid, id)` | route handlery (`route.ts`) | boolean (vrací Response 404) |

Superadmin projde `vyzadujAkci` / `overitVlastnictviAkce` na jakoukoli akci.

## Tvrdá izolace

1. **Vytvoření** akce (`src/server/akce.ts` `vytvoritAkci`) nastaví `uzivatelId` =
   přihlášený uživatel.
2. **Dashboard** (`src/app/[locale]/admin/page.tsx`) filtruje akce na `uzivatelId`
   (superadmin vidí vše).
3. **Event stránky** (18 souborů pod `admin/akce/[id]/**`) volají `vyzadujAkci(id)`.
4. **Event server akce** (`src/server/{akce,zavodnici,kategorie,mereni,opravy,body,
   import,publikovat,prihlasky,historie}.ts`) volají `overitVlastnictviAkce`. Akce nad
   „child" entitou (přihláška, průchod) si napřed dohledá parent `akceId`.
5. **Route handlery** (`listiny/export`, `zaloha`) volají `smiNaAkci` → 404.

Neschválený pořadatel nevlastní žádnou akci → je fakticky bez přístupu k závodům.

## Veřejná registrace

- Route `/registrace` (`src/app/[locale]/registrace/`), sourozenec `/prihlaseni`.
- Akce `registrovatOrganizatora` (`src/server/organizatori.ts`) — **bez auth**, ochrana:
  honeypot (`web`) → časová past (`ts`, < 3 s = bot) → rate-limit (`registrace:<ip>`,
  3/hod) → Turnstile (když je nakonfigurováno). Pak zod validace, unikátní e-mail,
  argon2 hash (`src/lib/hesla.ts`), insert `stav='ceka'`.
- Vstupní body: odkaz na `/prihlaseni` + landing CTA („Založit závod zdarma") míří na
  `/registrace`.
- Neschválený po loginu: `/admin/ceka` (hláška „čeká/zamítnut" + odhlášení).

## Panel globálního admina `/admin/zakaznici`

- **Ke schválení**: účty `stav='ceka'` → `schvalitOrganizatora` / `zamitnoutOrganizatora`.
- **Zákazníci**: schválení pořadatelé + počet akcí, neuhrazené, částka, „Označit
  uhrazeno" (hromadně jeho neuhrazené akce).
- **Detail** `/admin/zakaznici/[id]`: jeho akce (akce vs pořadatel), rozpad fakturace,
  **QR platba (SPAYD)**, přepínání uhrazeno po akci.
- **Nastavení fakturace**: `cenaZaAkci`, účet platformy, název (popis platby).

### Fakturační model
Cena **za akci** (paušál, globálně nastavitelný). Dlužná částka pořadatele =
`počet neuhrazených akcí × cenaZaAkci`. QR podklad k platbě se skládá přes
`src/lib/platba.ts` (`ucetNaIban` + `spayd`) + `src/lib/qr.ts` (SVG data URI); VS = IČO
pořadatele (číslice). „Uhrazeno" je ruční příznak na `akce.fakturaceUhrazeno`
(`src/server/fakturace.ts`).

## Mailer (Office 365 SMTP)

- Transport `src/lib/mailer.ts` (nodemailer). Výchozí `smtp.office365.com:587` (STARTTLS;
  465 = SSL se odvodí z portu). Konfigurace v `web_obsah` klíč `email`.
- `odeslatEmail()` je **best-effort** — vypnutý/nenakonfigurovaný/selhavší mailer vrátí
  `false` a **nikdy neshodí** volající akci (schvalování jede i bez e-mailu).
- Nastavení `/admin/email` (superadmin): host/port/uživatel/heslo/odesílatel/adminEmail
  + přepínač + **Test odeslání**.
- Napojení (`src/server/organizatori.ts`): registrace → notifikace na `adminEmail`;
  schválení/zamítnutí → e-mail pořadateli.
- **Pozn. O365**: schránka potřebuje povolený **SMTP AUTH** (Authenticated SMTP);
  s MFA typicky **app password**. Basic-auth SMTP Microsoft postupně omezuje —
  případný přechod na Graph API/OAuth by byl samostatná integrace.

## Provozní kroky (po nasazení)

1. **Povýšit účet na superadmina + převzít existující akce** (jednou):
   ```
   EMAIL=api@calderon.cz npm run promote-superadmin
   ```
   (`src/db/promote-superadmin.ts` — nastaví role/stav + `akce.uzivatelId` u osiřelých akcí.)
2. **Fakturace**: `/admin/zakaznici` → dole nastavit `cenaZaAkci` + účet platformy.
3. **Mailer**: `/admin/email` → SMTP údaje O365 + Test odeslání.

`nastavAdmin` (`src/db/admin-core.ts`) má `superadmin` flag; nové CLI účty jsou rovnou
`schvalen`.

## Klíčové soubory

- Schéma/migrace: `src/db/schema/{enums,identity,akce,relations}.ts`, migrace `0013`,
  `src/db/promote-superadmin.ts`, `src/lib/hesla.ts`.
- Auth: `src/auth/{nextauth,config,guard}.ts`, `src/types/next-auth.d.ts`.
- Registrace/pending: `src/app/[locale]/registrace/`, `src/app/[locale]/admin/ceka/`,
  `src/server/organizatori.ts`.
- Panel/fakturace: `src/app/[locale]/admin/zakaznici/`, `src/server/fakturace.ts`,
  `src/lib/{platba,qr}.ts`.
- Mailer: `src/lib/mailer.ts`, `src/server/email.ts`, `src/app/[locale]/admin/email/`.
