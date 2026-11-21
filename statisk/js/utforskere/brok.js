// Utforsker: brøk som areal og lengde.
//   pluss: a/b + c/d med felles nevner, vist som strimler
//   gange: a/b · c/d som et rektangel delt i begge retninger
//   dele:  a/b : c/d som «hvor mange ganger går c/d opp i a/b?»
import { tall, svgEl } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";

// ------------------------------------------------------------------ matematikk (rene funksjoner)

export const sfd = (a, b) => (b ? sfd(b, a % b) : Math.abs(a));
export const sfm = (a, b) => (a / sfd(a, b)) * b;

/** Forkort t/n. Nevneren blir alltid positiv. */
export function forkort(t, n) {
  if (n < 0) { t = -t; n = -n; }
  const g = sfd(t, n) || 1;
  return [t / g, n / g];
}

/** Regn ut. Svaret er en forkortet brøk [teller, nevner]; «urent» er brøken før forkorting. */
export function regn(modus, t1, n1, t2, n2) {
  if (modus === "pluss") {
    const L = sfm(n1, n2), u1 = t1 * (L / n1), u2 = t2 * (L / n2);
    return { L, u1, u2, urent: [u1 + u2, L], svar: forkort(u1 + u2, L) };
  }
  if (modus === "gange") return { urent: [t1 * t2, n1 * n2], svar: forkort(t1 * t2, n1 * n2) };
  if (t2 === 0) return { udefinert: true };
  const L = sfm(n1, n2);
  return { L, u1: t1 * (L / n1), u2: t2 * (L / n2), urent: [t1 * n2, n1 * t2], svar: forkort(t1 * n2, n1 * t2) };
}

/** Brøk i TeX. Hele tall skrives uten brøkstrek. */
export function texBrok([t, n]) {
  return n === 1 ? String(t) : `\\dfrac{${t}}{${n}}`;
}

/** Blandet tall i TeX, for eksempel 2\frac{2}{3}. Gir null når brøken ikke er større enn 1. */
export function texBlandet([t, n]) {
  if (n === 1 || Math.abs(t) < n) return null;
  const hel = Math.trunc(t / n), rest = Math.abs(t % n);
  return rest ? `${hel}\\tfrac{${rest}}{${n}}` : String(hel);
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "gange", t1: 2, n1: 3, t2: 3, n2: 4 };
let modus = lesValg("modus", ["pluss", "gange", "dele"], STANDARD.modus);
const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Brøkfigur</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const heltall = { min: 0, maks: 12, steg: 1, desimaler: 0 };
const glidere = lagGlidere($("glidere"), [
  { navn: "t1", etikett: "<i>a</i>teller i første brøk", beskrivelse: "a, telleren i den første brøken", ...heltall, grense: [0, 60] },
  { navn: "n1", etikett: "<i>b</i>nevner i første brøk", beskrivelse: "b, nevneren i den første brøken", ...heltall, min: 1, grense: [1, 60] },
  { navn: "t2", etikett: "<i>c</i>teller i andre brøk", beskrivelse: "c, telleren i den andre brøken", ...heltall, grense: [0, 60] },
  { navn: "n2", etikett: "<i>d</i>nevner i andre brøk", beskrivelse: "d, nevneren i den andre brøken", ...heltall, min: 1, grense: [1, 60] },
], STANDARD, () => oppdater(true));

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; oppdater(true); });

// ------------------------------------------------------------------ tegning

let B = 640, H = 420;
let forStor = false;

function storrelse(hoyde) {
  const bredde = svg.parentElement.clientWidth || 640;
  B = Math.round(Math.min(640, Math.max(320, bredde)));
  H = hoyde;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
}

const rekt = (x, y, w, h, klasse) => svgEl("rect", { class: klasse, x, y, width: w, height: h }, lag);
function tekst(x, y, s, klasse = "g-mal", anker = "middle") {
  const t = svgEl("text", { class: klasse, x, y, "text-anchor": anker }, lag);
  t.textContent = s;
  return t;
}

/** Strimmel: «enheter» hele, hver delt i n deler. De første `farget` delene får klassen. */
function strimmel(x, y, U, h, n, enheter, deler) {
  // deler: [[antall, klasse], …] fylles fra venstre
  let nr = 0;
  const totalt = enheter * n;
  const klasser = [];
  for (const [antall, k] of deler) for (let i = 0; i < antall; i++) klasser.push(k);
  for (let i = 0; i < totalt; i++) {
    rekt(x + (i * U) / n, y, U / n, h, klasser[i] || "b-tom");
    nr++;
  }
  for (let e = 0; e < enheter; e++) rekt(x + e * U, y, U, h, "b-enhet");
}

function tegn() {
  lag.innerHTML = "";
  const { t1, n1, t2, n2 } = verdier(glidere);
  const r = regn(modus, t1, n1, t2, n2);
  forStor = false;
  const marg = 70;
  if (modus === "gange") {
    const W = Math.max(1, Math.ceil(t1 / n1)), Hh = Math.max(1, Math.ceil(t2 / n2));
    storrelse(B < 520 ? 360 : 430);
    if (W > 2 || Hh > 2 || n1 * W > 40 || n2 * Hh > 40) { forStor = true; return; }
    const s = Math.min((B - marg - 20) / W, (H - 70) / Hh);
    const ox = marg, oy = 40;
    for (let k = 0; k < W * n1; k++) {
      for (let j = 0; j < Hh * n2; j++) {
        const iA = k < t1, iB = j < t2;
        rekt(ox + (k * s) / n1, oy + (j * s) / n2, s / n1, s / n2, iA && iB ? "b-ab" : iA ? "b-a" : iB ? "b-b" : "b-tom");
      }
    }
    for (let e = 0; e < W; e++) for (let f = 0; f < Hh; f++) rekt(ox + e * s, oy + f * s, s, s, "b-enhet");
    if (t1 > 0) {
      const x1 = ox + (t1 * s) / n1;
      svgEl("line", { class: "b-mal", x1: ox, y1: oy - 12, x2: x1, y2: oy - 12 }, lag);
      tekst((ox + x1) / 2, oy - 18, `${t1}/${n1}`);
    }
    if (t2 > 0) {
      const y1 = oy + (t2 * s) / n2;
      svgEl("line", { class: "b-mal", x1: ox - 12, y1: oy, x2: ox - 12, y2: y1 }, lag);
      tekst(ox - 18, (oy + y1) / 2 + 4, `${t2}/${n2}`, "g-mal", "end");
    }
    tekst(ox, oy + Hh * s + 24, `${t1 * t2} av ${n1 * n2} små ruter er mørke`, "g-tall", "start");
    return;
  }

  const enheterTrengs = (t, n) => Math.max(1, Math.ceil(t / n));
  if (modus === "pluss") {
    const sum = r.u1 + r.u2;
    const E = Math.max(enheterTrengs(t1, n1), enheterTrengs(t2, n2), enheterTrengs(sum, r.L));
    const smal = B < 520;
    storrelse(smal ? 380 : 400);
    if (E > 3 || r.L * E > 72) { forStor = true; return; }
    const U = (B - marg - 20) / E, h = smal ? 30 : 34, gap = smal ? 24 : 26;
    let y = 22;
    const rad = (navn, n, deler, enheter = E) => {
      tekst(marg - 10, y + h / 2 + 5, navn, "g-mal", "end");
      strimmel(marg, y, U, h, n, enheter, deler);
      y += h + gap;
    };
    rad(`${t1}/${n1}`, n1, [[t1, "b-a"]]);
    rad(`${t2}/${n2}`, n2, [[t2, "b-b"]]);
    tekst(marg, y - 4, `Del alle i ${r.L}-deler (felles nevner):`, "g-tall", "start");
    y += 8;
    rad(`${r.u1}/${r.L}`, r.L, [[r.u1, "b-a"]]);
    rad(`${r.u2}/${r.L}`, r.L, [[r.u2, "b-b"]]);
    rad(`${sum}/${r.L}`, r.L, [[r.u1, "b-a"], [r.u2, "b-b"]]);
    return;
  }

  // dele
  storrelse(B < 520 ? 300 : 280);
  if (r.udefinert) return;
  const q = (t1 / n1) / (t2 / n2);
  const E = Math.max(enheterTrengs(t1, n1), enheterTrengs(t2, n2));
  if (E > 3 || q > 30 || r.L * E > 72) { forStor = true; return; }
  const U = (B - marg - 20) / E, h = 34;
  let y = 30;
  tekst(marg - 10, y + h / 2 + 5, `${t1}/${n1}`, "g-mal", "end");
  strimmel(marg, y, U, h, r.L, E, [[r.u1, "b-a"]]);
  y += h + 34;
  tekst(marg - 10, y + h / 2 + 5, `${t2}/${n2}`, "g-mal", "end");
  // Legg c/d etter hverandre så langt a/b rekker
  const lengde = (t2 / n2) * U;
  const hele = Math.floor(q + 1e-9);
  for (let i = 0; i < Math.ceil(q - 1e-9); i++) {
    const x = marg + i * lengde;
    const del = Math.min(1, q - i);
    rekt(x, y, lengde * del, h, i < hele ? (i % 2 ? "b-b" : "b-b2") : "b-rest");
    if (lengde * del > 18) tekst(x + (lengde * del) / 2, y + h / 2 + 5, i < hele ? String(i + 1) : "rest");
  }
  rekt(marg, y, lengde * q, h, "b-enhet");
  for (let e = 0; e <= E; e++) svgEl("line", { class: "b-mal", x1: marg + e * U, y1: 18, x2: marg + e * U, y2: y + h + 8 }, lag);
  for (let e = 0; e <= E; e++) tekst(marg + e * U, y + h + 24, String(e), "g-tall");
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { t1, n1, t2, n2 } = verdier(glidere);
  const r = regn(modus, t1, n1, t2, n2);
  const A = texBrok([t1, n1]), C = texBrok([t2, n2]);
  const rader = [];
  let utregning = "", melding = "";
  if (modus === "pluss") {
    utregning = `${A} + ${C} = \\dfrac{${r.u1}}{${r.L}} + \\dfrac{${r.u2}}{${r.L}} = \\dfrac{${r.u1 + r.u2}}{${r.L}}`;
    rader.push(["Felles nevner", String(r.L)]);
  } else if (modus === "gange") {
    utregning = `${A} \\cdot ${C} = \\dfrac{${t1} \\cdot ${t2}}{${n1} \\cdot ${n2}} = \\dfrac{${t1 * t2}}{${n1 * n2}}`;
  } else if (!r.udefinert) {
    utregning = `${A} : ${C} = ${A} \\cdot \\dfrac{${n2}}{${t2}} = \\dfrac{${t1 * n2}}{${n1 * t2}}`;
    rader.push(["Felles nevner", String(r.L)]);
  }
  if (r.udefinert) {
    rader.push(["Svar", "Ikke definert"]);
    melding = `<strong>c = 0:</strong> Vi kan ikke dele på ${tex("0")}. Spørsmålet «hvor mange ganger går ${tex("0")} opp i ${tex(A)}?» har ikke noe svar.`;
  } else {
    const [st, sn] = r.svar;
    if (r.svar[0] !== r.urent[0] || r.svar[1] !== r.urent[1]) utregning += ` = ${texBrok(r.svar)}`;
    const bl = texBlandet(r.svar);
    if (bl && bl !== texBrok(r.svar)) utregning += ` = ${bl}`;
    rader.push(["Svar (forkortet)", sn === 1 ? String(st) : `${st}/${sn}`]);
    rader.push(["Blandet tall", bl && sn !== 1 ? `${Math.trunc(st / sn)} og ${Math.abs(st % sn)}/${sn}` : "–"]);
    rader.push(["Desimaltall", (Math.abs(st / sn - Number((st / sn).toFixed(4))) > 1e-12 ? "≈ " : "") + tall(st / sn, 4)]);
    if (modus === "gange") {
      const forste = t1 / n1;
      if (forste > 0 && t2 !== n2) rader.push(["Sammenlignet med a/b", `${st / sn < forste ? "mindre" : "større"} (fordi c/d ${t2 < n2 ? "< 1" : "> 1"})`, "bred"]);
    }
    if (modus === "dele" && t1 > 0) rader.push(["Sammenlignet med a/b", `${st / sn > t1 / n1 ? "større" : st / sn < t1 / n1 ? "mindre" : "lik"} (fordi c/d ${t2 < n2 ? "< 1" : t2 > n2 ? "> 1" : "= 1"})`, "bred"]);
  }
  if (forStor) melding = (melding ? melding + " " : "") + "<strong>Figuren blir for stor.</strong> Den vises bare når brøkene er høyst 2 (gange) eller 3 (pluss og dele). Utregningen gjelder likevel.";
  $("formel").innerHTML = tex({ pluss: "\\dfrac{a}{b} + \\dfrac{c}{d}", gange: "\\dfrac{a}{b} \\cdot \\dfrac{c}{d} = \\dfrac{a \\cdot c}{b \\cdot d}", dele: "\\dfrac{a}{b} : \\dfrac{c}{d} = \\dfrac{a}{b} \\cdot \\dfrac{d}{c}" }[modus]);
  $("utregning").innerHTML = utregning ? tex(utregning) : "";
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  const tegnNavn = { pluss: "pluss", gange: "ganger", dele: "delt på" }[modus];
  const sammendrag = `${t1}/${n1} ${tegnNavn} ${t2}/${n2}` + (r.udefinert ? " er ikke definert." : ` er ${r.svar[1] === 1 ? r.svar[0] : r.svar[0] + "/" + r.svar[1]}.`);
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
  for (const n of ["t1", "n1", "t2", "n2"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3) { sistBredde = w; tegn(); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "brok", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["t1", "n1", "t2", "n2"], ["modus"], settVerdier, modusVelger);
oppdater(false);

window.mattelabBrok = { regn, forkort, sfm };
