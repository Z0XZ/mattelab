"""Utregning av alle tall i oppgaver og løsningsforslag på siden Faktorisering.
Kjør: python3 verktoy/fasit/faktorisering.py"""
import math

def par(c):
    ut = []
    for m in range(-abs(c), abs(c) + 1):
        if m and c % m == 0 and m <= c // m:
            ut.append((m, c // m))
    return ut

for nr, (b, c) in enumerate([(5, 6), (1, -6), (-7, 12), (4, 5), (6, 9), (0, -9)], 1):
    p = par(c)
    treff = [x for x in p if sum(x) == b]
    D = b * b - 4 * c
    print(f"x² + {b}x + {c}: par {p}  treff {treff}  D = {D}", f" nullpunkter {(-b - math.sqrt(D)) / 2:g}, {(-b + math.sqrt(D)) / 2:g}" if D >= 0 else "")
print("Oppgave 4: x² + 4x + 5 = (x + 2)² + 1 > 0 for alle x; med x = −2:", 4 - 8 + 5)
print("Standard: b = 5, c = 6")
