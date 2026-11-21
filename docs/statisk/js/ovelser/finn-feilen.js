// Øving: Finn feilen i løste oppgaver med potenser.
//
// Hver oppgave er en utregning i to steg. Som regel er ett steg feil, med en typisk feil.
// Noen ganger er alt riktig. Stegene etter en feil regner videre fra feilen, slik en elev ville gjort.
// Alle tallene lages her, og fasiten følger av den samme koden som lager stegene.

import { tex, lagTilfeldig } from "../ovelse.js";
import { annonser } from "../felles.js";

const $ = (id) => document.getElementById(id);

// Forklaringer på de typiske feilene
const FEIL = {
  gangetEksp: "Når vi ganger potenser med samme grunntall, <strong>legger vi sammen</strong> eksponentene: $a^m \\cdot a^n = a^{m + n}$.",
  laSammenVedDeling: "Når vi deler potenser med samme grunntall, <strong>trekker vi fra</strong> eksponenten i nevneren: $\\dfrac{a^m}{a^n} = a^{m - n}$.",
  potensAvPotens: "En potens av en potens: Eksponentene <strong>ganges</strong>. $(a^m)^n = a^{m \\cdot n}$.",
  glemtTallet: "Hele parentesen opphøyes, også tallet foran: $(c \\cdot a^m)^n = c^n \\cdot a^{m \\cdot n}$.",
  potensSomProdukt: "En potens er gjentatt multiplikasjon: $2^3 = 2 \\cdot 2 \\cdot 2 = 8$. Det er ikke det samme som $2 \\cdot 3$.",
  negativEksp: "En negativ eksponent gjør ikke tallet negativt. Den betyr at vi tar det omvendte: $a^{-n} = \\dfrac{1}{a^n}$.",
  feilRekkefolge: "Eksponenten i nevneren trekkes fra eksponenten i telleren: $\\dfrac{a^m}{a^k} = a^{m - k}$. Rekkefølgen betyr noe.",
  nullEksp: "Alle tall unntatt $0$ opphøyd i $0$ er $1$: $a^0 = 1$. Det følger av at $\\dfrac{a^n}{a^n} = a^{n - n} = a^0$, og at et tall delt på seg selv er $1$.",
  dobbelMinus: "Når vi skriver om til en brøk, blir eksponenten positiv: $a^{-3} = \\dfrac{1}{a^3}$. Med minus i nevneren også blir det feil, for $\\dfrac{1}{a^{-3}} = a^3$.",
  brokSum: "For å legge sammen må brøkene ha samme nevner: $1 + \\dfrac{1}{c} = \\dfrac{c}{c} + \\dfrac{1}{c} = \\dfrac{c + 1}{c}$.",
};

/** Lag oppgavene. Hver familie gir den riktige utregningen og mulige feil (med linjene etter feilen). */
function lagFamilier(r) {
  const ulike = (a, b, hvor) => { let x; do { x = r.heltall(a, b); } while (hvor.includes(x)); return x; };
  return [
    function produktOgKvotient() {
      const m = r.heltall(2, 6), n = ulike(2, 6, [m]), k = r.heltall(2, m + n - 1);
      const linjer = (e1, e2) => [`\\dfrac{a^{${e1}}}{a^{${k}}}`, `a^{${e2}}`];
      return {
        oppgave: `\\dfrac{a^{${m}} \\cdot a^{${n}}}{a^{${k}}}`,
        riktig: linjer(m + n, m + n - k),
        feil: [
          { steg: 0, linjer: linjer(m * n, m * n - k), forklaring: FEIL.gangetEksp },
          { steg: 1, linjer: linjer(m + n, m + n + k), forklaring: FEIL.laSammenVedDeling },
        ],
      };
    },
    function potensAvPotens() {
      const m = r.heltall(2, 5), n = ulike(2, 4, [m]), k = r.heltall(2, 6);
      const linjer = (e1, e2) => [`a^{${e1}} \\cdot a^{${k}}`, `a^{${e2}}`];
      return {
        oppgave: `(a^{${m}})^{${n}} \\cdot a^{${k}}`,
        riktig: linjer(m * n, m * n + k),
        feil: [
          { steg: 0, linjer: linjer(m + n, m + n + k), forklaring: FEIL.potensAvPotens },
          { steg: 1, linjer: linjer(m * n, m * n * k), forklaring: FEIL.gangetEksp },
        ],
      };
    },
    function tallIParentes() {
      const c = r.velg([2, 3]), n = c === 2 ? r.velg([3, 4]) : 3, m = r.heltall(2, 4);
      const C = c ** n;
      return {
        oppgave: `(${c}a^{${m}})^{${n}}`,
        riktig: [`${c}^{${n}} \\cdot a^{${m * n}}`, `${C}a^{${m * n}}`],
        feil: [
          { steg: 0, linjer: [`${c} \\cdot a^{${m * n}}`, `${c}a^{${m * n}}`], forklaring: FEIL.glemtTallet },
          { steg: 1, linjer: [`${c}^{${n}} \\cdot a^{${m * n}}`, `${c * n}a^{${m * n}}`], forklaring: FEIL.potensSomProdukt },
        ],
      };
    },
    function negativEksponentTall() {
      // Med c = n = 2 er c · n lik cⁿ, så den feilen ville ikke synst. Derfor n ≥ 3 når c = 2.
      const c = r.velg([2, 3, 5, 10]), n = c === 10 ? r.velg([2, 3]) : c === 5 ? 2 : c === 2 ? r.velg([3, 4]) : r.velg([2, 3]);
      const C = c ** n;
      return {
        oppgave: `${c}^{-${n}}`,
        riktig: [`\\dfrac{1}{${c}^{${n}}}`, `\\dfrac{1}{${C}}`],
        feil: [
          { steg: 0, linjer: [`-${c}^{${n}}`, `-${C}`], forklaring: FEIL.negativEksp },
          { steg: 1, linjer: [`\\dfrac{1}{${c}^{${n}}}`, `\\dfrac{1}{${c * n}}`], forklaring: FEIL.potensSomProdukt },
        ],
      };
    },
    function kvotientNegativ() {
      const m = r.heltall(2, 5), k = r.heltall(m + 2, m + 5), d = k - m;
      return {
        oppgave: `\\dfrac{a^{${m}}}{a^{${k}}}`,
        riktig: [`a^{${m - k}}`, `\\dfrac{1}{a^{${d}}}`],
        feil: [
          { steg: 1, linjer: [`a^{${m - k}}`, `-a^{${d}}`], forklaring: FEIL.negativEksp },
          { steg: 1, linjer: [`a^{${m - k}}`, `\\dfrac{1}{a^{${m - k}}}`], forklaring: FEIL.dobbelMinus },
        ],
      };
    },
    function nullOgMinusEn() {
      const c = r.velg([2, 3, 4, 5, 7]);
      return {
        oppgave: `${c}^{0} + ${c}^{-1}`,
        riktig: [`1 + \\dfrac{1}{${c}}`, `\\dfrac{${c + 1}}{${c}}`],
        feil: [
          { steg: 0, linjer: [`0 + \\dfrac{1}{${c}}`, `\\dfrac{1}{${c}}`], forklaring: FEIL.nullEksp },
          { steg: 1, linjer: [`1 + \\dfrac{1}{${c}}`, `\\dfrac{2}{${c}}`], forklaring: FEIL.brokSum },
        ],
      };
    },
  ];
}

/** Ny oppgave: velg familie og om (og hvor) det skal være en feil. Ren funksjon av tilfeldighetene. */
export function lagOppgave(r) {
  const familier = lagFamilier(r);
  const o = r.velg(familier)();
  const utenFeil = r.tall() < 0.2;
  const valgt = utenFeil ? null : r.velg(o.feil);
  return {
    oppgave: o.oppgave,
    linjer: valgt ? valgt.linjer : o.riktig,
    riktig: o.riktig,
    feilSteg: valgt ? valgt.steg : -1,
    forklaring: valgt ? valgt.forklaring : "",
  };
}

// ------------------------------------------------------------------ på siden
const rot = $("ovelse");
if (rot) {
  const r = lagTilfeldig();
  const medFormler = (s) => s.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
  let oppgave, forsok, ferdig;
  const poeng = { forste: 0, totalt: 0 };

  function vis(fokus = true) {
    oppgave = lagOppgave(r);
    forsok = 0;
    ferdig = false;
    $("ff-instruks").textContent = /a/.test(oppgave.oppgave.replace(/\\[a-z]+/g, "")) ? "Forenkle" : "Regn ut";
    $("ff-oppgave").innerHTML = tex(oppgave.oppgave, true);
    const liste = $("ff-steg");
    liste.innerHTML = "";
    oppgave.linjer.forEach((l, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<button type="button" class="steg-knapp" data-steg="${i}"><span class="steg-nr">Steg ${i + 1}</span><span class="steg-uttrykk">${tex("= " + l)}</span></button><span class="steg-merke" aria-live="off"></span>`;
      liste.appendChild(li);
    });
    $("ff-ingen").disabled = false;
    $("ff-tilbake").innerHTML = "";
    $("ff-ny").hidden = true;
    if (fokus) liste.querySelector("button").focus({ preventScroll: true });
  }

  function svar(valg) {
    if (ferdig) return;
    forsok++;
    const ok = valg === oppgave.feilSteg;
    const tilbake = $("ff-tilbake");
    const knapp = valg >= 0 ? rot.querySelector(`.steg-knapp[data-steg="${valg}"]`) : $("ff-ingen");
    if (ok) {
      ferdig = true;
      poeng.totalt++;
      if (forsok === 1) poeng.forste++;
      if (valg >= 0) {
        knapp.closest("li").classList.add("riktig");
        knapp.closest("li").querySelector(".steg-merke").textContent = "✓ Her er feilen";
        const riktigLinje = oppgave.riktig[valg];
        tilbake.innerHTML = `<p><strong>Riktig!</strong> Feilen er i steg ${valg + 1}.</p><p>${medFormler(oppgave.forklaring)}</p>`
          + `<p>Steg ${valg + 1} skulle vært ${tex("= " + riktigLinje)}, og svaret blir ${tex(oppgave.riktig[oppgave.riktig.length - 1])}.</p>`;
      } else {
        tilbake.innerHTML = "<p><strong>Riktig!</strong> Alle stegene stemmer denne gangen.</p>";
      }
      tilbake.className = "ovelse-tilbake riktig";
      rot.querySelectorAll(".steg-knapp").forEach((b) => { b.disabled = true; });
      $("ff-ingen").disabled = true;
      $("ff-ny").hidden = false;
      $("ff-ny").focus({ preventScroll: true });
    } else {
      if (valg >= 0) {
        knapp.closest("li").classList.add("feil");
        knapp.closest("li").querySelector(".steg-merke").textContent = "✗ Dette steget er riktig";
        knapp.disabled = true;
        tilbake.innerHTML = `<p><strong>Ikke helt.</strong> Steg ${valg + 1} er riktig. ${oppgave.feilSteg < 0 ? "Kanskje er alle stegene riktige?" : "Se på de andre stegene."}</p>`;
      } else {
        knapp.disabled = true;
        tilbake.innerHTML = "<p><strong>Ikke helt.</strong> Det er en feil et sted. Sjekk hvert steg med potensreglene.</p>";
      }
      tilbake.className = "ovelse-tilbake feil";
    }
    $("ff-poeng").textContent = `Funnet på første forsøk: ${poeng.forste} av ${poeng.totalt}`;
    annonser(tilbake.textContent, 50);
  }

  $("ff-steg").addEventListener("click", (e) => {
    const b = e.target.closest(".steg-knapp");
    if (b) svar(Number(b.dataset.steg));
  });
  $("ff-ingen").addEventListener("click", () => svar(-1));
  $("ff-ny").addEventListener("click", () => vis());
  vis(false);
  window.mattelabFinnFeilen = { lagOppgave, gjeldende: () => oppgave };
}
