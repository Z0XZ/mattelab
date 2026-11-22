"""Kortsett K14: sorter funksjoner etter hvilken derivasjonsregel du trenger. Noen funksjoner kan deriveres
på to måter, for eksempel 5/x² (potensregel eller brøkregel). Da står begge i «riktig», og kommentaren forklarer.
Den deriverte i kommentarene blir kontrollert mot en numerisk derivert nedenfor."""
import math

from kortsett import Kortfeil, kort

KODE = "K14"
TYPE = "sorter"
OPPGAVE = ("Sorter funksjonene etter hvilken regel du trenger for å derivere dem. Noen kort passer i to bokser. "
           "Deriver gjerne funksjonene etterpå.")

KATEGORIER = [
    ("grunn", "Bare grunnreglene: potens, sum, eksponential og ln x"),
    ("kjerne", "Kjerneregelen"),
    ("produkt", "Produktregelen"),
    ("brok", "Brøkregelen"),
]

GR, KJ, PR, BR = ["grunn"], ["kjerne"], ["produkt"], ["brok"]

# (funksjon, derivert) til kontroll av det som står i kommentarene
KONTROLL = {
    "5/x²": (lambda x: 5 / x ** 2, lambda x: -10 / x ** 3),
    "x(x²+1)³": (lambda x: x * (x * x + 1) ** 3, lambda x: (x * x + 1) ** 3 + 6 * x * x * (x * x + 1) ** 2),
    "eˣ/x": (lambda x: math.exp(x) / x, lambda x: (x - 1) * math.exp(x) / x ** 2),
    "(x²+3x)(2x−1)": (lambda x: (x * x + 3 * x) * (2 * x - 1), lambda x: 6 * x * x + 10 * x - 3),
    "2ˣ": (lambda x: 2 ** x, lambda x: 2 ** x * math.log(2)),
    "e²ˣ": (lambda x: math.exp(2 * x), lambda x: 2 * math.exp(2 * x)),
}
for navn, (f, d) in KONTROLL.items():
    for x in (0.7, 1.9):
        num = (f(x + 1e-6) - f(x - 1e-6)) / 2e-6
        if abs(num - d(x)) > 1e-4 * (1 + abs(num)):
            raise Kortfeil(f"K14: feil derivert i kommentaren til {navn}")

KORT = [
    kort("$f(x) = 3x^4 - 2x + 7$", riktig=GR),
    kort("$f(x) = (3x - 1)^5$", riktig=KJ),
    kort("$f(x) = x^2 e^x$", riktig=PR),
    kort("$f(x) = \\dfrac{x + 1}{x - 2}$", riktig=BR),
    kort("$f(x) = e^{2x}$", riktig=KJ,
         kommentar="Eksponenten $2x$ er en kjerne. $f'(x) = 2e^{2x}$, ikke $e^{2x}$."),
    kort("$f(x) = \\ln(x^2 + 1)$", riktig=KJ),
    kort("$f(x) = \\sqrt{x}$", riktig=GR,
         kommentar="$\\sqrt{x} = x^{\\frac{1}{2}}$, så potensregelen holder."),
    kort("$f(x) = \\dfrac{5}{x^2}$", riktig=GR + BR,
         kommentar="Begge går: $5x^{-2}$ med potensregelen, eller brøkregelen. Potensregelen er raskest: $f'(x) = -\\frac{10}{x^3}$."),
    kort("$f(x) = x \\ln x$", riktig=PR),
    kort("$f(x) = \\sqrt{4x + 1}$", riktig=KJ),
    kort("$f(x) = \\dfrac{e^x}{x}$", riktig=BR + PR,
         kommentar="Brøkregelen, eller produktregelen med $e^x \\cdot x^{-1}$. Svaret er $\\frac{(x - 1)e^x}{x^2}$ uansett."),
    kort("$f(x) = x^3 - 4e^x + 2\\ln x$", riktig=GR,
         kommentar="Mange regler i samme uttrykk, men bare grunnregler og sumregelen. Ingen kjerne, produkt eller brøk."),
    kort("$f(x) = x(x^2 + 1)^3$", riktig=PR + KJ,
         kommentar="Både og: produktregelen, og kjerneregelen for $(x^2 + 1)^3$."),
    kort("$f(x) = 2^x$", riktig=GR,
         kommentar="$(a^x)' = a^x \\ln a$, så $f'(x) = 2^x \\ln 2$. Ikke $x \\cdot 2^{x-1}$: x står i eksponenten."),
    kort("$f(x) = (x^2 + 3x)(2x - 1)$", riktig=PR + GR,
         kommentar="Produktregelen, eller gang ut først og bruk grunnreglene. Begge gir $6x^2 + 10x - 3$."),
]
