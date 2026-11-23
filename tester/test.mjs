// Tester for mattelab.no i headless Chrome.
// Kjør: python3 bygg.py && npm test
// Krever Google Chrome installert (playwright-core bruker den, laster ikke ned egen nettleser).
// Skjermbilder lagres i tester/resultater/ (ikke versjonskontrollert).

import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROT, "docs");
const RES = path.join(ROT, "tester", "resultater");
fs.mkdirSync(RES, { recursive: true });

// ---------------------------------------------------------------- enkel webtjener for docs/
const TYPER = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain" };
const tjener = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const fil = path.join(DOCS, p);
  if (!fil.startsWith(DOCS) || !fs.existsSync(fil) || fs.statSync(fil).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": TYPER[path.extname(fil)] || "application/octet-stream" });
  fs.createReadStream(fil).pipe(res);
});
await new Promise((r) => tjener.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${tjener.address().port}/`;

const SIDER = [];
(function finn(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== "statisk") finn(p); }
    else if (f.endsWith(".html")) SIDER.push(path.relative(DOCS, p).split(path.sep).join("/"));
  }
})(DOCS);

// ---------------------------------------------------------------- testrammeverk
let ok = 0, feil = 0;
const feilmeldinger = [];
function sjekk(betingelse, navn, detalj = "") {
  if (betingelse) { ok++; console.log("  ✓ " + navn); }
  else { feil++; feilmeldinger.push(navn + (detalj ? ` — ${detalj}` : "")); console.log("  ✗ " + navn + (detalj ? `  [${detalj}]` : "")); }
}

const nettleser = await chromium.launch({ channel: "chrome", headless: true });

async function nySide(valg = {}) {
  const kontekst = await nettleser.newContext({ viewport: { width: 1280, height: 900 }, ...valg });
  const side = await kontekst.newPage();
  const problemer = [];
  side.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problemer.push(`console.${m.type()}: ${m.text()}`); });
  side.on("pageerror", (e) => problemer.push("JS-feil: " + e.message));
  side.on("requestfailed", (r) => problemer.push("feilet: " + r.url()));
  side.on("response", (r) => { if (r.status() >= 400) problemer.push(`${r.status()}: ${r.url()}`); });
  return { side, kontekst, problemer };
}

// ---------------------------------------------------------------- 1. alle sider: feil, lenker, mobilbredde
console.log("\n1. Alle sider: JS-feil, døde lenker og bredde");
const lenker = new Set();
for (const navn of SIDER) {
  for (const bredde of [1280, 360]) {
    const { side, kontekst, problemer } = await nySide({ viewport: { width: bredde, height: 800 } });
    await side.goto(BASE + navn, { waitUntil: "networkidle" });
    await side.waitForTimeout(150);
    sjekk(problemer.length === 0, `${navn} @ ${bredde}px: ingen feil i konsollen eller nettverket`, problemer.join(" | "));
    const { sw, cw } = await side.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    sjekk(sw <= cw, `${navn} @ ${bredde}px: ingen vannrett rulling`, `scrollWidth ${sw} > ${cw}`);
    if (bredde === 360) {
      // Finn elementer som stikker utenfor skjermen (hjelp ved feilsøking)
      const utenfor = await side.evaluate(() => Array.from(document.querySelectorAll("body *")).filter((e) => {
        const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !e.closest(".katex-display, .tabell-rull, .divisjon-rull, .tabell-rull-liten, .forskrift, .former p, .utregning, .likning, .katex-mathml, svg, .kort-bunke");
      }).slice(0, 5).map((e) => e.tagName + "." + e.className));
      sjekk(utenfor.length === 0, `${navn} @ 360px: ingen elementer utenfor skjermkanten`, utenfor.join(", "));
      await side.screenshot({ path: path.join(RES, navn.replace(/\//g, "_") + "-360.png"), fullPage: true });
    } else {
      for (const h of await side.$$eval("a[href]", (as) => as.map((a) => a.href))) lenker.add(h);
    }
    // Alle kontroller skal ha et tilgjengelig navn
    const umerket = await side.evaluate(() => Array.from(document.querySelectorAll("input, select, button, textarea")).filter((el) => {
      if (el.closest("[hidden]")) return false;
      const navn = el.getAttribute("aria-label") || (el.labels && el.labels.length && el.labels[0].textContent.trim()) || el.textContent.trim() || el.getAttribute("title");
      return !navn;
    }).map((el) => el.outerHTML.slice(0, 80)));
    sjekk(umerket.length === 0, `${navn} @ ${bredde}px: alle kontroller har etikett`, umerket.join(" | "));
    await kontekst.close();
  }
}

console.log("\n2. Interne lenker");
{
  const { side, kontekst } = await nySide();
  for (const url of lenker) {
    if (!url.startsWith(BASE)) continue;
    const svar = await side.request.get(url.split("#")[0]);
    sjekk(svar.status() === 200, `lenke ${url.replace(BASE, "/")} svarer 200`, String(svar.status()));
  }
  await kontekst.close();
}

// ---------------------------------------------------------------- 3. tallformat i felles.js
console.log("\n3. Tallformat");
{
  const { side, kontekst } = await nySide();
  await side.goto(BASE + "index.html");
  const r = await side.evaluate(async () => {
    const f = await import("./statisk/js/felles.js");
    return {
      a: f.tall(-2.5), b: f.tall(12345.678, 2), c: f.tall(-0.0001), d: f.tall(3), e: f.tall(1234),
      g: f.tolkTall("−2,5"), h: f.tolkTall("abc"), i: f.tallOmtrent(1 / 3), j: f.tallOmtrent(0.5), k: f.rens(0.1 + 0.2),
    };
  });
  sjekk(r.a === "−2,5", "−2,5 med ekte minustegn og komma", r.a);
  sjekk(r.b === "12 345,68", "tusenskille med mellomrom", r.b);
  sjekk(r.c === "0", "ingen «−0»", r.c);
  sjekk(r.d === "3" && r.e === "1234", "heltall uten desimaler; firesifret tall uten tusenskille", `${r.d} ${r.e}`);
  sjekk(r.g === -2.5 && Number.isNaN(r.h), "tolker «−2,5» og avviser tekst");
  sjekk(r.i === "≈ 0,33" && r.j === "0,5", "≈ bare når tallet er avrundet", `${r.i} / ${r.j}`);
  sjekk(r.k === 0.3, "rens fjerner flyttallsstøy");
  await kontekst.close();
}

// ---------------------------------------------------------------- 4. andregradsfunksjonen
console.log("\n4. Andregradsfunksjonen: verdier og spesialtilfeller");
{
  const { side, kontekst, problemer } = await nySide();
  const URL_ = BASE + "utforskere/andregradsfunksjonen.html";
  await side.goto(URL_, { waitUntil: "networkidle" });
  const verdi = async (dt) => side.evaluate((dt) => {
    const d = Array.from(document.querySelectorAll("#verdier dt")).find((x) => x.textContent === dt);
    return d ? d.nextElementSibling.textContent.replace(/\s+/g, " ").trim() : null;
  }, dt);
  const settABC = async (a, b, c) => {
    for (const [n, v] of [["a", a], ["b", b], ["c", c]]) {
      await side.fill(`#glider-${n}-tall`, v);
      await side.press(`#glider-${n}-tall`, "Enter");
    }
    await side.waitForTimeout(50);
  };
  const M = "−";

  // Standard: x² − 2x − 3
  sjekk((await verdi("Nullpunkter")) === `x = ${M}1 og x = 3`, "standard: nullpunkter −1 og 3", await verdi("Nullpunkter"));
  sjekk((await verdi("Bunnpunkt")) === `(1, ${M}4)`, "standard: bunnpunkt (1, −4)", await verdi("Bunnpunkt"));

  await settABC("2", "-8", "6");
  sjekk((await verdi("Nullpunkter")) === "x = 1 og x = 3", "2x² − 8x + 6: nullpunkter 1 og 3", await verdi("Nullpunkter"));
  sjekk((await verdi("Bunnpunkt")) === `(2, ${M}2)`, "2x² − 8x + 6: bunnpunkt (2, −2)", await verdi("Bunnpunkt"));
  sjekk((await verdi("f(x) < 0 når")) === "1 < x < 3", "2x² − 8x + 6: f(x) < 0 når 1 < x < 3", await verdi("f(x) < 0 når"));
  sjekk((await verdi("Diskriminant")).includes("16"), "2x² − 8x + 6: D = 16", await verdi("Diskriminant"));
  sjekk(/a=2&b=-8&c=6/.test(side.url()), "adressen oppdateres med a, b og c", side.url());
  const forskrift = await side.textContent("#forskrift .katex-mathml annotation");
  sjekk(forskrift === "f(x) = 2x^2 - 8x + 6", "funksjonsuttrykket skrives riktig", forskrift);

  await settABC("-1", "0", "4");
  sjekk((await verdi("Toppunkt")) === "(0, 4)", "a < 0 gir toppunkt", await verdi("Toppunkt"));
  sjekk((await verdi("f(x) > 0 når")) === `${M}2 < x < 2`, "−x² + 4: f(x) > 0 når −2 < x < 2", await verdi("f(x) > 0 når"));

  await settABC("1", "-4", "4");
  sjekk((await verdi("Antall nullpunkter")).startsWith("1"), "D = 0: ett nullpunkt", await verdi("Antall nullpunkter"));
  sjekk((await side.textContent("#melding")).includes("D = 0"), "D = 0: forklarende melding vises");
  sjekk((await verdi("f(x) > 0 når")) === "alle x unntatt x = 2", "D = 0: fortegn", await verdi("f(x) > 0 når"));

  await settABC("1", "-4", "5");
  sjekk((await verdi("Nullpunkter")) === "Ingen", "D < 0: ingen nullpunkter");
  sjekk((await side.textContent("#melding")).includes("D < 0"), "D < 0: forklarende melding vises");

  await settABC("0", "2", "1");
  sjekk((await side.textContent("#melding")).includes("lineær"), "a = 0: melding om lineær funksjon");
  sjekk((await verdi("Nullpunkter")) === `x = ${M}0,5`, "a = 0: nullpunkt −0,5", await verdi("Nullpunkter"));
  sjekk((await verdi("Diskriminant")) === "Finnes ikke når a = 0", "a = 0: ingen diskriminant");
  await settABC("0", "0", "3");
  sjekk((await side.textContent("#melding")).includes("konstant"), "a = b = 0: konstant funksjon");
  await settABC("0", "0", "0");
  sjekk((await verdi("Nullpunkter")) === "Alle x er nullpunkter", "a = b = c = 0: alle x er nullpunkter");

  // Punkter utenfor tegneområdet (oppgave 6, a = 0,01)
  await settABC("0,01", "2", "1");
  sjekk((await verdi("Bunnpunkt")) === `(${M}100, ${M}99)`, "a = 0,01: bunnpunkt (−100, −99)", await verdi("Bunnpunkt"));
  sjekk((await verdi("Nullpunkter")) === `x ≈ ${M}199,5 og x ≈ ${M}0,5`, "a = 0,01: nullpunkter med ≈", await verdi("Nullpunkter"));
  sjekk(await side.isVisible("#utenfor"), "punkter utenfor tegneområdet gir melding");
  sjekk((await side.$$(".g-utenfor")).length > 0, "pil ved kanten for punkt utenfor");
  await side.click("#vis-alt");
  sjekk(!(await side.isVisible("#utenfor")), "«Vis hele grafen» viser alle punktene");

  // Oppgave 6-tallene, regnet ut i verktoy/fasit/andregrad.py
  for (const [a, topp, n] of [["0,5", `(${M}2, ${M}1)`, `x ≈ ${M}3,41 og x ≈ ${M}0,59`], ["0,1", `(${M}10, ${M}9)`, `x ≈ ${M}19,49 og x ≈ ${M}0,51`]]) {
    await settABC(a, "2", "1");
    sjekk((await verdi("Bunnpunkt")) === topp && (await verdi("Nullpunkter")) === n, `oppgave 6, a = ${a}`, `${await verdi("Bunnpunkt")} ${await verdi("Nullpunkter")}`);
  }

  // Tastatur: piltast på glidebryteren
  await settABC("1", "0", "0");
  await side.focus("#glider-a");
  await side.keyboard.press("ArrowRight");
  sjekk((await side.inputValue("#glider-a-tall")) === "1,1", "piltast høyre øker a med 0,1", await side.inputValue("#glider-a-tall"));
  await side.waitForTimeout(700);
  const live = await side.evaluate(() => Array.from(document.querySelectorAll("[aria-live]")).map((e) => e.textContent).join(" "));
  sjekk(live.includes("a = 1,1") && live.includes("Bunnpunkt"), "aria-live leser opp nye verdier", live);

  // Ugyldig tekst i tallfeltet
  await side.fill("#glider-b-tall", "abc");
  sjekk((await side.getAttribute("#glider-b-tall", "aria-invalid")) === "true", "ugyldig tall markeres");
  await side.press("#glider-b-tall", "Enter");
  sjekk((await side.inputValue("#glider-b-tall")) === "0", "ugyldig tall settes tilbake ved Enter");

  // Oppgavelenke
  await side.click("#oppgave-3 a.oppsettlenke");
  sjekk((await verdi("Nullpunkter")) === "x = 1 og x = 3", "oppgavelenken setter a, b og c");

  // Tilfeldige verdier: nullpunktene må gi f(x) ≈ 0 og stemme med fortegnet til D
  const fuzz = await side.evaluate(() => {
    const { analyser } = window.mattelabAndregrad;
    const feil = [];
    for (let i = 0; i < 5000; i++) {
      const t = () => Math.round((Math.random() * 20 - 10) * 10) / 10;
      const a = t(), b = t(), c = t();
      const r = analyser(a, b, c);
      if (a === 0) continue;
      const forventet = r.D > 0 ? 2 : r.D === 0 ? 1 : 0;
      if (r.nullpunkter.length !== forventet) feil.push(`antall ${a},${b},${c}`);
      for (const x of r.nullpunkter) {
        const skala = Math.abs(a * x * x) + Math.abs(b * x) + Math.abs(c) + 1;
        if (Math.abs(a * x * x + b * x + c) / skala > 1e-9) feil.push(`f(x)≠0 ${a},${b},${c}`);
      }
      if (Math.abs(a * r.xs * r.xs + b * r.xs + c - r.ys) > 1e-9 * (1 + Math.abs(r.ys))) feil.push(`toppunkt ${a},${b},${c}`);
    }
    return feil;
  });
  sjekk(fuzz.length === 0, "5000 tilfeldige (a, b, c): nullpunkter og toppunkt stemmer", fuzz.slice(0, 5).join("; "));

  // Nedlasting av figuren
  for (const [knapp, filnavn, start] of [["#last-ned-svg", "andregradsfunksjon.svg", "<svg"], ["#last-ned-png", "andregradsfunksjon.png", "\x89PNG"]]) {
    const [nedlasting] = await Promise.all([side.waitForEvent("download"), side.click(knapp)]);
    const fil = path.join(RES, filnavn);
    await nedlasting.saveAs(fil);
    const innhold = fs.readFileSync(fil);
    sjekk(nedlasting.suggestedFilename() === filnavn && innhold.subarray(0, 4).toString("latin1") === start && innhold.length > 2000,
      `nedlasting gir gyldig ${filnavn.split(".")[1].toUpperCase()}`, `${nedlasting.suggestedFilename()} ${innhold.length} byte`);
  }

  // «Matematikken bak» er lukket fra start og kan åpnes
  sjekk(!(await side.getAttribute("#matematikken", "open")) && !(await side.isVisible("#matematikken .teori-innhold")), "teoridelen er lukket fra start");
  await side.click("#matematikken > summary");
  sjekk(await side.isVisible("#matematikken .teori-innhold h3"), "teoridelen kan åpnes");

  // Elevark: PDF uten fasit
  const pdfUrl = await side.getAttribute(".elevark-lenke a[href$='.pdf']", "href");
  const pdfSvar = await side.request.get(new URL(pdfUrl, side.url()).href);
  const pdf = await pdfSvar.body();
  sjekk(pdfSvar.status() === 200 && pdf.subarray(0, 5).toString("latin1") === "%PDF-", "elevarket lastes ned som PDF", pdfUrl);
  const pdfFil = path.join(RES, "elevark.pdf");
  fs.writeFileSync(pdfFil, pdf);
  const pdfTekst = execFileSync("pdftotext", ["-layout", pdfFil, "-"]).toString();
  // Nummer og første ord i hver oppgavetittel (uten KaTeX sin skjulte MathML) skal stå i PDF-en
  const titler = await side.$$eval(".oppgave > h3", (h) => h.map((x) => {
    const k = x.cloneNode(true); k.querySelectorAll(".katex-mathml").forEach((m) => m.remove());
    return k.textContent.trim().replace(/^(\d+)/, "$1 ").split(/\s+/).slice(0, 2).join(" ");
  }));
  sjekk(titler.length === 6 && titler.every((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(" ", "\\s+")).test(pdfTekst)), "alle oppgavene er med i elevarket", titler.join(" | "));
  const steg = (pdfTekst.match(/Gjett|Test|Forklar/g) || []).length;
  sjekk(steg >= 18, "elevarket har Gjett, Test og Forklar for hver oppgave", String(steg));
  const fasitbiter = ["Løsningsforslag", "Bunnpunktene blir", "199,499", "Tallet c legges til", "Parabelen er symmetrisk om symmetrilinja"];
  sjekk(fasitbiter.every((b) => !pdfTekst.includes(b)), "elevarket inneholder ikke fasit", fasitbiter.filter((b) => pdfTekst.includes(b)).join(", "));
  sjekk(!pdfTekst.includes("{{") && !pdfTekst.includes("$"), "ingen plassholdere eller rå formler i elevarket");
  const texSvar = await side.request.get(new URL(await side.getAttribute(".elevark-tex", "href"), side.url()).href);
  sjekk(texSvar.status() === 200 && (await texSvar.text()).includes("\\documentclass"), "LaTeX-kilden kan lastes ned");

  // Lenke med verdier i adressen
  await side.goto(URL_ + "?a=2&b=-8&c=6", { waitUntil: "networkidle" });
  sjekk((await verdi("Bunnpunkt")) === `(2, ${M}2)`, "verdier leses fra adressen");
  sjekk(problemer.length === 0, "ingen JS-feil under interaksjonen", problemer.join(" | "));
  await side.screenshot({ path: path.join(RES, "andregrad-lys.png"), fullPage: false });
  await kontekst.close();
}

// ---------------------------------------------------------------- 5. mørk modus
console.log("\n5. Mørk modus");
{
  const farger = async (skjema, tvang) => {
    const { side, kontekst } = await nySide({ colorScheme: skjema });
    if (tvang) await side.addInitScript((t) => localStorage.setItem("mattelab.tema", t), tvang);
    await side.goto(BASE + "utforskere/andregradsfunksjonen.html?a=1&b=-2&c=-3", { waitUntil: "networkidle" });
    const r = await side.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      graf: getComputedStyle(document.querySelector(".g-graf")).stroke,
      gbg: getComputedStyle(document.querySelector(".g-bakgrunn")).fill,
      tekst: document.getElementById("temaknapp").textContent,
    }));
    if (skjema === "dark" && !tvang) await side.screenshot({ path: path.join(RES, "andregrad-mork.png") });
    await kontekst.close();
    return r;
  };
  const lys = await farger("light"), mork = await farger("dark"), tvungetLys = await farger("dark", "lys");
  sjekk(lys.bg !== mork.bg, "bakgrunnen bytter ved mørk modus", `${lys.bg} / ${mork.bg}`);
  sjekk(lys.graf !== mork.graf && lys.gbg !== mork.gbg, "grafen bytter farger ved mørk modus", `${lys.graf} / ${mork.graf}`);
  sjekk(tvungetLys.bg === lys.bg, "valgt lys modus overstyrer systemets mørke modus");
}

// ---------------------------------------------------------------- 6. uten JavaScript
console.log("\n6. Uten JavaScript");
{
  const { side, kontekst } = await nySide({ javaScriptEnabled: false });
  await side.goto(BASE + "utforskere/andregradsfunksjonen.html");
  sjekk(await side.isVisible("text=Utforskeren trenger JavaScript"), "melding om at utforskeren trenger JavaScript");
  sjekk(await side.isVisible("#oppgave-6"), "oppgavene vises");
  sjekk(await side.isVisible(".katex >> nth=0"), "formlene vises (ferdig tegnet)");
  sjekk(!(await side.isVisible("#graf")), "den tomme grafen er skjult");
  sjekk(!(await side.isVisible("#fagvalg")), "fagvalget er skjult (krever JS)");
  sjekk(!(await side.isVisible("#matematikken .teori-innhold")), "teoridelen er lukket også uten JS");
  await side.click("#matematikken > summary");
  sjekk(await side.isVisible("#matematikken .teori-innhold h3"), "teoridelen kan åpnes uten JS");
  await side.click("#oppgave-1 summary");
  sjekk(await side.isVisible("#oppgave-1 details ul"), "løsningsforslag kan åpnes uten JS");
  await side.goto(BASE + "utforskere/index.html");
  const kort = await side.$$eval(".sim-kort-liste > li", (k) => k.filter((x) => x.offsetParent).length);
  sjekk(kort === 23, "oversikten viser alle 23 utforskere", String(kort));
  await kontekst.close();
}

// ---------------------------------------------------------------- 7. filter og fagvalg
console.log("\n7. Filter og fagvalg");
{
  const { side, kontekst, problemer } = await nySide();
  const synlige = () => side.$$eval(".sim-kort-liste > li", (k) => k.filter((x) => !x.hidden).length);
  await side.goto(BASE + "utforskere/index.html?fag=R1", { waitUntil: "networkidle" });
  sjekk((await synlige()) === 7, "?fag=R1 viser 7 utforskere", String(await synlige()));
  sjekk((await side.inputValue("#fagvalg")) === "R1", "?fag=R1 setter fagvalget i menyen");
  sjekk((await side.getAttribute('.filter-knapp[data-fag="R1"]', "aria-pressed")) === "true", "R1-knappen i filteret er valgt");
  sjekk(await side.isHidden('.tema-blokk[data-blokk="algebra"]'), "temablokker uten treff skjules");
  await side.goto(BASE + "om.html");
  sjekk((await side.inputValue("#fagvalg")) === "R1", "fagvalget huskes på andre sider");
  const menyLenke = await side.getAttribute('.meny a[href*="utforskere"]', "href");
  sjekk(menyLenke.includes("fag=R1"), "menylenken tar med fagvalget", menyLenke);
  await side.selectOption("#fagvalg", "");
  await side.goto(BASE + "utforskere/index.html");
  sjekk((await synlige()) === 23, "«Alle fag» viser alle", String(await synlige()));
  await side.click('.filter-knapp[data-tema="derivasjon"]');
  sjekk((await synlige()) === 4, "tema Derivasjon viser 4", String(await synlige()));
  sjekk(side.url().includes("tema=derivasjon"), "temavalget står i adressen", side.url());
  sjekk((await side.getAttribute('.filter-knapp[data-tema="derivasjon"]', "aria-pressed")) === "true", "temaknappen har aria-pressed");
  sjekk((await side.textContent(".filter-antall")) === "Viser 4 av 23", "antall treff vises", await side.textContent(".filter-antall"));
  await side.click('.filter-knapp[data-tema=""]');
  await side.fill("#filter-sok", "toppunkt");
  sjekk((await synlige()) === 1, "søk «toppunkt» gir 1 treff", String(await synlige()));
  sjekk(side.url().includes("q=toppunkt"), "søket står i adressen");
  await side.fill("#filter-sok", "finnesikke");
  sjekk(await side.isVisible(".filter-tom"), "melding ved ingen treff");
  await side.click(".filter-tom button");
  sjekk((await synlige()) === 23, "«Vis alt» nullstiller filteret");
  await side.click('.filter-knapp[data-fag="1T"]');
  sjekk((await side.inputValue("#fagvalg")) === "1T", "fagknapp i filteret oppdaterer menyen");
  sjekk(problemer.length === 0, "ingen JS-feil i filteret", problemer.join(" | "));
  await kontekst.close();
}

// ---------------------------------------------------------------- 8. forsiden
console.log("\n8. Forsiden");
{
  const { side, kontekst, problemer } = await nySide();
  await side.goto(BASE + "index.html", { waitUntil: "networkidle" });
  const tall_ = () => side.textContent("#forside-tall");
  sjekk((await tall_()).includes("(1, \u22124)") && (await tall_()).includes("\u22121 og 3"), "liten utforsker viser bunnpunkt og nullpunkter", await tall_());
  // Regnet ut med kode: a = 1, b = −2, c = 2 gir D = −4 og bunnpunkt (1, 1)
  await side.fill("#glider-forside-c-tall", "2");
  await side.press("#glider-forside-c-tall", "Enter");
  sjekk((await tall_()).includes("Ingen") && (await tall_()).includes("\u22124") && (await tall_()).includes("(1, 1)"), "c = 2 gir ingen nullpunkter, D = −4 og bunnpunkt (1, 1)", await tall_());
  await side.fill("#glider-forside-c-tall", "1");
  await side.press("#glider-forside-c-tall", "Enter");
  sjekk((await tall_()).includes("Nullpunkter1") && (await tall_()).includes("D0"), "c = 1 gir D = 0 og ett nullpunkt", await tall_());
  const fagkort = await side.$$eval(".fag-kort", (k) => k.map((x) => x.querySelector("h3").textContent.trim()));
  sjekk(fagkort.length === 2 && fagkort[0].startsWith("Matematikk 1T"), "to fagkort", fagkort.join(" | "));
  sjekk(problemer.length === 0, "ingen JS-feil på forsiden", problemer.join(" | "));
  await kontekst.close();
}

// ---------------------------------------------------------------- 9. alle utforskerne
// Forventede tall er regnet ut i verktoy/fasit/*.py.
console.log("\n9. De andre utforskerne: verdier, spesialtilfeller, oppgavelenker og elevark");
const M = "−";
const UTFORSKERE = {
  "lineaer-funksjon": {
    oppgaver: 5,
    verdier: [
      ["", "Nullpunkt", `x = ${M}2`],
      ["?modus=punkter&x1=1&y1=2&x2=4&y2=8", "Stigningstall", "a = 2"],
      ["?modus=punkter&x1=-2&y1=5&x2=2&y2=-1", "Stigningstall", `a = ${M}1,5`],
      ["?modus=punkter&x1=-2&y1=5&x2=2&y2=-1", "Konstantledd", "b = 2"],
      ["?modus=ab&a=-2.5&b=20", "Nullpunkt", "x = 8"],
      ["?modus=ab&a=0&b=3", "Nullpunkt", "Ingen"],
      ["?modus=punkter&x1=2&y1=1&x2=2&y2=5", "Stigningstall", "Finnes ikke (Δx = 0)"],
    ],
    meldinger: [["?modus=punkter&x1=2&y1=1&x2=2&y2=5", "loddrett"], ["?modus=punkter&x1=2&y1=1&x2=2&y2=1", "To like punkter"], ["?modus=ab&a=0&b=3", "vannrett"]],
  },
  likningssett: {
    oppgaver: 5,
    verdier: [
      ["", "Løsning", "x = 2 og y = 1"],
      ["?a1=3&b1=2&c1=6&a2=1&b2=-2&c2=1", "Løsning", "x = 1,75 og y ≈ 0,38"],
      ["?a1=3&b1=2&c1=590&a2=1&b2=4&c2=480", "Løsning", "x = 140 og y = 85"],
      ["?a1=1&b1=2&c1=4&a2=1&b2=2&c2=1", "Løsning", "Ingen"],
      ["?a1=1&b1=2&c1=4&a2=2&b2=4&c2=8", "Løsning", "Uendelig mange"],
      ["?a1=3&b1=1&c1=3&a2=2&b2=1&c2=1", "Løsning", `x = 2 og y = ${M}3`],
      ["?a1=2&b1=1&c1=3&a2=2&b2=1&c2=1", "a₁b₂ − a₂b₁", "0"],
    ],
    meldinger: [["?a1=1&b1=2&c1=4&a2=1&b2=2&c2=1", "Parallelle"], ["?a1=1&b1=2&c1=4&a2=2&b2=4&c2=8", "Samme linje"], ["?a1=0&b1=0&c1=3&a2=1&b2=1&c2=1", "Ingen punkter"]],
  },
  kvadratsetningene: {
    oppgaver: 5,
    verdier: [
      ["", "(a + b)²", "25"],
      ["", "Vanlig feil: a² + b²", "13 (mangler 2ab = 12)"],
      ["?modus=sum&a=50&b=1", "(a + b)²", "2601"],
      ["?modus=diff&a=50&b=1", "(a − b)²", "2401"],
      ["?modus=konj&a=50&b=1", "(a + b)(a − b)", "2499"],
      ["?modus=diff&a=5&b=2", "(a − b)²", "9"],
      ["?modus=diff&a=2&b=5", "(a − b)²", "9"],
      ["?modus=konj&a=5&b=3", "(a + b)(a − b)", "16"],
      ["?modus=konj&a=3&b=5", "(a + b)(a − b)", `${M}16`],
      ["?modus=sum&a=4&b=3", "(a + b)²", "49"],
    ],
    meldinger: [["?modus=diff&a=2&b=5", "b > a"], ["?modus=konj&a=3&b=5", "negativ"], ["?modus=sum&a=0&b=0", "Det er ingen figur"]],
  },
  "rasjonale-funksjoner": {
    oppgaver: 5,
    verdier: [
      ["", "Loddrett asymptote", "x = 1"],
      ["", "Vannrett asymptote", "y = 2"],
      ["", "Nullpunkt", `x = ${M}0,5`],
      ["?a=0&b=1&c=1&d=0", "Vannrett asymptote", "y = 0"],
      ["?a=2&b=-4&c=1&d=-2", "Grafen", "y = 2 med et hull i x = 2"],
      ["?a=15&b=200&c=1&d=0", "Vannrett asymptote", "y = 15"],
      ["?a=15&b=200&c=1&d=0", "Skjærer y-aksen i", "Ingen (x = 0 er ikke med)"],
      ["?a=1&b=1&c=0&d=0", "Definert for", "Ingen x (nevneren er alltid 0)"],
      ["?a=2&b=1&c=0&d=2", "Nullpunkt", `x = ${M}0,5`],
    ],
    meldinger: [["?a=2&b=-4&c=1&d=-2", "forkortes"], ["?a=2&b=1&c=0&d=2", "lineær"], ["?a=1&b=1&c=0&d=0", "c = d = 0"]],
    tekst: [["", "#grensetabell", ["302", `${M}2998`, "3002", "ikke definert"]]],
  },
  vekst: {
    oppgaver: 5,
    verdier: [
      ["", "f(10)", "≈ 61,92"],
      ["", "N(10)", "≈ 49,16"],
      ["", "Vendepunkt", "t ≈ 16,15, N = 100"],
      ["?modus=eksp&N0=1000&p=5&t=10", "f(10)", "≈ 1628,89"],
      ["?modus=eksp&N0=1000&p=5&t=10", "Doblingstid", "T ≈ 14,21"],
      ["?modus=eksp&N0=10&p=20&t=0", "Doblingstid", "T ≈ 3,8"],
      ["?modus=eksp&N0=400&p=-15&t=6", "f(6)", "≈ 150,86"],
      ["?modus=eksp&N0=400&p=-15&t=6", "Halveringstid", "T ≈ 4,27"],
      ["?modus=begge&N0=10&p=20&K=200&t=20", "f(20)", "≈ 383,38"],
      ["?modus=begge&N0=10&p=20&K=200&t=20", "N(20)", "≈ 133,73"],
      ["?modus=logistisk&N0=300&p=20&K=200&t=5", "N(5)", "≈ 230,94"],
      ["?modus=eksp&N0=10&p=0&t=5", "Dobling/halvering", "Ingen (p = 0)"],
    ],
    meldinger: [["?modus=logistisk&N0=300&p=20&K=200&t=5", "over bæreevnen"], ["?modus=eksp&N0=10&p=0&t=5", "p = 0"]],
  },
  "sekant-tangent": {
    oppgaver: 5,
    verdier: [
      ["", "Stigningstall sekant", "a = 3"],
      ["", "Stigningstall tangent", "f′(1) = 2"],
      ["?fn=x2&x0=1&h=2", "Stigningstall sekant", "a = 4"],
      ["?fn=x2&x0=1&h=0.01", "Stigningstall sekant", "a = 2,01"],
      ["?fn=x2&x0=1&h=-0.1", "Stigningstall sekant", "a = 1,9"],
      ["?fn=kubisk&x0=1&h=0.5", "Stigningstall tangent", "f′(1) = 0"],
      ["?fn=kubisk&x0=2&h=0.5", "Stigningstall tangent", "f′(2) = 9"],
      ["?fn=abs&x0=0&h=-0.5", "Stigningstall sekant", `a = ${M}1`],
      ["?fn=abs&x0=0&h=0.5", "Stigningstall tangent", "Finnes ikke"],
      ["?fn=rot&x0=0&h=0.01", "Stigningstall sekant", "a = 10"],
      ["?fn=rot&x0=0.5&h=-1", "Sekant", "Finnes ikke (Q er utenfor definisjonsmengden)"],
      ["?fn=x2&x0=1&h=0", "Sekant", "Finnes ikke (h = 0)"],
    ],
    meldinger: [["?fn=abs&x0=0&h=0.5", "Knekk"], ["?fn=rot&x0=0&h=0.5", "Loddrett tangent"], ["?fn=x2&x0=1&h=0", "h = 0"], ["?fn=rot&x0=-1&h=0.5", "definisjonsmengden"]],
    tekst: [["?fn=x2&x0=1&h=1", "#tabell", ["2,001", "1,999", "2,1", "1,9"]]],
  },
  "funksjon-og-derivert": {
    oppgaver: 5,
    verdier: [
      ["", "Toppunkt", `(${M}1, 2)`],
      ["", "Bunnpunkt", `(1, ${M}2)`],
      ["", "f′(2)", "9 (tangentens stigningstall)"],
      ["?a=1&b=0&c=0&d=0&x0=0", "Terrassepunkt", "(0, 0)"],
      ["?a=1&b=0&c=3&d=0&x0=0", "Stasjonære punkter", "Ingen (f′(x) ≠ 0 for alle x)"],
      ["?a=1&b=-3&c=0&d=4&x0=1", "Toppunkt", "(0, 4)"],
      ["?a=1&b=-3&c=0&d=4&x0=1", "Bunnpunkt", "(2, 0)"],
      ["?a=1&b=-3&c=0&d=4&x0=1", "Vendepunkt", "(1, 2)"],
      ["?a=1&b=-3&c=0&d=4&x0=1", `f′(1)`, `${M}3 (tangentens stigningstall)`],
      ["?a=4&b=-40&c=100&d=0&x0=1", "Toppunkt", "(≈ 1,67, ≈ 74,07)"],
      ["?a=4&b=-40&c=100&d=0&x0=1", "f′(1)", "32 (tangentens stigningstall)"],
      ["?a=0&b=1&c=-2&d=0&x0=0", "Bunnpunkt", `(1, ${M}1)`],
      ["?a=0&b=0&c=0&d=2&x0=0", "Stasjonære punkter", "Alle x (f er konstant)"],
    ],
    meldinger: [["?a=1&b=0&c=0&d=0&x0=0", "Terrassepunkt"], ["?a=1&b=0&c=3&d=0&x0=0", "Ingen ekstremalpunkter"], ["?a=0&b=1&c=-2&d=0&x0=0", "andregradsfunksjon"]],
    tekst: [["", "#fortegn", ["topp", "bunn", "vokser", "avtar"]]],
  },
  trekant: {
    oppgaver: 5,
    verdier: [
      ["?modus=SVS&b=5&c=7&A=60", "a", "6,24"],
      ["?modus=SVS&b=5&c=7&A=60", "Areal", "15,16"],
      ["?modus=SVS&b=5&c=7&A=90", "a", "8,6"],
      ["?modus=SSS&a=3&b=4&c=5", "C", "90°"],
      ["?modus=SSS&a=3&b=4&c=5", "Type", "rettvinklet"],
      ["?modus=SSS&a=3&b=4&c=5", "A", "36,87°"],
      ["?modus=SSS&a=2&b=3&c=6", "Trekant", "Finnes ikke"],
      ["?modus=VSV&A=40&B=75&c=10", "a", "7,09"],
      ["?modus=VSV&A=40&B=75&c=10", "b", "10,66"],
      ["?modus=VSV&A=100&B=80&c=10", "Trekant", "Finnes ikke"],
      ["?modus=SSV&a=6&b=8&A=40", "B", "58,99°"],
      ["?modus=SSV&a=6&b=8&A=40", "c", "9,22"],
      ["?modus=SSV&a=6&b=8&A=40&valgt=2", "B", "121,01°"],
      ["?modus=SSV&a=6&b=8&A=40&valgt=2", "c", "3,04"],
      ["?modus=SSV&a=9&b=8&A=40", "B", "34,85°"],
      ["?modus=SSV&a=4&b=8&A=40", "Trekant", "Finnes ikke"],
      ["?modus=SVS&b=40&c=55&A=110", "Areal", "1033,66"],
      ["?modus=SSS&a=5&b=5&c=5", "Type", "spissvinklet og likesidet"],
    ],
    meldinger: [["?modus=SSV&a=6&b=8&A=40", "To trekanter"], ["?modus=SSV&a=4&b=8&A=40", "sinus kan aldri"], ["?modus=SSS&a=2&b=3&c=6", "trekantulikheten"], ["?modus=SSS&a=2&b=3&c=5", "flat"], ["?modus=VSV&A=100&B=80&c=10", "Vinkelsummen"]],
  },
  vektorer: {
    oppgaver: 5,
    verdier: [
      ["", "u · v", "5"],
      ["", "|w|", "5"],
      ["", "Vinkel mellom u og v", "θ = 45°"],
      ["?modus=kombinasjon&u1=3&u2=1&v1=-1&v2=3&s=1&t=1", "Ortogonale?", "Ja (u · v = 0)"],
      ["?modus=kombinasjon&u1=2&u2=1&v1=6&v2=3&s=1&t=1", "Parallelle?", "Ja (u₁v₂ − u₂v₁ = 0)"],
      ["?modus=kombinasjon&u1=2&u2=1&v1=6&v2=3&s=1&t=1", "Vinkel mellom u og v", "θ = 0°"],
      ["?modus=kombinasjon&u1=2&u2=1&v1=-4&v2=-2&s=1&t=1", "Vinkel mellom u og v", "θ = 180°"],
      ["?modus=kombinasjon&u1=3&u2=1&v1=1&v2=2&s=1.2&t=1.4", "w = su + tv", "[5, 4]"],
      ["?modus=kombinasjon&u1=0&u2=0&v1=1&v2=2&s=1&t=1", "Vinkel mellom u og v", "Ikke definert"],
      ["?modus=parameter&x0=1&y0=2&r1=2&r2=1&t=3", "Punkt for t", "(7, 5)"],
      ["?modus=parameter&x0=1&y0=2&r1=2&r2=1&t=2", "Punkt for t", "(5, 4)"],
    ],
    meldinger: [["?modus=kombinasjon&u1=2&u2=1&v1=6&v2=3&s=1&t=1", "Parallelle"], ["?modus=kombinasjon&u1=0&u2=0&v1=1&v2=2&s=1&t=1", "Nullvektor"], ["?modus=parameter&x0=1&y0=2&r1=0&r2=0&t=1", "nullvektoren"]],
    tekst: [["?modus=parameter&x0=1&y0=2&r1=2&r2=1&t=3", "#formler", ["y=0,5x+1,5"]]],
  },
  "brok-som-areal": {
    oppgaver: 5,
    verdier: [
      ["", "Svar (forkortet)", "1/2"],
      ["?modus=pluss&t1=1&n1=2&t2=1&n2=3", "Svar (forkortet)", "5/6"],
      ["?modus=pluss&t1=1&n1=2&t2=1&n2=3", "Felles nevner", "6"],
      ["?modus=dele&t1=3&n1=4&t2=1&n2=8", "Svar (forkortet)", "6"],
      ["?modus=dele&t1=2&n1=3&t2=1&n2=4", "Svar (forkortet)", "8/3"],
      ["?modus=dele&t1=2&n1=3&t2=1&n2=4", "Blandet tall", "2 og 2/3"],
      ["?modus=gange&t1=3&n1=4&t2=1&n2=2", "Svar (forkortet)", "3/8"],
      ["?modus=gange&t1=3&n1=4&t2=3&n2=2", "Svar (forkortet)", "9/8"],
    ],
    meldinger: [["?modus=dele&t1=1&n1=2&t2=0&n2=3", "Vi kan ikke dele"], ["?modus=gange&t1=12&n1=1&t2=1&n2=2", "Figuren blir for stor"]],
  },
  algebrabrikker: {
    oppgaver: 5,
    verdier: [
      ["", "Produktet", "x² + 5x + 6"],
      ["?a=1&b=0&c=1&d=3", "Produktet", "x² + 3x"],
      ["?a=1&b=3&c=1&d=3", "Produktet", "x² + 6x + 9"],
      ["?a=1&b=3&c=1&d=-3", "Produktet", `x² ${M} 9`],
      ["?a=1&b=3&c=1&d=-3", "Nullpar (x-brikker)", "3"],
      ["?a=2&b=-1&c=1&d=4", "Produktet", `2x² + 7x ${M} 4`],
      ["?a=2&b=-1&c=1&d=4", "x-brikker", "8 positive, 1 negativ"],
      ["?a=2&b=-1&c=1&d=4", "Enerbrikker", "4 negative"],
    ],
    meldinger: [["?a=1&b=3&c=1&d=-3", "Nullpar"], ["?a=0&b=0&c=1&d=2", "En faktor er 0"], ["?a=0&b=2&c=1&d=1", "En faktor uten x"]],
  },
  faktorisering: {
    oppgaver: 5,
    verdier: [
      ["", "Faktorisert", "(x + 2)(x + 3)"],
      ["?b=1&c=-6", "Faktorisert", `(x ${M} 2)(x + 3)`],
      ["?b=1&c=-6", "Nullpunkter", `x = ${M}3 og x = 2`],
      ["?b=-7&c=12", "Faktorisert", `(x ${M} 4)(x ${M} 3)`],
      ["?b=4&c=5", "Faktorisert", "Ikke med hele tall"],
      ["?b=4&c=5", "b² − 4c", `${M}4`],
      ["?b=6&c=9", "Faktorisert", "(x + 3)²"],
      ["?b=0&c=-9", "Faktorisert", `(x ${M} 3)(x + 3)`],
    ],
    meldinger: [["?b=4&c=5", "Kan ikke faktoriseres"], ["?b=6&c=9", "Like tall"], ["?b=0&c=-9", "konjugatsetningen"], ["?b=5&c=0", "c = 0"], ["?b=1&c=-1", "Ingen hele tall passer"]],
  },
  potenser: {
    oppgaver: 5,
    verdier: [
      ["", "Eksponent i svaret", "7"],
      ["", "Verdi", "128"],
      ["?modus=kvotient&g=2&m=5&n=2", "Verdi", "8"],
      ["?modus=kvotient&g=2&m=2&n=5", "Eksponent i svaret", `${M}3`],
      ["?modus=kvotient&g=2&m=2&n=5", "Verdi", "1/8 = 0,125"],
      ["?modus=kvotient&g=2&m=3&n=3", "Verdi", "1"],
      ["?modus=potens&g=2&m=3&n=2", "Verdi", "64"],
      ["?modus=monster&g=10&m=-1", "Verdi", "1/10 = 0,1"],
    ],
    meldinger: [["?modus=kvotient&g=2&m=3&n=3", "Eksponent 0"], ["?modus=kvotient&g=2&m=2&n=5", "Negativ eksponent"], ["?modus=potens&g=2&m=2&n=-1", "n < 0"]],
  },
  "fullstendig-kvadrat": {
    oppgaver: 5,
    verdier: [
      ["", "Fullført", `(x + 3)² ${M} 4`],
      ["", "Bunnpunkt", `(${M}3, ${M}4)`],
      ["", "Løsninger av likningen = 0", `x = ${M}5 og x = ${M}1`],
      ["?b=-4&c=1", "Fullført", `(x ${M} 2)² ${M} 3`],
      ["?b=-4&c=1", "Løsninger av likningen = 0", "x ≈ 0,27 og x ≈ 3,73"],
      ["?b=5&c=4", "Fullført", `(x + 5/2)² ${M} 9/4`],
      ["?b=2&c=5", "Løsninger av likningen = 0", "Ingen"],
      ["?b=6&c=9", "Fullført", "(x + 3)²"],
    ],
    meldinger: [["?b=2&c=5", "Ingen løsning"], ["?b=6&c=9", "q = 0"], ["?b=0&c=-4", "b = 0"], ["?b=5&c=4", "oddetall"]],
  },
  "abc-formelen": {
    oppgaver: 5,
    verdier: [
      ["", "b² − 4ac", "16"],
      ["", "Løsninger", `x = ${M}1 og x = 3`],
      ["", "Symmetrilinje", "x = 1"],
      ["", "Avstand til nullpunktene", "√D / 2|a| = 2"],
      ["?a=1&b=-2&c=1", "Antall løsninger", "1"],
      ["?a=1&b=-2&c=3", "Løsninger", "Ingen"],
      ["?a=2&b=-8&c=6", "Symmetrilinje", "x = 2"],
      ["?a=-1&b=4&c=-3", "Løsninger", "x = 1 og x = 3"],
      ["?a=0&b=2&c=1", "Løsninger", `x = ${M}0,5`],
    ],
    meldinger: [["?a=1&b=-2&c=3", "b² − 4ac < 0"], ["?a=1&b=-2&c=1", "b² − 4ac = 0"], ["?a=0&b=2&c=1", "a = 0"]],
  },  polynomfunksjoner: {
    oppgaver: 5,
    verdier: [
      ["", "Skjærer y-aksen i", "(0, 6)"],
      ["", "Nullpunkter", `x = ${M}2, x = 1, x = 3`],
      ["", "Topp- og bunnpunkter", `topp ≈ (${M}0,79, 8,21), bunn ≈ (2,12, ${M}4,06)`],
      ["?grad=3&a=1&r1=1&r2=1&r3=-2", "Nullpunkter", `x = ${M}2, x = 1 (dobbelt)`],
      ["?grad=3&a=1&r1=1&r2=1&r3=-2", "Topp- og bunnpunkter", `topp ≈ (${M}1, 4), bunn ≈ (1, 0)`],
      ["?grad=3&a=0.5&r1=-1&r2=2&r3=4", "Skjærer y-aksen i", "(0, 4)"],
      ["?grad=3&a=1&r1=1&r2=1&r3=1", "Topp- og bunnpunkter", "Ingen"],
      ["?grad=4&a=1&r1=-2&r2=-1&r3=1&r4=2", "Topp- og bunnpunkter", `bunn ≈ (${M}1,58, ${M}2,25), topp ≈ (0, 4), bunn ≈ (1,58, ${M}2,25)`],
      ["?grad=4&a=-1&r1=-2&r2=1&r3=3&r4=4", "Når x → −∞", `f(x) → ${M}∞`],
      ["?grad=4&a=-1&r1=-2&r2=1&r3=3&r4=4", "Skjærer y-aksen i", "(0, 24)"],
    ],
    meldinger: [["?grad=3&a=1&r1=1&r2=1&r3=-2", "berører"], ["?grad=3&a=1&r1=1&r2=1&r3=1", "terrassepunkt"], ["?grad=2&a=0&r1=1&r2=2", "a = 0"], ["?grad=1&a=2&r1=3", "lineær"]],
    tekst: [["", "#fortegn", [`x<${M}2`, `${M}2<x<1`, "1<x<3", "x>3"]], ["", "#utvidet", ["f(x)=x3−2x2−5x+6"]]],
  },
  potensfunksjoner: {
    oppgaver: 5,
    verdier: [
      ["", "Definert for", "x ≥ 0"],
      ["", "f(4)", "2"],
      ["?a=1&b=1/3", "f(−8)", `${M}2`],
      ["?a=1&b=1/3", "Definert for", "alle x"],
      ["?a=1&b=-1/2", "Definert for", "x > 0"],
      ["?a=1&b=-1/2", "f(4)", "0,5"],
      ["?a=1&b=-2", "f(4)", "0,0625"],
      ["?a=1&b=-2", "Asymptoter", "x = 0 og y = 0"],
      ["?a=2.01&b=1/2", "f(4)", "4,02"],
      ["?a=-1&b=2", "For x > 0", "avtar"],
    ],
    meldinger: [["?a=1&b=1/2", "Kvadratrot"], ["?a=1&b=1/3", "Tredjerot"], ["?a=1&b=-1", "Negativ eksponent"], ["?a=0&b=2", "a = 0"]],
  },
  polynomdivisjon: {
    oppgaver: 5,
    verdier: [
      ["", "Svar (kvotient)", `x² − x − 6`],
      ["", "Rest", "0"],
      ["?c3=0&c2=1&c1=3&c0=5&r=2", "Svar (kvotient)", "x + 5"],
      ["?c3=0&c2=1&c1=3&c0=5&r=2", "Rest", "15"],
      ["?c3=0&c2=1&c1=3&c0=5&r=2", "P(2)", "15"],
      ["?c3=1&c2=0&c1=-7&c0=6&r=1", "Svar (kvotient)", `x² + x − 6`],
      ["?c3=0&c2=1&c1=1&c0=-1&r=1", "Asymptoter", "x = 1 og y = x + 2"],
      ["?c3=0&c2=1&c1=1&c0=-1&r=1", "Rest", "1"],
    ],
    meldinger: [["", "går opp"], ["?c3=0&c2=1&c1=3&c0=5&r=2", "Restteoremet"], ["?c3=0&c2=0&c1=0&c0=4&r=1", "er et tall"]],
    tekst: [["?c3=1&c2=0&c1=-7&c0=6&r=1", "#oppstilling", ["(x3+0x2−7x+6):(x−1)=x2+x−6", "−(x3−x2)", "−(−6x+6)"]]],
  },
  andregradsulikheter: {
    oppgaver: 5,
    verdier: [
      ["", "Løsning", `x < ${M}1 eller x > 3`],
      ["", "Som intervall", `⟨←, ${M}1⟩ ∪ ⟨3, →⟩`],
      ["?a=1&b=-2&c=-3&rel=le", "Som intervall", `[${M}1, 3]`],
      ["?a=-1&b=1&c=6&rel=ge", "Løsning", `${M}2 ≤ x ≤ 3`],
      ["?a=1&b=2&c=5&rel=gt", "Løsning", "alle x"],
      ["?a=1&b=2&c=5&rel=lt", "Som intervall", "∅"],
      ["?a=1&b=-4&c=4&rel=le", "Løsning", "x = 2"],
      ["?a=1&b=-4&c=4&rel=gt", "Løsning", "x < 2 eller x > 2"],
      ["?a=-5&b=20&c=-15&rel=gt", "Løsning", "1 < x < 3"],
      ["?a=0&b=-2&c=4&rel=ge", "Som intervall", "⟨←, 2]"],
    ],
    meldinger: [["?a=1&b=2&c=5&rel=gt", "Ingen nullpunkter"], ["?a=1&b=-4&c=4&rel=le", "Ett nullpunkt"], ["?a=0&b=-2&c=4&rel=ge", "snur"]],
    tekst: [["?a=-1&b=1&c=6&rel=ge", "#fortegn", ["a=−1", "f(x)−0+0−"]]],
  },
  "modellering-og-regresjon": {
    oppgaver: 5,
    utenGlider: true,
    verdier: [
      ["", "R²", "0,9995"],
      ["?sett=taxi&modell=lineaer&x=30", "f(30)", "≈ 667,4"],
      ["?sett=bakterier&modell=lineaer", "R²", "0,896"],
      ["?sett=bakterier&modell=eksponentiell&x=8", "f(8)", "≈ 3128"],
      ["?sett=bakterier&modell=eksponentiell", "Vekstfaktor", "1,507 (+50,71 % per enhet)"],
      ["?sett=bil&modell=eksponentiell&x=9", "f(9)", "≈ 92,91"],
      ["?sett=bil&modell=andregrad&x=15", "f(15)", "≈ 176,4"],
      ["?sett=kast&modell=andregrad&x=5", "f(5)", `≈ ${M}36,11`],
      ["?sett=kast&modell=lineaer", "R²", "0,2244"],
      ["?sett=pendel&modell=potens&x=4", "R²", "0,9998"],
      ["?sett=pendel&modell=potens&x=4", "f(4)", "≈ 4,007"],
      ["?sett=bil&modell=potens", "Modell", "Ingen"],
      ["?sett=egne&modell=lineaer&data=1_2~2_4~3_6", "R²", "1"],
    ],
    meldinger: [["?sett=kast&modell=andregrad&x=5", "Utenfor dataene"], ["?sett=bil&modell=potens", "positive x"], ["?sett=egne&modell=eksponentiell&data=1_-2~2_4~3_6", "større enn 0"]],
    tekst: [["", "#forskrift", ["f(x)=18,97x+98,33"]], ["?sett=bakterier&modell=eksponentiell", "#forskrift", ["f(x)=117,5⋅1,507x"]], ["?sett=kast&modell=andregrad", "#forskrift", ["f(x)=−4,905x2+17x+1,512"]], ["?sett=pendel&modell=potens", "#forskrift", ["f(x)=2,005⋅x0,4993"]]],
  },
  "stigningstallfunksjonen": {
    oppgaver: 5,
    verdier: [
      ["", "f′(x₀)", "9 (stigningstallet til tangenten)"],
      ["", "Tangenten", "y = 9x + 16"],
      ["?fn=kubisk&x0=1", "f i x₀", "vannrett tangent"],
      ["?fn=eksp&x0=0", "Tangenten", "y = x + 1"],
      ["?fn=ln&x0=2", "f′(x₀)", "0,5 (stigningstallet til tangenten)"],
      ["?fn=ln&x0=1", "Tangenten", `y = x ${M} 1`],
      ["?fn=fjerde&x0=-1", "f′(x₀)", "3 (stigningstallet til tangenten)"],
      ["?fn=inv&x0=2", "f′(x₀)", `${M}0,25 (stigningstallet til tangenten)`],
      ["?fn=abs&x0=0", "f′(x₀)", "Finnes ikke"],
      ["?fn=ln&x0=-1", "P", "Finnes ikke"],
    ],
    meldinger: [["?fn=abs&x0=0", "Knekk"], ["?fn=rot&x0=0", "Loddrett tangent"], ["?fn=eksp&x0=1", "like stort"], ["?fn=ln&x0=-1", "definisjonsmengden"], ["?fn=kubisk&x0=1", "Vannrett tangent"]],
  },
  "omvendte-funksjoner": {
    oppgaver: 4,
    verdier: [
      ["", "P på f", "(1, ≈ 2,718)"],
      ["", "f′(a)", "≈ 2,718"],
      ["", "g′ i Q", "≈ 0,368"],
      ["", "f′(a) · g′ i Q", "1"],
      ["?par=kvadrat&a=2", "Q på g", "(4, 2)"],
      ["?par=kvadrat&a=2", "g′ i Q", "0,25"],
      ["?par=kvadrat&a=0", "g′ i Q", "Finnes ikke (loddrett tangent)"],
      ["?par=kvadrat&a=-1", "P", "Finnes ikke"],
      ["?par=lineaer&a=0", "Q på g", "(1, 0)"],
      ["?par=lineaer&a=0", "g′ i Q", "0,5"],
      ["?par=kubikk&a=2", "g′ i Q", "≈ 0,083"],
    ],
    meldinger: [["?par=kvadrat&a=0", "Vannrett blir loddrett"], ["?par=kubikk&a=0", "Vannrett blir loddrett"], ["?par=eksp&a=1", "Se på Q"], ["?par=kvadrat&a=-1", "Utenfor"]],
  },
};

for (const [id, oppsett] of Object.entries(UTFORSKERE)) {
  const { side, kontekst, problemer } = await nySide();
  const URL_ = BASE + `utforskere/${id}.html`;
  const verdi = (dt) => side.evaluate((dt) => {
    const d = Array.from(document.querySelectorAll("#verdier dt")).find((x) => x.textContent === dt);
    return d ? d.nextElementSibling.textContent.replace(/\s+/g, " ").trim() : null;
  }, dt);
  let feilVerdier = [];
  for (const [sok, dt, forventet] of oppsett.verdier) {
    await side.goto(URL_ + sok, { waitUntil: "networkidle" });
    const fikk = await verdi(dt);
    if (fikk !== forventet) feilVerdier.push(`${sok || "standard"} ${dt}: fikk «${fikk}», ventet «${forventet}»`);
  }
  sjekk(feilVerdier.length === 0, `${id}: ${oppsett.verdier.length} verdier stemmer med fasit`, feilVerdier.join(" | "));
  const feilMeld = [];
  for (const [sok, tekst] of oppsett.meldinger) {
    await side.goto(URL_ + sok, { waitUntil: "networkidle" });
    const m = await side.evaluate(() => { const e = document.getElementById("melding"); return e && !e.hidden ? e.textContent : ""; });
    if (!m.includes(tekst)) feilMeld.push(`${sok}: mangler «${tekst}»`);
  }
  sjekk(feilMeld.length === 0, `${id}: ${oppsett.meldinger.length} spesialtilfeller gir forklarende melding`, feilMeld.join(" | "));
  for (const [sok, sel, biter] of oppsett.tekst || []) {
    await side.goto(URL_ + sok, { waitUntil: "networkidle" });
    const t = (await side.evaluate((s) => { const e = document.querySelector(s); const k = e.cloneNode(true); k.querySelectorAll(".katex-mathml").forEach((m) => m.remove()); return k.textContent.replace(/\s+/g, ""); }, sel));
    const mangler = biter.filter((b) => !t.includes(b.replace(/\s+/g, "")));
    sjekk(mangler.length === 0, `${id}: ${sel} viser riktige tall`, mangler.join(", "));
  }

  // Oppgavelenkene skal sette verdier uten feil, og adressen skal oppdateres
  await side.goto(URL_, { waitUntil: "networkidle" });
  const lenker = await side.$$eval("a.oppsettlenke", (l) => l.map((a) => a.getAttribute("href")));
  let lenkeFeil = [];
  for (let i = 0; i < lenker.length; i++) {
    // Lenker som brytes over to linjer har midtpunktet utenfor selve lenken, så vi klikker med JavaScript.
    await side.locator("a.oppsettlenke").nth(i).evaluate((a) => a.click());
    await side.waitForTimeout(30);
    const forventet = new URLSearchParams(lenker[i].split("#")[0].slice(1));
    const naa = new URLSearchParams(new URL(side.url()).search);
    for (const [k, val] of forventet) if (k !== "tilpass" && naa.get(k) !== val && Number(naa.get(k)) !== Number(val)) lenkeFeil.push(`${lenker[i]}: ${k}=${naa.get(k)}`);
  }
  sjekk(lenker.length > 0 && lenkeFeil.length === 0, `${id}: alle ${lenker.length} oppgavelenker setter verdiene`, lenkeFeil.slice(0, 3).join(" | "));

  // Tastatur: piltast på første synlige glidebryter endrer verdien
  await side.goto(URL_, { waitUntil: "networkidle" });
  if (oppsett.utenGlider) {
    // Utforskere med nedtrekkslister i stedet for glidebrytere: endring i lista leses opp
    await side.selectOption("#modell", "andregrad");
    await side.waitForTimeout(700);
    const live = await side.evaluate(() => Array.from(document.querySelectorAll("[aria-live]")).map((e) => e.textContent).join(" "));
    sjekk(live.includes("Andregrad"), `${id}: aria-live leser opp endringen`, live);
  } else {
  const glider = side.locator('.glider:not([hidden]) input[type="range"]').first();
  const tallfelt = side.locator('.glider:not([hidden]) input[type="text"]').first();
  const før = await tallfelt.inputValue();
  await glider.focus();
  await side.keyboard.press("ArrowRight");
  sjekk((await tallfelt.inputValue()) !== før, `${id}: piltast på glidebryteren endrer verdien`, `${før} → ${await tallfelt.inputValue()}`);
  await side.waitForTimeout(700);
  const live = await side.evaluate(() => Array.from(document.querySelectorAll("[aria-live]")).map((e) => e.textContent).join(" "));
  sjekk(live.length > 5, `${id}: aria-live leser opp endringen`, live);
  }

  // Nedlasting av figuren (SVG)
  const [nedlasting] = await Promise.all([side.waitForEvent("download"), side.click("#last-ned-svg")]);
  const svgFil = path.join(RES, `${id}.svg`);
  await nedlasting.saveAs(svgFil);
  sjekk(fs.readFileSync(svgFil, "utf8").startsWith("<svg"), `${id}: figuren kan lastes ned som SVG`);

  // Teori lukket, oppgaver og elevark uten fasit
  sjekk(!(await side.getAttribute("#matematikken", "open")), `${id}: «Matematikken bak» er lukket fra start`);
  const antall = await side.$$eval(".oppgave", (o) => o.length);
  sjekk(antall === oppsett.oppgaver, `${id}: ${oppsett.oppgaver} oppgaver`, String(antall));
  const pdfUrl = await side.getAttribute(".elevark-lenke a[href$='.pdf']", "href");
  const pdfSvar = await side.request.get(new URL(pdfUrl, side.url()).href);
  const pdfFil = path.join(RES, `elevark-${id}.pdf`);
  fs.writeFileSync(pdfFil, await pdfSvar.body());
  const pdfTekst = execFileSync("pdftotext", ["-layout", pdfFil, "-"]).toString().replace(/\s+/g, " ");
  const titler = await side.$$eval(".oppgave > h3", (h) => h.map((x) => {
    const k = x.cloneNode(true); k.querySelectorAll(".katex-mathml, .oppgave-nr").forEach((m) => m.remove());
    return k.textContent.trim().split(/\s+/)[0];
  }));
  sjekk(titler.every((t) => pdfTekst.includes(t)), `${id}: alle oppgavetitlene står i elevarket`, titler.filter((t) => !pdfTekst.includes(t)).join(", "));
  const steg = (pdfTekst.match(/Gjett|Test|Forklar/g) || []).length;
  sjekk(steg >= 3 * oppsett.oppgaver, `${id}: elevarket har alle stegene`, String(steg));
  // Biter av løsningsforslagene (lengste ord-rekke uten formler) skal ikke stå i elevarket
  const fasitbiter = await side.$$eval(".fasit-innhold p", (ps) => ps.map((p) => {
    const k = p.cloneNode(true); k.querySelectorAll(".katex").forEach((m) => m.replaceWith("|"));
    return k.textContent.split("|").map((t) => t.trim()).sort((a, b) => b.length - a.length)[0];
  }).filter((t) => t && t.split(/\s+/).length >= 4));
  const lekket = fasitbiter.filter((b) => pdfTekst.includes(b.replace(/\s+/g, " ")));
  sjekk(fasitbiter.length >= oppsett.oppgaver && lekket.length === 0, `${id}: elevarket inneholder ikke fasit (${fasitbiter.length} biter sjekket)`, lekket.slice(0, 2).join(" | "));
  sjekk(!pdfTekst.includes("{{") && !pdfTekst.includes("$"), `${id}: ingen plassholdere eller rå formler i elevarket`);

  sjekk(problemer.length === 0, `${id}: ingen JS-feil under testingen`, problemer.join(" | "));
  await side.screenshot({ path: path.join(RES, `${id}-lys.png`) });
  await kontekst.close();
}

// ---------------------------------------------------------------- 10. tilfeldige verdier mot matematikken
console.log("\n10. Tilfeldige verdier");
{
  const { side, kontekst } = await nySide();
  const sjekkFuzz = async (id, fn, navn) => {
    await side.goto(BASE + `utforskere/${id}.html`, { waitUntil: "networkidle" });
    const feil = await side.evaluate(fn);
    sjekk(feil.length === 0, navn, feil.slice(0, 4).join("; "));
  };
  await sjekkFuzz("likningssett", () => {
    const { los } = window.mattelabLikningssett; const feil = [];
    const t = () => Math.round((Math.random() * 20 - 10) * 2) / 2;
    for (let i = 0; i < 3000; i++) {
      const v = { a1: t(), b1: t(), c1: t(), a2: t(), b2: t(), c2: t() };
      const r = los(v);
      if (r.type === "én") {
        for (const [a, b, c] of [[v.a1, v.b1, v.c1], [v.a2, v.b2, v.c2]]) if (Math.abs(a * r.x + b * r.y - c) > 1e-9 * (1 + Math.abs(c))) feil.push(JSON.stringify(v));
      } else if (r.det !== 0 && r.grunn !== "tom" && r.grunn !== "en-linje" && r.grunn !== "alle") feil.push("det≠0 men ikke én: " + JSON.stringify(v));
    }
    return feil;
  }, "likningssett: 3000 tilfeldige likningssett, løsningen passer i begge likningene");
  await sjekkFuzz("rasjonale-funksjoner", () => {
    const { analyser } = window.mattelabRasjonal; const feil = [];
    const t = () => Math.round((Math.random() * 20 - 10) * 2) / 2;
    for (let i = 0; i < 3000; i++) {
      const [a, b, c, d] = [t(), t(), t(), t()];
      const r = analyser(a, b, c, d);
      if (r.type !== "rasjonal") continue;
      const h = 1e-6;
      if (Math.sign(r.f(r.xv + h)) !== Math.sign(r.hoyreGrense) || Math.sign(r.f(r.xv - h)) !== Math.sign(r.venstreGrense)) feil.push(`grenser ${a},${b},${c},${d}`);
      if (Math.abs(r.f(1e7) - r.yv) > 1e-4) feil.push(`asymptote ${a},${b},${c},${d}`);
      // Nullpunktet er avrundet til 10 desimaler, så vi sjekker telleren relativt til størrelsen
      if (r.nullpunkt !== undefined && Math.abs(a * r.nullpunkt + b) > 1e-8 * (Math.abs(a) + Math.abs(b))) feil.push(`nullpunkt ${a},${b},${c},${d}`);
    }
    return feil;
  }, "rasjonale funksjoner: 3000 tilfeldige, asymptoter, grenser og nullpunkter stemmer");
  await sjekkFuzz("funksjon-og-derivert", () => {
    const { analyser } = window.mattelabDerivert; const feil = [];
    const t = () => Math.round((Math.random() * 10 - 5) * 2) / 2;
    for (let i = 0; i < 3000; i++) {
      const [a, b, c, d] = [t(), t(), t(), t()];
      const r = analyser(a, b, c, d);
      for (const p of r.punkter) {
        if (Math.abs(r.df(p.x)) > 1e-8 * (1 + Math.abs(a) + Math.abs(b) + Math.abs(c))) feil.push(`f'≠0 ${a},${b},${c},${d}`);
        const e = 1e-3, v = r.f(p.x - e), h = r.f(p.x + e);
        if (p.type === "toppunkt" && !(v < p.y + 1e-9 && h < p.y + 1e-9)) feil.push(`topp ${a},${b},${c},${d}`);
        if (p.type === "bunnpunkt" && !(v > p.y - 1e-9 && h > p.y - 1e-9)) feil.push(`bunn ${a},${b},${c},${d}`);
      }
    }
    return feil;
  }, "funksjon og derivert: 3000 tilfeldige, f′ = 0 i stasjonære punkter og riktig type");
  await sjekkFuzz("trekant", () => {
    const { los } = window.mattelabTrekant; const feil = [];
    const RAD = Math.PI / 180;
    for (let i = 0; i < 3000; i++) {
      const b = 0.5 + Math.random() * 10, c = 0.5 + Math.random() * 10, A = 1 + Math.random() * 178;
      const t = los("SVS", { b, c, A }).losninger[0];
      if (Math.abs(t.A + t.B + t.C - 180) > 1e-9) feil.push("vinkelsum");
      const k = [t.a / Math.sin(t.A * RAD), t.b / Math.sin(t.B * RAD), t.c / Math.sin(t.C * RAD)];
      if (Math.max(...k) - Math.min(...k) > 1e-7 * k[0]) feil.push(`sinussetningen ${b},${c},${A}`);
      const s = los("SSS", { a: t.a, b: t.b, c: t.c }).losninger[0];
      if (!s || Math.abs(s.A - A) > 1e-6) feil.push(`SSS tilbake ${b},${c},${A}`);
      const v = los("VSV", { A: t.A, B: t.B, c: t.c }).losninger[0];
      if (!v || Math.abs(v.a - t.a) > 1e-7 * t.a) feil.push(`VSV tilbake ${b},${c},${A}`);
      const q = los("SSV", { a: t.a, b: t.b, A: t.A }).losninger;
      if (!q.some((x) => Math.abs(x.c - t.c) < 1e-6 * t.c)) feil.push(`SSV finner ikke trekanten ${b},${c},${A}`);
    }
    return feil;
  }, "trekant: 3000 tilfeldige, vinkelsum, sinussetningen og alle fire metodene gir samme trekant");
  await sjekkFuzz("vektorer", () => {
    const { prikk, lengde, vinkel } = window.mattelabVektorer; const feil = [];
    for (let i = 0; i < 3000; i++) {
      const u = [Math.random() * 10 - 5, Math.random() * 10 - 5], v = [Math.random() * 10 - 5, Math.random() * 10 - 5];
      const th = vinkel(u, v) * Math.PI / 180;
      const d = [u[0] - v[0], u[1] - v[1]];
      // Cosinussetningen: |u − v|² = |u|² + |v|² − 2|u||v|cos θ
      if (Math.abs(lengde(d) ** 2 - (lengde(u) ** 2 + lengde(v) ** 2 - 2 * lengde(u) * lengde(v) * Math.cos(th))) > 1e-6) feil.push("vinkel");
      if (Math.abs(prikk(u, u) - lengde(u) ** 2) > 1e-9) feil.push("lengde");
    }
    return feil;
  }, "vektorer: 3000 tilfeldige, vinkelen stemmer med cosinussetningen");
  await sjekkFuzz("brok-som-areal", () => {
    const { regn } = window.mattelabBrok; const feil = [];
    const n = () => 1 + Math.floor(Math.random() * 12), t = () => Math.floor(Math.random() * 13);
    for (let i = 0; i < 3000; i++) {
      const [t1, n1, t2, n2] = [t(), n(), t(), n()];
      const sjekk = (modus, fasit) => {
        const r = regn(modus, t1, n1, t2, n2);
        if (r.udefinert) { if (t2 !== 0 || modus !== "dele") feil.push(modus); return; }
        const [a, b] = r.svar;
        // Forkortet, positiv nevner, og riktig verdi (kryssmultiplikasjon gir eksakt sjekk med heltall)
        const g = (x, y) => (y ? g(y, x % y) : Math.abs(x));
        if (b <= 0 || g(a, b) !== 1 && a !== 0) feil.push(`${modus} ikke forkortet ${a}/${b}`);
        if (a * fasit[1] !== b * fasit[0]) feil.push(`${modus} ${t1}/${n1},${t2}/${n2}: ${a}/${b}`);
      };
      sjekk("pluss", [t1 * n2 + t2 * n1, n1 * n2]);
      sjekk("gange", [t1 * t2, n1 * n2]);
      if (t2) sjekk("dele", [t1 * n2, n1 * t2]); else sjekk("dele", [0, 1]);
    }
    return feil;
  }, "brøk: 3000 tilfeldige, pluss, gange og dele gir riktig forkortet brøk");
  await sjekkFuzz("algebrabrikker", () => {
    const { gangUt } = window.mattelabBrikker; const feil = [];
    const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (let i = 0; i < 3000; i++) {
      const [a, b, c, d] = [h(0, 3), h(-6, 6), h(0, 3), h(-6, 6)];
      const r = gangUt(a, b, c, d), k = r.brikker;
      for (const x of [-2.5, 0.7, 3]) if (Math.abs((a * x + b) * (c * x + d) - (r.A * x * x + r.B * x + r.C)) > 1e-9) feil.push(`${a},${b},${c},${d}`);
      // Brikkene: antall x-brikker i rektangelet er a·|d| + |b|·c, og netto er ad + bc
      if (k.xPos + k.xNeg !== a * Math.abs(d) + Math.abs(b) * c || k.x !== r.B || k.x2 !== r.A || k.en !== r.C) feil.push(`brikker ${a},${b},${c},${d}`);
    }
    return feil;
  }, "algebrabrikker: 3000 tilfeldige, produktet og brikketellingen stemmer");
  await sjekkFuzz("faktorisering", () => {
    const { faktoriser } = window.mattelabFaktorisering; const feil = [];
    for (let b = -12; b <= 12; b++) for (let c = -36; c <= 36; c++) {
      const r = faktoriser(b, c);
      // Finnes det hele tall m, n med m + n = b og mn = c? Da er nullpunktene −m og −n hele tall.
      const hele = r.D >= 0 && Number.isInteger(Math.sqrt(r.D)) && (b + Math.sqrt(r.D)) % 2 === 0;
      if (!!r.treff !== hele) feil.push(`b=${b} c=${c}: treff ${JSON.stringify(r.treff)}`);
      if (r.treff) {
        const [m, n] = r.treff;
        if (m + n !== b || m * n !== c) feil.push(`b=${b} c=${c}: ${m},${n}`);
      }
      for (const [m, n] of r.par) if (m * n !== c && c !== 0) feil.push(`par ${m},${n} for c=${c}`);
      if (new Set(r.par.map((p) => p.join())).size !== r.par.length) feil.push(`dobbelt par c=${c}`);
    }
    return feil;
  }, "faktorisering: alle b og c på glidebryterne, produkt og sum stemmer, ingen par mangler eller er doble");
  await sjekkFuzz("fullstendig-kvadrat", () => {
    const { fullfor } = window.mattelabFullstendig; const feil = [];
    for (let b = -10; b <= 10; b++) for (let c = -20; c <= 20; c++) {
      const r = fullfor(b, c);
      for (const x of [-3.3, 0, 1.7]) if (Math.abs((x + r.p) ** 2 + r.q - (x * x + b * x + c)) > 1e-9) feil.push(`${b},${c}`);
      for (const x of r.losninger) if (Math.abs(x * x + b * x + c) > 1e-9) feil.push(`løsning ${b},${c}`);
      if ((r.q > 0) !== (r.losninger.length === 0)) feil.push(`antall ${b},${c}`);
    }
    return feil;
  }, "fullstendig kvadrat: alle b og c på glidebryterne, (x + p)² + q er identisk med uttrykket");
  await sjekkFuzz("abc-formelen", () => {
    const { abc } = window.mattelabAbc; const feil = [];
    const t = () => Math.round((Math.random() * 20 - 10) * 2) / 2;
    for (let i = 0; i < 3000; i++) {
      const a = t() || 1, b = t(), c = t();
      const r = abc(a, b, c);
      for (const x of r.nullpunkter) if (Math.abs(a * x * x + b * x + c) > 1e-7 * (1 + Math.abs(b * x) + Math.abs(c))) feil.push(`${a},${b},${c}`);
      if (r.antall === 2 && Math.abs((r.nullpunkter[1] - r.nullpunkter[0]) / 2 - r.avstand) > 1e-9) feil.push(`avstand ${a},${b},${c}`);
      if (r.antall !== (r.D > 0 ? 2 : r.D === 0 ? 1 : 0)) feil.push(`antall ${a},${b},${c}`);
    }
    return feil;
  }, "abc-formelen: 3000 tilfeldige, løsningene passer i likningen og pilene er halve avstanden");
  await sjekkFuzz("potenser", () => {
    const { faktorer, verdi } = window.mattelabPotenser; const feil = [];
    for (const modus of ["produkt", "kvotient", "potens"]) for (let m = -5; m <= 6; m++) for (let n = -5; n <= 6; n++) {
      if (modus === "potens" && n < 0) continue;
      const f = faktorer(modus, m, n);
      const regel = modus === "produkt" ? m + n : modus === "kvotient" ? m - n : m * n;
      if (f.eksponent !== regel) feil.push(`${modus} ${m},${n}`);
      for (const g of [2, 3, 10]) {
        const [t, nv] = verdi(g, f.eksponent);
        const direkte = modus === "produkt" ? g ** m * g ** n : modus === "kvotient" ? g ** m / g ** n : (g ** m) ** n;
        if (Math.abs(t / nv - direkte) > 1e-9 * Math.max(1, direkte)) feil.push(`verdi ${modus} ${g},${m},${n}`);
      }
    }
    return feil;
  }, "potenser: alle eksponenter på glidebryterne, tellingen gir samme eksponent og verdi som reglene");
  // Øvingene: oppgavene lages fra svaret, og fasiten må passe med oppgaven
  await side.goto(BASE + "varierende/fullfor-kvadratet.html", { waitUntil: "networkidle" });
  sjekk((await side.evaluate(async () => {
    const { lagOppgave } = window.mattelabFullfor; const { lagTilfeldig } = await import("../statisk/js/ovelse.js"); const feil = [];
    const r = lagTilfeldig();
    for (let i = 0; i < 4000; i++) {
      const niva = 1 + (i % 4), o = lagOppgave(niva, r);
      for (const x of [-2.3, 0.4, 3]) if (Math.abs(o.a * (x + o.p) ** 2 + o.q - (o.a * x * x + o.b * x + o.c)) > 1e-9) feil.push(`identitet nivå ${niva}`);
      if (niva === 2 && Math.abs(o.b % 2) !== 1) feil.push("nivå 2 skal ha odde b");
      if (niva === 1 && o.b % 2 !== 0) feil.push("nivå 1 skal ha partall b");
      if (niva !== 2 && !Number.isInteger(o.c)) feil.push(`c er ikke et helt tall: ${o.c}`);
      if (niva === 4 && o.a === 1) feil.push("nivå 4 skal ha a ≠ 1");
      if (niva === 3) for (const x of o.losninger) if (Math.abs(x * x + o.b * x + o.c) > 1e-9) feil.push("løsning");
    }
    return feil;
  })).length === 0, "fullfør kvadratet: 4000 tilfeldige oppgaver, (x + p)² + q stemmer på alle nivåene");
  await side.goto(BASE + "varierende/finn-feilen-potenser.html", { waitUntil: "networkidle" });
  sjekk((await side.evaluate(async () => {
    const { lagOppgave } = window.mattelabFinnFeilen; const { lagTilfeldig } = await import("../statisk/js/ovelse.js"); const feil = [];
    const r = lagTilfeldig(); let utenFeil = 0;
    for (let i = 0; i < 3000; i++) {
      const o = lagOppgave(r);
      if (o.feilSteg < 0) { utenFeil++; if (o.linjer.join() !== o.riktig.join()) feil.push("uten feil, men ulike linjer"); continue; }
      // Linjene før feilen er like de riktige; linjen med feilen er ulik
      for (let k = 0; k < o.feilSteg; k++) if (o.linjer[k] !== o.riktig[k]) feil.push(`steg ${k} før feilen er endret: ${o.oppgave}`);
      if (o.linjer[o.feilSteg] === o.riktig[o.feilSteg]) feil.push(`feilen synes ikke: ${o.oppgave} ${o.linjer.join(" | ")}`);
      if (!o.forklaring) feil.push("mangler forklaring");
    }
    if (utenFeil < 300 || utenFeil > 900) feil.push(`andel uten feil: ${utenFeil}/3000`);
    return feil;
  })).length === 0, "finn feilen: 3000 tilfeldige oppgaver, feilen står i riktig steg og synes");
  await sjekkFuzz("polynomfunksjoner", () => {
    const { analyser } = window.mattelabPolynom; const feil = [];
    const t = () => Math.round((Math.random() * 12 - 6) * 2) / 2;
    for (let i = 0; i < 2000; i++) {
      const n = 1 + Math.floor(Math.random() * 4);
      const a = Math.round((Math.random() * 6 - 3) * 10) / 10 || 1;
      const rotter = Array.from({ length: n }, t);
      const r = analyser(a, rotter);
      const prod = (x) => a * rotter.reduce((s, q) => s * (x - q), 1);
      for (const x of [-2.3, 0.7, 3.1]) if (Math.abs(r.f(x) - prod(x)) > 1e-7 * (1 + Math.abs(prod(x)))) feil.push(`utvidet ${a} ${rotter}`);
      for (const iv of r.intervaller) {
        const m = !Number.isFinite(iv.fra) ? iv.til - 0.5 : !Number.isFinite(iv.til) ? iv.fra + 0.5 : (iv.fra + iv.til) / 2;
        if (Math.sign(prod(m)) !== iv.fortegn) feil.push(`fortegn ${a} ${rotter}`);
      }
      // I topp- og bunnpunktene er den deriverte null
      for (const e of r.ekstremal) {
        const h = 1e-5, d = (prod(e.x + h) - prod(e.x - h)) / (2 * h);
        if (Math.abs(d) > 1e-3 * (1 + Math.abs(a) * 100)) feil.push(`ekstremal ${a} ${rotter} x=${e.x} f'=${d}`);
      }
      if (n % 2 === 1 && r.hoyre === r.venstre) feil.push(`ender ${a} ${rotter}`);
    }
    return feil;
  }, "polynomfunksjoner: 2000 tilfeldige, utvidet form, fortegn, topp- og bunnpunkter og ender stemmer");
  await sjekkFuzz("polynomdivisjon", () => {
    const { analyser } = window.mattelabPolynomdivisjon; const feil = [];
    const t = (k) => Math.round(Math.random() * 2 * k - k);
    for (let i = 0; i < 3000; i++) {
      const v = { c3: t(5), c2: t(10), c1: t(10), c0: t(10), r: t(5) };
      const r = analyser(v);
      const P = (x) => v.c3 * x ** 3 + v.c2 * x ** 2 + v.c1 * x + v.c0;
      const Q = (x) => r.kvotient.reduce((s, c, j) => s + c * x ** j, 0);
      for (const x of [-1.7, 0.3, 2.9]) if (Math.abs(P(x) - ((x - v.r) * Q(x) + r.restTall)) > 1e-8 * (1 + Math.abs(P(x)))) feil.push(JSON.stringify(v));
      if (r.restTall !== P(v.r)) feil.push("restteoremet " + JSON.stringify(v));
    }
    return feil;
  }, "polynomdivisjon: 3000 tilfeldige, P(x) = (x − r)Q(x) + R og R = P(r)");
  await sjekkFuzz("andregradsulikheter", () => {
    const { los } = window.mattelabUlikheter; const feil = [];
    const t = () => Math.round((Math.random() * 10 - 5) * 2) / 2;
    const rel = ["gt", "ge", "lt", "le"];
    const oppfylt = (y, q) => (q === "gt" ? y > 0 : q === "ge" ? y >= 0 : q === "lt" ? y < 0 : y <= 0);
    for (let i = 0; i < 1500; i++) {
      const [a, b, c] = [t(), t(), t()], q = rel[i % 4];
      const L = los(a, b, c, q);
      const med = (x) => L.deler.some((d) => ("punkt" in d ? Math.abs(d.punkt - x) < 1e-12
        : (x > d.fra || (d.fraMed && x === d.fra)) && (x < d.til || (d.tilMed && x === d.til))));
      // Tilfeldige punkter, og nullpunktene selv
      const punkter = [...Array.from({ length: 40 }, () => Math.random() * 30 - 15), ...L.null_];
      for (const x of punkter) {
        const y = a * x * x + b * x + c;
        if (Math.abs(y) < 1e-9 && !L.null_.includes(x)) continue;
        if (oppfylt(L.null_.includes(x) ? 0 : y, q) !== med(x)) { feil.push(`${a},${b},${c} ${q} x=${x}`); break; }
      }
    }
    return feil;
  }, "andregradsulikheter: 1500 tilfeldige, løsningsmengden stemmer i tilfeldige punkter og i nullpunktene");
  await sjekkFuzz("modellering-og-regresjon", () => {
    const { tilpass } = window.mattelabRegresjon; const feil = [];
    const xs = [0.5, 1, 2, 3, 4.5, 6];
    for (let i = 0; i < 300; i++) {
      const a = Math.round(Math.random() * 40 + 1) / 10, b = Math.round(Math.random() * 30 - 15) / 10, c = Math.round(Math.random() * 20 - 10) / 10;
      const sjekkModell = (navn, f, k) => {
        const m = tilpass(navn, xs, xs.map(f));
        if (!m.ok || Object.entries(k).some(([n, v]) => Math.abs(m.k[n] - v) > 1e-6 * (1 + Math.abs(v))) || Math.abs(m.r2 - 1) > 1e-9) feil.push(`${navn} ${a} ${b} ${c}`);
      };
      sjekkModell("lineaer", (x) => a * x + b, { a, b });
      sjekkModell("andregrad", (x) => a * x * x + b * x + c, { a, b, c });
      sjekkModell("eksponentiell", (x) => a * (1 + Math.abs(b) / 10) ** x, { a, b: 1 + Math.abs(b) / 10 });
      sjekkModell("potens", (x) => a * x ** b, { a, b });
    }
    return feil;
  }, "regresjon: 300 tilfeldige eksakte data, alle fire modellene finner tallene igjen og R² = 1");
  await sjekkFuzz("stigningstallfunksjonen", () => {
    const { analyser, FUNKSJONER } = window.mattelabStigningstallfunksjon; const feil = [];
    for (const fn of Object.keys(FUNKSJONER)) {
      const F = FUNKSJONER[fn];
      for (let i = 0; i <= 100; i++) {
        const x = -5 + i / 10;
        const r = analyser(fn, x);
        if (!r.definert || r.d === null) continue;
        // Den deriverte stemmer med en symmetrisk differansekvotient, og tangenten går gjennom punktet
        const h = 1e-5, num = (F.f(x + h) - F.f(x - h)) / (2 * h);
        if (Number.isFinite(num) && Math.abs(num - r.d) > 1e-4 * (1 + Math.abs(r.d))) feil.push(`${fn} x=${x}: ${r.d} mot ${num}`);
        if (Math.abs(r.a * x + r.b - r.y0) > 1e-9 * (1 + Math.abs(r.y0))) feil.push(`tangent ${fn} x=${x}`);
      }
    }
    // Der den deriverte ikke finnes
    if (analyser("abs", 0).d !== null || analyser("rot", 0).d !== null || analyser("ln", 0).definert || analyser("inv", 0).definert) feil.push("unntak");
    return feil;
  }, "stigningstallfunksjonen: f′ stemmer med differansekvotienten og tangenten går gjennom punktet for alle ni funksjonene");
  await sjekkFuzz("omvendte-funksjoner", () => {
    const { analyser, PAR } = window.mattelabOmvendt; const feil = [];
    for (const [navn, P] of Object.entries(PAR)) {
      for (let i = -20; i <= 20; i++) {
        const a = i / 10, r = analyser(navn, a);
        if (!r.definert) continue;
        // g er den omvendte: g(f(a)) = a, og g′(f(a)) · f′(a) = 1 der f′(a) ≠ 0
        if (Math.abs(P.g(r.b) - a) > 1e-9 * (1 + Math.abs(a))) feil.push(`${navn} g(f(${a}))`);
        const h = 1e-6, num = (P.g(r.b + h) - P.g(r.b - h)) / (2 * h);
        if (r.gd !== null && Math.abs(r.b) > 0.05 && Math.abs(num - r.gd) > 1e-4 * (1 + Math.abs(r.gd))) feil.push(`${navn} g′ i ${r.b}: ${r.gd} mot ${num}`);
        if (r.gd === null && r.fd !== 0) feil.push(`${navn} loddrett ${a}`);
      }
    }
    return feil;
  }, "omvendte funksjoner: g(f(a)) = a og g′(f(a)) = 1/f′(a) for alle fire parene");
  await sjekkFuzz("potensfunksjoner", () => {
    const { analyser, EKSPONENTER } = window.mattelabPotensfunksjon; const feil = [];
    for (const bt of Object.keys(EKSPONENTER)) {
      const [p, q] = EKSPONENTER[bt];
      for (const a of [-2, 0.5, 3]) {
        const r = analyser(a, bt);
        for (const x of [0.25, 1, 2.5, 9]) if (Math.abs(r.f(x) - a * x ** (p / q)) > 1e-9 * (1 + Math.abs(a * x ** (p / q)))) feil.push(`${bt} ${a} x=${x}`);
        // Negative x: bare definert når nevneren er odde, og f(−x) = ±f(x) etter telleren
        const fm = r.f(-8), fp = r.f(8);
        if (q % 2 === 0 ? !Number.isNaN(fm) : Math.abs(fm - (p % 2 === 0 ? fp : -fp)) > 1e-9 * (1 + Math.abs(fp))) feil.push(`negativ x ${bt} ${a}`);
        if (Number.isFinite(r.f(0)) === (p < 0)) feil.push(`x = 0 ${bt}`);
      }
    }
    return feil;
  }, "potensfunksjoner: verdier, negative x og x = 0 stemmer for alle eksponentene");
  await kontekst.close();
}

// ---------------------------------------------------------------- 11. lærersiden
console.log("\n11. Lærersiden");
{
  const { side, kontekst } = await nySide();
  await side.goto(BASE + "laerer.html", { waitUntil: "networkidle" });
  const koblet = new Set(await side.$$eval(".km-kobling a", (a) => a.map((x) => x.getAttribute("href"))));
  const utforskere = SIDER.filter((s) => s.startsWith("utforskere/") && !s.endsWith("index.html"));
  const mangler = utforskere.filter((u) => !koblet.has(u));
  sjekk(mangler.length <= 2, `lærersiden lenker til nesten alle de ${utforskere.length} utforskerne`, mangler.join(", "));
  sjekk(Array.from(koblet).some((h) => h.startsWith("varierende/")), "lærersiden lenker også til varierende undervisning");
  await kontekst.close();
}

// ---------------------------------------------------------------- 12. kortsett
console.log("\n12. Kortsett: løsning på brettet, dra og slipp, bytte, tastatur og utskrift");
for (const navn of SIDER.filter((s) => s.startsWith("varierende/") && fs.readFileSync(path.join(DOCS, s), "utf8").includes('id="kortsett"'))) {
  const id = navn.split("/").pop().replace(".html", "");
  const { side, kontekst, problemer } = await nySide();
  await side.goto(BASE + navn, { waitUntil: "networkidle" });
  const info = await side.evaluate(() => ({ ...window.mattelabKortsett, flytt: null, bunke: null, brett: null, antall: document.querySelectorAll("button.kort").length }));

  // Løs settet med trykk: velg et kort, trykk så på en ledig plass eller en boks
  const status = await side.evaluate(({ type }) => {
    const kort = Array.from(document.querySelectorAll("button.kort"));
    const leggPaa = (k, knapp) => { k.click(); knapp.click(); };
    if (type === "grupper") {
      const grupper = {};
      for (const k of kort) (grupper[k.dataset.svar] ||= []).push(k);
      const rader = Array.from(document.querySelectorAll(".kort-rad"));
      Object.values(grupper).forEach((g, i) => g.forEach((k, j) => leggPaa(k, rader[i].querySelectorAll(".plass-knapp")[j])));
    } else if (type === "sorter") {
      for (const k of kort) leggPaa(k, document.querySelector(`.kort-kategori[data-kategori="${k.dataset.svar.split(" ")[0]}"] .kategori-knapp`));
    } else {
      const plasser = Array.from(document.querySelectorAll(".plass-knapp"));
      for (const k of kort) leggPaa(k, plasser[Number(k.dataset.svar) - 1]);
    }
    document.getElementById("kort-sjekk").click();
    return document.getElementById("kort-status").textContent;
  }, info);
  sjekk(/^Alle|^Hele/.test(status), `${id}: settet kan løses med trykk, og «Sjekk» sier at alt er riktig`, status);
  sjekk((await side.textContent("#kort-fremdrift")) === `${info.antall} av ${info.antall} kort plassert`, `${id}: telleren viser at alle kortene er plassert`);

  // Lag én feil og sjekk at den blir merket
  const feil = await side.evaluate(({ type, n }) => {
    document.getElementById("kort-nullstill").click();
    const kort = Array.from(document.querySelectorAll("#kort-bunke button.kort"));
    if (type === "grupper") {
      const forste = kort[0];
      const andre = kort.filter((k) => k.dataset.svar !== forste.dataset.svar).slice(0, n - 1);
      const plasser = document.querySelectorAll(".kort-rad")[0].querySelectorAll(".plass-knapp");
      [forste, ...andre].forEach((k, i) => { k.click(); plasser[i].click(); });
    } else if (type === "sorter") {
      const k = kort.find((x) => x.dataset.svar.split(" ").length === 1);
      const galt = Array.from(document.querySelectorAll(".kort-kategori")).find((b) => b.dataset.kategori !== k.dataset.svar);
      k.click(); galt.querySelector(".kategori-knapp").click();
    } else {
      kort.sort((a, b) => b.dataset.svar - a.dataset.svar)[0].click();
      document.querySelector(".plass-knapp").click();
    }
    document.getElementById("kort-sjekk").click();
    return { status: document.getElementById("kort-status").textContent, merket: document.querySelectorAll(".feil").length };
  }, info);
  sjekk(feil.merket > 0 && /^0 av 1/.test(feil.status), `${id}: en feil blir merket med tekst og stiplet kant`, JSON.stringify(feil));

  // Ekte dra og slipp med musa: første kort i bunken til første ledige plass eller boks
  await side.evaluate(() => document.getElementById("kort-nullstill").click());
  const kortet = side.locator("#kort-bunke button.kort").first();
  const nr = await kortet.getAttribute("data-nr");
  const mal = side.locator(".plass-knapp, .kategori-knapp").first();
  await mal.scrollIntoViewIfNeeded();
  await kortet.scrollIntoViewIfNeeded();
  const a = await kortet.boundingBox(), m = await mal.boundingBox();
  await side.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await side.mouse.down();
  await side.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2 + 20, { steps: 4 });
  await side.mouse.move(m.x + m.width / 2, m.y + m.height / 2, { steps: 10 });
  await side.mouse.up();
  await side.waitForTimeout(50);
  const dratt = await side.evaluate((nr) => ({
    paaBrett: !!document.querySelector(`#kort-brett button.kort[data-nr="${nr}"]`),
    valgt: document.querySelectorAll('button.kort[aria-pressed="true"]').length,
    spokelse: document.querySelectorAll(".kort-spokelse").length,
  }), nr);
  sjekk(dratt.paaBrett && !dratt.valgt && !dratt.spokelse, `${id}: et kort kan dras med musa og slippes på brettet`, JSON.stringify(dratt));

  // Bytte: et valgt kort som trykkes på et kort på brettet, bytter plass med det
  if (info.type !== "sorter") {
    const byttet = await side.evaluate((nr) => {
      const paaBrett = document.querySelector(`#kort-brett button.kort[data-nr="${nr}"]`);
      const annet = document.querySelector("#kort-bunke button.kort");
      annet.click(); paaBrett.click();
      return { annet: !!annet.closest("#kort-brett"), forste: !!paaBrett.closest("#kort-bunke") };
    }, nr);
    sjekk(byttet.annet && byttet.forste, `${id}: kort bytter plass når et kort legges på et opptatt sted`, JSON.stringify(byttet));
  }

  // Tastatur: Enter på et kort velger det, Enter på en plass legger det der, Esc avbryter
  await side.evaluate(() => document.getElementById("kort-nullstill").click());
  await side.focus("#kort-bunke button.kort");
  await side.keyboard.press("Enter");
  const valgtNr = await side.evaluate(() => document.querySelector('button.kort[aria-pressed="true"]')?.dataset.nr);
  await side.keyboard.press("Escape");
  const etterEsc = await side.evaluate(() => document.querySelectorAll('button.kort[aria-pressed="true"]').length);
  await side.focus("#kort-bunke button.kort");
  await side.keyboard.press("Enter");
  await side.focus(".plass-knapp, .kategori-knapp");
  await side.keyboard.press("Enter");
  const lagtMedTastatur = await side.evaluate((nr) => !!document.querySelector(`#kort-brett button.kort[data-nr="${nr}"]`), valgtNr);
  sjekk(valgtNr && etterEsc === 0 && lagtMedTastatur, `${id}: kort kan velges, avbrytes og legges med tastaturet`);

  // Teksten passer på alle kortene
  const forStore = await side.evaluate(() => Array.from(document.querySelectorAll(".kort-innhold:not(.kort-figur)")).filter((i) => {
    const k = i.closest(".kort"), st = getComputedStyle(k);
    return i.scrollWidth > i.clientWidth + 1 || i.getBoundingClientRect().height > k.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) + 1;
  }).map((i) => i.closest(".kort").dataset.nr));
  sjekk(forStore.length === 0, `${id}: teksten passer inni alle kortene`, forStore.join(", "));

  // Utskrift og fasit
  const lenker = await side.$$eval(".kortsett .elevark-lenke a", (a) => a.map((x) => x.getAttribute("href")));
  const tekst = {};
  for (const l of lenker.filter((x) => x.endsWith(".pdf"))) {
    const svar = await side.request.get(new URL(l, side.url()).href);
    const fil = path.join(RES, path.basename(l));
    fs.writeFileSync(fil, await svar.body());
    tekst[l.includes("fasit") ? "fasit" : "kort"] = execFileSync("pdftotext", ["-layout", fil, "-"]).toString();
  }
  const koder = Array.from({ length: info.antall }, (_, i) => `${info.kode}-${String(i + 1).padStart(2, "0")}`);
  const manglerKort = koder.filter((k) => !tekst.kort?.includes(k));
  sjekk(manglerKort.length === 0, `${id}: alle ${info.antall} kortene står i utskriften med kode`, manglerKort.join(", "));
  const manglerFasit = koder.filter((k) => !tekst.fasit?.includes(k));
  sjekk(manglerFasit.length === 0 && tekst.fasit.includes("Fasit"), `${id}: fasiten nevner alle kortene`, manglerFasit.join(", "));
  sjekk(!/\{\{|\$/.test(tekst.kort + tekst.fasit), `${id}: ingen plassholdere eller rå formler i PDF-ene`);
  sjekk(problemer.length === 0, `${id}: ingen JS-feil`, problemer.join(" | "));
  await kontekst.close();
}

// Dra og slipp med berøring på mobil (ett sett er nok)
{
  const { side, kontekst, problemer } = await nySide({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await side.goto(BASE + "varierende/identiteter.html", { waitUntil: "networkidle" });
  const kortet = side.locator("#kort-bunke button.kort").first();
  const nr = await kortet.getAttribute("data-nr");
  await kortet.scrollIntoViewIfNeeded();
  const mal = side.locator(".plass-knapp").first();
  const a = await kortet.boundingBox(), m = await mal.boundingBox();
  // Berøring sendes som pointer-hendelser med pointerType «touch»
  const cdp = await kontekst.newCDPSession(side);
  const trykk = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await trykk("touchStart", a.x + a.width / 2, a.y + a.height / 2);
  for (let i = 1; i <= 12; i++) await trykk("touchMove", a.x + a.width / 2 + (m.x + m.width / 2 - a.x - a.width / 2) * i / 12, a.y + a.height / 2 + (m.y + m.height / 2 - a.y - a.height / 2) * i / 12);
  await trykk("touchEnd");
  await side.waitForTimeout(100);
  sjekk(await side.evaluate((nr) => !!document.querySelector(`#kort-brett button.kort[data-nr="${nr}"]`), nr), "kortsett på mobil: et kort kan dras opp fra stripa med fingeren");
  sjekk(problemer.length === 0, "kortsett på mobil: ingen JS-feil", problemer.join(" | "));
  await kontekst.close();
}

// ---------------------------------------------------------------- 13. tavleoppgaver
console.log("\n13. Tavleoppgaver: ett spørsmål om gangen, piltaster og lenker");
for (const navn of SIDER.filter((s) => s.startsWith("varierende/") && fs.readFileSync(path.join(DOCS, s), "utf8").includes('class="tavle-ramme"'))) {
  const id = navn.split("/").pop().replace(".html", "");
  const { side, kontekst, problemer } = await nySide();
  await side.goto(BASE + navn, { waitUntil: "networkidle" });
  const synlige = () => side.$$eval(".tavle-kort", (k) => k.filter((x) => !x.hidden).length);
  const antall = await side.$$eval(".tavle-kort", (k) => k.length);
  sjekk((await synlige()) === 1, `${id}: bare ett av ${antall} spørsmål vises`);
  sjekk(await side.$$eval(".tavle-svar", (d) => d.every((x) => !x.open)), `${id}: svarforslagene er lukket`);
  await side.keyboard.press("ArrowRight");
  await side.keyboard.press("ArrowRight");
  sjekk(new URL(side.url()).hash === "#t3" && (await side.textContent(".tavle-teller")).includes(`3 av ${antall}`), `${id}: piltast går til neste spørsmål, og adressen viser hvilket`);
  await side.goto("about:blank");
  await side.goto(BASE + navn + "#t2", { waitUntil: "networkidle" });
  sjekk((await side.evaluate(() => window.mattelabTavle.gjeldende())) === 1, `${id}: lenke til spørsmål 2 åpner spørsmål 2`);
  await side.click(".tavle-alle");
  sjekk((await synlige()) === antall, `${id}: «Vis alle» viser alle spørsmålene`);
  sjekk(problemer.length === 0, `${id}: ingen JS-feil`, problemer.join(" | "));
  await kontekst.close();
}

// ---------------------------------------------------------------- 14. øvinger
console.log("\n14. Øvinger: riktige og gale svar");
{
  const { side, kontekst, problemer } = await nySide();
  await side.goto(BASE + "varierende/finn-feilen-potenser.html?frø=7", { waitUntil: "networkidle" });
  for (let i = 0; i < 6; i++) {
    const o = await side.evaluate(() => window.mattelabFinnFeilen.gjeldende());
    if (o.feilSteg >= 0) {
      const annet = o.feilSteg === 0 ? 1 : 0;
      await side.click(`.steg-knapp[data-steg="${annet}"]`);
      sjekk((await side.textContent("#ff-tilbake")).includes("Ikke helt"), `finn feilen: et riktig steg gir «Ikke helt» (oppgave ${i + 1})`);
      await side.click(`.steg-knapp[data-steg="${o.feilSteg}"]`);
    } else {
      await side.click("#ff-ingen");
    }
    sjekk((await side.textContent("#ff-tilbake")).includes("Riktig!"), `finn feilen: riktig valg gir «Riktig!» (oppgave ${i + 1})`);
    await side.click("#ff-ny");
  }
  for (const niva of [1, 2, 3, 4]) {
    await side.goto(BASE + `varierende/fullfor-kvadratet.html?niva=${niva}&frø=${niva * 11}`, { waitUntil: "networkidle" });
    const o = await side.evaluate(() => window.mattelabFullfor.gjeldende());
    const svar = [];
    if (o.a !== 1) svar.push([String(2 * o.p)]);
    svar.push([String(o.p).replace(".", ",")], [String(o.p * o.p).replace(".", ",")], [String(o.p), String(o.q)]);
    // Første steg: ett galt svar gir hint
    await side.fill(".fk-steg:last-child input[type=text]", "1000");
    await side.click(".fk-steg:last-child .fk-sjekk");
    sjekk((await side.textContent(".fk-steg:last-child .ovelse-tilbake")).includes("Ikke riktig"), `fullfør kvadratet nivå ${niva}: galt svar gir hint`);
    for (const s of svar) {
      const felt = side.locator(".fk-steg:last-child input[type=text]");
      for (let j = 0; j < s.length; j++) await felt.nth(j).fill(s[j]);
      await side.click(".fk-steg:last-child .fk-sjekk");
    }
    if (niva === 3) {
      if (o.ingenLosning) await side.check(".fk-steg:last-child .fk-ingen");
      else { const f = side.locator(".fk-steg:last-child input[type=text]"); await f.nth(0).fill(o.losninger[1].toFixed(2).replace(".", ",")); await f.nth(1).fill(o.losninger[0].toFixed(2)); }
      await side.click(".fk-steg:last-child .fk-sjekk");
    }
    const ferdig = await side.textContent("#fk-ferdig");
    sjekk(ferdig.includes("Ferdig"), `fullfør kvadratet nivå ${niva}: riktige svar gjennom alle stegene gir «Ferdig»`, ferdig);
  }
  // Stigningstall og konstantledd: riktige svar gjennom alle stegene på alle nivåene
  for (const niva of [1, 2, 3, 4]) {
    for (const fro of [3, 8]) {
      await side.goto(BASE + `varierende/stigningstall-og-konstantledd.html?niva=${niva}&frø=${fro * 13 + niva}`, { waitUntil: "networkidle" });
      const o = await side.evaluate(() => window.mattelabStigningstall.gjeldende());
      if (fro === 3) {
        // Δx og Δy byttet om, eller Δx/Δy i stedet for Δy/Δx, gir egne tilbakemeldinger
        if (niva !== 3) {
          const f = side.locator(".fk-steg:last-child input[type=text]");
          await f.nth(0).fill(String(-o.dx)); await f.nth(1).fill(String(-o.dy));
          await side.click(".fk-steg:last-child .fk-sjekk");
          sjekk((await side.textContent(".fk-steg:last-child .ovelse-tilbake")).includes("motsatt rekkefølge"), `stigningstall nivå ${niva}: motsatt rekkefølge gir egen tilbakemelding`);
        } else {
          await side.fill(".fk-steg:last-child input[type=text]", "1000");
          await side.click(".fk-steg:last-child .fk-sjekk");
          sjekk((await side.textContent(".fk-steg:last-child .ovelse-tilbake")).includes("Ikke riktig"), `stigningstall nivå ${niva}: galt svar gir hint`);
        }
      }
      for (const s of o.svar) {
        const felt = side.locator(".fk-steg:last-child input[type=text]");
        // Skriv svaret som brøk når det trengs (for eksempel 2/3), ellers med desimalkomma
        const somTekst = (x) => { const n = [1, 2, 3, 4].find((d) => Math.abs(Math.round(x * d) - x * d) < 1e-9); return n === 1 || !n ? String(x).replace(".", ",") : `${Math.round(x * n)}/${n}`; };
        for (let j = 0; j < s.length; j++) await felt.nth(j).fill(somTekst(s[j]));
        await side.click(".fk-steg:last-child .fk-sjekk");
      }
      const ferdig = await side.textContent("#sg-ferdig");
      const ok = ferdig.includes("Ferdig") && o.svar.every((s) => s.every(Number.isFinite));
      sjekk(ok, `stigningstall nivå ${niva} (frø ${fro * 13 + niva}): riktige svar gir «Ferdig», a = ${o.a}, b = ${o.b}`, ferdig);
    }
  }
  // Oppgavene er laget baklengs: punktene ligger på linja
  const baklengs = await side.evaluate(() => {
    const { lagOppgave } = window.mattelabStigningstall; const feil = [];
    let s = 1;
    const r = { tall: () => { s = (s * 16807) % 2147483647; return s / 2147483647; } };
    r.heltall = (a, b) => a + Math.floor(r.tall() * (b - a + 1)); r.velg = (l) => l[Math.floor(r.tall() * l.length)];
    for (let i = 0; i < 2000; i++) {
      const o = lagOppgave(1 + (i % 4), r);
      if (Math.abs(o.a * o.x1 + o.b - o.y1) > 1e-9 || Math.abs(o.a * o.x2 + o.b - o.y2) > 1e-9 || o.dx === 0) feil.push(JSON.stringify(o));
      if (o.niva === 3 && o.tabellY.some((y, k) => Math.abs(y - (o.a * o.tabellX[k] + o.b)) > 1e-9)) feil.push("tabell");
      if (o.niva <= 2 && !Number.isInteger(o.y1)) feil.push("y ikke heltall: " + JSON.stringify(o));
    }
    return feil;
  });
  sjekk(baklengs.length === 0, "stigningstall: 2000 tilfeldige oppgaver, punktene og tabellene ligger på linja", baklengs.slice(0, 2).join(" | "));
  // Likningen til tangenten: riktige svar gjennom alle stegene, og egen tilbakemelding på fortegnsfeil i b
  for (const niva of [1, 2, 3, 4]) {
    for (const fro of [5, 11]) {
      await side.goto(BASE + `varierende/tangentlikning.html?niva=${niva}&frø=${fro * 17 + niva}`, { waitUntil: "networkidle" });
      const o = await side.evaluate(() => window.mattelabTangentlikning.gjeldende());
      for (let i = 0; i < o.svar.length; i++) {
        const felt = side.locator(".fk-steg:last-child input[type=text]");
        if (fro === 5 && i === o.svar.length - 1 && o.y0 + o.a * o.x0 !== o.b) {
          await felt.nth(0).fill(String(o.y0 + o.a * o.x0));
          await side.click(".fk-steg:last-child .fk-sjekk");
          sjekk((await side.textContent(".fk-steg:last-child .ovelse-tilbake")).includes("fortegnet"), `tangentlikning nivå ${niva}: fortegnsfeil i b gir egen tilbakemelding`);
        }
        await felt.nth(0).fill(String(o.svar[i][0]));
        await side.click(".fk-steg:last-child .fk-sjekk");
      }
      const ferdig = await side.textContent("#tl-ferdig");
      sjekk(ferdig.includes("Ferdig"), `tangentlikning nivå ${niva} (frø ${fro * 17 + niva}): riktige svar gir «Ferdig», y = ${o.a}x + ${o.b}`, ferdig);
    }
  }
  const tangentFeil = await side.evaluate(() => {
    const { lagOppgave } = window.mattelabTangentlikning; const feil = [];
    let s = 7;
    const r = { tall: () => { s = (s * 16807) % 2147483647; return s / 2147483647; } };
    r.heltall = (a, b) => a + Math.floor(r.tall() * (b - a + 1)); r.velg = (l) => l[Math.floor(r.tall() * l.length)];
    for (let i = 0; i < 2000; i++) {
      const o = lagOppgave(1 + (i % 4), r);
      if (o.a * o.x0 + o.b !== o.y0) feil.push("punktet: " + JSON.stringify(o));
      if (o.p) {
        const f = (x) => o.p.reduce((sum, c, k) => sum + c * x ** k, 0), h = 1e-6;
        if (f(o.x0) !== o.y0 || Math.abs((f(o.x0 + h) - f(o.x0 - h)) / (2 * h) - o.a) > 1e-5) feil.push("f eller f′: " + JSON.stringify(o));
        if (o.niva === 4 && (o.a !== o.k || o.p[2] === 0)) feil.push("nivå 4: " + JSON.stringify(o));
      }
      if (!o.svar.flat().every(Number.isInteger) || o.svar.flat().some((x) => Math.abs(x) > 60)) feil.push("svar: " + JSON.stringify(o.svar));
    }
    return feil;
  });
  sjekk(tangentFeil.length === 0, "tangentlikning: 2000 tilfeldige oppgaver, tangenten går gjennom punktet og har stigningstall f′(x₀)", tangentFeil.slice(0, 2).join(" | "));
  // Derivasjonsregler: riktige svar gir «Riktig», en kjent feil gir egen tilbakemelding
  for (const niva of [1, 2, 3, 4, 5, 6]) {
    for (const fro of [2, 9]) {
      await side.goto(BASE + `varierende/derivasjonsregler.html?niva=${niva}&frø=${fro * 19 + niva}`, { waitUntil: "networkidle" });
      const o = await side.evaluate(() => { const o = window.mattelabDerivasjonsregler.gjeldende(); return { svar: o.svar, feil: o.feil.map((f) => f.svar), type: o.type }; });
      const felt = side.locator("#dr-svar input[type=text]");
      const kjent = o.feil.find((f) => f.some((v, j) => v !== o.svar[j]));
      if (kjent) {
        for (let j = 0; j < kjent.length; j++) await felt.nth(j).fill(String(kjent[j]).replace(".", ","));
        await side.click("#dr-svar .fk-sjekk");
        sjekk((await side.textContent("#dr-tilbake")).includes("Nesten"), `derivasjonsregler nivå ${niva} (${o.type}): typisk feil gir egen tilbakemelding`);
      }
      for (let j = 0; j < o.svar.length; j++) await felt.nth(j).fill(String(o.svar[j]).replace(".", ","));
      await side.click("#dr-svar .fk-sjekk");
      const t = await side.textContent("#dr-tilbake");
      sjekk(t.includes("Riktig"), `derivasjonsregler nivå ${niva} (frø ${fro * 19 + niva}, ${o.type}): riktige svar gir «Riktig»`, t.slice(0, 80));
    }
  }
  const regelFeil = await side.evaluate(() => {
    const { lagOppgave } = window.mattelabDerivasjonsregler; const feil = [];
    let s = 11;
    const r = { tall: () => { s = (s * 16807) % 2147483647; return s / 2147483647; } };
    r.heltall = (a, b) => a + Math.floor(r.tall() * (b - a + 1)); r.velg = (l) => l[Math.floor(r.tall() * l.length)];
    const typer = new Set();
    for (let i = 0; i < 3000; i++) {
      const o = lagOppgave(1 + (i % 6), r);
      typer.add(o.type + o.variant);
      const d = o.df(o.svar);
      for (const x of o.punkter) {
        const h = 1e-5, num = (o.f(x + h) - o.f(x - h)) / (2 * h);
        if (!Number.isFinite(num) || Math.abs(num - d(x)) > 1e-4 * (1 + Math.abs(num))) { feil.push(`${o.type}${o.variant} ${o.ftex} x=${x}`); break; }
      }
    }
    if (typer.size !== 15) feil.push(`bare ${typer.size} av 15 oppgavetyper`);
    return feil;
  });
  sjekk(regelFeil.length === 0, "derivasjonsregler: 3000 tilfeldige oppgaver, f′ med fasiten stemmer med numerisk derivert av f", regelFeil.slice(0, 2).join(" | "));
  sjekk(problemer.length === 0, "øvingene: ingen JS-feil", problemer.join(" | "));
  await kontekst.close();
}

// ---------------------------------------------------------------- 15. undervisningsopplegg
console.log("\n15. Undervisningsopplegg: tidsplan, kompetansemål og elevark");
{
  const km = JSON.parse(fs.readFileSync(path.join(ROT, "data", "kompetansemaal.json"), "utf8"));
  const alleMaal = Object.values(km.fag).flatMap((f) => f.maal);
  const opplegg = SIDER.filter((s) => s.startsWith("opplegg/") && !s.endsWith("index.html"));
  sjekk(opplegg.length === 18, "det finnes atten undervisningsopplegg", String(opplegg.length));
  for (const navn of opplegg) {
    const id = navn.split("/").pop().replace(".html", "");
    const { side, kontekst, problemer } = await nySide();
    await side.goto(BASE + navn, { waitUntil: "networkidle" });
    const info = await side.evaluate(() => {
      const deler = Array.from(document.querySelectorAll(".tidsdel"));
      return {
        varighet: Number(document.querySelector(".opplegg-merke span").textContent.replace(/\D/g, "")),
        minutter: deler.map((d) => Number(d.dataset.min)),
        tider: deler.map((d) => d.querySelector(".tidsdel-tid").textContent),
        linje: document.querySelectorAll(".tidslinje li").length,
        maal: Array.from(document.querySelectorAll(".maal-sitat li")).map((l) => l.textContent.replace(/^.*?mål \d+\s*/, "").replace(/^«|»$/g, "")),
        lukket: Array.from(document.querySelectorAll(".tidsdel details, details.fasit")).every((d) => !d.open),
      };
    });
    const sum = info.minutter.reduce((a, b) => a + b, 0);
    sjekk([45, 90, 135].includes(info.varighet) && sum === info.varighet, `${id}: delene er ${sum} minutter, som er varigheten`, `${info.varighet}`);
    sjekk(info.linje === info.minutter.length && info.tider.at(-1).startsWith(`${info.varighet - info.minutter.at(-1)}–${info.varighet} min`), `${id}: tidslinja og klokkeslettene stemmer`, info.tider.join(", "));
    sjekk(info.maal.length > 0 && info.maal.every((m) => alleMaal.includes(m)), `${id}: kompetansemålene er sitert ordrett`, info.maal.filter((m) => !alleMaal.includes(m)).join(" | "));
    sjekk(info.lukket, `${id}: svar og løsningsforslag er lukket fra start`);
    // Elevarket: alle oppgavetitlene og deloppgavene, men ingen fasit
    const pdfUrl = await side.getAttribute(".elevark-lenke a[href$='.pdf']", "href");
    const pdfFil = path.join(RES, `opplegg-${id}.pdf`);
    fs.writeFileSync(pdfFil, await (await side.request.get(new URL(pdfUrl, side.url()).href)).body());
    const pdfTekst = execFileSync("pdftotext", ["-layout", pdfFil, "-"]).toString().replace(/\s+/g, " ");
    const titler = await side.$$eval(".oppgave > h3", (h) => h.map((x) => { const k = x.cloneNode(true); k.querySelectorAll(".katex-mathml, .oppgave-nr").forEach((m) => m.remove()); return k.textContent.trim().split(/\s+/)[0]; }));
    sjekk(titler.every((t) => pdfTekst.includes(t)) && pdfTekst.includes("a)") && pdfTekst.includes("Opplegget ligger på"), `${id}: elevarket har oppgavene med deloppgaver a), b) …`, titler.filter((t) => !pdfTekst.includes(t)).join(", "));
    const fasitbiter = await side.$$eval(".fasit-innhold p", (ps) => ps.map((p) => {
      const k = p.cloneNode(true); k.querySelectorAll(".katex").forEach((m) => m.replaceWith("|"));
      return k.textContent.split("|").map((t) => t.trim()).sort((a, b) => b.length - a.length)[0];
    }).filter((t) => t && t.split(/\s+/).length >= 4));
    const lekket = fasitbiter.filter((b) => pdfTekst.includes(b.replace(/\s+/g, " ")));
    sjekk(lekket.length === 0, `${id}: elevarket inneholder ikke fasit (${fasitbiter.length} biter sjekket)`, lekket.slice(0, 2).join(" | "));
    sjekk(problemer.length === 0, `${id}: ingen JS-feil`, problemer.join(" | "));
    await kontekst.close();
  }
  // Oversikten står i rekkefølgen fra «rekkefolge»
  const { side, kontekst } = await nySide();
  await side.goto(BASE + "opplegg/index.html", { waitUntil: "networkidle" });
  const titler = await side.$$eval(".sim-kort-tittel", (t) => t.map((x) => x.textContent));
  sjekk(titler[0] === "Hva er en funksjon?" && titler[9] === "Repetisjon av funksjoner" && titler[10] === "Fra vekstfart til den deriverte" && titler[11] === "Tangenten og definisjonen av den deriverte" && titler[12] === "Vekstfart, den deriverte og tangenten" && titler[13] === "Kontinuitet og deriverbarhet" && titler[14] === "Derivasjon av polynomer og kjerneregelen" && titler.at(-1) === "Omvendte funksjoner og deriverte", "oversikten over opplegg står i undervisningsrekkefølge, ett fag om gangen", titler.join(" · "));
  sjekk((await side.$$eval(".fag-merke.varighet", (m) => m.length)) === 18, "hvert opplegg viser varigheten på kortet");
  await kontekst.close();
}

await nettleser.close();
tjener.close();
console.log(`\n${ok} bestått, ${feil} feilet.`);
if (feil) { console.log("\nFeilet:\n  - " + feilmeldinger.join("\n  - ")); process.exit(1); }
