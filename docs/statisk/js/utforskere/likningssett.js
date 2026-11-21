// Utforsker: likningssett med to ukjente, løst grafisk
//   a₁x + b₁y = c₁
//   a₂x + b₂y = c₂
import { tall, lik, Koordinatsystem, rens } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, tilpassVindu,
} from "../utforsker.js";
import { texPolynom, texT, texP } from "../matte.js";

// ------------------------------------------------------------------ matematikk

/** Hva slags punktmengde beskriver ax + by = c? */
export function linjetype(a, b, c) {
  if (a === 0 && b === 0) return c === 0 ? "alle" : "ingen";
  return b === 0 ? "loddrett" : "linje";
}

/**
 * Løs likningssettet. type:
 *  «én»: ett skjæringspunkt (x, y)
 *  «ingen»: parallelle linjer, eller en «likning» som ingen punkter oppfyller
 *  «uendelig»: samme linje (eller en likning som alle punkter oppfyller)
 */
export function los(v) {
  const { a1, b1, c1, a2, b2, c2 } = v;
  const t1 = linjetype(a1, b1, c1), t2 = linjetype(a2, b2, c2);
  const r = { t1, t2, det: rens(a1 * b2 - a2 * b1) };
  if (t1 === "ingen" || t2 === "ingen") return { ...r, type: "ingen", grunn: "tom" };
  if (t1 === "alle" && t2 === "alle") return { ...r, type: "uendelig", grunn: "alle" };
  if (t1 === "alle" || t2 === "alle") return { ...r, type: "uendelig", grunn: "en-linje" };
  if (r.det !== 0) {
    return { ...r, type: "én", x: rens((c1 * b2 - c2 * b1) / r.det), y: rens((a1 * c2 - a2 * c1) / r.det) };
  }
  const samme = rens(a1 * c2 - a2 * c1) === 0 && rens(b1 * c2 - b2 * c1) === 0;
  return { ...r, type: samme ? "uendelig" : "ingen", grunn: samme ? "samme" : "parallelle" };
}

/** Stigningstallet −a/b, eller null for loddrette linjer. */
const stigning = (a, b) => (b === 0 ? null : rens(-a / b));

// ------------------------------------------------------------------ oppsett

const STANDARD = { a1: 2, b1: 1, c1: 5, a2: 1, b2: -1, c2: 1 };
const svg = $("graf");
const ks = new Koordinatsystem(svg, { xmin: -8, xmax: 8, ymin: -6, ymax: 6, tittel: "Linjene til de to likningene" });

const oppsett = (n) => [
  { navn: `a${n}`, etikett: `<i>a<sub>${n}</sub></i>tallet foran x`, beskrivelse: `a${n}, tallet foran x i likning ${n}`, min: -10, maks: 10, grense: [-1000, 1000] },
  { navn: `b${n}`, etikett: `<i>b<sub>${n}</sub></i>tallet foran y`, beskrivelse: `b${n}, tallet foran y i likning ${n}`, min: -10, maks: 10, grense: [-1000, 1000] },
  { navn: `c${n}`, etikett: `<i>c<sub>${n}</sub></i>høyre side`, beskrivelse: `c${n}, høyre side i likning ${n}`, min: -10, maks: 10, grense: [-1000, 1000] },
];
const glidere = {
  ...lagGlidere($("glidere-1"), oppsett(1), STANDARD, () => oppdater(true)),
  ...lagGlidere($("glidere-2"), oppsett(2), STANDARD, () => oppdater(true)),
};

let v, r;

// ------------------------------------------------------------------ tegning

function tegnLinje(a, b, c, klasse) {
  const t = linjetype(a, b, c);
  if (t === "linje") ks.funksjon((x) => (c - a * x) / b, klasse);
  else if (t === "loddrett") ks.loddrett(c / a, klasse);
  else if (t === "alle") ks.mangekant([[ks.xmin, ks.ymin], [ks.xmax, ks.ymin], [ks.xmax, ks.ymax], [ks.xmin, ks.ymax]], klasse === "g-graf" ? "g-fyll" : "g-fyll-2");
}

ks.vedTegning = () => {
  tegnLinje(v.a1, v.b1, v.c1, "g-graf");
  tegnLinje(v.a2, v.b2, v.c2, "g-graf-2 g-stiplet");
  if (r.type === "én") ks.punkt(r.x, r.y, { etikett: `(${tall(r.x, 2)}, ${tall(r.y, 2)})` });
  $("utenfor").hidden = !(r.type === "én" && !ks.innenfor(r.x, r.y));
};

function tilpass() {
  if (r.type !== "én") { ks.tilbakestill(); return; }
  // Ta med punktene der linjene skjærer aksene, så begge linjene synes godt.
  const pkt = [[r.x, r.y], [0, 0]];
  for (const [a, b, c] of [[v.a1, v.b1, v.c1], [v.a2, v.b2, v.c2]]) {
    if (b !== 0) pkt.push([0, c / b]);
    if (a !== 0) pkt.push([c / a, 0]);
  }
  tilpassVindu(ks, pkt, 4, 1.2);
}

// ------------------------------------------------------------------ tekst og verdier

const texLikning = (a, b, c) => `${texPolynom([[a, "x"], [b, "y"]])} = ${texT(c)}`;

/** Likningen løst med hensyn på y, når det går. */
function texYform(a, b, c) {
  if (b === 0) return a === 0 ? "" : `x = ${texT(rens(c / a))}`;
  return `y = ${texPolynom([[rens(-a / b), "x"], [rens(c / b), ""]])}`;
}

/** Sett x og y inn i venstre side, for eksempel 2 · 2 + 1 · 1 = 5. */
function texKontroll(a, b, c, x, y) {
  const venstre = rens(a * x + b * y);
  const ok = Math.abs(venstre - c) < 1e-9;
  return `${texT(a)} \\cdot ${texP(x)} + ${texP(b)} \\cdot ${texP(y)} = ${texT(venstre)} ${ok ? "" : "\\neq " + texT(c)}`;
}

function oppdaterTekst() {
  $("likning-1").innerHTML = `${tex(texLikning(v.a1, v.b1, v.c1))}<span class="yform">${v.a1 || v.b1 ? tex("\\Leftrightarrow " + texYform(v.a1, v.b1, v.c1)) : ""}</span>`;
  $("likning-2").innerHTML = `${tex(texLikning(v.a2, v.b2, v.c2))}<span class="yform">${v.a2 || v.b2 ? tex("\\Leftrightarrow " + texYform(v.a2, v.b2, v.c2)) : ""}</span>`;

  const s1 = stigning(v.a1, v.b1), s2 = stigning(v.a2, v.b2);
  const stTekst = (s, t) => (t === "loddrett" ? "Loddrett linje" : t === "linje" ? lik("a", s) : "Ingen linje");
  const rader = [];
  let melding = "";
  if (r.type === "én") {
    rader.push(["Løsning", `${lik("x", r.x)} og ${lik("y", r.y)}`, "bred"]);
    rader.push(["Antall løsninger", "1 (linjene skjærer hverandre)", "bred"]);
  } else {
    rader.push(["Løsning", r.type === "ingen" ? "Ingen" : "Uendelig mange", "bred"]);
    rader.push(["Antall løsninger", r.type === "ingen" ? "0" : "Uendelig mange", "bred"]);
  }
  rader.push(["Stigningstall, linje 1", stTekst(s1, r.t1)]);
  rader.push(["Stigningstall, linje 2", stTekst(s2, r.t2)]);
  rader.push(["a₁b₂ − a₂b₁", tall(r.det, 4)]);
  visVerdier($("verdier"), rader);

  if (r.type === "én") {
    $("kontroll").innerHTML = `<p>Likning 1: ${tex(texKontroll(v.a1, v.b1, v.c1, r.x, r.y))}</p><p>Likning 2: ${tex(texKontroll(v.a2, v.b2, v.c2, r.x, r.y))}</p>`
      + (Math.abs(r.x - Number(r.x.toFixed(2))) > 1e-9 || Math.abs(r.y - Number(r.y.toFixed(2))) > 1e-9
        ? `<p class="merknad">Tallene er avrundet. Venstre side blir derfor bare omtrent lik høyre side.</p>` : "");
  } else $("kontroll").innerHTML = "<p>Ingen enkeltløsning å kontrollere.</p>";

  if (r.grunn === "parallelle") melding = "<strong>Parallelle linjer:</strong> Linjene har samme stigningstall, men skjærer y-aksen (eller x-aksen) på ulike steder. De møtes aldri, så likningssettet har ingen løsning.";
  else if (r.grunn === "samme") melding = "<strong>Samme linje:</strong> Den ene likningen er den andre ganget med et tall. Linjene ligger oppå hverandre, og alle punktene på linja er løsninger.";
  else if (r.grunn === "tom") melding = `<strong>Ingen punkter:</strong> Når tallene foran x og y begge er 0, står det ${tex("0 = c")} med ${tex("c \\neq 0")}. Det er aldri sant, så likningssettet har ingen løsning.`;
  else if (r.grunn === "en-linje") melding = `<strong>Én likning er alltid sann:</strong> Den sier bare ${tex("0 = 0")}. Da er alle punktene på den andre linja løsninger.`;
  else if (r.grunn === "alle") melding = `<strong>Begge likningene er ${tex("0 = 0")}:</strong> Alle punkter i planet er løsninger.`;
  visMelding($("melding"), melding);

  const sammendrag = r.type === "én" ? `Linjene skjærer hverandre i (${tall(r.x)}, ${tall(r.y)}).`
    : r.type === "ingen" ? "Ingen løsning." : "Uendelig mange løsninger.";
  ks.beskrivelse = `Likning 1: ${tall(v.a1)}x + ${tall(v.b1)}y = ${tall(v.c1)}. Likning 2: ${tall(v.a2)}x + ${tall(v.b2)}y = ${tall(v.c2)}. ${sammendrag}`;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  v = verdier(glidere);
  r = los(v);
  const sammendrag = oppdaterTekst();
  ks.tegn();
  if (fraBruker) delTilstand(v, sammendrag);
}

function settVerdier(ny) {
  for (const [n, g] of Object.entries(glidere)) if (n in ny) g.sett(ny[n]);
  oppdater(true);
  ks.tilbakestill();
  if (!$("utenfor").hidden) tilpass();
}

figurverktoy({ ks, svg, filnavn: "likningssett", tilpass, tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(Object.keys(glidere), [], settVerdier, glidere.a1.glider);

oppdater(false);
if (!$("utenfor").hidden) tilpass();

window.mattelabLikningssett = { los, hent: () => r };
