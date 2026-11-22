"""Utregning av polynomdivisjonene i oppgavene og løsningsforslagene.
Polynomer som lister i stigende rekkefølge: [c0, c1, c2, …].  Kjør: python3 verktoy/fasit/polynomdivisjon.py"""
from fractions import Fraction as F


def tekst(p):
    deler = []
    for i in range(len(p) - 1, -1, -1):
        if p[i]:
            c = p[i]
            deler.append(f"{'+' if c > 0 else '-'} {abs(c) if abs(c) != 1 or i == 0 else ''}{'x^' + str(i) if i > 1 else 'x' if i == 1 else ''}")
    s = " ".join(deler) or "0"
    return s[2:] if s.startswith("+ ") else s


def del_(teller, nevner):
    rest = [F(c) for c in teller]
    n = len(nevner) - 1
    kv = [F(0)] * max(1, len(rest) - n)
    steg = []
    while len(rest) - 1 >= n and any(rest):
        g = len(rest) - 1 - n
        k = rest[-1] / nevner[-1]
        kv[g] = k
        trekk = [F(0)] * g + [k * c for c in nevner]
        rest = [a - b for a, b in zip(rest, trekk)][:-1]
        while len(rest) > 1 and rest[-1] == 0:
            rest.pop()
        steg.append((k, g, tekst(trekk), tekst(rest)))
        if g == 0:
            break
    return kv, rest, steg


def verdi(p, x):
    return sum(c * F(x) ** i for i, c in enumerate(p))


def vis(navn, P, r):
    kv, rest, steg = del_(P, [-r, 1])
    print(f"{navn}: ({tekst(P)}) : (x - {r})")
    for k, g, t, rr in steg:
        print(f"    ledd {k}x^{g}: trekk fra {t}, igjen {rr}")
    print(f"    = {tekst(kv)}  rest {tekst(rest)}   P({r}) = {verdi(P, r)}")
    return kv


vis("Oppgave 1", [6, -5, -2, 1], 1)
print("    x^2 - x - 6 = (x - 3)(x + 2)")
vis("Oppgave 2", [5, 3, 1], 2)
P = [6, -7, 0, 1]
print("Oppgave 3: P(x) = x^3 - 7x + 6, prøver divisorene i 6:", {x: verdi(P, x) for x in (1, -1, 2, -2, 3, -3, 6, -6)})
vis("Oppgave 3", P, 1)
print("    x^2 + x - 6 = (x + 3)(x - 2)")
vis("Oppgave 4", [-1, 1, 1], 1)
print("    f(x) = x + 2 + 1/(x - 1). f(11) =", float(verdi([-1, 1, 1], 11) / 10), " 11 + 2 =", 13)
P = [6, -5, -2, 1]
print("Oppgave 5: fortegn av (x + 2)(x - 1)(x - 3) i testpunkter:", {x: verdi(P, x) for x in (-3, 0, 2, 4)})
vis("Standard", [6, -5, -2, 1], 1)
