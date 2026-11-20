// mattelab.no – felles kode for alle sider.
// Ren JavaScript (ES-modul), ingen rammeverk.
//
// Innhold:
//   Tallformat ........ tall(), tolkTall(), tallUttrykk()
//   Lagring ........... lagre(), hent()  (localStorage, tåler at det er blokkert)
//   Opplesing ......... annonser()  (aria-live, venter til eleven slutter å dra)
//   Glidebryter ....... lagGlider()
//   Koordinatsystem ... class Koordinatsystem  (SVG)
//   Nedlasting ........ lastNedSVG(), lastNedPNG()
//   Adressefelt ....... lesAdresse(), skrivAdresse()
//   Sideoppsett ....... fagvalg, lys/mørk modus, tavlemodus, filter på oversiktssider

const MINUS = "−";
const TUSENSKILLE = " "; // hardt mellomrom, så tall ikke deles over to linjer

// ================================================================ tallformat

/**
 * Skriv et tall på norsk: desimalkomma, ekte minustegn og mellomrom som tusenskille.
 * desimaler: høyeste antall desimaler. Nuller på slutten fjernes, med mindre fast = true.
 */
export function tall(x, desimaler = 2, fast = false) {
  if (x === Infinity) return "∞";
  if (x === -Infinity) return MINUS + "∞";
  if (!Number.isFinite(x)) return "–";
  let s = Math.abs(x).toFixed(desimaler);
  if (!fast && s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  let [hel, des] = s.split(".");
  if (hel.length > 4) hel = hel.replace(/\B(?=(\d{3})+(?!\d))/g, TUSENSKILLE);
  const tekst = des ? hel + "," + des : hel;
  const erNull = /^[0,]*$/.test(tekst.replace(/ /g, ""));
  return (x < 0 && !erNull ? MINUS : "") + tekst;
}

/** Som tall(), men med «≈» foran når avrundingen har endret verdien. */
export function tallOmtrent(x, desimaler = 2) {
  const avrundet = Number(x.toFixed(desimaler));
  return (Math.abs(avrundet - x) > 1e-9 ? "≈ " : "") + tall(x, desimaler);
}

/** Les et tall skrevet av eleven. Godtar komma eller punktum og både − og -. Gir NaN ved feil. */
export function tolkTall(tekst) {
  const s = String(tekst).trim().replace(/[−–]/g, "-").replace(/[\s ]/g, "").replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

/** Avrund bort flyttallsstøy, for eksempel 0,1 + 0,2 = 0,30000000000000004. */
export function rens(x, desimaler = 10) {
  const r = Number(x.toFixed(desimaler));
  return Object.is(r, -0) ? 0 : r;
}

// ================================================================ lagring

const PREFIKS = "mattelab.";
export function lagre(nokkel, verdi) {
  try { localStorage.setItem(PREFIKS + nokkel, verdi); } catch (e) { /* privat modus o.l. */ }
}
export function hent(nokkel, standard = null) {
  try { const v = localStorage.getItem(PREFIKS + nokkel); return v === null ? standard : v; } catch (e) { return standard; }
}

// ================================================================ opplesing

let liveOmrade = null;
let liveTimer = 0;
/**
 * Les opp en tekst for skjermleser. Når eleven drar i en glidebryter kommer det mange
 * endringer tett; vi venter derfor til det har vært stille en liten stund.
 */
export function annonser(tekst, forsinkelse = 500) {
  if (!liveOmrade) {
    liveOmrade = document.createElement("div");
    liveOmrade.className = "visuelt-skjult";
    liveOmrade.setAttribute("aria-live", "polite");
    liveOmrade.setAttribute("aria-atomic", "true");
    document.body.appendChild(liveOmrade);
  }
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { liveOmrade.textContent = tekst; }, forsinkelse);
}

// ================================================================ glidebryter

let gliderTeller = 0;
/**
 * Lag en glidebryter med tilhørende tallfelt.
 * valg: { navn, etikett, beskrivelse, min, maks, steg, verdi, desimaler, grense, vedEndring }
 *  - etikett: kort synlig navn, for eksempel "a"
 *  - beskrivelse: full etikett for skjermleser, for eksempel "a, tallet foran x²"
 *  - grense: [min, maks] for hva tallfeltet godtar (kan være videre enn glidebryteren)
 *  - vedEndring(verdi, kilde): kalles mens eleven drar og når tallfeltet endres
 */
export function lagGlider(valg) {
  const { etikett, beskrivelse, min, maks, steg = 0.1, desimaler = 2, vedEndring = () => {} } = valg;
  const grense = valg.grense || [min, maks];
  const id = "glider-" + (valg.navn || ++gliderTeller);
  let verdi = valg.verdi ?? 0;

  const rad = document.createElement("div");
  rad.className = "glider";
  rad.innerHTML = `
    <label class="glider-etikett" for="${id}">${etikett}</label>
    <input type="range" id="${id}" min="${min}" max="${maks}" step="${steg}">
    <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" id="${id}-tall">`;
  const glider = rad.querySelector('input[type="range"]');
  const felt = rad.querySelector('input[type="text"]');
  glider.setAttribute("aria-label", beskrivelse || etikett);
  felt.setAttribute("aria-label", (beskrivelse || etikett) + ", skriv inn tall");

  const visGlider = () => {
    glider.value = String(Math.min(maks, Math.max(min, verdi)));
    glider.setAttribute("aria-valuetext", tall(verdi, desimaler));
  };
  const visFelt = () => { felt.value = tall(verdi, desimaler); felt.removeAttribute("aria-invalid"); };

  glider.addEventListener("input", () => {
    verdi = rens(Number(glider.value));
    glider.setAttribute("aria-valuetext", tall(verdi, desimaler));
    visFelt();
    vedEndring(verdi, "glider");
  });
  const fraFelt = (endelig) => {
    const v = tolkTall(felt.value);
    if (Number.isNaN(v) || v < grense[0] || v > grense[1]) {
      if (endelig) visFelt(); else felt.setAttribute("aria-invalid", "true");
      return;
    }
    felt.removeAttribute("aria-invalid");
    verdi = rens(v);
    visGlider();
    vedEndring(verdi, "felt");
    if (endelig) visFelt();
  };
  felt.addEventListener("input", () => fraFelt(false));
  felt.addEventListener("change", () => fraFelt(true));
  felt.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const ny = rens(verdi + (e.key === "ArrowUp" ? steg : -steg));
      if (ny >= grense[0] && ny <= grense[1]) { verdi = ny; visGlider(); visFelt(); vedEndring(verdi, "felt"); }
    }
  });
  visGlider();
  visFelt();

  return {
    element: rad,
    glider,
    felt,
    get verdi() { return verdi; },
    sett(v, varsle = false) { verdi = rens(v); visGlider(); visFelt(); if (varsle) vedEndring(verdi, "kode"); },
  };
}

// ================================================================ koordinatsystem

const SVGNS = "http://www.w3.org/2000/svg";
export function svgEl(navn, attr = {}, forelder = null) {
  const el = document.createElementNS(SVGNS, navn);
  for (const [k, v] of Object.entries(attr)) el.setAttribute(k, v);
  if (forelder) forelder.appendChild(el);
  return el;
}

/** Velg et «pent» steg (1, 2 eller 5 · 10ⁿ) slik at det blir omtrent `antall` streker. */
export function pentSteg(spenn, antall = 10) {
  const rå = spenn / antall;
  const p = Math.pow(10, Math.floor(Math.log10(rå)));
  const m = rå / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

let ksTeller = 0;
/**
 * Koordinatsystem tegnet i SVG. Farger kommer fra CSS-variabler (lys/mørk modus).
 *
 *   const ks = new Koordinatsystem(svg, { xmin: -6, xmax: 6, ymin: -5, ymax: 7 });
 *   ks.vedTegning = () => { ks.funksjon(x => x * x); ks.punkt(0, 0, { etikett: "B" }); };
 *   ks.tegn();
 */
export class Koordinatsystem {
  constructor(svg, valg = {}) {
    this.svg = svg;
    this.B = valg.bredde || 640;
    this.H = valg.hoyde || 480;
    this.marg = 2;
    this.xnavn = valg.xnavn || "x";
    this.ynavn = valg.ynavn || "y";
    this.standard = { xmin: valg.xmin ?? -10, xmax: valg.xmax ?? 10, ymin: valg.ymin ?? -10, ymax: valg.ymax ?? 10 };
    Object.assign(this, this.standard);
    this.vedTegning = () => {};
    const id = "ks" + ++ksTeller;
    svg.setAttribute("viewBox", `0 0 ${this.B} ${this.H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", `${id}-tittel ${id}-besk`);
    svg.innerHTML = "";
    this.tittel = svgEl("title", { id: `${id}-tittel` }, svg);
    this.tittel.textContent = valg.tittel || "Koordinatsystem";
    this.besk = svgEl("desc", { id: `${id}-besk` }, svg);
    const defs = svgEl("defs", {}, svg);
    const klipp = svgEl("clipPath", { id: `${id}-klipp` }, defs);
    this.rammer = [
      svgEl("rect", { x: 0, y: 0, width: this.B, height: this.H }, klipp),
      svgEl("rect", { class: "g-bakgrunn", x: 0, y: 0, width: this.B, height: this.H }, svg),
    ];
    this.lagRutenett = svgEl("g", { "aria-hidden": "true" }, svg);
    this.lagBak = svgEl("g", { "clip-path": `url(#${id}-klipp)`, "aria-hidden": "true" }, svg);
    this.lagAkser = svgEl("g", { "aria-hidden": "true" }, svg);
    this.lagInnhold = svgEl("g", { "clip-path": `url(#${id}-klipp)`, "aria-hidden": "true" }, svg);
    this.lagPunkter = svgEl("g", { "aria-hidden": "true" }, svg);

    // På smale skjermer gjøres tegneflaten (viewBox) mindre, slik at tall og etiketter
    // beholder lesbar størrelse i stedet for å skaleres ned. Forholdet mellom bredde og
    // høyde er fast, så én enhet er like lang på begge akser også etter endringen.
    this.maksB = this.B;
    this.forhold = this.H / this.B;
    if (valg.tilpassBredde !== false && "ResizeObserver" in window && svg.parentElement) {
      new ResizeObserver(() => this.tilpassStorrelse()).observe(svg.parentElement);
      this.tilpassStorrelse(false);
    }
  }

  tilpassStorrelse(tegnPaNytt = true) {
    const bredde = this.svg.parentElement.clientWidth;
    if (!bredde) return;
    const B = Math.round(Math.min(this.maksB, Math.max(320, bredde)));
    if (Math.abs(B - this.B) < 4) return;
    // Tegneflaten følger skjermbredden, så tekst ikke blir bitteliten på mobil. På smale skjermer
    // blir figuren kvadratisk for å gi mer høyde. x-området er det samme; y-området justeres rundt
    // samme midtpunkt slik at én enhet fortsatt er like lang på begge akser.
    this.B = B;
    this.H = Math.round(B * (B < 520 ? 1 : this.forhold));
    this.svg.setAttribute("viewBox", `0 0 ${this.B} ${this.H}`);
    for (const r of this.rammer) { r.setAttribute("width", this.B); r.setAttribute("height", this.H); }
    Object.assign(this, this.medRiktigForhold(this));
    if (tegnPaNytt) this.tegn();
  }

  sx(x) { return ((x - this.xmin) / (this.xmax - this.xmin)) * this.B; }
  sy(y) { return this.H - ((y - this.ymin) / (this.ymax - this.ymin)) * this.H; }
  innenfor(x, y) { return x >= this.xmin && x <= this.xmax && y >= this.ymin && y <= this.ymax; }

  set beskrivelse(tekst) { this.besk.textContent = tekst; }

  /** Sett nytt vindu. Holder forholdet mellom aksene slik at én enhet er like lang på begge. */
  settVindu({ xmin, xmax, ymin, ymax }) {
    Object.assign(this, { xmin, xmax, ymin, ymax });
    this.tegn();
  }
  zoom(faktor) {
    const cx = (this.xmin + this.xmax) / 2, cy = (this.ymin + this.ymax) / 2;
    const hx = ((this.xmax - this.xmin) / 2) * faktor, hy = ((this.ymax - this.ymin) / 2) * faktor;
    if (hx < 0.05 || hx > 5000) return;
    this.settVindu({ xmin: cx - hx, xmax: cx + hx, ymin: cy - hy, ymax: cy + hy });
  }
  /** Flytt vinduet slik at punktet (x, y) ligger midt i, uten å endre målestokken. */
  sentrer(x, y) {
    const hx = (this.xmax - this.xmin) / 2, hy = (this.ymax - this.ymin) / 2;
    this.settVindu({ xmin: x - hx, xmax: x + hx, ymin: y - hy, ymax: y + hy });
  }
  tilbakestill() { this.settVindu(this.medRiktigForhold(this.standard)); }

  /** Juster y-området rundt midtpunktet slik at én enhet er like lang på begge akser. */
  medRiktigForhold(v) {
    const cy = (v.ymin + v.ymax) / 2;
    const hy = ((v.xmax - v.xmin) / 2) * (this.H / this.B);
    return { xmin: v.xmin, xmax: v.xmax, ymin: cy - hy, ymax: cy + hy };
  }

  tegn() {
    for (const lag of [this.lagRutenett, this.lagBak, this.lagAkser, this.lagInnhold, this.lagPunkter]) lag.innerHTML = "";
    this.tegnAkser();
    this.vedTegning();
  }

  tegnAkser() {
    const { B, H } = this;
    const steg = pentSteg(Math.max(this.xmax - this.xmin, this.ymax - this.ymin), 12);
    const des = Math.max(0, -Math.floor(Math.log10(steg) + 1e-9));
    // Aksene ligger på x = 0 og y = 0, eller langs kanten når nullpunktet er utenfor.
    const ax = Math.min(Math.max(this.sy(0), 0), H);
    const ay = Math.min(Math.max(this.sx(0), 0), B);
    const tallUnder = ax < H - 22;
    const tallVenstre = ay > 34;
    // Når det er trangt (smal skjerm), vises bare hvert andre (eller femte) tall på aksene.
    const pxSteg = (steg * B) / (this.xmax - this.xmin);
    const lengst = Math.max(tall(this.xmin, des).length, tall(this.xmax, des).length);
    const hvertX = [1, 2, 5, 10].find((k) => k * pxSteg >= lengst * 7.5 + 8) || 10;
    const hvertY = [1, 2, 5, 10].find((k) => k * pxSteg >= 20) || 10;
    for (let i = Math.ceil(this.xmin / steg); i * steg <= this.xmax; i++) {
      const x = rens(i * steg), px = this.sx(x);
      svgEl("line", { class: "g-rutenett", x1: px, y1: 0, x2: px, y2: H }, this.lagRutenett);
      if (x !== 0 && px > 10 && px < B - 22 && i % hvertX === 0) {
        svgEl("line", { class: "g-akse", x1: px, y1: ax - 4, x2: px, y2: ax + 4 }, this.lagAkser);
        const t = svgEl("text", { class: "g-tall", x: px, y: tallUnder ? ax + 18 : ax - 8, "text-anchor": "middle" }, this.lagAkser);
        t.textContent = tall(x, des);
      }
    }
    for (let i = Math.ceil(this.ymin / steg); i * steg <= this.ymax; i++) {
      const y = rens(i * steg), py = this.sy(y);
      svgEl("line", { class: "g-rutenett", x1: 0, y1: py, x2: B, y2: py }, this.lagRutenett);
      if (y !== 0 && py > 22 && py < H - 10 && i % hvertY === 0) {
        svgEl("line", { class: "g-akse", x1: ay - 4, y1: py, x2: ay + 4, y2: py }, this.lagAkser);
        const t = svgEl("text", { class: "g-tall", x: tallVenstre ? ay - 8 : ay + 8, y: py + 4.5, "text-anchor": tallVenstre ? "end" : "start" }, this.lagAkser);
        t.textContent = tall(y, des);
      }
    }
    svgEl("line", { class: "g-akse", x1: 0, y1: ax, x2: B, y2: ax }, this.lagAkser);
    svgEl("line", { class: "g-akse", x1: ay, y1: 0, x2: ay, y2: H }, this.lagAkser);
    svgEl("path", { class: "g-pil", d: `M${B} ${ax} l-11 -5 v10 z` }, this.lagAkser);
    svgEl("path", { class: "g-pil", d: `M${ay} 0 l-5 11 h10 z` }, this.lagAkser);
    const xn = svgEl("text", { class: "g-aksenavn", x: B - 8, y: ax + (ax < H - 26 ? 22 : -10), "text-anchor": "end" }, this.lagAkser);
    xn.textContent = this.xnavn;
    const yn = svgEl("text", { class: "g-aksenavn", x: ay + (ay < B - 30 ? 12 : -12), y: 18, "text-anchor": ay < B - 30 ? "start" : "end" }, this.lagAkser);
    yn.textContent = this.ynavn;
    if (this.innenfor(0, 0) && ax < H - 20 && ay > 20) {
      const o = svgEl("text", { class: "g-tall", x: ay - 7, y: ax + 17, "text-anchor": "end" }, this.lagAkser);
      o.textContent = "0";
    }
  }

  /**
   * Tegn grafen til f. Brudd (NaN, uendelig, eller store hopp utenfor vinduet ved asymptoter)
   * gir et opphold i streken i stedet for en loddrett strek.
   */
  funksjon(f, klasse = "g-graf", lag = this.lagInnhold) {
    const n = 800;
    const dx = (this.xmax - this.xmin) / n;
    const hoyde = this.ymax - this.ymin;
    const lo = this.ymin - 2 * hoyde, hi = this.ymax + 2 * hoyde;
    let d = "", forrige = null;
    for (let i = 0; i <= n; i++) {
      const x = this.xmin + i * dx;
      const y = f(x);
      if (!Number.isFinite(y)) { forrige = null; continue; }
      const yk = Math.min(hi, Math.max(lo, y));
      const hopp = forrige !== null && ((forrige <= lo && yk >= hi) || (forrige >= hi && yk <= lo));
      d += (forrige === null || hopp ? "M" : "L") + this.sx(x).toFixed(2) + " " + this.sy(yk).toFixed(2);
      forrige = yk;
    }
    return svgEl("path", { class: klasse, d }, lag);
  }

  linje(x1, y1, x2, y2, klasse = "g-hjelp", lag = this.lagInnhold) {
    return svgEl("line", { class: klasse, x1: this.sx(x1), y1: this.sy(y1), x2: this.sx(x2), y2: this.sy(y2) }, lag);
  }
  loddrett(x, klasse = "g-hjelp") { return this.linje(x, this.ymin, x, this.ymax, klasse); }
  vannrett(y, klasse = "g-hjelp") { return this.linje(this.xmin, y, this.xmax, y, klasse); }

  /**
   * Tegn et punkt med etikett. Ligger punktet utenfor vinduet, tegnes en pil ved kanten
   * som peker mot punktet, og etiketten får «utenfor» slik at det ikke forsvinner i stillhet.
   */
  punkt(x, y, { klasse = "g-punkt", etikett = "", r = 6, plass = "ov" } = {}) {
    const g = svgEl("g", {}, this.lagPunkter);
    if (this.innenfor(x, y)) {
      svgEl("circle", { class: klasse, cx: this.sx(x), cy: this.sy(y), r }, g);
      if (etikett) this.etikett(this.sx(x), this.sy(y), etikett, plass, g);
      return g;
    }
    const px = Math.min(this.B - 14, Math.max(14, this.sx(x)));
    const py = Math.min(this.H - 14, Math.max(14, this.sy(y)));
    const vinkel = Math.atan2(this.sy(y) - py, this.sx(x) - px) * 180 / Math.PI;
    svgEl("path", { class: "g-utenfor", d: "M10 0 L-6 -7 L-6 7 Z", transform: `translate(${px} ${py}) rotate(${vinkel})` }, g);
    if (etikett) this.etikett(px, py, etikett + " (utenfor)", py < 40 ? "under" : "ov", g);
    return g;
  }

  etikett(px, py, tekst, plass = "ov", forelder = this.lagPunkter) {
    // plass: "ov", "under", "ov-v" (over, til venstre) eller "under-v"
    let anker = "start", dx = 10, dy = -10;
    if (plass.startsWith("under")) dy = 22;
    const bredde = tekst.length * 7 + 12; // omtrentlig tekstbredde
    const venstre = plass.endsWith("-v");
    if ((venstre && px - bredde >= 0) || (!venstre && px + bredde > this.B)) { anker = "end"; dx = -10; }
    if (py + dy < 16) dy = 22;            // ikke over øvre kant
    if (py + dy > this.H - 6) dy = -10;   // ikke under nedre kant
    const t = svgEl("text", { class: "g-etikett", x: px + dx, y: py + dy, "text-anchor": anker }, forelder);
    t.textContent = tekst;
    return t;
  }
}

// ================================================================ nedlasting

const STILER = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
  "font-family", "font-size", "font-style", "font-weight", "paint-order", "opacity", "text-anchor"];

function frittstaendeSVG(svg) {
  const kopi = svg.cloneNode(true);
  const orig = svg.querySelectorAll("*"), ny = kopi.querySelectorAll("*");
  orig.forEach((el, i) => {
    const cs = getComputedStyle(el);
    ny[i].setAttribute("style", STILER.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";"));
    ny[i].removeAttribute("class");
  });
  kopi.setAttribute("xmlns", SVGNS);
  const [, , b, h] = svg.getAttribute("viewBox").split(" ").map(Number);
  kopi.setAttribute("width", b);
  kopi.setAttribute("height", h);
  return { tekst: new XMLSerializer().serializeToString(kopi), b, h };
}

function lastNedBlob(blob, filnavn) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filnavn;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function lastNedSVG(svg, filnavn = "figur.svg") {
  lastNedBlob(new Blob([frittstaendeSVG(svg).tekst], { type: "image/svg+xml" }), filnavn);
}

export function lastNedPNG(svg, filnavn = "figur.png", skala = 2) {
  const { tekst, b, h } = frittstaendeSVG(svg);
  const bilde = new Image();
  bilde.onload = () => {
    const c = document.createElement("canvas");
    c.width = b * skala; c.height = h * skala;
    const ctx = c.getContext("2d");
    ctx.scale(skala, skala);
    ctx.drawImage(bilde, 0, 0);
    c.toBlob((blob) => blob && lastNedBlob(blob, filnavn), "image/png");
  };
  bilde.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(tekst);
}

// ================================================================ adressefelt

/** Les tall fra adressefeltet, for eksempel ?a=2&b=-3. Ugyldige verdier hoppes over. */
export function lesAdresse(navn) {
  const p = new URLSearchParams(location.search);
  const ut = {};
  for (const n of navn) {
    if (p.has(n)) { const v = tolkTall(p.get(n)); if (!Number.isNaN(v)) ut[n] = v; }
  }
  return ut;
}

/** Skriv verdier til adressefeltet uten å lage nye historikkinnslag. Tomme verdier fjernes. */
export function skrivAdresse(verdier) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(verdier)) {
    if (v === "" || v === null || v === undefined) p.delete(k); else p.set(k, String(v));
  }
  const q = p.toString();
  history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
}

// ================================================================ sideoppsett

/** Lys/mørk modus. Valget står i html[data-tema] («lys» eller «mork»), som på fysikklab.no. */
function settOppTema() {
  const knapp = document.getElementById("temaknapp");
  if (!knapp) return;
  const rot = document.documentElement;
  const system = matchMedia("(prefers-color-scheme: dark)");
  const gjeldende = () => rot.dataset.tema || (system.matches ? "mork" : "lys");
  const oppdater = () => {
    const tekst = gjeldende() === "mork" ? "Bytt til lys modus" : "Bytt til mørk modus";
    knapp.setAttribute("aria-label", tekst);
    knapp.title = tekst;
  };
  knapp.hidden = false;
  knapp.addEventListener("click", () => {
    const nytt = gjeldende() === "mork" ? "lys" : "mork";
    rot.dataset.tema = nytt;
    lagre("tema", nytt);
    oppdater();
  });
  system.addEventListener("change", oppdater);
  oppdater();
}

function settOppTavle() {
  const knapp = document.getElementById("tavleknapp");
  if (!knapp) return;
  knapp.hidden = false;
  const oppdater = () => knapp.setAttribute("aria-pressed", String(document.documentElement.classList.contains("tavle")));
  knapp.addEventListener("click", () => {
    const på = document.documentElement.classList.toggle("tavle");
    lagre("tavle", på ? "1" : "0");
    oppdater();
  });
  oppdater();
}

const FAG = () => Array.from(document.querySelectorAll("#fagvalg option")).map((o) => o.value).filter(Boolean);

/** Gjeldende fag: ?fag=… i adressen vinner, ellers det lagrede valget. ?fag=alle nullstiller. */
export function gjeldendeFag() {
  const p = new URLSearchParams(location.search);
  if (p.has("fag")) {
    const f = p.get("fag");
    const gyldig = FAG().includes(f) ? f : "";
    lagre("fag", gyldig);
    return gyldig;
  }
  const lagret = hent("fag", "");
  return FAG().includes(lagret) ? lagret : "";
}

function settFag(fag) {
  lagre("fag", fag);
  const velger = document.getElementById("fagvalg");
  if (velger) velger.value = fag;
  // Lenker til oversiktssidene tar med fagvalget, så det følger eleven rundt.
  document.querySelectorAll('.meny a[href*="index.html"]').forEach((a) => {
    const [sti, sok] = a.getAttribute("href").split("?");
    const p = new URLSearchParams(sok || "");
    if (fag) p.set("fag", fag); else p.delete("fag");
    const q = p.toString();
    a.setAttribute("href", sti + (q ? "?" + q : ""));
  });
  document.dispatchEvent(new CustomEvent("mattelab:fag", { detail: fag }));
}

function settOppFagvalg() {
  const velger = document.getElementById("fagvalg");
  if (!velger) return;
  velger.hidden = false;
  settFag(gjeldendeFag());
  velger.addEventListener("change", () => settFag(velger.value));
}

/**
 * Filter på oversiktssidene, som på fysikklab.no: knapper for fag og tema, og fritekstsøk.
 * Valgene står i adressen (?fag=1T&tema=funksjoner&q=topp), så en filtrert side kan deles.
 */
function settOppFilter() {
  const ramme = document.querySelector(".filter");
  if (!ramme) return;
  ramme.hidden = false;
  const kort = Array.from(document.querySelectorAll(".sim-kort-liste > li"));
  const blokker = Array.from(document.querySelectorAll(".tema-blokk"));
  const sok = ramme.querySelector(".filter-sok");
  const antall = ramme.querySelector(".filter-antall");
  const tom = document.querySelector(".filter-tom");
  const p = new URLSearchParams(location.search);
  const kjenteTemaer = Array.from(ramme.querySelectorAll("[data-tema]")).map((k) => k.dataset.tema).filter(Boolean);
  const valgt = { fag: gjeldendeFag(), tema: kjenteTemaer.includes(p.get("tema")) ? p.get("tema") : "" };
  sok.value = p.get("q") || "";

  const normal = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

  const oppdater = () => {
    for (const k of ramme.querySelectorAll("[data-fag]")) k.setAttribute("aria-pressed", String(k.dataset.fag === valgt.fag));
    for (const k of ramme.querySelectorAll("[data-tema]")) k.setAttribute("aria-pressed", String(k.dataset.tema === valgt.tema));
    const ord = normal(sok.value).split(/\s+/).filter(Boolean);
    let vist = 0;
    for (const li of kort) {
      const vis = (!valgt.fag || li.dataset.fag.split(" ").includes(valgt.fag))
        && (!valgt.tema || li.dataset.tema.split(" ").includes(valgt.tema))
        && ord.every((o) => normal(li.dataset.tekst).includes(o));
      li.hidden = !vis;
      if (vis) vist++;
    }
    for (const b of blokker) b.hidden = !b.querySelector(".sim-kort-liste > li:not([hidden])");
    const filtrert = valgt.fag || valgt.tema || ord.length;
    antall.textContent = filtrert ? `Viser ${vist} av ${kort.length}` : "";
    if (tom) tom.hidden = vist > 0;
    skrivAdresse({ fag: valgt.fag, tema: valgt.tema, q: sok.value.trim() });
  };

  ramme.addEventListener("click", (e) => {
    const k = e.target.closest("button");
    if (!k) return;
    if ("fag" in k.dataset) { valgt.fag = k.dataset.fag; settFag(valgt.fag); }
    if ("tema" in k.dataset) valgt.tema = k.dataset.tema;
    oppdater();
  });
  sok.addEventListener("input", oppdater);
  tom?.querySelector("button")?.addEventListener("click", () => {
    valgt.fag = ""; valgt.tema = ""; sok.value = ""; settFag(""); oppdater();
  });
  document.addEventListener("mattelab:fag", (e) => { if (valgt.fag !== e.detail) { valgt.fag = e.detail; oppdater(); } });
  oppdater();
}

settOppTema();
settOppTavle();
settOppFagvalg();
settOppFilter();
