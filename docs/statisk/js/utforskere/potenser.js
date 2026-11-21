// Utforsker: potensreglene som telling av faktorer.
//   produkt:  g^m · g^n      kvotient: g^m / g^n      potens: (g^m)^n
//   mønster:  g^k for k fra 4 ned til −3, der hvert steg ned er å dele på g
// En positiv eksponent gir faktorer i telleren, en negativ gir faktorer i nevneren.
// Like faktorer over og under brøkstreken strykes mot hverandre.
import { svgEl, tall } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";

// ------------------------------------------------------------------ matematikk (rene funksjoner)

/**
 * Faktorene i uttrykket. Gir antall faktorer i teller og nevner fra hver del, hvor mange som
 * strykes, og eksponenten i svaret.
 */
export function faktorer(modus, m, n) {
  let deler;
  if (modus === "produkt") deler = [m, n];
  else if (modus === "kvotient") deler = [m, -n];
  else if (modus === "potens") deler = Array(Math.max(0, n)).fill(m);
  else deler = [m];
  const teller = deler.reduce((s, e) => s + Math.max(0, e), 0);
  const nevner = deler.reduce((s, e) => s + Math.max(0, -e), 0);
  const strøket = Math.min(teller, nevner);
  return { deler, teller, nevner, strøket, eksponent: teller - nevner };
}

/** g^e som eksakt brøk [teller, nevner] (heltall). */
export function verdi(g, e) {
  return e >= 0 ? [g ** e, 1] : [1, g ** -e];
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "produkt", g: 2, m: 3, n: 4 };
let modus = lesValg("modus", ["produkt", "kvotient", "potens", "monster"], STANDARD.modus);
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Faktorene i potensen</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const heltall = { steg: 1, desimaler: 0 };
const glidere = lagGlidere($("glidere"), [
  { navn: "g", etikett: "<i>a</i>grunntallet", beskrivelse: "a, grunntallet", min: 2, maks: 10, ...heltall },
  { navn: "m", etikett: "<i>m</i>første eksponent", beskrivelse: "m, den første eksponenten", min: -5, maks: 6, ...heltall },
  { navn: "n", etikett: "<i>n</i>andre eksponent", beskrivelse: "n, den andre eksponenten", min: -5, maks: 6, ...heltall },
], STANDARD, () => oppdater(true));

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; oppdater(true); });

// ------------------------------------------------------------------ tegning

let B = 640, H = 380;
let forMange = false;

function tekst(x, y, s, klasse = "g-mal", anker = "middle") {
  const t = svgEl("text", { class: klasse, x, y, "text-anchor": anker }, lag);
  t.textContent = s;
  return t;
}

function tegn() {
  const bredde = svg.parentElement.clientWidth || 640;
  B = Math.round(Math.min(640, Math.max(320, bredde)));
  H = modus === "monster" ? 420 : B < 520 ? 320 : 360;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const { g, m, n } = verdier(glidere);
  forMange = false;

  if (modus === "monster") {
    const rader = [4, 3, 2, 1, 0, -1, -2, -3];
    const radH = (H - 30) / rader.length;
    const smal = B < 420;
    const x0 = smal ? 140 : 170; // høyre kant av potensene
    rader.forEach((k, i) => {
      const y = 15 + i * radH, midt = y + radH / 2;
      if (k === m) svgEl("rect", { class: "p-valgt", x: x0 - 66, y: y + 3, width: Math.min(380, B - x0 + 60), height: radH - 6, rx: 4 }, lag);
      // Potensen med hevet eksponent
      const t = svgEl("text", { class: "p-uttrykk", x: x0, y: midt + 7, "text-anchor": "end" }, lag);
      t.appendChild(document.createTextNode(String(g)));
      const sup = svgEl("tspan", { class: "p-eksponent", dy: -9 }, t);
      sup.textContent = String(k).replace("-", "−");
      const [tl, nv] = verdi(g, k);
      tekst(x0 + 26, midt + 6, nv === 1 ? `= ${tall(tl)}` : `= 1/${tall(nv)}`, "p-verdi", "start");
      if (nv !== 1 && !smal) tekst(x0 + 150, midt + 6, `= ${tall(1 / nv, 6)}`, "g-tall", "start");
      if (i < rader.length - 1) tekst(x0 - 72, y + radH + 4, `↓ : ${g}`, "p-pil", "end");
    });
    return;
  }

  if (modus === "potens" && n < 0) { tekst(B / 2, H / 2, "Figuren viser bare (aᵐ)ⁿ når n ≥ 0.", "g-tall"); return; }
  const f = faktorer(modus, m, n);
  const maks = Math.max(f.teller, f.nevner);
  if (maks > 24) { forMange = true; tekst(B / 2, H / 2, "For mange faktorer til å tegne. Se utregningen.", "g-tall"); return; }
  if (maks === 0) {
    tekst(B / 2, H / 2 + 6, "Ingen faktorer. Verdien er 1.", "p-verdi");
    return;
  }
  const gap = 6;
  const s = Math.min(46, (B - 40 - gap * (maks - 1)) / maks);
  const rekke = maks * s + (maks - 1) * gap;
  const x0 = (B - rekke) / 2;
  const midt = H / 2;
  // Fargen viser hvilken del av uttrykket faktoren kommer fra. Teksten under sier det samme.
  const tellerKlasser = [], nevnerKlasser = [];
  f.deler.forEach((e, i) => {
    const k = `p-boks p-del${i % 2}`;
    for (let j = 0; j < Math.abs(e); j++) (e > 0 ? tellerKlasser : nevnerKlasser).push(k);
  });
  const rad = (klasser, y) => klasser.forEach((k, i) => {
    const x = x0 + i * (s + gap);
    svgEl("rect", { class: k, x, y, width: s, height: s, rx: 4 }, lag);
    tekst(x + s / 2, y + s / 2 + 5, String(g), "p-tall");
    if (i < f.strøket) svgEl("line", { class: "p-stryk", x1: x + 3, y1: y + s - 3, x2: x + s - 3, y2: y + 3 }, lag);
  });
  if (f.nevner) {
    rad(tellerKlasser, midt - s - 10);
    svgEl("line", { class: "p-strek", x1: x0 - 8, y1: midt, x2: x0 + rekke + 8, y2: midt }, lag);
    rad(nevnerKlasser, midt + 10);
    if (!f.teller) tekst(x0 + s / 2, midt - 20, "1", "p-tall");
  } else {
    rad(tellerKlasser, midt - s / 2);
  }
  const igjen = Math.abs(f.eksponent);
  tekst(B / 2, H - 22, `${f.teller} i telleren, ${f.nevner} i nevneren, ${f.strøket} par strøket. Igjen: ${igjen} ${f.eksponent < 0 ? "i nevneren" : f.eksponent > 0 ? "i telleren" : "(verdien er 1)"}.`, "g-tall");
}

// ------------------------------------------------------------------ tekst og verdier

const ePar = (e) => (e < 0 ? `(${e})` : String(e));

function oppdaterTekst() {
  const { g, m, n } = verdier(glidere);
  $("glider-n").closest(".glider").hidden = modus === "monster";
  let regel, utregning, e;
  if (modus === "produkt") {
    regel = "a^m \\cdot a^n = a^{m + n}";
    e = m + n;
    utregning = `${g}^{${m}} \\cdot ${g}^{${n}} = ${g}^{${m} + ${ePar(n)}} = ${g}^{${e}}`;
  } else if (modus === "kvotient") {
    regel = "\\dfrac{a^m}{a^n} = a^{m - n}";
    e = m - n;
    utregning = `\\dfrac{${g}^{${m}}}{${g}^{${n}}} = ${g}^{${m} - ${ePar(n)}} = ${g}^{${e}}`;
  } else if (modus === "potens") {
    regel = "(a^m)^n = a^{m \\cdot n}";
    e = m * n;
    utregning = `(${g}^{${m}})^{${n}} = ${g}^{${m} \\cdot ${ePar(n)}} = ${g}^{${e}}`;
  } else {
    regel = "a^0 = 1 \\qquad a^{-n} = \\dfrac{1}{a^n}";
    e = m;
    utregning = `${g}^{${m}}`;
  }
  const [t, nv] = verdi(g, e);
  utregning += e < 0 ? ` = \\dfrac{1}{${g}^{${-e}}} = \\dfrac{1}{${nv}}` : ` = ${t}`;
  $("formel").innerHTML = tex(regel);
  $("utregning").innerHTML = utregning ? tex(utregning) : "";
  const f = faktorer(modus, m, n);
  const verdiTekst = nv === 1 ? tall(t) : `1/${tall(nv)} ${1 / nv === Number((1 / nv).toFixed(6)) ? "=" : "≈"} ${tall(1 / nv, 6)}`;
  const rader = modus === "monster"
    ? [["Eksponent", tall(e)], ["Verdi", verdiTekst, "bred"]]
    : [["Faktorer i telleren", String(f.teller)], ["Faktorer i nevneren", String(f.nevner)], ["Par som strykes", String(f.strøket)],
      ["Eksponent i svaret", tall(e)], ["Verdi", verdiTekst, "bred"]];
  visVerdier($("verdier"), rader);
  let melding = "";
  if (modus === "potens" && n < 0) melding = "<strong>n &lt; 0:</strong> Figuren viser bare (aᵐ)ⁿ for n ≥ 0. Regelen gjelder likevel for alle hele tall.";
  else if (e === 0 && modus !== "monster") melding = `<strong>Eksponent 0:</strong> Alle faktorene strykes mot hverandre, og det som står igjen, er ${tex("1")}. Derfor er ${tex(`${g}^0 = 1`)}.`;
  else if (e < 0 && modus !== "monster") melding = `<strong>Negativ eksponent:</strong> Det blir flere faktorer i nevneren enn i telleren. ${tex(`${g}^{${e}} = \\frac{1}{${g}^{${-e}}}`)} er et positivt tall mindre enn ${tex("1")}.`;
  if (forMange) melding = (melding ? melding + " " : "") + "<strong>Mange faktorer:</strong> Figuren tegnes bare med høyst 24 faktorer over eller under brøkstreken.";
  visMelding($("melding"), melding);
  const sammendrag = `${{ produkt: "Produkt", kvotient: "Kvotient", potens: "Potens av potens", monster: "Mønster" }[modus]}: ${g} opphøyd i ${tall(e)} er ${verdiTekst}.`;
  svg.querySelector("desc").textContent = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  modusVelger.value = modus;
  tegn();
  const sammendrag = oppdaterTekst();
  if (fraBruker) delTilstand({ modus, ...verdier(glidere) }, sammendrag);
}

function settVerdier(v) {
  if (v.modus) modus = v.modus;
  for (const k of ["g", "m", "n"]) if (k in v) glidere[k].sett(v[k]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3) { sistBredde = w; tegn(); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "potenser", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["g", "m", "n"], ["modus"], settVerdier, modusVelger);
oppdater(false);

window.mattelabPotenser = { faktorer, verdi };
