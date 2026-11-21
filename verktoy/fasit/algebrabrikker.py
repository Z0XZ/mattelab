"""Utregning av alle tall i oppgaver og løsningsforslag på siden Algebrabrikker.
Kjør: python3 verktoy/fasit/algebrabrikker.py"""

def gang(a, b, c, d):
    # x-kolonner ganger enerrader (a · |d|) og enerkolonner ganger x-rader (|b| · c)
    xpos = (a * d if d > 0 else 0) + (b * c if b > 0 else 0)
    xneg = (a * -d if d < 0 else 0) + (-b * c if b < 0 else 0)
    assert xpos - xneg == a * d + b * c
    return {"x²": a * c, "x": a * d + b * c, "1": b * d, "x+": xpos, "x−": xneg, "nullpar": min(xpos, xneg)}

for nr, (a, b, c, d) in enumerate([(1, 0, 1, 3), (1, 2, 1, 3), (1, 3, 1, 3), (1, 3, 1, -3), (2, -1, 1, 4)], 1):
    print(f"Oppgave {nr}: ({a}x + {b})({c}x + {d}) ->", gang(a, b, c, d))
print("Oppgave 3: x² + 9 med x = 1:", 1 + 9, " (1 + 3)² =", 16, " forskjell 6x")
print("Oppgave 5: sjekk med x = 1: (2 − 1)(1 + 4) =", (2 - 1) * (1 + 4), " 2 + 7 − 4 =", 2 + 7 - 4)
print("Standard: (x + 2)(x + 3)")
