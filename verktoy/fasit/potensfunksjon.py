"""Utregning av tallene i oppgavene om potensfunksjoner f(x) = a · x^b.
Kjør: python3 verktoy/fasit/potensfunksjon.py"""
from fractions import Fraction as F
import math


def f(a, b, x):
    b = F(b)
    if x < 0:
        if b.denominator % 2 == 0:
            return None
        s = abs(x) ** float(b)
        return a * (s if b.numerator % 2 == 0 else -s)
    if x == 0:
        return None if b < 0 else 0
    return a * x ** float(b)


print("Oppgave 1: a = 1, alle eksponentene går gjennom (1, 1)")
for b in ("-2", "-1", "-1/2", "1/3", "1/2", "1", "3/2", "2", "3"):
    print(f"  b = {b:>5}: f(1) = {f(1, b, 1)}, f(0) = {f(1, b, 0)}, f(4) = {f(1, b, 4)}")
print("Oppgave 2: x^(1/2) og x^2")
for x in (F(1, 4), F(1, 2), 1, 4, 9):
    print(f"  x = {x}: √x = {f(1, '1/2', x):.4f}, x² = {f(1, '2', x)}")
print("Oppgave 3: 1/x og 1/x²")
for x in (-2, F(-1, 2), F(1, 10), F(1, 2), 2, 10):
    print(f"  x = {x}: 1/x = {f(1, '-1', x)}, 1/x² = {f(1, '-2', x)}")
print("Oppgave 4: definisjonsmengder")
for b in ("1/2", "1/3", "-1/2"):
    print(f"  b = {b}: f(−8) = {f(1, b, -8)}, f(8) = {f(1, b, 8)}")
print("Oppgave 5: pendel T(L) = 2,01 · L^0,5")
a = 2.01
for L in (0.25, 1, 4):
    print(f"  T({L}) = {a * L ** 0.5:.4f}")
L3 = (3 / a) ** 2
print(f"  T = 3 gir L = (3/2,01)² = {L3:.4f}")
print(f"  2π/√9,81 = {2 * math.pi / math.sqrt(9.81):.4f}")
