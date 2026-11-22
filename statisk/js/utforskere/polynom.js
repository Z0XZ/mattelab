// Utforsker: polynomfunksjoner f(x) = a(x − r1)(x − r2)… av grad 1 til 4
import { tall, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker,
  delTilstand, tilpassVindu,
} from "../utforsker.js";
import { texT, texFaktor, texKoeffisient } from "../matte.js";
import { fraRotter, verdi, fortegnsintervaller, ekstremalpunkter, texPoly } from "./polynom-matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Analyser f(x) = a(x − r1)…(x − rn). Nullpunktene er gitt, så multiplisiteten telles eksakt.
 */
export function analyser(a, rotter) {
  const n = rotter.length;
  const r = { a, n, rotter };
  if (a === 0) return { ...r, null: true, p: [0], f: () => 0 };
  r.p = fraRotter(a, rotter);
  r.f = (x) => verdi(r.p, x);
  const teller = new Map();
  for (const x of rotter) { const k = rens(x, 9); teller.set(k, (teller.get(k) || 0) + 1); }
  r.nullpunkter = [...teller.entries()].sort((x, y) => x[0] - y[0]).map(([x, m]) => ({ x, m }));
  r.yakse = rens(verdi(r.p, 0), 9);
  r.intervaller = fortegnsintervaller(r.p, r.nullpunkter.map((z) => z.x));
  r.ekstremal = ekstremalpunkter(r.p);
  // Når x → +∞ har f samme fortegn som a. Når x → −∞ snur fortegnet hvis graden er odde.
  r.hoyre = a > 0 ? 1 : -1;
  r.venstre = n % 2 === 0 ? r.hoyre : -r.hoyre;
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { grad: 3, a: 1, r1: -2, r2: 1, r3: 3, r4: 4 };
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -6, xmax: 6, ymin: -10, ymax: 10, likeEnheter: false, tittel: "Grafen til polynomfunksjonen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = {
  ...lagGlidere($("glidere-a"), [
    { navn: "a", etikett: "<i>a</i>tallet foran", beskrivelse: "a, tallet foran parentesene", min: -3, maks: 3, grense: [-100, 100] },
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-rotter"), [1, 2, 3, 4].map((i) => (
    { navn: `r${i}`, etikett: `<i>r<sub>${i}</sub></i>nullpunkt ${i}`, beskrivelse: `r${i}, nullpunkt nummer ${i}`, min: -6, maks: 6, steg: 0.5, grense: [-100, 100] }
  )), STANDARD, () => oppdater(true)),
};

const gradVelger = $("grad");
const fraAdresse = Number(new URLSearchParams(location.search).get("grad"));
let n = [1, 2, 3, 4].includes(fraAdresse) ? fraAdresse : STANDARD.grad;
gradVelger.value = String(n);
gradVelger.addEventListener("change", () => { settGrad(Number(gradVelger.value)); oppdater(true); });

function settGrad(g) {
  n = g;
  gradVelger.value = String(g);
  for (let i = 1; i <= 4; i++) glidere[`r${i}`].element.hidden = i > g;
}

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (r.null) { ks.funksjon(() => 0); return; }
  if (visValg.fortegn.checked) {
    for (const iv of r.intervaller) {
      if (!iv.fortegn) continue;
      const fra = Math.max(iv.fra, ks.xmin), til = Math.min(iv.til, ks.xmax);
      if (fra < til) ks.linje(fra, 0, til, 0, iv.fortegn > 0 ? "g-intervall-pos" : "g-intervall-neg", ks.lagBak);
    }
  }
  ks.funksjon(r.f);
  if (visValg.punkter.checked) {
    // Etiketten står over x-aksen, så den ikke dekker tallene på aksen
    for (const z of r.nullpunkter) ks.punkt(z.x, 0, { klasse: "g-punkt-2", etikett: `x = ${tall(z.x, 2)}${z.m > 1 ? ` (${ORD[z.m]})` : ""}`, plass: "ov" });
    if (!r.nullpunkter.some((z) => z.x === 0)) ks.punkt(0, r.yakse, { klasse: "g-punkt-2", etikett: `(0, ${tall(r.yakse, 2)})`, plass: "ov" });
  }
  if (visValg.ekstremal.checked) {
    for (const e of r.ekstremal) {
      const navn = { toppunkt: "Topp", bunnpunkt: "Bunn", terrassepunkt: "Terrasse" }[e.type];
      ks.punkt(e.x, e.y, { etikett: `${navn} (${tall(e.x, 2)}, ${tall(e.y, 2)})`, plass: e.type === "bunnpunkt" ? "under" : "ov" });
    }
  }
};

function tilpass() {
  if (r.null) { ks.tilbakestill(); return; }
  const pkt = [...r.nullpunkter.map((z) => [z.x, 0]), [0, r.yakse], ...r.ekstremal.map((e) => [e.x, e.y])];
  const xs = pkt.map((q) => q[0]);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1;
  pkt.push([x0, 0], [x1, 0]);
  tilpassVindu(ks, pkt, 3, 1.35);
}

// ------------------------------------------------------------------ tekst og verdier

const ORD = { 2: "dobbelt", 3: "trippelt", 4: "firedobbelt" };

function faktorisert() {
  const deler = r.nullpunkter.map((z) => texFaktor(z.x) + (z.m > 1 ? `^{${z.m}}` : ""));
  const enkel = deler.length === 1 && r.nullpunkter[0].m === 1 && r.nullpunkter[0].x !== 0;
  return texKoeffisient(r.a) + (enkel && r.a === 1 ? deler[0].slice(1, -1) : deler.join(""));
}

function oppdaterTekst() {
  if (r.null) {
    $("forskrift").innerHTML = tex("f(x) = 0");
    $("utvidet").innerHTML = "";
    $("fortegn").innerHTML = "";
    visVerdier($("verdier"), [["Grad", "Ingen (nullfunksjonen)", "bred"]]);
    visMelding($("melding"), `<strong>a = 0:</strong> Da blir ${tex("f(x) = 0")} for alle x. Grafen er x-aksen, og funksjonen har ingen grad.`);
    ks.beskrivelse = "f(x) = 0. Grafen er x-aksen.";
    return "f(x) = 0.";
  }
  $("forskrift").innerHTML = tex(`f(x) = ${faktorisert()}`);
  $("utvidet").innerHTML = tex(`f(x) = ${texPoly(r.p)}`);
  const pil = (s) => (s > 0 ? "+∞" : "−∞");
  const npTekst = r.nullpunkter.map((z) => `x = ${tall(z.x, 2)}${z.m > 1 ? ` (${ORD[z.m]})` : ""}`).join(", ");
  const rader = [
    ["Grad", String(r.n)],
    ["Skjærer y-aksen i", `(0, ${tall(r.yakse, 2)})`],
    ["Nullpunkter", npTekst, "bred"],
    ["Når x → +∞", `f(x) → ${pil(r.hoyre)}`],
    ["Når x → −∞", `f(x) → ${pil(r.venstre)}`],
  ];
  const topp = r.ekstremal.filter((e) => e.type !== "terrassepunkt");
  rader.push(["Topp- og bunnpunkter", topp.length
    ? topp.map((e) => `${e.type === "toppunkt" ? "topp" : "bunn"} ≈ (${tall(e.x, 2)}, ${tall(e.y, 2)})`).join(", ")
    : "Ingen", "bred"]);
  visVerdier($("verdier"), rader);
  $("fortegn").innerHTML = fortegnsskjema();

  let melding = "";
  const flere = r.nullpunkter.filter((z) => z.m > 1);
  const terrasse = r.ekstremal.find((e) => e.type === "terrassepunkt");
  if (flere.some((z) => z.m % 2 === 0)) {
    const z = flere.find((q) => q.m % 2 === 0);
    melding = `<strong>Dobbelt nullpunkt i x = ${tall(z.x, 2)}:</strong> Faktoren ${tex(texFaktor(z.x))} står i andre potens. Den er aldri negativ, så f skifter ikke fortegn der. Grafen <em>berører</em> x-aksen uten å krysse den.`;
  } else if (flere.length) {
    const z = flere[0];
    melding = `<strong>${ORD[z.m][0].toUpperCase() + ORD[z.m].slice(1)} nullpunkt i x = ${tall(z.x, 2)}:</strong> Grafen krysser x-aksen, men flater ut akkurat der. Det er et terrassepunkt.`;
  } else if (terrasse) {
    melding = `<strong>Terrassepunkt:</strong> Grafen flater ut i x ≈ ${tall(terrasse.x, 2)} uten å snu.`;
  } else if (r.n === 1) {
    melding = "<strong>Grad 1:</strong> Et polynom av første grad er en lineær funksjon. Grafen er en rett linje.";
  }
  visMelding($("melding"), melding);

  const sammendrag = `Grad ${r.n}. Nullpunkter: ${npTekst}. Når x går mot pluss uendelig, går f mot ${pil(r.hoyre)}.`;
  ks.beskrivelse = `f(x) = ${tall(r.a)} ganger produktet av (x minus hvert nullpunkt). ${sammendrag}`;
  return sammendrag;
}

function fortegnsskjema() {
  const kol = [];
  r.intervaller.forEach((iv, i) => {
    const tekst = !Number.isFinite(iv.fra) && !Number.isFinite(iv.til) ? "alle x"
      : !Number.isFinite(iv.fra) ? `x < ${tall(iv.til, 2)}` : !Number.isFinite(iv.til) ? `x > ${tall(iv.fra, 2)}` : `${tall(iv.fra, 2)} < x < ${tall(iv.til, 2)}`;
    kol.push({ x: tekst, f: iv.fortegn > 0 ? "+" : iv.fortegn < 0 ? "−" : "0" });
    const z = r.nullpunkter[i];
    if (z && i < r.intervaller.length - 1) kol.push({ x: `x = ${tall(z.x, 2)}`, f: "0", punkt: true });
  });
  const rad = (navn, k) => `<tr><th scope="row">${navn}</th>${kol.map((c) => `<td${c.punkt ? ' class="punkt"' : ""}>${c[k]}</td>`).join("")}</tr>`;
  return `<table class="liten-tabell fortegnsskjema"><caption class="visuelt-skjult">Fortegnsskjema for f</caption>${rad("x", "x")}${rad("f(x)", "f")}</table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  const v = verdier(glidere);
  r = analyser(v.a, [v.r1, v.r2, v.r3, v.r4].slice(0, n));
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) {
    const tilstand = { grad: n, a: v.a };
    for (let i = 1; i <= n; i++) tilstand[`r${i}`] = v[`r${i}`];
    delTilstand(tilstand, sammendrag);
  }
}

function settVerdier(ny) {
  settGrad(ny.grad || STANDARD.grad);
  for (const [k, g] of Object.entries(glidere)) if (k in ny) g.sett(ny[k]);
  oppdater(true);
  tilpass();
}

figurverktoy({ ks, svg, filnavn: "polynomfunksjon", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["grad", "a", "r1", "r2", "r3", "r4"], [], settVerdier, gradVelger);

settGrad(n);
oppdater(false);
tilpass();

window.mattelabPolynom = { analyser, hent: () => r };
