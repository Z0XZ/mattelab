// Leser en JSON-liste med {tex, display} fra stdin og skriver en JSON-liste med HTML til stdout.
// Brukes av bygg.py slik at formler er ferdig tegnet i HTML-filene (virker uten JavaScript).
const path = require("path");
const katex = require(path.join(__dirname, "..", "statisk", "lib", "katex", "katex.min.js"));
let inn = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (inn += d));
process.stdin.on("end", () => {
  const liste = JSON.parse(inn);
  const ut = [];
  const feil = [];
  for (const { tex, display } of liste) {
    try {
      ut.push(katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "warn", output: "htmlAndMathml" }));
    } catch (e) {
      feil.push(tex + "  →  " + e.message);
      ut.push(null);
    }
  }
  process.stdout.write(JSON.stringify({ ut, feil }));
});
