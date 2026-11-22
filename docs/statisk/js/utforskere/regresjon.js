// Utforsker: modellering og regresjon. Tilpass en lineær, andregrads-, eksponentiell eller potensmodell til data.
import { tall, tolkTall, Koordinatsystem, rens } from "../felles.js";
import { $, tex, visVerdier, visMelding, figurverktoy, delTilstand, lesValg, tilpassVindu } from "../utforsker.js";
import { texT } from "../matte.js";

// ------------------------------------------------------------------ data
// Tenkte data, laget for å øve. De er ikke målinger.

export const DATASETT = {
  taxi: { navn: "Taxitur: pris og lengde", x: "km", y: "kr", xs: [2, 5, 8, 12, 15, 20], ys: [138, 189, 252, 325, 386, 476] },
  kast: { navn: "Kast: høyde og tid", x: "s", y: "m", xs: [0, 0.5, 1, 1.5, 2, 2.5, 3], ys: [1.6, 8.6, 13.7, 15.9, 16.1, 13.2, 8.4] },
  bakterier: { navn: "Bakterier i en kultur", x: "timer", y: "antall", xs: [0, 1, 2, 3, 4, 5, 6], ys: [120, 170, 270, 400, 630, 890, 1380] },
  bil: { navn: "Verdien av en bil", x: "år", y: "tusen kr", xs: [0, 1, 2, 3, 4, 5, 6, 7, 8], ys: [407, 331, 292, 243, 214, 175, 152, 126, 111] },
  pendel: { navn: "Pendel: svingetid og lengde", x: "m", y: "s", xs: [0.2, 0.4, 0.6, 0.8, 1, 1.5, 2], ys: [0.9, 1.26, 1.56, 1.79, 2.02, 2.44, 2.84] },
};

export const MODELLER = { lineaer: "Lineær", andregrad: "Andregrad", eksponentiell: "Eksponentiell", potens: "Potens" };

// ------------------------------------------------------------------ matematikk

function lin(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  const a = sxy / sxx;
  return [a, my - a * mx];
}

/** Løs et 3 × 3 likningssystem med Gauss-eliminasjon (delvis pivotering). */
function los3(A, v) {
  const M = A.map((rad, i) => [...rad, v[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = M[r][i] / M[i][i];
      for (let k = i; k < 4; k++) M[r][k] -= f * M[i][k];
    }
  }
  return [0, 1, 2].map((i) => M[i][3] / M[i][i]);
}

/**
 * Tilpass en modell. Lineær og andregrad: minste kvadraters metode.
 * Eksponentiell: regresjon av ln y mot x. Potens: ln y mot ln x.
 * Returnerer { ok, k (koeffisientene), f, r2 } eller { ok: false, grunn }.
 */
export function tilpass(modell, xs, ys) {
  const n = xs.length;
  const unike = new Set(xs).size;
  if (n < 2 || unike < 2) return { ok: false, grunn: "Det trengs minst to punkter med ulike x-verdier." };
  let k, f;
  if (modell === "lineaer") {
    const [a, b] = lin(xs, ys);
    k = { a, b }; f = (x) => a * x + b;
  } else if (modell === "andregrad") {
    if (unike < 3) return { ok: false, grunn: "En andregradsmodell trenger minst tre ulike x-verdier." };
    const S = (p) => xs.reduce((s, x) => s + x ** p, 0);
    const T = (p) => xs.reduce((s, x, i) => s + ys[i] * x ** p, 0);
    const l = los3([[S(4), S(3), S(2)], [S(3), S(2), S(1)], [S(2), S(1), n]], [T(2), T(1), T(0)]);
    if (!l) return { ok: false, grunn: "Kunne ikke regne ut modellen." };
    const [a, b, c] = l;
    k = { a, b, c }; f = (x) => a * x * x + b * x + c;
  } else if (modell === "eksponentiell") {
    if (ys.some((y) => y <= 0)) return { ok: false, grunn: "En eksponentiell modell a · bˣ er alltid positiv. Alle y-verdiene må være større enn 0." };
    const [s, m] = lin(xs, ys.map(Math.log));
    const a = Math.exp(m), b = Math.exp(s);
    k = { a, b }; f = (x) => a * b ** x;
  } else {
    if (xs.some((x) => x <= 0) || ys.some((y) => y <= 0)) return { ok: false, grunn: "En potensmodell a · xᵇ trenger positive x- og y-verdier. Her er minst én av dem 0 eller negativ." };
    const [s, m] = lin(xs.map(Math.log), ys.map(Math.log));
    const a = Math.exp(m);
    k = { a, b: s }; f = (x) => (x > 0 ? a * x ** s : x === 0 && s > 0 ? 0 : NaN);
  }
  const my = ys.reduce((s, y) => s + y, 0) / n;
  const ssRes = xs.reduce((s, x, i) => s + (ys[i] - f(x)) ** 2, 0);
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  // Alle y-verdiene er like (bortsett fra avrunding): Da er R² ikke definert, og vi bruker 1
  // hvis modellen treffer alle punktene. Ellers blir R² et tilfeldig forhold mellom to avrundingsfeil.
  const skala = 1e-20 * ys.reduce((s, y) => s + y * y, 0);
  const r2 = ssTot <= skala ? (ssRes <= Math.max(skala, 1e-24) ? 1 : 0) : 1 - ssRes / ssTot;
  return { ok: true, k, f, r2, ssRes };
}

/** Tall med omtrent fire gjeldende sifre. */
export function sif(x, n = 4) {
  if (x === 0 || !Number.isFinite(x)) return 0;
  const des = Math.min(6, Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(x)))));
  return rens(Number(x.toFixed(des)), 10);
}

export function texModell(modell, k) {
  const t = (x) => texT(sif(x), 6);
  const pluss = (x) => (sif(x) < 0 ? ` - ${texT(-sif(x), 6)}` : ` + ${t(x)}`);
  if (modell === "lineaer") return `f(x) = ${t(k.a)}x${pluss(k.b)}`;
  if (modell === "andregrad") return `f(x) = ${t(k.a)}x^2${pluss(k.b)}x${pluss(k.c)}`;
  if (modell === "eksponentiell") return `f(x) = ${t(k.a)} \\cdot ${t(k.b)}^x`;
  return `f(x) = ${t(k.a)} \\cdot x^{${t(k.b)}}`;
}

/** Les egne data: ett punkt per linje, x og y skilt med mellomrom, tabulator eller semikolon. */
export function lesData(tekst) {
  const xs = [], ys = [], feil = [];
  tekst.split(/\r?\n/).forEach((linje, i) => {
    const l = linje.trim();
    if (!l) return;
    const deler = l.split(/[\s;]+/).filter(Boolean);
    const x = deler.length === 2 ? tolkTall(deler[0]) : NaN, y = deler.length === 2 ? tolkTall(deler[1]) : NaN;
    if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); } else feil.push(i + 1);
  });
  return { xs, ys, feil };
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { sett: "taxi", modell: "lineaer" };
let sett = lesValg("sett", [...Object.keys(DATASETT), "egne"], STANDARD.sett);
let modell = lesValg("modell", Object.keys(MODELLER), STANDARD.modell);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -1, xmax: 22, ymin: -20, ymax: 520, likeEnheter: false, tittel: "Datapunktene og modellen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const settVelger = $("datasett"), modellVelger = $("modell"), egneFelt = $("egne-data"), xFelt = $("x-prediksjon");
settVelger.value = sett;
modellVelger.value = modell;

// Egne data kan deles i adressen: data=1_2~3_4
const fraAdresse = new URLSearchParams(location.search).get("data");
if (fraAdresse) egneFelt.value = fraAdresse.split("~").map((p) => p.split("_").map((t) => tall(Number(t), 6)).join(" ")).join("\n");
else egneFelt.value = "1 2\n2 4,1\n3 5,9\n4 8,2\n5 9,8";
const xFraAdresse = new URLSearchParams(location.search).get("x");
if (xFraAdresse !== null && Number.isFinite(Number(xFraAdresse))) xFelt.value = tall(Number(xFraAdresse), 6);

let D, M;

function hentData() {
  if (sett !== "egne") return { ...DATASETT[sett], feil: [] };
  const d = lesData(egneFelt.value);
  return { navn: "Egne data", x: "x", y: "y", ...d };
}

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (M.ok) {
    if (visValg.avvik.checked) D.xs.forEach((x, i) => ks.linje(x, D.ys[i], x, M.f(x), "g-avvik"));
    ks.funksjon(M.f);
    const xp = prediksjonsX();
    if (Number.isFinite(xp) && Number.isFinite(M.f(xp))) {
      ks.punkt(xp, M.f(xp), { klasse: "g-punkt", etikett: `f(${tall(xp, 2)}) ≈ ${tall(sif(M.f(xp)), 4)}`, plass: "ov" });
    }
  }
  D.xs.forEach((x, i) => ks.punkt(x, D.ys[i], { klasse: "g-punkt-2", r: 5 }));
};

function prediksjonsX() {
  const t = xFelt.value.trim();
  return t ? tolkTall(t) : NaN;
}

function tilpassGraf() {
  if (!D.xs.length) { ks.tilbakestill(); return; }
  const pkt = D.xs.map((x, i) => [x, D.ys[i]]);
  const xp = prediksjonsX();
  if (M.ok && Number.isFinite(xp) && Number.isFinite(M.f(xp))) pkt.push([xp, M.f(xp)]);
  pkt.push([0, 0]);
  const xs = pkt.map((p) => p[0]), ys = pkt.map((p) => p[1]);
  const bx = Math.max(...xs) - Math.min(...xs) || 1, by = Math.max(...ys) - Math.min(...ys) || 1;
  ks.settVindu({ xmin: Math.min(...xs) - bx * 0.08, xmax: Math.max(...xs) + bx * 0.1, ymin: Math.min(...ys) - by * 0.08, ymax: Math.max(...ys) + by * 0.12 });
}

// ------------------------------------------------------------------ tekst og tabell

function oppdaterTekst() {
  $("egne-blokk").hidden = sett !== "egne";
  $("enheter").textContent = sett === "egne" ? "" : `x: ${D.x}, y: ${D.y}. Tenkte data.`;
  const rader = [["Datasett", D.navn, "bred"], ["Antall punkter", String(D.xs.length)]];
  let melding = "";
  if (D.feil.length) melding = `<strong>Kunne ikke lese linje ${D.feil.join(", ")}:</strong> Skriv ett punkt per linje, med x og y skilt med mellomrom eller semikolon. Bruk komma eller punktum som desimaltegn.`;
  if (!M.ok) {
    $("forskrift").innerHTML = "";
    rader.push(["Modell", "Ingen", "bred"]);
    melding = melding || `<strong>Modellen går ikke her:</strong> ${M.grunn}`;
  } else {
    const formel = texModell(modell, M.k);
    $("forskrift").innerHTML = tex(formel);
    rader.push(["R²", tall(rens(M.r2, 10), 4)]);
    const xp = prediksjonsX();
    if (Number.isFinite(xp)) {
      const y = M.f(xp);
      rader.push([`f(${tall(xp, 2)})`, Number.isFinite(y) ? `≈ ${tall(sif(y), 4)}` : "ikke definert"]);
      const xmin = Math.min(...D.xs), xmax = Math.max(...D.xs);
      if (!melding && (xp < xmin || xp > xmax)) melding = `<strong>Utenfor dataene:</strong> x = ${tall(xp, 2)} ligger utenfor målingene (fra ${tall(xmin, 2)} til ${tall(xmax, 2)}). Det kalles å ekstrapolere. Da er det ikke sikkert at modellen fortsatt gjelder.`;
    }
    if (modell === "eksponentiell") rader.push(["Vekstfaktor", `${tall(sif(M.k.b), 4)} (${M.k.b >= 1 ? "+" : "−"}${tall(sif(Math.abs(M.k.b - 1) * 100), 3)} % per enhet)`, "bred"]);
  }
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  $("tabell").innerHTML = tabell();
  const sammendrag = M.ok ? `${MODELLER[modell]} modell for ${D.navn}. R² = ${tall(rens(M.r2, 10), 4)}.` : `Ingen ${MODELLER[modell].toLowerCase()} modell.`;
  ks.beskrivelse = `${D.xs.length} datapunkter. ${sammendrag}`;
  return sammendrag;
}

function tabell() {
  if (!D.xs.length) return "";
  const rad = (x, i) => `<tr><td>${tall(x, 3)}</td><td>${tall(D.ys[i], 3)}</td>${M.ok ? `<td>${tall(sif(M.f(x)), 4)}</td><td>${tall(sif(D.ys[i] - M.f(x), 3), 4)}</td>` : ""}</tr>`;
  return `<table class="liten-tabell"><caption class="visuelt-skjult">Datapunktene, modellverdiene og avvikene</caption>
    <thead><tr><th scope="col">x</th><th scope="col">y</th>${M.ok ? '<th scope="col">f(x)</th><th scope="col">avvik y − f(x)</th>' : ""}</tr></thead>
    <tbody>${D.xs.map(rad).join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker, nyttVindu) {
  D = hentData();
  M = tilpass(modell, D.xs, D.ys);
  ks.xnavn = sett === "egne" ? "x" : `x (${D.x})`;
  ks.ynavn = sett === "egne" ? "y" : `y (${D.y})`;
  const sammendrag = oppdaterTekst();
  if (nyttVindu) tilpassGraf();
  ks.tegn();
  if (fraBruker) {
    const tilstand = { sett, modell };
    const xp = prediksjonsX();
    if (Number.isFinite(xp)) tilstand.x = xp;
    if (sett === "egne" && D.xs.length) tilstand.data = D.xs.map((x, i) => `${x}_${D.ys[i]}`).join("~");
    delTilstand(tilstand, sammendrag);
  }
}

settVelger.addEventListener("change", () => { sett = settVelger.value; xFelt.value = ""; oppdater(true, true); });
modellVelger.addEventListener("change", () => { modell = modellVelger.value; oppdater(true, false); });
egneFelt.addEventListener("input", () => oppdater(true, true));
xFelt.addEventListener("input", () => oppdater(true, false));

// Lenker i oppgavene velger datasett, modell og x
document.querySelectorAll("a.oppsettlenke").forEach((lenke) => {
  lenke.addEventListener("click", (e) => {
    e.preventDefault();
    const p = new URL(lenke.href).searchParams;
    if (p.has("sett")) { sett = p.get("sett"); settVelger.value = sett; }
    if (p.has("modell")) { modell = p.get("modell"); modellVelger.value = modell; }
    xFelt.value = p.has("x") ? tall(Number(p.get("x")), 6) : "";
    oppdater(true, true);
    $("utforsker").scrollIntoView({ behavior: "smooth", block: "start" });
    modellVelger.focus({ preventScroll: true });
  });
});

figurverktoy({ ks, svg, filnavn: "regresjon", tilpass: () => { tilpassGraf(); ks.tegn(); }, tilbakestill: () => {
  sett = STANDARD.sett; modell = STANDARD.modell; settVelger.value = sett; modellVelger.value = modell; xFelt.value = ""; oppdater(true, true);
} });

oppdater(false, true);

window.mattelabRegresjon = { tilpass, lesData, sif, texModell, DATASETT, hent: () => ({ D, M }) };
