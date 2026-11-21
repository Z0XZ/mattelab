"""Utregning av alle tall i oppgaver og løsningsforslag på siden om vekst.
Eksponentiell: f(t) = N0 · b^t med b = 1 + p/100.
Logistisk: N(t) = K / (1 + c·e^(−r t)) med c = (K − N0)/N0 og r = ln b,
slik at modellene vokser likt når N er liten i forhold til K.
Kjør: python3 verktoy/fasit/vekst.py"""
import math

def eksp(N0, p, t): return N0 * (1 + p / 100) ** t
def logi(N0, p, K, t):
    r = math.log(1 + p / 100); c = (K - N0) / N0
    return K / (1 + c * math.exp(-r * t))
def dobling(p): return math.log(2) / math.log(1 + p / 100)

print("Oppgave 1: 1000 kr, 5 %: etter 10 år", round(eksp(1000, 5, 10), 4), " doblingstid", round(dobling(5), 4))
print("           etter 14 og 15 år:", round(eksp(1000, 5, 14), 2), round(eksp(1000, 5, 15), 2))
print("Oppgave 2: p = 20: doblingstid", round(dobling(20), 4), " 70/20 =", 70 / 20)
for N0 in (10, 50):
    T = dobling(20); print(f"   N0={N0}: f(T)={eksp(N0, 20, T):.6f}  f(0)·2={2*N0}")
print("   p = 5:", round(dobling(5), 3), " 70/5 =", 14, "  p = 100:", round(dobling(100), 3), " 70/100 =", 0.7)
print("Oppgave 3: 400 mg, −15 %: b = 0,85. Etter 6 t:", round(eksp(400, -15, 6), 4),
      " halveringstid:", round(math.log(0.5) / math.log(0.85), 4))
print("Oppgave 4: N0 = 10, p = 20, K = 200")
r = math.log(1.2); c = (200 - 10) / 10
print("   r = ln 1,2 =", round(r, 6), " c =", c, " vendepunkt t =", round(math.log(c) / r, 4), " N =", round(logi(10, 20, 200, math.log(c) / r), 6))
for t in (0, 5, 10, 15, 20, 30):
    print(f"   t={t}: eksp {eksp(10, 20, t):.2f}  logistisk {logi(10, 20, 200, t):.2f}")
print("   maks vekstfart rK/4 =", round(r * 200 / 4, 4))
print("Oppgave 5: N0 = 300, K = 200, p = 20: c =", (200 - 300) / 300)
for t in (0, 5, 10, 20):
    print(f"   t={t}: {logi(300, 20, 200, t):.2f}")
