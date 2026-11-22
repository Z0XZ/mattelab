// Øving: Finn stigningstall og konstantledd ved regning.
//
// Nivå 1: to punkter, heltallig stigningstall. Nivå 2: to punkter, stigningstall som brøk eller desimaltall.
// Nivå 3: fra en verditabell der x ikke starter på 0 og ikke øker med 1. Nivå 4: fra en tekst, med en prediksjon til slutt.
//
// Oppgavene lages baklengs: Vi velger a og b først og regner ut punktene. Da er fasiten riktig per konstruksjon.

import { tex, lagTilfeldig, tolkSvar, erRiktig } from "../ovelse.js";
import { annonser, tall } from "../felles.js";

const $ = (id) => document.getElementById(id);

/** Tall i TeX: heltall, eller brøk med nevner 2, 3 eller 4. Ellers desimaltall med komma. */
export function texBrok(x) {
  for (const n of [1, 2, 3, 4]) {
    const t = Math.round(x * n);
    if (Math.abs(t / n - x) < 1e-9) return n === 1 ? String(t) : `${t < 0 ? "-" : ""}\\frac{${Math.abs(t)}}{${n}}`;
  }
  return tall(x, 4).replace(",", "{,}").replace("−", "-");
}

const SITUASJONER = [
  { navn: "basseng", a: [2, 3, 4, 5, 6, 8], b: [20, 40, 50, 60, 80, 100], xs: [2, 3, 4, 5, 6, 8, 10],
    tekst: (o) => `Et basseng fylles med vann. Etter ${o.x1} minutter er det ${o.y1} liter i bassenget. Etter ${o.x2} minutter er det ${o.y2} liter.`,
    x: "minutter", y: "liter", aBetyr: "liter vann som renner inn per minutt", bBetyr: "liter vann i bassenget før vi startet å måle", sporsmalX: [15, 20, 30] },
  { navn: "lys", a: [-0.5, -1, -1.5, -2, -2.5], b: [15, 20, 24, 25, 30], xs: [1, 2, 3, 4],
    tekst: (o) => `Et stearinlys brenner. Etter ${o.x1} ${o.x1 === 1 ? "time" : "timer"} er lyset ${tall(o.y1, 2)} cm høyt. Etter ${o.x2} timer er det ${tall(o.y2, 2)} cm høyt.`,
    x: "timer", y: "cm", aBetyr: "endringen i høyde per time (lyset blir kortere)", bBetyr: "høyden i cm da lyset ble tent", sporsmalX: [5, 6] },
  { navn: "abonnement", a: [10, 15, 20, 25, 30], b: [99, 149, 199, 249], xs: [2, 4, 5, 8, 10, 12],
    tekst: (o) => `Et mobilabonnement har en fast månedspris og en pris per GB. En måned med ${o.x1} GB koster ${o.y1} kr. En måned med ${o.x2} GB koster ${o.y2} kr.`,
    x: "GB", y: "kr", aBetyr: "prisen per GB", bBetyr: "den faste månedsprisen", sporsmalX: [15, 20] },
];

/** Ren funksjon: lag en oppgave på et nivå. r er en tilfeldighetsgenerator fra lagTilfeldig(). */
export function lagOppgave(niva, r) {
  const fortegn = () => (r.tall() < 0.5 ? -1 : 1);
  const o = { niva };
  if (niva === 1 || niva === 2) {
    if (niva === 1) {
      o.a = fortegn() * r.heltall(1, 5);
      o.x1 = r.heltall(-5, 3);
      o.x2 = o.x1 + r.heltall(1, 5);
    } else {
      const [t, n] = r.velg([[1, 2], [3, 2], [5, 2], [1, 4], [3, 4], [2, 3], [4, 3]]);
      o.a = fortegn() * t / n;
      o.x1 = n * r.heltall(-3, 1);
      o.x2 = o.x1 + n * r.heltall(1, 3);
    }
    o.b = r.heltall(-8, 8);
  } else if (niva === 3) {
    o.d = r.velg([2, 3, 5]);
    o.a = fortegn() * r.velg([1, 2, 3, 4, 0.5, 1.5]);
    if (!Number.isInteger(o.a * o.d)) o.d = 2;
    o.b = r.heltall(-10, 10);
    o.x1 = r.velg([-4, -2, 1, 2, 3, 4]);
    o.x2 = o.x1 + o.d;
    o.tabellX = [0, 1, 2, 3].map((i) => o.x1 + i * o.d);
  } else {
    const s = r.velg(SITUASJONER);
    o.situasjon = s;
    o.a = r.velg(s.a);
    o.b = r.velg(s.b);
    // Første punkt er aldri det største, så det alltid finnes et større andre punkt
    const i1 = Math.floor(r.tall() * (s.xs.length - 1));
    o.x1 = s.xs[i1];
    o.x2 = s.xs[i1 + 1 + Math.floor(r.tall() * (s.xs.length - 1 - i1))];
    o.X = r.velg(s.sporsmalX);
    o.fX = o.a * o.X + o.b;
  }
  const f = (x) => o.a * x + o.b;
  o.y1 = f(o.x1);
  o.y2 = f(o.x2);
  o.dx = o.x2 - o.x1;
  o.dy = o.y2 - o.y1;
  if (o.tabellX) o.tabellY = o.tabellX.map(f);
  // Svarene steg for steg, i samme rekkefølge som feltene (brukes også av testene)
  o.svar = [[o.dx, o.dy], [o.a], [o.b]];
  if (niva === 3) o.svar = [[o.dy], [o.a], [o.b]];
  if (niva === 4) o.svar.push([o.fX]);
  return o;
}

function texLinje(a, b) {
  const at = a === 1 ? "" : a === -1 ? "-" : texBrok(a);
  const bt = b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${texBrok(Math.abs(b))}`;
  return `f(x) = ${at}x${bt}`;
}

const P = (x) => texBrok(x).replace(/^(-.*)$/, "($1)");

// ------------------------------------------------------------------ på siden
const rot = $("ovelse");
if (rot) {
  const r = lagTilfeldig();
  const nivaVelger = $("sg-niva");
  const poeng = { utenHjelp: 0, totalt: 0 };
  let o, steg, feilHer, fikkHjelp;

  function oppgavetekst() {
    if (o.niva === 3) {
      const rad = (navn, l) => `<tr><th scope="row">${navn}</th>${l.map((v) => `<td>${tex(texBrok(v))}</td>`).join("")}</tr>`;
      return `<p>En lineær funksjon har denne verditabellen. Finn funksjonsuttrykket.</p>
        <div class="tabell-rull"><table class="tabell sg-tabell"><caption class="visuelt-skjult">Verditabell</caption>
        ${rad(tex("x"), o.tabellX)}${rad(tex("f(x)"), o.tabellY)}</table></div>`;
    }
    if (o.niva === 4) return `<p>${o.situasjon.tekst(o)} Lag en lineær modell ${tex("f(x) = ax + b")}, der ${tex("x")} er ${o.situasjon.x} og ${tex("f(x)")} er ${o.situasjon.y}.</p>`;
    return `<p>En rett linje går gjennom punktene ${tex(`(${texBrok(o.x1)}, ${texBrok(o.y1)})`)} og ${tex(`(${texBrok(o.x2)}, ${texBrok(o.y2)})`)}. Finn funksjonsuttrykket ${tex("f(x) = ax + b")}.</p>`;
  }

  function lagSteg() {
    const s = [];
    if (o.niva === 3) {
      s.push({
        tekst: `I tabellen øker ${tex("x")} med ${tex(String(o.d))} fra kolonne til kolonne. Hvor mye endres ${tex("f(x)")} hver gang?`,
        felt: [["Endring i f(x)"]],
        hint: `Regn ut ${tex(`${P(o.tabellY[1])} - ${P(o.tabellY[0])}`)}. Er tallet negativt, synker funksjonen.`,
      });
      s.push({
        tekst: `Stigningstallet er endringen i ${tex("f(x)")} delt på endringen i ${tex("x")}. Hva er ${tex("a")}?`,
        felt: [["a"]],
        hint: `${tex(`a = \\dfrac{\\Delta y}{\\Delta x} = \\dfrac{${texBrok(o.dy)}}{${o.d}}`)}`,
      });
    } else {
      s.push({
        tekst: o.niva === 4
          ? `Hvor mye endres ${tex("x")} og ${tex("f(x)")} fra den første til den andre opplysningen?`
          : `Regn ut ${tex("\\Delta x = x_2 - x_1")} og ${tex("\\Delta y = y_2 - y_1")}.`,
        felt: [["Δx"], ["Δy"]],
        hint: `${tex(`\\Delta x = ${texBrok(o.x2)} - ${P(o.x1)}`)} og ${tex(`\\Delta y = ${texBrok(o.y2)} - ${P(o.y1)}`)}. Pass på minustegnene.`,
      });
      s.push({
        tekst: `Hva er stigningstallet ${tex("a = \\dfrac{\\Delta y}{\\Delta x}")}?`,
        felt: [["a"]],
        hint: `Del ${tex(texBrok(o.dy))} på ${tex(texBrok(o.dx))}. Du kan skrive svaret som brøk, for eksempel 3/2.`,
      });
    }
    s.push({
      tekst: `Sett inn punktet ${tex(`(${texBrok(o.x1)}, ${texBrok(o.y1)})`)} i ${tex(`y = ${texBrok(o.a)}x + b`)}. Hva er konstantleddet ${tex("b")}?`,
      felt: [["b"]],
      hint: `${tex(`${texBrok(o.y1)} = ${texBrok(o.a)} \\cdot ${P(o.x1)} + b`)}. Regn ut produktet og flytt det over.`,
    });
    if (o.niva === 4) {
      s.push({
        tekst: `Bruk modellen. Hva er ${tex(`f(${o.X})`)}? (${o.situasjon.x === "minutter" ? `Altså antall liter etter ${o.X} minutter.` : o.situasjon.x === "timer" ? `Altså høyden etter ${o.X} timer.` : `Altså prisen for ${o.X} GB.`})`,
        felt: [[`f(${o.X})`]],
        hint: `${tex(`f(${o.X}) = ${texBrok(o.a)} \\cdot ${o.X} + ${texBrok(o.b)}`)}`,
      });
    }
    return s.map((st, i) => ({ ...st, felt: st.felt.map(([navn], j) => [navn, o.svar[i][j]]) }));
  }

  function ny(fokus = true) {
    o = lagOppgave(Number(nivaVelger.value), r);
    steg = lagSteg();
    fikkHjelp = false;
    $("sg-oppgave").innerHTML = oppgavetekst();
    $("sg-steg").innerHTML = "";
    $("sg-ny").hidden = true;
    $("sg-ferdig").innerHTML = "";
    visSteg(0, fokus);
  }

  function visSteg(i, fokus = true) {
    feilHer = 0;
    const s = steg[i];
    const li = document.createElement("li");
    li.className = "fk-steg";
    const felt = s.felt.map(([navn], j) => `<label class="fk-felt"><span>${navn.length <= 2 ? tex(navn === "Δx" ? "\\Delta x" : navn === "Δy" ? "\\Delta y" : navn) + " =" : navn}</span>`
      + `<input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-j="${j}" aria-label="${navn}"></label>`).join("");
    li.innerHTML = `<p class="fk-steg-tekst"><span class="steg-nr">Steg ${i + 1}</span> ${s.tekst}</p>`
      + `<div class="fk-svarrad">${felt}<button type="button" class="knapp liten fk-sjekk">Sjekk</button>`
      + `<button type="button" class="knapp lys liten fk-vis" hidden>Vis svaret</button></div>`
      + `<div class="ovelse-tilbake" aria-live="polite"></div>`;
    $("sg-steg").appendChild(li);
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
    if (verdier.some(Number.isNaN)) tilbake.innerHTML = "Skriv et tall i hvert felt. Du kan skrive brøk som 3/2 og desimaltall med komma.";
    else if (i === 0 && s.felt.length === 2 && erRiktig(verdier[0], -o.dx) && erRiktig(verdier[1], -o.dy)) tilbake.innerHTML = "<strong>✗ Nesten.</strong> Du har trukket fra i motsatt rekkefølge. Det gir samme stigningstall, men her skal du regne punkt 2 minus punkt 1.";
    else if (s.felt[0][0] === "a" && erRiktig(verdier[0], 1 / o.a)) tilbake.innerHTML = `<strong>✗ Ikke riktig ennå.</strong> Har du delt Δx på Δy? Det er ${tex("\\Delta y")} som skal stå i telleren.`;
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
    let svar = tex(texLinje(o.a, o.b));
    if (o.niva === 4) svar += `. Her er ${tex("a")} ${o.situasjon.aBetyr}, og ${tex("b")} er ${o.situasjon.bBetyr}.`;
    else svar += ". Kontroll: Sett inn det andre punktet og se at det stemmer.";
    $("sg-ferdig").innerHTML = `<p><strong>Ferdig!</strong> ${svar}</p>`;
    $("sg-poeng").textContent = `Løst uten «Vis svaret»: ${poeng.utenHjelp} av ${poeng.totalt}`;
    annonser("Ferdig. " + $("sg-ferdig").textContent, 50);
    $("sg-ny").hidden = false;
    $("sg-ny").disabled = false;
    $("sg-ny").focus({ preventScroll: true });
  }

  const fraAdresse = new URLSearchParams(location.search).get("niva");
  if (["1", "2", "3", "4"].includes(fraAdresse)) nivaVelger.value = fraAdresse;
  nivaVelger.addEventListener("change", () => {
    const p = new URLSearchParams(location.search);
    p.set("niva", nivaVelger.value);
    history.replaceState(null, "", "?" + p.toString());
    ny(false);
  });
  $("sg-ny").addEventListener("click", () => ny());
  ny(false);
  window.mattelabStigningstall = { lagOppgave, gjeldende: () => o };
}
