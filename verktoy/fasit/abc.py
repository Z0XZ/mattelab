"""Utregning av alle tall i oppgaver og løsningsforslag på siden abc-formelen.
Kjør: python3 verktoy/fasit/abc.py"""
import math

def abc(a, b, c):
    D = b * b - 4 * a * c
    xs = -b / (2 * a)
    if D < 0:
        return D, xs, None, []
    d = math.sqrt(D) / abs(2 * a)
    return D, xs, d, sorted({(-b - math.sqrt(D)) / (2 * a), (-b + math.sqrt(D)) / (2 * a)})

for nr, (a, b, c) in enumerate([(1, -2, -3), (1, -2, 1), (1, -2, 3), (2, -8, 6), (-1, 4, -3), (1, -4, 3)], 1):
    D, xs, d, x = abc(a, b, c)
    print(f"{a}x² + {b}x + {c} = 0: D = {D}, symmetrilinje x = {xs:g}, avstand {d}, løsninger {x}")
print("Oppgave 4: midt mellom 1 og 3 er", (1 + 3) / 2, " og −b/2a = 8/4 =", 8 / 4)
print("Standard: a = 1, b = −2, c = −3")
