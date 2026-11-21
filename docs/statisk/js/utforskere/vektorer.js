// Utforsker: vektorer i planet
//   Lineærkombinasjon: w = s·u + t·v, med lengder, skalarprodukt og vinkel
//   Parameterframstilling: (x, y) = P + t·r
import { tall, tallOmtrent, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { texT, texP, texPolynom } from "../matte.js";

// ------------------------------------------------------------------ matematikk

export const prikk = (u, v) => rens(u[0] * v[0] + u[1] * v[1]);
export const lengde = (u) => Math.hypot(u[0], u[1]);
/** Determinanten u₁v₂ − u₂v₁ er null nøyaktig når vektorene er parallelle (eller en er nullvektoren). */
export const det = (u, v) => rens(u[0] * v[1] - u[1] * v[0]);

/** Vinkelen mellom u og v i grader, eller null når en av dem er nullvektoren. */
export function vinkel(u, v) {
  const l = lengde(u) * lengde(v);
  if (l === 0) return null;
  // Parallelle vektorer: nøyaktig 0° eller 180°, uten avrundingsstøy fra arccos
  if (det(u, v) === 0) return prikk(u, v) > 0 ? 0 : 180;
  return (Math.acos(Math.max(-1, Math.min(1, prikk(u, v) / l))) * 180) / Math.PI;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "kombinasjon", u1: 3, u2: 1, v1: 1, v2: 2, s: 1, t: 1, x0: 1, y0: 2, r1: 2, r2: 1 };
let modus = lesValg("modus", ["kombinasjon", "parameter"], STANDARD.modus);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -3, xmax: 9, ymin: -2, ymax: 7, tittel: "Vektorene i koordinatsystemet" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const kort = (navn, tekst, min, maks, steg = 0.5) => ({ navn, etikett: tekst, beskrivelse: tekst.replace(/<[^>]+>/g, ""), min, maks, steg, grense: [-1000, 1000] });
const glidere = {
  ...lagGlidere($("glidere-kombinasjon"), [
    kort("u1", "<i>u<sub>1</sub></i>x-koordinat til u", -8, 8),
    kort("u2", "<i>u<sub>2</sub></i>y-koordinat til u", -8, 8),
    kort("v1", "<i>v<sub>1</sub></i>x-koordinat til v", -8, 8),
    kort("v2", "<i>v<sub>2</sub></i>y-koordinat til v", -8, 8),
    kort("s", "<i>s</i>tallet foran u", -3, 3, 0.1),
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-parameter"), [
    kort("x0", "<i>x<sub>0</sub></i>startpunkt P, x", -8, 8),
    kort("y0", "<i>y<sub>0</sub></i>startpunkt P, y", -8, 8),
    kort("r1", "<i>r<sub>1</sub></i>retningsvektor, x", -8, 8),
    kort("r2", "<i>r<sub>2</sub></i>retningsvektor, y", -8, 8),
  ], STANDARD, () => oppdater(true)),
  ...lagGlidere($("glider-t"), [kort("t", "<i>t</i>parameter / tallet foran v", -5, 5, 0.1)], STANDARD, () => oppdater(true)),
};

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; oppdater(true); ks.tilbakestill(); tilpass(); });

let v;
const U = () => [v.u1, v.u2], V = () => [v.v1, v.v2];

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (modus === "kombinasjon") {
    const u = U(), w = V();
    const su = [v.s * u[0], v.s * u[1]], tv = [v.t * w[0], v.t * w[1]];
    const sum = [su[0] + tv[0], su[1] + tv[1]];
    const ut = det(u, w) >= 0 ? 1 : -1;
    if (visValg.parallellogram.checked) {
      ks.mangekant([[0, 0], su, sum, tv], "g-fyll-3");
      // s·u og t·v satt etter hverandre
      ks.pil(su[0], su[1], sum[0], sum[1], { klasse: "g-vektor-svak" });
      ks.pil(tv[0], tv[1], sum[0], sum[1], { klasse: "g-vektor-svak" });
      if (v.s !== 1) ks.pil(0, 0, su[0], su[1], { klasse: "g-vektor-svak", etikett: `${koef(v.s)}u`, side: -ut });
      if (v.t !== 1) ks.pil(0, 0, tv[0], tv[1], { klasse: "g-vektor-svak", etikett: `${koef(v.t)}v`, side: ut });
    }
    // Etikettene til u og v legges på utsiden av parallellogrammet
    ks.pil(0, 0, u[0], u[1], { klasse: "g-vektor", etikett: "u", side: ut });
    ks.pil(0, 0, w[0], w[1], { klasse: "g-vektor-2", etikett: "v", side: -ut });
    ks.pil(0, 0, sum[0], sum[1], { klasse: "g-vektor-3", etikett: "w", side: det(u, w) >= 0 ? 1 : -1 });
  } else {
    const r = [v.r1, v.r2], P = [v.x0, v.y0];
    if (r[0] === 0 && r[1] === 0) {
      ks.punkt(P[0], P[1], { etikett: "P" });
      return;
    }
    // Linja tegnes over hele vinduet
    const L = 4 * (ks.xmax - ks.xmin + ks.ymax - ks.ymin) / lengde(r);
    ks.linje(P[0] - L * r[0], P[1] - L * r[1], P[0] + L * r[0], P[1] + L * r[1], "g-graf");
    if (visValg.retning.checked) ks.pil(P[0], P[1], P[0] + r[0], P[1] + r[1], { klasse: "g-vektor-2", etikett: "r", side: 1 });
    const Q = [P[0] + v.t * r[0], P[1] + v.t * r[1]];
    if (visValg.retning.checked && v.t !== 0) ks.pil(P[0], P[1], Q[0], Q[1], { klasse: "g-vektor-svak", etikett: `${koef(v.t)}r`, side: -1 });
    ks.punkt(P[0], P[1], { klasse: "g-punkt-hul", etikett: "P", r: 5, plass: "under-v" });
    ks.punkt(Q[0], Q[1], { etikett: `t = ${tall(v.t)}: (${tall(Q[0], 2)}, ${tall(Q[1], 2)})` });
  }
};

function tilpass() {
  const pkt = [[0, 0]];
  if (modus === "kombinasjon") {
    const u = U(), w = V();
    const su = [v.s * u[0], v.s * u[1]], tv = [v.t * w[0], v.t * w[1]];
    pkt.push(u, w, su, tv, [su[0] + tv[0], su[1] + tv[1]]);
  } else {
    pkt.push([v.x0, v.y0], [v.x0 + v.r1, v.y0 + v.r2], [v.x0 + v.t * v.r1, v.y0 + v.t * v.r2]);
  }
  tilpassVindu(ks, pkt, 4, 1.25);
}

// ------------------------------------------------------------------ tekst og verdier

/** Tallet foran en vektor: 1 skrives ikke, og −1 blir bare «−». */
const koef = (k) => (k === 1 ? "" : k === -1 ? "−" : tall(k));
const texVektor = (x, y) => `[${texT(x)}, ${texT(y)}]`;

function oppdaterTekst() {
  const rader = [];
  let melding = "", formler = "";
  if (modus === "kombinasjon") {
    const u = U(), w = V();
    const sum = [rens(v.s * u[0] + v.t * w[0]), rens(v.s * u[1] + v.t * w[1])];
    const lu = lengde(u), lv = lengde(w), up = prikk(u, w), vk = vinkel(u, w), d = det(u, w);
    formler = `<p>${tex(`\\vec u = ${texVektor(...u)}, \\quad \\vec v = ${texVektor(...w)}`)}</p>`
      + `<p>${tex(`\\vec w = ${texPolynom([[v.s, "\\vec u"], [v.t, "\\vec v"]])} = ${texVektor(...sum)}`)}</p>`
      + `<p>${tex(`\\vec u \\cdot \\vec v = ${texT(u[0])} \\cdot ${texP(w[0])} + ${texP(u[1])} \\cdot ${texP(w[1])} = ${texT(up)}`)}</p>`
      + (vk !== null ? `<p>${tex(`\\cos \\theta = \\dfrac{\\vec u \\cdot \\vec v}{|\\vec u|\\,|\\vec v|} = \\dfrac{${texT(up)}}{${texT(rens(lu, 6), 3)} \\cdot ${texT(rens(lv, 6), 3)}}`)}</p>` : "");
    rader.push(["w = su + tv", `[${tall(sum[0], 2)}, ${tall(sum[1], 2)}]`]);
    rader.push(["|u|", tallOmtrent(lu, 3)], ["|v|", tallOmtrent(lv, 3)], ["|w|", tallOmtrent(lengde(sum), 3)]);
    rader.push(["u · v", tall(up, 3)]);
    rader.push(["Vinkel mellom u og v", vk === null ? "Ikke definert" : `${lik("θ", vk, 2)}°`]);
    rader.push(["Parallelle?", d === 0 ? "Ja (u₁v₂ − u₂v₁ = 0)" : `Nei (u₁v₂ − u₂v₁ = ${tall(d, 2)})`, "bred"]);
    rader.push(["Ortogonale?", up === 0 && vk !== null ? "Ja (u · v = 0)" : "Nei", "bred"]);
    if (vk === null) melding = "<strong>Nullvektor:</strong> En vektor med lengde 0 har ingen retning. Da er vinkelen mellom vektorene ikke definert, og skalarproduktet blir 0.";
    else if (d === 0) melding = `<strong>Parallelle vektorer:</strong> Den ene er et tall ganger den andre. Da ligger alle lineærkombinasjoner ${tex("s\\vec u + t\\vec v")} på én linje gjennom origo, og vi når ikke hele planet.`;
    else if (up === 0) melding = `<strong>Ortogonale vektorer:</strong> ${tex("\\vec u \\cdot \\vec v = 0")}, så vektorene står vinkelrett på hverandre.`;
  } else {
    const r = [v.r1, v.r2], P = [v.x0, v.y0];
    const Q = [rens(P[0] + v.t * r[0]), rens(P[1] + v.t * r[1])];
    formler = `<p>${tex(`\\ell: \\begin{cases} x = ${texPolynom([[v.x0, ""], [v.r1, "t"]])} \\\\ y = ${texPolynom([[v.y0, ""], [v.r2, "t"]])} \\end{cases}`)}</p>`;
    if (r[0] !== 0) {
      const a = rens(r[1] / r[0]), b = rens(P[1] - a * P[0]);
      formler += `<p>Uten parameter: ${tex(`y = ${texPolynom([[a, "x"], [b, ""]])}`)}</p>`;
    } else if (r[1] !== 0) formler += `<p>Uten parameter: ${tex(`x = ${texT(P[0])}`)} (loddrett linje)</p>`;
    rader.push(["Punkt for t", `(${tall(Q[0], 2)}, ${tall(Q[1], 2)})`]);
    rader.push(["Retningsvektor", `[${tall(r[0], 2)}, ${tall(r[1], 2)}]`]);
    rader.push(["|r| (fart)", tallOmtrent(lengde(r), 3)]);
    if (r[0] === 0 && r[1] === 0) melding = "<strong>r er nullvektoren:</strong> Da står punktet stille i P for alle t. Vi får ikke en linje. En retningsvektor kan ikke være nullvektoren.";
  }
  $("formler").innerHTML = formler;
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  const sammendrag = rader.map(([dt, dd]) => `${dt}: ${dd}`).slice(0, 3).join(". ") + ".";
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  modusVelger.value = modus;
  $("glidere-kombinasjon").hidden = modus !== "kombinasjon";
  $("glidere-parameter").hidden = modus !== "parameter";
  $("visvalg-kombinasjon").hidden = modus !== "kombinasjon";
  $("visvalg-parameter").hidden = modus !== "parameter";
  v = verdier(glidere);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) {
    const navn = modus === "kombinasjon" ? ["u1", "u2", "v1", "v2", "s", "t"] : ["x0", "y0", "r1", "r2", "t"];
    delTilstand({ modus, ...Object.fromEntries(navn.map((n) => [n, v[n]])) }, sammendrag);
  }
}

function settVerdier(ny) {
  if (ny.modus) modus = ny.modus;
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  tilpass();
}

figurverktoy({ ks, svg, filnavn: "vektorer", tilpass, tilbakestill: () => { settVerdier(STANDARD); ks.tilbakestill(); } });
oppsettlenker(["u1", "u2", "v1", "v2", "s", "t", "x0", "y0", "r1", "r2"], ["modus"], settVerdier, modusVelger);

oppdater(false);
if (new URLSearchParams(location.search).size) tilpass();

window.mattelabVektorer = { prikk, lengde, vinkel, det, hent: () => v };
