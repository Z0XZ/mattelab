// Utforsker: andregradsulikheter ax² + bx + c > 0 (og ≥, <, ≤) med fortegnsskjema og løsningsmengde
import { tall, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker,
  delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { analyser as analyserAndregrad } from "./andregrad-matte.js";
import { texPolynom, texFaktor, texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

export const RELASJONER = { gt: [">", "\\gt"], ge: ["≥", "\\geq"], lt: ["<", "\\lt"], le: ["≤", "\\leq"] };

/**
 * Løs ax² + bx + c (rel) 0. Løsningen er en liste med deler:
 * { fra, til, fraMed, tilMed } for intervaller og { punkt } for enkeltpunkter.
 * Vi går gjennom intervallene mellom nullpunktene og nullpunktene selv, og slår sammen naboer som er med.
 */
export function los(a, b, c, rel) {
  const r = analyserAndregrad(a, b, c);
  const f = (x) => a * x * x + b * x + c;
  const null_ = r.type === "null" ? [] : r.nullpunkter;
  const okFortegn = (s) => (rel === "gt" || rel === "ge" ? s > 0 : s < 0);
  const medNull = rel === "ge" || rel === "le";
  if (r.type === "null") return { r, f, deler: medNull ? [{ fra: -Infinity, til: Infinity }] : [], null_ };
  const grenser = [-Infinity, ...null_, Infinity];
  const biter = [];
  for (let i = 0; i < grenser.length - 1; i++) {
    const fra = grenser[i], til = grenser[i + 1];
    const midt = !Number.isFinite(fra) && !Number.isFinite(til) ? 0 : !Number.isFinite(fra) ? til - 1 : !Number.isFinite(til) ? fra + 1 : (fra + til) / 2;
    biter.push({ type: "intervall", fra, til, ok: okFortegn(Math.sign(rens(f(midt), 12))) });
    if (i < null_.length) biter.push({ type: "punkt", x: null_[i], ok: medNull });
  }
  const deler = [];
  let gjeldende = null;
  for (const bit of biter) {
    if (!bit.ok) { if (gjeldende) { deler.push(gjeldende); gjeldende = null; } continue; }
    if (bit.type === "punkt") {
      if (gjeldende) { gjeldende.til = bit.x; gjeldende.tilMed = true; } else gjeldende = { fra: bit.x, til: bit.x, fraMed: true, tilMed: true };
    } else if (gjeldende) { gjeldende.til = bit.til; gjeldende.tilMed = false; } else gjeldende = { fra: bit.fra, til: bit.til, fraMed: false, tilMed: false };
  }
  if (gjeldende) deler.push(gjeldende);
  return { r, f, null_, deler: deler.map((d) => (d.fra === d.til ? { punkt: d.fra } : d)) };
}

/** Løsningen med ord: «x < −1 eller x > 3». */
export function somTekst(deler) {
  if (!deler.length) return "ingen x";
  const t = (x) => tall(x, 2);
  return deler.map((d) => {
    if ("punkt" in d) return `x = ${t(d.punkt)}`;
    const v = Number.isFinite(d.fra), h = Number.isFinite(d.til);
    if (!v && !h) return "alle x";
    if (!v) return `x ${d.tilMed ? "≤" : "<"} ${t(d.til)}`;
    if (!h) return `x ${d.fraMed ? "≥" : ">"} ${t(d.fra)}`;
    return `${t(d.fra)} ${d.fraMed ? "≤" : "<"} x ${d.tilMed ? "≤" : "<"} ${t(d.til)}`;
  }).join(" eller ");
}

/** Løsningen som intervaller: ⟨←, −1⟩ ∪ ⟨3, →⟩. */
export function somIntervall(deler) {
  if (!deler.length) return "∅";
  const t = (x) => tall(x, 2);
  return deler.map((d) => {
    if ("punkt" in d) return `{${t(d.punkt)}}`;
    if (!Number.isFinite(d.fra) && !Number.isFinite(d.til)) return "ℝ";
    const v = Number.isFinite(d.fra) ? (d.fraMed ? "[" : "⟨") + t(d.fra) : "⟨←";
    const h = Number.isFinite(d.til) ? t(d.til) + (d.tilMed ? "]" : "⟩") : "→⟩";
    return `${v}, ${h}`;
  }).join(" ∪ ");
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: -2, c: -3, rel: "gt" };
let rel = lesValg("rel", Object.keys(RELASJONER), STANDARD.rel);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -6, xmax: 6, ymin: -6, ymax: 6, likeEnheter: false, tittel: "Grafen til f og løsningen på x-aksen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>tallet foran x²", beskrivelse: "a, tallet foran x i andre", min: -5, maks: 5, grense: [-1000, 1000] },
  { navn: "b", etikett: "<i>b</i>tallet foran x", beskrivelse: "b, tallet foran x", min: -10, maks: 10, grense: [-1000, 1000] },
  { navn: "c", etikett: "<i>c</i>konstantledd", beskrivelse: "c, konstantleddet", min: -20, maks: 20, grense: [-1000, 1000] },
], STANDARD, () => oppdater(true));

const relVelger = $("relasjon");
relVelger.value = rel;
relVelger.addEventListener("change", () => { rel = relVelger.value; oppdater(true); });

let L;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (visValg.omrade.checked) {
    // Skraver området mellom grafen og x-aksen der ulikheten er oppfylt
    for (const d of L.deler) {
      if ("punkt" in d) continue;
      const fra = Math.max(d.fra, ks.xmin), til = Math.min(d.til, ks.xmax);
      if (fra >= til) continue;
      const pkt = [[fra, 0]];
      for (let i = 0; i <= 80; i++) { const x = fra + (til - fra) * i / 80; pkt.push([x, Math.max(ks.ymin, Math.min(ks.ymax, L.f(x)))]); }
      pkt.push([til, 0]);
      ks.mangekant(pkt);
    }
  }
  ks.funksjon(L.f);
  for (const d of L.deler) {
    if ("punkt" in d) continue;
    const fra = Math.max(d.fra, ks.xmin), til = Math.min(d.til, ks.xmax);
    if (fra < til) ks.linje(fra, 0, til, 0, "g-losning", ks.lagInnhold);
  }
  // Fylt prikk: nullpunktet er med. Åpen ring: det er ikke med.
  for (const x of L.null_) {
    const med = L.deler.some((d) => ("punkt" in d ? d.punkt === x : (d.fra === x && d.fraMed) || (d.til === x && d.tilMed)));
    ks.punkt(x, 0, { klasse: med ? "g-punkt" : "g-punkt-hul", etikett: `x = ${tall(x, 2)}${med ? " (med)" : " (ikke med)"}`, plass: "ov" });
  }
};

function tilpass() {
  const r = L.r;
  const pkt = L.null_.map((x) => [x, 0]);
  if (r.type === "andregrad") pkt.push([r.xs, r.ys], [r.xs - 3, L.f(r.xs - 3)], [r.xs + 3, L.f(r.xs + 3)]);
  else pkt.push([-4, L.f(-4)], [4, L.f(4)]);
  pkt.push([0, 0]);
  tilpassVindu(ks, pkt, 3, 1.3);
}

// ------------------------------------------------------------------ tekst

function fortegnsskjema() {
  const r = L.r;
  const null_ = L.null_;
  if (r.type === "null") return "";
  const t = (x) => tall(x, 2);
  const iv = [];
  const grenser = [-Infinity, ...null_, Infinity];
  for (let i = 0; i < grenser.length - 1; i++) {
    const fra = grenser[i], til = grenser[i + 1];
    iv.push({ fra, til, midt: !Number.isFinite(fra) && !Number.isFinite(til) ? 0 : !Number.isFinite(fra) ? til - 1 : !Number.isFinite(til) ? fra + 1 : (fra + til) / 2 });
  }
  const kol = [];
  iv.forEach((v, i) => {
    kol.push({ tekst: !Number.isFinite(v.fra) && !Number.isFinite(v.til) ? "alle x" : !Number.isFinite(v.fra) ? `x < ${t(v.til)}` : !Number.isFinite(v.til) ? `x > ${t(v.fra)}` : `${t(v.fra)} < x < ${t(v.til)}`, x: v.midt });
    if (i < null_.length) kol.push({ tekst: `x = ${t(null_[i])}`, x: null_[i], punkt: true });
  });
  const tegn = (s) => (s > 0 ? "+" : s < 0 ? "−" : "0");
  const rader = [];
  // Én rad per faktor når andregradsuttrykket kan faktoriseres
  const faktorer = r.type === "andregrad" && r.D >= 0 ? (r.D === 0 ? [r.xs, r.xs] : null_) : r.type === "lineær" ? null_ : [];
  const vist = new Set();
  for (const p of faktorer) {
    if (vist.has(p)) continue;
    vist.add(p);
    const potens = faktorer.filter((q) => q === p).length;
    const navn = tex(texFaktor(p) + (potens > 1 ? "^2" : ""));
    rader.push(`<tr><th scope="row">${navn}</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${tegn(rens((k.x - p) ** potens, 12))}</td>`).join("")}</tr>`);
  }
  if (r.type === "andregrad" && faktorer.length && r.a !== 1) rader.push(`<tr><th scope="row">${tex(`a = ${texT(r.a)}`)}</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${tegn(r.a)}</td>`).join("")}</tr>`);
  if (r.type === "lineær" && r.b !== 1) rader.push(`<tr><th scope="row">${tex(`b = ${texT(r.b)}`)}</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${tegn(r.b)}</td>`).join("")}</tr>`);
  rader.push(`<tr class="sum"><th scope="row">${tex("f(x)")}</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${tegn(rens(L.f(k.x), 12))}</td>`).join("")}</tr>`);
  return `<table class="liten-tabell fortegnsskjema"><caption class="visuelt-skjult">Fortegnsskjema</caption><tr><th scope="row">x</th>${kol.map((k) => `<td${k.punkt ? ' class="punkt"' : ""}>${k.tekst}</td>`).join("")}</tr>${rader.join("")}</table>`;
}

function oppdaterTekst() {
  const { a, b, c } = L.r;
  const uttrykk = texPolynom([[a, "x^2"], [b, "x"], [c, ""]]);
  $("forskrift").innerHTML = tex(`${uttrykk} ${RELASJONER[rel][1]} 0`);
  const r = L.r;
  if (r.type === "andregrad" && r.D >= 0) {
    const fakt = r.D === 0 ? `${texFaktor(r.xs)}^2` : null_tex();
    $("faktorisert").innerHTML = tex(`${a === 1 ? "" : a === -1 ? "-" : texT(a)}${fakt} ${RELASJONER[rel][1]} 0`);
  } else $("faktorisert").innerHTML = r.type === "andregrad" ? "Kan ikke faktoriseres (ingen nullpunkter)." : "";
  $("fortegn").innerHTML = fortegnsskjema();
  const tekst = somTekst(L.deler), intervall = somIntervall(L.deler);
  const rader = [
    ["Løsning", tekst, "bred"],
    ["Som intervall", intervall, "bred"],
    ["Nullpunkter", L.null_.length ? L.null_.map((x) => `x = ${tall(x, 2)}`).join(" og ") : r.type === "null" ? "Alle x" : "Ingen"],
  ];
  if (r.type === "andregrad") rader.push(["Diskriminant", tall(r.D, 2)]);
  visVerdier($("verdier"), rader);

  let melding = "";
  if (r.type === "andregrad" && r.D < 0) melding = `<strong>Ingen nullpunkter:</strong> Grafen ligger helt ${a > 0 ? "over" : "under"} x-aksen. Da er ${tex("f(x)")} ${a > 0 ? "positiv" : "negativ"} for alle x, og løsningen blir enten alle x eller ingen x.`;
  else if (r.type === "andregrad" && r.D === 0) melding = `<strong>Ett nullpunkt:</strong> Grafen berører x-aksen i x = ${tall(r.xs, 2)}. Der er ${tex("f(x) = 0")}, ellers har ${tex("f(x)")} samme fortegn som a. Om akkurat dette punktet er med, avhenger av om ulikheten er streng.`;
  else if (r.type === "lineær") melding = `<strong>a = 0:</strong> Da er ulikheten lineær. Deler du på et negativt tall, snur ulikhetstegnet.`;
  else if (r.type === "konstant" || r.type === "null") melding = `<strong>a = b = 0:</strong> Da står det bare et tall på venstre side. Ulikheten er sann for alle x eller ingen x.`;
  visMelding($("melding"), melding);

  const sammendrag = `Løsning: ${tekst}.`;
  ks.beskrivelse = `Ulikheten ${tall(a)}x² + ${tall(b)}x + ${tall(c)} ${RELASJONER[rel][0]} 0. ${sammendrag}`;
  return sammendrag;

  function null_tex() {
    return L.null_.map((x) => texFaktor(x)).join("");
  }
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  const v = verdier(glidere);
  L = los(v.a, v.b, v.c, rel);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ ...v, rel }, sammendrag);
}

function settVerdier(v) {
  if (v.rel && v.rel in RELASJONER) { rel = v.rel; relVelger.value = rel; }
  for (const [n, g] of Object.entries(glidere)) if (n in v) g.sett(v[n]);
  oppdater(true);
  tilpass();
}

figurverktoy({ ks, svg, filnavn: "andregradsulikhet", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b", "c"], ["rel"], settVerdier, relVelger);

oppdater(false);
tilpass();

window.mattelabUlikheter = { los, somTekst, somIntervall, hent: () => L };
