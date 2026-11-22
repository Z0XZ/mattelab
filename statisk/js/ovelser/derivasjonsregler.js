// Øving: derivasjonsregler.
//
// Eleven ser f(x) og en mal for f′(x) med tomme bokser (A, B, C) og fyller inn tallene.
// Nivå 1: potens- og sumregelen. Nivå 2: kjerneregelen. Nivå 3: eksponential- og logaritmefunksjoner.
// Nivå 4: produktregelen. Nivå 5: brøkregelen. Nivå 6: blandet.
//
// Hver oppgave har f og en funksjon som lager f′ fra svarene. Testene sjekker at f′ med fasiten
// stemmer med en numerisk derivert av f, så malene og fasiten kan ikke komme i utakt.
// Typiske feil (glemt indre derivert, produkt av deriverte, fortegn i brøkregelen) gir egne tilbakemeldinger.

import { tex, lagTilfeldig, tolkSvar, erRiktig } from "../ovelse.js";
import { annonser, tall } from "../felles.js";
import { texPoly } from "../utforskere/polynom-matte.js";

const $ = (id) => document.getElementById(id);
const B = (n) => `\\boxed{\\,\\mathsf{${n}}\\,}`;

/** Ledd «+ q» eller «− q» i TeX, tomt for q = 0. */
const pm = (q) => (q === 0 ? "" : ` ${q < 0 ? "-" : "+"} ${Math.abs(q)}`);
/** px + q i TeX. */
const lin = (p, q) => `${p === 1 ? "" : p === -1 ? "-" : p}x${pm(q)}`;
/** Brøk i TeX for et tall med nevner 1 eller 2. */
const texTall = (x) => (Number.isInteger(x) ? String(x) : `${x < 0 ? "-" : ""}\\tfrac{${Math.abs(x * 2)}}{2}`);

const NAVN = { 1: "potens", 2: "kjerne", 3: "ekspln", 4: "produkt", 5: "brok" };

/** Ren funksjon: lag en oppgave på et nivå. r er en tilfeldighetsgenerator fra lagTilfeldig(). */
export function lagOppgave(niva, r) {
  const ikkeNull = (a, b) => { let t; do t = r.heltall(a, b); while (t === 0); return t; };
  const type = niva === 6 ? NAVN[r.heltall(1, 5)] : NAVN[niva];
  const variant = r.heltall(1, 3);
  const o = { niva, type, variant };

  if (type === "potens") {
    if (variant <= 2) {
      const k = [r.heltall(-9, 9), r.heltall(-6, 6), ikkeNull(-5, 5), ikkeNull(-3, 3)];
      o.ftex = texPoly(k);
      o.f = (x) => k[0] + k[1] * x + k[2] * x * x + k[3] * x ** 3;
      o.mal = `${B("A")}x^2 + ${B("B")}x + ${B("C")}`;
      o.svar = [3 * k[3], 2 * k[2], k[1]];
      o.df = ([A, Bv, C]) => (x) => A * x * x + Bv * x + C;
      o.feil = [{ svar: [k[3], k[2], k[1]], melding: `Husk å gange med eksponenten: ${tex("(x^n)' = n \\cdot x^{n-1}")}. For eksempel blir ${tex("x^3")} til ${tex("3x^2")}.` }];
      o.hint = `Deriver ledd for ledd med ${tex("(x^n)' = n x^{n-1}")}. Konstantleddet forsvinner.`;
    } else {
      // Potenser med negativ eller brøk-eksponent: a/x + b√x
      const a = ikkeNull(-6, 6), b = 2 * ikkeNull(-3, 3);
      o.ftex = `\\dfrac{${a}}{x} ${b < 0 ? "-" : "+"} ${Math.abs(b)}\\sqrt{x}`;
      o.f = (x) => a / x + b * Math.sqrt(x);
      o.mal = `\\dfrac{${B("A")}}{x^2} + \\dfrac{${B("B")}}{\\sqrt{x}}`;
      o.svar = [-a, b / 2];
      o.df = ([A, Bv]) => (x) => A / (x * x) + Bv / Math.sqrt(x);
      o.feil = [{ svar: [a, b / 2], melding: `Sjekk fortegnet: ${tex("\\frac{1}{x} = x^{-1}")}, så den deriverte er ${tex("-1 \\cdot x^{-2} = -\\frac{1}{x^2}")}.` }];
      o.hint = `Skriv om til potenser: ${tex("\\frac{1}{x} = x^{-1}")} og ${tex("\\sqrt{x} = x^{\\frac{1}{2}}")}. Bruk så ${tex("(x^n)' = n x^{n-1}")}.`;
      o.punkter = [0.5, 1, 2, 3.7];
    }
  } else if (type === "kjerne") {
    if (variant === 1) {
      const p = ikkeNull(-4, 4), q = r.heltall(-5, 5), n = r.heltall(2, 5);
      o.ftex = `(${lin(p, q)})^{${n}}`;
      o.f = (x) => (p * x + q) ** n;
      o.mal = `${B("A")}(${lin(p, q)})^{${n - 1}}`;
      o.svar = [n * p];
      o.df = ([A]) => (x) => A * (p * x + q) ** (n - 1);
      o.feil = [{ svar: [n], melding: `Du har glemt den indre deriverte. Kjernen er ${tex(`u = ${lin(p, q)}`)}, og ${tex(`u' = ${p}`)}. Gang med den.` }];
      o.hint = `Kjernen er ${tex(`u = ${lin(p, q)}`)}. Da er ${tex(`f'(x) = ${n}u^{${n - 1}} \\cdot u'`)}.`;
    } else if (variant === 2) {
      const q = ikkeNull(-5, 5), n = r.heltall(2, 4);
      o.ftex = `(x^2${pm(q)})^{${n}}`;
      o.f = (x) => (x * x + q) ** n;
      o.mal = `${B("A")}x(x^2${pm(q)})^{${n - 1}}`;
      o.svar = [2 * n];
      o.df = ([A]) => (x) => A * x * (x * x + q) ** (n - 1);
      o.feil = [{ svar: [n], melding: `Du har glemt den indre deriverte. Kjernen er ${tex(`u = x^2${pm(q)}`)}, og ${tex("u' = 2x")}.` }];
      o.hint = `Kjernen er ${tex(`u = x^2${pm(q)}`)}, med ${tex("u' = 2x")}. Da er ${tex(`f'(x) = ${n}u^{${n - 1}} \\cdot 2x`)}.`;
    } else {
      const p = ikkeNull(-6, 6), q = r.heltall(1, 9);
      o.ftex = `\\sqrt{${lin(p, q)}}`;
      o.f = (x) => Math.sqrt(p * x + q);
      o.mal = `\\dfrac{${B("A")}}{\\sqrt{${lin(p, q)}}}`;
      o.svar = [p / 2];
      o.df = ([A]) => (x) => A / Math.sqrt(p * x + q);
      o.feil = [{ svar: [0.5], melding: `Du har glemt den indre deriverte. Kjernen er ${tex(`u = ${lin(p, q)}`)}, og ${tex(`u' = ${p}`)}.` }];
      o.hint = `${tex("(\\sqrt{u})' = \\dfrac{1}{2\\sqrt{u}} \\cdot u'")}. Du kan skrive brøk som 3/2.`;
      o.punkter = [0, 0.05, -0.05];
    }
  } else if (type === "ekspln") {
    if (variant === 1) {
      const a = ikkeNull(-5, 5), k = ikkeNull(-4, 4);
      o.ftex = `${a === 1 ? "" : a === -1 ? "-" : a}e^{${k === 1 ? "" : k === -1 ? "-" : k}x}`;
      o.f = (x) => a * Math.exp(k * x);
      o.mal = `${B("A")}e^{${k === 1 ? "" : k === -1 ? "-" : k}x}`;
      o.svar = [a * k];
      o.df = ([A]) => (x) => A * Math.exp(k * x);
      o.feil = [{ svar: [a], melding: `Du har glemt den indre deriverte. Eksponenten ${tex(`u = ${k}x`)} har ${tex(`u' = ${k}`)}.` }];
      o.hint = `${tex("(e^{kx})' = k e^{kx}")}, etter kjerneregelen.`;
    } else if (variant === 2) {
      const a = ikkeNull(-6, 6);
      o.ftex = `${a === 1 ? "" : a === -1 ? "-" : a}\\ln x`;
      o.f = (x) => a * Math.log(x);
      o.mal = `\\dfrac{${B("A")}}{x}`;
      o.svar = [a];
      o.df = ([A]) => (x) => A / x;
      o.feil = [];
      o.hint = `${tex("(\\ln x)' = \\dfrac{1}{x}")}. Tallet foran blir stående.`;
      o.punkter = [0.5, 1, 2, 4];
    } else {
      const p = ikkeNull(-5, 5), q = r.heltall(1, 6);
      o.ftex = `\\ln(${lin(p, q)})`;
      o.f = (x) => Math.log(p * x + q);
      o.mal = `\\dfrac{${B("A")}}{${lin(p, q)}}`;
      o.svar = [p];
      o.df = ([A]) => (x) => A / (p * x + q);
      o.feil = [{ svar: [1], melding: `Du har glemt den indre deriverte. Kjernen er ${tex(`u = ${lin(p, q)}`)}, og ${tex(`u' = ${p}`)}.` }];
      o.hint = `${tex("(\\ln u)' = \\dfrac{u'}{u}")}.`;
      o.punkter = [0, 0.05, -0.05];
    }
  } else if (type === "produkt") {
    if (variant === 1) {
      const n = r.heltall(1, 3);
      o.ftex = `x${n === 1 ? "" : `^{${n}}`}e^x`;
      o.f = (x) => x ** n * Math.exp(x);
      o.mal = n === 1 ? `(${B("A")} + ${B("B")}x)e^x` : `(${B("A")}x^{${n - 1}} + ${B("B")}x^{${n}})e^x`;
      o.svar = [n, 1];
      o.df = ([A, Bv]) => (x) => (A * x ** (n - 1) + Bv * x ** n) * Math.exp(x);
      o.feil = [{ svar: [n, 0], melding: `Produktregelen er ${tex("(uv)' = u'v + uv'")}. Du har bare tatt med ${tex("u'v")}. Hva med ${tex("u \\cdot v'")}?` }];
      o.hint = `${tex(`u = x${n === 1 ? "" : `^{${n}}`}`)} og ${tex("v = e^x")}. Da er ${tex(`u' = ${n === 1 ? "1" : `${n}x${n === 2 ? "" : `^{${n - 1}}`}`}`)} og ${tex("v' = e^x")}.`;
    } else if (variant === 2) {
      const a = ikkeNull(-4, 4);
      o.ftex = `${a === 1 ? "" : a === -1 ? "-" : a}x\\ln x`;
      o.f = (x) => a * x * Math.log(x);
      o.mal = `${B("A")}\\ln x + ${B("B")}`;
      o.svar = [a, a];
      o.df = ([A, Bv]) => (x) => A * Math.log(x) + Bv;
      o.feil = [{ svar: [a, 0], melding: `Produktregelen har to ledd. Du mangler ${tex("u \\cdot v' = x \\cdot \\frac{1}{x}")}.` }];
      o.hint = `${tex(`u = ${a === 1 ? "" : a === -1 ? "-" : a}x`)} og ${tex("v = \\ln x")}. Bruk ${tex("(uv)' = u'v + uv'")}.`;
      o.punkter = [0.5, 1, 2, 4];
    } else {
      const a = ikkeNull(-3, 3), b = r.heltall(-4, 4), c = ikkeNull(-3, 3), d = r.heltall(-4, 4);
      o.ftex = `(${lin(a, b)})(${lin(c, d)})`;
      o.f = (x) => (a * x + b) * (c * x + d);
      o.mal = `${B("A")}x + ${B("B")}`;
      o.svar = [2 * a * c, a * d + b * c];
      o.df = ([A, Bv]) => (x) => A * x + Bv;
      o.feil = [{ svar: [0, a * c], melding: `Den deriverte av et produkt er ikke produktet av de deriverte. Bruk ${tex("(uv)' = u'v + uv'")}.` }];
      o.hint = `${tex(`u = ${lin(a, b)}`)} og ${tex(`v = ${lin(c, d)}`)}. Eller gang ut parentesene først.`;
    }
  } else {
    if (variant <= 2) {
      let a, b, c, d;
      do { a = ikkeNull(-3, 3); b = r.heltall(-5, 5); c = ikkeNull(-2, 2); d = r.heltall(-5, 5); } while (a * d - b * c === 0);
      o.ftex = `\\dfrac{${lin(a, b)}}{${lin(c, d)}}`;
      o.f = (x) => (a * x + b) / (c * x + d);
      o.mal = `\\dfrac{${B("A")}}{(${lin(c, d)})^2}`;
      o.svar = [a * d - b * c];
      o.df = ([A]) => (x) => A / (c * x + d) ** 2;
      o.feil = [{ svar: [b * c - a * d], melding: `Sjekk rekkefølgen i telleren: ${tex("\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^2}")}. Det er ${tex("u'v")} først.` }];
      o.hint = `${tex(`u = ${lin(a, b)}`)} og ${tex(`v = ${lin(c, d)}`)}. Regn ut ${tex("u'v - uv'")}, og se at x-leddene forsvinner.`;
      o.punkter = [-d / c + 0.5, -d / c + 1.5, -d / c - 1.3];
    } else {
      const q = r.heltall(1, 4);
      o.ftex = `\\dfrac{x}{x^2 + ${q}}`;
      o.f = (x) => x / (x * x + q);
      o.mal = `\\dfrac{${B("A")} + ${B("B")}x^2}{(x^2 + ${q})^2}`;
      o.svar = [q, -1];
      o.df = ([A, Bv]) => (x) => (A + Bv * x * x) / (x * x + q) ** 2;
      o.feil = [{ svar: [q, 1], melding: `Sjekk fortegnet: ${tex(`u'v - uv' = 1 \\cdot (x^2 + ${q}) - x \\cdot 2x`)}.` }, { svar: [-q, 1], melding: `Sjekk rekkefølgen i telleren: Det er ${tex("u'v - uv'")}, ikke ${tex("uv' - u'v")}.` }];
      o.hint = `${tex("u = x")} og ${tex(`v = x^2 + ${q}`)}. Regn ut ${tex("u'v - uv'")}.`;
    }
  }
  o.punkter ||= [-1.3, 0.4, 1.7];
  return o;
}

// ------------------------------------------------------------------ på siden
const rot = $("ovelse");
if (rot) {
  const r = lagTilfeldig();
  const nivaVelger = $("dr-niva");
  const poeng = { utenHjelp: 0, totalt: 0 };
  let o, feilHer, fikkHjelp;

  function ny(fokus = true) {
    o = lagOppgave(Number(nivaVelger.value), r);
    fikkHjelp = false;
    feilHer = 0;
    const felt = o.svar.map((_, j) => {
      const n = "ABC"[j];
      return `<label class="fk-felt"><span>${tex(`\\mathsf{${n}}`)} =</span><input type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-label="Boks ${n}"></label>`;
    }).join("");
    $("dr-oppgave").innerHTML = `<p>Deriver ${tex(`f(x) = ${o.ftex}`)}. Fyll inn tallene i boksene:</p><p class="dr-mal">${tex(`f'(x) = ${o.mal}`, true)}</p>`;
    $("dr-svar").innerHTML = `<div class="fk-svarrad">${felt}<button type="button" class="knapp liten fk-sjekk">Sjekk</button><button type="button" class="knapp lys liten fk-vis" hidden>Vis svaret</button></div><div class="ovelse-tilbake" id="dr-tilbake" aria-live="polite"></div>`;
    $("dr-ny").hidden = true;
    const sjekk = () => sjekkSvar();
    $("dr-svar").querySelector(".fk-sjekk").addEventListener("click", sjekk);
    $("dr-svar").querySelectorAll("input").forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter") sjekk(); }));
    $("dr-svar").querySelector(".fk-vis").addEventListener("click", visSvar);
    if (fokus) $("dr-svar").querySelector("input").focus();
  }

  function sjekkSvar() {
    const verdier = Array.from($("dr-svar").querySelectorAll("input")).map((f) => tolkSvar(f.value));
    const tilbake = $("dr-tilbake");
    const lik = (fasit) => fasit.every((v, j) => erRiktig(verdier[j], v, 1e-9));
    if (!verdier.some(Number.isNaN) && lik(o.svar)) { ferdig("<strong>✓ Riktig.</strong>"); return; }
    feilHer++;
    tilbake.className = "ovelse-tilbake feil";
    const kjent = o.feil.find((f) => lik(f.svar));
    if (verdier.some(Number.isNaN)) tilbake.innerHTML = "Skriv et tall i hver boks. Du kan skrive brøk som 3/2.";
    else if (kjent) tilbake.innerHTML = `<strong>✗ Nesten.</strong> ${kjent.melding}`;
    else tilbake.innerHTML = `<strong>✗ Ikke riktig ennå.</strong> ${o.hint}`;
    if (feilHer >= 2) $("dr-svar").querySelector(".fk-vis").hidden = false;
  }

  function visSvar() {
    fikkHjelp = true;
    $("dr-svar").querySelectorAll("input").forEach((f, j) => { f.value = tall(o.svar[j], 4); });
    ferdig("<strong>Her er svaret.</strong> Les hintet og se om du forstår hvorfor.");
  }

  function ferdig(tekst) {
    const tilbake = $("dr-tilbake");
    tilbake.className = "ovelse-tilbake riktig";
    const svar = o.mal.replace(/\\boxed\{\\,\\mathsf\{([ABC])\}\\,\}/g, (_, n) => `{${texTall(o.svar["ABC".indexOf(n)])}}`);
    tilbake.innerHTML = `${tekst} ${tex(`f'(x) = ${svar}`)}. ${o.hint}`;
    $("dr-svar").querySelectorAll("input, button").forEach((e) => { e.disabled = true; });
    poeng.totalt++;
    if (!fikkHjelp) poeng.utenHjelp++;
    $("dr-poeng").textContent = `Løst uten «Vis svaret»: ${poeng.utenHjelp} av ${poeng.totalt}`;
    annonser("Ferdig. " + tilbake.textContent, 50);
    $("dr-ny").hidden = false;
    $("dr-ny").focus({ preventScroll: true });
  }

  const fraAdresse = new URLSearchParams(location.search).get("niva");
  if (["1", "2", "3", "4", "5", "6"].includes(fraAdresse)) nivaVelger.value = fraAdresse;
  nivaVelger.addEventListener("change", () => {
    const p = new URLSearchParams(location.search);
    p.set("niva", nivaVelger.value);
    history.replaceState(null, "", "?" + p.toString());
    ny(false);
  });
  $("dr-ny").addEventListener("click", () => ny());
  ny(false);
  window.mattelabDerivasjonsregler = { lagOppgave, gjeldende: () => o };
}
