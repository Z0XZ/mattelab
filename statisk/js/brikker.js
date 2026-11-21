// mattelab.no – algebrabrikker i SVG.
//
// (ax + b)(cx + d) tegnes som et rektangel. Faktorene ligger langs kantene (øverst og til venstre),
// og produktet fyller rektangelet. Brikkene:
//   x²-brikke: x · x      x-brikke: x · 1      enerbrikke: 1 · 1
// Negative brikker har stiplet kant, lysere farge og et minustegn, så fargen ikke er eneste kjennetegn.
// Lengden x er 2,6 enheter, så x ikke ser ut som et helt antall enere.

import { svgEl } from "./felles.js";

export const X = 2.6;

/** Tell brikkene i (ax + b)(cx + d). Ren funksjon. */
export function tellBrikker(a, b, c, d) {
  // x-brikkene kommer fra x-kolonner ganger enerrader (a · |d|) og enerkolonner ganger x-rader (|b| · c)
  const xPos = (d > 0 ? a * d : 0) + (b > 0 ? b * c : 0);
  const xNeg = (d < 0 ? a * -d : 0) + (b < 0 ? -b * c : 0);
  return {
    x2: a * c,
    xPos, xNeg,
    nullpar: Math.min(xPos, xNeg),
    x: xPos - xNeg,
    en: b * d,
  };
}

function brikke(lag, x, y, w, h, type, negativ) {
  svgEl("rect", { class: `t-${type}${negativ ? " t-neg" : ""}`, x, y, width: w, height: h }, lag);
  if (negativ && w > 9 && h > 9) {
    const t = svgEl("text", { class: "t-minus", x: x + w / 2, y: y + h / 2 + 5, "text-anchor": "middle" }, lag);
    t.textContent = "−";
  }
}

/**
 * Tegn (ax + b)(cx + d) som et rektangel av brikker innenfor B × H piksler.
 * Gir tilbake målene, så den som kaller kan legge til tekst.
 */
export function tegnRektangel(lag, { a, b, c, d }, B, H, { margV = 64, margO = 58 } = {}) {
  const bredde = a * X + Math.abs(b), hoyde = c * X + Math.abs(d);
  if (bredde === 0 || hoyde === 0) return null;
  const kant = 1.35; // plass til faktorene langs kantene (i enheter)
  const u = Math.min((B - margV - 16) / (bredde + kant), (H - margO - 16) / (hoyde + kant), 46);
  const ox = margV + kant * u, oy = margO + kant * u;
  const kol = [], rad = [];
  for (let i = 0; i < a; i++) kol.push({ len: X, type: "x", neg: false });
  for (let i = 0; i < Math.abs(b); i++) kol.push({ len: 1, type: "1", neg: b < 0 });
  for (let j = 0; j < c; j++) rad.push({ len: X, type: "x", neg: false });
  for (let j = 0; j < Math.abs(d); j++) rad.push({ len: 1, type: "1", neg: d < 0 });

  // Faktorene langs kantene
  let x = ox;
  for (const k of kol) {
    brikke(lag, x, oy - kant * u, k.len * u, u, k.type === "x" ? "x" : "1", k.neg);
    x += k.len * u;
  }
  let y = oy;
  for (const r of rad) {
    brikke(lag, ox - kant * u, y, u, r.len * u, k_type(r), r.neg);
    y += r.len * u;
  }
  // Produktet
  y = oy;
  for (const r of rad) {
    x = ox;
    for (const k of kol) {
      const type = k.type === "x" && r.type === "x" ? "x2" : k.type === "x" || r.type === "x" ? "x" : "1";
      brikke(lag, x, y, k.len * u, r.len * u, type, k.neg !== r.neg);
      x += k.len * u;
    }
    y += r.len * u;
  }
  svgEl("rect", { class: "t-ramme", x: ox, y: oy, width: bredde * u, height: hoyde * u }, lag);
  return { ox, oy, u, bredde: bredde * u, hoyde: hoyde * u, kant: kant * u };
}

function k_type(r) {
  return r.type === "x" ? "x" : "1";
}

/** Brikkene i ax² + bx + c lagt i en haug (når de ikke kan bli et rektangel). */
export function tegnHaug(lag, { a, b, c }, B, H, { margV = 24, margO = 24 } = {}) {
  const antall = Math.abs(a) * X + Math.abs(b) * 1.15 + Math.min(Math.abs(c), 10) * 1.1 + 3;
  const u = Math.min((B - margV * 2) / antall, 40, (H - margO * 2) / (X + 2));
  let x = margV;
  const y = margO;
  for (let i = 0; i < Math.abs(a); i++) { brikke(lag, x, y, X * u, X * u, "x2", a < 0); x += X * u + 0.3 * u; }
  for (let i = 0; i < Math.abs(b); i++) { brikke(lag, x, y, u, X * u, "x", b < 0); x += 1.15 * u; }
  x += 0.6 * u;
  const perRad = 10;
  for (let i = 0; i < Math.abs(c); i++) {
    const rad = Math.floor(i / perRad), kol = i % perRad;
    brikke(lag, x + kol * 1.1 * u, y + rad * 1.1 * u, u, u, "1", c < 0);
  }
  return { u };
}
