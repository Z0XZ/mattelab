"""Utregning av tallene i oppgavene og løsningsforslagene om polynomfunksjoner.
f(x) = a(x − r1)(x − r2)…  Kjør: python3 verktoy/fasit/polynom.py"""
from fractions import Fraction as F
import math


def fra_rotter(a, rotter):
    p = [F(a)]
    for r in rotter:
        q = [F(0)] * (len(p) + 1)
        for i, c in enumerate(p):
            q[i] -= c * F(r)
            q[i + 1] += c
        p = q
    return p


def tekst(p):
    deler = []
    for i in range(len(p) - 1, -1, -1):
        if p[i]:
            deler.append(f"{float(p[i]):+g}" + (f"x^{i}" if i > 1 else "x" if i == 1 else ""))
    return " ".join(deler)


def verdi(p, x):
    return sum(c * x ** i for i, c in enumerate(p))


def deriver(p):
    return [c * i for i, c in enumerate(p)][1:]


def rotter_num(p, a=-50.0, b=50.0, n=200000):
    """Nullpunkter numerisk (fortegnsskifte eller nær null) – bare til kontroll."""
    ut, fx = [], [float(verdi(p, a + (b - a) * k / n)) for k in range(n + 1)]
    for k in range(n):
        if fx[k] == 0 or fx[k] * fx[k + 1] < 0:
            lo, hi = a + (b - a) * k / n, a + (b - a) * (k + 1) / n
            for _ in range(80):
                m = (lo + hi) / 2
                if float(verdi(p, lo)) * float(verdi(p, m)) <= 0:
                    hi = m
                else:
                    lo = m
            ut.append(round((lo + hi) / 2, 6))
    return sorted(set(ut))


def ekstremal(p):
    d, d2 = deriver(p), deriver(deriver(p))
    ut = []
    for x in rotter_num(d):
        s = float(verdi(d2, x))
        ut.append((round(x, 4), round(float(verdi(p, x)), 4), "bunn" if s > 1e-9 else "topp" if s < -1e-9 else "?"))
    return ut


def vis(navn, a, rotter):
    p = fra_rotter(a, rotter)
    print(f"{navn}: a = {a}, nullpunkter {rotter}")
    print("   utvidet:", tekst(p), "  f(0) =", verdi(p, 0))
    print("   ekstremalpunkter:", ekstremal(p))
    n = len(rotter)
    print("   x → +∞:", "+∞" if a > 0 else "−∞", "  x → −∞:", ("+∞" if a > 0 else "−∞") if n % 2 == 0 else ("−∞" if a > 0 else "+∞"))
    return p


print("Oppgave 1")
vis("  grad 3", 1, [-2, 1, 3]); vis("  grad 3", -1, [-2, 1, 3]); vis("  grad 4", 1, [-2, 1, 3, 4]); vis("  grad 4", -1, [-2, 1, 3, 4])
print("Oppgave 2")
p = vis("  standard", 1, [-2, 1, 3])
print("   a·(−r1)(−r2)(−r3) =", 1 * 2 * (-1) * (-3))
print("Oppgave 3")
p = vis("  (x − 1)²(x + 2)", 1, [1, 1, -2])
print("   fortegn rundt x = 1: f(0,9) =", float(verdi(p, F(9, 10))), " f(1,1) =", float(verdi(p, F(11, 10))))
print("Oppgave 4")
a = F(4) / (F(1) * F(-2) * F(-4))
print("   a · (0 + 1)(0 − 2)(0 − 4) = 8a = 4 gir a =", a)
p = vis("  svar", a, [-1, 2, 4])
print("Oppgave 5")
vis("  x(x − 3)(x + 3)", 1, [0, 3, -3]); print("   √3 =", math.sqrt(3), " 6√3 =", 6 * math.sqrt(3))
vis("  (x − 1)³", 1, [1, 1, 1])
vis("  (x + 2)(x + 1)(x − 1)(x − 2)", 1, [-2, -1, 1, 2]); print("   √2,5 =", math.sqrt(2.5))
print("Standard (grad 3, a = 1, −2, 1, 3)")
vis("  standard", 1, [-2, 1, 3])
