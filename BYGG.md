# Byggeskriptet (`bygg.py`)

Byggeskriptet lager hele nettstedet i `docs/` fra `kilde/`, `statisk/` og `data/`. Det trenger Python 3.9 eller nyere, Node (for KaTeX) og LuaLaTeX (for elevark), men ingen Python-pakker. LuaLaTeX følger med TeX Live / MacTeX, og elevarkene bruker bare pakker og skrifter derfra (TeX Gyre Pagella og Heros).

```sh
python3 bygg.py            # bygg
python3 bygg.py --sjekk    # tørrkjøring: lister nye, endrede og foreldede filer, skriver ingenting
python3 bygg.py --rydd     # bygg, og flytt filer som ikke lenger lages til .bygg-backup/<tid>/
```

Skriptet skriver bare filer som faktisk er endret. Det sletter aldri noe uten `--rydd`, og da flyttes filene til en sikkerhetskopi.

## Kildefiler

En kildefil er HTML med et hode øverst:

```html
---
tittel: Andregradsfunksjonen
beskrivelse: Kort tekst til oversikten og søkemotorer.
type: utforsker              # utforsker | opplegg | kortsett | ovelse | tavle | side (standard)
fag: 1T, R1                  # fra data/temaer.json
tema: funksjoner, likninger  # id-er fra data/temaer.json
skript: utforskere/andregrad.js   # relativt til statisk/js/
ikon: lineaer                # nøkkel i data/ikoner.json (valgfritt, standard er filnavnet)
meny: utforskere             # hvilket menypunkt som er aktivt (valgfritt)
oppsett: forside             # bare forsiden: innholdet pakkes ikke inn i <section class="side">
rekkefolge: 3                # kortsett, øvinger og tavleoppgaver: plass i oversikten (rekkefølgen i faget)
---
<p class="ingress">…</p>
```

Vanlige sider pakkes inn i `<section class="side"><div class="ramme">…</div></section>`, som på fysikklab.no. For `type: utforsker` og `type: opplegg` legger skriptet selv til brødsmuler («Utforskere / 1T · Funksjoner») og overskriften.

## Formler

Skriv `$…$` for formler i teksten og `$$…$$` for formler på egen linje. Formlene tegnes med KaTeX **når siden bygges**, så de vises også uten JavaScript. Skriv `\$` for et vanlig dollartegn. Bruk `{,}` for desimalkomma i formler, for eksempel `$0{,}5$`. Resultatene mellomlagres i `.bygg-cache/`.

## Plassholdere

| Plassholder | Blir til |
|---|---|
| `{{rot}}` | Relativ sti til rota (`""` eller `"../"`) – bruk i alle interne lenker |
| `{{filter}}` | Filterpanel (fag, temaknapper, søk) |
| `{{liste:utforsker}}`, `{{liste:opplegg}}` | Kort med ikon, gruppert i temablokker (etter første tema) |
| `{{liste:varierende}}` | Kortsett, øvinger og tavleoppgaver, én blokk per type |
| `{{kortsett}}` | Kortene, knappene og lenkene til PDF-ene. Påkrevd på `type: kortsett` |
| `{{tavlestyring}}` | Knappene over tavleoppgavene (forrige, neste, vis alle, fullskjerm) |
| `{{elevark}}` | Knapp for å laste ned elevarket (PDF) og LaTeX-kilden. Påkrevd på utforskere med oppgaver |
| `{{figurverktoy}}` | Knapperaden under figuren: vis hele grafen, zoom, standardvindu, tilbakestill, last ned PNG/SVG, kopier lenke |
| `{{figurverktoy:enkel}}` | Samme uten zoom og vindusknapper, for figurer uten koordinatsystem |
| `{{fagkort}}` | De to store fagkortene på forsiden, med temaer og antall utforskere |
| `{{kompetansemaal}}` | Kompetansemålene med koblinger (lærersiden) |

## Kontroller

Bygget stopper med en feilmelding hvis
- hodet mangler tittel eller beskrivelse, eller har ukjent fag, tema eller skript
- en formel har feil i TeX
- en intern lenke peker på en fil som ikke finnes
- `data/koblinger.json` viser til et mål eller en ressurs som ikke finnes

## Elevark (PDF)

For hver utforsker med `<section class="oppgaver">` lager skriptet et elevark i `docs/elevark/<navn>.pdf`, og LaTeX-kilden i `docs/elevark/<navn>.tex`. Koden ligger i `verktoy/elevark.py`.

- Oppgavene hentes fra kildefila. Alt inne i `<details>` (løsningsforslagene) hoppes over, så elevarket har aldri fasit.
- Formler i `$…$` og `$$…$$` går rett over i LaTeX. Skriv derfor variabler i oppgavetekst og lenketekst som formler (`$a = 1$`), ikke som vanlig tekst.
- Arket har navnelinje, QR-kode og adresse til utforskeren, og skriveplass etter hvert steg (se `SVARPLASS`).
- PDF-en mellomlagres i `.bygg-cache/elevark/` etter sjekksummen til LaTeX-koden. Den kompileres bare når oppgavene endres, og fast tidsstempel gjør at samme kilde gir nøyaktig samme fil.
- Mangler lualatex, beholdes den forrige PDF-en i `docs/` med en advarsel. Finnes ingen, stopper bygget.
- Bygget stopper hvis LaTeX feiler, eller hvis et tegn mangler i skriften.

## Kortsett

Et kortsett er to filer i `kilde/varierende/`: siden (`<navn>.html`, `type: kortsett`, med `{{kortsett}}`) og kortene (`<navn>.py`). Se forklaringen øverst i `verktoy/kortsett.py`. Kort fortalt:

```python
from kortsett import kort
from kortfigurer import Brok, Brikker, Parabel

KODE = "K5"                 # står på hvert utskrevne kort, for eksempel K5-07
TYPE = "grupper"            # grupper | sorter | ordne
STORRELSE = 2               # grupper: antall kort per gruppe
OPPGAVE = "Finn to og to uttrykk som er like."
GRUPPER = [[kort("$(a + b)^2$", verdi=lambda a, b: (a + b) ** 2), kort("$a^2 + 2ab + b^2$", verdi=lambda a, b: a*a + 2*a*b + b*b)], …]
FASITNOTAT = "Tips til læreren i fasiten."
```

- **Kontroll:** Alle kort i en gruppe må ha samme verdi, og to grupper kan ikke ha samme verdi. Verdien er et tall, en brøk (`Fraction`) eller en funksjon. Funksjoner sammenlignes eksakt i faste brøkpunkter. Figurer (`Brok`, `Brikker`, `Parabel`) regner ut verdien selv. Bygget stopper hvis noe ikke stemmer.
- **Sortering:** `KATEGORIER = [("id", "Navn"), …]` og `kort(..., riktig=["id"], kommentar="…")`. Flere lovlige bokser er lov. Kommentaren vises etter «Sjekk» og står i fasiten.
- **Rekkefølge:** `kort(..., verdi=…)`. Ingen to kort kan ha samme verdi.
- **Utskrift:** `docs/kortsett/<navn>.pdf` (A4, 3 × 6 kort med stiplede klippelinjer, kode i hjørnet og en rad blanke kort) og `docs/kortsett/<navn>-fasit.pdf`. LaTeX-kildene ligger ved siden av. Stokkingen er fast (frø = koden), så nummeret på skjermen og på papiret er det samme.
- Skriptet `kortsett.js` legges til automatisk.

## Tavleoppgaver og øvinger

- **Tavleoppgaver** (`type: tavle`) er en vanlig liste `<ol class="tavle-liste">` med `<li class="tavle-kort">`, et `<div class="tavle-sporsmal">` og et `<details class="tavle-svar">`. Sett `{{tavlestyring}}` over lista. Skriptet `tavle.js` legges til automatisk.
- **Øvinger** (`type: ovelse`) har eget skript i `statisk/js/ovelser/`. Oppgavene lages med `lagTilfeldig()` fra `ovelse.js`, og svarene tolkes med `tolkSvar()`. Lag oppgavene baklengs fra svaret, så fasiten er riktig per konstruksjon.
