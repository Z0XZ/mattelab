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
        const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !e.closest(".katex-display, .tabell-rull, .forskrift, .former p, .katex-mathml");
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
  sjekk((await verdi("Nullpunkter")) === `x = ≈ ${M}199,5 og x = ≈ ${M}0,5`, "a = 0,01: nullpunkter med ≈", await verdi("Nullpunkter"));
  sjekk(await side.isVisible("#utenfor"), "punkter utenfor tegneområdet gir melding");
  sjekk((await side.$$(".g-utenfor")).length > 0, "pil ved kanten for punkt utenfor");
  await side.click("#vis-alt");
  sjekk(!(await side.isVisible("#utenfor")), "«Vis hele grafen» viser alle punktene");

  // Oppgave 6-tallene, regnet ut i verktoy/fasit/andregrad.py
  for (const [a, topp, n] of [["0,5", `(${M}2, ${M}1)`, `x = ≈ ${M}3,41 og x = ≈ ${M}0,59`], ["0,1", `(${M}10, ${M}9)`, `x = ≈ ${M}19,49 og x = ≈ ${M}0,51`]]) {
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
  sjekk(kort === 10, "oversikten viser alle 10 utforskere", String(kort));
  await kontekst.close();
}

// ---------------------------------------------------------------- 7. filter og fagvalg
console.log("\n7. Filter og fagvalg");
{
  const { side, kontekst, problemer } = await nySide();
  const synlige = () => side.$$eval(".sim-kort-liste > li", (k) => k.filter((x) => !x.hidden).length);
  await side.goto(BASE + "utforskere/index.html?fag=R1", { waitUntil: "networkidle" });
  sjekk((await synlige()) === 5, "?fag=R1 viser 5 utforskere", String(await synlige()));
  sjekk((await side.inputValue("#fagvalg")) === "R1", "?fag=R1 setter fagvalget i menyen");
  sjekk((await side.getAttribute('.filter-knapp[data-fag="R1"]', "aria-pressed")) === "true", "R1-knappen i filteret er valgt");
  sjekk(await side.isHidden('.tema-blokk[data-blokk="algebra"]'), "temablokker uten treff skjules");
  await side.goto(BASE + "om.html");
  sjekk((await side.inputValue("#fagvalg")) === "R1", "fagvalget huskes på andre sider");
  const menyLenke = await side.getAttribute('.meny a[href*="utforskere"]', "href");
  sjekk(menyLenke.includes("fag=R1"), "menylenken tar med fagvalget", menyLenke);
  await side.selectOption("#fagvalg", "");
  await side.goto(BASE + "utforskere/index.html");
  sjekk((await synlige()) === 10, "«Alle fag» viser alle", String(await synlige()));
  await side.click('.filter-knapp[data-tema="derivasjon"]');
  sjekk((await synlige()) === 2, "tema Derivasjon viser 2", String(await synlige()));
  sjekk(side.url().includes("tema=derivasjon"), "temavalget står i adressen", side.url());
  sjekk((await side.getAttribute('.filter-knapp[data-tema="derivasjon"]', "aria-pressed")) === "true", "temaknappen har aria-pressed");
  sjekk((await side.textContent(".filter-antall")) === "Viser 2 av 10", "antall treff vises", await side.textContent(".filter-antall"));
  await side.click('.filter-knapp[data-tema=""]');
  await side.fill("#filter-sok", "toppunkt");
  sjekk((await synlige()) === 1, "søk «toppunkt» gir 1 treff", String(await synlige()));
  sjekk(side.url().includes("q=toppunkt"), "søket står i adressen");
  await side.fill("#filter-sok", "finnesikke");
  sjekk(await side.isVisible(".filter-tom"), "melding ved ingen treff");
  await side.click(".filter-tom button");
  sjekk((await synlige()) === 10, "«Vis alt» nullstiller filteret");
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

await nettleser.close();
tjener.close();
console.log(`\n${ok} bestått, ${feil} feilet.`);
if (feil) { console.log("\nFeilet:\n  - " + feilmeldinger.join("\n  - ")); process.exit(1); }
