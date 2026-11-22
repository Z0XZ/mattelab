"""Utregning av tallene i oppgavene til utforskeren «Stigningstallfunksjonen».
Kjør: python3 verktoy/fasit/stigningstallfunksjon.py"""
from fractions import Fraction as F
import math


def tangent(f, d, x0):
    """Tangenten y = ax + b i x0."""
    a = d(x0)
    return a, f(x0) - a * x0


print("Oppgave 1: f(x) = x³ − 3x, f′(x) = 3x² − 3")
f = lambda x: x ** 3 - 3 * x
d = lambda x: 3 * x ** 2 - 3
for x in (-2, -1, 0, 1, 2):
    print(f"  x = {x:>2}: f = {f(x):>3}, f′ = {d(x):>3}")
print("  f′(x) = 0 gir x² = 1, x = ±1. f′ < 0 for −1 < x < 1.")
print(f"  Toppunkt (−1, {f(-1)}), bunnpunkt (1, {f(1)})")

print("Oppgave 2: f(x) = ¼x⁴ − 2x², f′(x) = x³ − 4x = x(x − 2)(x + 2)")
f = lambda x: F(x) ** 4 / 4 - 2 * F(x) ** 2
d = lambda x: F(x) ** 3 - 4 * F(x)
for x in (-3, -2, -1, 0, 1, 2, 3):
    print(f"  x = {x:>2}: f = {str(f(x)):>5}, f′ = {str(d(x)):>4}")
print("  Fortegn til f′ rundt nullpunktene:")
for x in (-2, 0, 2):
    print(f"    x = {x}: f′({x} − 0,1) = {float(d(x - F(1, 10))):.3f}, f′({x} + 0,1) = {float(d(x + F(1, 10))):.3f}")

print("Oppgave 3: f(x) = eˣ, f′(x) = eˣ")
for x in (-1, 0, 1, 2):
    print(f"  x = {x:>2}: f = f′ = {math.exp(x):.4f}")
a, b = tangent(math.exp, math.exp, 0)
print(f"  Tangent i x = 0: y = {a}x + {b}")
a, b = tangent(math.exp, math.exp, 1)
print(f"  Tangent i x = 1: y = {a:.4f}x + {b:.4f} (skal være y = ex, b = 0)")

print("Oppgave 4: f(x) = ln x, f′(x) = 1/x")
for x in (F(1, 2), 1, 2, 4):
    print(f"  x = {x}: f′ = {1 / F(x)}")
a, b = tangent(math.log, lambda x: 1 / x, 1)
print(f"  Tangent i x = 1: y = {a}x + {b}")

print("Oppgave 5: f(x) = |x|")
print("  f′(x) = −1 for x < 0, 1 for x > 0. f′(0) finnes ikke.")
print("  Sekantstigning fra høyre: (|h| − 0)/h for h = 0,1:", abs(0.1) / 0.1, " fra venstre h = −0,1:", abs(-0.1) / -0.1)
