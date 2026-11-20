// Liten utforsker på forsiden: parabelen f(x) = ax² + bx + c, som skrått kast på fysikklab.no.
import { tall, tallOmtrent, lagGlider, Koordinatsystem, annonser } from "./felles.js";
import { analyser } from "./utforskere/andregrad-matte.js";

const svg = document.getElementById("forside-graf");
const ks = new Koordinatsystem(svg, { bredde: 600, hoyde: 400, xmin: -6, xmax: 6, ymin: -5, ymax: 3, tittel: "Grafen til f(x) = ax² + bx + c" });
const verdier = { a: 1, b: -2, c: -3 };
const tallfelt = document.getElementById("forside-tall");
let r = analyser(verdier.a, verdier.b, verdier.c);

ks.vedTegning = () => {
  ks.funksjon((x) => r.a * x * x + r.b * x + r.c);
  if (r.type === "andregrad") ks.punkt(r.xs, r.ys, { etikett: `(${tall(r.xs)}, ${tall(r.ys)})`, plass: r.a > 0 ? "under" : "ov" });
  r.nullpunkter.forEach((x) => ks.punkt(x, 0, { klasse: "g-punkt-2" }));
};

function oppdater(fraBruker) {
  r = analyser(verdier.a, verdier.b, verdier.c);
  const navn = r.type !== "andregrad" ? "Topp-/bunnpunkt" : r.a > 0 ? "Bunnpunkt" : "Toppunkt";
  const topp = r.type === "andregrad" ? `(${tallOmtrent(r.xs)}, ${tallOmtrent(r.ys)})` : "Ingen (a = 0)";
  const n = r.alleNull ? "Alle x" : r.nullpunkter.length ? r.nullpunkter.map((x) => tallOmtrent(x)).join(" og ") : "Ingen";
  const d = r.type === "andregrad" ? tall(r.D) : "–";
  tallfelt.innerHTML = `<div><dt>${navn}</dt><dd>${topp}</dd></div><div><dt>Nullpunkter</dt><dd>${n}</dd></div><div><dt>Diskriminant D</dt><dd>${d}</dd></div>`;
  ks.beskrivelse = `a = ${tall(r.a)}, b = ${tall(r.b)}, c = ${tall(r.c)}. ${navn}: ${topp}. Nullpunkter: ${n}.`;
  ks.tegn();
  if (fraBruker) annonser(ks.besk.textContent);
}

const boks = document.getElementById("forside-glidere");
for (const [navn, min, maks] of [["a", -3, 3], ["b", -6, 6], ["c", -6, 6]]) {
  boks.appendChild(lagGlider({
    navn: "forside-" + navn, etikett: `<i>${navn}</i>`, beskrivelse: navn, min, maks, steg: 0.1, verdi: verdier[navn],
    grense: [min, maks], vedEndring: (v) => { verdier[navn] = v; oppdater(true); },
  }).element);
}
oppdater(false);
