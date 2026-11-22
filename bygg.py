#!/usr/bin/env python3
"""Byggeskript for mattelab.no.

Leser kildefiler i kilde/, setter dem inn i malen kilde/maler/side.html,
tegner formler med KaTeX og skriver ferdige sider til docs/.

Bruk:
    python3 bygg.py            bygg nettstedet til docs/
    python3 bygg.py --sjekk    tørrkjøring: vis hva som ville blitt endret, skriv ingenting
    python3 bygg.py --rydd     bygg, og slett filer i docs/ som ikke lenger lages
                               (de tas først vare på i .bygg-backup/)

Se BYGG.md for kildeformatet.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROT / "verktoy"))
from elevark import Elevarkfeil, kompiler, lag_tex  # noqa: E402
from kortsett import Kortfeil, bygg_kortsett  # noqa: E402
KILDE = ROT / "kilde"
STATISK = ROT / "statisk"
DATA = ROT / "data"
UT = ROT / "docs"
CACHE = ROT / ".bygg-cache"
DOMENE = "mattelab.no"

MENY = [
    ("utforskere", "Utforskere", "utforskere/index.html"),
    ("varierende", "Varierende undervisning", "varierende/index.html"),
    ("opplegg", "Undervisningsopplegg", "opplegg/index.html"),
    ("laerer", "For lærere", "laerer.html"),
    ("om", "Om", "om.html"),
]
MENY_TEKST = [(mid, tekst) for mid, tekst, _ in MENY]

# Kildemapper og hvor sidene havner i docs/
MAPPER = {
    "sider": "",
    "utforskere": "utforskere/",
    "varierende": "varierende/",
    "opplegg": "opplegg/",
}

# Typene under «Varierende undervisning», i den rekkefølgen de vises på oversiktssiden
VARIERENDE = {
    "kortsett": ("Kortsett", "Koble, sorter og ordne kort. På skjermen eller skrevet ut og klippet til."),
    "ovelse": ("Øvinger", "Oppgaver med tilbakemelding med en gang. Nye tall hver gang."),
    "tavle": ("Tavleoppgaver", "Spørsmål til hele klassen, ett om gangen på storskjerm. Svarforslag kan vises etter samtalen."),
}

TYPE_NAVN = {"utforsker": "Utforsker", "opplegg": "Undervisningsopplegg",
             "kortsett": "Kortsett", "ovelse": "Øving", "tavle": "Tavleoppgave"}
TYPE_OVERSIKT = {"utforsker": "utforskere/index.html", "opplegg": "opplegg/index.html",
                 **{t: "varierende/index.html" for t in VARIERENDE}}
TYPE_MENY = {"utforsker": "utforskere", "opplegg": "opplegg", **{t: "varierende" for t in VARIERENDE}}


# Knapperaden over tavleoppgavene (se statisk/js/tavle.js)
TAVLESTYRING = """<div class="tavle-styring kun-js" hidden>
    <button type="button" class="knapp lys liten tavle-forrige"><span aria-hidden="true">←</span> Forrige</button>
    <span class="tavle-teller"></span>
    <button type="button" class="knapp liten tavle-neste">Neste <span aria-hidden="true">→</span></button>
    <span class="tavle-tips">Du kan også bruke piltastene.</span>
    <button type="button" class="knapp lys liten tavle-alle" aria-pressed="false">Vis alle</button>
    <button type="button" class="knapp lys liten tavle-fullskjerm" hidden>Fullskjerm</button>
  </div>"""


class Byggefeil(Exception):
    pass


ADVARSLER: list[str] = []


def figurverktoy(variant: str) -> str:
    """Knapperaden under figuren. «enkel» er for figurer uten koordinatsystem (ingen zoom)."""
    knapper = []
    if variant != "enkel":
        knapper += [
            '<button type="button" class="knapp liten" id="vis-alt">Vis hele grafen</button>',
            '<button type="button" class="knapp lys liten" id="zoom-inn">Zoom inn</button>',
            '<button type="button" class="knapp lys liten" id="zoom-ut">Zoom ut</button>',
            '<button type="button" class="knapp lys liten" id="standardvindu">Standardvindu</button>',
        ]
    knapper += [
        '<button type="button" class="knapp lys liten" id="tilbakestill">Tilbakestill</button>',
        '<button type="button" class="knapp lys liten" id="last-ned-png">Last ned PNG</button>',
        '<button type="button" class="knapp lys liten" id="last-ned-svg">Last ned SVG</button>',
        '<button type="button" class="knapp lys liten" id="kopier-lenke">Kopier lenke til oppsettet</button>',
        '<span id="lenkestatus" class="lenkestatus" role="status"></span>',
    ]
    return '<div class="sim-knapper kun-js" id="figurverktoy">\n' + "\n".join("    " + k for k in knapper) + "\n  </div>"


def elevark(s: dict) -> tuple[bytes, bytes] | None:
    """Lag elevark (PDF og LaTeX-kilde) for en utforsker med oppgaver. Fasiten tas ikke med."""
    if '<section class="oppgaver"' not in s["innhold"]:
        return None
    if "{{elevark}}" not in s["innhold"]:
        raise Byggefeil(f"{s['kilde']}: har oppgaver, men mangler {{{{elevark}}}} der nedlastingsknappen skal stå")
    url = f"https://{DOMENE}/{s['ut']}"
    try:
        tex = lag_tex(s["tittel"], s["fag"], url, s["innhold"], "Opplegget" if s["type"] == "opplegg" else "Utforskeren")
    except Elevarkfeil as e:
        raise Byggefeil(f"{s['kilde']}: elevark: {e}")
    try:
        pdf = kompiler(tex, CACHE / "elevark")
    except Elevarkfeil as e:
        gammel = UT / "elevark" / f"{s['id']}.pdf"
        if gammel.exists():
            ADVARSLER.append(f"{s['kilde']}: kunne ikke lage elevark ({e}). Beholder den gamle PDF-en, som kan være utdatert.")
            pdf = gammel.read_bytes()
        else:
            raise Byggefeil(f"{s['kilde']}: elevark: {e}")
    return pdf, tex.encode("utf-8")


def lag_kortsett(s: dict, sti: Path) -> None:
    """Sett inn kortene der {{kortsett}} står, og lag PDF-ene (kort og fasit)."""
    data = sti.with_suffix(".py")
    if not data.is_file():
        raise Byggefeil(f"{s['kilde']}: kortsett trenger kortene i {data.relative_to(ROT)}")
    if "{{kortsett}}" not in s["innhold"]:
        raise Byggefeil(f"{s['kilde']}: mangler {{{{kortsett}}}} der kortene skal stå")
    try:
        html_, filer = bygg_kortsett(s["id"], data, s["tittel"], s["fag"], f"https://{DOMENE}/{s['ut']}", CACHE / "kortsett")
    except (Kortfeil, Elevarkfeil) as e:
        raise Byggefeil(f"{data.relative_to(ROT)}: {e}")
    s["innhold"] = s["innhold"].replace("{{kortsett}}", html_)
    s["filer"] = filer


def maal_sitat(km: dict, fag: str, numre: str, kilde: str) -> str:
    """Kompetansemål sitert ordrett fra data/kompetansemaal.json: {{maal:1T:3,9}}."""
    if fag not in km["fag"]:
        raise Byggefeil(f"{kilde}: ukjent fag {fag!r} i {{{{maal:…}}}}")
    alle = km["fag"][fag]["maal"]
    deler = []
    for nr in numre.split(","):
        i = int(nr)
        if not 1 <= i <= len(alle):
            raise Byggefeil(f"{kilde}: {fag} har ikke mål nr. {i}")
        deler.append(f'<li><span class="maal-nr">{esc(fag)}, mål {i}</span> «{esc(alle[i - 1])}»</li>')
    return ('<ul class="maal-sitat">' + "".join(deler) + "</ul>"
            f'<p class="maal-kilde">Sitert fra <a href="{esc(km["fag"][fag]["url"])}">{esc(km["fag"][fag]["laereplan"])}</a> '
            f'(Utdanningsdirektoratet). Koblingen til målene er lærerens egen vurdering.</p>')


TIDSPLAN = re.compile(r'<ol class="tidsplan">(.*?)</ol>\s*<!-- /tidsplan -->', re.S)
TIDSDEL = re.compile(r'<li class="tidsdel" data-min="(\d+)">\s*<h3>(.*?)</h3>', re.S)


def lag_tidsplan(s: dict) -> None:
    """Undervisningsopplegg: sjekk at delene i tidsplanen summerer til varigheten,
    sett inn klokkeslett («0–10 min») i hver del, og lag tidslinja over planen."""
    if s.get("varighet") not in ("45", "90", "135"):
        raise Byggefeil(f"{s['kilde']}: undervisningsopplegg må ha varighet: 45, 90 eller 135")
    m = TIDSPLAN.search(s["innhold"])
    if not m:
        raise Byggefeil(f"{s['kilde']}: mangler <ol class=\"tidsplan\"> … </ol> <!-- /tidsplan -->")
    deler = TIDSDEL.findall(m.group(1))
    if not deler or len(deler) != m.group(1).count("<li class=\"tidsdel\""):
        raise Byggefeil(f"{s['kilde']}: hver del i tidsplanen må være <li class=\"tidsdel\" data-min=\"…\"><h3>…</h3>")
    total = sum(int(d) for d, _ in deler)
    if total != int(s["varighet"]):
        raise Byggefeil(f"{s['kilde']}: delene i tidsplanen er {total} minutter til sammen, men varigheten er {s['varighet']}")
    start = 0
    linje = []

    def merk(t):
        nonlocal start
        lengde = int(t.group(1))
        tid = f"{start}–{start + lengde} min"
        navn = re.sub(r"<[^>]+>", "", t.group(2)).strip()
        linje.append(f'<li style="--min: {lengde}"><span class="tidslinje-tid">{tid}</span>'
                     f'<span class="tidslinje-navn">{navn}</span></li>')
        start += lengde
        return (f'<li class="tidsdel" data-min="{lengde}"><p class="tidsdel-tid">{tid}'
                f'<span class="visuelt-skjult">, {lengde} minutter</span></p>\n  <h3>{t.group(2)}</h3>')

    ny = TIDSDEL.sub(merk, m.group(1))
    tidslinje = ('<ol class="tidslinje" aria-label="Tidsplanen i korte trekk">' + "".join(linje) + "</ol>")
    s["innhold"] = s["innhold"][:m.start()] + tidslinje + f'\n<ol class="tidsplan">{ny}</ol>' + s["innhold"][m.end():]



# ---------------------------------------------------------------- kildefiler

def les_kilde(sti: Path) -> tuple[dict, str]:
    """Del en kildefil i hode (nøkkel: verdi) og innhold."""
    tekst = sti.read_text(encoding="utf-8")
    if not tekst.startswith("---\n"):
        raise Byggefeil(f"{sti.relative_to(ROT)}: mangler hode som starter med ---")
    slutt = tekst.find("\n---\n", 4)
    if slutt < 0:
        raise Byggefeil(f"{sti.relative_to(ROT)}: hodet er ikke avsluttet med ---")
    hode: dict = {}
    for nr, linje in enumerate(tekst[4:slutt].splitlines(), start=2):
        if not linje.strip() or linje.lstrip().startswith("#"):
            continue
        if ":" not in linje:
            raise Byggefeil(f"{sti.relative_to(ROT)}:{nr}: forventet 'nøkkel: verdi'")
        n, v = linje.split(":", 1)
        hode[n.strip()] = v.strip()
    for felt in ("fag", "tema", "skript"):
        hode[felt] = [x.strip() for x in hode.get(felt, "").split(",") if x.strip()]
    hode.setdefault("type", "side")
    return hode, tekst[slutt + 5:]


# ---------------------------------------------------------------- formler

FORMEL = re.compile(r"(?<!\\)\$\$(.+?)(?<!\\)\$\$|(?<!\\)\$(.+?)(?<!\\)\$([.,;:!?)]*)", re.S)
BESKYTT = re.compile(r"<(script|pre|code|style)\b.*?</\1>", re.S | re.I)


def finn_formler(innhold: str) -> list[tuple[str, bool]]:
    ut = []
    for blokk in deler_uten_beskyttet(innhold):
        for m in FORMEL.finditer(blokk):
            ut.append(((m.group(1) or m.group(2)).strip(), m.group(1) is not None))
    return ut


def deler_uten_beskyttet(innhold: str):
    pos = 0
    for m in BESKYTT.finditer(innhold):
        yield innhold[pos:m.start()]
        pos = m.end()
    yield innhold[pos:]


def tegn_formler(alle: list[tuple[str, bool]]) -> dict:
    """Tegn formler med KaTeX via Node. Resultatet mellomlagres i .bygg-cache/."""
    CACHE.mkdir(exist_ok=True)
    cachefil = CACHE / "katex.json"
    try:
        cache = json.loads(cachefil.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    nokkel = lambda tex, d: ("D:" if d else "I:") + tex
    mangler = sorted({(t, d) for t, d in alle if nokkel(t, d) not in cache})
    if mangler:
        if shutil.which("node") is None:
            raise Byggefeil("Fant ikke node. Node trengs for å tegne formler med KaTeX (se BYGG.md).")
        svar = subprocess.run(
            ["node", str(ROT / "verktoy" / "katex-render.cjs")],
            input=json.dumps([{"tex": t, "display": d} for t, d in mangler]),
            capture_output=True, text=True, check=False,
        )
        if svar.returncode != 0:
            raise Byggefeil("KaTeX-tegning feilet:\n" + svar.stderr)
        res = json.loads(svar.stdout)
        if res["feil"]:
            raise Byggefeil("Feil i formler:\n  " + "\n  ".join(res["feil"]))
        for (t, d), h in zip(mangler, res["ut"]):
            cache[nokkel(t, d)] = h
        cachefil.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    return {(t, d): cache[nokkel(t, d)] for t, d in alle}


def sett_inn_formler(innhold: str, tegnet: dict) -> str:
    def bytt(m):
        tex = (m.group(1) or m.group(2)).strip()
        h = tegnet[(tex, m.group(1) is not None)]
        # Tegn rett etter en formel (komma, punktum …) skal ikke havne alene på neste linje
        return f'<span class="nobr">{h}{m.group(3)}</span>' if m.group(3) else h

    ut, pos = [], 0
    for m in BESKYTT.finditer(innhold):
        ut.append(FORMEL.sub(bytt, innhold[pos:m.start()]))
        ut.append(m.group(0))
        pos = m.end()
    ut.append(FORMEL.sub(bytt, innhold[pos:]))
    return "".join(ut).replace("\\$", "$")


# ---------------------------------------------------------------- byggeklosser

def esc(s: str) -> str:
    return html.escape(s, quote=True)


def fagklasse(fag: str) -> str:
    """CSS-klasse for fagfargen (t1 = 1T, r1 = R1)."""
    return {"1T": "t1", "R1": "r1"}.get(fag, "")


def fag_merker(r: dict) -> str:
    deler = [f'<span class="fag-merke {fagklasse(f)}">{esc(f)}</span>' for f in r["fag"]]
    if r.get("varighet"):
        deler.append(f'<span class="fag-merke varighet">{esc(r["varighet"])} min</span>')
    if r.get("planlagt"):
        deler.append('<span class="fag-merke kommer">Kommer</span>')
    return '<span class="fag-merker">' + "".join(deler) + "</span>"


def ikon(nokkel: str, ikoner: dict) -> str:
    inn = ikoner.get(nokkel) or ikoner["_standard"]
    return f'<svg class="sim-ikon" viewBox="0 0 120 72" aria-hidden="true">{inn}</svg>'


def kort(r: dict, temanavn: dict, ikoner: dict, rot: str) -> str:
    sok = " ".join([r["tittel"], r["beskrivelse"], *r["fag"], *(temanavn[t] for t in r["tema"]),
                    f'{r["varighet"]} min' if r.get("varighet") else ""]).lower()
    attr = f'data-fag="{esc(" ".join(r["fag"]))}" data-tema="{esc(" ".join(r["tema"]))}" data-tekst="{esc(sok)}"'
    innhold = (ikon(r.get("ikon") or r["id"], ikoner)
               + f'<span class="sim-kort-tekst"><span class="sim-kort-tittel">{esc(r["tittel"])}</span>'
               f'<span>{esc(r["beskrivelse"])}</span>{fag_merker(r)}</span>')
    if r.get("planlagt"):
        return f'<li {attr}><div class="sim-kort planlagt">{innhold}</div></li>'
    return f'<li {attr}><a class="sim-kort" href="{rot}{r["ut"]}">{innhold}</a></li>'


def filterpanel(temaer: list[dict], fagliste: list[dict]) -> str:
    """Filter som på fysikklab.no: rader med fag, tema og søk. Vises bare med JavaScript."""
    fag = "".join(f'<button type="button" class="filter-knapp {fagklasse(f["id"])}" data-fag="{esc(f["id"])}">{esc(f["navn"])}</button>'
                  for f in fagliste)
    tema = "".join(f'<button type="button" class="filter-knapp" data-tema="{esc(t["id"])}">{esc(t["navn"])}</button>'
                   for t in temaer)
    return f"""<div class="filter" role="search" aria-label="Filtrer innholdet på siden" hidden>
  <div class="filter-rad" role="group" aria-label="Fag"><span class="filter-etikett">Fag</span><button type="button" class="filter-knapp" data-fag="">Alle</button>{fag}<span class="filter-merknad">Valget huskes på alle sidene og kan også endres i menyen øverst.</span></div>
  <div class="filter-rad" role="group" aria-label="Tema"><span class="filter-etikett">Tema</span><button type="button" class="filter-knapp" data-tema="">Alle</button>{tema}</div>
  <div class="filter-rad"><label class="filter-etikett" for="filter-sok">Søk</label><input id="filter-sok" class="filter-sok" type="search" placeholder="For eksempel toppunkt eller vektor" autocomplete="off"><span class="filter-antall" aria-live="polite"></span></div>
</div>
<p class="filter-tom" hidden>Ingenting passer med filteret. <button type="button" class="filter-knapp" data-filter="nullstill">Vis alt</button></p>"""


def liste(ressurser: list[dict], typ: str, temaer: list[dict], temanavn: dict, ikoner: dict, rot: str) -> str:
    """Kort gruppert i temablokker. En ressurs står under sitt første tema."""
    valgte = [r for r in ressurser if r["type"] == typ]
    if not valgte:
        return '<p class="merknad">Det er ingen her ennå.</p>'
    ut = []
    for t in temaer:
        her = [r for r in valgte if r["tema"][0] == t["id"]]
        if not her:
            continue
        # Undervisningsopplegg står i rekkefølgen de er tenkt brukt (feltet «rekkefolge»)
        her.sort(key=lambda r: (bool(r.get("planlagt")), int(r.get("rekkefolge") or 99), r["tittel"].lower()))
        ut.append(f'<div class="tema-blokk" data-blokk="{esc(t["id"])}"><h2>{esc(t["navn"])}</h2>'
                  f'<ul class="sim-kort-liste">' + "".join(kort(r, temanavn, ikoner, rot) for r in her) + "</ul></div>")
    if any(r.get("planlagt") for r in valgte):
        ut.append('<p class="merknad">Kort med stiplet kant er planlagt, men ikke laget ennå.</p>')
    return "\n".join(ut)


def liste_opplegg(ressurser: list[dict], fagliste: list[dict], temanavn: dict, ikoner: dict, rot: str) -> str:
    """Undervisningsoppleggene: én blokk per fag, i den rekkefølgen de er tenkt brukt (feltet «rekkefolge»)."""
    valgte = [r for r in ressurser if r["type"] == "opplegg"]
    ut = []
    for f in fagliste:
        her = [r for r in valgte if r["fag"][0] == f["id"]]
        if not her:
            continue
        her.sort(key=lambda r: (bool(r.get("planlagt")), int(r.get("rekkefolge") or 99), r["tittel"].lower()))
        ut.append(f'<div class="tema-blokk" data-blokk="{esc(f["id"])}"><h2>{esc(f["langt"])}</h2>'
                  f'<ul class="sim-kort-liste">' + "".join(kort(r, temanavn, ikoner, rot) for r in her) + "</ul></div>")
    return "\n".join(ut) or '<p class="merknad">Det er ingen her ennå.</p>'


def liste_varierende(ressurser: list[dict], temaer: list[dict], temanavn: dict, ikoner: dict, rot: str) -> str:
    """Oversikten over «Varierende undervisning»: én blokk per type (kortsett, øvinger, tavleoppgaver).
    Innenfor hver blokk står ressursene i den rekkefølgen temaene kommer i faget (feltet «rekkefolge»)."""
    tema_nr = {t["id"]: i for i, t in enumerate(temaer)}
    ut = []
    for typ, (navn, inngang) in VARIERENDE.items():
        her = [r for r in ressurser if r["type"] == typ]
        if not her:
            continue
        her.sort(key=lambda r: (int(r.get("rekkefolge") or 99), tema_nr[r["tema"][0]], r["tittel"].lower()))
        ut.append(f'<div class="tema-blokk" data-blokk="{esc(typ)}"><h2>{esc(navn)}</h2><p class="del-inngang">{esc(inngang)}</p>'
                  f'<ul class="sim-kort-liste">' + "".join(kort({**r, "ikon": r.get("ikon") or typ}, temanavn, ikoner, rot) for r in her)
                  + "</ul></div>")
    return "\n".join(ut) or '<p class="merknad">Det er ingen her ennå.</p>'


def fagkort(fagliste: list[dict], temaer: list[dict], ressurser: list[dict], rot: str) -> str:
    """De to store fagkortene på forsiden, som på fysikklab.no."""
    ut = []
    for f in fagliste:
        tema = "".join(f"<li>{esc(t['navn'])}</li>" for t in temaer if f["id"] in t["fag"])
        alle = [r for r in ressurser if r["type"] == "utforsker" and f["id"] in r["fag"]]
        ferdige = sum(1 for r in alle if not r.get("planlagt"))
        status = f"{ferdige} {'utforsker' if ferdige == 1 else 'utforskere'}" + (f", {len(alle) - ferdige} på vei" if len(alle) > ferdige else "")
        ut.append(f'<a class="fag-kort {fagklasse(f["id"])}" href="{rot}utforskere/index.html?fag={esc(f["id"])}">'
                  f'<span class="niva">{esc(f["niva"])}</span><h3>{esc(f["langt"])} <span class="pil" aria-hidden="true">→</span></h3>'
                  f'<ul class="tema">{tema}</ul><p class="status">{esc(status)}</p></a>')
    return '<div class="fag">' + "".join(ut) + "</div>"


def kompetansemaal_html(km: dict, koblinger: dict, ressurser: list[dict], rot: str) -> str:
    ut = []
    titler = {r["id"]: r for r in ressurser}
    for fag, d in km["fag"].items():
        ut.append(f'<section class="km-fag" aria-labelledby="km-{esc(fag)}">')
        ut.append(f'<h2 id="km-{esc(fag)}">{esc(d["overskrift"])}</h2>')
        ut.append(f'<p class="kilde">Kilde: <a href="{esc(d["url"])}">{esc(d["laereplan"])} ({esc(d["kode"])})</a>, '
                  f'Utdanningsdirektoratet. Sitert ordrett. Hentet {esc(km["hentet"])}.</p>')
        ut.append('<p class="merknad">Mål for opplæringen er at eleven skal kunne</p>')
        ut.append('<ol class="km-liste">')
        for i, maal in enumerate(d["maal"], start=1):
            ids = koblinger.get(fag, {}).get(str(i), [])
            if ids:
                lenker = ", ".join(f'<a href="{rot}{titler[x]["ut"]}">{esc(titler[x]["tittel"])}</a>' for x in ids)
                kob = f'<p class="km-kobling"><span class="km-kobling-etikett">Ressurser (lærerens vurdering):</span> {lenker}</p>'
            else:
                kob = '<p class="km-kobling km-ingen">Ingen ressurser koblet ennå.</p>'
            ut.append(f'<li><p class="km-mal">{esc(maal)}</p>{kob}</li>')
        ut.append("</ol></section>")
    return "\n".join(ut)


# ---------------------------------------------------------------- hovedbygging

def finn_kilder() -> list[tuple[Path, str]]:
    ut = []
    for mappe, prefiks in MAPPER.items():
        for sti in sorted((KILDE / mappe).glob("*.html")):
            ut.append((sti, prefiks + sti.name))
    return ut


def bygg_alt() -> dict[str, bytes]:
    """Returner {relativ sti i docs/: innhold} for hele nettstedet."""
    tema_data = json.loads((DATA / "temaer.json").read_text(encoding="utf-8"))
    temanavn = {t["id"]: t["navn"] for t in tema_data["temaer"]}
    fag_ids = {f["id"] for f in tema_data["fag"]}
    km = json.loads((DATA / "kompetansemaal.json").read_text(encoding="utf-8"))
    koblinger = json.loads((DATA / "koblinger.json").read_text(encoding="utf-8"))
    planlagt = json.loads((DATA / "planlagt.json").read_text(encoding="utf-8"))
    ikoner = json.loads((DATA / "ikoner.json").read_text(encoding="utf-8"))
    mal = (KILDE / "maler" / "side.html").read_text(encoding="utf-8")

    sider = []
    for sti, ut in finn_kilder():
        hode, innhold = les_kilde(sti)
        navn = sti.relative_to(ROT)
        for f in ("tittel", "beskrivelse"):
            if not hode.get(f):
                raise Byggefeil(f"{navn}: mangler '{f}' i hodet")
        for f in hode["fag"]:
            if f not in fag_ids:
                raise Byggefeil(f"{navn}: ukjent fag '{f}' (se data/temaer.json)")
        for t in hode["tema"]:
            if t not in temanavn:
                raise Byggefeil(f"{navn}: ukjent tema '{t}' (se data/temaer.json)")
        for s in hode["skript"]:
            if not (STATISK / "js" / s).is_file():
                raise Byggefeil(f"{navn}: finner ikke skriptet statisk/js/{s}")
        side = {**hode, "id": sti.stem, "ut": ut, "innhold": innhold, "kilde": str(navn), "filer": {}}
        if hode["type"] == "kortsett":
            lag_kortsett(side, sti)
        if hode["type"] == "opplegg":
            lag_tidsplan(side)
        # Kortsett og tavleoppgaver har felles skript som legges til automatisk
        felles = {"kortsett": "kortsett.js", "tavle": "tavle.js"}.get(hode["type"])
        if felles and felles not in side["skript"]:
            side["skript"] = side["skript"] + [felles]
        sider.append(side)

    # Navnet brukes i elevark, kortsett og koblinger, så det må være unikt på tvers av mappene
    sett: dict[str, str] = {}
    for s in sider:
        if s["id"] != "index" and s["id"] in sett:
            raise Byggefeil(f"{s['kilde']}: samme filnavn som {sett[s['id']]}. Gi en av dem et annet navn.")
        sett[s["id"]] = s["kilde"]
    ressurser = [s for s in sider if s["type"] in TYPE_NAVN]
    for p in planlagt:
        for t in p["tema"]:
            if t not in temanavn:
                raise Byggefeil(f"data/planlagt.json: ukjent tema '{t}'")
        ressurser.append({**p, "planlagt": True, "id": "", "ut": ""})
    ids = {r["id"] for r in ressurser if r["id"]}
    for fag, k in koblinger.items():
        if fag.startswith("_"):
            continue
        for nr, lst in k.items():
            if not 1 <= int(nr) <= len(km["fag"][fag]["maal"]):
                raise Byggefeil(f"data/koblinger.json: {fag} har ikke mål nr. {nr}")
            for x in lst:
                if x not in ids:
                    raise Byggefeil(f"data/koblinger.json: ukjent ressurs '{x}'")

    # Formler i alle sider tegnes i én omgang
    tegnet = tegn_formler([f for s in sider for f in finn_formler(s["innhold"])])

    filer: dict[str, bytes] = {}
    for s in sider:
        rot = "../" * s["ut"].count("/")
        ark = elevark(s)
        if ark:
            filer[f"elevark/{s['id']}.pdf"], filer[f"elevark/{s['id']}.tex"] = ark
        filer.update(s["filer"])
        innhold = sett_inn_formler(s["innhold"], tegnet)
        if s["type"] in TYPE_NAVN:
            # Brødsmuler som på fysikklab.no: «Utforskere / 1T · Funksjoner»
            oversikt = dict(MENY_TEKST)[TYPE_MENY[s["type"]]]
            til = f'{rot}{TYPE_OVERSIKT[s["type"]]}'
            fagtekst = " og ".join(s["fag"])
            tematekst = ", ".join(temanavn[t] for t in s["tema"])
            filter_url = f'{til}?fag={s["fag"][0]}&amp;tema={s["tema"][0]}' if len(s["fag"]) == 1 else f'{til}?tema={s["tema"][0]}'
            topp = (f'<p class="brodsmuler"><a href="{til}">{esc(oversikt)}</a> / '
                    f'<a href="{filter_url}">{esc(fagtekst)} · {esc(tematekst)}</a></p>'
                    f'<h1>{esc(s["tittel"])}</h1>')
            if s.get("varighet"):
                topp += (f'<p class="opplegg-merke"><span>{esc(s["varighet"])} minutter</span>'
                         f'<span>{esc(fagtekst)}</span></p>')
            innhold = topp + innhold
        if s.get("oppsett") != "forside":
            klasse = "side sim-side" if s["type"] == "utforsker" else "side"
            innhold = f'<section class="{klasse}">\n<div class="ramme">\n{innhold.strip()}\n</div>\n</section>' 
        erstatt = {
            "{{filter}}": filterpanel(tema_data["temaer"], tema_data["fag"]),
            "{{liste:utforsker}}": liste(ressurser, "utforsker", tema_data["temaer"], temanavn, ikoner, rot),
            "{{liste:opplegg}}": liste_opplegg(ressurser, tema_data["fag"], temanavn, ikoner, rot),
            "{{liste:varierende}}": liste_varierende(ressurser, tema_data["temaer"], temanavn, ikoner, rot),
            "{{fagkort}}": fagkort(tema_data["fag"], tema_data["temaer"], ressurser, rot),
            "{{elevark}}": (f'<p class="elevark-lenke"><a class="knapp lys liten" href="{rot}elevark/{s["id"]}.pdf" download>'
                            f'Last ned elevark (PDF)</a> <a class="elevark-tex" href="{rot}elevark/{s["id"]}.tex" download>'
                            f'LaTeX-kilde til eget bruk</a></p>'),
            "{{kompetansemaal}}": kompetansemaal_html(km, koblinger, ressurser, rot),
            "{{tavlestyring}}": TAVLESTYRING,
            "{{rot}}": rot,
        }
        for k, v in erstatt.items():
            innhold = innhold.replace(k, v)
        innhold = re.sub(r"\{\{figurverktoy(?::(\w+))?\}\}", lambda m: figurverktoy(m.group(1) or ""), innhold)
        innhold = re.sub(r"\{\{maal:(\w+):([\d,]+)\}\}", lambda m: maal_sitat(km, m.group(1), m.group(2), s["kilde"]), innhold)
        aktiv = s.get("meny") or TYPE_MENY.get(s["type"], s["id"])
        meny = "\n".join(
            f'        <li><a href="{rot}{url}"{" aria-current=\"page\"" if mid == aktiv else ""}>{esc(tekst)}</a></li>'
            for mid, tekst, url in MENY)
        skript = "\n".join(f'<script type="module" src="{rot}statisk/js/{esc(x)}"></script>' for x in s["skript"])
        side = mal
        for k, v in {
            "{{tittel_full}}": esc(s["tittel"]) + ("" if s["id"] == "index" and s["ut"] == "index.html" else " – mattelab.no"),
            "{{beskrivelse}}": esc(s["beskrivelse"]),
            "{{side_id}}": esc(s["id"]),
            "{{meny}}": meny,
            "{{fagvalg}}": "\n".join(f'          <option value="{esc(f["id"])}">{esc(f["navn"])}</option>' for f in tema_data["fag"]),
            "{{skript}}": skript,
            "{{innhold}}": innhold.strip(),
            "{{rot}}": rot,
        }.items():
            side = side.replace(k, v)
        if "{{" in side:
            rest = re.findall(r"\{\{[^}]*\}\}", side)
            raise Byggefeil(f"{s['kilde']}: ukjent plassholder {rest[0]}")
        filer[s["ut"]] = side.encode("utf-8")

    for sti in sorted(STATISK.rglob("*")):
        if sti.is_file() and sti.name != ".DS_Store":
            filer["statisk/" + sti.relative_to(STATISK).as_posix()] = sti.read_bytes()
    filer["CNAME"] = (DOMENE + "\n").encode()
    filer[".nojekyll"] = b""
    sjekk_lenker(filer)
    return filer


LENKE = re.compile(r'(?:href|src)="([^"]+)"')


def sjekk_lenker(filer: dict[str, bytes]) -> None:
    """Alle interne lenker i HTML-sidene må peke på en fil som bygges."""
    feil = []
    for navn, data in filer.items():
        if not navn.endswith(".html"):
            continue
        tekst = data.decode("utf-8")
        for url in LENKE.findall(tekst):
            if url.startswith(("http://", "https://", "mailto:", "#", "data:")):
                continue
            sti = unquote(urlsplit(url).path)
            if not sti:
                continue
            mål = (Path(navn).parent / sti).as_posix()
            mål = str(Path("/" + mål).resolve())[1:] if not mål.startswith("/") else mål[1:]
            if mål.endswith("/") or mål == "":
                mål += "index.html"
            if mål not in filer:
                feil.append(f"{navn}: død lenke {url}")
    if feil:
        raise Byggefeil("Døde lenker:\n  " + "\n  ".join(feil))


# ---------------------------------------------------------------- skriving

def sammenlign(filer: dict[str, bytes]):
    ny, endret, uendret = [], [], []
    for navn, data in sorted(filer.items()):
        mål = UT / navn
        if not mål.exists():
            ny.append(navn)
        elif mål.read_bytes() != data:
            endret.append(navn)
        else:
            uendret.append(navn)
    finnes = {p.relative_to(UT).as_posix() for p in UT.rglob("*") if p.is_file()} if UT.exists() else set()
    foreldet = sorted(f for f in finnes - set(filer) if not f.endswith(".DS_Store"))
    return ny, endret, uendret, foreldet


def main() -> int:
    ap = argparse.ArgumentParser(description="Bygg mattelab.no fra kilde/ til docs/.")
    ap.add_argument("--sjekk", action="store_true", help="tørrkjøring: vis endringer uten å skrive noe")
    ap.add_argument("--rydd", action="store_true", help="slett foreldede filer i docs/ (med sikkerhetskopi)")
    a = ap.parse_args()
    try:
        filer = bygg_alt()
    except Byggefeil as e:
        print(f"FEIL: {e}", file=sys.stderr)
        return 1
    for a_ in ADVARSLER:
        print("ADVARSEL: " + a_, file=sys.stderr)
    ny, endret, uendret, foreldet = sammenlign(filer)
    sider = lambda l: [x for x in l if x.endswith(".html")]
    if a.sjekk:
        print(f"Tørrkjøring – ingenting er skrevet.")
        print(f"  Nye filer:      {len(ny)}" + "".join(f"\n    + {x}" for x in sider(ny)))
        print(f"  Endrede filer:  {len(endret)}" + "".join(f"\n    ~ {x}" for x in endret))
        print(f"  Uendrede filer: {len(uendret)}")
        if foreldet:
            print(f"  Foreldede filer i docs/ (slettes med --rydd): " + "".join(f"\n    - {x}" for x in foreldet))
        return 0
    for navn in ny + endret:
        mål = UT / navn
        mål.parent.mkdir(parents=True, exist_ok=True)
        mål.write_bytes(filer[navn])
    print(f"Bygget docs/: {len(ny)} nye, {len(endret)} endrede, {len(uendret)} uendrede filer.")
    if foreldet:
        if a.rydd:
            kopi = ROT / ".bygg-backup" / datetime.now().strftime("%Y%m%d-%H%M%S")
            for navn in foreldet:
                (kopi / navn).parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(UT / navn), kopi / navn)
            print(f"Flyttet {len(foreldet)} foreldede filer til {kopi.relative_to(ROT)}/")
        else:
            print(f"Merk: {len(foreldet)} filer i docs/ lages ikke lenger. Kjør med --rydd for å fjerne dem:")
            for x in foreldet:
                print(f"    - {x}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
