"""Utregning av alle tall i oppgaver og løsningsforslag på siden om trekanter.
Hjørner A, B, C. Siden a ligger overfor A, b overfor B, c overfor C.
Kjør: python3 verktoy/fasit/trekant.py"""
import math
R = math.radians; G = math.degrees

def fra_sss(a, b, c):
    A = G(math.acos((b*b + c*c - a*a) / (2*b*c)))
    B = G(math.acos((a*a + c*c - b*b) / (2*a*c)))
    return A, B, 180 - A - B

def areal(b, c, A): return 0.5 * b * c * math.sin(R(A))

b, c, A = 5, 7, 60
a = math.sqrt(b*b + c*c - 2*b*c*math.cos(R(A)))
print(f"Oppgave 1 (SVS): a² = {b*b + c*c - 2*b*c*math.cos(R(A)):.6f}, a = {a:.6f}, vinkler {fra_sss(a, b, c)}, areal {areal(b, c, A):.6f}")
print(f"   A = 90°: a = {math.sqrt(25 + 49):.6f} = √74")
print("Oppgave 2 (SSS): 3, 4, 5:", fra_sss(3, 4, 5), " areal", 0.5*3*4)
print("   2, 3, 6: 2 + 3 =", 5, "< 6, ingen trekant")
A, B, c = 40, 75, 10
C = 180 - A - B
a = c * math.sin(R(A)) / math.sin(R(C)); b = c * math.sin(R(B)) / math.sin(R(C))
print(f"Oppgave 3 (VSV): C = {C}, a = {a:.6f}, b = {b:.6f}, areal {0.5*a*b*math.sin(R(C)):.6f}")
for a in (6, 4, 9, 8 * math.sin(R(40))):
    s = 8 * math.sin(R(40)) / a
    if s > 1 + 1e-12: print(f"Oppgave 4 (SSV) a={a:.4f}: sin B = {s:.6f} > 1, ingen trekant"); continue
    B1 = G(math.asin(min(1, s))); B2 = 180 - B1
    løs = [B for B in (B1, B2) if 40 + B < 180 - 1e-9]
    if abs(B1 - B2) < 1e-9: løs = [B1]
    ut = []
    for B in løs:
        C = 180 - 40 - B; c = a * math.sin(R(C)) / math.sin(R(40))
        ut.append(f"B = {B:.4f}, C = {C:.4f}, c = {c:.4f}, areal {0.5*a*8*math.sin(R(C)):.4f}")
    print(f"Oppgave 4 (SSV) a={a:.4f}: sin B = {s:.6f}; " + " | ".join(ut))
print(f"Oppgave 5: areal ½·40·55·sin 110° = {areal(40, 55, 110):.4f}, sin 110° = {math.sin(R(110)):.6f}, sin 70° = {math.sin(R(70)):.6f}")
print(f"   tredje side: {math.sqrt(40**2 + 55**2 - 2*40*55*math.cos(R(110))):.4f}")
print("Standard: SVS b = 4, c = 6, A = 50:", math.sqrt(16 + 36 - 48*math.cos(R(50))))
