// mattelab.no – felles byggeklosser for utforskerne.
// Hver utforsker har glidebrytere, en verditabell, en figur med verktøyknapper og
// lenker i oppgavene som setter verdiene. Det som er likt, ligger her.

import "../lib/katex/katex.min.js";
import { lagGlider, lesAdresse, skrivAdresse, lastNedPNG, lastNedSVG, annonser } from "./felles.js";

export const katex = window.katex;
export const $ = (id) => document.getElementById(id);

/** Tegn en formel med KaTeX. Feil i formelen gir rød tekst i stedet for at siden stopper. */
export function tex(s, display = false) {
  return katex.renderToString(s, { throwOnError: false, displayMode: display });
}

/** Bytt ut $…$ i en tekst med ferdig tegnede formler. */
export function medFormler(tekst) {
  return tekst.replace(/\$([^$]+)\$/g, (_, t) => tex(t));
}

/**
 * Lag glidebrytere i en boks.
 * oppsett: [{ navn, etikett, beskrivelse, min, maks, steg, desimaler, grense }]
 * Startverdier leses fra adressefeltet når de finnes der, ellers fra `standard`.
 */
export function lagGlidere(boks, oppsett, standard, vedEndring) {
  const fraAdresse = lesAdresse(oppsett.map((o) => o.navn));
  const glidere = {};
  for (const o of oppsett) {
    let verdi = fraAdresse[o.navn] ?? standard[o.navn];
    const grense = o.grense || [o.min, o.maks];
    if (verdi < grense[0] || verdi > grense[1]) verdi = standard[o.navn];
    glidere[o.navn] = lagGlider({ steg: 0.1, desimaler: 2, ...o, verdi, vedEndring: () => vedEndring(o.navn) });
    boks.appendChild(glidere[o.navn].element);
  }
  return glidere;
}

/** Verdiene til alle glidebryterne som et vanlig objekt. */
export function verdier(glidere) {
  return Object.fromEntries(Object.entries(glidere).map(([n, g]) => [n, g.verdi]));
}

/** Skriv verditabellen. rader: [[navn, innhold, "bred"?], …]. Innholdet er HTML. */
export function visVerdier(el, rader) {
  el.innerHTML = rader.filter(Boolean)
    .map(([dt, dd, kl]) => `<div${kl ? ` class="${kl}"` : ""}><dt>${dt}</dt><dd>${dd}</dd></div>`).join("");
}

/** Vis eller skjul meldingsboksen for spesialtilfeller. */
export function visMelding(el, html) {
  el.innerHTML = html ? `<p>${html}</p>` : "";
  el.hidden = !html;
}

/**
 * Koble knappene i figurverktøyet (laget av {{figurverktoy}} i byggeskriptet).
 * Knapper som ikke finnes på siden, hoppes over.
 */
export function figurverktoy({ ks, svg, filnavn, tilpass, tilbakestill }) {
  const knapp = (id, f) => { const k = $(id); if (k && f) k.addEventListener("click", f); };
  if (ks) {
    knapp("zoom-inn", () => ks.zoom(1 / 1.5));
    knapp("zoom-ut", () => ks.zoom(1.5));
    knapp("standardvindu", () => ks.tilbakestill());
  }
  knapp("vis-alt", tilpass);
  knapp("tilbakestill", tilbakestill);
  knapp("last-ned-png", () => lastNedPNG(svg, filnavn + ".png"));
  knapp("last-ned-svg", () => lastNedSVG(svg, filnavn + ".svg"));
  knapp("kopier-lenke", async () => {
    const status = $("lenkestatus");
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = "Lenken er kopiert.";
    } catch (e) {
      status.textContent = "Kunne ikke kopiere. Kopier adressen fra adressefeltet.";
    }
  });
}

/**
 * Lenker i oppgavene («Sett a = 1 og b = 2») setter verdiene direkte.
 * Tall leses for navnene i `tallnavn`, tekstverdier (for eksempel modus) for navnene i `tekstnavn`.
 */
export function oppsettlenker(tallnavn, tekstnavn, settVerdier, fokus) {
  document.querySelectorAll("a.oppsettlenke").forEach((lenke) => {
    lenke.addEventListener("click", (e) => {
      const p = new URL(lenke.href).searchParams;
      const v = {};
      for (const n of tallnavn) if (p.has(n)) v[n] = Number(p.get(n));
      for (const n of tekstnavn) if (p.has(n)) v[n] = p.get(n);
      e.preventDefault();
      settVerdier(v);
      $("utforsker").scrollIntoView({ behavior: "smooth", block: "start" });
      fokus?.focus({ preventScroll: true });
    });
  });
}

/** Skriv verdiene til adressefeltet og les opp sammendraget for skjermleser. */
export function delTilstand(tilstand, sammendrag) {
  skrivAdresse(Object.fromEntries(Object.entries(tilstand).map(([k, v]) => [k, String(v)])));
  if (sammendrag) annonser(sammendrag);
}

/** Les en tekstverdi (for eksempel modus) fra adressefeltet. Ukjente verdier gir standard. */
export function lesValg(navn, lovlige, standard) {
  const v = new URLSearchParams(location.search).get(navn);
  return lovlige.includes(v) ? v : standard;
}

/**
 * Velg et vindu som viser alle punktene. Med like enheter på aksene blir vinduet
 * like «stort» i begge retninger; ellers tilpasses x og y hver for seg.
 * punkter: [[x, y], …]. minHalv: minste halve bredde (og høyde) på vinduet.
 */
export function tilpassVindu(ks, punkter, minHalv = 6, margin = 1.3) {
  const ok = punkter.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!ok.length) { ks.tilbakestill(); return; }
  const xs = ok.map((p) => p[0]), ys = ok.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (ks.likeEnheter) {
    const forhold = ks.B / ks.H;
    const hx = Math.max((x1 - x0) / 2 * margin, (y1 - y0) / 2 * margin * forhold, minHalv);
    const hy = hx / forhold;
    ks.settVindu({ xmin: cx - hx, xmax: cx + hx, ymin: cy - hy, ymax: cy + hy });
  } else {
    const hx = Math.max((x1 - x0) / 2 * margin, minHalv), hy = Math.max((y1 - y0) / 2 * margin, minHalv);
    ks.settVindu({ xmin: cx - hx, xmax: cx + hx, ymin: cy - hy, ymax: cy + hy });
  }
}
