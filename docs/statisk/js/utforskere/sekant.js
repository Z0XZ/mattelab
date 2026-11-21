// Utforsker: sekant som blir tangent
// Stigningstallet til sekanten gjennom (x₀, f(x₀)) og (x₀ + h, f(x₀ + h)) er
// gjennomsnittlig vekstfart. Når h → 0, nærmer det seg f′(x₀), den momentane vekstfarten.
import { tall, tallOmtrent, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { texT, texP } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Funksjonene eleven kan velge. d(x) er den deriverte; null der den ikke finnes.
 * dv/dh: ensidige deriverte der de er ulike (|x| i 0).
 */
export const FUNKSJONER = {
  x2: { navn: "f(x) = x²", tex: "x^2", f: (x) => x * x, d: (x) => 2 * x, dtex: "2x" },
  kubisk: { navn: "f(x) = x³ − 3x", tex: "x^3 - 3x", f: (x) => x ** 3 - 3 * x, d: (x) => 3 * x * x - 3, dtex: "3x^2 - 3" },
  rot: {
    navn: "f(x) = √x", tex: "\\sqrt{x}", f: (x) => (x >= 0 ? Math.sqrt(x) : NaN),
    d: (x) => (x > 0 ? 1 / (2 * Math.sqrt(x)) : null), dtex: "\\frac{1}{2\\sqrt{x}}", definert: (x) => x >= 0,
  },
  abs: {
    navn: "f(x) = |x|", tex: "|x|", f: (x) => Math.abs(x), d: (x) => (x === 0 ? null : Math.sign(x)), dtex: "\\begin{cases} 1 & x > 0 \\\\ -1 & x < 0 \\end{cases}",
  },
  eksp: { navn: "f(x) = eˣ", tex: "e^x", f: (x) => Math.exp(x), d: (x) => Math.exp(x), dtex: "e^x" },
};

/** Stigningstallet til sekanten, eller en grunn til at det ikke finnes. */
export function sekant(fn, x0, h) {
  const F = FUNKSJONER[fn];
  if (h === 0) return { feil: "h0" };
  const y0 = F.f(x0), y1 = F.f(x0 + h);
  if (!Number.isFinite(y0)) return { feil: "x0" };
  if (!Number.isFinite(y1)) return { feil: "x1" };
  return { y0, y1, dy: y1 - y0, a: (y1 - y0) / h };
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { fn: "x2", x0: 1, h: 1 };
let fn = lesValg("fn", Object.keys(FUNKSJONER), STANDARD.fn);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -4, xmax: 5, ymin: -3, ymax: 7, tittel: "Grafen med sekant og tangent" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = lagGlidere($("glidere"), [
  { navn: "x0", etikett: "<i>x<sub>0</sub></i>punktet P", beskrivelse: "x null, x-verdien til punktet P", min: -4, maks: 4, steg: 0.1, grense: [-100, 100] },
  { navn: "h", etikett: "<i>h</i>avstand til Q", beskrivelse: "h, avstanden fra P til Q langs x-aksen", min: -3, maks: 3, steg: 0.01, desimaler: 4, grense: [-100, 100] },
], STANDARD, () => { stoppAnimasjon(); oppdater(true); });

const velger = $("funksjon");
velger.value = fn;
velger.addEventListener("change", () => { fn = velger.value; oppdater(true); ks.tilbakestill(); });

let v, s;
const F = () => FUNKSJONER[fn];

// ------------------------------------------------------------------ tegning

/** Linje gjennom (x, y) med stigningstall a, tegnet over hele vinduet. */
function linjeGjennom(x, y, a, klasse) {
  ks.linje(ks.xmin, y + a * (ks.xmin - x), ks.xmax, y + a * (ks.xmax - x), klasse);
}

ks.vedTegning = () => {
  const { x0, h } = v;
  const f = F().f;
  ks.funksjon(f);
  const y0 = f(x0);
  if (!Number.isFinite(y0)) return;
  const d = F().d(x0);
  if (visValg.tangent.checked) {
    if (d !== null) linjeGjennom(x0, y0, d, "g-tangent");
    else if (fn === "rot" && x0 === 0) ks.loddrett(0, "g-tangent");
  }
  if (!s.feil) {
    const x1 = x0 + h;
    if (visValg.trekant.checked) {
      ks.mangekant([[x0, y0], [x1, y0], [x1, s.y1]], "g-fyll-3");
      ks.linje(x0, y0, x1, y0, "g-hjelp");
      ks.linje(x1, y0, x1, s.y1, "g-hjelp");
    }
    linjeGjennom(x0, y0, s.a, "g-sekant");
    ks.punkt(x1, s.y1, { klasse: "g-punkt-2", etikett: "Q", plass: h > 0 ? "ov" : "ov-v" });
  }
  ks.punkt(x0, y0, { etikett: "P", plass: v.h > 0 ? "ov-v" : "ov" });
};

function tilpass() {
  const f = F().f;
  const pkt = [];
  for (const x of [v.x0, v.x0 + v.h]) if (Number.isFinite(f(x))) pkt.push([x, f(x)]);
  tilpassVindu(ks, pkt, 3, 1.6);
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { x0, h } = v;
  const fx = F();
  $("forskrift").innerHTML = tex(`f(x) = ${fx.tex}`) + `<span class="yform">${tex(`f'(x) = ${fx.dtex}`)}</span>`;
  const d = fx.d(x0);
  const rader = [];
  let melding = "";
  if (s.feil === "x0") {
    rader.push(["Sekant", "Finnes ikke", "bred"]);
    melding = `<strong>Utenfor definisjonsmengden:</strong> ${tex("\\sqrt{x}")} er ikke definert for negative x. Velg ${tex("x_0 \\geq 0")}.`;
  } else {
    if (s.feil === "x1") {
      rader.push(["Sekant", "Finnes ikke (Q er utenfor definisjonsmengden)", "bred"]);
      melding = `<strong>Q mangler:</strong> ${tex("x_0 + h")} er negativ, og ${tex("\\sqrt{x}")} er ikke definert der. Gjør ${tex("h")} mindre negativ.`;
    } else if (s.feil === "h0") {
      rader.push(["Sekant", "Finnes ikke (h = 0)", "bred"]);
      melding = `<strong>h = 0:</strong> Da er P og Q samme punkt, og stigningstallet blir ${tex("\\frac{0}{0}")}, som ikke er definert. Det er derfor vi ser på hva som skjer når h <em>nærmer seg</em> 0: grenseverdien er den deriverte.`;
    } else {
      rader.push(["Stigningstall sekant", lik("a", s.a, 4)]);
      $("utregning").innerHTML = tex(`\\dfrac{f(${texT(rens(x0 + h, 6), 4)}) - f(${texT(x0, 4)})}{${texT(h, 4)}} = \\dfrac{${texT(rens(s.y1, 8), 4)} - ${texP(rens(s.y0, 8), 4)}}{${texT(h, 4)}} ${Math.abs(Number(s.a.toFixed(4)) - s.a) > 1e-9 ? "\\approx" : "="} ${texT(rens(s.a, 8), 4)}`);
    }
    if (s.feil) $("utregning").innerHTML = "";
    if (d !== null) {
      rader.push(["Stigningstall tangent", `f′(${tall(x0, 2)}) ${lik("", d, 4).trim()}`]);
      if (!s.feil) rader.push(["Forskjell", tallOmtrent(rens(s.a - d, 10), 4)]);
    } else {
      rader.push(["Stigningstall tangent", "Finnes ikke", "bred"]);
      if (fn === "abs") melding ||= `<strong>Knekk i x = 0:</strong> Fra høyre er stigningstallet 1, fra venstre −1. De ensidige grensene er ulike, så ${tex("f'(0)")} finnes ikke. Prøv både positiv og negativ h.`;
      if (fn === "rot") melding ||= `<strong>Loddrett tangent i x = 0:</strong> Sekantens stigningstall er ${tex("\\frac{\\sqrt{h}}{h} = \\frac{1}{\\sqrt{h}}")}, som vokser over alle grenser når h → 0. Tangenten er loddrett, og ${tex("f'(0)")} finnes ikke.`;
    }
    rader.push(["P", `(${tall(x0, 2)}, ${tallOmtrent(s.y0 ?? fx.f(x0), 3)})`]);
    if (!s.feil) rader.push(["Q", `(${tall(rens(x0 + h, 6), 4)}, ${tallOmtrent(s.y1, 3)})`]);
  }
  if (s.feil === "x0") $("utregning").innerHTML = "";
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  $("tabell").innerHTML = lagTabell();

  const sammendrag = s.feil ? "Sekanten finnes ikke." : `Sekanten har stigningstall ${tall(s.a, 4)}. ${d !== null ? `Tangenten har stigningstall ${tall(d, 4)}.` : "Tangenten har ikke noe stigningstall."}`;
  ks.beskrivelse = `${fx.navn}. x₀ = ${tall(x0)}, h = ${tall(h, 4)}. ${sammendrag}`;
  return sammendrag;
}

function lagTabell() {
  const hs = [1, 0.1, 0.01, 0.001, -0.001, -0.01, -0.1, -1];
  const rader = hs.map((h) => {
    const r = sekant(fn, v.x0, h);
    return `<tr><td>${tall(h, 3)}</td><td>${r.feil ? "–" : tall(rens(r.a, 9), 4)}</td></tr>`;
  });
  return `<table class="liten-tabell"><caption class="visuelt-skjult">Stigningstall til sekanten for ulike h</caption>
    <thead><tr><th scope="col">h</th><th scope="col">sekantens stigningstall</th></tr></thead><tbody>${rader.join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ animasjon: h → 0

let animasjon = 0;
function stoppAnimasjon() { cancelAnimationFrame(animasjon); animasjon = 0; $("mot-null").textContent = "La h gå mot 0"; }
$("mot-null").addEventListener("click", () => {
  if (animasjon) { stoppAnimasjon(); return; }
  const start = glidere.h.verdi || 1, slutt = Math.sign(start) * 0.001;
  const rolig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const varighet = rolig ? 1 : 2500;
  const t0 = performance.now();
  $("mot-null").textContent = "Stopp";
  const steg = (n) => {
    const t = Math.min(1, (n - t0) / varighet);
    // Geometrisk avtagende, så vi ser både store og små h
    glidere.h.sett(rens(start * Math.pow(slutt / start, t), 4));
    oppdater(t === 1);
    if (t < 1) animasjon = requestAnimationFrame(steg); else stoppAnimasjon();
  };
  animasjon = requestAnimationFrame(steg);
});

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  velger.value = fn;
  v = verdier(glidere);
  s = sekant(fn, v.x0, v.h);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ fn, ...v }, sammendrag);
}

function settVerdier(ny) {
  stoppAnimasjon();
  if (ny.fn) fn = ny.fn;
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  ks.tilbakestill();
}

figurverktoy({ ks, svg, filnavn: "sekant-tangent", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["x0", "h"], ["fn"], settVerdier, velger);

oppdater(false);

window.mattelabSekant = { sekant, FUNKSJONER, hent: () => s };
