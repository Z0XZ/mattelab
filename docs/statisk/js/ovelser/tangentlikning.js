// Øving: Finn likningen til tangenten.
//
// Nivå 1: punktet og stigningstallet er gitt. Nivå 2: andregradsfunksjon, f′(x) er gitt.
// Nivå 3: tredjegradsfunksjon, f′(x) er gitt, og x₀ kan være negativ.
// Nivå 4: finn punktet der tangenten har et gitt stigningstall, og så tangenten.
//
// Derivasjonsreglene kommer senere i kurset, så uttrykket for f′(x) står i oppgaven.
// Oppgavene lages baklengs fra heltall, så fasiten er riktig per konstruksjon.

import { tex, lagTilfeldig, tolkSvar, erRiktig } from "../ovelse.js";
import { annonser, tall } from "../felles.js";
import { verdi, deriver, texPoly } from "../utforskere/polynom-matte.js";

const $ = (id) => document.getElementById(id);

/** Ren funksjon: lag en oppgave på et nivå. r er en tilfeldighetsgenerator fra lagTilfeldig(). */
export function lagOppgave(niva, r) {
  const ikkeNull = (a, b) => { let t; do t = r.heltall(a, b); while (t === 0); return t; };
  const o = { niva };
  if (niva === 1) {
    o.x0 = r.heltall(-4, 4);
    o.y0 = r.heltall(-6, 8);
    o.a = ikkeNull(-5, 5);
  } else {
    if (niva === 2 || niva === 4) o.p = [r.heltall(-6, 6), r.heltall(-6, 6), ikkeNull(-3, 3)];
    else o.p = [r.heltall(-5, 5), r.heltall(-4, 4), r.heltall(-3, 3), r.velg([-1, 1])];
    o.dp = deriver(o.p);
    if (niva === 4) {
      // Velg x₀ først, og regn ut stigningstallet k = f′(x₀). Da har f′(x) = k nøyaktig én løsning.
      o.x0 = r.heltall(-3, 3);
      o.k = verdi(o.dp, o.x0);
    } else {
      o.x0 = niva === 2 ? r.heltall(-2, 3) : r.heltall(-2, 2);
    }
    o.y0 = verdi(o.p, o.x0);
    o.a = verdi(o.dp, o.x0);
  }
  o.b = o.y0 - o.a * o.x0;
  // Svarene steg for steg, i samme rekkefølge som feltene (brukes også av testene)
  if (niva === 1) o.svar = [[o.b]];
  else if (niva === 4) o.svar = [[o.x0], [o.y0], [o.b]];
  else o.svar = [[o.y0], [o.a], [o.b]];
  return o;
}

/** y = ax + b i TeX. */
export function texLinje(a, b) {
  const at = a === 0 ? "" : a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  if (!at) return `y = ${b}`;
  return `y = ${at}${b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${Math.abs(b)}`}`;
}

const P = (x) => (x < 0 ? `(${x})` : String(x));

// ------------------------------------------------------------------ på siden
const rot = $("ovelse");
if (rot) {
  const r = lagTilfeldig();
  const nivaVelger = $("tl-niva");
  const poeng = { utenHjelp: 0, totalt: 0 };
  let o, steg, feilHer, fikkHjelp;

  function oppgavetekst() {
    if (o.niva === 1) return `<p>Grafen til en funksjon ${tex("f")} går gjennom punktet ${tex(`(${o.x0}, ${o.y0})`)}. Der er ${tex(`f'(${o.x0}) = ${o.a}`)}. Finn likningen til tangenten i punktet.</p>`;
    const fd = `${tex(`f(x) = ${texPoly(o.p)}`)} og ${tex(`f'(x) = ${texPoly(o.dp)}`)}`;
    if (o.niva === 4) return `<p>Vi har ${fd}. Grafen har en tangent med stigningstall ${tex(String(o.k))}. Finn tangeringspunktet og likningen til tangenten.</p>`;
    return `<p>Vi har ${fd}. Finn likningen til tangenten i punktet der ${tex(`x = ${o.x0}`)}.</p>`;
  }

  function lagSteg() {
    const s = [];
    if (o.niva === 1) {
      s.push({
        tekst: `Tangenten er en rett linje ${tex(`y = ${o.a}x + b`)} som går gjennom ${tex(`(${o.x0}, ${o.y0})`)}. Hva er ${tex("b")}?`,
        felt: ["b"],
        hint: `Sett inn punktet: ${tex(`${o.y0} = ${o.a} \\cdot ${P(o.x0)} + b`)}. Løs for ${tex("b")}.`,
      });
    } else {
      if (o.niva === 4) {
        s.push({
          tekst: `Tangenten har stigningstall ${tex(String(o.k))} der ${tex(`f'(x) = ${o.k}`)}. Løs likningen. Hva er ${tex("x_0")}?`,
          felt: ["x₀"],
          hint: `${tex(`${texPoly(o.dp)} = ${o.k}`)}. Samle tallene på én side, og del på tallet foran ${tex("x")}.`,
        });
      }
      s.push({
        tekst: `Regn ut y-koordinaten til tangeringspunktet. Hva er ${tex(`f(${o.x0})`)}?`,
        felt: [`f(${o.x0})`],
        hint: `Sett inn ${tex(`x = ${o.x0}`)} i ${tex(`f(x) = ${texPoly(o.p)}`)}. Pass på parentes rundt negative tall.`,
      });
      if (o.niva !== 4) {
        s.push({
          tekst: `Stigningstallet til tangenten er den deriverte i punktet. Hva er ${tex(`f'(${o.x0})`)}?`,
          felt: [`f′(${o.x0})`],
          hint: `Sett inn ${tex(`x = ${o.x0}`)} i ${tex(`f'(x) = ${texPoly(o.dp)}`)}. Ikke i ${tex("f(x)")}.`,
        });
      }
      s.push({
        tekst: `Tangenten er ${tex(`y = ${o.a}x + b`)} og går gjennom ${tex(`(${o.x0}, ${o.y0})`)}. Hva er ${tex("b")}?`,
        felt: ["b"],
        hint: `Sett inn punktet: ${tex(`${o.y0} = ${o.a} \\cdot ${P(o.x0)} + b`)}. Eller bruk ettpunktsformelen ${tex("y - y_0 = a(x - x_0)")}.`,
      });
    }
    return s.map((st, i) => ({ ...st, felt: st.felt.map((navn, j) => [navn, o.svar[i][j]]) }));
  }

  function ny(fokus = true) {
    o = lagOppgave(Number(nivaVelger.value), r);
    steg = lagSteg();
    fikkHjelp = false;
    $("tl-oppgave").innerHTML = oppgavetekst();
    $("tl-steg").innerHTML = "";
    $("tl-ny").hidden = true;
    $("tl-ferdig").innerHTML = "";
    visSteg(0, fokus);
  }

  /** Feltnavn i TeX: b → b, x₀ → x_0, f′(2) → f'(2). */
  const texNavn = (navn) => tex(navn.replace("x₀", "x_0").replace("′", "'"));

  function visSteg(i, fokus = true) {
    feilHer = 0;
    const s = steg[i];
    const li = document.createElement("li");
    li.className = "fk-steg";
    const felt = s.felt.map(([navn], j) => `<label class="fk-felt"><span>${texNavn(navn)} =</span>`
      + `<input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-j="${j}" aria-label="${navn}"></label>`).join("");
    li.innerHTML = `<p class="fk-steg-tekst"><span class="steg-nr">Steg ${i + 1}</span> ${s.tekst}</p>`
      + `<div class="fk-svarrad">${felt}<button type="button" class="knapp liten fk-sjekk">Sjekk</button>`
      + `<button type="button" class="knapp lys liten fk-vis" hidden>Vis svaret</button></div>`
      + `<div class="ovelse-tilbake" aria-live="polite"></div>`;
    $("tl-steg").appendChild(li);
    const sjekk = () => sjekkSteg(i, li);
    li.querySelector(".fk-sjekk").addEventListener("click", sjekk);
    li.querySelectorAll("input[type=text]").forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter") sjekk(); }));
    li.querySelector(".fk-vis").addEventListener("click", () => visSvar(i, li));
    if (fokus) li.querySelector("input").focus({ preventScroll: false });
  }

  function sjekkSteg(i, li) {
    const s = steg[i];
    const verdier = Array.from(li.querySelectorAll("input[type=text]")).map((f) => tolkSvar(f.value));
    const tilbake = li.querySelector(".ovelse-tilbake");
    if (!verdier.some(Number.isNaN) && s.felt.every(([, fasit], j) => erRiktig(verdier[j], fasit, 1e-9))) {
      ferdigSteg(i, li, "<strong>✓ Riktig.</strong>");
      return;
    }
    feilHer++;
    tilbake.className = "ovelse-tilbake feil";
    const navn = s.felt[0][0], v = verdier[0];
    if (verdier.some(Number.isNaN)) tilbake.innerHTML = "Skriv et tall. Du kan skrive brøk som 3/2 og desimaltall med komma.";
    else if (navn === "b" && erRiktig(v, o.y0 + o.a * o.x0)) tilbake.innerHTML = `<strong>✗ Nesten.</strong> Sjekk fortegnet. Fra ${tex(`${o.y0} = ${o.a} \\cdot ${P(o.x0)} + b`)} får du ${tex(`b = ${o.y0} - ${P(o.a * o.x0)}`)}.`;
    else if (navn.startsWith("f′") && erRiktig(v, o.y0) && o.y0 !== o.a) tilbake.innerHTML = `<strong>✗ Ikke riktig ennå.</strong> Det er ${tex(`f(${o.x0})`)}, funksjonsverdien. Stigningstallet finner du ved å sette inn i ${tex("f'(x)")}.`;
    else if (navn.startsWith("f(") && o.dp && erRiktig(v, verdi(o.dp, o.x0)) && o.y0 !== o.a) tilbake.innerHTML = `<strong>✗ Ikke riktig ennå.</strong> Du har satt inn i ${tex("f'(x)")}. Her skal du sette inn i ${tex("f(x)")}.`;
    else tilbake.innerHTML = `<strong>✗ Ikke riktig ennå.</strong> ${s.hint}`;
    if (feilHer >= 2) li.querySelector(".fk-vis").hidden = false;
  }

  function visSvar(i, li) {
    fikkHjelp = true;
    li.querySelectorAll("input[type=text]").forEach((f, j) => { f.value = tall(steg[i].felt[j][1], 4); });
    ferdigSteg(i, li, "<strong>Her er svaret.</strong> Les hintet og se om du forstår hvorfor.");
  }

  function ferdigSteg(i, li, tekst) {
    const tilbake = li.querySelector(".ovelse-tilbake");
    tilbake.className = "ovelse-tilbake riktig";
    tilbake.innerHTML = tekst;
    li.classList.add("ferdig");
    li.querySelectorAll("input, button").forEach((e) => { e.disabled = true; });
    if (i + 1 < steg.length) { visSteg(i + 1); return; }
    poeng.totalt++;
    if (!fikkHjelp) poeng.utenHjelp++;
    $("tl-ferdig").innerHTML = `<p><strong>Ferdig!</strong> Tangenten er ${tex(texLinje(o.a, o.b))}. Kontroll: Sett inn ${tex(`x = ${o.x0}`)} og se at du får ${tex(`y = ${o.y0}`)}.</p>`;
    $("tl-poeng").textContent = `Løst uten «Vis svaret»: ${poeng.utenHjelp} av ${poeng.totalt}`;
    annonser("Ferdig. " + $("tl-ferdig").textContent, 50);
    $("tl-ny").hidden = false;
    $("tl-ny").disabled = false;
    $("tl-ny").focus({ preventScroll: true });
  }

  const fraAdresse = new URLSearchParams(location.search).get("niva");
  if (["1", "2", "3", "4"].includes(fraAdresse)) nivaVelger.value = fraAdresse;
  nivaVelger.addEventListener("change", () => {
    const p = new URLSearchParams(location.search);
    p.set("niva", nivaVelger.value);
    history.replaceState(null, "", "?" + p.toString());
    ny(false);
  });
  $("tl-ny").addEventListener("click", () => ny());
  ny(false);
  window.mattelabTangentlikning = { lagOppgave, texLinje, gjeldende: () => o };
}
