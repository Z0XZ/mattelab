"""Elevark som PDF: gjør oppgavedelen av en utforskerside om til LaTeX og kompilerer med lualatex.

Brukes av bygg.py. Løsningsforslagene (<details class="fasit">) tas ikke med.

Oppgavedelen i kildefila må ha denne formen (slik alle utforskere har):

    <section class="oppgaver" …>
      <h2 …>Oppgaver</h2>
      <p class="del-inngang">Innledning …</p>
      <div class="oppgave" id="oppgave-1">
        <h3><span class="oppgave-nr">1</span>Tittel</h3>
        <ol class="oppgaveliste">
          <li><span class="fase gjett">Gjett</span><div><p>…</p></div></li>
          …
        </ol>
        <details class="fasit">…</details>
      </div>
    </section>

Formler skrives som på nettsiden, med $…$ og $$…$$, og går rett over i LaTeX.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path

# Plass til å skrive svar etter hvert steg
SVARPLASS = {"gjett": "2.2cm", "test": "2.6cm", "forklar": "3.4cm", "utfordring": "3.4cm"}
FASEFARGE = {"gjett": "m1", "test": "m2", "forklar": "blekk", "utfordring": "dempet"}

SPESIAL = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_",
           "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}
FORMEL = re.compile(r"(?<!\\)\$\$(.+?)(?<!\\)\$\$|(?<!\\)\$(.+?)(?<!\\)\$", re.S)


class Elevarkfeil(Exception):
    pass


def tekst_til_latex(tekst: str) -> str:
    """Vanlig tekst escapes; formler i $…$ og $$…$$ beholdes som de er."""
    ut, pos = [], 0
    for m in FORMEL.finditer(tekst):
        ut.append(escape(tekst[pos:m.start()]))
        ut.append(rf"\[{m.group(1).strip()}\]" if m.group(1) is not None else f"${m.group(2).strip()}$")
        pos = m.end()
    ut.append(escape(tekst[pos:]))
    return "".join(ut)


def escape(s: str) -> str:
    s = s.replace("\\$", "$")
    s = "".join(SPESIAL.get(c, c) for c in s)
    s = s.replace("$", r"\$")
    return re.sub(r"\s+", " ", s)


class Oppgaveleser(HTMLParser):
    """Går gjennom HTML-en og bygger LaTeX for oppgavene. Hopper over alt inne i <details>."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.i_oppgaver = 0       # dybde inne i <section class="oppgaver">
        self.hopp = 0             # dybde inne i elementer som skal hoppes over (fasit, h2)
        self.innledning: list[str] = []
        self.oppgaver: list[dict] = []
        self.buffer: list[str] = []   # rå tekst (med $…$) som venter på å bli konvertert
        self.ut: list[str] = []       # LaTeX for gjeldende mål (innledning, steg …)
        self.mal = None
        self.fase = None
        self.i_fase = False
        self.i_nr = False
        self.i_h3 = False
        self.tittel = ""
        self.nr = ""
        self.stabel: list[str] = []

    # -- hjelpere
    def tom_buffer(self):
        if self.buffer:
            self.ut.append(tekst_til_latex("".join(self.buffer)))
            self.buffer = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        klasser = (a.get("class") or "").split()
        if tag == "section" and "oppgaver" in klasser:
            self.i_oppgaver = 1
            return
        if not self.i_oppgaver:
            return
        self.i_oppgaver += 1 if tag not in ("br", "img", "input") else 0
        self.stabel.append(tag)
        if self.hopp:
            self.hopp += 1 if tag not in ("br", "img", "input") else 0
            return
        if tag == "details" or tag == "h2":
            self.hopp = 1
            return
        if tag == "div" and "oppgave" in klasser:
            self.oppgaver.append({"nr": "", "tittel": "", "steg": []})
            return
        if tag == "h3":
            self.i_h3 = True
            self.tittel, self.nr = "", ""
            return
        if tag == "span" and "oppgave-nr" in klasser:
            self.i_nr = True
            return
        if tag == "li" and self.oppgaver and self.fase is None and self.stabel[-2:-1] == ["ol"]:
            self.fase = ""
            self.ut = []
            return
        if tag == "span" and "fase" in klasser:
            self.i_fase = True
            self.fasenavn = [k for k in klasser if k != "fase"][0]
            return
        if tag == "p":
            self.tom_buffer()
            return
        if tag == "strong":
            self.tom_buffer(); self.ut.append(r"\textbf{")
        elif tag == "em":
            self.tom_buffer(); self.ut.append(r"\emph{")
        elif tag == "ul":
            self.tom_buffer(); self.ut.append("\n\\begin{itemize}\n")
        elif tag == "li":
            self.tom_buffer(); self.ut.append(r"\item ")

    def handle_endtag(self, tag):
        if not self.i_oppgaver:
            return
        self.i_oppgaver -= 1
        if self.i_oppgaver == 0:
            return
        if self.stabel:
            self.stabel.pop()
        if self.hopp:
            self.hopp -= 1
            return
        if tag == "h3":
            self.i_h3 = False
            self.oppgaver[-1]["nr"] = self.nr.strip()
            self.oppgaver[-1]["tittel"] = tekst_til_latex(self.tittel.strip())
            return
        if tag == "span" and self.i_nr:
            self.i_nr = False
            return
        if tag == "span" and self.i_fase:
            self.i_fase = False
            return
        if tag == "p":
            self.tom_buffer()
            if self.fase is None and not self.oppgaver:
                self.innledning.append("".join(self.ut).strip())
                self.ut = []
            else:
                self.ut.append("\n\n")
            return
        if tag in ("strong", "em"):
            self.tom_buffer(); self.ut.append("}")
        elif tag == "ul":
            self.tom_buffer(); self.ut.append("\n\\end{itemize}\n")
        elif tag == "li" and self.fase is not None and self.stabel[-1:] == ["ol"]:
            self.tom_buffer()
            self.oppgaver[-1]["steg"].append({"fase": self.fasenavn, "tekst": "".join(self.ut).strip()})
            self.fase = None
            self.ut = []

    def handle_data(self, data):
        if not self.i_oppgaver or self.hopp:
            return
        if self.i_nr:
            self.nr += data
        elif self.i_h3:
            self.tittel += data
        elif self.i_fase:
            pass
        else:
            self.buffer.append(data)


def les_oppgaver(html: str) -> tuple[str, list[dict]]:
    leser = Oppgaveleser()
    leser.feed(re.sub(r"\{\{[^}]*\}\}", "", html))  # plassholdere som {{elevark}} er ikke tekst
    if not leser.oppgaver:
        raise Elevarkfeil("fant ingen oppgaver i <section class=\"oppgaver\">")
    for o in leser.oppgaver:
        if not o["steg"]:
            raise Elevarkfeil(f"oppgave {o['nr']} har ingen steg")
    return " ".join(leser.innledning), leser.oppgaver


MAL = r"""%% Elevark fra mattelab.no – laget automatisk av bygg.py. Rediger gjerne til eget bruk.
%% Kompiler med lualatex.
\documentclass[11pt,a4paper]{article}
\usepackage[norsk]{babel}
\usepackage[a4paper,margin=2.2cm,top=2cm,bottom=2.4cm]{geometry}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{TeX Gyre Pagella}
\setsansfont{TeX Gyre Heros}[Scale=MatchLowercase]
\setmathfont{TeX Gyre Pagella Math}
\usepackage{xcolor}
\definecolor{blekk}{HTML}{16213A}
\definecolor{dempet}{HTML}{566077}
\definecolor{rute}{HTML}{CFC9B8}
\definecolor{m1}{HTML}{2F4AB0}
\definecolor{m2}{HTML}{99266D}
\usepackage[most]{tcolorbox}
\usepackage{qrcode}
\usepackage{needspace}
\usepackage{fancyhdr}
\usepackage[hidelinks]{hyperref}
\pdfvariable suppressoptionalinfo \numexpr 1+2+4+8+16+32+64+128+256+512\relax
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.4em}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[L]{\sffamily\footnotesize\color{dempet}mattelab.no · <<TITTEL>> · elevark uten fasit}
\fancyfoot[R]{\sffamily\footnotesize\color{dempet}Side \thepage}

\newcommand{\fase}[2]{\tcbox[on line, colframe=#2, colback=white, coltext=#2, boxrule=0.6pt, arc=2pt,
  boxsep=0pt, left=3pt, right=3pt, top=1.5pt, bottom=1.5pt, fontupper=\sffamily\bfseries\footnotesize]{#1}}
\newcommand{\steg}[4]{%
  \par\noindent{\color{rute}\rule{\linewidth}{0.4pt}}\par\nopagebreak
  \noindent\begin{minipage}[t]{2.1cm}\vspace{0pt}\fase{#1}{#2}\end{minipage}%
  \begin{minipage}[t]{\dimexpr\linewidth-2.1cm\relax}\vspace{0pt}#3\end{minipage}\par
  \vspace{#4}}
\newcommand{\oppgave}[2]{\par\Needspace{12\baselineskip}\vspace{0.6em}%
  {\fontsize{14}{17}\selectfont\bfseries{\color{m1}#1}\enspace #2}\par\vspace{0.2em}}

\begin{document}
\begin{minipage}[t]{0.72\linewidth}\vspace{0pt}
{\sffamily\small\color{dempet}Elevark · <<FAG>> · mattelab.no}\par\vspace{0.3em}
{\fontsize{24}{28}\selectfont\bfseries <<TITTEL>>}\par\vspace{1em}
{\sffamily\small Navn: \rule{4.6cm}{0.4pt}\quad Klasse: \rule{1.5cm}{0.4pt}\quad Dato: \rule{1.9cm}{0.4pt}}
\end{minipage}\hfill
\begin{minipage}[t]{0.22\linewidth}\vspace{0pt}\raggedleft
\qrcode[height=2.3cm]{<<URL>>}\par\vspace{0.2em}
{\sffamily\scriptsize\color{dempet}Utforskeren}
\end{minipage}

\vspace{1em}
{\sffamily\small\color{dempet}Utforskeren ligger på \url{<<URL>>}}\par
<<INNLEDNING>>

<<OPPGAVER>>
\end{document}
"""


def lag_tex(tittel: str, fag: list[str], url: str, html: str) -> str:
    innledning, oppgaver = les_oppgaver(html)
    deler = []
    for o in oppgaver:
        deler.append(rf"\oppgave{{{o['nr']}}}{{{o['tittel']}}}")
        for s in o["steg"]:
            navn = s["fase"].capitalize()
            deler.append(rf"\steg{{{navn}}}{{{FASEFARGE.get(s['fase'], 'blekk')}}}{{{s['tekst']}}}{{{SVARPLASS.get(s['fase'], '2.5cm')}}}")
        deler.append("")
    erstatt = {
        "<<TITTEL>>": escape(tittel),
        "<<FAG>>": escape(" og ".join(fag)),
        "<<URL>>": url,
        "<<INNLEDNING>>": innledning,
        "<<OPPGAVER>>": "\n".join(deler),
    }
    tex = MAL
    for k, v in erstatt.items():
        tex = tex.replace(k, v)
    return tex


def kompiler(tex: str, cache: Path) -> bytes:
    """Kompiler med lualatex. Resultatet lagres etter innholdets sjekksum, så samme tex gir samme PDF."""
    nokkel = hashlib.sha256(tex.encode("utf-8")).hexdigest()[:20]
    cache.mkdir(parents=True, exist_ok=True)
    ferdig = cache / f"{nokkel}.pdf"
    if ferdig.exists():
        return ferdig.read_bytes()
    if shutil.which("lualatex") is None:
        raise Elevarkfeil("fant ikke lualatex (se BYGG.md)")
    with tempfile.TemporaryDirectory() as mappe:
        (Path(mappe) / "ark.tex").write_text(tex, encoding="utf-8")
        # Fast tidsstempel gjør PDF-en lik fra gang til gang (ingen falske endringer i docs/)
        miljo = {**os.environ, "SOURCE_DATE_EPOCH": "1767225600", "FORCE_SOURCE_DATE": "1"}
        svar = subprocess.run(["lualatex", "-interaction=nonstopmode", "-halt-on-error", "ark.tex"],
                              cwd=mappe, capture_output=True, text=True, env=miljo)
        logg = (Path(mappe) / "ark.log").read_text(encoding="utf-8", errors="replace") if (Path(mappe) / "ark.log").exists() else ""
        if svar.returncode != 0:
            feil = [l for l in logg.splitlines() if l.startswith("!")][:5]
            raise Elevarkfeil("lualatex feilet:\n    " + "\n    ".join(feil or [svar.stdout[-800:]]))
        mangler = sorted(set(re.findall(r"Missing character: There is no (.+?) in font", logg)))
        if mangler:
            raise Elevarkfeil("tegn som mangler i skriften: " + ", ".join(mangler))
        data = (Path(mappe) / "ark.pdf").read_bytes()
    ferdig.write_bytes(data)
    return data
