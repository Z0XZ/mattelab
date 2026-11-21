"""Utregning av alle tall i oppgaver og løsningsforslag på siden om funksjonen og den deriverte.
f(x) = ax³ + bx² + cx + d. Kjør: python3 verktoy/fasit/derivert.py"""
from fractions import Fraction as F
import math

def lag(a, b, c, d):
    a, b, c, d = map(F, (a, b, c, d))
    f = lambda x: a * x**3 + b * x**2 + c * x + d
    df = lambda x: 3 * a * x**2 + 2 * b * x + c
    return f, df

def nullpunkter_df(a, b, c):
    A, B, C = 3 * F(a), 2 * F(b), F(c)
    D = B * B - 4 * A * C
    if D < 0: return D, []
    r = math.sqrt(D)
    return D, sorted([(-B - F(r)) / (2 * A), (-B + F(r)) / (2 * A)]) if D > 0 else [(-B) / (2 * A)]

f, df = lag(1, 0, -3, 0)
print("Oppgave 1: x³ − 3x: f'-nullpunkter", nullpunkter_df(1, 0, -3), " f(−1) =", f(-1), " f(1) =", f(1))
print("Oppgave 2: f'(2) =", df(2), " f(2) =", f(2), " f'(0) =", df(0), " f'(−2) =", df(-2))
print("Oppgave 3: x³ + cx: f' = 3x² + c")
for c in (-3, 0, 3):
    print(f"   c={c}: D = {nullpunkter_df(1, 0, c)}")
f, df = lag(1, -3, 0, 4)
print("Oppgave 4: x³ − 3x² + 4: f' nullpunkter", nullpunkter_df(1, -3, 0), " f(0) =", f(0), " f(2) =", f(2),
      " vendepunkt x =", F(3, 3), " f(1) =", f(1), " f'(1) =", df(1))
f, df = lag(4, -40, 100, 0)
D, r = nullpunkter_df(4, -40, 100)
print("Oppgave 5: V(x) = x(10 − 2x)² = 4x³ − 40x² + 100x. Sjekk V(1) =", f(1), "=", 1 * (10 - 2) ** 2)
print("   V'(x) = 12x² − 80x + 100, D =", D, " nullpunkter", r)
x = F(5, 3)
print("   V(5/3) =", f(x), "=", float(f(x)), " sidekant bunn 10 − 2x =", 10 - 2 * x)
print("   V(1) =", f(1), " V(2) =", f(2), " V(2,5) =", f(F(5, 2)))
