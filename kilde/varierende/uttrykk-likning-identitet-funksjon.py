"""Kortsett K6: sorter i fire bokser: uttrykk, identitet, likning og funksjon.
Noen kort kan forsvares i flere bokser. Da står alle lovlige bokser i «riktig», og kommentaren forklarer."""
from kortsett import kort

KODE = "K6"
TYPE = "sorter"
OPPGAVE = "Sorter kortene i fire bokser: uttrykk, identitet, likning og funksjon. Begrunn valget for hvert kort."

KATEGORIER = [
    ("uttrykk", "Uttrykk"),
    ("identitet", "Identitet"),
    ("likning", "Likning"),
    ("funksjon", "Funksjon"),
]

U, I, L, FN = ["uttrykk"], ["identitet"], ["likning"], ["funksjon"]

KORT = [
    kort("$2x + 3$", riktig=U),
    kort("$x^2 - 4x$", riktig=U),
    kort("$\\dfrac{a + b}{2}$", riktig=U),
    kort("$3(x - 1)$", riktig=U),
    kort("$(a + b)^2 = a^2 + 2ab + b^2$", riktig=I),
    kort("$2(x + 3) = 2x + 6$", riktig=I),
    kort("$x \\cdot x = x^2$", riktig=I),
    kort("$\\dfrac{x}{2} + \\dfrac{x}{2} = x$", riktig=I),
    kort("$2x + 3 = 11$", riktig=L),
    kort("$x^2 = 9$", riktig=L),
    kort("$3(x - 1) = x + 5$", riktig=L),
    kort("$x^2 - 4x = 0$", riktig=L),
    kort("$x + 1 = x + 2$", riktig=L,
         kommentar="En likning uten løsning: Ingen x gjør sidene like. Den er ikke en identitet."),
    kort("$f(x) = 2x + 3$", riktig=FN),
    kort("$g(t) = 3t - 1$", riktig=FN),
    kort("$y = x^2 - 4x$", riktig=FN,
         kommentar="Skrevet med y er dette en funksjon av x. Det kan også leses som en likning med to ukjente."),
    kort("$y = 3$", riktig=FN + L,
         kommentar="Både og: en konstant funksjon (vannrett linje), eller en likning som sier at y er 3."),
    kort("$2x = x + x$", riktig=I,
         kommentar="Sann for alle x. Derfor er den en identitet, selv om den ser ut som en likning."),
]

FASITNOTAT = ("Kompetansemålet i 1T sier at elevene skal kunne forklare forskjellen mellom en identitet, en likning, "
              "et algebraisk uttrykk og en funksjon. Kortene x + 1 = x + 2, 2x = x + x, y = 3 og y = x² − 4x "
              "er grensetilfeller og gir god samtale. Spør: Hva er forskjellen på x² − 4x og x² − 4x = 0? "
              "Hvordan kan du avgjøre om noe er en identitet eller en likning?")
