"""Regresjon for datasettene i utforskeren «Modellering og regresjon», og tallene i oppgavene.
Samme metode som statisk/js/utforskere/regresjon.js:
  - lineær og andregrad: minste kvadraters metode
  - eksponentiell a·bˣ: lineær regresjon av ln y mot x
  - potens a·xᵇ: lineær regresjon av ln y mot ln x
R² regnes alltid ut fra de opprinnelige y-verdiene: R² = 1 − SSres/SStot.
Dataene er tenkte (laget for å øve), ikke målinger.
Kjør: python3 verktoy/fasit/regresjon.py"""
import math

DATA = {
    "taxi": ([2, 5, 8, 12, 15, 20], [138, 189, 252, 325, 386, 476]),
    "kast": ([0, 0.5, 1, 1.5, 2, 2.5, 3], [1.6, 8.6, 13.7, 15.9, 16.1, 13.2, 8.4]),
    "bakterier": ([0, 1, 2, 3, 4, 5, 6], [120, 170, 270, 400, 630, 890, 1380]),
    "bil": ([0, 1, 2, 3, 4, 5, 6, 7, 8], [407, 331, 292, 243, 214, 175, 152, 126, 111]),
    "pendel": ([0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0], [0.90, 1.26, 1.56, 1.79, 2.02, 2.44, 2.84]),
}


def lin(xs, ys):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return a, my - a * mx


def los3(A, v):
    """Gauss-eliminasjon for 3 × 3."""
    M = [row[:] + [vv] for row, vv in zip(A, v)]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(M[r][i])); M[i], M[p] = M[p], M[i]
        for r in range(3):
            if r != i:
                f = M[r][i] / M[i][i]
                M[r] = [a - f * b for a, b in zip(M[r], M[i])]
    return [M[i][3] / M[i][i] for i in range(3)]


def modell(navn, xs, ys):
    if navn == "lineaer":
        a, b = lin(xs, ys); return (a, b), lambda x: a * x + b
    if navn == "andregrad":
        S = lambda k: sum(x ** k for x in xs)
        T = lambda k: sum(y * x ** k for x, y in zip(xs, ys))
        a, b, c = los3([[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), len(xs)]], [T(2), T(1), T(0)])
        return (a, b, c), lambda x: a * x * x + b * x + c
    if navn == "eksponentiell":
        k, m = lin(xs, [math.log(y) for y in ys]); a, b = math.exp(m), math.exp(k)
        return (a, b), lambda x: a * b ** x
    if navn == "potens":
        k, m = lin([math.log(x) for x in xs], [math.log(y) for y in ys]); a = math.exp(m)
        return (a, k), lambda x: a * x ** k


def r2(xs, ys, f):
    my = sum(ys) / len(ys)
    return 1 - sum((y - f(x)) ** 2 for x, y in zip(xs, ys)) / sum((y - my) ** 2 for y in ys)


for sett, (xs, ys) in DATA.items():
    print(sett)
    for m in ("lineaer", "andregrad", "eksponentiell", "potens"):
        if m == "potens" and min(xs) <= 0:
            continue
        k, f = modell(m, xs, ys)
        print(f"   {m:13s}", " ".join(f"{v:.6f}" for v in k), f"  R² = {r2(xs, ys, f):.6f}")

print("\nOppgave 1: taxi lineær")
(a, b), f = modell("lineaer", *DATA["taxi"])
print(f"   a = {a:.4f}, b = {b:.4f}, f(30) = {f(30):.2f}")
print("Oppgave 2: bakterier")
(a, b), f = modell("eksponentiell", *DATA["bakterier"])
print(f"   a = {a:.4f}, b = {b:.4f} ({(b - 1) * 100:.2f} % per time), f(8) = {f(8):.1f}, f(24) = {f(24):.4g}")
_, g = modell("lineaer", *DATA["bakterier"])
print(f"   lineær f(8) = {g(8):.1f}")
print("Oppgave 3: bilens verdi")
(a, b), f = modell("eksponentiell", *DATA["bil"])
t = math.log(100 / a) / math.log(b)
print(f"   a = {a:.4f}, b = {b:.4f} ({(1 - b) * 100:.2f} % nedgang per år), f(t) = 100 gir t = {t:.3f}")
print("Oppgave 4: kast andregrad")
(a, b, c), f = modell("andregrad", *DATA["kast"])
ts = -b / (2 * a); D = b * b - 4 * a * c
land = (-b - math.sqrt(D)) / (2 * a)
print(f"   a = {a:.4f}, b = {b:.4f}, c = {c:.4f}, topp ({ts:.3f}, {f(ts):.3f}), lander t = {land:.3f}, f(5) = {f(5):.2f}")
print("Oppgave 5: pendel potens")
(a, k), f = modell("potens", *DATA["pendel"])
print(f"   a = {a:.4f}, b = {k:.4f}, f(4) = {f(4):.3f}, f(0,05) = {f(0.05):.3f}")

print("Kontroll av andregradsmodellene utenfor dataene")
(a, b, c), f = modell("andregrad", *DATA["bil"])
print(f"   bil: bunnpunkt x = {-b / (2 * a):.3f}, f(15) = {f(15):.3f}")
(a, b, c), f = modell("andregrad", *DATA["pendel"])
print(f"   pendel: toppunkt x = {-b / (2 * a):.3f}, f(4) = {f(4):.3f}")
