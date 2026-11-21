"""Utregning av alle tall i oppgaver og løsningsforslag på siden om likningssett.
Kjør: python3 verktoy/fasit/likningssett.py
Likningene er på formen a1·x + b1·y = c1 og a2·x + b2·y = c2."""
from fractions import Fraction as F

def los(a1, b1, c1, a2, b2, c2):
    a1, b1, c1, a2, b2, c2 = map(F, (a1, b1, c1, a2, b2, c2))
    det = a1 * b2 - a2 * b1
    if det != 0:
        return "én", ((c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det), det
    samme = a1 * c2 - a2 * c1 == 0 and b1 * c2 - b2 * c1 == 0
    return ("uendelig mange" if samme else "ingen"), None, det

for navn, s in [
    ("Standard / oppgave 1: 2x + y = 5, x − y = 1", (2, 1, 5, 1, -1, 1)),
    ("Oppgave 2: x + 2y = 4, x + 2y = 1", (1, 2, 4, 1, 2, 1)),
    ("Oppgave 2: x + 2y = 4, x + 2y = 4", (1, 2, 4, 1, 2, 4)),
    ("Oppgave 2: x + 2y = 4, 2x + 4y = 8", (1, 2, 4, 2, 4, 8)),
    ("Oppgave 3: 3x + 2y = 6, x − 2y = 1", (3, 2, 6, 1, -2, 1)),
    ("Oppgave 4: 3v + 2b = 590, v + 4b = 480", (3, 2, 590, 1, 4, 480)),
    ("Oppgave 5: kx + y = 3, 2x + y = 1 med k = 2", (2, 1, 3, 2, 1, 1)),
    ("Oppgave 5: k = 3", (3, 1, 3, 2, 1, 1)),
]:
    t, p, det = los(*s)
    print(f"{navn}: {t} løsning, det = {det}", "" if p is None else f"x = {p[0]} ({float(p[0])}), y = {p[1]} ({float(p[1])})")
# Kontroll av oppgave 4
v, b = 140, 85
print("Kontroll oppgave 4:", 3*v + 2*b, v + 4*b)
print("Oppgave 5: det = k·1 − 2·1 = k − 2, null når k = 2")
print("Oppgave 3, y-form: y = (6 − 3x)/2 = −1,5x + 3 og y = (1 − x)/(−2) = 0,5x − 0,5")
