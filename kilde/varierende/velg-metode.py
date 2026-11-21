"""Kortsett K7: velg løsningsmetode for andregradslikninger.
Løsningene i kommentarene regnes ut her. For hver likning står venstre side minus høyre side
som funksjon, og den sjekkes mot koeffisientene a, b og c før løsningen regnes ut."""
import math
from fractions import Fraction as F

from kortsett import kort

KODE = "K7"
TYPE = "sorter"
OPPGAVE = ("Sorter likningene etter hvilken metode du ville brukt for å løse dem raskest. "
           "Ofte finnes det flere gode svar. Begrunn valget, og løs gjerne likningen etterpå.")

KATEGORIER = [
    ("ut", "Sett x utenfor parentes"),
    ("rot", "Ta kvadratroten"),
    ("kvadrat", "Bruk kvadratsetningene"),
    ("fullfor", "Fullfør kvadratet"),
    ("abc", "Bruk abc-formelen"),
]


def tex_tall(x: F) -> str:
    if x.denominator == 1:
        return str(x.numerator)
    return ("-" if x < 0 else "") + rf"\frac{{{abs(x.numerator)}}}{{{x.denominator}}}"


def losning(a, b, c) -> str:
    """Løsningen av ax² + bx + c = 0 i TeX, eksakt."""
    a, b, c = F(a), F(b), F(c)
    D = b * b - 4 * a * c
    if D < 0:
        return f"Ingen løsning, fordi $b^2 - 4ac = {tex_tall(D)} < 0$."
    if D == 0:
        return f"Én løsning: $x = {tex_tall(-b / (2 * a))}$."
    r = math.isqrt(D.numerator * D.denominator)
    if r * r == D.numerator * D.denominator:  # D er et kvadrattall (for heltallige a, b, c)
        rot = F(r, D.denominator)
        x1, x2 = sorted([(-b - rot) / (2 * a), (-b + rot) / (2 * a)])
        return f"$x = {tex_tall(x1)}$ eller $x = {tex_tall(x2)}$."
    return rf"$x = \dfrac{{{tex_tall(-b)} \pm \sqrt{{{tex_tall(D)}}}}}{{{tex_tall(2 * a)}}}$."


def likning(tekst, f, abc, riktig, hvorfor):
    """f(x) = venstre side minus høyre side. abc: koeffisientene når alt er flyttet til venstre."""
    a, b, c = abc
    for x in (F(3, 7), F(-5, 2), F(11, 3)):
        assert f(x) == a * x * x + b * x + c, f"{tekst}: koeffisientene stemmer ikke"
    return kort(tekst, riktig=riktig, kommentar=f"{hvorfor} {losning(a, b, c)}")


KORT = [
    likning("$x^2 - 5x = 0$", lambda x: x * x - 5 * x, (1, -5, 0), ["ut"],
            "Ingen konstant, så $x(x - 5) = 0$."),
    likning("$3x^2 = 12x$", lambda x: 3 * x * x - 12 * x, (3, -12, 0), ["ut"],
            "Flytt over og sett $3x$ utenfor: $3x(x - 4) = 0$. Ikke del på $x$, da mister du $x = 0$."),
    likning("$x^2 = 49$", lambda x: x * x - 49, (1, 0, -49), ["rot"],
            "Ta roten på begge sider, og husk begge fortegnene."),
    likning("$(x - 2)^2 = 9$", lambda x: (x - 2) ** 2 - 9, (1, -4, -5), ["rot"],
            "Allerede et kvadrat: $x - 2 = \\pm 3$."),
    likning("$2x^2 - 18 = 0$", lambda x: 2 * x * x - 18, (2, 0, -18), ["rot", "kvadrat"],
            "$x^2 = 9$, eller konjugatsetningen: $2(x + 3)(x - 3) = 0$."),
    likning("$x^2 - 16 = 0$", lambda x: x * x - 16, (1, 0, -16), ["kvadrat", "rot"],
            "Konjugatsetningen: $(x + 4)(x - 4) = 0$. Eller $x^2 = 16$."),
    likning("$x^2 + 6x + 9 = 0$", lambda x: x * x + 6 * x + 9, (1, 6, 9), ["kvadrat"],
            "Første kvadratsetning: $(x + 3)^2 = 0$."),
    likning("$x^2 - 10x + 25 = 0$", lambda x: x * x - 10 * x + 25, (1, -10, 25), ["kvadrat"],
            "Andre kvadratsetning: $(x - 5)^2 = 0$."),
    likning("$x^2 + 4x - 5 = 0$", lambda x: x * x + 4 * x - 5, (1, 4, -5), ["fullfor", "abc"],
            "$(x + 2)^2 - 4 - 5 = 0$ gir $(x + 2)^2 = 9$."),
    likning("$x^2 - 8x + 12 = 0$", lambda x: x * x - 8 * x + 12, (1, -8, 12), ["fullfor", "abc"],
            "$(x - 4)^2 - 16 + 12 = 0$ gir $(x - 4)^2 = 4$."),
    likning("$x^2 + 2x = 8$", lambda x: x * x + 2 * x - 8, (1, 2, -8), ["fullfor", "abc"],
            "Legg til $1$ på begge sider: $(x + 1)^2 = 9$."),
    likning("$3x^2 + 5x - 2 = 0$", lambda x: 3 * x * x + 5 * x - 2, (3, 5, -2), ["abc"],
            "$a = 3$ gjør det tungvint å fullføre kvadratet. $b^2 - 4ac = 49$."),
    likning("$2x^2 - 3x - 4 = 0$", lambda x: 2 * x * x - 3 * x - 4, (2, -3, -4), ["abc"],
            "Løsningene er ikke pene tall, så abc-formelen er tryggest."),
    likning("$x^2 + x + 1 = 0$", lambda x: x * x + x + 1, (1, 1, 1), ["abc", "fullfor"],
            "Regn ut $b^2 - 4ac$ først."),
]

FASITNOTAT = ("Det finnes ikke én riktig sortering. Skjermversjonen godtar alle boksene som står i fasiten. "
              "La gruppene sammenligne og argumentere: Hvorfor er abc-formelen ikke alltid raskest? "
              "Når lønner det seg å fullføre kvadratet? Avslutt gjerne med at elevene løser to av likningene med to ulike metoder.")
