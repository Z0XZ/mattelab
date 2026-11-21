// Utforsker: algebrabrikker. Gang ut (ax + b)(cx + d) og se hver brikke i produktet.
import { svgEl } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand,
} from "../utforsker.js";
import { texPolynom, texT } from "../matte.js";
import { tellBrikker, tegnRektangel } from "../brikker.js";

// ------------------------------------------------------------------ matematikk

/** (ax + b)(cx + d) = ac x² + (ad + bc) x + bd. Ren funksjon. */
export function gangUt(a, b, c, d) {
  return { A: a * c, B: a * d + b * c, C: b * d, brikker: tellBrikker(a, b, c, d) };
}

/** En faktor ax + b i TeX. */
export function texFaktor(a, b) {
  const s = texPolynom([[a, "x"], [b, ""]]);
  return a !== 0 && b !== 0 ? `(${s})` : s.startsWith("-") ? `(${s})` : s;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: 2, c: 1, d: 3 };
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Algebrabrikker</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const heltall = { steg: 1, desimaler: 0 };
const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>antall x i første faktor", beskrivelse: "a, antall x i den første faktoren", min: 0, maks: 3, ...heltall },
  { navn: "b", etikett: "<i>b</i>tallet i første faktor", beskrivelse: "b, tallet i den første faktoren", min: -6, maks: 6, ...heltall },
  { navn: "c", etikett: "<i>c</i>antall x i andre faktor", beskrivelse: "c, antall x i den andre faktoren", min: 0, maks: 3, ...heltall },
  { navn: "d", etikett: "<i>d</i>tallet i andre faktor", beskrivelse: "d, tallet i den andre faktoren", min: -6, maks: 6, ...heltall },
], STANDARD, () => oppdater(true));

// ------------------------------------------------------------------ tegning

let B = 640, H = 460;

function tegn() {
  const bredde = svg.parentElement.clientWidth || 640;
  B = Math.round(Math.min(640, Math.max(320, bredde)));
  H = B < 520 ? Math.round(B * 1.05) : 460;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const v = verdier(glidere);
  const m = tegnRektangel(lag, v, B, H);
  if (!m) return;
  const tekst = (x, y, s, anker = "middle") => {
    const t = svgEl("text", { class: "g-mal", x, y, "text-anchor": anker }, lag);
    t.textContent = s;
  };
  const f = (a, b) => (a ? (a === 1 ? "x" : `${a}x`) : "") + (b ? `${a ? (b < 0 ? " − " : " + ") : b < 0 ? "−" : ""}${Math.abs(b)}` : a ? "" : "0");
  tekst(m.ox + m.bredde / 2, m.oy - m.kant - 10, f(v.a, v.b));
  tekst(m.ox - m.kant - 8, m.oy + m.hoyde / 2 + 4, f(v.c, v.d), "end");
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, b, c, d } = verdier(glidere);
  const r = gangUt(a, b, c, d);
  const k = r.brikker;
  const resultat = texPolynom([[r.A, "x^2"], [r.B, "x"], [r.C, ""]]);
  $("formel").innerHTML = tex(`${texFaktor(a, b)}${texFaktor(c, d)} = ${resultat}`);
  // Hvert ledd i den første faktoren ganges med hvert ledd i den andre
  const fx = (k) => (k === 1 ? "x" : `${k}x`);
  const p = (k) => (k < 0 ? `(${k})` : String(k));
  const ledd = [];
  if (a && c) ledd.push(`${fx(a)} \\cdot ${fx(c)}`);
  if (a && d) ledd.push(`${fx(a)} \\cdot ${p(d)}`);
  if (b && c) ledd.push(`${p(b)} \\cdot ${fx(c)}`);
  if (b && d) ledd.push(`${p(b)} \\cdot ${p(d)}`);
  $("utregning").innerHTML = ledd.length ? tex(ledd.join(" + ")) : "";
  const antall = (n, en, fl) => `${n} ${n === 1 ? en : fl}`;
  const rader = [
    ["x²-brikker", String(k.x2)],
    ["x-brikker", k.xNeg ? `${k.xPos} ${k.xPos === 1 ? "positiv" : "positive"}, ${k.xNeg} ${k.xNeg === 1 ? "negativ" : "negative"}` : String(k.xPos)],
    ["Enerbrikker", k.en < 0 ? `${-k.en} ${k.en === -1 ? "negativ" : "negative"}` : String(k.en)],
    ["Nullpar (x-brikker)", String(k.nullpar)],
    ["Produktet", resultat.replace(/\^2/g, "²").replace(/-/g, "−").replace(/\s+/g, " "), "bred"],
  ];
  visVerdier($("verdier"), rader);
  let melding = "";
  if ((a === 0 && b === 0) || (c === 0 && d === 0)) melding = "<strong>En faktor er 0:</strong> Da blir produktet 0, og det er ingen brikker å legge.";
  else if (k.nullpar) melding = `<strong>Nullpar:</strong> ${antall(k.xPos, "positiv", "positive")} og ${antall(k.xNeg, "negativ", "negative")} x-brikker. ${antall(k.nullpar, "par", "par")} av en positiv og en negativ x-brikke er til sammen 0. Derfor står det ${tex(`${texT(r.B)}x`)} i svaret.`;
  else if (a === 0 || c === 0) melding = "<strong>En faktor uten x:</strong> Da blir det ingen x²-brikker. Produktet er et førstegradsuttrykk.";
  visMelding($("melding"), melding);
  const sammendrag = `(${a}x + ${b})(${c}x + ${d}) = ${r.A}x² + ${r.B}x + ${r.C}.`.replace(/\+ -/g, "− ");
  svg.querySelector("desc").textContent = sammendrag + ` ${k.x2} x²-brikker, ${k.xPos} positive og ${k.xNeg} negative x-brikker, ${Math.abs(k.en)} ${k.en < 0 ? "negative" : ""} enerbrikker.`;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  tegn();
  const sammendrag = oppdaterTekst();
  if (fraBruker) delTilstand(verdier(glidere), sammendrag);
}

function settVerdier(v) {
  for (const n of ["a", "b", "c", "d"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3) { sistBredde = w; tegn(); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "algebrabrikker", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b", "c", "d"], [], settVerdier, $("glidere").querySelector("input"));
oppdater(false);

window.mattelabBrikker = { gangUt };
