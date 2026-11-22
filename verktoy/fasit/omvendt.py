"""Utregning av tallene i oppgavene til utforskeren «Omvendte funksjoner».
Kjør: python3 verktoy/fasit/omvendt.py"""
import math

print("Oppgave 1: eˣ og ln x")
for a in (0, 1, -1):
    b = math.exp(a)
    print(f"  a = {a}: P = ({a}, {b:.4f}), Q = ({b:.4f}, {a}), f′(a) = {b:.4f}, g′ i Q = {1 / b:.4f}, 1/x i Q = {1 / b:.4f}")
print("Oppgave 2: x² og √x")
for a in (2, 1, 0.5):
    b = a * a
    print(f"  a = {a}: Q = ({b}, {a}), f′(a) = {2 * a}, g′ i Q = {1 / (2 * a)}, 1/(2√{b}) = {1 / (2 * math.sqrt(b))}")
print("  a = 0: f′(0) = 0, loddrett tangent for √x i origo")
print("Oppgave 3: x³ og ∛x")
for a in (1, 2, -1):
    b = a ** 3
    print(f"  a = {a}: Q = ({b}, {a}), f′(a) = {3 * a * a}, g′ i Q = {1 / (3 * a * a):.4f}")
print("Oppgave 4: 2x + 1 og (x − 1)/2")
for a in (-1, 0, 2):
    print(f"  a = {a}: P = ({a}, {2 * a + 1}), Q = ({2 * a + 1}, {a}), stigningstall 2 og 0,5")
print("  g(f(x)) = ((2x + 1) − 1)/2 = x")
