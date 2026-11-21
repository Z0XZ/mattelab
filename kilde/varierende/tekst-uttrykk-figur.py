"""Kortsett K2: tekst, algebraisk uttrykk og figur med algebrabrikker. Tre og tre kort hører sammen.
Verdien til figuren regnes ut fra brikkene, så bygget stopper hvis en figur ikke passer med uttrykket."""
from kortfigurer import Brikker
from kortsett import kort

KODE = "K2"
TYPE = "grupper"
STORRELSE = 3
OPPGAVE = ("Finn tre og tre kort som hører sammen: en tekst, et uttrykk og en figur med algebrabrikker. "
           "Den lange brikken har lengde $x$, og den lille ruta har sider $1$.")


def g(tekst, uttrykk, f, figur):
    return [kort(tekst, verdi=f), kort(uttrykk, verdi=f), kort(figur=figur)]


GRUPPER = [
    g("Tre mer enn det dobbelte av et tall", "$2x + 3$", lambda x: 2 * x + 3,
      Brikker(["x", "x", "1", "1", "1"])),
    g("Det dobbelte av summen av et tall og tre", "$2(x + 3)$", lambda x: 2 * (x + 3),
      Brikker(["x", "1", "1", "1"], ["x", "1", "1", "1"])),
    g("To mer enn tre ganger et tall", "$3x + 2$", lambda x: 3 * x + 2,
      Brikker(["x", "x", "x", "1", "1"])),
    g("Tre ganger summen av et tall og to", "$3(x + 2)$", lambda x: 3 * (x + 2),
      Brikker(["x", "1", "1"], ["x", "1", "1"], ["x", "1", "1"])),
    g("Kvadratet av et tall pluss det dobbelte av tallet", "$x^2 + 2x$", lambda x: x * x + 2 * x,
      Brikker(["x2", "xs", "xs"])),
    g("Et tall pluss kvadratet av tallet", "$x + x^2$", lambda x: x + x * x,
      Brikker(["xs", "x2"])),
    g("Det dobbelte av kvadratet av et tall", "$2x^2$", lambda x: 2 * x * x,
      Brikker(["x2", "x2"])),
    g("Kvadratet av det dobbelte av et tall", "$(2x)^2$", lambda x: (2 * x) ** 2,
      Brikker(["x2", "x2"], ["x2", "x2"])),
]

FASITNOTAT = ("Parene 2x + 3 og 2(x + 3), 3x + 2 og 3(x + 2) og 2x² og (2x)² er laget for å bli forvekslet. "
              "La elevene forklare forskjellen med figuren: Hvor mange enerbrikker er det, og hvor mange rader? "
              "Figuren til (2x)² er et kvadrat med side 2x, altså 4x².")
