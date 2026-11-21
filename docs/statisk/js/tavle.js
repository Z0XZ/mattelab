// mattelab.no – tavleoppgaver: ett spørsmål om gangen, til storskjerm.
//
// Kilden er en vanlig liste (<ol class="tavle-liste">) med ett <li class="tavle-kort"> per spørsmål.
// Uten JavaScript vises alle spørsmålene under hverandre. Med JavaScript vises ett om gangen,
// med knapper for forrige og neste, piltaster, fullskjerm og lenke til hvert spørsmål (#t3).
// Svarforslaget ligger i <details class="tavle-svar"> og er skjult til læreren åpner det.

import { annonser } from "./felles.js";

const ramme = document.querySelector(".tavle-ramme");
if (ramme) {
  const kort = Array.from(ramme.querySelectorAll(".tavle-kort"));
  const styring = ramme.querySelector(".tavle-styring");
  const teller = ramme.querySelector(".tavle-teller");
  const forrige = ramme.querySelector(".tavle-forrige");
  const neste = ramme.querySelector(".tavle-neste");
  const alle = ramme.querySelector(".tavle-alle");
  const fullskjerm = ramme.querySelector(".tavle-fullskjerm");
  styring.hidden = false;
  kort.forEach((k, i) => { k.id ||= `t${i + 1}`; });

  const fraAdresse = kort.findIndex((k) => "#" + k.id === location.hash);
  let nr = Math.max(0, fraAdresse);
  let visAlle = false;

  function vis(meld) {
    ramme.classList.toggle("vis-alle", visAlle);
    kort.forEach((k, i) => { k.hidden = !visAlle && i !== nr; });
    teller.textContent = visAlle ? `${kort.length} spørsmål` : `Spørsmål ${nr + 1} av ${kort.length}`;
    forrige.disabled = visAlle || nr === 0;
    neste.disabled = visAlle || nr === kort.length - 1;
    alle.setAttribute("aria-pressed", String(visAlle));
    if (!visAlle) history.replaceState(null, "", "#" + kort[nr].id);
    if (meld && !visAlle) annonser(`Spørsmål ${nr + 1} av ${kort.length}.`, 50);
  }

  function ga(d) {
    if (visAlle) return;
    const ny = Math.min(kort.length - 1, Math.max(0, nr + d));
    if (ny === nr) return;
    kort[nr].querySelectorAll("details").forEach((d_) => { d_.open = false; });
    nr = ny;
    vis(true);
  }

  forrige.addEventListener("click", () => ga(-1));
  neste.addEventListener("click", () => ga(1));
  alle.addEventListener("click", () => { visAlle = !visAlle; vis(true); });
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); ga(1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ga(-1); }
  });

  if (ramme.requestFullscreen) {
    fullskjerm.hidden = false;
    fullskjerm.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else ramme.requestFullscreen().catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => {
      fullskjerm.textContent = document.fullscreenElement ? "Avslutt fullskjerm" : "Fullskjerm";
    });
  }
  vis(false);
  window.mattelabTavle = { antall: kort.length, gjeldende: () => nr };
}
