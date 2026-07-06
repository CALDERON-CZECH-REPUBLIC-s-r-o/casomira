# Objevování pro AI agenty (DNS-AID) — ruční nastavení

Tohle **nejde nasadit z aplikace** — jde o DNS záznamy na doméně `casomir.cz`,
které se nastavují v panelu DNS providera (ne v kódu). Níže je postup, co přidat.

> DNS-AID (`draft-mozleywilliams-dnsop-dnsaid`) je zatím **IETF draft**, ne standard.
> Nasazuj jen pokud vědomě chceš inzerovat entrypoint pro agenty. Pro běžný provoz
> časomíry není potřeba — na SEO/agenty stačí `/sitemap.xml` + `/robots.txt` (ty už
> aplikace generuje).

## Co nastavit v DNS

1. **SVCB/HTTPS `ServiceMode` záznam** pod well-known jménem `_agents`:

   ```
   _index._agents.casomir.cz.  3600  IN  HTTPS  1 casomir.cz. (
       alpn="h2,h3"
       port=443
   )
   ```

   - `_index._agents.casomir.cz` = vstupní bod discovery (dle draftu).
   - Cíl `casomir.cz` (kde běží web), `alpn` = podporované ALPN protokoly (RFC 9460).
   - Volitelně další entrypointy, např. `_a2a._agents.casomir.cz` pro konkrétní protokol.

2. **DNSSEC**: v panelu domény zapnout podpis zóny, aby validující resolvery vracely
   autentizovaná data. (U většiny registrátorů jedno zaškrtnutí + DS záznam u registru.)

## Ověření

```bash
dig +dnssec HTTPS _index._agents.casomir.cz
```

Očekává se HTTPS záznam s parametry `alpn`/`port` a (při DNSSEC) `ad` flag / RRSIG.

## Odkazy
- Draft: https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/
- SVCB/HTTPS RR: https://www.rfc-editor.org/rfc/rfc9460
