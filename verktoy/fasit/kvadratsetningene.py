"""Utregning av alle tall i oppgaver og løsningsforslag på siden om kvadratsetningene.
Kjør: python3 verktoy/fasit/kvadratsetningene.py"""

def sum_(a, b): return (a + b) ** 2, a * a, 2 * a * b, b * b
def diff(a, b): return (a - b) ** 2, a * a, 2 * a * b, b * b
def konj(a, b): return (a + b) * (a - b), a * a, b * b

print("Oppgave 1: (3 + 2)² =", sum_(3, 2), " 3² + 2² =", 3**2 + 2**2)
print("Oppgave 2: 51² = (50 + 1)²:", sum_(50, 1), " sjekk", 51**2)
print("           49² = (50 − 1)²:", diff(50, 1), " sjekk", 49**2)
print("           49·51 = (50 + 1)(50 − 1):", konj(50, 1), " sjekk", 49*51)
print("Oppgave 3: (5 − 2)²:", diff(5, 2), " a² − 2ab + b² =", 25 - 20 + 4)
print("           (2 − 5)²:", diff(2, 5))
print("Oppgave 4: (5 + 3)(5 − 3):", konj(5, 3), " = 8·2 =", 8 * 2)
print("           (3 + 5)(3 − 5):", konj(3, 5))
print("Oppgave 5: x² + 6x + 9 med x = 4:", 16 + 24 + 9, " (4 + 3)² =", 49)
print("           x² + 10x + 25 = (x + 5)², 2·5 =", 10, " 5² =", 25)
print("Standard: a = 3, b = 2 (sum)")
