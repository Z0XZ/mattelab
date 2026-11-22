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
| `kilde/varierende/` | Varierende undervisning: kortsett (`.html` + `.py` med kortene), øvinger og tavleoppgaver, og oversiktssiden |
| `kilde/opplegg/` | Undervisningsopplegg, og oversiktssiden `index.html` |
| `statisk/css/stil.css` | Alt av stil. Farger er variabler med lys og mørk modus |
| `statisk/js/felles.js` | Felles kode: tallformat, glidebryter, koordinatsystem (med piler og ulike enheter på aksene), lagring, nedlasting, fagvalg, filter |
| `statisk/js/utforsker.js` | Byggeklosser for utforskerne: glidebrytere fra adressefeltet, verditabell, meldinger, figurverktøy, oppgavelenker, tilpass vindu |
| `statisk/js/matte.js` | Tall og uttrykk i TeX (`texTall`, `texPolynom`, `texT`, `texP`) |
| `statisk/js/utforskere/` | Ett skript per utforsker. Den rene matematikken eksporteres, så testene kan sjekke den med tilfeldige verdier |
| `statisk/js/brikker.js` | Algebrabrikker i SVG (brukes av algebrabrikker og faktorisering) |
| `statisk/js/kortsett.js` | Kortbordet: dra og slipp (mus, finger, penn), trykk-og-velg og tastatur, faste plasser på brettet, bytte, tekst som tilpasses kortet |
| `statisk/js/tavle.js` | Tavleoppgaver: ett spørsmål om gangen, piltaster, fullskjerm |
| `statisk/js/ovelse.js` og `statisk/js/ovelser/` | Øvinger: tilfeldige tall (`?frø=`), tolking av elevsvar (brøk, komma, minus) |
| `statisk/js/forside.js` | Den lille parabel-utforskeren på forsiden |
| `statisk/lib/katex/` | KaTeX 0.16.11 (MIT, se `LICENSE`) |
| `data/temaer.json` | Fag og temaer. Temanavnene står bare her |
| `data/planlagt.json` | Utforskere som er planlagt, vist med stiplet kant og «Kommer» (tom nå) |
| `data/ikoner.json` | Små SVG-ikoner til kortene på oversiktssidene (strek-/fyll-klasser fra stilarket) |
| `data/kompetansemaal.json` | Kompetansemål sitert ordrett fra Udir (MAT09-02 og MAT03-02) |
| `data/koblinger.json` | Kobling mellom kompetansemål og ressurser (lærerens vurdering) |
| `verktoy/elevark.py` | Lager elevark (PDF uten fasit) fra oppgavene med LuaLaTeX |
| `verktoy/kortsett.py` og `verktoy/kortfigurer.py` | Lager kortsett til skjerm og utskrift (kort og fasit som PDF), og kontrollerer at kortene i en gruppe har samme verdi |
| `verktoy/fasit/` | Python-skript som regner ut alle tall i oppgaver og fasit |
| `tester/test.mjs` | Automatiske tester i headless Chrome |
| `tester/titt.mjs` | Rask titt på én side under arbeidet: feil, verdier og skjermbilder (`node tester/titt.mjs utforskere/vekst.html "?p=5"`) |
| `docs/` | **Ferdigbygd nettsted. Redigeres aldri for hånd.** |

## Utforskerne

| Utforsker | Fag | Kildefil |
|---|---|---|
| Andregradsfunksjonen | 1T | `andregradsfunksjonen.html` |
| Kvadratsetningene som arealmodeller | 1T | `kvadratsetningene.html` |
| Lineær funksjon | 1T | `lineaer-funksjon.html` |
| Likningssett løst grafisk | 1T | `likningssett.html` |
| Rasjonale funksjoner og asymptoter | 1T, R1 | `rasjonale-funksjoner.html` |
| Eksponentiell og logistisk vekst | 1T, R1 | `vekst.html` |
| Sekant som blir tangent | 1T, R1 | `sekant-tangent.html` |
| Funksjonen og den deriverte | R1 | `funksjon-og-derivert.html` |
| Trekantutforsker | 1T | `trekant.html` |
| Vektorer i planet | R1 | `vektorer.html` |
| Brøk som areal | 1T | `brok-som-areal.html` |
| Algebrabrikker | 1T | `algebrabrikker.html` |
| Potensreglene | 1T | `potenser.html` |
| Fullstendig kvadrat | 1T | `fullstendig-kvadrat.html` |
| abc-formelen og grafen | 1T | `abc-formelen.html` |
| Faktorisering med produkt og sum | 1T | `faktorisering.html` |
| Polynomfunksjoner | 1T | `polynomfunksjoner.html` |
| Potensfunksjoner og rotfunksjoner | 1T | `potensfunksjoner.html` |
| Polynomdivisjon | 1T | `polynomdivisjon.html` |
| Andregradsulikheter | 1T | `andregradsulikheter.html` |
| Modellering og regresjon | 1T | `modellering-og-regresjon.html` |

Hver har en fasitfil i `verktoy/fasit/` med alle tallene i oppgavene og løsningsforslagene.

## Varierende undervisning

| Type | Innhold | Kildefiler |
|---|---|---|
| Kortsett | K1 brøk, figur, desimaltall og prosent · K2 tekst, uttrykk og figur · K3 potenser med samme verdi · K4 potenser i rekkefølge · K5 kvadratsetningene: finn parene · K6 uttrykk, likning, identitet eller funksjon · K7 velg metode · K8 fire former av samme funksjon · K9 fire representasjoner av en lineær funksjon · K10 hvilken type funksjon | `kilde/varierende/<navn>.html` og `<navn>.py` |
| Øvinger | Finn feilen: potenser · Fullfør kvadratet trinn for trinn · Stigningstall og konstantledd ved regning | `kilde/varierende/` og `statisk/js/ovelser/` |
| Tavleoppgaver | Hvilken passer ikke inn? (brøk og funksjoner) · Alltid, noen ganger eller aldri? · Hoderegning med kvadratsetningene · Én likning, tre metoder | `kilde/varierende/` |

Tallene i tavleoppgavene er regnet ut i `verktoy/fasit/tavle.py`. Kortsettene kontrolleres når nettstedet bygges (se [BYGG.md](BYGG.md)).

## Undervisningsopplegg

Ti opplegg om funksjoner i 1T, fra «Hva er en funksjon?» til repetisjon. Hvert opplegg er én fil i `kilde/opplegg/` med varighet, tidsplan, plan for læreren, tips og oppgaver. Formatet er beskrevet i [BYGG.md](BYGG.md). Tallene i oppgavene er regnet ut i `verktoy/fasit/opplegg.py`.

## Lage en ny utforsker

1. Regn ut tallene til oppgavene og fasiten i et skript i `verktoy/fasit/`.
2. Lag `kilde/utforskere/<navn>.html` med hode (se [BYGG.md](BYGG.md)).
3. Lag `statisk/js/utforskere/<navn>.js`. Bruk `Koordinatsystem` og `tall` fra `felles.js`, og `lagGlidere`, `visVerdier`, `figurverktoy` og `oppsettlenker` fra `utforsker.js`. Se for eksempel `lineaer.js`.
4. Fjern utforskeren fra `data/planlagt.json`. Sett `ikon:` i hodet til en nøkkel i `data/ikoner.json`, og legg utforskeren eventuelt inn i `data/koblinger.json`.
5. Kjør `python3 bygg.py` og `npm test`. Legg til tester for den nye utforskeren i `tester/test.mjs`.

## Regler for innhold

- Alle tall i fasiter og eksempler regnes ut med kode før de skrives inn.
- Kompetansemål siteres ordrett og hentes maskinelt fra Udir. Koblingene er lærerens egen vurdering.
- Ingen prøver eller annet vurderingsmateriale i repoet. Repoet er offentlig.
- Ingen tekst eller figurer fra lærebøker, og ingen filer med ukjent lisens.
- Norsk tallformat: desimalkomma, ekte minustegn (−) og mellomrom som tusenskille. Bruk `tall()` fra `felles.js`.
