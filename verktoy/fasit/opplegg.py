"""Utregning av tallene i oppgavene og eksemplene i undervisningsoppleggene (kilde/opplegg/).
Kjør: python3 verktoy/fasit/opplegg.py"""
from fractions import Fraction as F
import math


def linje(p, q):
    a = F(q[1] - p[1], q[0] - p[0]) if isinstance(p[1], int) else (F(q[1]) - F(p[1])) / (F(q[0]) - F(p[0]))
    return a, F(p[1]) - a * p[0]


def rot2(a, b, c):
    D = b * b - 4 * a * c
    return D, sorted([(-b - math.sqrt(D)) / (2 * a), (-b + math.sqrt(D)) / (2 * a)]) if D >= 0 else []


print("== Hva er en funksjon?")
K = lambda x: 250 * x + 300
print("  treningssenter K(x) = 250x + 300:", [K(x) for x in range(5)])
a, b = linje((2, 7), (6, 15)); print("  tabell (2, 7), (4, 11), (6, 15): a =", a, "b =", b, " f(10) =", a * 10 + b, " f(x) = 51 gir x =", (51 - b) / a)
print("  kontroll (4, 11):", a * 4 + b)
print("  stearinlys h(x) = 20 − 2,5x: h(3) =", 20 - F(5, 2) * 3, " h(x) = 0 gir x =", F(20) / F(5, 2))

print("== Stigningstall ved regning")
print("  (−2, 7) og (3, −3):", linje((-2, 7), (3, -3)))
a, b = linje((-1, F(1)), (5, F(4))); print("  tabell (−1, 1), (2, 2,5), (5, 4): a =", a, "b =", b, " kontroll f(2) =", a * 2 + b)
a, b = linje((4, 180), (10, 330)); print("  taxi (4, 180), (10, 330): a =", a, "b =", b, " pris 15 km =", a * 15 + b)
print("  oppstart (1, 2) og (4, 8):", linje((1, 2), (4, 8)))

print("== Andregradsfunksjoner")
f = lambda x: x * x - 2 * x - 8
print("  x² − 2x − 8: nullpunkter", rot2(1, -2, -8), " bunnpunkt (1,", f(1), ")  (x − 1)² − 9 i x = 5:", (5 - 1) ** 2 - 9, f(5))
a = F(6) / ((0 + 1) * (0 - 3)); g = lambda x: a * (x + 1) * (x - 3)
print("  nullpunkter −1 og 3 gjennom (0, 6): a =", a, " utvidet:", [a, -2 * a, -3 * a], " toppunkt (1,", g(1), ")")
h = lambda t: -5 * t * t + 20 * t + 1
D, r = rot2(-5, 20, 1); print("  h(t) = −5t² + 20t + 1: topp (2,", h(2), "), lander t =", round(max(r), 4), " D =", D)

print("== Polynomfunksjoner")
f = lambda x: -(x + 1) * (x - 2) ** 2
print("  −(x + 1)(x − 2)²: f(0) =", f(0), " testpunkter:", {x: f(x) for x in (-2, 0, 1, 3)})
print("  utvidet: −(x + 1)(x² − 4x + 4) =", "−x³ + 3x² − 4")
for x in (-2, 0, 1, 3):
    assert f(x) == -x ** 3 + 3 * x ** 2 - 4
a = F(8) / (2 * 1 * (-1) * (-2)); print("  grad 4, nullpunkter ±1, ±2, f(0) = 8: a =", a)
print("  eksempler: x³ + x har 1 nullpunkt, (x − 1)²(x + 1) har 2, x(x − 1)(x + 1) har 3")

print("== Eksponentialfunksjoner")
print("  dobling av 1 øre: dag 30 =", 2 ** 29 / 100, "kr, sum 30 dager =", (2 ** 30 - 1) / 100, "kr, mot 30 · 1000 =", 30000)
print("  vekstfaktorer: +8 % → 1,08; −15 % → 0,85; 1,035 → +3,5 %; 0,7 → −30 %")
V = lambda t: 350000 * 0.88 ** t
print(f"  bil V(5) = {V(5):.2f}, halvert når t = {math.log(0.5) / math.log(0.88):.3f}")
print("  tabeller: A 2, 6, 18, 54 (×3); B 2, 6, 10, 14 (+4); C 100, 90, 81, 72,9 (×0,9):", [100 * 0.9 ** k for k in range(4)])

print("== Potens- og rotfunksjoner")
print("  x² og 2^x:", {x: (x * x, 2 ** x) for x in (1, 2, 3, 4, 5, 10)})
print(f"  sirkel A(3) = {math.pi * 9:.3f}, A = 50 gir r = {math.sqrt(50 / math.pi):.4f}")

print("== Rasjonale funksjoner og polynomdivisjon")
print("  (2x − 1)/(x + 3): x = −3, y = 2, nullpunkt", F(1, 2), " f(0) =", F(-1, 3))
P = lambda x: x ** 3 + 2 * x ** 2 - 5 * x - 6
print("  P(2) =", P(2), " (x − 2)(x² + 4x + 3):", all(P(x) == (x - 2) * (x * x + 4 * x + 3) for x in range(-5, 6)), " x² + 4x + 3 = (x + 1)(x + 3)")
print("  (x² + 3x) : (x − 1) = x + 4, rest:", 1 + 3 * 1, " kontroll:", all(x * x + 3 * x == (x - 1) * (x + 4) + 4 for x in range(-5, 6)))
print("  1/x nær 0:", {x: 1 / x for x in (1, 0.1, 0.01, -0.01, -0.1)})

print("== Modellering og regresjon")
h = lambda n: F(12, 10) * n + F(73, 10)
print("  koppestabel h(n) = 1,2n + 7,3: h(1) =", float(h(1)), " h(20) =", float(h(20)))

print("== Likningssystemer og ulikheter")
print("  abonnement 199 + 10x = 99 + 30x gir x =", F(100, 20), " pris da:", 199 + 10 * 5)
print("  2x + y = 7, x − y = 2: x = 3, y = 1:", 2 * 3 + 1, 3 - 1)
print("  x² − x − 6 ≤ 0:", rot2(1, -1, -6), "  x² > 4x ⇔ x(x − 4) > 0: x < 0 eller x > 4")

print("== Repetisjon")
print("  (2, 5) og (6, −3):", linje((2, 5), (6, -3)))
print("  −x³ + 4x = −x(x − 2)(x + 2), nullpunkter −2, 0, 2:", [-x ** 3 + 4 * x for x in (-2, 0, 2)])
print("  (x − 1)(x + 3) < 0: −3 < x < 1")
