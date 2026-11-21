// Utforsker: kvadratsetningene og konjugatsetningen som arealmodeller
//   (a + b)² = a² + 2ab + b²
//   (a − b)² = a² − 2ab + b²
//   (a + b)(a − b) = a² − b²
import { tall, rens, svgEl } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";
import { texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/** Alle arealene vi viser. Ren funksjon, lett å teste. */
export function arealer(modus, a, b) {
  const a2 = rens(a * a), b2 = rens(b * b), ab = rens(a * b);
  if (modus === "sum") return { a2, ab, b2, venstre: rens((a + b) ** 2), hoyre: rens(a2 + 2 * ab + b2), feil: rens(a2 + b2) };
  if (modus === "diff") return { a2, ab, b2, venstre: rens((a - b) ** 2), hoyre: rens(a2 - 2 * ab + b2), feil: rens(a2 - b2) };
  return { a2, b2, venstre: rens((a + b) * (a - b)), hoyre: rens(a2 - b2) };
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "sum", a: 3, b: 2 };
let modus = lesValg("modus", ["sum", "diff", "konj"], STANDARD.modus);
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Arealmodell</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>den ene lengden", beskrivelse: "a, den ene lengden", min: 0, maks: 10, grense: [0, 1000] },
  { navn: "b", etikett: "<i>b</i>den andre lengden", beskrivelse: "b, den andre lengden", min: 0, maks: 10, grense: [0, 1000] },
], STANDARD, () => oppdater(true));

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; oppdater(true); });

// ------------------------------------------------------------------ tegning

let B = 640, H = 460;

function storrelse() {
  const bredde = svg.parentElement.clientWidth || 640;
  B = Math.round(Math.min(640, Math.max(320, bredde)));
  const smal = B < 520;
  H = smal ? Math.round(B * 1.02) : 460;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
}

/** Rektangel med areal-etikett i midten når det er plass. */
function rekt(x, y, w, h, klasse, etikett = "", etikett2 = "") {
  if (w <= 0.5 || h <= 0.5) return;
  svgEl("rect", { class: klasse, x, y, width: w, height: h }, lag);
  if (etikett && w > (etikett.length < 2 ? 14 : 34) && h > 18) {
    const t = svgEl("text", { class: "g-mal", x: x + w / 2, y: y + h / 2 + (etikett2 && h > 44 ? -3 : 5), "text-anchor": "middle" }, lag);
    t.textContent = etikett;
    if (etikett2 && h > 44 && w > 50) {
      const t2 = svgEl("text", { class: "g-tall", x: x + w / 2, y: y + h / 2 + 15, "text-anchor": "middle" }, lag);
      t2.textContent = etikett2;
    }
  }
}

/** Mål langs en kant: en strek med endestreker og tekst. retning: «over» eller «venstre» eller «under». */
function maal(x1, y1, x2, y2, tekst, retning) {
  if (Math.hypot(x2 - x1, y2 - y1) < 6) return;
  const d = retning === "venstre" ? [-14, 0] : retning === "hoyre" ? [14, 0] : retning === "under" ? [0, 14] : [0, -14];
  const [ax, ay, bx, by] = [x1 + d[0], y1 + d[1], x2 + d[0], y2 + d[1]];
  svgEl("line", { class: "g-akse", x1: ax, y1: ay, x2: bx, y2: by }, lag);
  const tvers = retning === "venstre" || retning === "hoyre" ? [5, 0] : [0, 5];
  for (const [px, py] of [[ax, ay], [bx, by]]) svgEl("line", { class: "g-akse", x1: px - tvers[0], y1: py - tvers[1], x2: px + tvers[0], y2: py + tvers[1] }, lag);
  const t = svgEl("text", { class: "g-hjorne", "text-anchor": "middle" }, lag);
  if (retning === "venstre") { t.setAttribute("x", ax - 10); t.setAttribute("y", (ay + by) / 2 + 5); t.setAttribute("text-anchor", "end"); }
  else if (retning === "hoyre") { t.setAttribute("x", ax + 10); t.setAttribute("y", (ay + by) / 2 + 5); t.setAttribute("text-anchor", "start"); }
  else { t.setAttribute("x", (ax + bx) / 2); t.setAttribute("y", retning === "under" ? ay + 20 : ay - 8); }
  t.textContent = tekst;
}

function tegn() {
  storrelse();
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const { a, b } = verdier(glidere);
  const venstreMarg = 56, toppMarg = 44, marg = 16;
  const tn = (x) => tall(x, 2);

  if (modus === "sum") {
    const S = a + b;
    if (S === 0) return;
    const s = Math.min((B - venstreMarg - marg) / S, (H - toppMarg - marg) / S);
    const ox = venstreMarg + (B - venstreMarg - marg - S * s) / 2, oy = toppMarg;
    rekt(ox, oy, a * s, a * s, "k-a2", "a²", tn(a * a));
    rekt(ox + a * s, oy, b * s, a * s, "k-ab", "ab", tn(a * b));
    rekt(ox, oy + a * s, a * s, b * s, "k-ab", "ab", tn(a * b));
    rekt(ox + a * s, oy + a * s, b * s, b * s, "k-b2", "b²", tn(b * b));
    maal(ox, oy, ox + a * s, oy, "a", "over");
    maal(ox + a * s, oy, ox + S * s, oy, "b", "over");
    maal(ox, oy, ox, oy + a * s, "a", "venstre");
    maal(ox, oy + a * s, ox, oy + S * s, "b", "venstre");
    svgEl("rect", { class: "k-omriss", x: ox, y: oy, width: S * s, height: S * s }, lag);
  } else if (modus === "diff") {
    // Tegn med den største lengden som side i det store kvadratet.
    const A = Math.max(a, b), Bm = Math.min(a, b), nA = a >= b ? "a" : "b", nB = a >= b ? "b" : "a";
    if (A === 0) return;
    const s = Math.min((B - venstreMarg - marg) / A, (H - toppMarg - marg - 30) / A);
    const ox = venstreMarg + (B - venstreMarg - marg - A * s) / 2, oy = toppMarg;
    const R = (A - Bm) * s, K = Bm * s;
    rekt(ox, oy, R, R, "k-resultat", `(${nA} − ${nB})²`, tn((A - Bm) ** 2));
    rekt(ox + R, oy, K, R, "k-ab k-stripe", `${nA}${nB}`);
    rekt(ox, oy + R, R, K, "k-ab k-stripe", `${nA}${nB}`);
    rekt(ox + R, oy + R, K, K, "k-b2 k-dobbel", `${nB}²`);
    svgEl("rect", { class: "k-omriss", x: ox, y: oy, width: A * s, height: A * s }, lag);
    maal(ox, oy, ox + R, oy, `${nA} − ${nB}`, "over");
    maal(ox + R, oy, ox + A * s, oy, nB, "over");
    maal(ox, oy, ox, oy + A * s, nA, "venstre");
    maal(ox, oy + A * s, ox + A * s, oy + A * s, nA, "under");
  } else {
    const A = Math.max(a, b), Bm = Math.min(a, b), nA = a >= b ? "a" : "b", nB = a >= b ? "b" : "a";
    if (A === 0) return;
    const smal = B < 520;
    // To figurer: kvadratet uten hjørnet, og rektangelet (a + b) · (a − b).
    const bredde1 = A, bredde2 = A + Bm, hoyde2 = A - Bm;
    let s, o1, o2;
    const hoyreMarg = 78; // plass til målet «a − b» til høyre for rektangelet
    if (smal) {
      s = Math.min((B - venstreMarg - hoyreMarg) / bredde2, 420 / (A + hoyde2));
      o1 = [venstreMarg, toppMarg];
      o2 = [venstreMarg, toppMarg + A * s + toppMarg + 30];
      H = Math.round(o2[1] + hoyde2 * s + 40);
    } else {
      s = Math.min((B - venstreMarg - 50 - hoyreMarg) / (bredde1 + bredde2), (460 - toppMarg - 40) / A);
      o1 = [venstreMarg, toppMarg];
      o2 = [venstreMarg + A * s + 50, toppMarg];
      H = Math.round(toppMarg + A * s + 40);
    }
    svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
    lag.querySelector(".g-bakgrunn").setAttribute("height", H);
    const R = (A - Bm) * s, K = Bm * s;
    // Figur 1: a² med b² tatt bort i hjørnet
    rekt(o1[0], o1[1], A * s, R, "k-a2", "1");
    rekt(o1[0], o1[1] + R, R, K, "k-ab", "2");
    svgEl("rect", { class: "k-borte", x: o1[0] + R, y: o1[1] + R, width: K, height: K }, lag);
    if (K > 30) { const t = svgEl("text", { class: "g-tall", x: o1[0] + R + K / 2, y: o1[1] + R + K / 2 + 4, "text-anchor": "middle" }, lag); t.textContent = `− ${nB}²`; }
    maal(o1[0], o1[1], o1[0] + A * s, o1[1], nA, "over");
    maal(o1[0], o1[1], o1[0], o1[1] + A * s, nA, "venstre");
    const t1 = svgEl("text", { class: "g-mal", x: o1[0] + A * s / 2, y: o1[1] + A * s + 24, "text-anchor": "middle" }, lag);
    t1.textContent = `${nA}² − ${nB}² = ${tn(A * A - Bm * Bm)}`;
    // Figur 2: samme biter lagt som et rektangel
    rekt(o2[0], o2[1], A * s, R, "k-a2", "1");
    rekt(o2[0] + A * s, o2[1], K, R, "k-ab", "2");
    maal(o2[0], o2[1], o2[0] + A * s, o2[1], nA, "over");
    maal(o2[0] + A * s, o2[1], o2[0] + (A + Bm) * s, o2[1], nB, "over");
    maal(o2[0] + (A + Bm) * s, o2[1], o2[0] + (A + Bm) * s, o2[1] + R, `${nA} − ${nB}`, "hoyre");
    const t2 = svgEl("text", { class: "g-mal", x: o2[0] + (A + Bm) * s / 2, y: o2[1] + R + 24, "text-anchor": "middle" }, lag);
    t2.textContent = `(${nA} + ${nB})(${nA} − ${nB}) = ${tn((A + Bm) * (A - Bm))}`;
  }
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, b } = verdier(glidere);
  const r = arealer(modus, a, b);
  const A = texT(a), Bt = texT(b);
  const rader = [];
  let formel, utregning, melding = "";
  if (modus === "sum") {
    formel = "(a + b)^2 = a^2 + 2ab + b^2";
    utregning = `(${A} + ${Bt})^2 = ${A}^2 + 2 \\cdot ${A} \\cdot ${Bt} + ${Bt}^2 = ${texT(r.a2)} + ${texT(2 * r.ab)} + ${texT(r.b2)} = ${texT(r.venstre)}`;
    rader.push(["a²", tall(r.a2)], ["2ab", tall(2 * r.ab)], ["b²", tall(r.b2)]);
    rader.push(["(a + b)²", tall(r.venstre)], ["Vanlig feil: a² + b²", `${tall(r.feil)} (mangler 2ab = ${tall(2 * r.ab)})`, "bred"]);
  } else if (modus === "diff") {
    formel = "(a - b)^2 = a^2 - 2ab + b^2";
    utregning = `(${A} - ${Bt})^2 = ${A}^2 - 2 \\cdot ${A} \\cdot ${Bt} + ${Bt}^2 = ${texT(r.a2)} - ${texT(2 * r.ab)} + ${texT(r.b2)} = ${texT(r.venstre)}`;
    rader.push(["a²", tall(r.a2)], ["2ab", tall(2 * r.ab)], ["b²", tall(r.b2)]);
    rader.push(["(a − b)²", tall(r.venstre)], ["Vanlig feil: a² − b²", tall(r.feil), "bred"]);
    if (b > a) melding = `<strong>b > a:</strong> Da er ${tex("a - b")} negativ. Kvadratet blir likevel det samme, fordi ${tex("(a - b)^2 = (b - a)^2")}. Figuren bytter derfor om på rollene til a og b.`;
    else if (a === b) melding = `<strong>a = b:</strong> Da er ${tex("a - b = 0")}, og det store kvadratet dekkes helt av de to stripene. Resultatet er ${tex("0")}.`;
  } else {
    formel = "(a + b)(a - b) = a^2 - b^2";
    utregning = `(${A} + ${Bt})(${A} - ${Bt}) = ${A}^2 - ${Bt}^2 = ${texT(r.a2)} - ${texT(r.b2)} = ${texT(r.venstre)}`;
    rader.push(["a²", tall(r.a2)], ["b²", tall(r.b2)]);
    rader.push(["a + b", tall(rens(a + b))], ["a − b", tall(rens(a - b))]);
    rader.push(["(a + b)(a − b)", tall(r.venstre), "bred"]);
    if (b > a) melding = `<strong>b > a:</strong> Da er ${tex("a - b")} negativ, og produktet blir negativt. Et areal kan ikke være negativt. Figuren viser derfor ${tex("b^2 - a^2")}, som er det samme tallet med motsatt fortegn.`;
    else if (a === b) melding = `<strong>a = b:</strong> Da er ${tex("a - b = 0")}. Hele kvadratet tas bort, og resultatet er ${tex("0")}.`;
  }
  if (a === 0 && b === 0) melding = "<strong>a = b = 0:</strong> Det er ingen figur å tegne. Alle arealene er 0.";
  $("formel").innerHTML = tex(formel);
  $("utregning").innerHTML = tex(utregning);
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  const navn = { sum: "Første kvadratsetning", diff: "Andre kvadratsetning", konj: "Konjugatsetningen" }[modus];
  const sammendrag = `${navn} med a = ${tall(a)} og b = ${tall(b)}. Resultat ${tall(r.venstre)}.`;
  svg.querySelector("desc").textContent = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  modusVelger.value = modus;
  const sammendrag = oppdaterTekst();
  tegn();
  if (fraBruker) delTilstand({ modus, ...verdier(glidere) }, sammendrag);
}

function settVerdier(v) {
  if (v.modus) modus = v.modus;
  for (const n of ["a", "b"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3) { sistBredde = w; tegn(); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "kvadratsetning", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b"], ["modus"], settVerdier, modusVelger);
oppdater(false);

window.mattelabKvadrat = { arealer };
