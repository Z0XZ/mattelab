// Utforsker: faktorisering av x² + bx + c med produkt og sum.
// Finn to hele tall m og n med m · n = c og m + n = b. Da er x² + bx + c = (x + m)(x + n),
// og brikkene kan legges som et rektangel med sider x + m og x + n.
import { svgEl, tall, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand,
} from "../utforsker.js";
import { texPolynom } from "../matte.js";
import { tegnRektangel, tegnHaug } from "../brikker.js";

// ------------------------------------------------------------------ matematikk (rene funksjoner)

/** Alle par av hele tall (m, n) med m · n = c og m ≤ n. For c = 0 finnes uendelig mange; da gis bare (0, b). */
export function faktorpar(c, b = 0) {
  if (c === 0) return [[0, b].sort((p, q) => p - q)];
  const par = [];
  const abs = Math.abs(c);
  for (let m = 1; m * m <= abs; m++) {
    if (abs % m) continue;
    const n = abs / m;
    if (c > 0) { par.push([m, n]); par.push([-n, -m]); }
    else { par.push([-m, n]); if (m !== n) par.push([-n, m]); }
  }
  return par.sort((p, q) => p[0] - q[0]);
}

/** Faktoriser x² + bx + c. Gir paret (m, n) når det finnes hele tall, ellers null. */
export function faktoriser(b, c) {
  const par = faktorpar(c, b);
  const treff = par.find(([m, n]) => m + n === b) || null;
  const D = b * b - 4 * c;
  const res = { b, c, par, treff, D };
  if (D >= 0) res.nullpunkter = [rens((-b - Math.sqrt(D)) / 2), rens((-b + Math.sqrt(D)) / 2)];
  return res;
}

/** (x + m) i TeX, med riktig fortegn. */
export function texFaktor(m) {
  if (m === 0) return "x";
  return `(x ${m < 0 ? "-" : "+"} ${Math.abs(m)})`;
}

export function texFaktorisert([m, n]) {
  if (m === n) return `${texFaktor(m)}^2`;
  const [p, q] = m === 0 ? [m, n] : n === 0 ? [n, m] : [m, n];
  return `${texFaktor(p)}${texFaktor(q)}`;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { b: 5, c: 6 };
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Algebrabrikker for uttrykket</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const glidere = lagGlidere($("glidere"), [
  { navn: "b", etikett: "<i>b</i>tallet foran x", beskrivelse: "b, tallet foran x", min: -12, maks: 12, steg: 1, desimaler: 0 },
  { navn: "c", etikett: "<i>c</i>konstantleddet", beskrivelse: "c, konstantleddet", min: -36, maks: 36, steg: 1, desimaler: 0 },
], STANDARD, () => oppdater(true));

// ------------------------------------------------------------------ tegning

function tegn(r) {
  const bredde = svg.parentElement.clientWidth || 640;
  const B = Math.round(Math.min(640, Math.max(320, bredde)));
  const H = B < 520 ? Math.round(B * 1.05) : 460;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const tekst = (x, y, s, anker = "middle", klasse = "g-mal") => {
    const t = svgEl("text", { class: klasse, x, y, "text-anchor": anker }, lag);
    t.textContent = s;
  };
  if (r.treff) {
    const [m, n] = r.treff;
    const mal = tegnRektangel(lag, { a: 1, b: m, c: 1, d: n }, B, H);
    const f = (k) => (k === 0 ? "x" : `x ${k < 0 ? "−" : "+"} ${Math.abs(k)}`);
    tekst(mal.ox + mal.bredde / 2, mal.oy - mal.kant - 10, f(m));
    tekst(mal.ox - mal.kant - 8, mal.oy + mal.hoyde / 2 + 4, f(n), "end");
  } else {
    tegnHaug(lag, { a: 1, b: r.b, c: r.c }, B, H * 0.55, { margV: 24, margO: 40 });
    tekst(24, 26, "Brikkene kan ikke legges som et rektangel med hele tall.", "start", "g-tall");
  }
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst(r) {
  const uttrykk = texPolynom([[1, "x^2"], [r.b, "x"], [r.c, ""]]);
  $("formel").innerHTML = tex(r.treff ? `${uttrykk} = ${texFaktorisert(r.treff)}` : uttrykk);
  // Tabell over faktorpar
  const rader = r.c === 0
    ? [`<tr class="treff"><td>0 og ${tall(r.b)}</td><td>0</td><td>${tall(r.b)}</td><td>✓</td></tr>`]
    : r.par.map(([m, n]) => `<tr${r.treff && m === r.treff[0] && n === r.treff[1] ? ' class="treff"' : ""}><td>${tall(m)} og ${tall(n)}</td><td>${tall(m * n)}</td><td>${tall(m + n)}</td><td>${m + n === r.b ? "✓ lik b" : ""}</td></tr>`);
  $("partabell").innerHTML = `<table class="liten-tabell"><caption class="visuelt-skjult">To tall med produkt c</caption>
    <tr><th scope="col">To tall</th><th scope="col">Produkt</th><th scope="col">Sum</th><th scope="col"><span class="visuelt-skjult">Treff</span></th></tr>${rader.join("")}</table>`;
  const v = [
    ["Faktorisert", r.treff ? texTekst(texFaktorisert(r.treff)) : "Ikke med hele tall", "bred"],
    ["b² − 4c", tall(r.D)],
    ["Nullpunkter", r.D < 0 ? "Ingen" : r.D === 0 ? `x = ${tall(r.nullpunkter[0])}` : `x ${erHele(r) ? "=" : "≈"} ${tall(r.nullpunkter[0])} og x ${erHele(r) ? "=" : "≈"} ${tall(r.nullpunkter[1])}`],
  ];
  visVerdier($("verdier"), v);
  let melding = "";
  if (r.c === 0 && r.b === 0) melding = `<strong>b = c = 0:</strong> Uttrykket er bare ${tex("x^2 = x \\cdot x")}. Nullpunktet er ${tex("x = 0")}.`;
  else if (r.c === 0) melding = `<strong>c = 0:</strong> Da kan vi sette ${tex("x")} utenfor: ${tex(`x^2 ${r.b < 0 ? "-" : "+"} ${Math.abs(r.b)}x = x${texFaktor(r.b)}`)}.`;
  else if (r.treff && r.treff[0] === r.treff[1]) melding = `<strong>Like tall:</strong> Begge faktorene er like, så uttrykket er et fullstendig kvadrat. Det er en kvadratsetning baklengs.`;
  else if (r.treff && r.b === 0) melding = `<strong>b = 0:</strong> Tallene er like store med motsatt fortegn. Det er konjugatsetningen baklengs: ${tex(`x^2 - ${-r.c} = ${texFaktorisert(r.treff)}`)}.`;
  else if (!r.treff && r.D >= 0) melding = `<strong>Ingen hele tall passer.</strong> Men ${tex("b^2 - 4c \\geq 0")}, så uttrykket kan likevel faktoriseres med nullpunktene fra abc-formelen: ${tex(`(x - x_1)(x - x_2)`)}, der ${tex("x_1")} og ${tex("x_2")} ikke er hele tall.`;
  else if (!r.treff) melding = `<strong>Kan ikke faktoriseres.</strong> ${tex(`b^2 - 4c = ${r.D} < 0`)}. Grafen til ${tex(uttrykk)} skjærer aldri x-aksen, så det finnes ingen nullpunkter å lage faktorer av.`;
  visMelding($("melding"), melding);
  const sammendrag = `x² + ${r.b}x + ${r.c}`.replace(/\+ -/g, "− ") + (r.treff ? ` = (x + ${r.treff[0]})(x + ${r.treff[1]})`.replace(/\+ -/g, "− ") : ". Kan ikke faktoriseres med hele tall.");
  svg.querySelector("desc").textContent = sammendrag;
  return sammendrag;
}

const erHele = (r) => r.nullpunkter.every(Number.isInteger);
const texTekst = (s) => s.replace(/\^2/g, "²").replace(/-/g, "−");

// ------------------------------------------------------------------ oppdatering

let r;
function oppdater(fraBruker) {
  const { b, c } = verdier(glidere);
  r = faktoriser(b, c);
  tegn(r);
  const sammendrag = oppdaterTekst(r);
  if (fraBruker) delTilstand(verdier(glidere), sammendrag);
}

function settVerdier(v) {
  for (const n of ["b", "c"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3 && r) { sistBredde = w; tegn(r); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "faktorisering", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["b", "c"], [], settVerdier, $("glidere").querySelector("input"));
oppdater(false);

window.mattelabFaktorisering = { faktoriser, faktorpar };
