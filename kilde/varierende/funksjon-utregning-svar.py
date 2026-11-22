"""Kortsett K15: funksjon, utregning og svar. Tre og tre kort hører sammen: en funksjon f, regelen brukt
direkte (uforenklet) og den forenklede deriverte.
Hvert kort har uttrykket både som TeX og som Python-funksjon. Byggingen stopper hvis utregningen og svaret
ikke er like, eller ikke stemmer med en numerisk derivert av f."""
import itertools
import math

from kortsett import Kortfeil, kort

KODE = "K15"
TYPE = "grupper"
STORRELSE = 3
OPPGAVE = ("Finn tre og tre kort som hører sammen: en funksjon, utregningen av den deriverte med en regel, "
           "og den forenklede deriverte. Skriv ved hver gruppe hvilken regel som er brukt.")

PUNKTER = [0.5, 1.3, 2.2]
NUMMER = itertools.count(1)


def gruppe(f, ftex, d1, d1tex, d2, d2tex):
    for x in PUNKTER:
        h = 1e-6
        num = (f(x + h) - f(x - h)) / (2 * h)
        for d, navn in ((d1, d1tex), (d2, d2tex)):
            if abs(d(x) - num) > 1e-5 * (1 + abs(num)):
                raise Kortfeil(f"K15: {navn} er ikke den deriverte av {ftex} (x = {x}: {d(x)} mot {num})")
    # Gruppen kjennes igjen på et nummer. f er ikke definert i alle kontrollpunktene (ln, brøk).
    v = next(NUMMER)
    return [
        kort(f"$f(x) = {ftex}$", verdi=v),
        kort(f"$f'(x) = {d1tex}$", verdi=v),
        kort(f"$f'(x) = {d2tex}$", verdi=v),
    ]


e = math.exp
GRUPPER = [
    gruppe(lambda x: x * x * e(x), "x^2 e^x",
           lambda x: 2 * x * e(x) + x * x * e(x), "2x \\cdot e^x + x^2 \\cdot e^x",
           lambda x: x * (x + 2) * e(x), "x(x + 2)e^x"),
    gruppe(lambda x: (2 * x + 1) ** 3, "(2x + 1)^3",
           lambda x: 3 * (2 * x + 1) ** 2 * 2, "3(2x + 1)^2 \\cdot 2",
           lambda x: 6 * (2 * x + 1) ** 2, "6(2x + 1)^2"),
    gruppe(lambda x: x / (x + 1), "\\dfrac{x}{x + 1}",
           lambda x: (1 * (x + 1) - x * 1) / (x + 1) ** 2, "\\dfrac{1 \\cdot (x + 1) - x \\cdot 1}{(x + 1)^2}",
           lambda x: 1 / (x + 1) ** 2, "\\dfrac{1}{(x + 1)^2}"),
    gruppe(lambda x: math.log(x * x + 1), "\\ln(x^2 + 1)",
           lambda x: 1 / (x * x + 1) * 2 * x, "\\dfrac{1}{x^2 + 1} \\cdot 2x",
           lambda x: 2 * x / (x * x + 1), "\\dfrac{2x}{x^2 + 1}"),
    gruppe(lambda x: x * math.log(x), "x \\ln x",
           lambda x: 1 * math.log(x) + x * (1 / x), "1 \\cdot \\ln x + x \\cdot \\dfrac{1}{x}",
           lambda x: math.log(x) + 1, "\\ln x + 1"),
    gruppe(lambda x: e(-x * x), "e^{-x^2}",
           lambda x: e(-x * x) * (-2 * x), "e^{-x^2} \\cdot (-2x)",
           lambda x: -2 * x * e(-x * x), "-2x e^{-x^2}"),
    gruppe(lambda x: e(x) / x, "\\dfrac{e^x}{x}",
           lambda x: (e(x) * x - e(x) * 1) / x ** 2, "\\dfrac{e^x \\cdot x - e^x \\cdot 1}{x^2}",
           lambda x: (x - 1) * e(x) / x ** 2, "\\dfrac{(x - 1)e^x}{x^2}"),
]

FASITNOTAT = ("Reglene: $x^2 e^x$ og $x \\ln x$ med produktregelen, $(2x + 1)^3$, $\\ln(x^2 + 1)$ og $e^{-x^2}$ med kjerneregelen, "
              "$\\frac{x}{x + 1}$ og $\\frac{e^x}{x}$ med brøkregelen. "
              "Fellene: Flere svar inneholder $e^x$, og to har $(x + 1)$ i nevneren. "
              "Spør: Hvordan kan du se på svaret hvilken regel som er brukt? Hvorfor forsvinner x i telleren for $\\frac{x}{x + 1}$?")
