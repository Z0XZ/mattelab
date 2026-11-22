"""Kortsett K11: grafen til f, grafen til f′ og en beskrivelse med ord. Tre og tre kort hører sammen.
Fellene: to og to funksjoner har den deriverte null i de samme x-verdiene, men med motsatt fortegn.
Beskrivelsene blir kontrollert mot fortegnet til f′ nedenfor, så de alltid stemmer med funksjonene."""
from fractions import Fraction as F

from kortfigurer import Graf
from kortsett import Kortfeil, kort

KODE = "K11"
TYPE = "grupper"
STORRELSE = 3
OPPGAVE = ("Finn tre og tre kort som hører sammen: grafen til en funksjon f, grafen til den deriverte $f'$ "
           "og en beskrivelse av f med ord. Forklar hvordan du ser på grafen til $f'$ hvor f vokser og avtar.")


def polynom(k):
    """Polynomet med koeffisientene k = [k0, k1, k2, …] som funksjon (eksakt med Fraction)."""
    return lambda x: sum(F(c) * F(x) ** i for i, c in enumerate(k))


def derivert(k):
    return [i * c for i, c in enumerate(k)][1:] or [0]


def fortegn(k, x):
    v = polynom(k)(x)
    return (v > 0) - (v < 0)


def kontroller(k, vekst):
    """vekst: liste med (x, forventet fortegn til f′). Stopper byggingen hvis beskrivelsen er feil."""
    d = derivert(k)
    for x, s in vekst:
        if fortegn(d, F(x)) != s:
            raise Kortfeil(f"K11: f′({x}) har feil fortegn for f med koeffisienter {k}")


STANDARD = dict(xmin=-3, xmax=3, ymin=-4, ymax=4, sy=0.6, tekst=0.7, steg=2)


def gruppe(k, ord_, besk_f, besk_d, vekst, punkter_f=(), punkter_d=()):
    kontroller(k, vekst)
    f, d = polynom(k), polynom(derivert(k))
    return [
        kort(figur=Graf(lambda x: float(f(x)), besk_f, verdi=f, navn="f", punkter=punkter_f, **STANDARD)),
        # Gruppen kjennes igjen på f, så kortet med f′ og teksten får verdien f
        kort(figur=Graf(lambda x: float(d(x)), besk_d, verdi=d, navn="f′", punkter=punkter_d, **STANDARD), verdi=f),
        kort(ord_, verdi=f),
    ]


GRUPPER = [
    # f = x² − 2x, f′ = 2x − 2
    gruppe([0, -2, 1], "f avtar fram til x = 1 og vokser etterpå. Bunnpunkt i x = 1.",
           "Parabel med bunnpunkt i (1, −1). Den skjærer x-aksen i 0 og 2.",
           "Rett linje som stiger. Den skjærer x-aksen i 1.",
           [(0, -1), (1, 0), (2, 1)], punkter_d=[(1, 0)]),
    # f = −x² + 2x + 1, f′ = −2x + 2
    gruppe([1, 2, -1], "f vokser fram til x = 1 og avtar etterpå. Toppunkt i x = 1.",
           "Parabel med toppunkt i (1, 2). Den skjærer y-aksen i 1.",
           "Rett linje som synker. Den skjærer x-aksen i 1.",
           [(0, 1), (1, 0), (2, -1)], punkter_d=[(1, 0)]),
    # f = x³ − 3x, f′ = 3x² − 3
    gruppe([0, -3, 0, 1], "f har toppunkt i x = −1 og bunnpunkt i x = 1.",
           "Tredjegradsgraf som kommer nedenfra, har toppunkt i (−1, 2) og bunnpunkt i (1, −2), og går opp igjen.",
           "Parabel som åpner seg oppover, med bunnpunkt i (0, −3). Den skjærer x-aksen i −1 og 1.",
           [(-2, 1), (-1, 0), (0, -1), (1, 0), (2, 1)], punkter_d=[(-1, 0), (1, 0)]),
    # f = −x³ + 3x, f′ = −3x² + 3
    gruppe([0, 3, 0, -1], "f har bunnpunkt i x = −1 og toppunkt i x = 1.",
           "Tredjegradsgraf som kommer ovenfra, har bunnpunkt i (−1, −2) og toppunkt i (1, 2), og går ned igjen.",
           "Parabel som åpner seg nedover, med toppunkt i (0, 3). Den skjærer x-aksen i −1 og 1.",
           [(-2, -1), (-1, 0), (0, 1), (1, 0), (2, -1)], punkter_d=[(-1, 0), (1, 0)]),
    # f = ⅓x³, f′ = x²
    gruppe([0, 0, 0, F(1, 3)], "f vokser overalt, men har vannrett tangent i x = 0.",
           "Tredjegradsgraf som vokser hele tiden og flater ut i origo.",
           "Parabel med bunnpunkt i origo. Den rører x-aksen i 0, men går ikke under.",
           [(-1, 1), (0, 0), (1, 1)], punkter_d=[(0, 0)]),
    # f = ½x − 1, f′ = ½
    gruppe([-1, F(1, 2)], "f vokser like raskt overalt.",
           "Rett linje som stiger. Den skjærer y-aksen i −1 og x-aksen i 2.",
           "Vannrett linje i høyden ½, over x-aksen.",
           [(-2, 1), (0, 1), (2, 1)]),
]

FASITNOTAT = ("Gruppene med x² − 2x og −x² + 2x + 1 har begge $f'(1) = 0$, men den ene har bunnpunkt og den andre toppunkt. "
              "Det samme gjelder x³ − 3x og −x³ + 3x i x = −1 og x = 1. Elevene må se på fortegnet til $f'$, ikke bare nullpunktene. "
              "Spør: Hvordan ser du på grafen til $f'$ at f har et toppunkt og ikke et bunnpunkt? "
              "Hva betyr det at grafen til $f'$ rører x-aksen uten å krysse den?")

# Kontroll av punktene som står i beskrivelsene av grafene
for k, x, y in [([0, -2, 1], 1, -1), ([0, -2, 1], 2, 0), ([1, 2, -1], 1, 2), ([0, -3, 0, 1], -1, 2), ([0, -3, 0, 1], 1, -2),
                ([0, 3, 0, -1], -1, -2), ([0, 3, 0, -1], 1, 2), ([-1, F(1, 2)], 2, 0)]:
    if polynom(k)(x) != y:
        raise Kortfeil(f"K11: f({x}) ≠ {y} for {k}")
for k, x, y in [([0, -3, 0, 1], 0, -3), ([0, 3, 0, -1], 0, 3), ([0, -2, 1], 1, 0), ([1, 2, -1], 1, 0)]:
    if polynom(derivert(k))(x) != y:
        raise Kortfeil(f"K11: f′({x}) ≠ {y} for {k}")
