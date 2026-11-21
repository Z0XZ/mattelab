"""Kortsett K3: potenser med samme verdi. Fire og fire kort er like.
Verdiene regnes ut med Fraction, så negative eksponenter blir eksakte brøker."""
from fractions import Fraction as F

from kortsett import kort

KODE = "K3"
TYPE = "grupper"
STORRELSE = 4
OPPGAVE = "Finn fire og fire kort som har samme verdi. Regn uten kalkulator."

GRUPPER = [
    [kort("$2^{-3}$", verdi=F(2) ** -3), kort("$\\dfrac{1}{8}$", verdi=F(1, 8)),
     kort("$0{,}125$", verdi=F(125, 1000)), kort("$\\left(\\dfrac{1}{2}\\right)^3$", verdi=F(1, 2) ** 3)],
    [kort("$5^0$", verdi=F(5) ** 0), kort("$1$", verdi=1),
     kort("$\\dfrac{3^4}{3^4}$", verdi=F(3 ** 4, 3 ** 4)), kort("$(-2)^0$", verdi=F(-2) ** 0)],
    [kort("$10^{-2}$", verdi=F(10) ** -2), kort("$0{,}01$", verdi=F(1, 100)),
     kort("$\\dfrac{1}{100}$", verdi=F(1, 100)), kort("$\\dfrac{10^3}{10^5}$", verdi=F(10 ** 3, 10 ** 5))],
    [kort("$3^2$", verdi=3 ** 2), kort("$9$", verdi=9),
     kort("$(-3)^2$", verdi=(-3) ** 2), kort("$\\dfrac{3^5}{3^3}$", verdi=F(3 ** 5, 3 ** 3))],
    [kort("$-3^2$", verdi=-(3 ** 2)), kort("$-9$", verdi=-9),
     kort("$(-1) \\cdot 3^2$", verdi=-1 * 3 ** 2), kort("$-\\dfrac{3^4}{3^2}$", verdi=-F(3 ** 4, 3 ** 2))],
    [kort("$2^5$", verdi=2 ** 5), kort("$32$", verdi=32),
     kort("$2^2 \\cdot 2^3$", verdi=2 ** 2 * 2 ** 3), kort("$4^2 \\cdot 2$", verdi=4 ** 2 * 2)],
    [kort("$2^6$", verdi=2 ** 6), kort("$64$", verdi=64),
     kort("$(2^3)^2$", verdi=(2 ** 3) ** 2), kort("$4^3$", verdi=4 ** 3)],
    [kort("$2^{-1}$", verdi=F(2) ** -1), kort("$0{,}5$", verdi=F(1, 2)),
     kort("$\\dfrac{2^3}{2^4}$", verdi=F(2 ** 3, 2 ** 4)), kort("$\\dfrac{1}{2}$", verdi=F(1, 2))],
]

FASITNOTAT = ("Fellene er lagt inn med vilje: $-3^2$ og $(-3)^2$, $2^2 \\cdot 2^3$ og $(2^3)^2$, og $2^5$ og $2^6$. "
              "Be elevene skrive potensreglene de brukte, ved siden av hver gruppe.")
