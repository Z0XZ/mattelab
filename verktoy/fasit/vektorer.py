"""Utregning av alle tall i oppgaver og løsningsforslag på siden om vektorer.
Kjør: python3 verktoy/fasit/vektorer.py"""
from fractions import Fraction as F
import math

def prikk(u, v): return u[0]*v[0] + u[1]*v[1]
def lengde(u): return math.hypot(*u)
def vinkel(u, v): return math.degrees(math.acos(prikk(u, v) / (lengde(u) * lengde(v))))

u, v = (3, 1), (1, 2)
w = (u[0] + v[0], u[1] + v[1])
print("Oppgave 1: u + v =", w, " |u + v| =", lengde(w), " |u| + |v| =", lengde(u) + lengde(v))
print("Oppgave 2: u·v =", prikk(u, v), " |u| =", lengde(u), "(√10)  |v| =", lengde(v), "(√5)  cos =", prikk(u, v) / (lengde(u)*lengde(v)), " vinkel =", vinkel(u, v))
print("   v = [−1, 3]: u·v =", prikk(u, (-1, 3)), " vinkel", vinkel(u, (-1, 3)))
print("Oppgave 3: u = [2, 1], v = [k, 3]: 2·3 − 1·k = 0 ⇒ k =", 6, " sjekk v = 3u/... ", (6, 3), "= 3·", (2, 1))
A = [[3, 1], [1, 2]]; b = (5, 4)
det = F(A[0][0]*A[1][1] - A[0][1]*A[1][0])
s = (b[0]*A[1][1] - A[0][1]*b[1]) / det
t = (A[0][0]*b[1] - b[0]*A[1][0]) / det
print("Oppgave 4: 3s + t = 5, s + 2t = 4 ⇒ s =", s, float(s), " t =", t, float(t), " sjekk", 3*s + t, s + 2*t)
P, r = (1, 2), (2, 1)
print("Oppgave 5: punkt ved t = 3:", (P[0] + 3*r[0], P[1] + 3*r[1]))
for Q in ((5, 4), (4, 4)):
    tx = F(Q[0] - P[0], r[0]); ty = F(Q[1] - P[1], r[1])
    print(f"   Q = {Q}: t fra x = {tx}, t fra y = {ty}, på linja: {tx == ty}")
print("   y = 0,5x + 1,5: sjekk x = 1 →", F(1, 2) * 1 + F(3, 2))
print("   fart |r| =", lengde(r), "(√5)")
