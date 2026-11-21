"""Utregning av alle tall i oppgaver og løsningsforslag på siden om rasjonale funksjoner.
f(x) = (ax + b)/(cx + d). Kjør: python3 verktoy/fasit/rasjonal.py"""
from fractions import Fraction as F

def f(a, b, c, d, x):
    x = F(x); n = c * x + d
    return None if n == 0 else (a * x + b) / n

def info(a, b, c, d):
    det = a * d - b * c
    return dict(det=det, loddrett=F(-d, c) if c else None, vannrett=F(a, c) if c else None,
                nullpunkt=F(-b, a) if a else None, yakse=F(b, d) if d else None)

print("Oppgave 1: 1/x:", info(0, 1, 1, 0))
print("Oppgave 1: (2x + 1)/(x − 1):", info(2, 1, 1, -1))
print("Oppgave 2: verdier nær x = 1 for (2x + 1)/(x − 1)")
for x in ("0.9", "0.99", "0.999", "1.001", "1.01", "1.1"):
    print(f"  f({x}) = {float(f(2, 1, 1, -1, F(x)))}")
print("  f(100) =", float(f(2, 1, 1, -1, 100)), " f(-100) =", float(f(2, 1, 1, -1, -100)))
print("Oppgave 3: (2x − 4)/(x − 2):", info(2, -4, 1, -2), " f(1) =", f(2, -4, 1, -2, 1), " f(3) =", f(2, -4, 1, -2, 3))
print("           (2x − 3)/(x − 2):", info(2, -3, 1, -2), " f(1) =", f(2, -3, 1, -2, 1), " f(3) =", f(2, -3, 1, -2, 3))
print("Oppgave 4: G(x) = (15x + 200)/x:", info(15, 200, 1, 0))
for x in (10, 40, 100, 1000):
    print(f"  G({x}) = {f(15, 200, 1, 0, x)} = {float(f(15, 200, 1, 0, x))}")
print("  G(x) < 20 ⇔ 15x + 200 < 20x ⇔ x > 40 (x > 0)")
print("Oppgave 5: f(x) = a/c ⇔ c(ax + b) = a(cx + d) ⇔ bc = ad")
print("Standard: (2x + 1)/(x − 1)")
