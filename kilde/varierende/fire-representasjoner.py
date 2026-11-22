"""Kortsett K9: fire representasjoner av samme lineære funksjon. Fire og fire kort hører sammen:
med ord, funksjonsuttrykk, verditabell og graf.
Alle fire kortene i en gruppe lages fra stigningstallet a og konstantleddet b, så de passer alltid sammen.
Tabellene bruker ulike x-verdier, og to av funksjonene går gjennom samme punkt (1, 3), så elevene må se på mer enn ett tall."""
from fractions import Fraction as F

from kortfigurer import Graf
from kortsett import kort

KODE = "K9"
TYPE = "grupper"
STORRELSE = 4
OPPGAVE = ("Finn fire og fire kort som viser samme lineære funksjon: med ord, som uttrykk, som verditabell og som graf. "
           "Forklar hvordan du ser stigningstallet og konstantleddet på hvert kort.")


def tall(x) -> str:
    """Tall i TeX med desimalkomma."""
    x = F(x)
    if x.denominator == 1:
        return str(x.numerator)
    return str(float(x)).replace(".", "{,}")


def tekst_tall(x) -> str:
    return tall(x).replace("{,}", ",").replace("-", "−")


def uttrykk(a, b) -> str:
    a, b = F(a), F(b)
    ledd = "x" if a == 1 else "-x" if a == -1 else f"{tall(a)}x"
    if b:
        ledd += f" {'+' if b > 0 else '-'} {tall(abs(b))}"
    return f"$f(x) = {ledd}$"


def med_ord(a, b) -> str:
    a, b = F(a), F(b)
    start = f"Starter på {tekst_tall(b)}."
    if a.denominator == 1:
        endring = f"{'Øker' if a > 0 else 'Minker'} med {tekst_tall(abs(a))} for hver gang x øker med 1."
    else:
        endring = f"{'Øker' if a > 0 else 'Minker'} med {abs(a.numerator)} for hver gang x øker med {a.denominator}."
    return f"{start} {endring}"


def tabell(a, b, xs) -> str:
    f = lambda x: F(a) * x + F(b)
    topp = " & ".join(tall(x) for x in xs)
    bunn = " & ".join(tall(f(x)) for x in xs)
    return f"$\\begin{{array}}{{c|{'c' * len(xs)}}} x & {topp} \\\\ \\hline f(x) & {bunn} \\end{{array}}$"


def graf(a, b):
    a, b = F(a), F(b)
    f = lambda x: float(a) * x + float(b)
    punkter = [(x, float(a * x + b)) for x in (0, 2) if (a * x + b).denominator == 1]
    besk = (f"Rett linje som {'stiger' if a > 0 else 'synker'}. Den skjærer y-aksen i {tekst_tall(b)} "
            f"og går gjennom punktet (2, {tekst_tall(a * 2 + b)}).")
    return Graf(f, besk, verdi=lambda x: a * x + b, xmin=-3, xmax=6, ymin=-4, ymax=7, sy=0.5, ytall=True,
                punkter=punkter, steg=2, tekst=0.8)


def gruppe(a, b, xs):
    v = lambda x: F(a) * x + F(b)
    return [
        kort(med_ord(a, b), verdi=v),
        kort(uttrykk(a, b), verdi=v),
        kort(tabell(a, b, xs), verdi=v),
        kort(figur=graf(a, b)),
    ]


GRUPPER = [
    gruppe(2, 1, [0, 1, 2, 3]),
    gruppe(1, 2, [-1, 1, 3, 5]),
    gruppe(2, -1, [1, 2, 3, 4]),
    gruppe(-1, 3, [0, 1, 2, 3]),
    gruppe(F(1, 2), -2, [0, 2, 4, 6]),
    gruppe(-2, 4, [-1, 0, 1, 2]),
]

FASITNOTAT = ("Gruppene for 2x + 1 og x + 2 har begge punktet (1, 3) i tabellen. Gruppene for 2x + 1 og 2x − 1 har samme "
              "stigningstall. Tabellen for 0,5x − 2 går med steg på 2. Spør: Hvordan ser du stigningstallet i en tabell "
              "der x ikke øker med 1? Hvor ser du konstantleddet når 0 ikke står i tabellen?")
