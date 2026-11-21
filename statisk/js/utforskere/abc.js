// Utforsker: abc-formelen og grafen.
//   x = (−b ± √(b² − 4ac)) / 2a = −b/2a ± √D/2a
// Grafen viser symmetrilinjen x = −b/2a og to piler med lengde √D/2a ut til nullpunktene.
import { tall, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, tilpassVindu,
} from "../utforsker.js";
import { texPolynom, texT, texP, erLik } from "../matte.js";
import { analyser } from "./andregrad-matte.js";

// ------------------------------------------------------------------ matematikk

/** Alt vi viser. Bygger på analyser() fra andregradsfunksjonen. Ren funksjon. */
export function abc(a, b, c) {
  const r = analyser(a, b, c);
  if (r.type === "andregrad") {
    r.avstand = r.D >= 0 ? rens(Math.sqrt(r.D) / Math.abs(2 * a)) : null;
    r.antall = r.D > 0 ? 2 : r.D === 0 ? 1 : 0;
  }
  return r;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: -2, c: -3 };
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -6, xmax: 6, ymin: -6, ymax: 6, tittel: "Grafen til andregradsfunksjonen" });

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>tallet foran x²", beskrivelse: "a, tallet foran x i andre", min: -5, maks: 5, steg: 0.5, desimaler: 2, grense: [-100, 100] },
  { navn: "b", etikett: "<i>b</i>tallet foran x", beskrivelse: "b, tallet foran x", min: -10, maks: 10, steg: 0.5, desimaler: 2, grense: [-1000, 1000] },
  { navn: "c", etikett: "<i>c</i>konstantleddet", beskrivelse: "c, konstantleddet", min: -10, maks: 10, steg: 0.5, desimaler: 2, grense: [-1000, 1000] },
], STANDARD, () => oppdater(true));

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  const { a, b, c } = verdier(glidere);
  ks.funksjon((x) => a * x * x + b * x + c);
  if (r.type !== "andregrad") {
    for (const x of r.nullpunkter) ks.punkt(x, 0, { etikett: lik("x", x) });
    return;
  }
  ks.loddrett(r.xs, "g-hjelp");
  if (r.antall === 2) {
    const etikett = "√D / 2|a|";
    for (const x of r.nullpunkter) ks.pil(r.xs, 0, x, 0, { klasse: "g-vektor-2", etikett: x === r.nullpunkter[1] ? etikett : "", side: a > 0 ? 1 : -1 });
  }
  ks.punkt(r.xs, 0, { klasse: "g-punkt-2", r: 4, etikett: lik("x", r.xs), plass: a > 0 ? "ov" : "under" });
  for (const x of r.nullpunkter) if (r.antall === 2) ks.punkt(x, 0, { etikett: "", r: 6 });
};

function tilpass() {
  const pkt = [[r.xs ?? 0, r.ys ?? r.c], [0, r.c], ...r.nullpunkter.map((x) => [x, 0])];
  tilpassVindu(ks, pkt, 4);
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, b, c } = verdier(glidere);
  const uttrykk = texPolynom([[a, "x^2"], [b, "x"], [c, ""]]);
  $("forskrift").innerHTML = tex(`${uttrykk} = 0`);
  $("formel").innerHTML = tex("x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", true);
  const rader = [];
  let utregning = "", melding = "";
  if (r.type === "andregrad") {
    const D = r.D;
    utregning = `<p>${tex(`b^2 - 4ac = ${texP(b)}^2 - 4 \\cdot ${texP(a)} \\cdot ${texP(c)} = ${texT(D)}`)}</p>`;
    if (D >= 0) {
      utregning += `<p>${tex(`x = \\dfrac{${texT(-b)} \\pm \\sqrt{${texT(D)}}}{${texT(2 * a)}}`)}</p>`;
      utregning += `<p>${tex(r.antall === 2
        ? `x ${erLik(r.nullpunkter[0])} ${texT(r.nullpunkter[0])} \\quad \\text{eller} \\quad x ${erLik(r.nullpunkter[1])} ${texT(r.nullpunkter[1])}`
        : `x ${erLik(r.nullpunkter[0])} ${texT(r.nullpunkter[0])}`)}</p>`;
    }
    rader.push(["b² − 4ac", tall(D, 4)]);
    rader.push(["Antall løsninger", String(r.antall)]);
    rader.push(["Symmetrilinje", lik("x", r.xs)]);
    rader.push(["Avstand til nullpunktene", r.antall === 2 ? `√D / 2|a| ${Math.abs(r.avstand - Number(r.avstand.toFixed(2))) > 1e-9 ? "≈" : "="} ${tall(r.avstand, 2)}` : r.antall === 1 ? "0" : "–"]);
    rader.push(["Løsninger", r.antall === 0 ? "Ingen" : r.nullpunkter.map((x) => lik("x", x)).join(" og "), "bred"]);
    if (D < 0) melding = `<strong>b² − 4ac &lt; 0:</strong> Vi kan ikke ta kvadratroten av et negativt tall. Likningen har ingen løsning, og grafen skjærer ikke x-aksen.`;
    else if (D === 0) melding = `<strong>b² − 4ac = 0:</strong> Da er ${tex("\\pm \\sqrt{0} = 0")}, og de to løsningene faller sammen. Grafen berører x-aksen i bunnpunktet eller toppunktet.`;
  } else {
    rader.push(["Løsninger", r.type === "lineær" ? lik("x", r.nullpunkter[0]) : r.type === "null" ? "Alle x" : "Ingen", "bred"]);
    melding = `<strong>a = 0:</strong> Da er det ingen ${tex("x^2")}-ledd, og likningen er ikke en andregradslikning. abc-formelen kan ikke brukes, fordi vi ville delt på ${tex("2a = 0")}. ${r.type === "lineær" ? `Løs ${tex(`${texPolynom([[b, "x"], [c, ""]])} = 0`)} direkte.` : ""}`;
  }
  $("utregning").innerHTML = utregning;
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  const sammendrag = r.type === "andregrad"
    ? `${tall(a)}x² + ${tall(b)}x + ${tall(c)} = 0. b² − 4ac = ${tall(r.D, 4)}. ${r.antall === 0 ? "Ingen løsning." : "Løsninger: " + r.nullpunkter.map((x) => tall(x, 2)).join(" og ") + "."}`
    : `a = 0. Likningen er ikke en andregradslikning.`;
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  const { a, b, c } = verdier(glidere);
  r = abc(a, b, c);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand(verdier(glidere), sammendrag);
}

function settVerdier(v) {
  for (const n of ["a", "b", "c"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
  if (v.tilpass) tilpass(); else ks.tilbakestill();
}

figurverktoy({ ks, svg, filnavn: "abc-formelen", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b", "c", "tilpass"], [], settVerdier, $("glidere").querySelector("input"));
oppdater(false);

window.mattelabAbc = { abc };
