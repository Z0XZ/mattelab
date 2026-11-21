"""Kortsett: kort som skal kobles, sorteres eller ordnes, på skjermen og som utskrift.

Et kortsett består av to filer i kilde/varierende/:
    <id>.html   siden (hode, innledning, {{kortsett}} der kortene skal stå, tips til læreren)
    <id>.py     kortene, laget med kort() og figurene i kortfigurer.py

Modulen <id>.py har:
    KODE = "K5"                    kort kode som står på hvert utskrevne kort
    TYPE = "grupper"               «grupper», «sorter» eller «ordne»
    OPPGAVE = "…"                  instruksjonen til elevene
    grupper:  STORRELSE = 2 og GRUPPER = [[kort, kort], …]
    sorter:   KATEGORIER = [("id", "Navn"), …] og KORT = [kort(..., riktig=["id"]), …]
    ordne:    KORT = [kort(..., verdi=…), …] og eventuelt RETNING = "Fra minst til størst"
    FASITNOTAT = "…"               (valgfritt) tekst til læreren i fasiten

Verdiene på kortene sjekkes når nettstedet bygges: Alle kort i en gruppe må ha samme verdi,
og to grupper kan ikke ha samme verdi. Verdien er et tall, en brøk eller en funksjon.
Funksjoner sammenlignes i tilfeldige brøkpunkter, så likheten er eksakt og ikke avrundet.

Bygg lager kortene som PDF (til å klippe ut) og en fasit for læreren som egen PDF.
"""

from __future__ import annotations

import html
import importlib.util
import inspect
import random
from dataclasses import dataclass, field
from fractions import Fraction
from pathlib import Path

from elevark import Elevarkfeil, escape, kompiler, tekst_til_latex

TYPER = ("grupper", "sorter", "ordne")
B, H = 6.19, 4.0          # kortstørrelse i cm (tre kort i bredden på A4)


class Kortfeil(Exception):
    pass


@dataclass
class Kort:
    tekst: str = ""
    figur: object = None
    verdi: object = None
    riktig: list = field(default_factory=list)
    kommentar: str = ""
    nr: str = ""           # settes ved stokking: «07»
    svar: str = ""         # gruppenøkkel, kategorier eller plass i rekka

    @property
    def har_verdi(self):
        return self.verdi is not None or (self.figur is not None and hasattr(self.figur, "verdi"))

    def hent_verdi(self):
        return self.verdi if self.verdi is not None else self.figur.verdi


def kort(tekst: str = "", figur=None, verdi=None, riktig=(), kommentar: str = "") -> Kort:
    if bool(tekst) == bool(figur):
        raise Kortfeil("et kort har enten tekst eller figur")
    return Kort(tekst=tekst, figur=figur, verdi=verdi, riktig=list(riktig), kommentar=kommentar)


# ---------------------------------------------------------------- lese og kontrollere

def les_modul(sti: Path):
    spes = importlib.util.spec_from_file_location(f"kortsett_{sti.stem.replace('-', '_')}", sti)
    m = importlib.util.module_from_spec(spes)
    spes.loader.exec_module(m)
    for navn in ("KODE", "TYPE", "OPPGAVE"):
        if not hasattr(m, navn):
            raise Kortfeil(f"{sti.name}: mangler {navn}")
    if m.TYPE not in TYPER:
        raise Kortfeil(f"{sti.name}: ukjent TYPE {m.TYPE!r} (bruk {', '.join(TYPER)})")
    return m


PUNKTER = [Fraction(3, 7), Fraction(-5, 3), Fraction(11, 4), Fraction(-2, 9), Fraction(17, 5)]


def fingeravtrykk(v):
    """Gjør en verdi om til noe som kan sammenlignes eksakt: tall, eller verdier i faste punkter."""
    if callable(v):
        n = len(inspect.signature(v).parameters)
        return tuple(Fraction(v(*[PUNKTER[(i + j) % 5] for j in range(n)])) for i in range(5))
    return Fraction(v)


def kontroller(m) -> None:
    if m.TYPE == "grupper":
        n = m.STORRELSE
        sett = []
        for i, g in enumerate(m.GRUPPER, 1):
            if len(g) != n:
                raise Kortfeil(f"gruppe {i} har {len(g)} kort, skal ha {n}")
            if not all(k.har_verdi for k in g):
                raise Kortfeil(f"gruppe {i}: alle kort må ha en verdi (eller en figur med verdi)")
            avtrykk = {fingeravtrykk(k.hent_verdi()) for k in g}
            if len(avtrykk) != 1:
                tekster = [k.tekst or k.figur.beskrivelse for k in g]
                raise Kortfeil(f"gruppe {i}: kortene har ikke samme verdi: {tekster}")
            sett.append(avtrykk.pop())
        if len(set(sett)) != len(sett):
            raise Kortfeil("to grupper har samme verdi, så kortene kan kobles på flere måter")
    elif m.TYPE == "sorter":
        ids = {k for k, _ in m.KATEGORIER}
        for k in m.KORT:
            if not k.riktig or not set(k.riktig) <= ids:
                raise Kortfeil(f"kortet {k.tekst!r}: riktig={k.riktig} må være kategorier fra {sorted(ids)}")
    else:
        v = [fingeravtrykk(k.hent_verdi()) for k in m.KORT]
        if len(set(v)) != len(v):
            raise Kortfeil("to kort har samme verdi, så rekkefølgen er ikke entydig")


def alle_kort(m) -> list[Kort]:
    """Alle kortene i fast, stokket rekkefølge med nummer og svarnøkkel."""
    if m.TYPE == "grupper":
        liste = []
        for i, g in enumerate(m.GRUPPER, 1):
            for k in g:
                k.svar = f"g{i}"
                liste.append(k)
    elif m.TYPE == "sorter":
        liste = list(m.KORT)
        for k in liste:
            k.svar = " ".join(k.riktig)
    else:
        liste = list(m.KORT)
        rang = sorted(liste, key=lambda k: float(k.hent_verdi()) if not callable(k.hent_verdi()) else 0)
        for i, k in enumerate(rang, 1):
            k.svar = str(i)
    # Samme stokking hver gang (frø = koden), så utskrift og skjerm har samme nummer.
    random.Random(m.KODE).shuffle(liste)
    for i, k in enumerate(liste, 1):
        k.nr = f"{i:02d}"
    return liste


# ---------------------------------------------------------------- HTML

def esc(s: str) -> str:
    return html.escape(s, quote=True)


def kort_html(k: Kort, kode: str) -> str:
    if k.figur is not None:
        innhold = (f'<span class="kort-innhold kort-figur" role="img" aria-label="{esc(k.figur.beskrivelse)}">'
                   + k.figur.tegning().svg(k.figur.beskrivelse) + "</span>")
    else:
        lang = len(k.tekst) > 40 and "$" not in k.tekst[:2]
        innhold = f'<span class="kort-innhold{" kort-lang" if lang else ""}">{k.tekst}</span>'
    kommentar = f'<span class="kort-kommentar" hidden>{k.kommentar}</span>' if k.kommentar else ""
    return (f'<li><div class="kort" data-nr="{k.nr}" data-svar="{esc(k.svar)}">{innhold}'
            f'<span class="kort-kode">{esc(kode)}-{k.nr}</span>{kommentar}</div></li>')


def lag_html(sid: str, m, kortliste: list[Kort]) -> str:
    kode = m.KODE
    lenker = (f'<p class="elevark-lenke"><a class="knapp lys liten" href="{{{{rot}}}}kortsett/{sid}.pdf" download>Last ned kortene (PDF)</a> '
              f'<a class="knapp lys liten" href="{{{{rot}}}}kortsett/{sid}-fasit.pdf" download>Fasit for læreren (PDF)</a> '
              f'<a class="elevark-tex" href="{{{{rot}}}}kortsett/{sid}.tex" download>LaTeX-kilde til eget bruk</a></p>')
    if m.TYPE == "grupper":
        hjelp = (f"Velg {m.STORRELSE} kort som hører sammen. Når du har valgt {m.STORRELSE}, blir de en gruppe. "
                 "Trykk «Sjekk» når du vil se om gruppene stemmer.")
        midt = '<div class="kort-grupper" id="kort-grupper" aria-label="Gruppene dine"></div>'
    elif m.TYPE == "sorter":
        hjelp = "Velg et kort, og trykk så på boksen det hører til i. Velg et kort i en boks for å flytte det igjen."
        bokser = "".join(
            f'<section class="kort-kategori" data-kategori="{esc(k)}" aria-label="{esc(n)}">'
            f'<button type="button" class="kategori-knapp" data-kategori="{esc(k)}">{esc(n)}</button>'
            f'<ul class="kort-plassert"></ul></section>' for k, n in m.KATEGORIER)
        midt = f'<div class="kort-kategorier" id="kort-kategorier">{bokser}</div>'
    else:
        retning = getattr(m, "RETNING", "Fra minst til størst")
        hjelp = f"Trykk på kortene i riktig rekkefølge ({retning.lower()}). Trykk på et kort i rekka for å ta det ut igjen."
        midt = (f'<div class="kort-rekke-ramme"><p class="panel-tittel">{esc(retning)}</p>'
                '<ol class="kort-rekke" id="kort-rekke" aria-label="Rekka di"></ol></div>')
    verktoy = ('<div class="kortsett-verktoy kun-js">'
               '<button type="button" class="knapp liten" id="kort-sjekk">Sjekk</button>'
               '<button type="button" class="knapp lys liten" id="kort-bland">Bland kortene</button>'
               '<button type="button" class="knapp lys liten" id="kort-nullstill">Start på nytt</button>'
               '<span class="kort-status" id="kort-status" role="status"></span></div>')
    bunke = ('<ul class="kort-bunke" id="kort-bunke" aria-label="Kort som ikke er plassert">'
             + "".join(kort_html(k, kode) for k in kortliste) + "</ul>")
    storrelse = f' data-storrelse="{m.STORRELSE}"' if m.TYPE == "grupper" else ""
    return (f'<div class="kortsett" id="kortsett" data-type="{m.TYPE}" data-kode="{esc(kode)}"{storrelse}>\n'
            f'<p class="kortsett-oppgave"><strong>Oppgave:</strong> {m.OPPGAVE}</p>\n{lenker}\n'
            f'<p class="kortsett-hjelp kun-js">{hjelp}</p>\n'
            f'<p class="kortsett-hjelp kun-uten-js">Uten JavaScript kan du ikke flytte kortene her. Skriv dem ut i stedet.</p>\n'
            f'{verktoy}\n{midt}\n{bunke}\n</div>')


# ---------------------------------------------------------------- LaTeX

FELLES = r"""\documentclass[11pt,a4paper]{article}
\usepackage[norsk]{babel}
\usepackage[a4paper,margin=1.2cm,bottom=1.7cm]{geometry}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{TeX Gyre Pagella}
\setsansfont{TeX Gyre Heros}[Scale=MatchLowercase]
\setmathfont{TeX Gyre Pagella Math}
\usepackage{xcolor}
\definecolor{blekk}{HTML}{16213A}
\definecolor{dempet}{HTML}{566077}
\definecolor{m1}{HTML}{2F4AB0}
\usepackage{tikz}
\usepackage{qrcode}
\usepackage{fancyhdr}
\usepackage[hidelinks]{hyperref}
\pdfvariable suppressoptionalinfo \numexpr 1+2+4+8+16+32+64+128+256+512\relax
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\sffamily\footnotesize\color{dempet}mattelab.no · <<TITTEL>> · kortsett <<KODE>><<FOTNOTE>>}
\fancyfoot[R]{\sffamily\footnotesize\color{dempet}Side \thepage}
"""

TOPP = r"""\begin{minipage}[t]{0.8\linewidth}\vspace{0pt}
{\sffamily\small\color{dempet}<<UNDERTITTEL>>}\par\vspace{0.25em}
{\fontsize{20}{24}\selectfont\bfseries <<TITTEL>>}\par\vspace{0.5em}
<<INNHOLD>>
\end{minipage}\hfill
\begin{minipage}[t]{0.15\linewidth}\vspace{0pt}\raggedleft
\qrcode[height=1.9cm]{<<URL>>}
\end{minipage}\par\vspace{0.8em}
"""


def kort_tikz(k: Kort | None, kode: str, overskrift: str = "") -> str:
    """Ett kort som en tikzpicture med stiplet kant. overskrift: kategorikort i sorteringssett."""
    ut = [r"\begin{tikzpicture}", rf"\useasboundingbox (0,0) rectangle ({B},{H});"]
    if overskrift.strip():
        ut.append(rf"\fill[black!8] (0,0) rectangle ({B},{H});")
        ut.append(rf"\node[text width={B - 0.8}cm, align=center, font=\sffamily\bfseries\Large] at ({B / 2},{H / 2}) {{{escape(overskrift)}}};")
    elif k is None:
        ut.append(rf"\node[anchor=south east, font=\sffamily\scriptsize, text=black!40, inner sep=0pt] at ({B - 0.15},0.14) {{Eget kort}};")
    elif k.figur is not None:
        ut.append(k.figur.tegning().tikz(B / 2, H / 2 + 0.12, B - 1.0, H - 0.9))
    else:
        tekst = tekst_til_latex(k.tekst)
        lang = len(k.tekst) > 40 and not k.tekst.startswith("$")
        font = r"\normalsize" if lang else (r"\Large" if k.tekst.startswith("$") and k.tekst.endswith("$") else r"\large")
        ut.append(rf"\node[text width={B - 0.9}cm, align=center, font={font}] at ({B / 2},{H / 2 + 0.08}) {{{tekst}}};")
    ut.append(rf"\draw[black!45, line width=0.4pt, dash pattern=on 3pt off 2.5pt] (0,0) rectangle ({B},{H});")
    if k is not None:
        ut.append(rf"\node[anchor=south east, font=\sffamily\scriptsize, text=black!55, inner sep=0pt] at ({B - 0.15},0.14) {{{kode}-{k.nr}}};")
    ut.append(r"\end{tikzpicture}")
    return "\n".join(ut)


def rader(kortbiter: list[str]) -> str:
    """Tre kort per rad, uten mellomrom, så kantene møtes og alt kan klippes med rette snitt."""
    ut = []
    for i in range(0, len(kortbiter), 3):
        ut.append(r"\noindent" + "%\n".join(kortbiter[i:i + 3]) + "%\n\\par\\nointerlineskip")
    return "\n".join(ut)


def fyll(mal: str, verdier: dict) -> str:
    for k, v in verdier.items():
        mal = mal.replace(k, v)
    return mal


def lag_tex_kort(tittel: str, fag: list[str], url: str, m, kortliste: list[Kort]) -> str:
    biter = []
    if m.TYPE == "sorter":
        biter += [kort_tikz(None, m.KODE, overskrift=n) for _, n in m.KATEGORIER]
        while len(biter) % 3:
            biter.append(kort_tikz(None, m.KODE, overskrift=" "))
    biter += [kort_tikz(k, m.KODE) for k in kortliste]
    # Fyll opp siste rad og legg til én rad med blanke kort, så elevene kan lage egne.
    biter += [kort_tikz(None, m.KODE)] * ((-len(biter)) % 3 + 3)
    innhold = (tekst_til_latex(m.OPPGAVE) + r"\par\vspace{0.4em}{\small\color{dempet}Klipp langs de stiplede linjene. "
               + rf"Koden nede i hjørnet ({m.KODE}-01, {m.KODE}-02, …) viser hvilket sett kortet hører til.")
    if m.TYPE == "sorter":
        innhold += " De grå kortene er overskrifter for boksene."
    innhold += "}"
    tex = FELLES + r"\begin{document}" + "\n" + TOPP + "\n" + rader(biter) + "\n\\end{document}\n"
    return "%% Kortsett fra mattelab.no – laget automatisk av bygg.py. Rediger gjerne til eget bruk.\n%% Kompiler med lualatex.\n" + fyll(tex, {
        "<<UNDERTITTEL>>": escape(f"Kortsett {m.KODE} · {' og '.join(fag)} · mattelab.no"),
        "<<TITTEL>>": escape(tittel), "<<KODE>>": m.KODE, "<<FOTNOTE>>": "", "<<URL>>": url, "<<INNHOLD>>": innhold,
    })


def innhold_tex(k: Kort) -> str:
    return tekst_til_latex(k.tekst) if k.tekst else r"\emph{Figur:} " + escape(k.figur.beskrivelse)


def lag_tex_fasit(tittel: str, fag: list[str], url: str, m, kortliste: list[Kort]) -> str:
    deler = []
    if m.TYPE == "grupper":
        deler.append(r"\begin{enumerate}[leftmargin=1.6em, itemsep=0.7em]")
        for i, g in enumerate(m.GRUPPER, 1):
            linjer = r" \\ ".join(rf"\textsf{{\small {m.KODE}-{k.nr}}}\quad {innhold_tex(k)}" for k in sorted(g, key=lambda k: k.nr))
            deler.append(rf"\item \begin{{minipage}}[t]{{\linewidth}}{linjer}\end{{minipage}}")
        deler.append(r"\end{enumerate}")
    elif m.TYPE == "sorter":
        for kid, navn in m.KATEGORIER:
            her = sorted((k for k in kortliste if kid in k.riktig), key=lambda k: k.nr)
            deler.append(rf"\subsection*{{{escape(navn)}}}")
            deler.append(r"\begin{itemize}[leftmargin=1.2em, itemsep=0.35em]")
            for k in her:
                andre = [n for i, n in m.KATEGORIER if i in k.riktig and i != kid]
                tillegg = (r" \emph{(også: " + escape(", ".join(andre)) + ")}") if andre else ""
                kom = (r"\\{\small\color{dempet}" + tekst_til_latex(k.kommentar) + "}") if k.kommentar else ""
                deler.append(rf"\item \textsf{{\small {m.KODE}-{k.nr}}}\quad {innhold_tex(k)}{tillegg}{kom}")
            deler.append(r"\end{itemize}")
    else:
        deler.append(r"\begin{enumerate}[leftmargin=1.6em, itemsep=0.45em]")
        for k in sorted(kortliste, key=lambda k: int(k.svar)):
            v = k.hent_verdi()
            deler.append(rf"\item \textsf{{\small {m.KODE}-{k.nr}}}\quad {innhold_tex(k)}\quad {{\color{{dempet}}$= {verdi_tex(v)}$}}")
        deler.append(r"\end{enumerate}")
    notat = getattr(m, "FASITNOTAT", "")
    innhold = (tekst_til_latex(m.OPPGAVE) + r"\par\vspace{0.4em}{\small\color{dempet}Kortene er nummerert i den rekkefølgen de står i utskriften.}")
    tex = (FELLES.replace(r"\usepackage{tikz}", r"\usepackage{tikz}" + "\n" + r"\usepackage{enumitem}")
           + r"\begin{document}" + "\n" + TOPP + "\n" + "\n".join(deler)
           + ("\n\\subsection*{Til læreren}\n" + tekst_til_latex(notat) if notat else "") + "\n\\end{document}\n")
    return "%% Fasit til kortsett fra mattelab.no – laget automatisk av bygg.py.\n%% Kompiler med lualatex.\n" + fyll(tex, {
        "<<UNDERTITTEL>>": escape(f"Fasit for læreren · kortsett {m.KODE} · {' og '.join(fag)}"),
        "<<TITTEL>>": escape(tittel), "<<KODE>>": m.KODE, "<<FOTNOTE>>": " · fasit", "<<URL>>": url, "<<INNHOLD>>": innhold,
    })


def verdi_tex(v) -> str:
    """Verdien i fasiten: heltall, desimaltall når det går opp, ellers brøk og avrundet desimaltall."""
    v = Fraction(v)
    if v.denominator == 1:
        return str(v.numerator)
    n = v.denominator
    for p in (2, 5):
        while n % p == 0:
            n //= p
    if n == 1:
        return f"{float(v):g}".replace(".", "{,}")
    tegn = "-" if v < 0 else ""
    return rf"{tegn}\tfrac{{{abs(v.numerator)}}}{{{v.denominator}}} \approx {f'{float(v):.3f}'.replace('.', '{,}')}"


# ---------------------------------------------------------------- inngang fra bygg.py

def bygg_kortsett(sid: str, sti: Path, tittel: str, fag: list[str], url: str, cache: Path) -> tuple[str, dict[str, bytes]]:
    """Returner HTML for skjermen og filene som skal til docs/kortsett/."""
    m = les_modul(sti)
    kontroller(m)
    kortliste = alle_kort(m)
    html_ = lag_html(sid, m, kortliste)
    filer = {}
    for navn, tex in ((f"{sid}", lag_tex_kort(tittel, fag, url, m, kortliste)),
                      (f"{sid}-fasit", lag_tex_fasit(tittel, fag, url, m, kortliste))):
        filer[f"kortsett/{navn}.pdf"] = kompiler(tex, cache)
        filer[f"kortsett/{navn}.tex"] = tex.encode("utf-8")
    return html_, filer
