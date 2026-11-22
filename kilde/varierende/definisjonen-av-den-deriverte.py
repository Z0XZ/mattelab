"""Kortsett K12: definisjonen av den deriverte steg for steg. Fire og fire kort hører sammen:
funksjonen, differansen f(x + h) − f(x), differansekvotienten forenklet og den deriverte.
Hvert uttrykk står både som TeX og som funksjon av x og h. Byggingen stopper hvis et steg ikke stemmer:
  differansen = f(x + h) − f(x),  kvotienten · h = differansen,  den deriverte = kvotienten med h = 0."""
from fractions import Fraction as F

from kortsett import Kortfeil, kort

KODE = "K12"
TYPE = "grupper"
STORRELSE = 4
OPPGAVE = ("Finn fire og fire kort som hører sammen: en funksjon f, differansen f(x + h) − f(x), "
           "differansekvotienten forenklet, og den deriverte. Regn selv, og kontroller at kortene stemmer.")

PUNKTER = [(F(3, 7), F(1, 5)), (F(-2), F(1, 3)), (F(5, 2), F(-1, 4)), (F(7), F(2, 9))]


def gruppe(f, ftex, diff, difftex, kvot, kvottex, d, dtex):
    for x, h in PUNKTER:
        if diff(x, h) != f(x + h) - f(x):
            raise Kortfeil(f"K12: differansen stemmer ikke for {ftex}")
        if kvot(x, h) * h != diff(x, h):
            raise Kortfeil(f"K12: differansekvotienten stemmer ikke for {ftex}")
        if kvot(x, F(0)) != d(x):
            raise Kortfeil(f"K12: den deriverte stemmer ikke for {ftex}")
    v = lambda x: f(F(x))
    return [
        kort(f"$f(x) = {ftex}$", verdi=v),
        kort(f"$f(x + h) - f(x) = {difftex}$", verdi=v),
        kort(f"$\\dfrac{{f(x + h) - f(x)}}{{h}} = {kvottex}$", verdi=v),
        kort(f"$f'(x) = {dtex}$", verdi=v),
    ]


GRUPPER = [
    gruppe(lambda x: x ** 2, "x^2",
           lambda x, h: 2 * x * h + h ** 2, "2xh + h^2",
           lambda x, h: 2 * x + h, "2x + h",
           lambda x: 2 * x, "2x"),
    gruppe(lambda x: 2 * x ** 2, "2x^2",
           lambda x, h: 4 * x * h + 2 * h ** 2, "4xh + 2h^2",
           lambda x, h: 4 * x + 2 * h, "4x + 2h",
           lambda x: 4 * x, "4x"),
    gruppe(lambda x: x ** 2 + 3 * x, "x^2 + 3x",
           lambda x, h: 2 * x * h + h ** 2 + 3 * h, "2xh + h^2 + 3h",
           lambda x, h: 2 * x + h + 3, "2x + h + 3",
           lambda x: 2 * x + 3, "2x + 3"),
    gruppe(lambda x: 3 * x - 1, "3x - 1",
           lambda x, h: 3 * h, "3h",
           lambda x, h: F(3), "3",
           lambda x: F(3), "3"),
    gruppe(lambda x: x ** 3, "x^3",
           lambda x, h: 3 * x ** 2 * h + 3 * x * h ** 2 + h ** 3, "3x^2h + 3xh^2 + h^3",
           lambda x, h: 3 * x ** 2 + 3 * x * h + h ** 2, "3x^2 + 3xh + h^2",
           lambda x: 3 * x ** 2, "3x^2"),
    gruppe(lambda x: 1 / x, "\\dfrac{1}{x}",
           lambda x, h: -h / (x * (x + h)), "-\\dfrac{h}{x(x + h)}",
           lambda x, h: -1 / (x * (x + h)), "-\\dfrac{1}{x(x + h)}",
           lambda x: -1 / x ** 2, "-\\dfrac{1}{x^2}"),
]

FASITNOTAT = ("Fellene: $x^2$ og $2x^2$ gir uttrykk som ligner, og det samme gjør $x^2$ og $x^2 + 3x$. "
              "For $3x - 1$ forsvinner h helt, så den deriverte er konstant. "
              "Spør: Hvorfor kan vi ikke sette h = 0 i differansekvotienten før vi har forkortet? "
              "Hvilket ledd i differansen forsvinner alltid når vi trekker fra f(x)?")
