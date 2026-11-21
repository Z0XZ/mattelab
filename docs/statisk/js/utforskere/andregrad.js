// Utforsker: andregradsfunksjonen f(x) = ax² + bx + c
import "../../lib/katex/katex.min.js";
import {
  tall, tallOmtrent, lik, lagGlider, Koordinatsystem, annonser,
  lesAdresse, skrivAdresse, lastNedPNG, lastNedSVG,
} from "../felles.js";
import { analyser, fortegn, texTall, texPolynom, texFaktor, texKoeffisient } from "./andregrad-matte.js";

const katex = window.katex;
const $ = (id) => document.getElementById(id);

function tex(s, display = false) {
  return katex.renderToString(s, { throwOnError: false, displayMode: display });
}

// ------------------------------------------------------------------ oppsett

const STANDARD = { a: 1, b: -2, c: -3 };
const fraAdresse = lesAdresse(["a", "b", "c"]);
const start = { ...STANDARD, ...fraAdresse };

const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -8, xmax: 8, ymin: -6, ymax: 6, tittel: "Grafen til f" });

const visValg = {};
for (const boks of document.querySelectorAll("#visvalg input[type=checkbox]")) {
  visValg[boks.name] = boks;
  boks.addEventListener("change", () => ks.tegn());
}

const glidere = {};
const oppsett = [
  { navn: "a", tekst: "tallet foran x²", beskrivelse: "a, tallet foran x²", min: -5, maks: 5, grense: [-100, 100] },
  { navn: "b", tekst: "tallet foran x", beskrivelse: "b, tallet foran x", min: -10, maks: 10, grense: [-1000, 1000] },
  { navn: "c", tekst: "konstantleddet", beskrivelse: "c, konstantleddet", min: -10, maks: 10, grense: [-1000, 1000] },
];
const gliderBoks = $("glidere");
for (const o of oppsett) {
  glidere[o.navn] = lagGlider({
    ...o, etikett: `<i>${o.navn}</i>${o.tekst}`, steg: 0.1, desimaler: 2, verdi: start[o.navn],
    vedEndring: () => oppdater(true),
  });
  gliderBoks.appendChild(glidere[o.navn].element);
}

let r = analyser(start.a, start.b, start.c);

// ------------------------------------------------------------------ tegning

ks.vedTegning = () => {
  const { a, b, c } = r;
  const f = (x) => a * x * x + b * x + c;

  if (visValg.fortegn.checked) tegnFortegn();
  if (visValg.symmetri.checked && r.type === "andregrad") ks.loddrett(r.xs, "g-hjelp");
  ks.funksjon(f);

  const enkeltRot = r.type === "andregrad" && r.D === 0;
  if (visValg.nullpunkter.checked && !enkeltRot) {
    // Etiketten legges utover, bort fra symmetrilinja
    r.nullpunkter.forEach((x) => ks.punkt(x, 0, {
      klasse: "g-punkt-2", etikett: `(${tall(x, 2)}, 0)`,
      plass: r.type === "andregrad" && x < r.xs ? "ov-v" : "ov",
    }));
  }
  if (visValg.toppunkt.checked && r.type === "andregrad") {
    // På smale skjermer vises bare koordinatene; navnet står i verditabellen.
    const navn = ks.B < 520 ? "" : (r.a > 0 ? "Bunnpunkt " : "Toppunkt ") + (enkeltRot && visValg.nullpunkter.checked ? "og nullpunkt " : "");
    // Etiketten legges på den siden av punktet der grafen ikke er, men ikke oppå tallene på x-aksen.
    const naerAksen = Math.abs(ks.sy(r.ys) - ks.sy(0)) < 26;
    const plass = (r.a > 0) !== naerAksen ? "under" : "ov";
    ks.punkt(r.xs, r.ys, { etikett: `${navn}(${tall(r.xs, 2)}, ${tall(r.ys, 2)})`, plass });
  }
  if (visValg.yakse.checked) {
    ks.punkt(0, c, { klasse: "g-punkt-hul", etikett: `(0, ${tall(c, 2)})`, r: 5 });
  }
  oppdaterUtenforMelding();
};

/** Marker på x-aksen hvor f(x) er positiv (heltrukket) og negativ (stiplet). */
function tegnFortegn() {
  const { a, b, c } = r;
  const f = (x) => a * x * x + b * x + c;
  const kutt = [ks.xmin, ...r.nullpunkter.filter((x) => x > ks.xmin && x < ks.xmax), ks.xmax];
  for (let i = 0; i < kutt.length - 1; i++) {
    const midt = (kutt[i] + kutt[i + 1]) / 2;
    const v = f(midt);
    if (v === 0) continue;
    ks.linje(kutt[i], 0, kutt[i + 1], 0, v > 0 ? "g-intervall-pos" : "g-intervall-neg", ks.lagBak);
  }
}

function oppdaterUtenforMelding() {
  const punkter = [];
  if (r.type === "andregrad" && visValg.toppunkt.checked) punkter.push([r.xs, r.ys]);
  if (visValg.nullpunkter.checked) r.nullpunkter.forEach((x) => punkter.push([x, 0]));
  const utenfor = punkter.some(([x, y]) => !ks.innenfor(x, y));
  $("utenfor").hidden = !utenfor;
}

/** Velg et vindu som viser toppunkt, nullpunkter og skjæring med y-aksen. Én enhet er like lang på begge akser. */
function tilpassVindu() {
  const pkt = [[0, r.c]];
  if (r.type === "andregrad") pkt.push([r.xs, r.ys]);
  r.nullpunkter.forEach((x) => pkt.push([x, 0]));
  const xs = pkt.map((p) => p[0]), ys = pkt.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const forhold = ks.B / ks.H;
  let hx = Math.max((x1 - x0) / 2 * 1.3, (y1 - y0) / 2 * 1.3 * forhold, 6);
  const hy = hx / forhold;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  ks.settVindu({ xmin: cx - hx, xmax: cx + hx, ymin: cy - hy, ymax: cy + hy });
}

// ------------------------------------------------------------------ tekst og verdier

function beskrivNullpunkter() {
  if (r.alleNull) return "Alle x er nullpunkter";
  const n = r.nullpunkter;
  if (n.length === 0) return "Ingen";
  if (n.length === 1) return lik("x", n[0]);
  return `${lik("x", n[0])} og ${lik("x", n[1])}`;
}

function oppdaterTekst() {
  const { a, b, c } = r;
  // Funksjonsuttrykket
  const uttrykk = texPolynom([[a, "x^2"], [b, "x"], [c, ""]]);
  $("forskrift").innerHTML = tex(`f(x) = ${uttrykk}`);

  // Andre skrivemåter
  const former = [];
  if (r.type === "andregrad") {
    const k = texKoeffisient(a);
    const ledd = r.xs === 0 ? "x^2" : `(x ${r.xs < 0 ? "+" : "-"} ${texTall(r.xs)})^2`;
    const q = r.ys === 0 ? "" : ` ${r.ys < 0 ? "-" : "+"} ${texTall(r.ys)}`;
    former.push(`<p><span class="form-navn">Toppunktform:</span> ${tex(`f(x) = ${k}${ledd}${q}`)}</p>`);
    if (r.D > 0) {
      const [p, s] = r.nullpunkter;
      const eksakt = [p, s].every((x) => Math.abs(Number(x.toFixed(2)) - x) < 1e-9);
      former.push(`<p><span class="form-navn">Faktorisert:</span> ${tex(`f(x) ${eksakt ? "=" : "\\approx"} ${k}${texFaktor(p)}${texFaktor(s)}`)}</p>`);
    } else if (r.D === 0) {
      former.push(`<p><span class="form-navn">Faktorisert:</span> ${tex(`f(x) = ${k}${texFaktor(r.xs)}^2`)}</p>`);
    } else {
      former.push(`<p><span class="form-navn">Faktorisert:</span> Kan ikke skrives som produkt av lineære faktorer, fordi $D < 0$.</p>`
        .replace("$D < 0$", tex("D < 0")));
    }
  }
  $("former").innerHTML = former.join("");

  // Verditabell
  const rader = [];
  const fs = fortegn(r);
  if (r.type === "andregrad") {
    const dAvrundet = Math.abs(Number(r.D.toFixed(4)) - r.D) > 1e-9;
    rader.push(["Diskriminant", "bred", tex(`D = b^2 - 4ac ${dAvrundet ? "\\approx" : "="} ${(r.D < 0 ? "-" : "") + texTall(r.D, 4)}`)]);
    rader.push(["Antall nullpunkter", "", r.D > 0 ? "2 (fordi D > 0)" : r.D === 0 ? "1 (fordi D = 0)" : "0 (fordi D < 0)"]);
    rader.push(["Grafen vender", "", a > 0 ? "Opp (a > 0)" : "Ned (a < 0)"]);
    rader.push(["Nullpunkter", "bred", beskrivNullpunkter()]);
    rader.push([a > 0 ? "Bunnpunkt" : "Toppunkt", "", `(${tallOmtrent(r.xs)}, ${tallOmtrent(r.ys)})`]);
    rader.push(["Symmetrilinje", "", lik("x", r.xs)]);
  } else {
    rader.push(["Diskriminant", "bred", "Finnes ikke når a = 0"]);
    rader.push(["Nullpunkter", "bred", beskrivNullpunkter()]);
    rader.push(["Topp-/bunnpunkt", "bred", "Ingen (grafen er en rett linje)"]);
  }
  rader.push(["Skjærer y-aksen i", "", `(0, ${tall(c, 2)})`]);
  rader.push(["f(x) > 0 når", "bred", fs.pos]);
  rader.push(["f(x) < 0 når", "bred", fs.neg]);
  $("verdier").innerHTML = rader.map(([dt, kl, dd]) => `<div${kl ? ` class="${kl}"` : ""}><dt>${dt}</dt><dd>${dd}</dd></div>`).join("");

  // Meldinger om spesialtilfeller
  let melding = "";
  if (r.type === "lineær") {
    melding = `<strong>a = 0:</strong> Da forsvinner x²-leddet, og ${tex(`f(x) = ${texPolynom([[b, "x"], [c, ""]])}`)} er en <em>lineær</em> funksjon. Grafen er en rett linje, ikke en parabel. Den har ikke toppunkt, og abc-formelen virker ikke fordi vi ville delt på ${tex("2a = 0")}.`;
  } else if (r.type === "konstant") {
    melding = `<strong>a = 0 og b = 0:</strong> Da er ${tex(`f(x) = ${(c < 0 ? "-" : "") + texTall(c)}`)} konstant. Grafen er en vannrett linje som aldri treffer x-aksen.`;
  } else if (r.type === "null") {
    melding = `<strong>a = b = c = 0:</strong> Da er ${tex("f(x) = 0")} for alle x. Grafen ligger oppå x-aksen, og <em>alle</em> x er nullpunkter.`;
  } else if (r.D === 0) {
    melding = `<strong>D = 0:</strong> Grafen <em>berører</em> x-aksen i ett punkt. ${a > 0 ? "Bunnpunktet" : "Toppunktet"} ligger på x-aksen.`;
  } else if (r.D < 0) {
    melding = `<strong>D < 0:</strong> Grafen treffer aldri x-aksen. Likningen ${tex("f(x) = 0")} har ingen løsning, fordi vi ikke kan ta kvadratroten av et negativt tall.`;
  }
  $("melding").innerHTML = melding ? `<p>${melding}</p>` : "";
  $("melding").hidden = !melding;

  // Kort sammendrag for skjermleser og som beskrivelse av figuren
  const ord = [`a = ${tall(a)}, b = ${tall(b)}, c = ${tall(c)}.`];
  if (r.type === "andregrad") {
    ord.push(`${a > 0 ? "Bunnpunkt" : "Toppunkt"} (${tall(r.xs)}, ${tall(r.ys)}).`);
    ord.push(`Diskriminant ${tall(r.D)}.`);
  } else if (r.type === "lineær") ord.push("Grafen er en rett linje.");
  ord.push(`Nullpunkter: ${beskrivNullpunkter()}.`);
  const sammendrag = ord.join(" ");
  ks.beskrivelse = "Grafen til f(x). " + sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  r = analyser(glidere.a.verdi, glidere.b.verdi, glidere.c.verdi);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) {
    annonser(sammendrag);
    skrivAdresse({ a: String(r.a), b: String(r.b), c: String(r.c) });
  }
}

/** Sett verdier, for eksempel fra en lenke i en oppgave. */
function settVerdier(v) {
  for (const n of ["a", "b", "c"]) if (n in v) glidere[n].sett(v[n]);
  oppdater(true);
  ks.tilbakestill();
  if (!$("utenfor").hidden) tilpassVindu();
}

// Figurverktøy
$("zoom-inn").addEventListener("click", () => ks.zoom(1 / 1.5));
$("zoom-ut").addEventListener("click", () => ks.zoom(1.5));
$("vis-alt").addEventListener("click", tilpassVindu);
$("standardvindu").addEventListener("click", () => ks.tilbakestill());
$("tilbakestill").addEventListener("click", () => { settVerdier(STANDARD); ks.tilbakestill(); });
$("last-ned-png").addEventListener("click", () => lastNedPNG(svg, "andregradsfunksjon.png"));
$("last-ned-svg").addEventListener("click", () => lastNedSVG(svg, "andregradsfunksjon.svg"));
$("kopier-lenke").addEventListener("click", async () => {
  const status = $("lenkestatus");
  try {
    await navigator.clipboard.writeText(location.href);
    status.textContent = "Lenken er kopiert.";
  } catch (e) {
    status.textContent = "Kunne ikke kopiere. Kopier adressen fra adressefeltet.";
  }
});

// Lenker i oppgavene («Prøv: a = 2, b = −8, c = 6») setter verdiene direkte
document.querySelectorAll("a.oppsettlenke").forEach((lenke) => {
  lenke.addEventListener("click", (e) => {
    const p = new URL(lenke.href).searchParams;
    const v = {};
    for (const n of ["a", "b", "c"]) if (p.has(n)) v[n] = Number(p.get(n));
    e.preventDefault();
    settVerdier(v);
    $("utforsker").scrollIntoView({ behavior: "smooth", block: "start" });
    glidere.a.glider.focus({ preventScroll: true });
  });
});

oppdater(false);
// Ligger viktige punkter utenfor standardvinduet når siden åpnes, tilpasses vinduet.
if (!$("utenfor").hidden) tilpassVindu();

// For automatiske tester
window.mattelabAndregrad = { analyser, fortegn, texPolynom, hentTilstand: () => r, vindu: () => ({ xmin: ks.xmin, xmax: ks.xmax, ymin: ks.ymin, ymax: ks.ymax }) };
