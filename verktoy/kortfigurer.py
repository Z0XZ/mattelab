"""Små figurer på kortene i kortsettene: brøkfigurer, algebrabrikker og grafer.

Hver figur tegnes én gang som en liste med enkle former i et koordinatsystem med y oppover.
Den samme lista blir til SVG (skjermen) og TikZ (utskrift), så de to versjonene alltid er like.
Hver figur har også en tekstbeskrivelse (skjermleser og fasit) og en verdi (kontroll av fasiten).
"""

from __future__ import annotations

import math
from fractions import Fraction

# Hvordan hver «klasse» ser ut i TikZ. På skjermen styres utseendet av CSS (kf-…).
TIKZ_STIL = {
    "fyll": "fill=black!38, draw=black, line width=0.6pt",
    "tom": "fill=white, draw=black, line width=0.6pt",
    "x2": "fill=black!30, draw=black, line width=0.6pt",
    "x": "fill=black!14, draw=black, line width=0.6pt",
    "en": "fill=white, draw=black, line width=0.6pt",
    "rute": "draw=black!18, line width=0.3pt",
    "akse": "draw=black!75, line width=0.5pt",
    "graf": "draw=black, line width=1.3pt",
    "punkt": "fill=black",
    "hul": "fill=white, draw=black, line width=0.9pt",
}


def _f(x: float) -> str:
    """Tall i SVG/TikZ med få desimaler."""
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Tegning:
    """Samler former. Koordinater i figurens egne enheter, y oppover."""

    def __init__(self):
        self.former: list[tuple] = []
        self.xmin = self.ymin = math.inf
        self.xmax = self.ymax = -math.inf

    def _utvid(self, x, y):
        self.xmin, self.xmax = min(self.xmin, x), max(self.xmax, x)
        self.ymin, self.ymax = min(self.ymin, y), max(self.ymax, y)

    def rekt(self, x, y, b, h, klasse):
        self.former.append(("rekt", x, y, b, h, klasse))
        self._utvid(x, y); self._utvid(x + b, y + h)

    def sektor(self, cx, cy, r, v0, v1, klasse):
        """Sektor fra vinkel v0 til v1 (grader, mot klokka fra positiv x-akse)."""
        self.former.append(("sektor", cx, cy, r, v0, v1, klasse))
        self._utvid(cx - r, cy - r); self._utvid(cx + r, cy + r)

    def sirkel(self, cx, cy, r, klasse):
        self.former.append(("sirkel", cx, cy, r, klasse))
        self._utvid(cx - r, cy - r); self._utvid(cx + r, cy + r)

    def linje(self, punkter, klasse):
        self.former.append(("linje", list(punkter), klasse))
        for x, y in punkter:
            self._utvid(x, y)

    def punkt(self, x, y, r=0.18):
        self.former.append(("punkt", x, y, r))

    def tekst(self, x, y, s, storrelse=0.6, anker="midt"):
        self.former.append(("tekst", x, y, s, storrelse, anker))

    # -------------------------------------------------------------- SVG
    def svg(self, beskrivelse: str, marg=0.15) -> str:
        x0, y0 = self.xmin - marg, self.ymin - marg
        b, h = self.xmax - self.xmin + 2 * marg, self.ymax - self.ymin + 2 * marg
        Y = lambda y: _f(self.ymax + self.ymin - y)  # speil y
        deler = []
        for f in self.former:
            if f[0] == "rekt":
                _, x, y, bb, hh, k = f
                deler.append(f'<rect class="kf-{k}" x="{_f(x)}" y="{Y(y + hh)}" width="{_f(bb)}" height="{_f(hh)}"/>')
            elif f[0] == "sektor":
                _, cx, cy, r, v0, v1, k = f
                p0 = (cx + r * math.cos(math.radians(v0)), cy + r * math.sin(math.radians(v0)))
                p1 = (cx + r * math.cos(math.radians(v1)), cy + r * math.sin(math.radians(v1)))
                stor = 1 if v1 - v0 > 180 else 0
                # Speilet y snur omløpsretningen, derfor sweep = 0
                deler.append(f'<path class="kf-{k}" d="M{_f(cx)} {Y(cy)}L{_f(p0[0])} {Y(p0[1])}A{_f(r)} {_f(r)} 0 {stor} 0 {_f(p1[0])} {Y(p1[1])}Z"/>')
            elif f[0] == "sirkel":
                _, cx, cy, r, k = f
                deler.append(f'<circle class="kf-{k}" cx="{_f(cx)}" cy="{Y(cy)}" r="{_f(r)}"/>')
            elif f[0] == "linje":
                _, pts, k = f
                deler.append(f'<polyline class="kf-{k}" points="' + " ".join(f"{_f(x)},{Y(y)}" for x, y in pts) + '"/>')
            elif f[0] == "punkt":
                _, x, y, r = f
                deler.append(f'<circle class="kf-punkt" cx="{_f(x)}" cy="{Y(y)}" r="{_f(r)}"/>')
            elif f[0] == "tekst":
                _, x, y, s, st, anker = f
                a = {"midt": "middle", "venstre": "start", "hoyre": "end"}[anker]
                deler.append(f'<text class="kf-tekst" x="{_f(x)}" y="{_f(float(Y(y)) + st * 0.35)}" font-size="{_f(st)}" text-anchor="{a}">{s}</text>')
        return (f'<svg class="kort-svg" viewBox="{_f(x0)} {_f(self.ymin - marg)} {_f(b)} {_f(h)}" aria-hidden="true" focusable="false">'
                + "".join(deler) + "</svg>")

    # -------------------------------------------------------------- TikZ
    def tikz(self, cx: float, cy: float, maks_b: float, maks_h: float) -> str:
        """TikZ-kommandoer som tegner figuren sentrert i (cx, cy) innenfor maks_b × maks_h cm."""
        b, h = self.xmax - self.xmin, self.ymax - self.ymin
        s = min(maks_b / b, maks_h / h)
        ox, oy = cx - s * (self.xmin + b / 2), cy - s * (self.ymin + h / 2)
        P = lambda x, y: f"({_f(ox + s * x)},{_f(oy + s * y)})"
        ut = []
        for f in self.former:
            if f[0] == "rekt":
                _, x, y, bb, hh, k = f
                ut.append(rf"\path[{TIKZ_STIL[k]}] {P(x, y)} rectangle {P(x + bb, y + hh)};")
            elif f[0] == "sektor":
                _, cx_, cy_, r, v0, v1, k = f
                ut.append(rf"\path[{TIKZ_STIL[k]}] {P(cx_, cy_)} -- ++({_f(v0)}:{_f(s * r)}) arc[start angle={_f(v0)}, end angle={_f(v1)}, radius={_f(s * r)}] -- cycle;")
            elif f[0] == "sirkel":
                _, cx_, cy_, r, k = f
                ut.append(rf"\path[{TIKZ_STIL[k]}] {P(cx_, cy_)} circle[radius={_f(s * r)}];")
            elif f[0] == "linje":
                _, pts, k = f
                ut.append(rf"\path[{TIKZ_STIL[k]}] " + " -- ".join(P(x, y) for x, y in pts) + ";")
            elif f[0] == "punkt":
                _, x, y, r = f
                ut.append(rf"\path[fill=black] {P(x, y)} circle[radius={_f(max(0.045, s * r))}];")
            elif f[0] == "tekst":
                _, x, y, st, storrelse, anker = f
                a = {"midt": "", "venstre": ", anchor=west", "hoyre": ", anchor=east"}[anker]
                ut.append(rf"\node[font=\sffamily\fontsize{{5.5}}{{6}}\selectfont, inner sep=0pt{a}] at {P(x, y)} {{{st.replace('−', '$-$').replace('′', "'")}}};")
        return "\n".join(ut)


# ================================================================ brøkfigurer

class Brok:
    """Brøkfigur: «strimmel», «sirkel» eller «rutenett» (rader × kolonner ruter)."""

    def __init__(self, teller: int, nevner: int, form: str = "strimmel", rader: int = 1):
        self.teller, self.nevner, self.form, self.rader = teller, nevner, form, rader
        if form == "rutenett" and nevner % rader:
            raise ValueError("rutenett: nevneren må være delelig med antall rader")
        if form == "sirkel" and teller > nevner:
            raise ValueError("sirkel: brøken kan ikke være større enn 1")

    @property
    def verdi(self):
        return Fraction(self.teller, self.nevner)

    @property
    def beskrivelse(self) -> str:
        t, n = self.teller, self.nevner
        if self.form == "sirkel":
            return f"Sirkel delt i {n} like store deler. {t} av delene er fargelagt."
        if self.form == "rutenett":
            return f"Rutenett med {self.rader} rader og {n // self.rader} kolonner. {t} av de {n} rutene er fargelagt."
        hele = math.ceil(t / n)
        if hele > 1:
            return f"{hele} strimler, hver delt i {n} like store deler. {t} deler er fargelagt til sammen."
        return f"Strimmel delt i {n} like store deler. {t} av delene er fargelagt."

    def tegning(self) -> Tegning:
        T = Tegning()
        t, n = self.teller, self.nevner
        if self.form == "sirkel":
            if n == 1:
                T.sirkel(0, 0, 2, "fyll" if t else "tom")
            for i in range(n):
                T.sektor(0, 0, 2, 90 - 360 * (i + 1) / n, 90 - 360 * i / n, "fyll" if i < t else "tom")
        elif self.form == "rutenett":
            k = n // self.rader
            for r in range(self.rader):
                for c in range(k):
                    nr = r * k + c
                    T.rekt(c, self.rader - 1 - r, 1, 1, "fyll" if nr < t else "tom")
        else:
            hele = max(1, math.ceil(t / n))
            bredde = 6 / n
            for s in range(hele):
                for i in range(n):
                    nr = s * n + i
                    T.rekt(i * bredde, -s * 1.6, bredde, 1.1, "fyll" if nr < t else "tom")
        return T


# ================================================================ algebrabrikker

X = 2.6  # lengden x på brikkene. Ikke et helt tall, så x ikke ser ut som et antall enere.


class Brikker:
    """Algebrabrikker lagt i rader nedenfra og opp.
    Brikker: «x2» (x · x), «x» (liggende x · 1), «xs» (stående 1 · x) og «1» (1 · 1)."""

    STR = {"x2": (X, X), "x": (X, 1), "xs": (1, X), "1": (1, 1)}

    def __init__(self, *rader: list[str]):
        self.rader = rader

    def _tell(self):
        x2 = sum(r.count("x2") for r in self.rader)
        x = sum(r.count("x") + r.count("xs") for r in self.rader)
        en = sum(r.count("1") for r in self.rader)
        return x2, x, en

    @property
    def verdi(self):
        x2, x, en = self._tell()
        return lambda x_: x2 * x_ * x_ + x * x_ + en

    @property
    def beskrivelse(self) -> str:
        def ant(n, ent, fl):
            return f"{n} {ent if n == 1 else fl}"
        def rad(r):
            x2, x, en = r.count("x2"), r.count("x") + r.count("xs"), r.count("1")
            biter = [ant(n, e, f) for n, e, f in ((x2, "x²-brikke", "x²-brikker"), (x, "x-brikke", "x-brikker"), (en, "enerbrikke", "enerbrikker")) if n]
            return " og ".join([", ".join(biter[:-1]), biter[-1]] if len(biter) > 1 else biter)
        if len(self.rader) == 1:
            return "Algebrabrikker: " + rad(self.rader[0]) + "."
        like = all(r == self.rader[0] for r in self.rader)
        if like:
            return f"Algebrabrikker: {len(self.rader)} like rader, hver med " + rad(self.rader[0]) + "."
        return "Algebrabrikker: " + "; ".join(f"rad {i}: {rad(r)}" for i, r in enumerate(self.rader, 1)) + "."

    def tegning(self) -> Tegning:
        T = Tegning()
        y = 0.0
        for r in self.rader:
            x = 0.0
            hoyde = max(self.STR[b][1] for b in r)
            for b in r:
                bb, hh = self.STR[b]
                T.rekt(x, y, bb, hh, {"x2": "x2", "x": "x", "xs": "x", "1": "en"}[b])
                x += bb + 0.12
            y += hoyde + 0.12
        return T


# ================================================================ grafer

class Parabel:
    """Graf til f(x) = a(x − r1)(x − r2) i et lite rutenett. Nullpunktene er markert."""

    def __init__(self, a, r1, r2, xmin=-5, xmax=5, ymin=-7, ymax=7):
        self.a, self.r1, self.r2 = a, r1, r2
        self.vindu = (xmin, xmax, ymin, ymax)

    def f(self, x):
        return self.a * (x - self.r1) * (x - self.r2)

    @property
    def verdi(self):
        return lambda x: self.a * (x - self.r1) * (x - self.r2)

    @property
    def beskrivelse(self) -> str:
        nullpunkt = (f"x = {_n(self.r1)}" if self.r1 == self.r2 else f"x = {_n(min(self.r1, self.r2))} og x = {_n(max(self.r1, self.r2))}")
        retning = "åpner oppover" if self.a > 0 else "åpner nedover"
        return (f"Graf til en andregradsfunksjon som {retning}. Den skjærer x-aksen i {nullpunkt}"
                f" og y-aksen i y = {_n(self.f(0))}.")

    def tegning(self) -> Tegning:
        xmin, xmax, ymin, ymax = self.vindu
        sy = 0.5  # y-aksen er klemt sammen, så figuren får plass på kortet
        T = Tegning()
        for i in range(xmin, xmax + 1):
            T.linje([(i, ymin * sy), (i, ymax * sy)], "rute")
        for j in range(ymin, ymax + 1):
            T.linje([(xmin, j * sy), (xmax, j * sy)], "rute")
        T.linje([(xmin, 0), (xmax, 0)], "akse")
        T.linje([(0, ymin * sy), (0, ymax * sy)], "akse")
        # Bare tall på x-aksen: det er nullpunktene som skal leses av.
        for i in range(xmin + 1, xmax):
            if i:
                T.tekst(i, -0.5, _n(i), 0.5)
        # Kurven klippes mot vinduet
        biter, bit = [], []
        N = 240
        for k in range(N + 1):
            x = xmin + (xmax - xmin) * k / N
            y = self.f(x)
            if ymin <= y <= ymax:
                bit.append((x, y * sy))
            elif bit:
                biter.append(bit); bit = []
        if bit:
            biter.append(bit)
        for b in biter:
            if len(b) > 1:
                T.linje(b, "graf")
        for r in {self.r1, self.r2}:
            T.punkt(r, 0)
        return T



class Graf:
    """Graf til en vilkårlig funksjon i et lite rutenett.

    f: funksjonen med flyttall (None eller unntak der den ikke er definert).
    verdi: den samme funksjonen med eksakte tall (Fraction), til kontroll av fasiten. Valgfri.
    beskrivelse: tekst til skjermleser og fasit.
    sy: hvor mye y-aksen klemmes sammen, så figuren får plass på kortet.
    ytall: skriv tall på y-aksen også (for eksempel for å lese av konstantleddet).
    punkter: punkter som markeres, [(x, y), …].
    navn: kort navn øverst til venstre, for eksempel «f» eller «f′».
    brudd: x-verdier der grafen deles, for funksjoner med sprang. hule: punkter som tegnes som åpne sirkler.
    """

    def __init__(self, f, beskrivelse: str, verdi=None, xmin=-5, xmax=5, ymin=-5, ymax=5,
                 sy=0.6, ytall=False, punkter=(), xtall=True, steg=1, tekst=0.5, navn="", brudd=(), hule=()):
        self.f, self._verdi, self._beskrivelse = f, verdi, beskrivelse
        self.vindu = (xmin, xmax, ymin, ymax)
        self.sy, self.ytall, self.xtall, self.punkter, self.steg = sy, ytall, xtall, list(punkter), steg
        self.tekst = tekst
        # navn: skrives øverst til venstre, for eksempel «f» eller «f′».
        # brudd: x-verdier der grafen deles (sprang), hule: punkter som tegnes som åpne sirkler.
        self.navn, self.brudd, self.hule = navn, sorted(brudd), list(hule)

    @property
    def verdi(self):
        return self._verdi

    @property
    def beskrivelse(self) -> str:
        return self._beskrivelse

    def _y(self, x):
        try:
            y = self.f(x)
        except (ZeroDivisionError, ValueError, OverflowError):
            return None
        return None if y is None or isinstance(y, complex) else y

    def tegning(self) -> Tegning:
        xmin, xmax, ymin, ymax = self.vindu
        sy, st = self.sy, self.steg
        T = Tegning()
        for i in range(xmin, xmax + 1):
            T.linje([(i, ymin * sy), (i, ymax * sy)], "rute")
        for j in range(ymin, ymax + 1):
            T.linje([(xmin, j * sy), (xmax, j * sy)], "rute")
        if ymin <= 0 <= ymax:
            T.linje([(xmin, 0), (xmax, 0)], "akse")
        if xmin <= 0 <= xmax:
            T.linje([(0, ymin * sy), (0, ymax * sy)], "akse")
        if self.xtall:
            for i in range(xmin + 1, xmax):
                # Med tall på y-aksen hoppes −steg over, så tallene ikke kolliderer ved origo
                if i and i % st == 0 and not (self.ytall and i == -st):
                    T.tekst(i, -self.tekst - 0.1, _n(i), self.tekst)
        if self.ytall:
            for j in range(ymin + 1, ymax):
                if j and j % st == 0:
                    T.tekst(-0.2, j * sy, _n(j), self.tekst, "hoyre")
        biter = []
        N = 400
        # Hvert intervall mellom bruddene tegnes for seg. Endepunktene regnes ut like innenfor,
        # så en stykkevis funksjon gir den ensidige grenseverdien og ingen loddrett strek.
        grenser = [xmin] + [x for x in self.brudd if xmin < x < xmax] + [xmax]
        for a, b in zip(grenser, grenser[1:]):
            bit = []
            n = max(2, round(N * (b - a) / (xmax - xmin)))
            for k in range(n + 1):
                x = a + (b - a) * k / n
                y = self._y(min(b - 1e-9, max(a + 1e-9, x)) if (a, b) != (xmin, xmax) else x)
                if y is not None and ymin - 0.01 <= y <= ymax + 0.01:
                    bit.append((x, max(ymin, min(ymax, y)) * sy))
                elif bit:
                    biter.append(bit); bit = []
            if bit:
                biter.append(bit)
        for b in biter:
            if len(b) > 1:
                T.linje(b, "graf")
        for x, y in self.punkter:
            T.punkt(x, y * sy)
        for x, y in self.hule:
            T.sirkel(x, y * sy, 0.2, "hul")
        if self.navn:
            T.tekst(xmin + 0.2, ymax * sy - self.tekst, self.navn, self.tekst * 1.4, "venstre")
        return T


def _n(x) -> str:
    """Tall med ekte minustegn og desimalkomma."""
    if isinstance(x, Fraction) and x.denominator != 1:
        x = float(x)
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    s = str(x).replace(".", ",")
    return s.replace("-", "−")
