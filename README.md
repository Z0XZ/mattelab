# mattelab.no

Interaktive utforskere i matematikk for videregående skole (1T og R1). Eleven endrer verdier med glidebrytere og tallfelt og ser grafer, figurer og tall endre seg mens hen drar. Hver utforsker har en sammenleggbar forklaring («Matematikken bak») og oppgaver i tre steg: Gjett, Test og Forklar. Oppgavene kan lastes ned som elevark i PDF uten fasit.

Designet følger søstersiden [fysikklab.no](https://fysikklab.no) (samme papir, blekk, typografi, kort, filter og oppgavelister), slik at det er tydelig at sidene hører sammen. Forskjellen er fagfargene: blå `--m1` for 1T og plomme `--m2` for R1, mot rust og blågrønn på fysikklab.

Siden er statisk HTML, CSS og JavaScript uten rammeverk. Den har ingen innlogging, informasjonskapsler eller sporing. Den publiseres med GitHub Pages fra mappen `docs/`.

## Kom i gang

```sh
python3 bygg.py --sjekk   # tørrkjøring: hva ville blitt endret?
python3 bygg.py           # bygg docs/
npm install               # første gang: henter testverktøyet (playwright-core)
npm test                  # test alle sider i headless Chrome
```

Se på siden lokalt: `python3 -m http.server --directory docs` og åpne http://localhost:8000.

## Mapper

| Mappe | Innhold |
|---|---|
| `kilde/maler/side.html` | Felles topp, meny og bunn for alle sider |
| `kilde/sider/` | Forside, Om, For lærere |
| `kilde/utforskere/` | Én kildefil per utforsker, og oversiktssiden `index.html` |
| `kilde/opplegg/` | Undervisningsopplegg, og oversiktssiden `index.html` |
| `statisk/css/stil.css` | Alt av stil. Farger er variabler med lys og mørk modus |
| `statisk/js/felles.js` | Felles kode: tallformat, glidebryter, koordinatsystem, lagring, nedlasting, fagvalg, filter |
| `statisk/js/utforskere/` | Ett skript per utforsker. Ren matematikk ligger i egne moduler (for eksempel `andregrad-matte.js`) |
| `statisk/js/forside.js` | Den lille parabel-utforskeren på forsiden |
| `statisk/lib/katex/` | KaTeX 0.16.11 (MIT, se `LICENSE`) |
| `data/temaer.json` | Fag og temaer. Temanavnene står bare her |
| `data/planlagt.json` | Utforskere som er planlagt, vist med stiplet kant og «Kommer» |
| `data/ikoner.json` | Små SVG-ikoner til kortene på oversiktssidene (strek-/fyll-klasser fra stilarket) |
| `data/kompetansemaal.json` | Kompetansemål sitert ordrett fra Udir (MAT09-02 og MAT03-02) |
| `data/koblinger.json` | Kobling mellom kompetansemål og ressurser (lærerens vurdering) |
| `verktoy/elevark.py` | Lager elevark (PDF uten fasit) fra oppgavene med LuaLaTeX |
| `verktoy/fasit/` | Python-skript som regner ut alle tall i oppgaver og fasit |
| `tester/test.mjs` | Automatiske tester i headless Chrome |
| `docs/` | **Ferdigbygd nettsted. Redigeres aldri for hånd.** |

## Lage en ny utforsker

1. Regn ut tallene til oppgavene og fasiten i et skript i `verktoy/fasit/`.
2. Lag `kilde/utforskere/<navn>.html` med hode (se [BYGG.md](BYGG.md)).
3. Lag `statisk/js/utforskere/<navn>.js`. Bruk `lagGlider`, `Koordinatsystem`, `tall` og `annonser` fra `felles.js`.
4. Fjern utforskeren fra `data/planlagt.json`. Flytt ikonet i `data/ikoner.json` til filnavnet (uten .html), og legg utforskeren eventuelt inn i `data/koblinger.json`.
5. Kjør `python3 bygg.py` og `npm test`. Legg til tester for den nye utforskeren i `tester/test.mjs`.

## Regler for innhold

- Alle tall i fasiter og eksempler regnes ut med kode før de skrives inn.
- Kompetansemål siteres ordrett og hentes maskinelt fra Udir. Koblingene er lærerens egen vurdering.
- Ingen prøver eller annet vurderingsmateriale i repoet. Repoet er offentlig.
- Ingen tekst eller figurer fra lærebøker, og ingen filer med ukjent lisens.
- Norsk tallformat: desimalkomma, ekte minustegn (−) og mellomrom som tusenskille. Bruk `tall()` fra `felles.js`.
