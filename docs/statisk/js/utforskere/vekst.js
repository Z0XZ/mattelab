// Utforsker: eksponentiell og logistisk vekst
//   Eksponentiell: f(t) = N₀ · bᵗ, der b = 1 + p/100
//   Logistisk:     N(t) = K / (1 + c · e^(−rt)), der c = (K − N₀)/N₀ og r = ln b
// Med r = ln b vokser de to modellene nesten likt så lenge N er liten i forhold til K.
import { tall, tallOmtrent, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { texT } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/** Alt vi viser, som tall. Ren funksjon, lett å teste. */
export function analyser({ N0, p, K }) {
  const b = rens(1 + p / 100, 12);
  const r = Math.log(b);
  const eksp = (t) => N0 * Math.pow(b, t);
  const res = { N0, p, K, b, r, eksp };
  if (p > 0) res.dobling = Math.log(2) / r;
  if (p < 0) res.halvering = Math.log(0.5) / r;
  // Logistisk modell
  res.c = (K - N0) / N0;
  res.logi = (t) => K / (1 + res.c * Math.exp(-r * t));
  if (r > 0 && res.c > 0) {
    res.vendepunkt = Math.log(res.c) / r;
    res.maksVekstfart = (r * K) / 4;
  }
  return res;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { modus: "begge", N0: 10, p: 20, K: 200, t: 10 };
let modus = lesValg("modus", ["eksp", "logistisk", "begge"], STANDARD.modus);
const svg = $("graf");
const ks = new Koordinatsystem(svg, {
  xmin: -2, xmax: 30, ymin: -25, ymax: 250, likeEnheter: false, xnavn: "t", ynavn: "N", tittel: "Vekstmodellene",
});

const glidere = lagGlidere($("glidere"), [
  { navn: "N0", etikett: "<i>N<sub>0</sub></i>startverdi", beskrivelse: "N null, startverdien", min: 1, maks: 300, steg: 1, grense: [0.001, 1e6] },
  { navn: "p", etikett: "<i>p</i>prosent endring per tidsenhet", beskrivelse: "p, prosent endring per tidsenhet", min: -50, maks: 100, steg: 1, grense: [-99.9, 1000] },
  { navn: "K", etikett: "<i>K</i>bæreevne (logistisk)", beskrivelse: "K, bæreevnen i den logistiske modellen", min: 10, maks: 1000, steg: 1, grense: [0.001, 1e6] },
  { navn: "t", etikett: "<i>t</i>les av ved tiden", beskrivelse: "t, tiden der verdiene leses av", min: 0, maks: 50, steg: 0.5, grense: [0, 1000] },
], STANDARD, () => oppdater(true));

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; oppdater(true); });

let v, r;
const viserEksp = () => modus !== "logistisk";
const viserLogi = () => modus !== "eksp";

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (viserLogi()) {
    ks.vannrett(v.K, "g-asymptote");
    const py = ks.sy(v.K);
    if (py > 14 && py < ks.H - 6) ks.etikett(ks.B - 8, py, `K = ${tall(v.K, 2)}`, "ov-v").setAttribute("text-anchor", "end");
    if (r.vendepunkt !== undefined && r.vendepunkt >= 0) {
      ks.punkt(r.vendepunkt, v.K / 2, { klasse: "g-punkt-hul", etikett: `Vendepunkt (${tall(r.vendepunkt, 2)}, ${tall(v.K / 2, 2)})`, plass: "under" });
    }
  }
  const fraNull = (f) => (t) => (t >= 0 ? f(t) : NaN);
  if (viserEksp()) ks.funksjon(fraNull(r.eksp), "g-graf");
  if (viserLogi()) ks.funksjon(fraNull(r.logi), modus === "begge" ? "g-graf-2 g-stiplet" : "g-graf");
  ks.loddrett(v.t, "g-hjelp");
  if (viserEksp()) ks.punkt(v.t, r.eksp(v.t), { r: 5, etikett: modus === "begge" ? "" : `(${tall(v.t, 2)}, ${tall(r.eksp(v.t), 2)})` });
  if (viserLogi()) ks.punkt(v.t, r.logi(v.t), { klasse: "g-punkt-2", r: 5, etikett: modus === "begge" ? "" : `(${tall(v.t, 2)}, ${tall(r.logi(v.t), 2)})` });
};

function tilpass() {
  // Vis til omtrent tre doblinger etter vendepunktet, eller tre doblings- eller halveringstider.
  const tider = [10, v.t * 1.1];
  if (r.dobling) tider.push(3 * r.dobling);
  if (r.halvering) tider.push(4 * r.halvering);
  if (viserLogi() && r.vendepunkt > 0) tider.push(2 * r.vendepunkt);
  const T = Math.min(Math.max(...tider), 1000);
  const ys = [0, v.N0];
  if (viserLogi()) ys.push(v.K, r.logi(T));
  if (viserEksp()) ys.push(Math.min(r.eksp(T), viserLogi() ? 2.5 * Math.max(v.K, v.N0) : Infinity));
  const ymax = Math.max(...ys);
  tilpassVindu(ks, [[0, 0], [T, ymax]], 1, 1.12);
  // Litt plass under null og til venstre for t = 0, så aksene synes
  ks.settVindu({ xmin: -T * 0.06, xmax: T * 1.04, ymin: -ymax * 0.08, ymax: ymax * 1.1 });
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const b = r.b;
  const formler = [];
  if (viserEksp()) formler.push(`<p><span class="form-navn">Eksponentiell:</span> ${tex(`f(t) = ${texT(v.N0)} \\cdot ${texT(b, 4)}^{\\,t}`)}</p>`);
  if (viserLogi()) {
    const rTekst = texT(rens(r.r, 4), 4);
    formler.push(`<p><span class="form-navn">Logistisk:</span> ${tex(`N(t) = \\dfrac{${texT(v.K)}}{1 ${r.c < 0 ? "-" : "+"} ${texT(Math.abs(rens(r.c, 4)), 4)}\\, e^{-${rTekst.startsWith("-") ? `(${rTekst})` : rTekst}\\, t}}`)}</p>`);
  }
  $("formler").innerHTML = formler.join("");

  const rader = [];
  rader.push(["Vekstfaktor", lik("b", b, 4)]);
  rader.push(["Endring per tidsenhet", `${v.p > 0 ? "+" : ""}${tall(v.p, 2)} %`]);
  if (r.dobling) rader.push(["Doblingstid", lik("T", r.dobling)]);
  else if (r.halvering) rader.push(["Halveringstid", lik("T", r.halvering)]);
  else rader.push(["Dobling/halvering", "Ingen (p = 0)"]);
  if (viserEksp()) rader.push([`f(${tall(v.t, 2)})`, tallOmtrent(r.eksp(v.t))]);
  if (viserLogi()) {
    rader.push([`N(${tall(v.t, 2)})`, tallOmtrent(r.logi(v.t))]);
    rader.push(["Bæreevne", lik("K", v.K)]);
    rader.push(["Vendepunkt", r.vendepunkt !== undefined ? (r.vendepunkt >= 0 ? `${lik("t", r.vendepunkt)}, N = ${tall(v.K / 2, 2)}` : "Før t = 0") : "Ingen"]);
  }
  visVerdier($("verdier"), rader);
  $("tabell").innerHTML = lagTabell();

  let melding = "";
  if (v.p === 0) melding = "<strong>p = 0:</strong> Vekstfaktoren er 1. Verdien endres ikke, og grafen er vannrett.";
  else if (v.p < 0 && viserLogi()) melding = "<strong>p &lt; 0:</strong> Med negativ vekst minker begge modellene mot null. Bæreevnen spiller da ingen rolle.";
  else if (viserLogi() && v.N0 > v.K) melding = "<strong>Startverdien er over bæreevnen:</strong> Da avtar den logistiske modellen mot K. Det er for mange individer til at miljøet kan bære dem.";
  else if (viserLogi() && v.N0 === v.K) melding = "<strong>N₀ = K:</strong> Startverdien er lik bæreevnen. Den logistiske modellen står stille.";
  visMelding($("melding"), melding);

  const deler = [`Startverdi ${tall(v.N0)}, endring ${tall(v.p)} prosent per tidsenhet.`];
  if (viserEksp()) deler.push(`Eksponentiell modell ved t = ${tall(v.t)}: ${tall(r.eksp(v.t))}.`);
  if (viserLogi()) deler.push(`Logistisk modell ved t = ${tall(v.t)}: ${tall(r.logi(v.t))}.`);
  const sammendrag = deler.join(" ");
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

function lagTabell() {
  const steg = r.dobling ? Math.max(1, Math.round(r.dobling)) : r.halvering ? Math.max(1, Math.round(r.halvering)) : 5;
  const ts = [0, 1, 2, 3, 4, 5].map((i) => i * steg);
  const kol = [["t", (t) => tall(t)]];
  if (viserEksp()) kol.push(["f(t)", (t) => tall(r.eksp(t), 2)]);
  if (viserLogi()) kol.push(["N(t)", (t) => tall(r.logi(t), 2)]);
  return `<table class="liten-tabell"><caption class="visuelt-skjult">Verditabell</caption>
    <thead><tr>${kol.map(([n]) => `<th scope="col">${n}</th>`).join("")}</tr></thead>
    <tbody>${ts.map((t) => `<tr>${kol.map(([, f]) => `<td>${f(t)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  modusVelger.value = modus;
  glidere.K.element.hidden = modus === "eksp";
  $("forklaring-begge").hidden = modus !== "begge";
  v = verdier(glidere);
  r = analyser(v);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ modus, ...v }, sammendrag);
}

function settVerdier(ny) {
  if (ny.modus) modus = ny.modus;
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  tilpass();
}

figurverktoy({ ks, svg, filnavn: "vekst", tilpass, tilbakestill: () => { settVerdier(STANDARD); ks.tilbakestill(); } });
oppsettlenker(["N0", "p", "K", "t"], ["modus"], settVerdier, modusVelger);

oppdater(false);
if (new URLSearchParams(location.search).size) tilpass();

window.mattelabVekst = { analyser, hent: () => r };
