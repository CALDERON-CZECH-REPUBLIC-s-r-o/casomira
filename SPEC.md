# Zadání: Aplikace na měření závodů

## 1. Účel a kontext

Webová aplikace pro **organizaci a měření amatérských/mládežnických závodů** (běh, atletika apod.). Klíčový scénář je práce **cílového rozhodčího**, který v cíli odklikává průchody závodníků na obrazovce. Aplikace dále spravuje přihlášené závodníky (import z Excelu), kategorie, a generuje startovní a výsledkové listiny. Výsledky jsou dostupné **online na veřejném webu** pro danou akci.

> **Důležité — k zadání přiložím vzory:** mám k dispozici reálné příklady **startovních listin** a **výsledkových listin**. Layout a sloupce generovaných výstupů (PDF/tisk) musí odpovídat těmto vzorům — řiď se přiloženými soubory, ne obecnou představou. (Soubory patří do složky `vzory/`.)

---

## 2. Technologický stack

- **Next.js (App Router), TypeScript strict**
- **PostgreSQL + Drizzle ORM**
- **Tailwind CSS + shadcn/ui**
- Self-hosting přes **Coolify / Docker**
- PDF generování startovních a výsledkových listin (`@react-pdf/renderer` nebo serverové vykreslení do PDF)
- Excel import i export přes **SheetJS (xlsx)** nebo `exceljs`
- Live aktualizace výsledků: **SSE nebo polling**

---

## 3. Uživatelské role

- **Organizátor / administrátor** — vytváří akce, importuje závodníky, definuje kategorie, obsluhuje měřicí obrazovku, generuje výstupy. Za přihlášením (jednoduchý auth stačí pro MVP).
- **Veřejnost** — read-only přístup k veřejné stránce akce (startovky + živé výsledky), bez přihlášení.

---

## 4. Datový model

### `akce` (event)
`id`, `nazev`, `datum`, `misto`, `rok` (referenční rok pro výpočet věku, default = rok z `datum`), `slug` (pro veřejnou URL), `cas_startu` (timestamptz — hromadný start na úrovni akce), `poznamka`, `created_at`

> **Rozsah:** jedna akce = jeden závod. Režim startu je vždy **hromadný**.

### `kategorie`
`id`, `akce_id`, `nazev`, `pohlavi` (`M` | `Z` | `smisene`), `rok_narozeni_od`, `rok_narozeni_do` (nebo `vek_od`/`vek_do` počítané proti `akce.rok`), `poradi`, `cas_startu` (timestamptz, nullable — volitelný vlastní start kategorie), `poznamka`

### `zavodnik`
`id`, `akce_id`, `jmeno`, `prijmeni`, `rok_narozeni`, `pohlavi` (`M` | `Z`), `startovni_cislo`, `oddil`, `kategorie_id` (nullable — auto-přiřazení, lze přepsat), `stav` (`prihlasen` | `nenastoupil_DNS` | `diskvalifikovan_DSQ`), `created_at`
- `unique(akce_id, startovni_cislo)`

### `cilovy_zaznam` (průchod cílem)
`id`, `akce_id`, `cas_cile` (timestamptz, **přesnost na ms**), `startovni_cislo` (nullable), `zavodnik_id` (nullable), `stav` (`platny` | `neprirazeno` | `smazany` | `DNF`), `poradi_doteku`, `poznamka`, `created_at`, `edited_at`

> Výsledky se **nepočítají a neukládají natvrdo** — odvozují se dotazem (join `cilovy_zaznam` ↔ `zavodnik`, výpočet čistého času, řazení v rámci kategorie).

---

## 5. Funkční požadavky

### 5.1 Správa akcí
- Vytvoření/úprava akce. Každá akce má vlastní `slug` a veřejnou URL.

### 5.2 Import závodníků z Excelu
- Upload `.xlsx`, **mapování sloupců** v UI → jméno, příjmení, rok narození, **pohlaví**, startovní číslo, oddíl.
- **Pohlaví:** importuje se, ale jde **editovat v aplikaci** (jednotlivě i hromadně). Normalizace běžných variant (`M`/`Ž`, `muž`/`žena`, `m`/`z`…) na `M`/`Z`. Chybějící/nejednoznačné → k doplnění.
- **Náhled + validace** před uložením: duplicitní startovní čísla, chybějící povinná pole, nevalidní rok.
- Po importu: **auto-přiřazení do kategorií**. Bez odpovídající kategorie → k řešení.
- Šablona Excelu ke stažení.

### 5.3 Definice kategorií
- CRUD kategorií v rámci akce. Tlačítko **„Přepočítat zařazení“**. Ošetřit překryvy a nezařazené.

### 5.4 Měřicí (cílová) obrazovka — jádro
Velká tlačítka, vysoký kontrast, optimalizováno pro rychlé klikání (tablet/notebook).
1. **Start:** tlačítko START uloží `cas_startu` (hromadný start), lze i ručně. Volitelně vlastní start kategoriím.
2. **Průchod cílem:** velké tlačítko „ZAZNAMENAT PRŮCHOD“. **Razítko se ukládá v okamžiku kliknutí** (ms).
3. Dva režimy: **Tap → přiřadit později** (primární, `startovni_cislo = NULL`, fronta „K doplnění“) a **Inline zadání**.
4. **Fronta posledních průchodů** s časem/číslem/jménem; doplňování čísel z fronty.

Musí jít zaznamenat **průchod bez startovního čísla** a později doeditovat — razítko zůstává **neměnné**.
Ošetřit: obsazené číslo (konflikt), duplicitní záznam (smazání), neexistující číslo (upozornění).

### 5.5 Editace a opravy
- Přiřadit/změnit číslo, ruční úprava času, smazání, ruční vložení. Stavy DNF/DNS/DSQ. Log úprav (`edited_at`, ideálně historie).

### 5.6 Startovní listiny
- Po kategoriích i celková. Sloupce/layout **dle vzorů**. Řazení dle čísla nebo abecedně. Export **PDF/tisk + XLSX**.

### 5.7 Výsledkové listiny
- Po kategoriích (dle čistého času) i celková. Čistý čas = `cas_cile − cas_startu` (start kategorie, jinak akce).
- Sloupce: pořadí, číslo, příjmení, jméno, ročník, oddíl, čas, ztráta. Layout **dle vzorů**.
- DNF/DSQ/DNS za doběhnuvšími. Shodné časy = stejné pořadí. Export **PDF/tisk + XLSX**.

### 5.8 Veřejný web
- Read-only `/{slug}`: startovky + živé výsledky po kategoriích i celkově. **Živá aktualizace** (SSE/polling). Mobilní zobrazení, sdílitelná URL.

---

## 6. Technické úvahy

- **Jednotný zdroj času:** start i cíl ze stejných hodin (zařízení operátora). UTC uložení.
- **Offline-first:** měření běží lokálně, nezávisí na síti; klik se ukládá lokálně, syncuje později.
- **Optimistické UI.** **Souběh:** MVP = jedno zařízení, architektura počítá s rozšířením.
- **Záloha/export** dat akce (JSON/SQL dump).

---

## 7. Provoz na místě (lokálně + sync) — závazná architektura

Měření a publikace jsou **oddělené**. **Síť nikdy v kritické cestě záznamu.**

### 7.1 Lokální běh na notebooku
Celá app na notebooku operátora (Next.js + PostgreSQL, Docker Compose / Postgres.app). Práce přes `localhost`. Lokální Postgres = autoritativní úložiště během závodu.

### 7.2 Pojistka proti ztrátě dat
Klik → **IndexedDB** → lokální server. Outbox vzor s `client_id` (UUID) pro idempotentní sync a deduplikaci. Replay z outboxu při pádu.

### 7.3 Časové razítko
**Wall-clock** (`Date.now()`/`new Date()`), nikdy `performance.now()`. Start i cíl ze stejných hodin.

### 7.4 Zamezení uspání notebooku
1. **Wake Lock API** (`navigator.wakeLock.request('screen')`), re-akvizice na `visibilitychange`, indikátor v UI.
2. OS úroveň (caffeinate / Amphetamine / „nikdy neuspat“).
3. Napájení v síti.

### 7.5 Synchronizace na cloud
**Jednosměrný push** výsledků na cloud (Coolify) — tlačítko „Publikovat“ + auto na pozadí. Idempotentní upsert dle `client_id`/`id`. Cloud = read-only kopie.

### 7.6 Volitelně: živé výsledky na místě bez internetu
Notebook jako lokální server, diváci přes jeho IP (hotspot/WiFi).

---

## 8. Fázování

**MVP (Fáze 1):** správa akce + kategorie + import; měřicí obrazovka; startovní/výsledkové listiny (PDF/tisk); veřejná stránka s živými výsledky (polling); lokální běh (offline) s IndexedDB pojistkou, Wake Lock a jednosměrným syncem na cloud.

**Fáze 2:** více měřicích zařízení/mezičasy; online přihlašování; pokročilý audit log a role.

---

## 9. Potvrzená rozhodnutí

1. **Start:** pouze hromadný (volitelně vlastní po kategoriích). Bez intervalového.
2. **Rozsah:** jedna akce = jeden závod.
3. **Exporty:** startovní i výsledkové listiny do PDF (tisk) i Excelu (`.xlsx`).
4. **Pohlaví:** importuje se z Excelu, editovatelné v aplikaci (jednotlivě i hromadně), normalizace na `M`/`Z`.
5. **Provoz:** měření lokálně (offline-first), jednosměrný sync na cloud pro veřejný web.

**Zbývá dodat:** vzory startovní a výsledkové listiny (do `vzory/`) — generované výstupy se jimi budou řídit 1:1.
