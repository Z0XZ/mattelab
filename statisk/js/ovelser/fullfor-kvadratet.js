// Øving: Fullfør kvadratet, trinn for trinn.
//
// Eleven skriver x² + bx + c som (x + p)² + q, ett steg om gangen, og får tilbakemelding på hvert steg.
// Nivå 1: b er et partall. Nivå 2: b er et oddetall (brøker). Nivå 3: løs likningen.
// Nivå 4: a er ikke 1, så a må settes utenfor først.
//
// Oppgavene lages baklengs fra svaret: Vi velger p og q (og a), og regner ut b og c.
// Da er fasiten riktig per konstruksjon, og testene sjekker identiteten med tilfeldige tall.

import { tex, lagTilfeldig, tolkSvar, erRiktig, texBrok } from "../ovelse.js";
import { annonser, tall } from "../felles.js";

const $ = (id) => document.getElementById(id);

/** Ren funksjon: lag en oppgave på et nivå. r er en tilfeldighetsgenerator fra lagTilfeldig(). */
export function lagOppgave(niva, r) {
  const fortegn = () => (r.tall() < 0.5 ? -1 : 1);
  let a = 1, p, q, c;
  if (niva === 1) {
    p = fortegn() * r.heltall(1, 6);
    q = r.heltall(-20, 20);
  } else if (niva === 2) {
    p = fortegn() * r.velg([0.5, 1.5, 2.5, 3.5]);
    c = r.heltall(-10, 10);
    q = c - p * p;
  } else if (niva === 3) {
    p = fortegn() * r.heltall(1, 5);
    const type = r.tall();
    if (type < 0.5) q = -(r.heltall(1, 5) ** 2);                       // pene løsninger
    else if (type < 0.75) q = -r.velg([2, 3, 5, 6, 7, 8, 10, 11, 12, 13]); // løsninger med rot
    else q = r.heltall(1, 9);                                           // ingen løsning
  } else {
    a = r.velg([2, 3]);
    p = fortegn() * r.heltall(1, 4);
    q = r.heltall(-15, 15);
  }
  const b = 2 * a * p;
  c = a * p * p + q;
  const o = { niva, a, b, c, p, q, h: p, h2: p * p };
  if (niva === 3) {
    o.ingenLosning = q > 0;
    o.losninger = q > 0 ? [] : [-p - Math.sqrt(-q), -p + Math.sqrt(-q)];
  }
  return o;
}

/** ax² + bx + c i TeX. */
function texAndregrad(a, b, c) {
  const ledd = (k, v, forst) => {
    if (k === 0) return "";
    const t = Math.abs(k) === 1 && v ? "" : texBrok(Math.abs(k));
    return (forst ? (k < 0 ? "-" : "") : k < 0 ? " - " : " + ") + t + v;
  };
  return ledd(a, "x^2", true) + ledd(b, "x", false) + ledd(c, "", false);
}

function texKvadrat(a, p, q) {
  const indre = `(x ${p < 0 ? "-" : "+"} ${texBrok(Math.abs(p))})^2`;
  const qt = q === 0 ? "" : ` ${q < 0 ? "-" : "+"} ${texBrok(Math.abs(q))}`;
  return (a === 1 ? "" : `${a}`) + indre + qt;
}

// ------------------------------------------------------------------ på siden
const rot = $("ovelse");
if (rot) {
  const r = lagTilfeldig();
  const nivaVelger = $("fk-niva");
  const poeng = { utenHjelp: 0, totalt: 0 };
  let o, steg, feilHer, fikkHjelp;

  /** Stegene for gjeldende oppgave. Hvert steg har felt, fasit og hint. */
  function lagSteg() {
    const s = [];
    if (o.a !== 1) {
      s.push({
        tekst: `Sett ${tex(String(o.a))} utenfor fra de to første leddene: ${tex(`${o.a}(x^2 + \\square\\, x) ${o.c < 0 ? "-" : "+"} ${texBrok(Math.abs(o.c))}`)}. Hva står i ruta?`,
        felt: [["Tallet foran x inne i parentesen", 2 * o.p]],
        hint: `Del tallet foran x på ${o.a}: ${tex(`${o.b} : ${o.a}`)}.`,
      });
    }
    const bx = 2 * o.p; // tallet foran x når a er satt utenfor
    s.push({
      tekst: `Hva er halvparten av tallet foran ${tex("x")}${o.a !== 1 ? " inne i parentesen" : ""}, altså halvparten av ${tex(texBrok(bx))}?`,
      felt: [["Halvparten", o.h]],
      hint: "Del på 2, og behold fortegnet.",
    });
    s.push({
      tekst: `Hva er kvadratet av halvparten, ${tex(`\\left(${texBrok(o.h)}\\right)^2`)}?`,
      felt: [["Kvadratet av halvparten", o.h2]],
      hint: "Gang tallet med seg selv. Et kvadrat er aldri negativt.",
    });
    s.push({
      tekst: `Skriv uttrykket på formen ${tex((o.a !== 1 ? `${o.a}` : "") + "(x + p)^2 + q")}. Tallene kan være negative.`,
      felt: [["p", o.p], ["q", o.q]],
      hint: o.a === 1
        ? `${tex("p")} er halvparten fra steg 1. Når du legger til ${tex(texBrok(o.h2))}, må du trekke det fra igjen: ${tex(`q = ${texBrok(o.c)} - ${texBrok(o.h2)}`)}.`
        : `${tex("p")} er halvparten. Inne i parentesen la du til ${tex(texBrok(o.h2))}, som er ${tex(`${o.a} \\cdot ${texBrok(o.h2)}`)} utenfor. Derfor er ${tex(`q = ${texBrok(o.c)} - ${o.a} \\cdot ${texBrok(o.h2)}`)}.`,
      rad: true,
    });
    if (o.niva === 3) {
      s.push({
        tekst: `Løs likningen ${tex(texKvadrat(1, o.p, o.q) + " = 0")}. Skriv løsningene (rund av til to desimaler om nødvendig), eller kryss av hvis likningen ikke har løsning.`,
        felt: [["Første løsning", null], ["Andre løsning", null]],
        losning: true,
        hint: o.ingenLosning
          ? `Flytt over: ${tex(`(x ${o.p < 0 ? "-" : "+"} ${Math.abs(o.p)})^2 = ${-o.q}`)}. Kan et kvadrat være negativt?`
          : `Flytt over: ${tex(`(x ${o.p < 0 ? "-" : "+"} ${Math.abs(o.p)})^2 = ${-o.q}`)}. Ta roten, og husk både pluss og minus.`,
      });
    }
    return s;
  }

  function ny(fokus = true) {
    o = lagOppgave(Number(nivaVelger.value), r);
    steg = lagSteg();
    fikkHjelp = false;
    $("fk-oppgave").innerHTML = (o.niva === 3 ? "Løs likningen " : "Fullfør kvadratet: ") + tex(texAndregrad(o.a, o.b, o.c) + (o.niva === 3 ? " = 0" : ""), true);
    $("fk-steg").innerHTML = "";
    $("fk-ny").hidden = true;
    $("fk-ferdig").innerHTML = "";
    visSteg(0, fokus);
  }

  function visSteg(i, fokus = true) {
    feilHer = 0;
    const s = steg[i];
    const li = document.createElement("li");
    li.className = "fk-steg";
    const felt = s.felt.map(([navn], j) => `<label class="fk-felt"><span>${navn === "p" || navn === "q" ? tex(navn) + " =" : navn}</span>`
      + `<input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-j="${j}" aria-label="${navn}"></label>`).join("");
    const ingen = s.losning ? '<label class="avkrysning"><input type="checkbox" class="fk-ingen"> Likningen har ingen løsning</label>' : "";
    li.innerHTML = `<p class="fk-steg-tekst"><span class="steg-nr">Steg ${i + 1}</span> ${s.tekst}</p>`
      + `<div class="fk-svarrad">${felt}${ingen}<button type="button" class="knapp liten fk-sjekk">Sjekk</button>`
      + `<button type="button" class="knapp lys liten fk-vis" hidden>Vis svaret</button></div>`
      + `<div class="ovelse-tilbake" aria-live="polite"></div>`;
    $("fk-steg").appendChild(li);
    const sjekk = () => sjekkSteg(i, li);
    li.querySelector(".fk-sjekk").addEventListener("click", sjekk);
    li.querySelectorAll("input[type=text]").forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter") sjekk(); }));
    li.querySelector(".fk-vis").addEventListener("click", () => visSvar(i, li));
    const ingenBoks = li.querySelector(".fk-ingen");
    if (ingenBoks) ingenBoks.addEventListener("change", () => li.querySelectorAll("input[type=text]").forEach((f) => { f.disabled = ingenBoks.checked; }));
    if (fokus) li.querySelector("input").focus({ preventScroll: false });
  }

  function vurder(i, li) {
    const s = steg[i];
    const verdier = Array.from(li.querySelectorAll("input[type=text]")).map((f) => tolkSvar(f.value));
    if (s.losning) {
      const ingen = li.querySelector(".fk-ingen").checked;
      if (o.ingenLosning) return { ok: ingen, tom: false };
      if (ingen) return { ok: false, tom: false };
      if (verdier.some(Number.isNaN)) return { ok: false, tom: true };
      const [x1, x2] = o.losninger;
      const tol = 0.006;
      const ok = (erRiktig(verdier[0], x1, tol) && erRiktig(verdier[1], x2, tol)) || (erRiktig(verdier[0], x2, tol) && erRiktig(verdier[1], x1, tol));
      return { ok, tom: false };
    }
    if (verdier.some(Number.isNaN)) return { ok: false, tom: true };
    return { ok: s.felt.every(([, fasit], j) => erRiktig(verdier[j], fasit, 1e-9)), tom: false };
  }

  function sjekkSteg(i, li) {
    const { ok, tom } = vurder(i, li);
    const tilbake = li.querySelector(".ovelse-tilbake");
    if (ok) {
      ferdigSteg(i, li, "<strong>✓ Riktig.</strong>");
      return;
    }
    feilHer++;
    tilbake.className = "ovelse-tilbake feil";
    tilbake.innerHTML = tom
      ? "Skriv et tall i hvert felt. Du kan skrive brøk som 5/2 og desimaltall med komma."
      : `<strong>✗ Ikke riktig ennå.</strong> ${steg[i].hint}`;
    if (feilHer >= 2) li.querySelector(".fk-vis").hidden = false;
  }

  function visSvar(i, li) {
    fikkHjelp = true;
    const s = steg[i];
    if (s.losning) {
      if (o.ingenLosning) li.querySelector(".fk-ingen").checked = true;
      else li.querySelectorAll("input[type=text]").forEach((f, j) => { f.value = tall(o.losninger[j], 2); });
    } else {
      li.querySelectorAll("input[type=text]").forEach((f, j) => { f.value = tall(s.felt[j][1], 4); });
    }
    ferdigSteg(i, li, "<strong>Her er svaret.</strong> Les hintet over og se om du forstår hvorfor.");
  }

  function ferdigSteg(i, li, tekst) {
    const tilbake = li.querySelector(".ovelse-tilbake");
    tilbake.className = "ovelse-tilbake riktig";
    tilbake.innerHTML = tekst;
    li.classList.add("ferdig");
    li.querySelectorAll("input, button").forEach((e) => { e.disabled = true; });
    if (i + 1 < steg.length) {
      visSteg(i + 1);
      return;
    }
    poeng.totalt++;
    if (!fikkHjelp) poeng.utenHjelp++;
    let svar = `${tex(texAndregrad(o.a, o.b, o.c) + " = " + texKvadrat(o.a, o.p, o.q))}`;
    if (o.niva === 3) {
      svar = o.ingenLosning
        ? `${tex(texKvadrat(1, o.p, o.q) + " = 0")} har ingen løsning, fordi et kvadrat ikke kan være negativt.`
        : (Number.isInteger(Math.sqrt(-o.q))
          ? `${tex(`x = ${texBrok(o.losninger[0])}`)} eller ${tex(`x = ${texBrok(o.losninger[1])}`)}.`
          : `${tex(`x = ${texBrok(-o.p)} \\pm \\sqrt{${-o.q}}`)}, altså ${tex(`x \\approx ${tall(o.losninger[0], 2).replace(",", "{,}").replace("−", "-")}`)} eller ${tex(`x \\approx ${tall(o.losninger[1], 2).replace(",", "{,}").replace("−", "-")}`)}.`);
    }
    $("fk-ferdig").innerHTML = `<p><strong>Ferdig!</strong> ${svar}</p>`;
    $("fk-poeng").textContent = `Løst uten «Vis svaret»: ${poeng.utenHjelp} av ${poeng.totalt}`;
    annonser("Ferdig. " + $("fk-ferdig").textContent, 50);
    $("fk-ny").hidden = false;
    $("fk-ny").disabled = false;
    $("fk-ny").focus({ preventScroll: true });
  }

  const fraAdresse = new URLSearchParams(location.search).get("niva");
  if (["1", "2", "3", "4"].includes(fraAdresse)) nivaVelger.value = fraAdresse;
  nivaVelger.addEventListener("change", () => {
    const p = new URLSearchParams(location.search);
    p.set("niva", nivaVelger.value);
    history.replaceState(null, "", "?" + p.toString());
    ny(false);
  });
  $("fk-ny").addEventListener("click", () => ny());
  ny(false);
  window.mattelabFullfor = { lagOppgave, gjeldende: () => o };
}
