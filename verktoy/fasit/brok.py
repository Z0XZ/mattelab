"""Utregning av alle tall i oppgaver og løsningsforslag på siden Brøk som areal.
Kjør: python3 verktoy/fasit/brok.py"""
from fractions import Fraction as F
from math import lcm

print("Oppgave 1: 2/3 · 3/4 =", F(2, 3) * F(3, 4), "(urent 6/12)  mindre enn 2/3?", F(2, 3) * F(3, 4) < F(2, 3))
print("Oppgave 2: 1/2 + 1/3 =", F(1, 2) + F(1, 3), " felles nevner", lcm(2, 3), " feil svar 2/5 =", float(F(2, 5)), "sammenlign 1/2 =", 0.5)
print("Oppgave 3: 3/4 : 1/8 =", F(3, 4) / F(1, 8), " felles nevner", lcm(4, 8), " 3/4 = 6/8")
print("Oppgave 4: 2/3 : 1/4 =", F(2, 3) / F(1, 4), "=", float(F(2, 3) / F(1, 4)), " felles nevner", lcm(3, 4), " 2/3 = 8/12, 1/4 = 3/12, 8/3 = 2 2/3")
print("Oppgave 5: 3/4 · 1/2 =", F(3, 4) * F(1, 2), " 3/4 · 3/2 =", F(3, 4) * F(3, 2), "=", float(F(3, 4) * F(3, 2)), " 3/4 · 1 =", F(3, 4))
print("Standard: 2/3 · 3/4")
