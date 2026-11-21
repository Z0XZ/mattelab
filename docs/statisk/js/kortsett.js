// mattelab.no – kortsett på skjermen: koble (grupper), sorter og ordne.
//
// Kortene er laget av byggeskriptet (verktoy/kortsett.py). Uten JavaScript står de som en liste.
// Her blir hvert kort en knapp. Alt gjøres med klikk eller trykk, ikke dra-og-slipp,
// så det virker likt med mus, berøring, tastatur og skjermleser.
//
//   grupper  Velg n kort. Når n er valgt, blir de en gruppe. Trykk på et kort i en gruppe for å løse den opp.
//   sorter   Velg et kort, og trykk på boksen det skal i.
//   ordne    Trykk på kortene i riktig rekkefølge. Trykk på et kort i rekka for å ta det ut igjen.
//
// Svaret står i data-svar på hvert kort: gruppenøkkel, lovlige bokser eller plassen i rekka.

import { annonser } from "./felles.js";

const $ = (id) => document.getElementById(id);
const rot = $("kortsett");

if (rot) {
  const type = rot.dataset.type;
  const kode = rot.dataset.kode;
  const n = Number(rot.dataset.storrelse || 0);
  const bunke = $("kort-bunke");
  const status = $("kort-status");

  // Gjør kortene om til knapper
  for (const div of rot.querySelectorAll("div.kort")) {
    const k = document.createElement("button");
    k.type = "button";
    k.className = "kort";
    Object.assign(k.dataset, div.dataset);
    k.setAttribute("aria-pressed", "false");
    while (div.firstChild) k.appendChild(div.firstChild);
    div.replaceWith(k);
  }
  const alleKort = Array.from(rot.querySelectorAll("button.kort"));
  const navn = (k) => `${kode}-${k.dataset.nr}`;
  const li = (k) => k.closest("li");
  const iBunken = (k) => bunke.contains(k);

  let valgt = []; // valgte kort (grupper: flere, ellers ett)

  function velg(k, pa) {
    k.setAttribute("aria-pressed", String(pa));
    valgt = pa ? [...valgt, k] : valgt.filter((x) => x !== k);
  }
  function fjernValg() {
    for (const k of valgt) k.setAttribute("aria-pressed", "false");
    valgt = [];
  }

  /** Fjern alle merker fra forrige sjekk. */
  function nullstillSjekk() {
    status.textContent = "";
    rot.querySelectorAll(".riktig, .feil").forEach((e) => e.classList.remove("riktig", "feil"));
    rot.querySelectorAll(".kort-merke, .gruppe-merke").forEach((e) => { e.textContent = ""; });
    rot.querySelectorAll(".kort-kommentar").forEach((e) => { e.hidden = true; });
  }

  function merk(el, ok, tekst) {
    el.classList.add(ok ? "riktig" : "feil");
    let m = el.querySelector(":scope > .kort-merke, :scope .gruppe-merke");
    if (!m) {
      m = document.createElement("span");
      m.className = "kort-merke";
      el.appendChild(m);
    }
    m.textContent = tekst ?? (ok ? "✓ Riktig" : "✗ Feil");
  }

  function forsteIBunken() {
    return bunke.querySelector("button.kort");
  }

  // ---------------------------------------------------------- grupper
  const grupper = $("kort-grupper");
  let gruppeTeller = 0;

  function lagGruppe(kort) {
    const g = document.createElement("div");
    g.className = "kort-gruppe";
    g.setAttribute("role", "group");
    g.setAttribute("aria-label", `Gruppe ${++gruppeTeller}`);
    const ul = document.createElement("ul");
    ul.className = "kort-gruppe-liste";
    for (const k of kort) { k.setAttribute("aria-pressed", "false"); ul.appendChild(li(k)); }
    const fot = document.createElement("div");
    fot.className = "gruppe-fot";
    fot.innerHTML = '<span class="gruppe-merke"></span><button type="button" class="knapp lys liten">Løs opp</button>';
    fot.querySelector("button").addEventListener("click", () => losOpp(g, true));
    g.append(ul, fot);
    grupper.appendChild(g);
    valgt = [];
    annonser(`Gruppe laget: ${kort.map(navn).join(", ")}. ${bunke.children.length} kort igjen.`, 50);
    forsteIBunken()?.focus();
  }

  function losOpp(g, meld) {
    const kort = Array.from(g.querySelectorAll("button.kort"));
    for (const k of kort) bunke.appendChild(li(k));
    g.remove();
    if (meld) annonser(`Gruppen er løst opp. Kortene ${kort.map(navn).join(", ")} er tilbake i bunken.`, 50);
    if (meld) kort[0]?.focus();
  }

  // ---------------------------------------------------------- sorter
  const kategorier = $("kort-kategorier");
  let bunkeKnapp = null;
  if (type === "sorter") {
    bunkeKnapp = document.createElement("button");
    bunkeKnapp.type = "button";
    bunkeKnapp.className = "kategori-knapp bunke-knapp";
    bunkeKnapp.textContent = "Legg tilbake i bunken";
    bunke.before(bunkeKnapp);
    bunkeKnapp.addEventListener("click", () => flyttValgt(bunke, "bunken"));
    kategorier.addEventListener("click", (e) => {
      const knapp = e.target.closest(".kategori-knapp");
      if (!knapp) return;
      const boks = knapp.closest(".kort-kategori");
      flyttValgt(boks.querySelector(".kort-plassert"), knapp.textContent);
    });
  }

  function flyttValgt(mal, malNavn) {
    if (!valgt.length) { annonser("Velg et kort først.", 50); status.textContent = "Velg et kort først."; return; }
    const k = valgt[0];
    nullstillSjekk();
    mal.appendChild(li(k));
    fjernValg();
    annonser(`${navn(k)} er lagt i ${malNavn}.`, 50);
    (forsteIBunken() || k).focus();
  }

  // ---------------------------------------------------------- ordne
  const rekke = $("kort-rekke");

  // ---------------------------------------------------------- klikk på kort
  rot.addEventListener("click", (e) => {
    const k = e.target.closest("button.kort");
    if (!k) return;
    nullstillSjekk();
    if (type === "grupper") {
      const g = k.closest(".kort-gruppe");
      if (g) { losOpp(g, true); return; }
      velg(k, k.getAttribute("aria-pressed") !== "true");
      if (valgt.length === n) lagGruppe(valgt);
      else annonser(`${navn(k)} ${k.getAttribute("aria-pressed") === "true" ? "valgt" : "ikke valgt"}. ${valgt.length} av ${n} valgt.`, 50);
    } else if (type === "sorter") {
      const var_valgt = k.getAttribute("aria-pressed") === "true";
      fjernValg();
      if (!var_valgt) {
        velg(k, true);
        annonser(`${navn(k)} valgt. Velg en boks.`, 50);
      }
    } else {
      if (iBunken(k)) {
        rekke.appendChild(li(k));
        annonser(`${navn(k)} lagt på plass ${rekke.children.length}.`, 50);
        (forsteIBunken() || k).focus();
      } else {
        bunke.appendChild(li(k));
        annonser(`${navn(k)} er tatt ut av rekka.`, 50);
        k.focus();
      }
    }
  });

  // ---------------------------------------------------------- sjekk, bland, start på nytt
  $("kort-sjekk").addEventListener("click", () => {
    nullstillSjekk();
    const igjen = bunke.querySelectorAll("button.kort").length;
    const rest = igjen ? ` ${igjen} kort er ikke plassert ennå.` : "";
    let tekst;
    if (type === "grupper") {
      const gr = Array.from(grupper.querySelectorAll(".kort-gruppe"));
      let r = 0;
      for (const g of gr) {
        const svar = new Set(Array.from(g.querySelectorAll("button.kort")).map((k) => k.dataset.svar));
        const ok = svar.size === 1;
        if (ok) r++;
        g.classList.add(ok ? "riktig" : "feil");
        g.querySelector(".gruppe-merke").textContent = ok ? "✓ Hører sammen" : "✗ Hører ikke sammen";
      }
      tekst = gr.length ? `${r} av ${gr.length} grupper er riktige.${rest}` : "Du har ikke laget noen grupper ennå.";
      if (gr.length && r === gr.length && !igjen) tekst = "Alle gruppene er riktige!";
    } else if (type === "sorter") {
      const plassert = Array.from(kategorier.querySelectorAll("button.kort"));
      let r = 0;
      for (const k of plassert) {
        const boks = k.closest(".kort-kategori").dataset.kategori;
        const ok = k.dataset.svar.split(" ").includes(boks);
        if (ok) r++;
        merk(k, ok);
        const kom = k.querySelector(".kort-kommentar");
        if (kom) kom.hidden = false;
      }
      tekst = plassert.length ? `${r} av ${plassert.length} sorterte kort står i en boks som passer.${rest}` : "Du har ikke sortert noen kort ennå.";
      if (plassert.length && r === plassert.length && !igjen) tekst = "Alle kortene står i en boks som passer!";
    } else {
      const lagt = Array.from(rekke.querySelectorAll("button.kort"));
      let r = 0;
      lagt.forEach((k, i) => {
        const ok = Number(k.dataset.svar) === i + 1;
        if (ok) r++;
        merk(k, ok, ok ? "✓ Riktig plass" : "✗ Feil plass");
      });
      tekst = lagt.length ? `${r} av ${lagt.length} kort står på riktig plass.${rest}` : "Du har ikke lagt noen kort i rekka ennå.";
      if (lagt.length && r === lagt.length && !igjen) tekst = "Hele rekka er riktig!";
    }
    status.textContent = tekst;
  });

  $("kort-bland").addEventListener("click", () => {
    nullstillSjekk();
    const l = Array.from(bunke.children);
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    bunke.append(...l);
    annonser("Kortene i bunken er blandet.", 50);
  });

  $("kort-nullstill").addEventListener("click", () => {
    nullstillSjekk();
    fjernValg();
    if (grupper) grupper.querySelectorAll(".kort-gruppe").forEach((g) => losOpp(g, false));
    gruppeTeller = 0;
    const l = alleKort.map(li).sort((a, b) => a.querySelector(".kort").dataset.nr.localeCompare(b.querySelector(".kort").dataset.nr));
    bunke.append(...l);
    annonser("Alle kortene er tilbake i bunken.", 50);
  });

  // Til testene
  window.mattelabKortsett = { type, n, kode };
}
