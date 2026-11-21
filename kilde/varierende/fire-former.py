"""Kortsett K8: utvidet form, faktorisert form, nullpunkter og graf. Fire og fire kort hører sammen.
Alle fire kortene i en gruppe lages fra nullpunktene, så de passer alltid sammen.
Nullpunkt-kortet får verdien «produktet av (x − r)», så det sammenlignes på samme måte som de andre."""
from fractions import Fraction as F

from kortfigurer import Parabel
from kortsett import kort

KODE = "K8"
TYPE = "grupper"
STORRELSE = 4
OPPGAVE = ("Finn fire og fire kort som hører til samme andregradsfunksjon: utvidet form, faktorisert form, "
           "nullpunkter og graf.")


def ledd(k: int, v: str, forst: bool) -> str:
    if k == 0:
        return ""
    tall = "" if abs(k) == 1 and v else str(abs(k))
    if forst:
        return ("-" if k < 0 else "") + tall + v
    return (" - " if k < 0 else " + ") + tall + v


def utvidet(r1: int, r2: int) -> str:
    b, c = -(r1 + r2), r1 * r2
    s = "x^2" + ledd(b, "x", False) + ledd(c, "", False)
    return f"$f(x) = {s}$"


def faktor(r: int) -> str:
    if r == 0:
        return "x"
    return f"(x {'-' if r > 0 else '+'} {abs(r)})"


def faktorisert(r1: int, r2: int) -> str:
    if r1 == r2:
        return f"$f(x) = {faktor(r1)}^2$"
    a, b = sorted([r1, r2], key=lambda r: (r != 0, r))  # x først når 0 er et nullpunkt
    return f"$f(x) = {faktor(a)}{faktor(b)}$"


def nullpunkter(r1: int, r2: int) -> str:
    if r1 == r2:
        return f"Ett nullpunkt: $x = {r1}$"
    a, b = sorted([r1, r2])
    return f"Nullpunkter: $x = {a}$ og $x = {b}$"


def gruppe(r1: int, r2: int):
    f = lambda x: (x - r1) * (x - r2)
    b, c = -(r1 + r2), r1 * r2
    return [
        kort(utvidet(r1, r2), verdi=lambda x: x * x + b * x + c),
        kort(faktorisert(r1, r2), verdi=f),
        kort(nullpunkter(r1, r2), verdi=f),
        kort(figur=Parabel(1, r1, r2)),
    ]


GRUPPER = [gruppe(r1, r2) for r1, r2 in [(-2, 3), (2, -3), (1, 4), (-1, -4), (0, 3), (-2, 2), (3, 3)]]

FASITNOTAT = ("Gruppene med nullpunkter −2 og 3 og nullpunkter 2 og −3 ligner hverandre med vilje. "
              "Fortegnet i parentesen er motsatt av fortegnet til nullpunktet. "
              "Spør også: Hvordan ser du konstantleddet på grafen? Hvorfor har (x − 3)² bare ett nullpunkt?")
