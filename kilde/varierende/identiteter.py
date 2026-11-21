"""Kortsett K5: uttrykk som er identiske. To og to kort er like for alle verdier av variablene.
Likheten sjekkes eksakt i tilfeldige brøkpunkter når nettstedet bygges."""
from fractions import Fraction as F

from kortsett import kort

KODE = "K5"
TYPE = "grupper"
STORRELSE = 2
OPPGAVE = "Finn to og to uttrykk som er like for alle verdier av variablene. Det er de samme kvadratsetningene, men ikke alltid med samme bokstaver."

h = F(1, 2)

GRUPPER = [
    [kort("$(a + b)^2$", verdi=lambda a, b: (a + b) ** 2), kort("$a^2 + 2ab + b^2$", verdi=lambda a, b: a * a + 2 * a * b + b * b)],
    [kort("$(a - b)^2$", verdi=lambda a, b: (a - b) ** 2), kort("$a^2 - 2ab + b^2$", verdi=lambda a, b: a * a - 2 * a * b + b * b)],
    [kort("$(a + b)(a - b)$", verdi=lambda a, b: (a + b) * (a - b)), kort("$a^2 - b^2$", verdi=lambda a, b: a * a - b * b)],
    [kort("$(x + 3)^2$", verdi=lambda x: (x + 3) ** 2), kort("$x^2 + 6x + 9$", verdi=lambda x: x * x + 6 * x + 9)],
    [kort("$(x - 3)^2$", verdi=lambda x: (x - 3) ** 2), kort("$x^2 - 6x + 9$", verdi=lambda x: x * x - 6 * x + 9)],
    [kort("$(x + 3)(x - 3)$", verdi=lambda x: (x + 3) * (x - 3)), kort("$x^2 - 9$", verdi=lambda x: x * x - 9)],
    [kort("$(2x + 1)^2$", verdi=lambda x: (2 * x + 1) ** 2), kort("$4x^2 + 4x + 1$", verdi=lambda x: 4 * x * x + 4 * x + 1)],
    [kort("$(2x - 1)(2x + 1)$", verdi=lambda x: (2 * x - 1) * (2 * x + 1)), kort("$4x^2 - 1$", verdi=lambda x: 4 * x * x - 1)],
    [kort("$x^2 + 2x + 1$", verdi=lambda x: x * x + 2 * x + 1), kort("$(x + 1)^2$", verdi=lambda x: (x + 1) ** 2)],
    [kort("$25 - x^2$", verdi=lambda x: 25 - x * x), kort("$(5 - x)(5 + x)$", verdi=lambda x: (5 - x) * (5 + x))],
    [kort("$(x + 5)^2$", verdi=lambda x: (x + 5) ** 2), kort("$x^2 + 10x + 25$", verdi=lambda x: x * x + 10 * x + 25)],
    [kort("$\\left(x - \\frac{1}{2}\\right)^2$", verdi=lambda x: (x - h) ** 2), kort("$x^2 - x + \\frac{1}{4}$", verdi=lambda x: x * x - x + h * h)],
]

FASITNOTAT = ("Vanlige feil er å koble (x − 3)² med x² − 9 og (2x + 1)² med 4x² + 1. "
              "Be elevene sette inn et tall, for eksempel x = 1, for å avsløre feil kobling. "
              "Utfordring: Lag et eget par der det ene uttrykket er (3 − x)². Hvilket kort i settet er det likt?")
