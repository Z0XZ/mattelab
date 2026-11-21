// Utforsker: lineær funksjon f(x) = ax + b
import { tall, tallOmtrent, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker,
  delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { texPolynom, texT, texP } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/**
 * Finn linja ut fra modus.
 *  - «ab»: f(x) = ax + b direkte.
 *  - «punkter»: linja gjennom (x1, y1) og (x2, y2).
 * type: «funksjon», «loddrett» (x1 = x2, y1 ≠ y2) eller «samme» (to like punkter).
 */
export function analyser(modus, v) {
  if (modus === "ab") return lagFunksjon(v.a, v.b);
  const dx = rens(v.x2 - v.x1), dy = rens(v.y2 - v.y1);
  if (dx === 0) return { type: dy === 0 ? "samme" : "loddrett", dx, dy, x0: v.x1 };
  const a = rens(dy / dx);
  return { ...lagFunksjon(a, rens(v.y1 - a * v.x1)), dx, dy };
}

function lagFunksjon(a, b) {
  const r = { type: "funksjon", a, b };
  if (a !== 0) r.nullpunkt = rens(-b / a);
  r.f = (x) => a * x + b;
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "ab", a: 0.5, b: 1, x1: 1, y1: 2, x2: 4, y2: 8 };
let modus = lesValg("modus", ["ab", "punkter"], STANDARD.modus);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -8, xmax: 8, ymin: -6, ymax: 6, tittel: "Grafen til den lineære funksjonen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = {
  ...lagGlidere($("glidere-ab"), [
    { navn: "a", etikett: "<i>a</i>stigningstall", beskrivelse: "a, stigningstallet", min: -5, maks: 5, grense: [-100, 100] },
    { navn: "b", etikett: "<i>b</i>konstantledd", beskrivelse: "b, konstantleddet", min: -10, maks: 10, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-punkter"), [
    { navn: "x1", etikett: "<i>x<sub>1</sub></i>", beskrivelse: "x-koordinaten til punkt 1", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "y1", etikett: "<i>y<sub>1</sub></i>", beskrivelse: "y-koordinaten til punkt 1", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "x2", etikett: "<i>x<sub>2</sub></i>", beskrivelse: "x-koordinaten til punkt 2", min: -10, maks: 10, grense: [-1000, 1000] },
    { navn: "y2", etikett: "<i>y<sub>2</sub></i>", beskrivelse: "y-koordinaten til punkt 2", min: -10, maks: 10, grense: [-1000, 1000] },
  ], STANDARD, () => oppdater(true)),
};

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { settModus(modusVelger.value); oppdater(true); });

function settModus(m) {
  modus = m;
  modusVelger.value = m;
  $("glidere-ab").hidden = m !== "ab";
  $("glidere-punkter").hidden = m !== "punkter";
}

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  const v = verdier(glidere);
  if (r.type === "loddrett") {
    ks.loddrett(r.x0, "g-graf");
  } else if (r.type === "funksjon") {
    if (visValg.trekant.checked) tegnTrekant(v);
    ks.funksjon(r.f);
    if (visValg.punkter.checked) {
      ks.punkt(0, r.b, { klasse: "g-punkt-hul", etikett: `(0, ${tall(r.b, 2)})`, r: 5, plass: r.a > 0 ? "ov-v" : "ov" });
      if (r.nullpunkt !== undefined && r.nullpunkt !== 0) {
        ks.punkt(r.nullpunkt, 0, { klasse: "g-punkt-2", etikett: `(${tall(r.nullpunkt, 2)}, 0)`, plass: r.a > 0 ? "under" : "ov" });
      }
    }
  }
  if (modus === "punkter") {
    ks.punkt(v.x1, v.y1, { etikett: `P₁(${tall(v.x1, 2)}, ${tall(v.y1, 2)})`, plass: "ov-v" });
    ks.punkt(v.x2, v.y2, { etikett: `P₂(${tall(v.x2, 2)}, ${tall(v.y2, 2)})`, plass: "ov" });
  }
};

/** Stigningstrekanten: ett steg bortover (eller fra P₁ til P₂) og så opp eller ned. */
function tegnTrekant(v) {
  let xa, xb, bort, opp;
  if (modus === "punkter") {
    xa = v.x1; xb = v.x2; bort = `Δx = ${tall(r.dx, 2)}`; opp = `Δy = ${tall(r.dy, 2)}`;
  } else {
    xa = 1; xb = 2; bort = "1"; opp = `a = ${tall(r.a, 2)}`;
  }
  const ya = r.f(xa), yb = r.f(xb);
  ks.mangekant([[xa, ya], [xb, ya], [xb, yb]], "g-fyll");
  ks.linje(xa, ya, xb, ya, "g-hjelp");
  ks.linje(xb, ya, xb, yb, "g-hjelp");
  const pxMidt = ks.sx((xa + xb) / 2), pyBunn = ks.sy(ya);
  const t1 = ks.etikett(pxMidt, pyBunn, bort, yb > ya ? "under" : "ov");
  t1.setAttribute("text-anchor", "middle"); t1.setAttribute("x", pxMidt);
  if (Math.abs(ks.sy(yb) - ks.sy(ya)) > 4) {
    const t2 = ks.etikett(ks.sx(xb), (ks.sy(ya) + ks.sy(yb)) / 2 + 14, opp, xb > xa ? "ov" : "ov-v");
    t2.setAttribute("y", (ks.sy(ya) + ks.sy(yb)) / 2 + 5);
  }
}

function tilpass() {
  const v = verdier(glidere);
  const pkt = [];
  if (r.type === "funksjon") {
    pkt.push([0, r.b]);
    if (r.nullpunkt !== undefined) pkt.push([r.nullpunkt, 0]);
  } else pkt.push([r.x0, 0]);
  if (modus === "punkter") pkt.push([v.x1, v.y1], [v.x2, v.y2]);
  tilpassVindu(ks, pkt);
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const v = verdier(glidere);
  const rader = [];
  let melding = "";
  if (r.type === "funksjon") {
    const { a, b } = r;
    $("forskrift").innerHTML = tex(`f(x) = ${texPolynom([[a, "x"], [b, ""]])}`);
    if (modus === "punkter") {
      $("former").innerHTML = `<p>${tex(`a = \\frac{\\Delta y}{\\Delta x} = \\frac{${texT(v.y2)} - ${texP(v.y1)}}{${texT(v.x2)} - ${texP(v.x1)}} = \\frac{${texT(r.dy)}}{${texT(r.dx)}}`)}</p>`;
    } else $("former").innerHTML = "";
    rader.push(["Stigningstall", lik("a", a)]);
    rader.push(["Konstantledd", lik("b", b)]);
    rader.push(["Grafen", a > 0 ? "Stiger (a > 0)" : a < 0 ? "Synker (a < 0)" : "Vannrett (a = 0)"]);
    rader.push(["Skjærer y-aksen i", `(0, ${tallOmtrent(b)})`]);
    rader.push(["Nullpunkt", a !== 0 ? lik("x", r.nullpunkt) : b === 0 ? "Alle x" : "Ingen"]);
    rader.push(["Når x øker med 1", a === 0 ? "endres ikke f(x)" : `${a > 0 ? "øker" : "minker"} f(x) med ${tall(Math.abs(a), 2)}`]);
    $("representasjoner").hidden = false;
    $("tekstform").textContent = beskrivMedOrd(a, b);
    $("tabell").innerHTML = lagTabell(r.f);
    if (a === 0) melding = `<strong>a = 0:</strong> Grafen er vannrett. Funksjonen er konstant, ${tex(`f(x) = ${texT(b)}`)}. ${b === 0 ? "Grafen ligger oppå x-aksen, så alle x er nullpunkter." : "Den har ingen nullpunkter, fordi grafen aldri treffer x-aksen."}`;
  } else {
    $("forskrift").innerHTML = r.type === "loddrett" ? tex(`x = ${texT(r.x0)}`) : "Ingen entydig linje";
    $("former").innerHTML = `<p>${tex(`a = \\frac{\\Delta y}{\\Delta x} = \\frac{${texT(r.dy)}}{0}`)} finnes ikke.</p>`;
    $("representasjoner").hidden = true;
    rader.push(["Stigningstall", "Finnes ikke (Δx = 0)", "bred"]);
    if (r.type === "loddrett") {
      melding = `<strong>x₁ = x₂:</strong> Linja er loddrett, ${tex(`x = ${texT(r.x0)}`)}. Den er <em>ikke</em> grafen til en funksjon, fordi én x-verdi hører til mange y-verdier. Stigningstallet finnes ikke, fordi vi ville delt på ${tex("\\Delta x = 0")}.`;
    } else {
      melding = "<strong>To like punkter:</strong> Uendelig mange linjer går gjennom ett punkt. Vi trenger to <em>ulike</em> punkter for å bestemme en linje.";
    }
  }
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);

  const sammendrag = r.type === "funksjon"
    ? `f(x) = ${tall(r.a)}x + ${tall(r.b)}. Stigningstall ${tall(r.a)}, konstantledd ${tall(r.b)}.`
    : r.type === "loddrett" ? `Loddrett linje x = ${tall(r.x0)}. Ikke en funksjon.` : "To like punkter. Ingen entydig linje.";
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

function beskrivMedOrd(a, b) {
  const start = `Når x = 0, er f(x) = ${tall(b, 2)}.`;
  if (a === 0) return `${start} Verdien er den samme for alle x.`;
  return `${start} For hver gang x øker med 1, ${a > 0 ? "øker" : "minker"} f(x) med ${tall(Math.abs(a), 2)}.`;
}

function lagTabell(f) {
  const xs = [-2, -1, 0, 1, 2, 3];
  return `<table class="liten-tabell"><caption class="visuelt-skjult">Verditabell</caption>
    <tr><th scope="row">x</th>${xs.map((x) => `<td>${tall(x)}</td>`).join("")}</tr>
    <tr><th scope="row">f(x)</th>${xs.map((x) => `<td>${tall(rens(f(x)), 2)}</td>`).join("")}</tr></table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  r = analyser(modus, verdier(glidere));
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ modus, ...verdier(glidere) }, sammendrag);
}

function settVerdier(v) {
  settModus(v.modus || "ab");
  for (const [n, g] of Object.entries(glidere)) if (n in v) g.sett(v[n]);
  oppdater(true);
  ks.tilbakestill();
  if (v.tilpass) tilpass();
}

figurverktoy({ ks, svg, filnavn: "lineaer-funksjon", tilpass, tilbakestill: () => { settVerdier(STANDARD); } });
oppsettlenker(["a", "b", "x1", "y1", "x2", "y2", "tilpass"], ["modus"], settVerdier, modusVelger);

settModus(modus);
oppdater(false);

window.mattelabLineaer = { analyser, hent: () => r };
