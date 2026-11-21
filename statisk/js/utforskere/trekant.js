// Utforsker: trekanter med sinus-, cosinus- og arealsetningen
// Hjørner A, B og C. Siden a ligger overfor A, b overfor B og c overfor C.
// Fire måter å bestemme en trekant på:
//   SVS: to sider og vinkelen mellom (b, c, A)
//   SSS: tre sider (a, b, c)
//   VSV: to vinkler og siden mellom (A, B, c)
//   SSV: to sider og en vinkel som ikke ligger mellom (a, b, A) – kan gi 0, 1 eller 2 trekanter
import { tall, rens, svgEl } from "../felles.js";
import {
  $, tex, lagGlidere, verdier, visVerdier, visMelding, figurverktoy, oppsettlenker, delTilstand, lesValg,
} from "../utforsker.js";

const RAD = Math.PI / 180;
const sin = (v) => Math.sin(v * RAD), cos = (v) => Math.cos(v * RAD);
const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) / RAD;
const acos = (x) => Math.acos(Math.max(-1, Math.min(1, x))) / RAD;

// ------------------------------------------------------------------ matematikk

/** Fullfør en trekant når alle tre sider er kjent. */
function fraSider(a, b, c) {
  const A = acos((b * b + c * c - a * a) / (2 * b * c));
  const B = acos((a * a + c * c - b * b) / (2 * a * c));
  return { a, b, c, A, B, C: 180 - A - B };
}

/**
 * Løs trekanten. Svarer med { losninger: [trekant, …], feil }.
 * Hver trekant har sidene a, b, c, vinklene A, B, C (i grader) og arealet T.
 */
export function los(modus, v) {
  const ut = [];
  if (modus === "SVS") {
    const a = Math.sqrt(v.b * v.b + v.c * v.c - 2 * v.b * v.c * cos(v.A));
    ut.push(fraSider(a, v.b, v.c));
  } else if (modus === "SSS") {
    const [x, y, z] = [v.a, v.b, v.c].sort((p, q) => p - q);
    if (x + y <= z * (1 + 1e-12)) return { losninger: [], feil: x + y === z ? "flat" : "ulikhet" };
    ut.push(fraSider(v.a, v.b, v.c));
  } else if (modus === "VSV") {
    if (v.A + v.B >= 180) return { losninger: [], feil: "vinkelsum" };
    const C = 180 - v.A - v.B;
    ut.push({ a: v.c * sin(v.A) / sin(C), b: v.c * sin(v.B) / sin(C), c: v.c, A: v.A, B: v.B, C });
  } else {
    const s = (v.b * sin(v.A)) / v.a;
    if (s > 1 + 1e-12) return { losninger: [], feil: "kort", sinB: s };
    const B1 = asin(s), B2 = 180 - B1;
    for (const B of Math.abs(B1 - B2) < 1e-9 ? [B1] : [B1, B2]) {
      if (v.A + B >= 180 - 1e-9) continue;
      const C = 180 - v.A - B;
      ut.push({ a: v.a, b: v.b, c: (v.a * sin(C)) / sin(v.A), A: v.A, B, C });
    }
    if (!ut.length) return { losninger: [], feil: "stump", sinB: s };
  }
  for (const t of ut) {
    t.T = 0.5 * t.b * t.c * sin(t.A);
    t.omkrets = t.a + t.b + t.c;
  }
  return { losninger: ut, sinB: modus === "SSV" ? (v.b * sin(v.A)) / v.a : undefined };
}

// ------------------------------------------------------------------ oppsett

const MODUSER = {
  SVS: { navn: "to sider og vinkelen mellom", glidere: ["b", "c", "A"] },
  SSS: { navn: "tre sider", glidere: ["a", "b", "c"] },
  VSV: { navn: "to vinkler og siden mellom", glidere: ["A", "B", "c"] },
  SSV: { navn: "to sider og en vinkel som ikke er mellom dem", glidere: ["a", "b", "A"] },
};
const STANDARD = { modus: "SVS", a: 5, b: 4, c: 6, A: 50, B: 60, valgt: 1 };
let modus = lesValg("modus", Object.keys(MODUSER), STANDARD.modus);
let valgt = lesValg("valgt", ["1", "2"], "1") === "2" ? 2 : 1;

const svg = $("figur");
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "figur-tittel figur-besk");
svg.innerHTML = '<title id="figur-tittel">Trekanten</title><desc id="figur-besk"></desc><g id="figur-innhold"></g>';
const lag = svg.querySelector("#figur-innhold");

const glidere = lagGlidere($("glidere"), [
  { navn: "a", etikett: "<i>a</i>siden BC", beskrivelse: "siden a, mellom B og C", min: 0.5, maks: 15, grense: [0.01, 10000] },
  { navn: "b", etikett: "<i>b</i>siden AC", beskrivelse: "siden b, mellom A og C", min: 0.5, maks: 15, grense: [0.01, 10000] },
  { navn: "c", etikett: "<i>c</i>siden AB", beskrivelse: "siden c, mellom A og B", min: 0.5, maks: 15, grense: [0.01, 10000] },
  { navn: "A", etikett: "<i>A</i>vinkelen i A (grader)", beskrivelse: "vinkel A i grader", min: 1, maks: 179, steg: 1, grense: [0.01, 179.99] },
  { navn: "B", etikett: "<i>B</i>vinkelen i B (grader)", beskrivelse: "vinkel B i grader", min: 1, maks: 179, steg: 1, grense: [0.01, 179.99] },
], STANDARD, () => oppdater(true));

const modusVelger = $("modus");
modusVelger.value = modus;
modusVelger.addEventListener("change", () => { modus = modusVelger.value; valgt = 1; oppdater(true); });
const losningVelger = $("losning");
losningVelger.addEventListener("change", () => { valgt = Number(losningVelger.value); oppdater(true); });

let v, res;

// ------------------------------------------------------------------ tegning

let B = 640, H = 420;
function storrelse() {
  const bredde = svg.parentElement.clientWidth || 640;
  B = Math.round(Math.min(640, Math.max(320, bredde)));
  H = B < 520 ? Math.round(B * 0.95) : 420;
  svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
}

/** Koordinater: A i origo, B på x-aksen og C over. */
function hjorner(t) {
  return { A: [0, 0], B: [t.c, 0], C: [t.b * cos(t.A), t.b * sin(t.A)] };
}

function tegn() {
  storrelse();
  lag.innerHTML = "";
  svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: B, height: H }, lag);
  const tr = res.losninger;
  if (!tr.length) {
    if (modus === "SSV") tegnSSVUtenLosning();
    return;
  }
  const hoved = tr[Math.min(valgt, tr.length) - 1];
  const andre = tr.length === 2 ? tr[2 - Math.min(valgt, 2)] : null;
  const p = hjorner(hoved), q = andre ? hjorner(andre) : null;
  const alle = [p.A, p.B, p.C, ...(q ? [q.B] : [])];
  const til = skalering(alle);
  if (andre) {
    // Den andre løsningen: samme A og C, men B et annet sted på grunnlinja. Sirkelen med radius a rundt C viser hvorfor.
    const [cx, cy] = til(p.C);
    svgEl("circle", { class: "g-hjelp", cx, cy, r: hoved.a * til.s }, lag);
    svgEl("polygon", { class: "g-kant-2", points: [q.A, q.B, q.C].map((x) => til(x).join(",")).join(" ") }, lag);
    const [bx, by] = til(q.B);
    tekst(bx, by + 22, valgt === 1 ? "B₂" : "B₁", "g-hjorne", "middle");
  }
  svgEl("polygon", { class: "k-a2", points: [p.A, p.B, p.C].map((x) => til(x).join(",")).join(" ") }, lag);
  svgEl("polygon", { class: "g-kant", points: [p.A, p.B, p.C].map((x) => til(x).join(",")).join(" ") }, lag);
  const navn = { A: "A", B: andre ? (valgt === 1 ? "B₁" : "B₂") : "B", C: "C" };
  const tyngde = [(p.A[0] + p.B[0] + p.C[0]) / 3, (p.A[1] + p.B[1] + p.C[1]) / 3];
  const [gx, gy] = til(tyngde);
  for (const [k, nab1, nab2] of [["A", "B", "C"], ["B", "C", "A"], ["C", "A", "B"]]) {
    const [x, y] = til(p[k]);
    vinkelbue(til(p[k]), til(p[nab1]), til(p[nab2]), hoved[k]);
    // Navnet på hjørnet legges utenfor trekanten
    const dx = x - gx, dy = y - gy, l = Math.hypot(dx, dy) || 1;
    tekst(x + (dx / l) * 18, y + (dy / l) * 18 + 6, navn[k], "g-hjorne", "middle");
  }
  for (const [s, e1, e2] of [["a", "B", "C"], ["b", "A", "C"], ["c", "A", "B"]]) {
    let [x1, y1] = til(p[e1]);
    const [x2, y2] = til(p[e2]);
    // Med to løsninger ligger B₂ på grunnlinja. Da står c-etiketten mellom de to B-ene, så tekstene ikke kolliderer.
    if (s === "c" && q && hoved.c > andre.c) [x1, y1] = til(q.B);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    // Normalvektor på siden, pekende bort fra trekanten, så teksten ikke ligger oppå streken.
    const l = Math.hypot(x2 - x1, y2 - y1) || 1;
    let nx = -(y2 - y1) / l, ny = (x2 - x1) / l;
    if (nx * (mx - gx) + ny * (my - gy) < 0) { nx = -nx; ny = -ny; }
    const anker = Math.abs(nx) < 0.35 ? "middle" : nx > 0 ? "start" : "end";
    tekst(mx + nx * 12, my + ny * 12 + 5 + (ny > 0.35 ? 6 : 0), `${s} = ${tall(hoved[s], 2)}`, "g-mal", anker);
  }
}

function tegnSSVUtenLosning() {
  // Vis hvorfor det ikke går: siden a rekker ikke ned til grunnlinja.
  const C = [v.b * cos(v.A), v.b * sin(v.A)];
  const lengst = Math.max(v.b * 1.6, C[0] + v.a + 1);
  const til = skalering([[0, 0], [lengst, 0], C, [C[0] - v.a, C[1] - v.a]]);
  const [ax, ay] = til([0, 0]), [ex] = til([lengst, 0]), [cx, cy] = til(C);
  svgEl("line", { class: "g-kant", x1: ax, y1: ay, x2: ex, y2: ay }, lag);
  svgEl("line", { class: "g-kant", x1: ax, y1: ay, x2: cx, y2: cy }, lag);
  svgEl("circle", { class: "g-hjelp", cx, cy, r: v.a * til.s }, lag);
  tekst(ax - 14, ay + 6, "A", "g-hjorne", "end");
  tekst(cx, cy - 12, "C", "g-hjorne", "middle");
  tekst((ax + cx) / 2 - 12, (ay + cy) / 2, `b = ${tall(v.b, 2)}`, "g-mal", "end");
  tekst(cx + v.a * til.s * 0.75 + 6, cy + v.a * til.s * 0.65, `a = ${tall(v.a, 2)}`, "g-mal", "start");
}

/** Lag en funksjon som gjør trekantkoordinater om til skjermkoordinater, med lik målestokk. */
function skalering(punkter) {
  const xs = punkter.map((p) => p[0]), ys = punkter.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const marg = B < 520 ? 52 : 70;
  const s = Math.min((B - 2 * marg) / Math.max(x1 - x0, 1e-9), (H - 2 * marg) / Math.max(y1 - y0, 1e-9));
  const ox = (B - (x1 - x0) * s) / 2 - x0 * s, oy = (H + (y1 - y0) * s) / 2 + y0 * s;
  const f = ([x, y]) => [ox + x * s, oy - y * s];
  f.s = s;
  return f;
}

function tekst(x, y, innhold, klasse, anker) {
  const t = svgEl("text", { class: klasse, x, y, "text-anchor": anker }, lag);
  t.textContent = innhold;
  return t;
}

/** Vinkelbue i hjørnet P mellom retningene mot Q og R, med gradtallet ved siden av. */
function vinkelbue(P, Q, R, grader) {
  const r = 24;
  const v1 = Math.atan2(Q[1] - P[1], Q[0] - P[0]), v2 = Math.atan2(R[1] - P[1], R[0] - P[0]);
  let d = v2 - v1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(grader - 90) < 1e-6) {
    // Rett vinkel: lite kvadrat
    const u = [Math.cos(v1), Math.sin(v1)], w = [Math.cos(v2), Math.sin(v2)], k = 14;
    svgEl("path", { class: "g-vinkel-rett", d: `M${P[0] + u[0] * k} ${P[1] + u[1] * k} L${P[0] + (u[0] + w[0]) * k} ${P[1] + (u[1] + w[1]) * k} L${P[0] + w[0] * k} ${P[1] + w[1] * k}` }, lag);
  } else {
    const start = [P[0] + r * Math.cos(v1), P[1] + r * Math.sin(v1)], slutt = [P[0] + r * Math.cos(v1 + d), P[1] + r * Math.sin(v1 + d)];
    svgEl("path", { class: "g-vinkel", d: `M${P[0]} ${P[1]} L${start[0]} ${start[1]} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${slutt[0]} ${slutt[1]} Z` }, lag);
  }
  const midt = v1 + d / 2, rt = grader < 35 ? 52 : 42;
  tekst(P[0] + rt * Math.cos(midt), P[1] + rt * Math.sin(midt) + 4, `${tall(grader, 1)}°`, "g-mal", "middle");
}

// ------------------------------------------------------------------ tekst og verdier

const g = (x) => `${tall(x, 2)}°`;
const tt = (x) => tall(x, 3).replace("−", "-").replace(/\u00a0/g, "\\,").replace(",", "{,}");
const tg = (x) => `${tt(x)}^\\circ`;

function utregning(t) {
  const s = [];
  if (modus === "SVS") {
    s.push(["Cosinussetningen gir a:", `a^2 = b^2 + c^2 - 2bc\\cos A = ${tt(v.b)}^2 + ${tt(v.c)}^2 - 2 \\cdot ${tt(v.b)} \\cdot ${tt(v.c)} \\cdot \\cos ${tg(v.A)} \\approx ${tt(t.a * t.a)}`]);
    s.push(["", `a \\approx ${tt(t.a)}`]);
    s.push(["Cosinussetningen gir B:", `\\cos B = \\dfrac{a^2 + c^2 - b^2}{2ac} \\;\\Rightarrow\\; B \\approx ${tg(t.B)}`]);
    s.push(["Vinkelsummen gir C:", `C = 180^\\circ - A - B \\approx ${tg(t.C)}`]);
    s.push(["Arealsetningen:", `T = \\tfrac{1}{2}\\, bc \\sin A = \\tfrac{1}{2} \\cdot ${tt(v.b)} \\cdot ${tt(v.c)} \\cdot \\sin ${tg(v.A)} \\approx ${tt(t.T)}`]);
  } else if (modus === "SSS") {
    s.push(["Cosinussetningen gir A:", `\\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc} = \\dfrac{${tt(v.b)}^2 + ${tt(v.c)}^2 - ${tt(v.a)}^2}{2 \\cdot ${tt(v.b)} \\cdot ${tt(v.c)}} \\;\\Rightarrow\\; A \\approx ${tg(t.A)}`]);
    s.push(["Cosinussetningen gir B:", `\\cos B = \\dfrac{a^2 + c^2 - b^2}{2ac} \\;\\Rightarrow\\; B \\approx ${tg(t.B)}`]);
    s.push(["Vinkelsummen gir C:", `C = 180^\\circ - A - B \\approx ${tg(t.C)}`]);
    s.push(["Arealsetningen:", `T = \\tfrac{1}{2}\\, bc \\sin A \\approx ${tt(t.T)}`]);
  } else if (modus === "VSV") {
    s.push(["Vinkelsummen gir C:", `C = 180^\\circ - ${tg(v.A)} - ${tg(v.B)} = ${tg(t.C)}`]);
    s.push(["Sinussetningen gir a:", `\\dfrac{a}{\\sin A} = \\dfrac{c}{\\sin C} \\;\\Rightarrow\\; a = \\dfrac{${tt(v.c)} \\cdot \\sin ${tg(v.A)}}{\\sin ${tg(t.C)}} \\approx ${tt(t.a)}`]);
    s.push(["Sinussetningen gir b:", `b = \\dfrac{${tt(v.c)} \\cdot \\sin ${tg(v.B)}}{\\sin ${tg(t.C)}} \\approx ${tt(t.b)}`]);
    s.push(["Arealsetningen:", `T = \\tfrac{1}{2}\\, ab \\sin C \\approx ${tt(t.T)}`]);
  } else {
    s.push(["Sinussetningen gir B:", `\\sin B = \\dfrac{b \\sin A}{a} = \\dfrac{${tt(v.b)} \\cdot \\sin ${tg(v.A)}}{${tt(v.a)}} \\approx ${tt(res.sinB)}`]);
    if (res.losninger.length === 2) {
      s.push(["", `B \\approx ${tg(res.losninger[0].B)} \\quad \\text{eller} \\quad B \\approx 180^\\circ - ${tg(res.losninger[0].B)} = ${tg(res.losninger[1].B)}`]);
      s.push([`Her vises løsning ${valgt}:`, `B \\approx ${tg(t.B)}`]);
    } else s.push(["", `B \\approx ${tg(t.B)}`]);
    s.push(["Vinkelsummen gir C:", `C = 180^\\circ - A - B \\approx ${tg(t.C)}`]);
    s.push(["Sinussetningen gir c:", `c = \\dfrac{a \\sin C}{\\sin A} \\approx ${tt(t.c)}`]);
    s.push(["Arealsetningen:", `T = \\tfrac{1}{2}\\, ab \\sin C \\approx ${tt(t.T)}`]);
  }
  return s.map(([forklaring, f]) => `${forklaring ? `<p class="steg-tekst">${forklaring}</p>` : ""}<div class="utregning">${tex(f)}</div>`).join("");
}

function type(t) {
  const maks = Math.max(t.A, t.B, t.C);
  const vinkel = Math.abs(maks - 90) < 1e-6 ? "rettvinklet" : maks > 90 ? "stumpvinklet" : "spissvinklet";
  const like = (x, y) => Math.abs(x - y) < 1e-9 * (1 + x);
  const sider = like(t.a, t.b) && like(t.b, t.c) ? "likesidet" : like(t.a, t.b) || like(t.b, t.c) || like(t.a, t.c) ? "likebeint" : "";
  return [vinkel, sider].filter(Boolean).join(" og ");
}

function oppdaterTekst() {
  const tr = res.losninger;
  $("losning-valg").hidden = tr.length !== 2;
  if (tr.length === 2) losningVelger.value = String(valgt);
  const rader = [];
  let melding = "";
  if (!tr.length) {
    rader.push(["Trekant", "Finnes ikke", "bred"]);
    $("utregning").innerHTML = "";
    if (res.feil === "ulikhet") melding = "<strong>Ingen trekant:</strong> Den lengste siden er lengre enn de to andre til sammen. Da når ikke de to korte sidene sammen. I en trekant må summen av to sider alltid være større enn den tredje (trekantulikheten).";
    else if (res.feil === "flat") melding = "<strong>Ingen trekant:</strong> Den lengste siden er nøyaktig like lang som de to andre til sammen. Da blir «trekanten» en flat strek.";
    else if (res.feil === "vinkelsum") melding = `<strong>Ingen trekant:</strong> ${tex("A + B")} er ${g(v.A + v.B)}. Vinkelsummen i en trekant er ${tex("180^\\circ")}, så de to vinklene må til sammen være mindre enn ${tex("180^\\circ")}.`;
    else if (res.feil === "kort") melding = `<strong>Ingen trekant:</strong> Sinussetningen gir ${tex(`\\sin B \\approx ${tt(res.sinB)}`)}, men sinus kan aldri være større enn 1. Siden a er for kort til å nå grunnlinja. Sirkelen med radius a rundt C treffer ikke linja gjennom A.`;
    else if (res.feil === "stump") melding = "<strong>Ingen trekant:</strong> Vinkelen A er så stor at det ikke er plass til vinkel B. Siden a må være lengre enn b når A er stump.";
  } else {
    const t = tr[Math.min(valgt, tr.length) - 1];
    rader.push(["a", tall(t.a, 2)], ["b", tall(t.b, 2)], ["c", tall(t.c, 2)]);
    rader.push(["A", g(t.A)], ["B", g(t.B)], ["C", g(t.C)]);
    rader.push(["Areal", tall(t.T, 2)], ["Omkrets", tall(t.omkrets, 2)], ["Type", type(t)]);
    $("utregning").innerHTML = utregning(t);
    if (modus === "SSV") {
      if (tr.length === 2) melding = `<strong>To trekanter:</strong> ${tex(`\\sin B \\approx ${tt(res.sinB)}`)} har to løsninger mellom ${tex("0^\\circ")} og ${tex("180^\\circ")}: ${tex(`B \\approx ${tg(tr[0].B)}`)} og ${tex(`B \\approx ${tg(tr[1].B)}`)}. Begge gir en trekant. Sirkelen med radius a rundt C treffer grunnlinja to steder. Velg hvilken løsning som vises.`;
      else if (Math.abs(res.sinB - 1) < 1e-12) melding = "<strong>Nøyaktig én trekant:</strong> sin B = 1, så B = 90°. Siden a treffer grunnlinja i akkurat ett punkt.";
    }
  }
  visVerdier($("verdier"), rader);
  visMelding($("melding"), melding);
  const t = tr[Math.min(valgt, tr.length) - 1];
  const sammendrag = t
    ? `Sider ${tall(t.a)}, ${tall(t.b)} og ${tall(t.c)}. Vinkler ${g(t.A)}, ${g(t.B)} og ${g(t.C)}. Areal ${tall(t.T)}.${tr.length === 2 ? " Det finnes to trekanter." : ""}`
    : "Det finnes ingen trekant med disse målene.";
  svg.querySelector("desc").textContent = sammendrag;
  return sammendrag;
}

// ------------------------------------------------------------------ oppdatering

function oppdater(fraBruker) {
  modusVelger.value = modus;
  for (const [n, gl] of Object.entries(glidere)) gl.element.hidden = !MODUSER[modus].glidere.includes(n);
  v = verdier(glidere);
  res = los(modus, v);
  if (valgt > res.losninger.length) valgt = 1;
  const sammendrag = oppdaterTekst();
  tegn();
  if (fraBruker) {
    const tilstand = { modus, valgt: res.losninger.length === 2 ? valgt : "" };
    for (const n of MODUSER[modus].glidere) tilstand[n] = v[n];
    delTilstand(tilstand, sammendrag);
  }
}

function settVerdier(ny) {
  if (ny.modus) modus = ny.modus;
  valgt = ny.valgt === "2" ? 2 : 1;
  for (const [n, gl] of Object.entries(glidere)) if (n in ny) gl.sett(ny[n]);
  oppdater(true);
}

let sistBredde = 0;
if ("ResizeObserver" in window) {
  new ResizeObserver(() => {
    const w = svg.parentElement.clientWidth;
    if (Math.abs(w - sistBredde) > 3) { sistBredde = w; tegn(); }
  }).observe(svg.parentElement);
}
figurverktoy({ svg, filnavn: "trekant", tilbakestill: () => settVerdier(STANDARD) });
oppsettlenker(["a", "b", "c", "A", "B"], ["modus", "valgt"], settVerdier, modusVelger);
oppdater(false);

window.mattelabTrekant = { los, hent: () => res };
