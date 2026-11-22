// Utforsker: stigningstallfunksjonen (den deriverte som funksjon)
// Øverst: grafen til f med tangent i x₀. Nederst: punktet (x₀, f′(x₀)).
// Når x₀ flyttes, blir punktene liggende igjen som et spor. Sporet tegner grafen til f′.
import { tall, tallOmtrent, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";
import { texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Funksjonene eleven kan velge. d(x) er den deriverte, og null der den ikke finnes
 * (utenfor definisjonsmengden, i en knekk eller der tangenten er loddrett).
 * vindu: [xmin, xmax, ymin, ymax] for f, dvindu: [ymin, ymax] for f′.
 */
export const FUNKSJONER = {
  x2: {
    navn: "f(x) = x²", tex: "x^2", dtex: "2x", f: (x) => x * x, d: (x) => 2 * x,
    vindu: [-4, 4, -2, 9], dvindu: [-8, 8],
  },
  topp: {
    navn: "f(x) = −x² + 2x + 3", tex: "-x^2 + 2x + 3", dtex: "-2x + 2", f: (x) => -x * x + 2 * x + 3, d: (x) => -2 * x + 2,
    vindu: [-3, 5, -6, 6], dvindu: [-8, 8],
  },
  kubisk: {
    navn: "f(x) = x³ − 3x", tex: "x^3 - 3x", dtex: "3x^2 - 3", f: (x) => x ** 3 - 3 * x, d: (x) => 3 * x * x - 3,
    vindu: [-3, 3, -5, 5], dvindu: [-4, 10],
  },
  fjerde: {
    navn: "f(x) = ¼x⁴ − 2x²", tex: "\\tfrac{1}{4}x^4 - 2x^2", dtex: "x^3 - 4x", f: (x) => x ** 4 / 4 - 2 * x * x, d: (x) => x ** 3 - 4 * x,
    vindu: [-3.5, 3.5, -5, 5], dvindu: [-8, 8],
  },
  eksp: {
    navn: "f(x) = eˣ", tex: "e^x", dtex: "e^x", f: (x) => Math.exp(x), d: (x) => Math.exp(x),
    vindu: [-4, 3, -1, 8], dvindu: [-1, 8],
  },
  ln: {
    navn: "f(x) = ln x", tex: "\\ln x", dtex: "\\frac{1}{x}", f: (x) => (x > 0 ? Math.log(x) : NaN), d: (x) => (x > 0 ? 1 / x : null),
    vindu: [-1, 6, -3, 3], dvindu: [-1, 5], definert: "x > 0",
  },
  rot: {
    navn: "f(x) = √x", tex: "\\sqrt{x}", dtex: "\\frac{1}{2\\sqrt{x}}", f: (x) => (x >= 0 ? Math.sqrt(x) : NaN), d: (x) => (x > 0 ? 1 / (2 * Math.sqrt(x)) : null),
    vindu: [-1, 6, -1, 3], dvindu: [-1, 3], definert: "x ≥ 0",
  },
  inv: {
    navn: "f(x) = 1/x", tex: "\\frac{1}{x}", dtex: "-\\frac{1}{x^2}", f: (x) => (x !== 0 ? 1 / x : NaN), d: (x) => (x !== 0 ? -1 / (x * x) : null),
    vindu: [-4, 4, -4, 4], dvindu: [-6, 1], definert: "x ≠ 0",
  },
  abs: {
    navn: "f(x) = |x|", tex: "|x|", dtex: "\\begin{cases} -1 & x < 0 \\\\ 1 & x > 0 \\end{cases}", f: (x) => Math.abs(x), d: (x) => (x === 0 ? null : Math.sign(x)),
    vindu: [-4, 4, -1, 4], dvindu: [-2, 2],
  },
};

/** Alt vi vet om f i x₀. d er null når den deriverte ikke finnes. */
export function analyser(fn, x0) {
  const F = FUNKSJONER[fn];
  const y0 = F.f(x0);
  const r = { fn, x0, y0, definert: Number.isFinite(y0), d: null };
  if (!r.definert) return r;
  const d = F.d(x0);
  r.d = d === null ? null : rens(d, 12);
  if (r.d !== null) {
    // Tangenten y = ax + b
    r.a = r.d;
    r.b = rens(y0 - r.d * x0, 12);
  }
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { fn: "kubisk", x0: -2 };
let fn = lesValg("fn", Object.keys(FUNKSJONER), STANDARD.fn);
const F = () => FUNKSJONER[fn];
const vinduF = () => { const [xmin, xmax, ymin, ymax] = F().vindu; return { xmin, xmax, ymin, ymax }; };
const vinduD = () => { const [xmin, xmax] = F().vindu; const [ymin, ymax] = F().dvindu; return { xmin, xmax, ymin, ymax }; };

const svgF = $("graf"), svgD = $("graf-derivert");
const ks = new Koordinatsystem(svgF, { ...vinduF(), bredde: 640, hoyde: 340, likeEnheter: false, tittel: "Grafen til f med tangent" });
const ksd = new Koordinatsystem(svgD, { ...vinduD(), bredde: 640, hoyde: 280, likeEnheter: false, tittel: "Stigningstallet til tangenten, f′(x)" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => { tegnBegge(); if (boks.name === "dgraf") oppdater(false); });
}

const glidere = lagGlidere($("glidere"), [
  { navn: "x0", etikett: "<i>x<sub>0</sub></i>tangentpunktet", beskrivelse: "x null, der tangenten tegnes", min: -5, maks: 5, steg: 0.1, grense: [-100, 100] },
], STANDARD, () => { stoppAnimasjon(); oppdater(true); });

const velger = $("funksjon");
velger.value = fn;
velger.addEventListener("change", () => { fn = velger.value; nyFunksjon(); oppdater(true); });

/** Sporet: punktene (x, f′(x)) eleven har besøkt. Nøkkelen er x rundet til hundredeler. */
const spor = new Map();
function leggTilSpor(r) {
  if (r.d !== null) spor.set(Math.round(r.x0 * 100), [r.x0, r.d]);
}

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (!r) return;
  ks.funksjon(F().f);
  if (!r.definert) { ks.loddrett(r.x0, "g-hjelp"); return; }
  ks.loddrett(r.x0, "g-hjelp");
  if (r.d !== null) {
    ks.linje(ks.xmin, r.y0 + r.d * (ks.xmin - r.x0), ks.xmax, r.y0 + r.d * (ks.xmax - r.x0), "g-tangent");
    if (visValg.trekant.checked) {
      // Stigningstrekant: én enhet bortover, f′(x₀) enheter opp eller ned
      const x1 = r.x0 + 1;
      ks.mangekant([[r.x0, r.y0], [x1, r.y0], [x1, r.y0 + r.d]], "g-fyll-3");
      ks.linje(r.x0, r.y0, x1, r.y0, "g-hjelp");
      ks.linje(x1, r.y0, x1, r.y0 + r.d, "g-hjelp");
    }
  } else if (fn === "rot" && r.x0 === 0) {
    ks.loddrett(0, "g-tangent");
  }
  ks.punkt(r.x0, r.y0, { etikett: "P", plass: "ov-v" });
};

ksd.vedTegning = () => {
  if (!r) return;
  if (visValg.dgraf.checked) {
    // Tegn grenene hver for seg der f′ ikke finnes (|x| og 1/x i 0)
    const d = (x) => { const y = F().d(x); return y === null ? NaN : y; };
    ksd.funksjon((x) => (x < 0 ? d(x) : NaN), "g-graf-2");
    ksd.funksjon((x) => (x > 0 ? d(x) : NaN), "g-graf-2");
  }
  // Bare punkter i vinduet: Punkt utenfor blir ellers piler langs kanten
  for (const [x, y] of spor.values()) if (ksd.innenfor(x, y)) ksd.punkt(x, y, { klasse: "g-punkt-2", r: 3.5 });
  ksd.loddrett(r.x0, "g-hjelp");
  if (r.d !== null) {
    ksd.punkt(r.x0, r.d, { klasse: "g-punkt", r: 6, etikett: `(${tall(r.x0, 2)}, ${tall(rens(r.d, 9), 2)})`, plass: r.x0 > (ksd.xmin + ksd.xmax) / 2 ? "ov-v" : "ov" });
  }
};

function tegnBegge() { ks.tegn(); ksd.tegn(); }

function nyFunksjon() {
  spor.clear();
  ks.standard = vinduF();
  ksd.standard = vinduD();
  ks.tilbakestill();
  ksd.tilbakestill();
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const fx = F();
  const vis = visValg.dgraf.checked;
  $("forskrift").innerHTML = tex(`f(x) = ${fx.tex}`);
  $("derivert-uttrykk").innerHTML = tex(`f'(x) = ${fx.dtex}`);
  $("derivert-blokk").hidden = !vis;
  const rader = [];
  let melding = "";
  if (!r.definert) {
    rader.push(["P", "Finnes ikke", "bred"]);
    melding = `<strong>Utenfor definisjonsmengden:</strong> ${tex(`f(x) = ${fx.tex}`)} er bare definert for ${fx.definert}. Flytt ${tex("x_0")}.`;
  } else {
    rader.push(["P", `(${tall(r.x0, 2)}, ${tallOmtrent(rens(r.y0, 9), 3)})`]);
    if (r.d === null) {
      rader.push(["f′(x₀)", "Finnes ikke", "bred"]);
      if (fn === "abs") melding = `<strong>Knekk i x = 0:</strong> Til venstre er stigningstallet −1, til høyre er det 1. Det finnes ingen tangent i knekkpunktet, så ${tex("f'(0)")} finnes ikke. Se hullet i grafen til ${tex("f'")}.`;
      if (fn === "rot") melding = `<strong>Loddrett tangent i x = 0:</strong> En loddrett linje har ikke noe stigningstall. ${tex("f'(0)")} finnes ikke, og ${tex("f'(x)")} vokser over alle grenser når ${tex("x \\to 0")}.`;
    } else {
      rader.push(["f′(x₀)", `${tallOmtrent(r.d, 3)} (stigningstallet til tangenten)`, "bred"]);
      rader.push(["f i x₀", r.d > 0 ? "vokser" : r.d < 0 ? "avtar" : "vannrett tangent"]);
      rader.push(["Tangenten", `y ${linjeTekst(r.a, r.b).startsWith("≈") ? "" : "= "}${linjeTekst(r.a, r.b)}`]);
      if (fn === "eksp") melding = `<strong>Se på tallene:</strong> ${tex("f'(x_0)")} og ${tex("f(x_0)")} er like for alle ${tex("x_0")}. For ${tex("e^x")} er stigningstallet like stort som funksjonsverdien.`;
      else if (r.d === 0) melding = `<strong>Vannrett tangent:</strong> ${tex(`f'(${texT(r.x0)}) = 0`)}. Grafen til ${tex("f'")} skjærer x-aksen her. Er det et toppunkt eller et bunnpunkt på grafen til ${tex("f")}?`;
    }
  }
  rader.push(["Punkter i sporet", String(spor.size)]);
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);

  const sammendrag = !r.definert ? `${fx.navn}. x₀ = ${tall(r.x0)} er utenfor definisjonsmengden.`
    : r.d === null ? `${fx.navn}. x₀ = ${tall(r.x0)}. Den deriverte finnes ikke her.`
    : `${fx.navn}. x₀ = ${tall(r.x0)}. Tangenten har stigningstall ${tall(r.d, 3)}.`;
  ks.beskrivelse = sammendrag;
  ksd.beskrivelse = `${spor.size} punkter (x, f′(x)) i sporet.${vis ? ` Grafen til f′(x) = ${fx.dtex} vises.` : ""}`;
  return sammendrag;
}

/** y = ax + b som vanlig tekst med ekte minustegn. Avrundet til tre desimaler, med ≈ foran når det er avrundet. */
function linjeTekst(a, b) {
  const t = (x) => tall(Math.abs(x), 3);
  const avrundet = [a, b].some((x) => Math.abs(Math.round(x * 1000) / 1000 - x) > 1e-9);
  const at = a === 0 ? "" : a === 1 ? "x" : a === -1 ? "−x" : `${a < 0 ? "−" : ""}${t(a)}x`;
  const tekst = !at ? `${b < 0 ? "−" : ""}${t(b)}` : b === 0 ? at : `${at} ${b < 0 ? "−" : "+"} ${t(b)}`;
  return (avrundet ? "≈ " : "") + tekst;
}

// ------------------------------------------------------------------ animasjon: tegn hele sporet

let animasjon = 0;
function stoppAnimasjon() { cancelAnimationFrame(animasjon); animasjon = 0; $("tegn-spor").textContent = "Flytt tangenten over hele grafen"; }
$("tegn-spor").addEventListener("click", () => {
  if (animasjon) { stoppAnimasjon(); return; }
  // Bare der grafen til f er synlig, så tangentpunktet ikke havner utenfor vinduet
  const synlig = [];
  for (let i = Math.ceil(ks.xmin * 10); i <= Math.floor(ks.xmax * 10); i++) {
    const y = F().f(i / 10);
    if (Number.isFinite(y) && y >= ks.ymin && y <= ks.ymax) synlig.push(i / 10);
  }
  if (!synlig.length) return;
  const fra = synlig[0], til = synlig[synlig.length - 1];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (let x = fra; x <= til + 1e-9; x += 0.1) leggTilSpor(analyser(fn, rens(x, 6)));
    glidere.x0.sett(til);
    oppdater(true);
    return;
  }
  const varighet = 4000, t0 = performance.now();
  $("tegn-spor").textContent = "Stopp";
  const steg = (n) => {
    const t = Math.min(1, (n - t0) / varighet);
    glidere.x0.sett(rens(Math.round((fra + t * (til - fra)) * 10) / 10, 6));
    oppdater(t === 1);
    if (t < 1) animasjon = requestAnimationFrame(steg); else stoppAnimasjon();
  };
  animasjon = requestAnimationFrame(steg);
});

$("fjern-spor").addEventListener("click", () => { stoppAnimasjon(); spor.clear(); oppdater(false); });

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  velger.value = fn;
  const v = verdier(glidere);
  r = analyser(fn, v.x0);
  leggTilSpor(r);
  const sammendrag = oppdaterTekst();
  tegnBegge();
  if (fraBruker) delTilstand({ fn, x0: v.x0 }, sammendrag);
}

function settVerdier(ny) {
  stoppAnimasjon();
  if (ny.fn && ny.fn !== fn) { fn = ny.fn; nyFunksjon(); }
  if ("x0" in ny) glidere.x0.sett(ny.x0);
  oppdater(true);
}

function tilpass() { ks.settVindu(vinduF()); ksd.settVindu(vinduD()); }

// Figurverktøyet styrer øverste graf. Nullstill gir standardvinduet for begge.
figurverktoy({ ks, svg: svgF, filnavn: "stigningstallfunksjonen", tilpass, tilbakestill: () => { spor.clear(); settVerdier(STANDARD); nyFunksjon(); oppdater(false); } });
// Den nederste grafen følger den øverste i x-retning, så x₀ står rett under hverandre
const folgX = () => ksd.settVindu({ xmin: ks.xmin, xmax: ks.xmax, ymin: ksd.ymin, ymax: ksd.ymax });
for (const id of ["zoom-inn", "zoom-ut", "standardvindu"]) $(id)?.addEventListener("click", folgX);
oppsettlenker(["x0"], ["fn"], settVerdier, velger);

nyFunksjon();
oppdater(false);

window.mattelabStigningstallfunksjon = { analyser, FUNKSJONER, hent: () => ({ ...r, spor: spor.size }) };
