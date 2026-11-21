"""Utregning av alle tall i oppgaver og løsningsforslag på siden Potensreglene.
Kjør: python3 verktoy/fasit/potenser.py"""
from fractions import Fraction as F

print("Oppgave 1: 2³ · 2⁴ = 2^", 3 + 4, "=", 2 ** 7, " (8 · 16 =", 8 * 16, ")")
print("Oppgave 2: 2⁵ / 2² = 2^", 5 - 2, "=", F(2) ** 3, "   2² / 2⁵ = 2^", 2 - 5, "=", F(2) ** -3)
print("Oppgave 3: 2³ / 2³ = 2^0 =", F(2) ** 0, "  8/8 =", F(8, 8))
print("Oppgave 4: (2³)² = 2^", 3 * 2, "=", 2 ** 6, "   2^(3+2) =", 2 ** 5, "   8² =", 8 ** 2)
print("Oppgave 5: 2^3..2^-3:", [str(F(2) ** k) for k in range(3, -4, -1)], " 10^-1 =", float(F(10) ** -1), " 10^-3 =", float(F(10) ** -3))
print("Standard: produkt, 2³ · 2⁴")
