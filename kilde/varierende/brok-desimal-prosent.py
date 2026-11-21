"""Kortsett K1: brøk, figur, desimaltall og prosent. Fire og fire kort har samme verdi.
Desimaltall og prosent regnes ut fra brøken med Fraction, så de kan ikke bli feil."""
from fractions import Fraction as F

from kortfigurer import Brok
from kortsett import kort

KODE = "K1"
TYPE = "grupper"
STORRELSE = 4
OPPGAVE = "Finn fire og fire kort som viser samme tall: en brøk, en figur, et desimaltall og en prosent."


def tall_tex(x: F, des: int = 3) -> str:
    """Desimaltall med komma. Gir «≈» når tallet må avrundes."""
    d = float(x)
    if (x * 10 ** des).denominator == 1:
        s = f"{d:.{des}f}".rstrip("0").rstrip(".")
        return s.replace(".", "{,}")
    return None


def gruppe(t, n, figur, desimal=None, prosent=None):
    v = F(t, n)
    d = tall_tex(v)
    p = tall_tex(v * 100)
    return [
        kort(f"$\\dfrac{{{v.numerator}}}{{{v.denominator}}}$", verdi=v),
        kort(figur=figur),
        kort(desimal or f"${d}$", verdi=v),
        kort(prosent or f"${p}\\,\\%$", verdi=v),
    ]


GRUPPER = [
    gruppe(3, 4, Brok(6, 8, "rutenett", rader=2)),
    gruppe(2, 5, Brok(4, 10, "rutenett", rader=2)),
    gruppe(1, 8, Brok(1, 8, "sirkel")),
    gruppe(5, 4, Brok(5, 4, "strimmel")),
    gruppe(3, 10, Brok(3, 10, "strimmel")),
    gruppe(7, 20, Brok(7, 20, "rutenett", rader=4)),
    gruppe(1, 4, Brok(4, 16, "rutenett", rader=4)),
]
# 2/3 går ikke opp som desimaltall. Kortene viser det med periode og avrunding.
GRUPPER.append([
    kort("$\\dfrac{2}{3}$", verdi=F(2, 3)),
    kort(figur=Brok(2, 3, "sirkel")),
    kort("$0{,}\\overline{6}$", verdi=F(2, 3)),
    kort("$66\\tfrac{2}{3}\\,\\%$", verdi=F(2, 3)),
])

FASITNOTAT = ("Figurene viser ofte en utvidet brøk, for eksempel 6 av 8 ruter for 3/4. Da må elevene forkorte. "
              "Kortene 0,3 og 0,35 og kortene 30 % og 35 % ligner hverandre med vilje. "
              "Spør gjerne: Hvorfor er 5/4 større enn 100 %? Hvorfor stopper ikke desimaltallet for 2/3?")
