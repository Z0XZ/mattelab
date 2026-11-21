"""Utregning av alle tall i oppgaver og løsningsforslag på siden Fullstendig kvadrat.
Kjør: python3 verktoy/fasit/fullstendig.py"""
from fractions import Fraction as F
import math

def fullfor(b, c):
    p = F(b, 2)
    q = c - p * p
    return p, p * p, q

for nr, (b, c) in enumerate([(6, 0), (6, 5), (-4, 1), (5, 4), (6, 5), (2, 5)], 1):
    p, p2, q = fullfor(b, c)
    los = "ingen" if q > 0 else [float(-p - math.sqrt(-q)), float(-p + math.sqrt(-q))]
    print(f"x² + {b}x + {c} = (x + {p})² + ({q})   p² = {p2}   bunnpunkt ({-p}, {q})   løsninger {los}")
print("Oppgave 3: x² − 4x + 1 med x = 0:", 1, " (0 − 2)² − 3 =", 4 - 3)
print("Oppgave 4: x² + 5x + 4 = (x + 5/2)² − 25/4 + 16/4 = (x + 5/2)² − 9/4; −9/4 =", -9 / 4)
print("Standard: b = 6, c = 5")
