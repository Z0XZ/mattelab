// Rask titt på én side under utvikling: feil i konsollen, verdiene og skjermbilder.
// Bruk: node tester/titt.mjs utforskere/side.html "?a=1" [bredde]
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROT, "docs"), RES = path.join(ROT, "tester", "resultater");
fs.mkdirSync(RES, { recursive: true });
const TYPER = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const tjener = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const fil = path.join(DOCS, p);
  if (!fs.existsSync(fil) || fs.statSync(fil).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPER[path.extname(fil)] || "application/octet-stream" });
  fs.createReadStream(fil).pipe(res);
});
await new Promise((r) => tjener.listen(0, "127.0.0.1", r));
const [side_, sok = "", ...bredder] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
for (const w of (bredder.length ? bredder : ["1280", "360"]).map(Number)) {
  const s = await (await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: process.env.MORK ? "dark" : "light" })).newPage();
  const feil = [];
  s.on("pageerror", (e) => feil.push(e.message));
  s.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") feil.push(m.text()); });
  await s.goto(`http://127.0.0.1:${tjener.address().port}/${side_}${sok}`, { waitUntil: "networkidle" });
  await s.waitForTimeout(200);
  const info = await s.evaluate(() => ({
    verdier: Array.from(document.querySelectorAll("#verdier > div")).map((d) => d.querySelector("dt").textContent + ": " + d.querySelector("dd").textContent.replace(/\s+/g, " ")),
    melding: document.getElementById("melding")?.textContent.trim(),
    rull: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  console.log(`@${w}: feil=${JSON.stringify(feil)} rull=${info.rull}`);
  if (w === 1280) { console.log(info.verdier.join("\n")); if (info.melding) console.log("MELDING: " + info.melding); }
  const navn = side_.replace(/\W+/g, "_") + "-" + w + ".png";
  await (await s.$("#utforsker") || s).screenshot({ path: path.join(RES, navn) });
}
await b.close(); tjener.close();
