// mattelab.no – kortbordet: kortsett på skjermen.
//
// Kortene og brettet lages av byggeskriptet (verktoy/kortsett.py). Uten JavaScript står kortene som en liste.
//
// Tre måter å flytte et kort på, som alle gjør det samme:
//   1. Dra og slipp med mus, finger eller penn (Pointer Events). Kortet følger pekeren og glir på plass.
//   2. Trykk på et kort, og trykk så på en ledig plass, en boks eller bunken.
//   3. Tastatur: Tab til et kort, Enter for å velge, Tab til en plass, Enter for å legge det. Esc avbryter.
// Slipper du et kort på en plass der det ligger et annet kort, bytter de to plass.
//
// Brettet:
//   grupper  én rad per gruppe med like mange plasser som kort i gruppa
//   sorter   én boks per kategori
//   ordne    én rad med nummererte plasser
// Svaret står i data-svar på hvert kort: gruppenøkkel, lovlige bokser eller plassen i rekka.

import { annonser } from "./felles.js";

const $ = (id) => document.getElementById(id);
const rot = $("kortsett");

if (rot) {
  const type = rot.dataset.type;
  const kode = rot.dataset.kode;
  const n = Number(rot.dataset.storrelse || 0);
  const bord = $("kortbord");
  const bunke = $("kort-bunke");
  const brett = $("kort-brett");
  const status = $("kort-status");
  const roligBevegelse = matchMedia("(prefers-reduced-motion: reduce)");

  // ---------------------------------------------------------- kortene blir knapper
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

  // Knapp i bunken for å legge et valgt kort tilbake
  const tilBunken = document.createElement("button");
  tilBunken.type = "button";
  tilBunken.className = "knapp lys liten til-bunken";
  tilBunken.textContent = "Legg valgt kort i bunken";
  tilBunken.hidden = true;
  $("bunke-tittel").after(tilBunken);

  // ---------------------------------------------------------- steder og flytting
  /** Beholderen kortet ligger i: en plass, en boks eller bunken. */
  const stedFor = (k) => k.parentElement;
  const erPlass = (el) => el.classList.contains("kort-plass");
  const stedNavn = (el) => {
    if (el === bunke) return "bunken";
    if (erPlass(el)) return el.querySelector(".plass-knapp").getAttribute("aria-label").replace("Tom plass: ", "");
    return el.closest(".kort-kategori").querySelector(".kategori-knapp").textContent;
  };

  function oppdaterPlasser() {
    for (const p of brett.querySelectorAll(".kort-plass")) p.querySelector(".plass-knapp").hidden = !!p.querySelector("button.kort");
    const igjen = bunke.querySelectorAll("button.kort").length;
    $("kort-igjen").textContent = igjen ? `(${igjen} igjen)` : "(tom)";
    $("kort-fremdrift").textContent = `${alleKort.length - igjen} av ${alleKort.length} kort plassert`;
  }

  /** Animer kort fra der de var (FLIP). før: Map(kort → DOMRect). */
  function animer(før) {
    if (roligBevegelse.matches) return;
    for (const [k, r] of før) {
      const ny = k.getBoundingClientRect();
      const dx = r.left - ny.left, dy = r.top - ny.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.3,1)" });
    }
  }

  /**
   * Flytt kortet til en plass, en boks eller bunken. Ligger det et annet kort på plassen,
   * bytter de to plass. fraRekt: der animasjonen skal starte (for eksempel der kortet ble sluppet).
   */
  function flytt(k, mal, fraRekt = null) {
    const fra = stedFor(k);
    if (mal === fra) { oppdaterPlasser(); return; }
    const før = new Map([[k, fraRekt || k.getBoundingClientRect()]]);
    const annen = erPlass(mal) ? mal.querySelector("button.kort") : null;
    if (annen) før.set(annen, annen.getBoundingClientRect());
    nullstillSjekk();
    if (annen) fra.appendChild(annen);
    mal.appendChild(k);
    fjernValg();
    oppdaterPlasser();
    animer(før);
    annonser(`${navn(k)} er lagt i ${stedNavn(mal)}.${annen ? ` ${navn(annen)} byttet plass og ligger nå i ${stedNavn(fra)}.` : ""}`, 50);
  }

  /** Første ledige plass i en rad, eller null. */
  const ledigIRad = (rad) => Array.from(rad.querySelectorAll(".kort-plass")).find((p) => !p.querySelector("button.kort")) || null;

  // ---------------------------------------------------------- valg (trykk og tastatur)
  let valgt = null;
  function velg(k) {
    fjernValg();
    valgt = k;
    k.setAttribute("aria-pressed", "true");
    bord.classList.add("har-valg");
    tilBunken.hidden = stedFor(k) === bunke;
    annonser(`${navn(k)} er valgt. Velg en plass${type === "sorter" ? " eller en boks" : ""}.`, 50);
  }
  function fjernValg() {
    if (valgt) valgt.setAttribute("aria-pressed", "false");
    valgt = null;
    bord.classList.remove("har-valg");
    tilBunken.hidden = true;
  }

  let ignorerKlikk = false; // klikket som kommer etter at et kort er sluppet, skal ikke telle
  rot.addEventListener("click", (e) => {
    if (ignorerKlikk) { ignorerKlikk = false; e.preventDefault(); e.stopPropagation(); return; }
    const k = e.target.closest("button.kort");
    if (k) {
      if (valgt === k) { fjernValg(); annonser(`${navn(k)} er ikke valgt lenger.`, 50); return; }
      // Et valgt kort trykkes på et kort som ligger på brettet: de bytter plass
      if (valgt && stedFor(k) !== bunke) { flytt(valgt, stedFor(k)); return; }
      velg(k);
      return;
    }
    const plass = e.target.closest(".plass-knapp");
    const boks = e.target.closest(".kategori-knapp");
    if (plass || boks) {
      if (!valgt) { status.textContent = "Velg et kort først."; annonser("Velg et kort først.", 50); return; }
      const k_ = valgt;
      flytt(k_, plass ? plass.closest(".kort-plass") : boks.closest(".kort-kategori").querySelector(".kort-plassert"));
      // Videre med tastaturet: neste kort i bunken
      (bunke.querySelector("button.kort") || k_).focus({ preventScroll: true });
    }
  });
  tilBunken.addEventListener("click", () => { if (valgt) { const k = valgt; flytt(k, bunke); k.focus({ preventScroll: true }); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && valgt) { fjernValg(); annonser("Valget er avbrutt.", 50); } });

  // ---------------------------------------------------------- dra og slipp
  let start = null;   // { k, x, y, id }
  let dra = null;     // { k, spokelse, dx, dy, mal }

  rot.addEventListener("pointerdown", (e) => {
    const k = e.target.closest("button.kort");
    if (!k || e.button > 0) return;
    start = { k, x: e.clientX, y: e.clientY, id: e.pointerId };
  });

  function startDra(e) {
    const k = start.k;
    const r = k.getBoundingClientRect();
    const sp = k.cloneNode(true);
    sp.className = "kort kort-spokelse";
    sp.removeAttribute("aria-pressed");
    sp.setAttribute("aria-hidden", "true");
    Object.assign(sp.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left}px`, top: `${r.top}px` });
    document.body.appendChild(sp);
    k.classList.add("drar");
    bord.classList.add("drar-nå");
    dra = { k, spokelse: sp, dx: start.x - r.left, dy: start.y - r.top, mal: null };
    try { k.setPointerCapture(e.pointerId); } catch (_) { /* ikke støttet */ }
    fjernValg();
  }

  /** Finn målet under pekeren: en plass, en boks eller bunken. */
  function malUnder(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const plass = el.closest(".kort-plass");
    if (plass && brett.contains(plass)) return plass;
    const boks = el.closest(".kort-kategori");
    if (boks) return boks.querySelector(".kort-plassert");
    if (el.closest(".kort-bunke-ramme")) return bunke;
    const rad = el.closest(".kort-rad");
    if (rad) return ledigIRad(rad);
    return null;
  }

  function merkMal(mal) {
    if (dra.mal === mal) return;
    dra.mal?.closest(".kort-plass, .kort-kategori, .kort-bunke-ramme")?.classList.remove("mal");
    dra.mal = mal;
    mal?.closest(".kort-plass, .kort-kategori, .kort-bunke-ramme")?.classList.add("mal");
  }

  // Rull siden (eller fullskjermvinduet) når kortet dras nær kanten
  let rullFart = 0, rullTimer = 0;
  function rull() {
    if (!rullFart || !dra) { rullTimer = 0; return; }
    (document.fullscreenElement || document.scrollingElement).scrollBy(0, rullFart);
    rullTimer = requestAnimationFrame(rull);
  }

  document.addEventListener("pointermove", (e) => {
    if (!start || e.pointerId !== start.id) return;
    if (!dra) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
      startDra(e);
    }
    e.preventDefault();
    dra.spokelse.style.left = `${e.clientX - dra.dx}px`;
    dra.spokelse.style.top = `${e.clientY - dra.dy}px`;
    merkMal(malUnder(e.clientX, e.clientY));
    const kant = 70;
    rullFart = e.clientY < kant ? -Math.ceil((kant - e.clientY) / 5) : e.clientY > innerHeight - kant ? Math.ceil((e.clientY - innerHeight + kant) / 5) : 0;
    if (rullFart && !rullTimer) rullTimer = requestAnimationFrame(rull);
  }, { passive: false });

  function sluttDra(e, avbrutt) {
    if (!start || e.pointerId !== start.id) return;
    const d = dra;
    start = null;
    dra = null;
    rullFart = 0;
    if (!d) return;
    ignorerKlikk = e.type === "pointerup";
    setTimeout(() => { ignorerKlikk = false; }, 0);
    const fraRekt = d.spokelse.getBoundingClientRect();
    d.spokelse.remove();
    d.k.classList.remove("drar");
    bord.classList.remove("drar-nå");
    const mal = avbrutt ? null : d.mal;
    if (mal) mal.closest(".kort-plass, .kort-kategori, .kort-bunke-ramme")?.classList.remove("mal");
    if (mal) flytt(d.k, mal, fraRekt);
    else animer(new Map([[d.k, fraRekt]])); // tilbake dit det kom fra
  }
  document.addEventListener("pointerup", (e) => sluttDra(e, false));
  document.addEventListener("pointercancel", (e) => sluttDra(e, true));

  // ---------------------------------------------------------- tekst som passer på kortet
  function tilpassTekst(k) {
    const inn = k.querySelector(".kort-innhold:not(.kort-figur)");
    if (!inn) return;
    inn.style.fontSize = "";
    // Plassen på kortet (innenfor polstringen). Høyden måles mot kortet, ikke mot linja,
    // fordi brøker alltid stikker litt over og under linja uten at det er et problem.
    const st = getComputedStyle(k);
    const maksH = k.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    const forStor = () => inn.scrollWidth > inn.clientWidth + 1 || inn.getBoundingClientRect().height > maksH + 1;
    const krymp = () => {
      let f = 1;
      inn.style.fontSize = "";
      while (forStor() && f > 0.5) {
        f -= 0.06;
        inn.style.fontSize = `${f}em`;
      }
      return f;
    };
    inn.classList.remove("bryt");
    // Lange formler får heller bryte over to linjer enn å bli bittesmå
    if (krymp() < 0.76) {
      inn.classList.add("bryt");
      krymp();
    }
  }
  const tilpassAlle = () => alleKort.forEach(tilpassTekst);
  let tilpassTimer = 0;
  addEventListener("resize", () => { clearTimeout(tilpassTimer); tilpassTimer = setTimeout(tilpassAlle, 120); });
  document.addEventListener("fullscreenchange", () => {
    $("kort-fullskjerm").textContent = document.fullscreenElement ? "Avslutt fullskjerm" : "Fullskjerm";
    setTimeout(tilpassAlle, 60);
  });
  (document.fonts?.ready || Promise.resolve()).then(tilpassAlle);

  // ---------------------------------------------------------- sjekk
  function nullstillSjekk() {
    status.textContent = "";
    rot.querySelectorAll(".riktig, .feil").forEach((e) => e.classList.remove("riktig", "feil"));
    rot.querySelectorAll(".kort-merke").forEach((e) => e.remove());
    rot.querySelectorAll(".rad-merke").forEach((e) => { e.textContent = ""; });
    $("kort-kommentarer").hidden = true;
  }

  function merk(k, ok) {
    k.classList.add(ok ? "riktig" : "feil");
    const m = document.createElement("span");
    m.className = "kort-merke";
    m.innerHTML = `<span aria-hidden="true">${ok ? "✓" : "✗"}</span><span class="visuelt-skjult">${ok ? "riktig" : "feil"}</span>`;
    k.appendChild(m);
  }

  $("kort-sjekk").addEventListener("click", () => {
    nullstillSjekk();
    fjernValg();
    const igjen = bunke.querySelectorAll("button.kort").length;
    const rest = igjen ? ` ${igjen} kort ligger fortsatt i bunken.` : "";
    let tekst;
    if (type === "grupper") {
      let r = 0, hele = 0;
      for (const rad of brett.querySelectorAll(".kort-rad")) {
        const kort = Array.from(rad.querySelectorAll("button.kort"));
        if (kort.length < n) { if (kort.length) rad.querySelector(".rad-merke").textContent = `${n - kort.length} mangler`; continue; }
        hele++;
        const ok = new Set(kort.map((k) => k.dataset.svar)).size === 1;
        if (ok) r++;
        rad.classList.add(ok ? "riktig" : "feil");
        rad.querySelector(".rad-merke").textContent = ok ? "✓ Hører sammen" : "✗ Hører ikke sammen";
      }
      tekst = hele ? `${r} av ${hele} fulle grupper er riktige.${rest}` : "Ingen grupper er fulle ennå.";
      if (hele && r === hele && !igjen) tekst = "Alle gruppene er riktige!";
    } else if (type === "sorter") {
      const plassert = Array.from(brett.querySelectorAll("button.kort"));
      let r = 0;
      const kommentarer = [];
      for (const k of plassert) {
        const boks = k.closest(".kort-kategori").dataset.kategori;
        const ok = k.dataset.svar.split(" ").includes(boks);
        if (ok) r++;
        merk(k, ok);
        const kom = k.querySelector(".kort-kommentar");
        if (kom) kommentarer.push(`<li><strong>${navn(k)}</strong> ${kom.innerHTML}</li>`);
      }
      if (kommentarer.length) {
        $("kort-kommentarer").innerHTML = `<p class="panel-tittel">Kommentarer til kortene du har sortert</p><ul>${kommentarer.join("")}</ul>`;
        $("kort-kommentarer").hidden = false;
      }
      tekst = plassert.length ? `${r} av ${plassert.length} sorterte kort står i en boks som passer.${rest}` : "Du har ikke sortert noen kort ennå.";
      if (plassert.length && r === plassert.length && !igjen) tekst = "Alle kortene står i en boks som passer!";
    } else {
      let r = 0, lagt = 0;
      brett.querySelectorAll(".kort-plass").forEach((p, i) => {
        const k = p.querySelector("button.kort");
        if (!k) return;
        lagt++;
        const ok = Number(k.dataset.svar) === i + 1;
        if (ok) r++;
        merk(k, ok);
      });
      tekst = lagt ? `${r} av ${lagt} kort står på riktig plass.${rest}` : "Du har ikke lagt noen kort i rekka ennå.";
      if (lagt && r === lagt && !igjen) tekst = "Hele rekka er riktig!";
    }
    status.textContent = tekst;
  });

  // ---------------------------------------------------------- bland, start på nytt, fullskjerm
  $("kort-bland").addEventListener("click", () => {
    nullstillSjekk();
    const l = Array.from(bunke.querySelectorAll("button.kort"));
    const før = new Map(l.map((k) => [k, k.getBoundingClientRect()]));
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    bunke.append(...l);
    animer(før);
    annonser("Kortene i bunken er blandet.", 50);
  });

  $("kort-nullstill").addEventListener("click", () => {
    nullstillSjekk();
    fjernValg();
    const før = new Map(alleKort.map((k) => [k, k.getBoundingClientRect()]));
    bunke.append(...alleKort.slice().sort((a, b) => a.dataset.nr.localeCompare(b.dataset.nr)));
    bunke.closest(".kort-bunke-ramme").scrollTop = 0;
    bunke.scrollLeft = 0;
    oppdaterPlasser();
    animer(før);
    annonser("Alle kortene er tilbake i bunken.", 50);
  });

  if (bord.requestFullscreen) {
    const fs = $("kort-fullskjerm");
    fs.hidden = false;
    fs.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else bord.requestFullscreen().catch(() => {});
    });
  }

  oppdaterPlasser();
  bord.classList.add("klar");

  // Til testene
  window.mattelabKortsett = { type, n, kode, flytt, bunke, brett };
}
