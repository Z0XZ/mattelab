// Utforsker: funksjonen og den deriverte
//   f(x)  = ax³ + bx² + cx + d
//   f′(x) = 3ax² + 2bx + c
//   f″(x) = 6ax + 2b
// To koordinatsystemer over hverandre med samme x-akse: f øverst og f′ under.
import { tall, tallOmtrent, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, tilpassVindu,
} from "../utforsker.js";
import { analyser as andregrad } from "./andregrad-matte.js";
import { texPolynom, texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Finn stasjonære punkter, ekstremalpunkter, vendepunkt og fortegnet til f′.
 * Ren funksjon, lett å teste.
 */
export function analyser(a, b, c, d) {
  const f = (x) => ((a * x + b) * x + c) * x + d;
  const df = (x) => (3 * a * x + 2 * b) * x + c;
  const r = { a, b, c, d, f, df, punkter: [] };
  const q = andregrad(3 * a, 2 * b, c); // f′ er et andregradspolynom (eller lavere)
  r.dfType = q.type;
  r.D = q.D;
  if (q.type === "null") { r.konstant = true; return r; }
  const kritiske = q.nullpunkter; // der f′(x) = 0
  // Fortegn til f′ på hver side avgjør typen punkt.
  for (const x of kritiske) {
    const eps = 1e-6 * (1 + Math.abs(x));
    const v = Math.sign(rens(df(x - eps), 14)), h = Math.sign(rens(df(x + eps), 14));
    const type = v > 0 && h < 0 ? "toppunkt" : v < 0 && h > 0 ? "bunnpunkt" : "terrassepunkt";
    r.punkter.push({ x, y: rens(f(x)), type });
  }
  if (a !== 0) { r.vx = rens(-b / (3 * a)); r.vy = rens(f(r.vx)); r.vStigning = rens(df(r.vx)); }
  // Intervaller der f′ har fast fortegn
  const grenser = [-Infinity, ...kritiske, Infinity];
  r.intervaller = [];
  for (let i = 0; i < grenser.length - 1; i++) {
    const [p, q2] = [grenser[i], grenser[i + 1]];
    const midt = !Number.isFinite(p) ? q2 - 1 : !Number.isFinite(q2) ? p + 1 : (p + q2) / 2;
    r.intervaller.push({ fra: p, til: q2, fortegn: Math.sign(rens(df(Number.isFinite(midt) ? midt : 0), 12)) });
  }
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: 0, c: -3, d: 0, x0: 2 };
const svgF = $("graf"), svgD = $("graf-derivert");
const ks = new Koordinatsystem(svgF, { xmin: -4, xmax: 4, ymin: -5, ymax: 5, bredde: 640, hoyde: 360, likeEnheter: false, tittel: "Grafen til f" });
const ksd = new Koordinatsystem(svgD, { xmin: -4, xmax: 4, ymin: -5, ymax: 10, bredde: 640, hoyde: 300, likeEnheter: false, ynavn: "y", tittel: "Grafen til den deriverte f′" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => { ks.tegn(); ksd.tegn(); });
}

const glidere = {
  ...lagGlidere($("glidere"), [
    { navn: "a", etikett: "<i>a</i>tallet foran x³", beskrivelse: "a, tallet foran x i tredje", min: -3, maks: 3, grense: [-100, 100] },
    { navn: "b", etikett: "<i>b</i>tallet foran x²", beskrivelse: "b, tallet foran x i andre", min: -5, maks: 5, grense: [-1000, 1000] },
    { navn: "c", etikett: "<i>c</i>tallet foran x", beskrivelse: "c, tallet foran x", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "d", etikett: "<i>d</i>konstantleddet", beskrivelse: "d, konstantleddet", min: -10, maks: 10, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glider-x0"), [
    { navn: "x0", etikett: "<i>x<sub>0</sub></i>tangentpunkt", beskrivelse: "x null, der tangenten tegnes", min: -6, maks: 6, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
};

let v, r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  ks.funksjon(r.f);
  // Tangent i x₀
  if (visValg.tangent.checked) {
    const y0 = r.f(v.x0), k = r.df(v.x0);
    ks.linje(ks.xmin, y0 + k * (ks.xmin - v.x0), ks.xmax, y0 + k * (ks.xmax - v.x0), "g-tangent");
    ks.loddrett(v.x0, "g-hjelp");
    ks.punkt(v.x0, y0, { klasse: "g-punkt-2", r: 5 });
  }
  if (visValg.punkter.checked) {
    for (const p of r.punkter) {
      const navn = ks.B < 520 ? "" : { toppunkt: "Topp ", bunnpunkt: "Bunn ", terrassepunkt: "Terrasse " }[p.type];
      ks.punkt(p.x, p.y, { etikett: `${navn}(${tall(p.x, 2)}, ${tall(p.y, 2)})`, plass: p.type === "bunnpunkt" ? "under" : "ov" });
    }
  }
  if (visValg.vendepunkt.checked && r.vx !== undefined && !r.punkter.some((p) => p.type === "terrassepunkt")) {
    ks.punkt(r.vx, r.vy, { klasse: "g-punkt-hul", r: 5, etikett: ks.B < 520 ? "" : "Vendepunkt", plass: "under" });
  }
};

ksd.vedTegning = () => {
  if (visValg.fortegn.checked) {
    for (const iv of r.intervaller || []) {
      if (iv.fortegn === 0) continue;
      const fra = Math.max(ksd.xmin, iv.fra), til = Math.min(ksd.xmax, iv.til);
      if (fra < til) ksd.linje(fra, 0, til, 0, iv.fortegn > 0 ? "g-intervall-pos" : "g-intervall-neg", ksd.lagBak);
    }
  }
  ksd.funksjon(r.df, "g-graf-2");
  if (visValg.tangent.checked) {
    ksd.loddrett(v.x0, "g-hjelp");
    ksd.punkt(v.x0, r.df(v.x0), { klasse: "g-punkt-2", r: 5, etikett: `f′(${tall(v.x0, 2)}) = ${tall(r.df(v.x0), 2)}`, plass: v.x0 > (ksd.xmin + ksd.xmax) / 2 ? "ov-v" : "ov" });
  }
  for (const p of r.punkter) ksd.punkt(p.x, 0, { klasse: "g-punkt", r: 4 });
};

function tegnBegge() { ks.tegn(); ksd.tegn(); }

/** Velg y-vinduer som viser de viktige punktene, med felles x-vindu. */
function tilpass() {
  const xs = [v.x0, 0, ...r.punkter.map((p) => p.x)];
  if (r.vx !== undefined) xs.push(r.vx);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const hx = Math.max(3, (x1 - x0) / 2 * 1.5), cx = (x0 + x1) / 2;
  const vindu = { xmin: cx - hx, xmax: cx + hx };
  const yer = (g) => { const ut = []; for (let i = 0; i <= 60; i++) ut.push(g(vindu.xmin + (i / 60) * 2 * hx)); return ut; };
  const pktF = [[cx, r.f(cx)], ...r.punkter.map((p) => [p.x, p.y]), [v.x0, r.f(v.x0)]];
  // Ta med midtre del av grafen, men ikke de bratte endene
  const fy = [...pktF.map((p) => p[1]), ...yer(r.f).slice(15, 46)];
  const dy = [0, ...yer(r.df).slice(10, 51)];
  const span = (ys) => { const lo = Math.min(...ys), hi = Math.max(...ys), m = Math.max(1, (hi - lo) * 0.15); return [lo - m, hi + m]; };
  const [f0, f1] = span(fy), [d0, d1] = span(dy);
  ks.settVindu({ ...vindu, ymin: f0, ymax: f1 });
  ksd.settVindu({ ...vindu, ymin: d0, ymax: d1 });
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, b, c, d } = v;
  $("forskrift").innerHTML = `<p>${tex(`f(x) = ${texPolynom([[a, "x^3"], [b, "x^2"], [c, "x"], [d, ""]])}`)}</p>`
    + `<p>${tex(`f'(x) = ${texPolynom([[rens(3 * a), "x^2"], [rens(2 * b), "x"], [c, ""]])}`)}</p>`
    + `<p>${tex(`f''(x) = ${texPolynom([[rens(6 * a), "x"], [rens(2 * b), ""]])}`)}</p>`;
  const rader = [];
  rader.push([`f′(${tall(v.x0, 2)})`, `${tallOmtrent(r.df(v.x0))} (tangentens stigningstall)`, "bred"]);
  const navn = { toppunkt: "Toppunkt", bunnpunkt: "Bunnpunkt", terrassepunkt: "Terrassepunkt" };
  if (r.konstant) rader.push(["Stasjonære punkter", "Alle x (f er konstant)", "bred"]);
  else if (!r.punkter.length) rader.push(["Stasjonære punkter", "Ingen (f′(x) ≠ 0 for alle x)", "bred"]);
  for (const p of r.punkter) rader.push([navn[p.type], `(${tallOmtrent(p.x)}, ${tallOmtrent(p.y)})`]);
  if (r.vx !== undefined) rader.push(["Vendepunkt", `(${tallOmtrent(r.vx)}, ${tallOmtrent(r.vy)})`]);
  visVerdier($("verdier"), rader);
  $("fortegn").innerHTML = fortegnsskjema();

  let melding = "";
  const terrasse = r.punkter.find((p) => p.type === "terrassepunkt");
  if (r.konstant) melding = `<strong>Konstant funksjon:</strong> Da er ${tex("f'(x) = 0")} overalt. Grafen er vannrett, og alle punkter er stasjonære.`;
  else if (terrasse) melding = `<strong>Terrassepunkt:</strong> ${tex("f'")} er null i ${tex(`x = ${texT(terrasse.x)}`)}, men skifter ikke fortegn. Grafen flater ut og fortsetter i samme retning. Det er ikke et toppunkt eller bunnpunkt.`;
  else if (a !== 0 && !r.punkter.length) melding = `<strong>Ingen ekstremalpunkter:</strong> Den deriverte er aldri null (diskriminanten til ${tex("f'")} er negativ). Funksjonen ${a > 0 ? "vokser" : "avtar"} hele tiden.`;
  else if (a === 0 && b !== 0) melding = `<strong>a = 0:</strong> Da er f en andregradsfunksjon, og ${tex("f'")} er en rett linje. Grafen har ett ekstremalpunkt og ikke noe vendepunkt.`;
  else if (a === 0 && b === 0) melding = `<strong>a = b = 0:</strong> Da er f lineær, og ${tex(`f'(x) = ${texT(c)}`)} er konstant. Ingen ekstremalpunkter.`;
  visMelding($("melding"), melding);

  const ord = [`f(x) = ${tall(a)}x³ + ${tall(b)}x² + ${tall(c)}x + ${tall(d)}.`];
  for (const p of r.punkter) ord.push(`${navn[p.type]} (${tall(p.x)}, ${tall(p.y)}).`);
  if (!r.punkter.length) ord.push("Ingen stasjonære punkter.");
  const sammendrag = ord.join(" ");
  ks.beskrivelse = sammendrag;
  ksd.beskrivelse = `Grafen til f′(x). f′(${tall(v.x0)}) = ${tall(r.df(v.x0))}.`;
  return sammendrag;
}

/** Fortegnsskjema: intervaller og stasjonære punkter i én tabell. */
function fortegnsskjema() {
  if (r.konstant) return "";
  const kol = [];
  r.intervaller.forEach((iv, i) => {
    const tekst = !Number.isFinite(iv.fra) && !Number.isFinite(iv.til) ? "alle x"
      : !Number.isFinite(iv.fra) ? `x < ${tall(iv.til, 2)}` : !Number.isFinite(iv.til) ? `x > ${tall(iv.fra, 2)}` : `${tall(iv.fra, 2)} < x < ${tall(iv.til, 2)}`;
    kol.push({ x: tekst, df: iv.fortegn > 0 ? "+" : iv.fortegn < 0 ? "−" : "0", f: iv.fortegn > 0 ? "vokser ↗" : iv.fortegn < 0 ? "avtar ↘" : "konstant" });
    const p = r.punkter[i];
    if (p && i < r.intervaller.length - 1) kol.push({ x: `x = ${tall(p.x, 2)}`, df: "0", f: { toppunkt: "topp", bunnpunkt: "bunn", terrassepunkt: "terrasse" }[p.type], punkt: true });
  });
  const rad = (navn, nokkel) => `<tr><th scope="row">${navn}</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${k[nokkel]}</td>`).join("")}</tr>`;
  return `<table class="liten-tabell fortegnsskjema"><caption class="visuelt-skjult">Fortegnsskjema for f′ og hva f gjør</caption>
    ${rad("x", "x")}${rad("f′(x)", "df")}${rad("f(x)", "f")}</table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  v = verdier(glidere);
  r = analyser(v.a, v.b, v.c, v.d);
  const sammendrag = oppdaterTekst();
  tegnBegge();
  if (fraBruker) delTilstand(v, sammendrag);
}

function settVerdier(ny) {
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  if (ny.tilpass) tilpass(); else { ks.tilbakestill(); ksd.tilbakestill(); }
}

// Figurverktøyet styrer øverste graf; den nederste følger med i x-retning.
figurverktoy({ ks, svg: svgF, filnavn: "funksjon-og-derivert", tilpass, tilbakestill: () => settVerdier(STANDARD) });
const folgX = () => ksd.settVindu({ xmin: ks.xmin, xmax: ks.xmax, ymin: ksd.ymin, ymax: ksd.ymax });
$("zoom-inn").addEventListener("click", () => { const cy = (ksd.ymin + ksd.ymax) / 2, hy = (ksd.ymax - ksd.ymin) / 3; ksd.settVindu({ xmin: ks.xmin, xmax: ks.xmax, ymin: cy - hy, ymax: cy + hy }); });
$("zoom-ut").addEventListener("click", () => { const cy = (ksd.ymin + ksd.ymax) / 2, hy = (ksd.ymax - ksd.ymin) * 0.75; ksd.settVindu({ xmin: ks.xmin, xmax: ks.xmax, ymin: cy - hy, ymax: cy + hy }); });
$("standardvindu").addEventListener("click", () => { ksd.tilbakestill(); folgX(); });
oppsettlenker(["a", "b", "c", "d", "x0", "tilpass"], [], settVerdier, glidere.a.glider);

oppdater(false);
if (new URLSearchParams(location.search).has("tilpass")) tilpass();

window.mattelabDerivert = { analyser, hent: () => r };
