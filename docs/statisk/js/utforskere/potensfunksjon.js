// Utforsker: potensfunksjoner og rotfunksjoner f(x) = a · x^b
import { tall, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker,
  delTilstand, lesValg, tilpassVindu,
} from "../utforsker.js";
import { texT, texKoeffisient } from "../matte.js";

// ------------------------------------------------------------------ matematikk

// Eksponentene som kan velges, som brøk [teller, nevner] i laveste ledd.
export const EKSPONENTER = {
  "-2": [-2, 1], "-1": [-1, 1], "-1/2": [-1, 2], "1/3": [1, 3], "1/2": [1, 2],
  "1": [1, 1], "3/2": [3, 2], "2": [2, 1], "3": [3, 1],
};

/**
 * Analyser f(x) = a · x^(p/q).
 *  - q partall (kvadratrot): bare x ≥ 0 (x > 0 når p < 0).
 *  - q oddetall: alle x (tredjerota av et negativt tall er negativ), men x ≠ 0 når p < 0.
 */
export function analyser(a, bTekst) {
  const [p, q] = EKSPONENTER[bTekst];
  const b = p / q;
  const r = { a, bTekst, p, q, b };
  r.f = (x) => {
    if (x === 0) return p < 0 ? NaN : p === 0 ? a : 0;
    if (x < 0) {
      if (q % 2 === 0) return NaN;
      const s = Math.abs(x) ** b;
      return a * (p % 2 === 0 ? s : -s);
    }
    return a * x ** b;
  };
  r.domene = q % 2 === 0 ? (p < 0 ? "x > 0" : "x ≥ 0") : (p < 0 ? "x ≠ 0" : "alle x");
  r.gjennomOrigo = p > 0;
  r.asymptoter = p < 0;
  // For x > 0: f vokser når a og b har samme fortegn
  r.voksende = a === 0 ? 0 : Math.sign(a) * Math.sign(b);
  return r;
}

/** Skriv x^b på rotform når det går: x^{1/2} = √x, x^{−1} = 1/x. */
export function texRotform(p, q) {
  const rot = q === 1 ? "" : q === 2 ? "\\sqrt{x}" : `\\sqrt[${q}]{x}`;
  const ap = Math.abs(p);
  let teller;
  if (q === 1) teller = ap === 1 ? "x" : `x^{${ap}}`;
  else if (ap === 1) teller = rot;
  else if (ap === 3 && q === 2) teller = "x\\sqrt{x}";
  else teller = `\\sqrt[${q}]{x^{${ap}}}`;
  return p < 0 ? `\\dfrac{1}{${teller}}` : teller;
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: "1/2" };
let bTekst = lesValg("b", Object.keys(EKSPONENTER), STANDARD.b);
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -4, xmax: 8, ymin: -3, ymax: 6, tittel: "Grafen til potensfunksjonen" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>tallet foran", beskrivelse: "a, tallet foran potensen", min: -5, maks: 5, steg: 0.01, grense: [-1000, 1000] },
], STANDARD, () => oppdater(true));

const bVelger = $("eksponent");
bVelger.value = bTekst;
bVelger.addEventListener("change", () => { bTekst = bVelger.value; oppdater(true); });

let r;

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  if (visValg.linje.checked) ks.funksjon((x) => x, "g-graf-3");
  if (visValg.asymptoter.checked && r.asymptoter && r.a !== 0) {
    ks.loddrett(0, "g-asymptote");
    ks.vannrett(0, "g-asymptote");
  }
  // Grenene på hver side av x = 0 tegnes hver for seg, så det ikke blir en strek gjennom asymptoten
  ks.funksjon((x) => (x > 0 ? r.f(x) : NaN));
  ks.funksjon((x) => (x < 0 ? r.f(x) : NaN));
  if (visValg.punkter.checked) {
    if (r.gjennomOrigo) ks.punkt(0, 0, { klasse: "g-punkt-2", etikett: "(0, 0)", plass: "under-v" });
    ks.punkt(1, r.a, { etikett: `(1, ${tall(r.a, 2)})`, plass: r.a < 0 ? "under" : "ov" });
    if (r.q % 2 === 1) ks.punkt(-1, r.f(-1), { klasse: "g-punkt-2", etikett: `(−1, ${tall(rens(r.f(-1)), 2)})`, plass: r.f(-1) < 0 ? "under-v" : "ov-v" });
  }
};

function tilpass() {
  const pkt = [[0, 0], [1, r.a], [4, r.f(4)]];
  if (r.q % 2 === 1) pkt.push([-3, r.f(-3) || 0]);
  if (r.asymptoter) pkt.push([0.5, r.f(0.5)]);
  tilpassVindu(ks, pkt.filter(([, y]) => Number.isFinite(y)), 3, 1.3);
}

// ------------------------------------------------------------------ tekst og verdier

function oppdaterTekst() {
  const { a, p, q } = r;
  const potens = q === 1 ? `x^{${p}}` : `x^{${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}}`;
  const k = texKoeffisient(a);
  $("forskrift").innerHTML = tex(`f(x) = ${a === 0 ? "0" : k + potens}`);
  const rotform = texRotform(p, q);
  const visRot = !(q === 1 && p > 0);
  $("rotform").innerHTML = visRot && a !== 0 ? tex(`${potens} = ${rotform}`) : "";
  $("rotform-blokk").hidden = !visRot || a === 0;

  const pil = (s) => (s > 0 ? "+∞" : s < 0 ? "−∞" : "0");
  const fVerdi = (x) => (Number.isFinite(r.f(x)) ? tall(rens(r.f(x), 9), 4) : "ikke definert");
  const rader = [
    ["Definert for", r.domene],
    ["f(1)", tall(a, 2)],
    ["f(4)", fVerdi(4)],
    ["f(−8)", fVerdi(-8)],
    ["For x > 0", a === 0 ? "konstant" : r.voksende > 0 ? "vokser" : "avtar"],
    ["Når x → +∞", `f(x) → ${a === 0 ? "0" : r.b > 0 ? pil(a) : "0"}`],
  ];
  if (r.asymptoter) rader.push(["Asymptoter", a === 0 ? "Ingen" : "x = 0 og y = 0", "bred"]);
  visVerdier($("verdier"), rader);

  let melding = "";
  if (a === 0) melding = `<strong>a = 0:</strong> Da er ${tex("f(x) = 0")} der den er definert. Grafen ligger på x-aksen.`;
  else if (r.q % 2 === 0) melding = `<strong>Kvadratrot:</strong> ${tex(`${potens} = ${rotform}`)} har en kvadratrot. Vi kan ikke ta kvadratroten av et negativt tall, så funksjonen er bare definert for ${r.domene}.`;
  else if (r.q === 3) melding = `<strong>Tredjerot:</strong> Tredjeroten av et negativt tall finnes, for eksempel ${tex("\\sqrt[3]{-8} = -2")}. Derfor er ${tex("x^{\\frac{1}{3}}")} definert for alle x.`;
  else if (r.p < 0) melding = `<strong>Negativ eksponent:</strong> ${tex(`${potens} = ${rotform}`)}. Vi kan ikke dele på null, så x = 0 er ikke med. Grafen har asymptotene x = 0 og y = 0.`;
  visMelding($("melding"), melding);

  const sammendrag = `f(x) = ${tall(a)} · x opphøyd i ${bTekst.replace("-", "minus ")}. Definert for ${r.domene}. f(1) = ${tall(a)}.`;
  ks.beskrivelse = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  r = analyser(verdier(glidere).a, bTekst);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand({ a: verdier(glidere).a, b: bTekst }, sammendrag);
}

function settVerdier(v) {
  if (v.b && v.b in EKSPONENTER) { bTekst = v.b; bVelger.value = v.b; }
  if ("a" in v) glidere.a.sett(v.a);
  oppdater(true);
  if (v.tilpass) tilpass(); else ks.tilbakestill();
}

figurverktoy({ ks, svg, filnavn: "potensfunksjon", tilpass, tilbakestill: () => settVerdier({ ...STANDARD }) });
oppsettlenker(["a", "tilpass"], ["b"], settVerdier, bVelger);

oppdater(false);

window.mattelabPotensfunksjon = { analyser, EKSPONENTER, hent: () => r };
