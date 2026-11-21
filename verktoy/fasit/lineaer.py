"""Utregning av alle tall i oppgaver og løsningsforslag på siden om lineære funksjoner.
Kjør: python3 verktoy/fasit/lineaer.py"""
from fractions import Fraction as F

def f(a, b, x): return F(a) * x + F(b)

print("Oppgave 1: f(x) = 2x + b, nullpunkt x = -b/2")
for b in (-3, 0, 3):
    print(f"  b={b}: nullpunkt {F(-b, 2)}, skjæring y-aksen (0, {b})")

print("Oppgave 2: f(x) = ax + 1, f(3) - f(2)")
for a in (2, F(1, 2), -1, 0):
    print(f"  a={a}: f(2)={f(a,1,2)}, f(3)={f(a,1,3)}, økning {f(a,1,3)-f(a,1,2)}")

print("Oppgave 3: linja gjennom to punkter")
for (x1, y1), (x2, y2) in [((1, 2), (4, 8)), ((-2, 5), (2, -1))]:
    a = F(y2 - y1, x2 - x1); b = y1 - a * x1
    print(f"  ({x1},{y1}) og ({x2},{y2}): dy={y2-y1}, dx={x2-x1}, a={a}, b={b}, sjekk {f(a,b,x2)}={y2}, nullpunkt {(-b/a) if a else '-'}")

print("Oppgave 4: stearinlys h(x) = -2,5x + 20")
a, b = F(-5, 2), 20
print("  h(3) =", f(a, b, 3), " brent ut når x =", -F(b) / a)
print("  tabell:", [(x, f(a, b, x)) for x in (0, 2, 4, 6, 8)])
print("  standardoppsett f(x) = 0,5x + 1: nullpunkt", -F(1) / F(1, 2))
