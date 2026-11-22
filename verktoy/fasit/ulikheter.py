"""Utregning av tallene i oppgavene om andregradsulikheter.  Kjør: python3 verktoy/fasit/ulikheter.py"""
from fractions import Fraction as F
import math


def nullpunkter(a, b, c):
    D = b * b - 4 * a * c
    if D < 0:
        return D, []
    if D == 0:
        return D, [F(-b, 2 * a)]
    r = math.isqrt(D) if D >= 0 and math.isqrt(D) ** 2 == D else None
    if r is not None:
        return D, sorted([F(-b - r, 2 * a), F(-b + r, 2 * a)])
    return D, sorted([(-b - math.sqrt(D)) / (2 * a), (-b + math.sqrt(D)) / (2 * a)])


def vis(navn, a, b, c, rel):
    D, n = nullpunkter(a, b, c)
    f = lambda x: a * x * x + b * x + c
    test = [n[0] - 1] + [(n[i] + n[i + 1]) / 2 for i in range(len(n) - 1)] + [n[-1] + 1] if n else [0]
    print(f"{navn}: {a}x² + {b}x + {c} {rel} 0   D = {D}, nullpunkter {[str(x) for x in n]}")
    print("    fortegn i testpunkter:", {str(x): f(x) for x in test})


vis("Oppgave 1", 1, -2, -3, ">")
vis("Oppgave 2", 1, -2, -3, "≤")
vis("Oppgave 3", -1, 1, 6, "≥")
vis("        ganget med −1", 1, -1, -6, "≤")
vis("Oppgave 4", 1, 2, 5, "> og <")
vis("        (x − 2)²", 1, -4, 4, "≤")
print("Oppgave 5: h(t) = −5t² + 20t + 1 > 16  ⇔  −5t² + 20t − 15 > 0")
vis("        ", -5, 20, -15, ">")
print("    h(1) =", -5 + 20 + 1, " h(3) =", -45 + 60 + 1, " h(2) =", -20 + 40 + 1)
vis("Standard", 1, -2, -3, ">")
