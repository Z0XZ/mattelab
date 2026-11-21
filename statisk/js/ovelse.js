// mattelab.no – felles hjelp for øvingene: tilfeldige tall, tolking av svar og tilbakemelding.

import { tex } from "./utforsker.js";
import { tall } from "./felles.js";

export { tex };

/**
 * Tilfeldige tall som kan gjentas. Med ?frø=123 i adressen får alle samme oppgaver,
 * for eksempel når læreren vil gjennomgå de samme oppgavene i klassen.
 */
export function lagTilfeldig() {
  const p = new URLSearchParams(location.search).get("frø") ?? new URLSearchParams(location.search).get("fro");
  let s = p !== null && /^\d+$/.test(p) ? Number(p) : Math.floor(Math.random() * 2 ** 31);
  const neste = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    tall: neste,
    heltall: (a, b) => a + Math.floor(neste() * (b - a + 1)),
    velg: (liste) => liste[Math.floor(neste() * liste.length)],
  };
}

/**
 * Tolk et svar skrevet av eleven. Godtar heltall, desimaltall med komma eller punktum,
 * brøk som «5/2» eller «-5/2», blandet tall som «2 1/2», og både − og -.
 * Gir NaN når svaret ikke er et tall.
 */
export function tolkSvar(tekst) {
  let s = String(tekst).trim().replace(/[−–]/g, "-").replace(/\s+/g, " ").replace(/,/g, ".");
  if (!s) return NaN;
  s = s.replace(/^\+/, "");
  let m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (m) return (m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4]));
  m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]);
  s = s.replace(/ /g, "");
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
}

/** Er svaret riktig? Toleransen gjør at avrundede svar på irrasjonale tall godtas. */
export function erRiktig(svar, fasit, toleranse = 1e-9) {
  return Number.isFinite(svar) && Math.abs(svar - fasit) <= toleranse;
}

/** Brøk i TeX fra et tall som er en hel eller halv verdi (eller en firedel): 2,5 → \frac{5}{2}. */
export function texBrok(x) {
  for (const n of [1, 2, 4]) {
    const t = Math.round(x * n);
    if (Math.abs(t / n - x) < 1e-9) {
      if (n === 1) return String(t);
      return `${t < 0 ? "-" : ""}\\frac{${Math.abs(t)}}{${n}}`;
    }
  }
  return tall(x, 4).replace(",", "{,}").replace("−", "-");
}

/** Tall som tekst for tilbakemelding: 2,5 eller 5/2. */
export function visTall(x) {
  return tall(x, 4);
}
