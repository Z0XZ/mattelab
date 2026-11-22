"""Utregning og kontroll av tallene i tavleoppgavene.
Kjør: python3 verktoy/fasit/tavle.py"""
from fractions import Fraction as F
import math

print("== Hvilken passer ikke inn? (verdiene)")
sett = {
    1: [F(2, 4), F(3, 5), F(6, 10), F(6, 10)],
    2: [F(1, 3), F(1, 4), F(2, 5), F(1, 8)],
    3: [F(3, 4) + F(1, 4), F(1, 2) * 2, F(5, 4) - F(1, 4), F(1, 2) / F(1, 4)],
    4: [F(2, 3) * F(3, 4), F(1, 2), F(3, 4) - F(1, 4), F(2, 3) / F(4, 3)],
    5: [F(7, 4), 1 + F(3, 4), F(175, 100), F(14, 6)],
    6: [F(25, 100), F(1, 4), F(4, 10), F(2, 8)],
}
for k, v in sett.items():
    print(k, [str(x) for x in v], [round(float(x), 4) for x in v])

print("\n== Alltid, noen ganger eller aldri? (prøver mange verdier)")
xs = [F(n, 4) for n in range(-40, 41)]
def klasse(pred, verdier):
    r = [pred(*v) for v in verdier]
    return "alltid" if all(r) else "aldri" if not any(r) else "noen ganger"
par = [(a, b) for a in xs[::4] for b in xs[::4]]
print("2x > x:", klasse(lambda x: 2 * x > x, [(x,) for x in xs]))
print("(a+b)^2 = a^2+b^2:", klasse(lambda a, b: (a + b) ** 2 == a * a + b * b, par))
print("(a+b)/a = b:", klasse(lambda a, b: a != 0 and (a + b) / a == b, par), " (a=2,b=2):", (2 + 2) / 2)
print("x^2 >= 0:", klasse(lambda x: x * x >= 0, [(x,) for x in xs]))
print("-x < 0:", klasse(lambda x: -x < 0, [(x,) for x in xs]))
print("1/x < x:", klasse(lambda x: x != 0 and 1 / x < x, [(x,) for x in xs]))
print("3(x+2) = 3x+2:", klasse(lambda x: 3 * (x + 2) == 3 * x + 2, [(x,) for x in xs]))
print("sqrt(x^2) = x:", klasse(lambda x: abs(x) == x, [(x,) for x in xs]))
print("a^m a^n = a^(m+n):", klasse(lambda a, m, n: a == 0 or F(a) ** m * F(a) ** n == F(a) ** (m + n), [(a, m, n) for a in range(-3, 4) for m in range(-3, 4) for n in range(-3, 4)]))
print("x/x = 1 (x != 0):", klasse(lambda x: x / x == 1, [(x,) for x in xs if x != 0]))

print("\n== Hoderegning med kvadratsetningene")
for uttr, a, b, typ in [("49·51", 50, 1, "konj"), ("99²", 100, -1, "kv"), ("101²", 100, 1, "kv"), ("32·28", 30, 2, "konj"),
                        ("45²", 40, 5, "kv"), ("19·21", 20, 1, "konj"), ("998·1002", 1000, 2, "konj"), ("7,5²", 7, F(1, 2), "kv"), ("103·97", 100, 3, "konj")]:
    if typ == "kv":
        v = a * a + 2 * a * b + b * b
        print(f"{uttr}: {a}² + 2·{a}·{b} + {b}² = {a*a} + {2*a*b} + {b*b} = {v}")
    else:
        v = a * a - b * b
        print(f"{uttr}: {a}² − {b}² = {a*a} − {b*b} = {v}")

print("\n== Én likning, tre metoder")
for a, b, c in [(1, -6, 8), (1, 4, -12), (2, -8, 0), (1, -2, -1)]:
    D = b * b - 4 * a * c
    p = F(b, 2 * a)  # a(x + p)^2 + q
    q = c - a * p * p
    print(f"{a}x² + {b}x + {c} = 0: D = {D}, sqrt(D) = {math.sqrt(D):g}, "
          f"x = {(-b - math.sqrt(D)) / (2 * a):g} og {(-b + math.sqrt(D)) / (2 * a):g}; "
          f"fullført: {a}(x + {p})² + {q}  =>  (x + {p})² = {-q / a}")


print("\nHvilken passer ikke inn? Funksjoner")
from fractions import Fraction as F
lin = {"A": (2, 3), "B": (2, -5), "C": (-2, 3), "D": (2, 0)}
print("  1 nullpunkter:", {k: str(F(-b, a)) for k, (a, b) in lin.items()})
for x in (-3, 0, 2, 3, 5):
    print(f"  2 x = {x}: x²−4 = {x*x-4}, (x−2)² = {(x-2)**2}, x²+4 = {x*x+4}, (x+2)(x−2) = {(x+2)*(x-2)}")
fs = {"A": lambda x: 100 * F(105, 100) ** x, "B": lambda x: 100 * F(95, 100) ** x, "C": lambda x: 100 * F(3, 2) ** x, "D": lambda x: 100 + 5 * x}
for k, f in fs.items():
    print(f"  3 {k}: f(0..3) =", [float(f(x)) for x in range(4)], " vekstfaktorer:", [round(float(f(x + 1) / f(x)), 4) for x in range(3)])
print("  5 asymptoter: A 1/(x−2): x = 2, y = 0;  B (x−2)/(x−2) = 1 med hull i 2;  C 2x/(x−2): x = 2, y = 2, f(0) = 0;",
      " D (x+1)/(x²+1): nevneren ≥ 1, nullpunkt −1, y = 0")
for x in (-2, -1, 0, 1, 3, 4):
    print(f"  6 x = {x}: x²−2x−3 = {x*x-2*x-3}, (x+1)(x−3) = {(x+1)*(x-3)}, x²+1 = {x*x+1}")


print("\nAlltid, noen ganger eller aldri? Derivasjon")
h = F(1, 10 ** 6)
print("  2 |x| i 0: sekant fra høyre", (abs(h) - 0) / h, " fra venstre", (abs(-h) - 0) / -h)
d = lambda x: 3 * x ** 2
print("  3 x³: f′(0) =", d(0), " f(−0,1), f(0), f(0,1) =", [float(F(x) ** 3) for x in (F(-1, 10), 0, F(1, 10))])
print("  4 −|x|: f(0) = 0 er størst, sekant fra høyre", (-abs(h)) / h, " fra venstre", (-abs(-h)) / -h)
f = lambda x: F(x) ** 3
print("  5 x³ fra 0 til 2: gjennomsnitt", (f(2) - f(0)) / 2, " f′(1) =", 3 * 1 ** 2)
q = lambda x: 3 * F(x) ** 2 - 2 * F(x) + 5
dq = lambda x: 6 * F(x) - 2
for a, b in ((0, 2), (-1, 4), (F(1, 2), 3)):
    print(f"     andregrad 3x²−2x+5 fra {a} til {b}: gjennomsnitt {(q(b) - q(a)) / (b - a)}, f′(midt) = {dq(F(a + b) / 2)}")
g = lambda x: x ** 3 - 3 * x
print("  6 x³−3x, tangent i (1, −2) er y = −2:", "f(1) =", g(1), " f(−2) =", g(-2))
print("  7 x² + 1 > 0, men f′(−1) = 2 · (−1) =", 2 * -1)


print("\nFinn feilen: derivasjon (riktige svar kontrollert numerisk)")
import math
riktige = {
    "1 (2x+1)³ → 6(2x+1)²": (lambda x: (2 * x + 1) ** 3, lambda x: 6 * (2 * x + 1) ** 2),
    "2 x²eˣ → (x² + 2x)eˣ": (lambda x: x * x * math.exp(x), lambda x: (x * x + 2 * x) * math.exp(x)),
    "3 (x+1)/(x−1) → −2/(x−1)²": (lambda x: (x + 1) / (x - 1), lambda x: -2 / (x - 1) ** 2),
    "4 ln(3x) → 1/x": (lambda x: math.log(3 * x), lambda x: 1 / x),
    "5 e^(x²) → 2x e^(x²)": (lambda x: math.exp(x * x), lambda x: 2 * x * math.exp(x * x)),
    "6 3/x² → −6/x³": (lambda x: 3 / x ** 2, lambda x: -6 / x ** 3),
    "7 2ˣ → 2ˣ ln 2": (lambda x: 2 ** x, lambda x: 2 ** x * math.log(2)),
    "8 √(x²+9) → x/√(x²+9)": (lambda x: math.sqrt(x * x + 9), lambda x: x / math.sqrt(x * x + 9)),
}
for navn, (f, d) in riktige.items():
    ok = all(abs((f(x + 1e-6) - f(x - 1e-6)) / 2e-6 - d(x)) < 1e-4 * (1 + abs(d(x))) for x in (1.7, 2.6, 4.1))
    print(f"  {navn}: {'stemmer' if ok else 'FEIL'}")
print("  3: u'v − uv' = (x − 1) − (x + 1) = −2")
print("  4: ln(3x) = ln 3 + ln x, så den deriverte er 1/x. Kjerneregel: 3 · 1/(3x) = 1/x")
