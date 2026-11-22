// Polynomer uten DOM: utregning, nullpunkter, fortegn og polynomdivisjon.
// Brukes av utforskerne for polynomfunksjoner, polynomdivisjon og ulikheter.
// Et polynom er en liste med koeffisienter i stigende rekkefølge: [c0, c1, c2] betyr c0 + c1·x + c2·x².
import { rens } from "../felles.js";
import { texPolynom } from "../matte.js";

/** Fjern nuller i toppen, så graden blir riktig. Nullpolynomet er [0]. */
export function trim(p) {
  const q = p.map((c) => rens(c, 12));
  while (q.length > 1 && q[q.length - 1] === 0) q.pop();
  return q;
}

export function grad(p) { return trim(p).length - 1; }

/** Verdien i x (Horners metode). */
export function verdi(p, x) {
  let s = 0;
  for (let i = p.length - 1; i >= 0; i--) s = s * x + p[i];
  return s;
}

export function deriver(p) {
  const d = p.slice(1).map((c, i) => c * (i + 1));
  return d.length ? d : [0];
}

export function gang(p, q) {
  const ut = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => { ut[i + j] += a * b; }));
  return ut;
}

/** a(x − r1)(x − r2)… ganget ut. */
export function fraRotter(a, rotter) {
  let p = [a];
  for (const r of rotter) p = gang(p, [-r, 1]);
  return p.map((c) => rens(c, 10));
}

/**
 * Alle reelle nullpunkter, sortert. Nullpunktene til p ligger mellom nullpunktene til p′
 * (eller er et nullpunkt i p′ selv, da er det et multiplum). Derfor finner vi dem rekursivt
 * og med halveringsmetoden i hvert intervall.
 */
export function nullpunkter(p) {
  p = trim(p);
  const n = p.length - 1;
  if (n <= 0) return [];
  if (n === 1) return [rens(-p[0] / p[1], 10)];
  const ledende = p[n];
  const B = 1 + Math.max(...p.slice(0, n).map((c) => Math.abs(c / ledende)));
  const krit = nullpunkter(deriver(p)).filter((c) => c > -B && c < B);
  const skala = (x) => p.reduce((s, c, i) => s + Math.abs(c) * Math.abs(x) ** i, 0);
  const ut = [];
  for (const c of krit) if (Math.abs(verdi(p, c)) <= 1e-9 * skala(c)) ut.push(c);
  const punkter = [-B, ...krit, B];
  for (let i = 0; i < punkter.length - 1; i++) {
    let a = punkter[i], b = punkter[i + 1];
    let fa = verdi(p, a), fb = verdi(p, b);
    if (fa === 0 || fb === 0 || Math.sign(fa) === Math.sign(fb)) continue;
    for (let k = 0; k < 200 && b - a > 1e-15 * (1 + Math.abs(a)); k++) {
      const m = (a + b) / 2, fm = verdi(p, m);
      if (fm === 0) { a = b = m; break; }
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
    }
    ut.push((a + b) / 2);
  }
  ut.sort((x, y) => x - y);
  return ut.map((x) => rens(x, 9)).filter((x, i, l) => i === 0 || Math.abs(x - l[i - 1]) > 1e-7);
}

/** Intervallene mellom nullpunktene og fortegnet til p i hvert av dem. */
export function fortegnsintervaller(p, null_ = nullpunkter(p)) {
  const grenser = [-Infinity, ...null_, Infinity];
  const ut = [];
  for (let i = 0; i < grenser.length - 1; i++) {
    const fra = grenser[i], til = grenser[i + 1];
    const midt = !Number.isFinite(fra) && !Number.isFinite(til) ? 0
      : !Number.isFinite(fra) ? til - 1 : !Number.isFinite(til) ? fra + 1 : (fra + til) / 2;
    ut.push({ fra, til, fortegn: Math.sign(rens(verdi(p, midt), 12)) });
  }
  return ut;
}

/**
 * Topp-, bunn- og terrassepunkter: nullpunktene til p′, med fortegnet til p′ på hver side.
 */
export function ekstremalpunkter(p) {
  const d = deriver(p);
  if (grad(d) < 1) return [];
  const krit = nullpunkter(d);
  const iv = fortegnsintervaller(d, krit);
  return krit.map((x, i) => {
    const for_ = iv[i].fortegn, etter = iv[i + 1].fortegn;
    const type = for_ > 0 && etter < 0 ? "toppunkt" : for_ < 0 && etter > 0 ? "bunnpunkt" : "terrassepunkt";
    return { x, y: rens(verdi(p, x), 9), type };
  });
}

/**
 * Polynomdivisjon teller : nevner. Returnerer kvotient, rest og stegene slik de skrives for hånd:
 * hvert steg har leddet i svaret, det som trekkes fra, og det som står igjen etterpå.
 */
export function del(teller, nevner) {
  const N = trim(nevner), n = N.length - 1;
  if (n === 0 && N[0] === 0) return null;
  let rest = trim(teller);
  const kvotient = new Array(Math.max(1, rest.length - n)).fill(0);
  const steg = [];
  while (rest.length - 1 >= n && !(rest.length === 1 && rest[0] === 0)) {
    const g = rest.length - 1 - n;
    const k = rens(rest[rest.length - 1] / N[n], 12);
    kvotient[g] = k;
    const trekk = new Array(g).fill(0).concat(N.map((c) => rens(k * c, 12)));
    const ny = rest.map((c, i) => rens(c - (trekk[i] || 0), 12));
    ny.pop(); // det øverste leddet blir alltid null
    steg.push({ ledd: [k, g], trekk: trim(trekk), forRest: rest, rest: trim(ny.length ? ny : [0]) });
    rest = trim(ny.length ? ny : [0]);
    if (g === 0) break;
  }
  return { kvotient: trim(kvotient), rest, steg };
}

/** Polynomet i TeX, høyeste grad først: x^3 - 2x + 1. */
export function texPoly(p, x = "x") {
  const q = trim(p);
  const ledd = [];
  for (let i = q.length - 1; i >= 0; i--) ledd.push([q[i], i === 0 ? "" : i === 1 ? x : `${x}^{${i}}`]);
  return texPolynom(ledd);
}

const HEVET = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };

/** Polynomet som vanlig tekst med ekte minustegn og desimalkomma: x³ − 2x + 1. */
export function tekstPoly(p, tall) {
  const q = trim(p);
  let s = "";
  for (let i = q.length - 1; i >= 0; i--) {
    const k = q[i];
    if (k === 0) continue;
    const x = i === 0 ? "" : i === 1 ? "x" : "x" + HEVET[i];
    const t = Math.abs(k) === 1 && i > 0 ? "" : tall(Math.abs(k), 2);
    s += (s ? (k < 0 ? " − " : " + ") : k < 0 ? "−" : "") + t + x;
  }
  return s || "0";
}
