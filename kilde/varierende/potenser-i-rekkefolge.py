"""Kortsett K4: potenser i rekkefølge fra minst til størst. Ingen to kort har samme verdi."""
from fractions import Fraction as F

from kortsett import kort

KODE = "K4"
TYPE = "ordne"
RETNING = "Fra minst til størst"
OPPGAVE = "Legg kortene i rekkefølge fra minst til størst. Regn uten kalkulator."

KORT = [
    kort("$(-2)^3$", verdi=F(-2) ** 3),
    kort("$-2^2$", verdi=-(F(2) ** 2)),
    kort("$10^{-1}$", verdi=F(10) ** -1),
    kort("$2^{-2}$", verdi=F(2) ** -2),
    kort("$3^{-1}$", verdi=F(3) ** -1),
    kort("$5^0$", verdi=F(5) ** 0),
    kort("$0{,}5^{-1}$", verdi=F(1, 2) ** -1),
    kort("$1{,}5^2$", verdi=F(3, 2) ** 2),
    kort("$\\left(\\dfrac{1}{2}\\right)^{-3}$", verdi=F(1, 2) ** -3),
    kort("$3^2$", verdi=F(3) ** 2),
]

FASITNOTAT = ("Mange tror at en negativ eksponent gir et negativt tall. Kortene $2^{-2}$, $3^{-1}$ og $10^{-1}$ er positive, "
              "men mindre enn 1. Kortene $0{,}5^{-1}$ og $(1/2)^{-3}$ er større enn 1. Spør: Når blir en potens negativ?")
