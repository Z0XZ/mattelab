"""Utregning av alle tall i oppgaver og løsningsforslag på siden om andregradsfunksjonen.
Kjør: python3 verktoy/fasit/andregrad.py
Tallene på siden skal stemme med utskriften her."""
from fractions import Fraction as F
import math

def analyse(a, b, c):
    a, b, c = F(a), F(b), F(c)
    D = b*b - 4*a*c
    xs = -b/(2*a)
    ys = a*xs*xs + b*xs + c
    if D > 0:
        r = math.sqrt(D)
        n = sorted([(-b - r)/(2*a), (-b + r)/(2*a)])
    elif D == 0:
        n = [xs]
    else:
        n = []
    return D, xs, ys, n

def f(a, b, c, x): return a*x*x + b*x + c

print("Oppgave 1: f(x) = x² + c, bunnpunkt (0, c)")
for c in (-4, 0, 4):
    D, xs, ys, n = analyse(1, 0, c); print(f"  c={c}: D={D}, bunnpunkt=({xs}, {ys}), nullpunkter={n}")

print("Oppgave 2: f(x)=2x²−8x+6")
D, xs, ys, n = analyse(2, -8, 6)
print(f"  D={D}, toppunkt=({xs}, {ys}), nullpunkter={n}, midt={(n[0]+n[1])/2}, f(0)={f(2,-8,6,0)}")
print("  f(x)<0 mellom nullpunktene fordi a>0. Sjekk f(2) =", f(2,-8,6,2), " f(0) =", f(2,-8,6,0), " f(4) =", f(2,-8,6,4))
print("  faktorisert: 2(x−1)(x−3) utvidet =", [2, -2*(1+3), 2*1*3])
print("  toppunktform: 2(x−2)² − 2 utvidet =", [2, -2*2*2, 2*4 - 2])

print("Oppgave 3: f(x)=x²−4x+c, D = 16 − 4c")
for c in (0, 3, 4, 5):
    D, xs, ys, n = analyse(1, -4, c); print(f"  c={c}: D={D}, bunnpunkt=({xs}, {ys}), nullpunkter={[float(x) for x in n]}")

print("Oppgave 4: a=1, c=1, b varierer. Bunnpunkt (−b/2, 1 − b²/4); ligger på y = 1 − x²?")
for b in (-4, -2, 0, 2, 4):
    D, xs, ys, n = analyse(1, b, 1); print(f"  b={b}: bunnpunkt=({xs}, {ys}), 1 − x² = {1 - xs*xs}, lik: {ys == 1 - xs*xs}")
print("  Generelt: y_s = c − b²/(4a) og x_s = −b/(2a) ⇒ b = −2a·x_s ⇒ y_s = c − 4a²x_s²/(4a) = c − a·x_s²")
for a,b,c in ((2,3,-1),(-0.5,1.5,2),(3,-7,0.25)):
    D,xs,ys,n = analyse(a,b,c); print(f"   test a={a},b={b},c={c}: y_s={float(ys)}, c−a·x_s²={float(F(c)-F(a)*xs*xs)}")

print("Oppgave 5: f(x)=ax²+2x+1 når a → 0 (a > 0)")
for a in ("1", "0.5", "0.1", "0.01"):
    D, xs, ys, n = analyse(F(a), 2, 1); print(f"  a={a}: D={float(D)}, bunnpunkt=({float(xs):.4g}, {float(ys):.4g}), nullpunkter={[round(float(x),4) for x in n]}")
print("  a=0: f(x)=2x+1, nullpunkt x =", F(-1,2))

print("Eksempel i forklaringen: f(x)=x²−2x−3")
D, xs, ys, n = analyse(1, -2, -3); print(f"  D={D}, bunnpunkt=({xs}, {ys}), nullpunkter={n}")
