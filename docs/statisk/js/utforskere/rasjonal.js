// Utforsker: rasjonale funksjoner f(x) = (ax + b)/(cx + d) og asymptotene deres
import { tall, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, tilpassVindu,
} from "../utforsker.js";
import { texPolynom, texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Analyser f(x) = (ax + b)/(cx + d). type:
 *  «rasjonal»: ekte rasjonal funksjon med loddrett og vannrett asymptote
 *  «hull»: ad − bc = 0, så f er konstant a/c, men ikke definert i x = −d/c (et hull i grafen)
 *  «lineær»: c = 0 og d ≠ 0
 *  «udefinert»: c = d = 0, nevneren er alltid 0
 */
export function analyser(a, b, c, d) {
  const r = { a, b, c, d, det: rens(a * d - b * c) };
  r.f = (x) => { const n = c * x + d; return n === 0 ? NaN : (a * x + b) / n; };
  if (c === 0) {
    if (d === 0) return { ...r, type: "udefinert" };
    const k = rens(a / d), m = rens(b / d);
    return { ...r, type: "lineær", k, m, nullpunkt: k !== 0 ? rens(-m / k) : undefined, yakse: m };
  }
  r.xv = rens(-d / c);
  r.yv = rens(a / c);
  if (d !== 0) r.yakse = rens(b / d);
  if (r.det === 0) return { ...r, type: "hull", nullpunkt: undefined, alleNull: r.yv === 0 };
  if (a !== 0) r.nullpunkt = rens(-b / a);
  // f(x) − a/c = −det / (c(cx + d)). Fortegnet avgjør om f går mot +∞ eller −∞ ved asymptoten.
  r.hoyreGrense = r.det > 0 ? -Infinity : Infinity;
  r.venstreGrense = -r.hoyreGrense;
  // Over eller under den vannrette asymptoten for store |x|
  r.overForStor = -r.det / (c * c) > 0;
  return { ...r, type: "rasjonal" };
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 2, b: 1, c: 1, d: -1 };
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -8, xmax: 8, ymin: -6, ymax: 6, likeEnheter: false, tittel: "Grafen til f" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = {
  ...lagGlidere($("glidere-teller"), [
    { navn: "a", etikett: "<i>a</i>tallet foran x i telleren", beskrivelse: "a, tallet foran x i telleren", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "b", etikett: "<i>b</i>konstantledd i telleren", beskrivelse: "b, konstantleddet i telleren", min: -10, maks: 10, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-nevner"), [
    { navn: "c", etikett: "<i>c</i>tallet foran x i nevneren", beskrivelse: "c, tallet foran x i nevneren", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "d", etikett: "<i>d</i>konstantledd i nevneren", beskrivelse: "d, konstantleddet i nevneren", min: -10, maks: 10, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
};

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (r.type === "udefinert") { $("utenfor").hidden = true; return; }
  if (r.type === "lineær") {
    ks.funksjon(r.f);
  } else {
    if (visValg.asymptoter.checked && r.type === "rasjonal") {
      ks.loddrett(r.xv, "g-asymptote");
      ks.vannrett(r.yv, "g-asymptote");
      const pyV = ks.sy(r.yv), pxV = ks.sx(r.xv);
      if (pyV > 14 && pyV < ks.H - 6) ks.etikett(ks.B - 8, pyV, `y = ${tall(r.yv, 2)}`, "ov-v").setAttribute("text-anchor", "end");
      if (pxV > 0 && pxV < ks.B) ks.etikett(pxV, 16, `x = ${tall(r.xv, 2)}`, pxV > ks.B - 90 ? "under-v" : "under");
    }
    // Tegn de to grenene hver for seg, så det ikke blir en loddrett strek ved asymptoten.
    ks.funksjon((x) => (x < r.xv ? r.f(x) : NaN));
    ks.funksjon((x) => (x > r.xv ? r.f(x) : NaN));
    if (r.type === "hull") ks.punkt(r.xv, r.yv, { klasse: "g-punkt-hul", etikett: `Hull i (${tall(r.xv, 2)}, ${tall(r.yv, 2)})`, r: 6 });
  }
  if (visValg.punkter.checked) {
    // Nullpunktet merkes på sin side av y-aksen, skjæringen med y-aksen på den andre, så tekstene ikke overlapper.
    const venstre = r.nullpunkt !== undefined && r.nullpunkt < 0;
    if (r.nullpunkt !== undefined) ks.punkt(r.nullpunkt, 0, { klasse: "g-punkt-2", etikett: `(${tall(r.nullpunkt, 2)}, 0)`, plass: venstre ? "ov-v" : "ov" });
    if (r.yakse !== undefined && !(r.type === "hull" && r.xv === 0)) ks.punkt(0, r.yakse, { klasse: "g-punkt-2", etikett: `(0, ${tall(r.yakse, 2)})`, plass: (r.yakse < 0 ? "under" : "ov") + (venstre ? "" : "-v") });
  }
  const viktige = [];
  if (r.type === "rasjonal") viktige.push([r.xv, r.yv]);
  if (r.type === "hull") viktige.push([r.xv, r.yv]);
  $("utenfor").hidden = viktige.every(([x, y]) => ks.innenfor(x, y));
};

function tilpass() {
  if (r.type === "udefinert") { ks.tilbakestill(); return; }
  const pkt = [];
  if (r.type === "rasjonal" || r.type === "hull") pkt.push([r.xv, r.yv]);
  if (r.nullpunkt !== undefined) pkt.push([r.nullpunkt, 0]);
  if (r.yakse !== undefined) pkt.push([0, r.yakse]);
  if (r.type === "rasjonal") {
    // Ta med litt av begge grenene: punkter der f er asymptoten ± noen enheter.
    const spenn = Math.max(4, ...pkt.map(([x]) => Math.abs(x - r.xv)));
    pkt.push([r.xv - spenn, r.f(r.xv - spenn)], [r.xv + spenn, r.f(r.xv + spenn)]);
    pkt.push([r.xv, r.yv - spenn * 0.75], [r.xv, r.yv + spenn * 0.75]);
  }
  tilpassVindu(ks, pkt, 4, 1.25);
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, b, c, d } = r;
  const teller = texPolynom([[a, "x"], [b, ""]]), nevner = texPolynom([[c, "x"], [d, ""]]);
  $("forskrift").innerHTML = tex(`f(x) = \\dfrac{${teller}}{${nevner}}`);
  const rader = [];
  let melding = "", omskrevet = "";
  if (r.type === "udefinert") {
    rader.push(["Definert for", "Ingen x (nevneren er alltid 0)", "bred"]);
    melding = `<strong>c = d = 0:</strong> Nevneren er ${tex("0")} for alle x. Vi kan ikke dele på null, så funksjonen er ikke definert noe sted.`;
  } else if (r.type === "lineær") {
    rader.push(["Definert for", "Alle x", "bred"]);
    rader.push(["Nullpunkt", r.nullpunkt !== undefined ? lik("x", r.nullpunkt) : r.m === 0 ? "Alle x" : "Ingen"]);
    rader.push(["Skjærer y-aksen i", `(0, ${tall(r.m, 2)})`]);
    rader.push(["Asymptoter", "Ingen", "bred"]);
    omskrevet = `f(x) = ${texPolynom([[r.k, "x"], [r.m, ""]])}`;
    melding = `<strong>c = 0:</strong> Da står det bare et tall i nevneren, og ${tex(omskrevet)} er en lineær funksjon. Grafen er en rett linje uten asymptoter.`;
  } else {
    rader.push(["Definert for", `x ≠ ${tall(r.xv, 2)}`]);
    rader.push(["ad − bc", tall(r.det, 4)]);
    if (r.type === "rasjonal") {
      rader.push(["Loddrett asymptote", lik("x", r.xv)]);
      rader.push(["Vannrett asymptote", lik("y", r.yv)]);
      rader.push(["Nullpunkt", r.nullpunkt !== undefined ? lik("x", r.nullpunkt) : "Ingen"]);
      rader.push(["Skjærer y-aksen i", r.yakse !== undefined ? `(0, ${tall(r.yakse, 2)})` : "Ingen (x = 0 er ikke med)"]);
      const v = r.venstreGrense > 0 ? "+∞" : "−∞", h = r.hoyreGrense > 0 ? "+∞" : "−∞";
      rader.push([`Når x → ${tall(r.xv, 2)}`, `fra venstre: f(x) → ${v}, fra høyre: f(x) → ${h}`, "bred"]);
      rader.push(["Når x → ±∞", `f(x) → ${tall(r.yv, 2)} (fra ${r.overForStor ? "oversiden" : "undersiden"} når x → +∞)`, "bred"]);
      const rest = rens(b - (a * d) / c);
      omskrevet = `f(x) = ${texT(r.yv)} + \\dfrac{${texT(rest)}}{${nevner}}`;
    } else {
      rader.push(["Grafen", `y = ${tall(r.yv, 2)} med et hull i x = ${tall(r.xv, 2)}`, "bred"]);
      rader.push(["Grenseverdi", `f(x) → ${tall(r.yv, 2)} når x → ${tall(r.xv, 2)}`, "bred"]);
      omskrevet = `f(x) = ${texT(r.yv)}, \\quad x \\neq ${texT(r.xv)}`;
      melding = `<strong>ad − bc = 0:</strong> Telleren er et tall ganger nevneren, så brøken kan forkortes. Da er ${tex(omskrevet)}. Grafen er en vannrett linje med et <em>hull</em> der nevneren er null. Funksjonen har ingen loddrett asymptote, men grenseverdien finnes: ${tex(`\\lim_{x \\to ${texT(r.xv)}} f(x) = ${texT(r.yv)}`)}.`;
    }
  }
  $("omskrevet").innerHTML = omskrevet && r.type === "rasjonal" ? tex(omskrevet) : "";
  $("omskrevet-blokk").hidden = r.type !== "rasjonal";
  $("grensetabell").innerHTML = r.type === "rasjonal" || r.type === "hull" ? grensetabell() : "";
  $("grense-blokk").hidden = !(r.type === "rasjonal" || r.type === "hull");
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);

  const sammendrag = r.type === "rasjonal"
    ? `Loddrett asymptote x = ${tall(r.xv)}. Vannrett asymptote y = ${tall(r.yv)}.`
    : r.type === "hull" ? `Konstant ${tall(r.yv)} med hull i x = ${tall(r.xv)}.`
      : r.type === "lineær" ? "Lineær funksjon, ingen asymptoter." : "Ikke definert for noen x.";
  ks.beskrivelse = `f(x) = (${tall(a)}x + ${tall(b)}) / (${tall(c)}x + ${tall(d)}). ${sammendrag}`;
  return sammendrag;
}

/** Funksjonsverdier rett til venstre og høyre for x = −d/c. */
function grensetabell() {
  const h = [0.1, 0.01, 0.001];
  const rad = (x) => `<tr><td>${tall(x, 4)}</td><td>${tall(rens(r.f(x), 8), 3)}</td></tr>`;
  return `<table class="liten-tabell"><caption class="visuelt-skjult">Verdier nær x = ${tall(r.xv, 2)}</caption>
    <thead><tr><th scope="col">x</th><th scope="col">f(x)</th></tr></thead>
    <tbody>${h.map((d) => rad(rens(r.xv - d))).join("")}<tr><td>${tall(r.xv, 4)}</td><td>ikke definert</td></tr>${[...h].reverse().map((d) => rad(rens(r.xv + d))).join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  const v = verdier(glidere);
  r = analyser(v.a, v.b, v.c, v.d);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand(v, sammendrag);
}

function settVerdier(ny) {
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  ks.tilbakestill();
  if (ny.tilpass || !$("utenfor").hidden) tilpass();
}

figurverktoy({ ks, svg, filnavn: "rasjonal-funksjon", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b", "c", "d", "tilpass"], [], settVerdier, glidere.a.glider);

oppdater(false);
if (!$("utenfor").hidden) tilpass();

window.mattelabRasjonal = { analyser, hent: () => r };
