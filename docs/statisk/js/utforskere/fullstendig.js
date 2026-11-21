// Utforsker: fullstendige kvadraters metode.
//   x² + bx + c = (x + p)² + q, der p = b/2 og q = c − p²
// Figuren viser x² + bx som et kvadrat med to striper. Hjørnet som mangler, er p².
import { svgEl, tall, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand,
} from "../utforsker.js";
import { texPolynom } from "../matte.js";
import { texBrok } from "../ovelse.js";

// ------------------------------------------------------------------ matematikk (ren funksjon)

export function fullfor(b, c) {
  const p = rens(b / 2), p2 = rens(p * p), q = rens(c - p * p);
  const r = { b, c, p, p2, q, topp: [-p, q] };
  r.losninger = q > 0 ? [] : q === 0 ? [-p] : [rens(-p - Math.sqrt(-q)), rens(-p + Math.sqrt(-q))];
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { b: 6, c: 5 };
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Arealmodell for å fullføre kvadratet</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const glidere = lagGlidere($("glidere"), [
  { navn: "b", etikett: "<i>b</i>tallet foran x", beskrivelse: "b, tallet foran x", min: -10, maks: 10, steg: 1, desimaler: 0, grense: [-10, 10] },
  { navn: "c", etikett: "<i>c</i>konstantleddet", beskrivelse: "c, konstantleddet", min: -20, maks: 20, steg: 1, desimaler: 0, grense: [-1000, 1000] },
], STANDARD, () => oppdater(true));

const fyll = $("fyll");
fyll.addEventListener("change", () => oppdater(true));
const p0 = new URLSearchParams(location.search).get("hjorne");
if (p0 === "0") fyll.checked = false;

// ------------------------------------------------------------------ tegning

const X = 6; // lengden x i figuren (x tegnes alltid like lang; den kan være hva som helst)

function tegn(r) {
  const bredde = svg.parentElement.clientWidth || 640;
  const B = Math.round(Math.min(640, Math.max(320, bredde)));
  const H = B < 520 ? Math.round(B * 1.02) : 440;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const rekt = (x, y, w, h, k, etikett) => {
    if (w <= 0.5 || h <= 0.5) return;
    svgEl("rect", { class: k, x, y, width: w, height: h }, lag);
    if (etikett && w > 34 && h > 20) tekst(x + w / 2, y + h / 2 + 5, etikett);
  };
  const tekst = (x, y, s, anker = "middle", klasse = "g-mal") => {
    const t = svgEl("text", { class: klasse, x, y, "text-anchor": anker }, lag);
    t.textContent = s;
  };
  const h = Math.abs(r.p);
  const hT = tall(h);
  const marg = 60;
  if (r.b >= 0) {
    const S = X + h;
    const s = Math.min((B - marg - 30) / S, (H - marg - 40) / S);
    const ox = marg, oy = marg - 10;
    rekt(ox, oy, X * s, X * s, "k-a2", "x²");
    rekt(ox + X * s, oy, h * s, X * s, "k-ab", h * s > 40 ? `${hT}x` : "");
    rekt(ox, oy + X * s, X * s, h * s, "k-ab", `${hT}x`);
    if (h > 0) {
      if (fyll.checked) rekt(ox + X * s, oy + X * s, h * s, h * s, "k-b2", `${tall(r.p2)}`);
      else svgEl("rect", { class: "k-borte", x: ox + X * s, y: oy + X * s, width: h * s, height: h * s }, lag);
      svgEl("rect", { class: fyll.checked ? "k-omriss" : "k-borte", x: ox, y: oy, width: S * s, height: S * s }, lag);
    }
    tekst(ox + (X * s) / 2, oy - 10, "x");
    if (h) tekst(ox + X * s + (h * s) / 2, oy - 10, hT);
    tekst(ox - 10, oy + (X * s) / 2 + 4, "x", "end");
    if (h) tekst(ox - 10, oy + X * s + (h * s) / 2 + 4, hT, "end");
    tekst(ox, oy + S * s + 26, fyll.checked ? `Kvadrat med side x + ${hT}: (x + ${hT})² = x² + ${tall(r.b)}x + ${tall(r.p2)}` : `Hjørnet som mangler: ${hT} · ${hT} = ${tall(r.p2)}`, "start", "g-tall");
  } else {
    const s = Math.min((B - marg - 30) / X, (H - marg - 40) / X);
    const ox = marg, oy = marg - 10, R = (X - h) * s, K = h * s;
    rekt(ox, oy, R, R, "k-resultat", "(x − " + hT + ")²");
    rekt(ox + R, oy, K, R, "k-ab k-stripe", "");
    rekt(ox, oy + R, R, K, "k-ab k-stripe", "");
    rekt(ox + R, oy + R, K, K, fyll.checked ? "k-b2 k-dobbel" : "k-ab k-stripe", fyll.checked ? `${tall(r.p2)}` : "");
    svgEl("rect", { class: "k-omriss", x: ox, y: oy, width: X * s, height: X * s }, lag);
    tekst(ox + R / 2, oy - 10, `x − ${hT}`);
    tekst(ox + R + K / 2, oy - 10, hT);
    tekst(ox - 10, oy + (X * s) / 2 + 4, "x", "end");
    tekst(ox, oy + X * s + 26, fyll.checked
      ? `To striper på ${hT}x tar bort hjørnet ${tall(r.p2)} to ganger. Legg det til igjen.`
      : `x² minus to striper på ${hT}x`, "start", "g-tall");
  }
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst(r) {
  const { b, c } = r;
  const uttrykk = texPolynom([[1, "x^2"], [b, "x"], [c, ""]]);
  const P = texBrok(Math.abs(r.p)), Q = texBrok(Math.abs(r.q));
  const kvadrat = r.p === 0 ? "x^2" : `\\left(x ${r.p < 0 ? "-" : "+"} ${P}\\right)^2`;
  const svar = kvadrat + (r.q === 0 ? "" : ` ${r.q < 0 ? "-" : "+"} ${Q}`);
  $("formel").innerHTML = tex("x^2 + bx + c = \\left(x + \\tfrac{b}{2}\\right)^2 - \\left(\\tfrac{b}{2}\\right)^2 + c");
  const steg = r.p === 0
    ? [`${uttrykk} = ${svar}`]
    : [`${uttrykk}`, `= ${kvadrat} - ${texBrok(r.p2)}${c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`}`, `= ${svar}`];
  $("utregning").innerHTML = steg.map((l) => `<p>${tex(l)}</p>`).join("");
  const los = r.losninger;
  const tallLos = (x) => (Number.isInteger(x * 4) ? texBrok(x).replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2").replace("-", "−") : tall(x, 2));
  const omtrent = los.some((x) => !Number.isInteger(x * 4));
  visVerdier($("verdier"), [
    ["Halvparten av b", tall(r.p, 2)],
    ["Kvadratet av halvparten", tall(r.p2, 4)],
    ["Fullført", svar.replace(/\\left|\\right/g, "").replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2").replace(/\^2/g, "²").replace(/-/g, "−"), "bred"],
    ["Bunnpunkt", `(${tall(-r.p, 2)}, ${tall(r.q, 4)})`],
    ["Løsninger av likningen = 0", los.length === 0 ? "Ingen" : los.map((x) => `x ${omtrent ? "≈" : "="} ${tallLos(x)}`).join(" og "), "bred"],
  ]);
  let melding = "";
  if (b === 0) melding = `<strong>b = 0:</strong> Det er ingen x-ledd å gjøre om. Uttrykket er allerede på formen ${tex("(x + 0)^2 + c")}.`;
  else if (r.q === 0) melding = `<strong>q = 0:</strong> Uttrykket er et fullstendig kvadrat. Det er en kvadratsetning: ${tex(`${uttrykk} = ${kvadrat}`)}.`;
  else if (r.q > 0) melding = `<strong>Ingen løsning:</strong> ${tex(`${kvadrat} = ${texBrok(-r.q)}`)} er umulig, fordi et kvadrat aldri er negativt. Grafen ligger over x-aksen.`;
  if (b % 2 !== 0) melding = (melding ? melding + " " : "") + `<strong>b er et oddetall:</strong> Halvparten blir en brøk, ${tex(texBrok(r.p))}. Metoden er den samme.`;
  visMelding($("melding"), melding);
  const sammendrag = `x² + ${b}x + ${c} = (x + ${tall(r.p)})² + ${tall(r.q, 4)}.`.replace(/\+ −/g, "− ").replace(/\+ -/g, "− ");
  svg.querySelector("desc").textContent = sammendrag + (fyll.checked ? " Hjørnet er fylt inn." : " Hjørnet mangler.");
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

let r;
function oppdater(fraBruker) {
  const { b, c } = verdier(glidere);
  r = fullfor(b, c);
  tegn(r);
  const sammendrag = oppdaterTekst(r);
  if (fraBruker) delTilstand({ ...verdier(glidere), hjorne: fyll.checked ? "1" : "0" }, sammendrag);
}

function settVerdier(v) {
  for (const n of ["b", "c"]) if (n in v) glidere[n].sett(v[n]);
  if ("hjorne" in v) fyll.checked = v.hjorne !== 0;
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3 && r) { sistBredde = w; tegn(r); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "fullstendig-kvadrat", tilbakestill: () => { fyll.checked = true; settVerdier(STANDARD); } });
oppsettlenker(["b", "c", "hjorne"], [], settVerdier, $("glidere").querySelector("input"));
oppdater(false);

window.mattelabFullstendig = { fullfor };
