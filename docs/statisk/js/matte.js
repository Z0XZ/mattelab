// mattelab.no – små hjelpefunksjoner for å skrive tall og uttrykk i TeX (KaTeX).
// Rene funksjoner uten DOM.
import { tall } from "./felles.js";

/** Tall i TeX med desimalkomma: 2.5 → "2{,}5" */
export function texTall(x, des = 2) {
  return tall(Math.abs(x), des).replace(/ /g, "\\,").replace(",", "{,}");
}

/** Bygg «ax² + bx + c» uten nulledd, uten 1-tall foran x og med riktige fortegn. */
export function texPolynom(ledd) {
  // ledd: [[koeffisient, "x^2"], [koeffisient, "x"], [koeffisient, ""]]
  let s = "";
  for (const [k, v] of ledd) {
    if (k === 0) continue;
    const fortegn = k < 0 ? "-" : s ? "+" : "";
    const tallDel = Math.abs(k) === 1 && v ? "" : texTall(k);
    s += (s ? ` ${fortegn} ` : fortegn) + tallDel + v;
  }
  return s || "0";
}

export function texFaktor(rot) {
  // (x − r), med fortegn som gir mening når r er negativ
  if (rot === 0) return "x";
  return `(x ${rot < 0 ? "+" : "-"} ${texTall(rot)})`;
}

export function texKoeffisient(a) {
  return a === 1 ? "" : a === -1 ? "-" : (a < 0 ? "-" : "") + texTall(a);
}


/** Tall i TeX med fortegn: −2,5 → "-2{,}5" */
export function texT(x, des = 2) {
  return (x < 0 && tall(x, des) !== "0" ? "-" : "") + texTall(x, des);
}

/** Tall i TeX, i parentes når det er negativt: (−3). Brukes ved innsetting i formler. */
export function texP(x, des = 2) {
  const t = texT(x, des);
  return t.startsWith("-") ? `(${t})` : t;
}

/** Skriv «≈» eller «=» etter om tallet blir avrundet med `des` desimaler. */
export function erLik(x, des = 2) {
  return Math.abs(Number(x.toFixed(des)) - x) > 1e-9 ? "\\approx" : "=";
}
