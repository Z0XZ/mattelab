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
