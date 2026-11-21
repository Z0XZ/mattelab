// Matematikken for andregradsfunksjonen f(x) = ax² + bx + c.
// Rene funksjoner uten DOM. Brukes av utforskeren og av forsiden, og er lette å teste.
import { tall, rens } from "../felles.js";

// ------------------------------------------------------------------ matematikk

/**
 * Regn ut alt vi viser om f(x) = ax² + bx + c.
 * Ren funksjon uten DOM, så den er lett å teste.
 */
export function analyser(a, b, c) {
  const res = { a, b, c, type: "andregrad", nullpunkter: [], alleNull: false };
  if (a === 0) {
    if (b !== 0) { res.type = "lineær"; res.nullpunkter = [rens(-c / b)]; }
    else if (c !== 0) res.type = "konstant";
    else { res.type = "null"; res.alleNull = true; }
    return res;
  }
  const D = rens(b * b - 4 * a * c);
  res.D = D;
  res.xs = rens(-b / (2 * a));
  res.ys = rens(c - (b * b) / (4 * a));
  if (D > 0) {
    // Numerisk stabil variant av abc-formelen
    const q = -(b + (b >= 0 ? 1 : -1) * Math.sqrt(D)) / 2;
    const x1 = q / a;
    const x2 = q !== 0 ? c / q : -x1;
    res.nullpunkter = [rens(x1), rens(x2)].sort((p, q2) => p - q2);
  } else if (D === 0) {
    res.nullpunkter = [res.xs];
  }
  return res;
}

/** Hvor er f(x) > 0 og f(x) < 0? Svarer med tekst. */
export function fortegn(r) {
  const t = (x) => tall(x, 2);
  const [p, q] = r.nullpunkter;
  if (r.type === "null") return { pos: "ingen x", neg: "ingen x" };
  if (r.type === "konstant") return r.c > 0 ? { pos: "alle x", neg: "ingen x" } : { pos: "ingen x", neg: "alle x" };
  if (r.type === "lineær") {
    const over = `x > ${t(p)}`, under = `x < ${t(p)}`;
    return r.b > 0 ? { pos: over, neg: under } : { pos: under, neg: over };
  }
  const opp = r.a > 0;
  if (r.D < 0) return opp ? { pos: "alle x", neg: "ingen x" } : { pos: "ingen x", neg: "alle x" };
  if (r.D === 0) {
    const unntatt = `alle x unntatt x = ${t(p)}`;
    return opp ? { pos: unntatt, neg: "ingen x" } : { pos: "ingen x", neg: unntatt };
  }
  const utenfor = `x < ${t(p)} eller x > ${t(q)}`, mellom = `${t(p)} < x < ${t(q)}`;
  return opp ? { pos: utenfor, neg: mellom } : { pos: mellom, neg: utenfor };
}

// Formelhjelperne ligger i matte.js og brukes av alle utforskerne.
export { texTall, texPolynom, texFaktor, texKoeffisient } from "../matte.js";
