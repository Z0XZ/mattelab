"""Kortsett K10: sorter funksjoner etter type. Kortene er uttrykk, grafer og situasjoner.
Noen kort hører hjemme i to bokser, for eksempel x² (polynom og potens) og 3/x (potens og rasjonal).
Da står begge i «riktig», og kommentaren forklarer."""
import math

from kortfigurer import Graf
from kortsett import kort

KODE = "K10"
TYPE = "sorter"
OPPGAVE = ("Sorter kortene etter funksjonstype. Noen kort passer i to bokser. Begrunn valget, og se etter "
           "kjennetegn i uttrykket, grafen eller situasjonen.")

KATEGORIER = [
    ("lineaer", "Lineær"),
    ("polynom", "Polynom av grad 2 eller mer"),
    ("eksponential", "Eksponential"),
    ("potens", "Potens eller rot"),
    ("rasjonal", "Rasjonal"),
]

LI, PO, EK, PT, RA = ["lineaer"], ["polynom"], ["eksponential"], ["potens"], ["rasjonal"]


def g(f, besk, riktig, kommentar="", **v):
    standard = dict(xmin=-4, xmax=5, ymin=-4, ymax=6, sy=0.6, tekst=0.7, steg=2)
    return kort(figur=Graf(f, besk, **{**standard, **v}), riktig=riktig, kommentar=kommentar)


KORT = [
    kort("$f(x) = 3x - 2$", riktig=LI),
    kort("$f(x) = 2 \\cdot 1{,}5^x$", riktig=EK),
    kort("$f(x) = 500 \\cdot 0{,}8^x$", riktig=EK,
         kommentar="Vekstfaktoren $0{,}8$ er mindre enn $1$, så funksjonen avtar med $20$ % for hver enhet. Den er likevel eksponential."),
    kort("$f(x) = 1{,}5x^2$", riktig=PO + PT,
         kommentar="Både og: et andregradspolynom med bare ett ledd, og en potensfunksjon $a \\cdot x^b$ med $b = 2$."),
    kort("$f(x) = \\sqrt{x}$", riktig=PT,
         kommentar="$\\sqrt{x} = x^{0{,}5}$. Eksponenten er ikke et helt tall, så det er ikke et polynom."),
    kort("$f(x) = \\dfrac{3}{x}$", riktig=PT + RA,
         kommentar="Både og: $\\frac{3}{x} = 3 \\cdot x^{-1}$ er en potensfunksjon, og en brøk med polynomer i teller og nevner."),
    kort("$f(x) = \\dfrac{x + 1}{x - 2}$", riktig=RA),
    kort("$f(x) = x^3 - 4x$", riktig=PO),
    kort("$f(x) = 2^x - x^2$", riktig=EK + PO,
         kommentar="Egentlig ingen av boksene: $2^x - x^2$ er en sum av en eksponentialfunksjon og et polynom. "
                   "Både eksponential og polynom godtas. Fint kort å diskutere i klassen."),
    kort("Verdien øker med 4 % hvert år.", riktig=EK),
    kort("Prisen øker med 4 kr for hver kilometer.", riktig=LI),
    kort("Arealet av et kvadrat med side x.", riktig=PO + PT,
         kommentar="$A(x) = x^2$. Både et andregradspolynom og en potensfunksjon."),
    kort("Tiden det tar å kjøre 100 km med farten x.", riktig=PT + RA,
         kommentar="$t(x) = \\frac{100}{x} = 100 \\cdot x^{-1}$. Både en potensfunksjon og en rasjonal funksjon."),
    g(lambda x: 2 ** x, "Graf som ligger over x-aksen hele veien. Den nærmer seg x-aksen til venstre, går gjennom (0, 1) og vokser stadig raskere til høyre.", EK,
      kommentar="Grafen ligger over x-aksen og nærmer seg den til venstre. Det er typisk for $a \\cdot b^x$ med $b > 1$.", punkter=[(0, 1)]),
    g(lambda x: x * (x - 2) * (x + 2), "Graf som kommer nedenfra, har et toppunkt og et bunnpunkt og går opp igjen. Den skjærer x-aksen tre ganger: i −2, 0 og 2.", PO,
      kommentar="Tre nullpunkter og to vendinger: et tredjegradspolynom, her $x(x - 2)(x + 2)$.", punkter=[(-2, 0), (0, 0), (2, 0)]),
    g(lambda x: 1 + 2 / (x - 2), "Graf med to grener. Den har en loddrett asymptote i x = 2 og en vannrett asymptote i y = 1.", RA,
      kommentar="To asymptoter og to grener er typisk for en rasjonal funksjon, her $1 + \\frac{2}{x - 2} = \\frac{x}{x - 2}$."),
    g(lambda x: 2 * math.sqrt(x) if x >= 0 else None, "Graf som starter i origo og bare finnes for x ≥ 0. Den vokser, men stadig langsommere.", PT,
      kommentar="Grafen starter i origo og finnes bare for $x \\geq 0$, som $2\\sqrt{x}$."),
    g(lambda x: -0.5 * x + 2, "Rett linje som synker. Den skjærer y-aksen i 2 og x-aksen i 4.", LI, punkter=[(0, 2), (4, 0)]),
]

FASITNOTAT = ("Kortene med $x^2$, $\\frac{3}{x}$, kvadratarealet og kjøretiden passer i to bokser, og $2^x - x^2$ passer egentlig "
              "ikke i noen. Spør: Hvordan ser du forskjell på $2^x$ og $x^2$ i uttrykket? Hva er forskjellen på en "
              "eksponentialgraf og en potensgraf for negative $x$? Er en lineær funksjon også et polynom?")
