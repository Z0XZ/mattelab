"""Kortsett K13: sorter funksjoner etter hva som skjer i x = 1. Kontinuerlig og deriverbar, kontinuerlig med knekk,
eller ikke kontinuerlig. Kortene er uttrykk (ofte delt forskrift), grafer og situasjoner.
Hvert kort har funksjonen som Python-funksjon. Kategorien blir kontrollert med ensidige grenseverdier og
ensidige differansekvotienter regnet eksakt med brøker, så fasiten alltid stemmer med funksjonen."""
from fractions import Fraction as F

from kortfigurer import Graf
from kortsett import Kortfeil, kort

KODE = "K13"
TYPE = "sorter"
OPPGAVE = ("Sorter kortene etter hva som skjer med funksjonen i x = 1. Er den kontinuerlig og deriverbar der, "
           "kontinuerlig med en knekk, eller ikke kontinuerlig? Begrunn med grenseverdier eller med grafen.")

KATEGORIER = [
    ("deriverbar", "Kontinuerlig og deriverbar i x = 1"),
    ("knekk", "Kontinuerlig, men ikke deriverbar i x = 1"),
    ("sprang", "Ikke kontinuerlig i x = 1"),
]

DE, KN, SP = ["deriverbar"], ["knekk"], ["sprang"]
EPS = [F(1, 10 ** 6), F(1, 10 ** 7)]


def klassifiser(f):
    """Kategori for f i x = 1, ut fra ensidige grenser og ensidige differansekvotienter med små h."""
    f1 = F(f(F(1)))
    venstre = [F(f(1 - e)) for e in EPS]
    hoyre = [F(f(1 + e)) for e in EPS]
    if any(abs(v - f1) > 10 * EPS[0] for v in venstre + hoyre):
        return "sprang"
    dv = [(f1 - F(f(1 - e))) / e for e in EPS]
    dh = [(F(f(1 + e)) - f1) / e for e in EPS]
    return "deriverbar" if abs(dv[-1] - dh[-1]) < F(1, 1000) else "knekk"


def k(tekst="", f=None, riktig=(), kommentar="", graf=None):
    if klassifiser(f) != riktig[0]:
        raise Kortfeil(f"K13: kortet {tekst or graf.beskrivelse!r} er {klassifiser(f)}, ikke {riktig[0]}")
    if graf is not None:
        return kort(figur=graf, riktig=riktig, kommentar=kommentar)
    return kort(tekst, riktig=riktig, kommentar=kommentar)


def delt(venstre, hoyre, med_i_venstre=False):
    """Delt forskrift: venstre(x) for x < 1 (eller x ≤ 1), hoyre(x) ellers."""
    return lambda x: venstre(x) if (x < 1 or (med_i_venstre and x == 1)) else hoyre(x)


def g(f, besk, **v):
    standard = dict(xmin=-2, xmax=4, ymin=-2, ymax=5, sy=0.6, tekst=0.6, steg=1, ytall=True)
    return Graf(lambda x: float(f(F(x))), besk, **{**standard, **v})


def cases(a, b, c, d):
    return f"$f(x) = \\begin{{cases}} {a} & {b} \\\\ {c} & {d} \\end{{cases}}$"


f1 = delt(lambda x: x ** 2, lambda x: 2 * x - 1)
f2 = delt(lambda x: x ** 2, lambda x: 3 * x - 2)
f3 = delt(lambda x: x ** 2, lambda x: x + 1)
f4 = lambda x: abs(x - 1)
f5 = lambda x: x ** 3 - 3 * x
f6 = delt(lambda x: 2 * x, lambda x: x ** 2 + 1, med_i_venstre=True)
f7 = lambda x: F(2) if x == 1 else x
f8 = delt(lambda x: 4 - x, lambda x: 2 + x)          # graf: V-form i (1, 3)
f9 = delt(lambda x: x + 1, lambda x: x + 3, med_i_venstre=True)   # graf: sprang
f10 = lambda x: (x - 1) ** 2 + 1                       # graf: glatt
f11 = delt(lambda x: 30 * (1 if x > 0 else 0), lambda x: 60, med_i_venstre=True)  # parkering: f(1) = 30, rett etter 60
f12 = delt(lambda x: F(0), lambda x: F(3, 10) * (x - 1))        # skatt over et fribeløp

KORT = [
    k(cases("x^2", "x < 1", "2x - 1", "x \\geq 1"), f1, DE,
      "Begge delene gir $1$ i $x = 1$, og begge har stigningstall $2$ der. Grafen er glatt, selv om forskriften er delt."),
    k(cases("x^2", "x < 1", "3x - 2", "x \\geq 1"), f2, KN,
      "Begge delene gir $1$ i $x = 1$, så f er kontinuerlig. Men stigningstallet er $2$ fra venstre og $3$ fra høyre."),
    k(cases("x^2", "x < 1", "x + 1", "x \\geq 1"), f3, SP,
      "Fra venstre går f mot $1$, men $f(1) = 2$. Grafen gjør et sprang."),
    k("$f(x) = |x - 1|$", f4, KN, "Grafen er en V med spissen i $(1, 0)$. Stigningstallet er $-1$ fra venstre og $1$ fra høyre."),
    k("$f(x) = x^3 - 3x$", f5, DE, "Polynomfunksjoner er kontinuerlige og deriverbare overalt."),
    k(cases("2x", "x \\leq 1", "x^2 + 1", "x > 1"), f6, DE,
      "Begge delene gir $2$ i $x = 1$, og begge har stigningstall $2$ der."),
    k(cases("x", "x \\neq 1", "2", "x = 1"), f7, SP,
      "Grenseverdien er $1$, men $f(1) = 2$. Ett punkt er flyttet, og det er nok til at f ikke er kontinuerlig."),
    k(graf=g(f8, "Graf formet som en V, med spissen i (1, 3).", punkter=[(1, 3)]), f=f8, riktig=KN,
      kommentar="Spiss i $(1, 3)$: Grafen henger sammen, men har ingen tangent der."),
    k(graf=g(f9, "Graf som går opp til et fylt punkt i (1, 2) og fortsetter fra en åpen sirkel i (1, 4).",
             brudd=[1], punkter=[(1, 2)], hule=[(1, 4)]), f=f9, riktig=SP,
      kommentar="Grafen gjør et sprang fra $2$ til $4$. Den fylte prikken viser at $f(1) = 2$."),
    k(graf=g(f10, "Parabel med bunnpunkt i (1, 1).", punkter=[(1, 1)]), f=f10, riktig=DE,
      kommentar="Glatt graf med vannrett tangent i $x = 1$. Da er $f'(1) = 0$."),
    k(graf=g(f1, "Graf som ser ut som én glatt kurve gjennom (1, 1). Til venstre en parabel, til høyre en rett linje.",
             punkter=[(1, 1)]), f=f1, riktig=DE,
      kommentar="Dette er $x^2$ til venstre og $2x - 1$ til høyre. Linja er tangenten til parabelen, så grafen er glatt."),
    k("En parkering koster 30 kr per påbegynte time. f(t) er prisen etter t timer.", f11, SP,
      "Prisen hopper fra $30$ kr til $60$ kr når du passerer én time. Slike trappefunksjoner er vanlige i priser og avgifter."),
    k("Du betaler 30 % skatt av det du tjener over 1 million. f(x) er skatten når du tjener x millioner.", f12, KN,
      "Skatten er $0$ opp til $1$ million og øker jevnt etter det. Grafen henger sammen, men har en knekk i $x = 1$."),
]
