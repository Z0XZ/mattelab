// Utforsker: en funksjon og den omvendte funksjonen
// Grafen til g = f⁻¹ er grafen til f speilet om linja y = x. Punktet P = (a, f(a)) blir Q = (f(a), a).
// Tangenten speiles også, så stigningstallet blir det omvendte: g′(f(a)) = 1 / f′(a).
import { tall, tallOmtrent, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";

// ------------------------------------------------------------------ matematikk

/**
 * Funksjonspar. f er definert på [fra, til] (der den er en-entydig), g er den omvendte.
 * df er den deriverte av f. Tekstene brukes i panelet.
 */
export const PAR = {
  eksp: {
    navn: "eˣ og ln x", ftex: "e^x", gtex: "\\ln x", dftex: "e^x", dgtex: "\\frac{1}{x}",
    f: (x) => Math.exp(x), g: (y) => (y > 0 ? Math.log(y) : NaN), df: (x) => Math.exp(x), fra: -Infinity, til: Infinity,
  },
  kvadrat: {
    navn: "x² og √x", ftex: "x^2, \\; x \\geq 0", gtex: "\\sqrt{x}", dftex: "2x", dgtex: "\\frac{1}{2\\sqrt{x}}",
    f: (x) => (x >= 0 ? x * x : NaN), g: (y) => (y >= 0 ? Math.sqrt(y) : NaN), df: (x) => 2 * x, fra: 0, til: Infinity,
  },
  kubikk: {
    navn: "x³ og ∛x", ftex: "x^3", gtex: "\\sqrt[3]{x}", dftex: "3x^2", dgtex: "\\frac{1}{3\\sqrt[3]{x^2}}",
    f: (x) => x ** 3, g: (y) => Math.cbrt(y), df: (x) => 3 * x * x, fra: -Infinity, til: Infinity,
  },
  lineaer: {
    navn: "2x + 1 og (x − 1)/2", ftex: "2x + 1", gtex: "\\frac{x - 1}{2}", dftex: "2", dgtex: "\\frac{1}{2}",
    f: (x) => 2 * x + 1, g: (y) => (y - 1) / 2, df: () => 2, fra: -Infinity, til: Infinity,
  },
};

/** Punktene og stigningstallene for tangentpunktet x = a. */
export function analyser(par, a) {
  const P = PAR[par];
  const r = { par, a, definert: a >= P.fra && a <= P.til };
  if (!r.definert) return r;
  r.b = rens(P.f(a), 12);               // f(a), og x-verdien til Q
  r.fd = rens(P.df(a), 12);              // f′(a)
  r.gd = r.fd === 0 ? null : rens(1 / r.fd, 12);  // g′(b) = 1 / f′(a), finnes ikke når f′(a) = 0
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { par: "eksp", a: 1 };
let par = lesValg("par", Object.keys(PAR), STANDARD.par);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -3, xmax: 6, ymin: -3, ymax: 6, tittel: "Grafen til f og den omvendte funksjonen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>tangentpunktet på f", beskrivelse: "a, x-verdien til punktet P på grafen til f", min: -2, maks: 2, steg: 0.1, grense: [-10, 10] },
], STANDARD, () => oppdater(true));

const velger = $("par");
velger.value = par;
velger.addEventListener("change", () => { par = velger.value; oppdater(true); });

let r;

// ------------------------------------------------------------------ tegning

/** Linje gjennom (x, y) med stigningstall k over hele vinduet. k = null gir en loddrett linje. */
function linjeGjennom(x, y, k, klasse) {
  if (k === null) { ks.linje(x, ks.ymin, x, ks.ymax, klasse); return; }
  ks.linje(ks.xmin, y + k * (ks.xmin - x), ks.xmax, y + k * (ks.xmax - x), klasse);
}

ks.vedTegning = () => {
  if (!r) return;
  const P = PAR[par];
  if (visValg.speil.checked) ks.linje(ks.xmin, ks.xmin, ks.xmax, ks.xmax, "g-hjelp");
  ks.funksjon(P.f);
  ks.funksjon(P.g, "g-graf-2");
  if (!r.definert) return;
  if (visValg.tangenter.checked) {
    linjeGjennom(r.a, r.b, r.fd, "g-tangent-blekk");
    linjeGjennom(r.b, r.a, r.gd, "g-tangent-blekk");
  }
  if (visValg.speil.checked) ks.linje(r.a, r.b, r.b, r.a, "g-hjelp");
  ks.punkt(r.a, r.b, { etikett: "P", plass: "ov-v" });
  ks.punkt(r.b, r.a, { klasse: "g-punkt-2", etikett: "Q", plass: "under" });
};

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const P = PAR[par];
  $("forskrift").innerHTML = `<p>${tex(`f(x) = ${P.ftex}`)}</p><p>${tex(`g(x) = ${P.gtex}`)}</p>`;
  $("derivert").innerHTML = `<p>${tex(`f'(x) = ${P.dftex}`)}</p><p>${tex(`g'(x) = ${P.dgtex}`)}</p>`;
  const rader = [];
  let melding = "";
  if (!r.definert) {
    rader.push(["P", "Finnes ikke", "bred"]);
    melding = `<strong>Utenfor:</strong> Vi bruker bare ${tex("x \\geq 0")}, så ${tex("x^2")} har en omvendt funksjon. Flytt ${tex("a")}.`;
  } else {
    rader.push(["P på f", `(${tall(r.a, 2)}, ${tallOmtrent(r.b, 3)})`]);
    rader.push(["Q på g", `(${tallOmtrent(r.b, 3)}, ${tall(r.a, 2)})`]);
    rader.push(["f′(a)", tallOmtrent(r.fd, 3)]);
    rader.push(["g′ i Q", r.gd === null ? "Finnes ikke (loddrett tangent)" : tallOmtrent(r.gd, 3), r.gd === null ? "bred" : ""]);
    if (r.gd !== null) rader.push(["f′(a) · g′ i Q", tall(rens(r.fd * r.gd, 9), 3)]);
    if (r.gd === null) melding = `<strong>Vannrett blir loddrett:</strong> ${tex("f'(a) = 0")}, så tangenten i P er vannrett. Speilet om ${tex("y = x")} blir den loddrett. Derfor er ikke den omvendte funksjonen deriverbar i Q.`;
    else if (par === "eksp") melding = `<strong>Se på Q:</strong> Stigningstallet til ${tex("\\ln x")} i ${tex(`x = ${tall(r.b, 3).replace(",", "{,}")}`)} er ${tex(`\\frac{1}{e^{a}} = \\frac{1}{x}`)}. Det er derfor ${tex("(\\ln x)' = \\frac{1}{x}")}.`;
  }
  visVerdier($("verdier"), rader.map((x) => x.filter(Boolean)));
  visMelding($("melding"), melding);
  const sammendrag = !r.definert ? `${P.navn}. a = ${tall(r.a)} er utenfor.`
    : `${P.navn}. P = (${tall(r.a)}, ${tall(r.b, 3)}), Q = (${tall(r.b, 3)}, ${tall(r.a)}). f′(a) = ${tall(r.fd, 3)}, g′ i Q = ${r.gd === null ? "finnes ikke" : tall(r.gd, 3)}.`;
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  velger.value = par;
  r = analyser(par, verdier(glidere).a);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ par, a: verdier(glidere).a }, sammendrag);
}

function settVerdier(ny) {
  if (ny.par) par = ny.par;
  if ("a" in ny) glidere.a.sett(ny.a);
  oppdater(true);
  ks.tilbakestill();
}

figurverktoy({ ks, svg, filnavn: "omvendte-funksjoner", tilpass: () => ks.tilbakestill(), tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a"], ["par"], settVerdier, velger);

oppdater(false);

window.mattelabOmvendt = { analyser, PAR, hent: () => r };
