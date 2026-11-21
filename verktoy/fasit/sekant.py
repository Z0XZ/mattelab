"""Utregning av alle tall i oppgaver og løsningsforslag på siden om sekant og tangent.
Kjør: python3 verktoy/fasit/sekant.py"""
from fractions import Fraction as F
import math

def sek(f, x0, h): return (f(x0 + h) - f(x0)) / h

kv = lambda x: x * x
print("Oppgave 1: x², fra x = 1 til x = 3:", sek(kv, F(1), F(2)))
print("Oppgave 2: x² i x0 = 1:")
for h in ("1", "0.1", "0.01", "0.001", "-0.1", "-0.01"):
    print(f"   h={h}: {sek(kv, F(1), F(h))} = {float(sek(kv, F(1), F(h)))}")
print("Oppgave 3: f'(x) = 2x:", {x: 2 * x for x in (-1, 0, 2)})
kub = lambda x: x**3 - 3 * x
dkub = lambda x: 3 * x * x - 3
print("Oppgave 4: x³ − 3x: f'(x) = 3x² − 3 = 0 ⇒ x = ±1, f(−1) =", kub(-1), " f(1) =", kub(1))
print("   f'(0) =", dkub(0), " f'(2) =", dkub(2), " f(2) =", kub(2))
print("Oppgave 5: |x| i 0: h = 0,1:", sek(abs, F(0), F("0.1")), " h = −0,1:", sek(abs, F(0), F("-0.1")))
for h in (1, 0.01, 0.0001):
    print(f"   √x i 0, h={h}: {(math.sqrt(h) - 0) / h}")
print("Standard: x², x0 = 1, h = 1: sekant", sek(kv, F(1), F(1)), " tangent 2")
print("e^x i 0: tangent 1; h = 0,1:", (math.exp(0.1) - 1) / 0.1)
