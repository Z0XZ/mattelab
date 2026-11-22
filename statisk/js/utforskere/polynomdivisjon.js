// Utforsker: polynomdivisjon P(x) : (x − r), steg for steg, med restteoremet og grafen til P(x)/(x − r)
import { tall, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker,
  delTilstand, tilpassVindu,
} from "../utforsker.js";
import { texTall, texT, texFaktor } from "../matte.js";
import { del, verdi, trim, texPoly, tekstPoly } from "./polynom-matte.js";

// ------------------------------------------------------------------ matematikk

/** Del P(x) = c3x³ + c2x² + c1x + c0 på (x − r). */
export function analyser(v) {
  const P = trim([v.c0, v.c1, v.c2, v.c3]);
  const N = [-v.r, 1];
  const d = del(P, N);
  const rest = d.rest.length === 1 ? d.rest[0] : NaN;
  return { P, N, r: v.r, ...d, restTall: rest, Pr: rens(verdi(P, v.r), 9), grad: P.length - 1 };
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { c3: 1, c2: -2, c1: -5, c0: 6, r: 1 };
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -6, xmax: 6, ymin: -10, ymax: 10, likeEnheter: false, tittel: "Grafen til P(x) delt på (x − r)" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = {
  ...lagGlidere($("glidere-teller"), [
    { navn: "c3", etikett: "<i>x³</i>leddet med x³", beskrivelse: "tallet foran x i tredje", min: -5, maks: 5, steg: 1, desimaler: 0, grense: [-100, 100] },
    { navn: "c2", etikett: "<i>x²</i>leddet med x²", beskrivelse: "tallet foran x i andre", min: -10, maks: 10, steg: 1, desimaler: 0, grense: [-100, 100] },
    { navn: "c1", etikett: "<i>x</i>leddet med x", beskrivelse: "tallet foran x", min: -10, maks: 10, steg: 1, desimaler: 0, grense: [-100, 100] },
    { navn: "c0", etikett: "konstantledd", beskrivelse: "konstantleddet", min: -10, maks: 10, steg: 1, desimaler: 0, grense: [-100, 100] },
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-nevner"), [
    { navn: "r", etikett: "<i>r</i>i (x − r)", beskrivelse: "r i divisoren x minus r", min: -5, maks: 5, steg: 1, desimaler: 0, grense: [-100, 100] },
  ], STANDARD, () => oppdater(true)),
};

let r;
let vist = Infinity; // hvor mange steg av divisjonen som vises

// ------------------------------------------------------------------ oppstillingen

/** Ett ledd i oppstillingen. Ledd etter det første får fortegn foran seg. */
function ledd(c, g, forst) {
  const x = g === 0 ? "" : g === 1 ? "x" : `x^{${g}}`;
  const tallDel = Math.abs(c) === 1 && g > 0 ? "" : texTall(c);
  return forst ? (c < 0 ? "-" : "") + tallDel + x : `{}${c < 0 ? "-" : "+"}${tallDel}${x}`;
}

/**
 * Oppstillingen som en HTML-tabell: én kolonne per potens av x, så leddene står under hverandre.
 * Det som trekkes fra, står med minus foran parentesen og en strek under.
 */
function oppstilling(antall) {
  const D = r.grad;
  const kol = D + 1;
  const tom = () => new Array(kol).fill("");
  const rader = [];
  // Første rad: hele P(x), også ledd med 0 foran, så kolonnene stemmer
  const forste = tom();
  for (let g = D; g >= 0; g--) forste[D - g] = ledd(r.P[g] || 0, g, g === D);
  forste[0] = "(" + forste[0];
  forste[D] += ")";
  const kvot = r.steg.slice(0, antall).map((s, i) => ledd(s.ledd[0], s.ledd[1], i === 0)).join("");
  rader.push({ celler: forste, slutt: `: ${texFaktor(r.r).replace(/^x$/, "x")} = ${kvot || "\\ldots"}` });
  r.steg.slice(0, antall).forEach((s) => {
    const trekk = tom();
    const g0 = s.ledd[1];
    // Er r = 0, er det bare ett ledd å trekke fra
    const termer = [[s.trekk[g0 + 1] || 0, g0 + 1], [s.trekk[g0] || 0, g0]].filter(([c], i) => i === 0 || c !== 0);
    termer.forEach(([c, g], i) => { trekk[D - g] = ledd(c, g, i === 0); });
    const siste = D - termer[termer.length - 1][1];
    trekk[D - g0 - 1] = "-(" + trekk[D - g0 - 1];
    trekk[siste] += ")";
    rader.push({ celler: trekk, strek: [D - g0 - 1, D - g0] });
    const igjen = tom();
    const rest = s.rest;
    let forstLedd = true;
    for (let g = rest.length - 1; g >= 0; g--) {
      if (rest[g] === 0 && !(g === 0 && forstLedd)) continue;
      igjen[D - g] = ledd(rest[g], g, forstLedd);
      forstLedd = false;
    }
    rader.push({ celler: igjen });
  });
  const html = rader.map((rad) => `<tr>${rad.celler.map((c, i) => `<td${rad.strek && rad.strek.includes(i) ? ' class="strek"' : ""}>${c ? tex(c) : ""}</td>`).join("")}<td class="divisjon-slutt">${rad.slutt ? tex(rad.slutt) : ""}</td></tr>`).join("");
  return `<table class="divisjon"><caption class="visuelt-skjult">Polynomdivisjonen satt opp steg for steg</caption><tbody>${html}</tbody></table>`;
}

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  const f = (x) => (x === r.r ? NaN : verdi(r.P, x) / (x - r.r));
  const q = (x) => verdi(r.kvotient, x);
  if (visValg.kvotient.checked && r.grad >= 1) ks.funksjon(q, "g-asymptote");
  if (r.restTall !== 0) {
    if (visValg.kvotient.checked) ks.loddrett(r.r, "g-asymptote");
    ks.funksjon((x) => (x < r.r ? f(x) : NaN));
    ks.funksjon((x) => (x > r.r ? f(x) : NaN));
  } else {
    ks.funksjon(f);
    ks.punkt(r.r, q(r.r), { klasse: "g-punkt-hul", etikett: `Hull i x = ${tall(r.r)}`, r: 6 });
  }
  if (visValg.punkt.checked) ks.punkt(r.r, r.Pr, { etikett: `P(${tall(r.r)}) = ${tall(r.Pr, 2)}`, plass: "ov" });
};

function tilpass() {
  const pkt = [[r.r, r.Pr], [r.r - 4, verdi(r.kvotient, r.r - 4)], [r.r + 4, verdi(r.kvotient, r.r + 4)], [r.r, verdi(r.kvotient, r.r)]];
  tilpassVindu(ks, pkt, 4, 1.4);
}

// ------------------------------------------------------------------ tekst og verdier

function visSteg() {
  const n = Math.min(vist, r.steg.length);
  $("oppstilling").innerHTML = r.steg.length ? oppstilling(n) : "";
  $("steg-teller").textContent = r.steg.length ? `Steg ${n} av ${r.steg.length}` : "";
  $("neste-steg").disabled = n >= r.steg.length;
  $("forrige-steg").disabled = n <= 0;
  const ferdig = n >= r.steg.length;
  $("resultat").hidden = !ferdig;
  if (n === 0) $("steg-forklaring").innerHTML = "Trykk «Neste steg» for å begynne.";
  else {
    const s = r.steg[n - 1];
    const [k, g] = s.ledd;
    const hoyest = s.forRest.length - 1;
    $("steg-forklaring").innerHTML = `Steg ${n}: ${tex(ledd(s.forRest[hoyest], hoyest, true))} delt på ${tex("x")} er ${tex(ledd(k, g, true))}. `
      + `Gang ${tex(texFaktor(r.r))} med ${tex(ledd(k, g, true))} og trekk fra. Igjen står ${tex(texPoly(s.rest))}.`;
  }
}

function oppdaterTekst() {
  const P = texPoly(r.P), Q = texPoly(r.kvotient), fakt = texFaktor(r.r);
  $("forskrift").innerHTML = tex(`\\dfrac{${P}}{${fakt === "x" ? "x" : fakt.slice(1, -1)}}`);
  const restTex = texT(r.restTall);
  $("resultat").innerHTML = r.restTall === 0
    ? tex(`${P} = ${fakt}(${Q})`)
    : tex(`\\dfrac{${P}}{${fakt.replace(/^\((.*)\)$/, "$1")}} = ${Q} ${r.restTall < 0 ? "-" : "+"} \\dfrac{${texTall(r.restTall)}}{${fakt.replace(/^\((.*)\)$/, "$1")}}`);
  const rader = [
    ["Svar (kvotient)", tekstPoly(r.kvotient, tall)],
    ["Rest", tall(r.restTall, 2)],
    [`P(${tall(r.r)})`, tall(r.Pr, 2)],
    ["Antall steg", String(r.steg.length)],
  ];
  if (r.grad >= 2) rader.push(["Asymptoter", r.restTall === 0 ? "Ingen (hull i grafen)" : `x = ${tall(r.r)} og y = ${tekstPoly(r.kvotient, tall)}`, "bred"]);
  visVerdier($("verdier"), rader);

  let melding = "";
  if (r.grad === 0) melding = `<strong>P(x) er et tall:</strong> Da er det ingen ledd med ${tex("x")} å dele. Svaret er ${tex("0")}, og hele P(x) blir rest.`;
  else if (r.restTall === 0) melding = `<strong>Divisjonen går opp:</strong> Resten er ${tex("0")}, og ${tex(`P(${texT(r.r)}) = 0`)}. Da er ${tex(fakt)} en faktor i P(x), og ${tex(`x = ${texT(r.r)}`)} er et nullpunkt. Grafen til brøken har et hull, ikke en asymptote.`;
  else melding = `<strong>Restteoremet:</strong> Resten er alltid lik ${tex(`P(${texT(r.r)})`)}. Her er begge ${tex(restTex)}. Siden resten ikke er ${tex("0")}, er ${tex(fakt)} ikke en faktor i P(x).`;
  visMelding($("melding"), melding);

  const sammendrag = `P(x) delt på (x − ${tall(r.r)}) gir ${tekstPoly(r.kvotient, tall)} med rest ${tall(r.restTall)}.`;
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  const v = verdier(glidere);
  r = analyser(v);
  const sammendrag = oppdaterTekst();
  visSteg();
  ks.tegn();
  if (fraBruker) delTilstand(v, sammendrag);
}

function settVerdier(v) {
  for (const [n, g] of Object.entries(glidere)) if (n in v) g.sett(v[n]);
  vist = Infinity;
  oppdater(true);
  tilpass();
}

$("neste-steg").addEventListener("click", () => { vist = Math.min(vist, r.steg.length) + 1; visSteg(); });
$("forrige-steg").addEventListener("click", () => { vist = Math.max(0, Math.min(vist, r.steg.length) - 1); visSteg(); });
$("alle-steg").addEventListener("click", () => { vist = Infinity; visSteg(); });
$("fra-start").addEventListener("click", () => { vist = 0; visSteg(); });

figurverktoy({ ks, svg, filnavn: "polynomdivisjon", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["c3", "c2", "c1", "c0", "r"], [], settVerdier, glidere.c3.glider);

oppdater(false);
tilpass();

window.mattelabPolynomdivisjon = { analyser, hent: () => r };
