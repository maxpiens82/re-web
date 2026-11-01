// Placas (slides) for a draft, rendered in the browser from the SVG templates in Plantillas
// (re-backend redes_templates). Spec: re-backend docs/REDES_SPEC.md §7.2.
//
// Templates come in series, one subfolder of Plantillas each ("serie1/carrusel-portada",
// "serie2/carrusel-portada-noche"); the draft's estilo picks one ("serie2-noche"; the old "estandar"
// and "noche" mean Serie 1). Made with G:\My Drive\Identidad\Plantillas redes RE!\build.py.
//
// Fill: <image id="foto-N"> gets the photo as a data: URI; <text>/<tspan id="campo-X"> gets campos[X]
// (barrio, servicios, inmobiliaria; web, whatsapp, marca and cierre-* keep the template's text). An
// empty field is removed together with its label (an id-less text right above it, same x), or with
// its whole line when it's a <tspan>. data-mayusculas = upper case; data-ancho-max = shrink font and
// spacing until the line fits (as the templates' own rellenar.js does). The fonts are EMBEDDED in each
// SVG: an SVG drawn to a canvas through an image doesn't see the page's @font-face and silently falls
// back to another typeface.
import { redesCall } from './redesApi';

const XLINK = 'http://www.w3.org/1999/xlink';
const SVG_NS = 'http://www.w3.org/2000/svg';
const FONTS = [
  ['AkzidenzGroteskBQ-LigExt', '/font/AkzidenzGrotesk-LightExtended.otf'],
  ['AkzidenzGroteskBQ-Ext', '/font/AkzidenzGrotesk-Extended.otf'],
];
const MARGIN = 72;          // px kept free from the edges for text (spec §7.2.4)
const MIN_SCALE = 0.6;      // below this the text is "muy largo" and the approver shortens it
const MIN_FIT = 0.4;        // templates with data-ancho-max shrink down to this, then warn
const FILLED = ['barrio', 'servicios', 'inmobiliaria'];   // fields the draft fills; the rest keep the template's text
const SERVICE_NAMES = { FOTO: 'Foto', VIDEO: 'Video', REEL: 'Reel', TH: 'Talking head', PLANO: 'Plano', TOUR: 'Tour 360', DRONE: 'Drone', FPV: 'Drone FPV' };

// "Foto · Video · Drone" from the booking's service codes.
export const servicesText = codes => (codes || []).map(c => SERVICE_NAMES[c] || c).join(' · ');

// estilo -> { serie, noche }. "estandar"/"noche" are Serie 1 (drafts made before the series).
export function parseEstilo(estilo) {
  const e = String(estilo || 'estandar');
  if (e === 'estandar') return { serie: 'serie1', noche: false };
  if (e === 'noche') return { serie: 'serie1', noche: true };
  const m = e.match(/^(.+?)(-noche)?$/);
  return { serie: m[1], noche: !!m[2] };
}
export const estiloOf = (serie, noche) => `${serie}${noche ? '-noche' : ''}`;

// The series that have usable templates, in name order: ["serie1", "serie2", …]. Loose (pre-series)
// files count as serie1.
export function seriesOf(templates) {
  const set = new Set();
  (templates || []).filter(t => t.ok).forEach(t => set.add(t.name.includes('/') ? t.name.split('/')[0] : 'serie1'));
  return [...set].sort();
}
export const serieLabel = serie => (/^serie(\d+)$/.test(serie) ? `Serie ${serie.slice(5)}` : serie.charAt(0).toUpperCase() + serie.slice(1));

let templatesPromise = null;
let fontsPromise = null;

export function loadTemplates(force) {
  if (!templatesPromise || force) {
    templatesPromise = redesCall('redes_templates').then(r => r.templates || []).catch(e => { templatesPromise = null; throw e; });
  }
  return templatesPromise;
}

const toBase64 = buf => {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

// The two OTFs: as base64 for embedding, and registered in the page (with the templates' family names)
// so the canvas can measure text with the same font the slide will use.
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FONTS.map(async ([family, url]) => {
      const buf = await (await fetch(url)).arrayBuffer();
      const face = new FontFace(family, buf);
      await face.load();
      document.fonts.add(face);
      return { family, base64: toBase64(buf) };
    })).catch(e => { fontsPromise = null; throw e; });
  }
  return fontsPromise;
}

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('No se pudo leer la foto.'));
  r.readAsDataURL(blob);
});

const orientation = p => {
  const w = Number(p.w) || 0, h = Number(p.h) || 0;
  if (!w || !h) return 'landscape';
  if (Math.abs(w - h) / Math.max(w, h) < 0.05) return 'square';
  return w > h ? 'landscape' : 'portrait';
};

// Default layout (spec §7.2.2): cover with photo 1; then, in order, consecutive landscape pairs on
// "doble" and portraits (or a lone landscape) on "simple"; then the closing slide. A suelta goes in
// "foto-en-marco-1350", or "-1080" for a square photo. "-noche" variants when estilo = noche.
// cierre 'endscreen': no closing template (the end screen video goes last instead, §7.2b).
export function defaultLayout(tipo, fotos, cierre = 'plantilla') {
  if (tipo === 'suelta') return [{ plantilla: orientation(fotos[0] || {}) === 'square' ? 'foto-en-marco-1080' : 'foto-en-marco-1350', fotos: fotos.slice(0, 1) }];
  const slides = [{ plantilla: 'carrusel-portada', fotos: fotos.slice(0, 1) }];
  for (let i = 1; i < fotos.length;) {
    if (orientation(fotos[i]) !== 'portrait' && fotos[i + 1] && orientation(fotos[i + 1]) !== 'portrait') {
      slides.push({ plantilla: 'carrusel-doble', fotos: [fotos[i], fotos[i + 1]] });
      i += 2;
    } else {
      slides.push({ plantilla: 'carrusel-simple', fotos: [fotos[i]] });
      i += 1;
    }
  }
  if (cierre !== 'endscreen') slides.push({ plantilla: 'carrusel-cierre', fotos: [] });
  return slides;
}

// Available width for a text (spec §7.2.4): W − x − 72 when it starts at x, x − 72 when it ends at x,
// 2·min(x, W − x) − 144 when centred on x.
function availableWidth(el, W) {
  const x = Number(el.getAttribute('x')) || 0;
  const anchor = el.getAttribute('text-anchor') || 'start';
  if (anchor === 'end') return x - MARGIN;
  if (anchor === 'middle') return 2 * Math.min(x, W - x) - 2 * MARGIN;
  return W - x - MARGIN;
}

const measureCtx = (() => { let c = null; return () => (c = c || document.createElement('canvas').getContext('2d')); })();

// Sets the text and shrinks font-size and letter-spacing together, 3% at a time, until it fits.
// Returns a warning when even 60% doesn't fit.
function fitText(el, text, W) {
  el.textContent = text;
  if (!text) return '';
  const family = (el.getAttribute('font-family') || '').split(',')[0].replace(/['"]/g, '').trim();
  const size0 = Number(el.getAttribute('font-size')) || 40;
  const ls0 = Number(el.getAttribute('letter-spacing')) || 0;
  const avail = availableWidth(el, W);
  const ctx = measureCtx();
  const width = k => {
    ctx.font = `${size0 * k}px "${family}"`;
    ctx.letterSpacing = `${ls0 * k}px`;
    return ctx.measureText(text).width - ls0 * k;   // letterSpacing also adds space after the last letter
  };
  let k = 1;
  while (width(k) > avail && k > MIN_SCALE) k *= 0.97;
  el.setAttribute('font-size', (size0 * k).toFixed(2));
  if (ls0) el.setAttribute('letter-spacing', (ls0 * k).toFixed(2));
  return width(k) > avail ? 'Texto muy largo: acortá el barrio para esta placa.' : '';
}

// The template for one layout in this series: its -noche version when asked, else the plain one;
// for Serie 1 also the loose files of the first upload.
function pickTemplate(byName, plantilla, { serie, noche }) {
  const names = [noche && `${serie}/${plantilla}-noche`, `${serie}/${plantilla}`];
  if (serie === 'serie1') names.push(noche && `${plantilla}-noche`, plantilla);
  for (const n of names) if (n && byName[n] && byName[n].ok) return byName[n];
  return null;
}

// Removes an empty field: a <tspan> takes its whole line with it; a <text> takes its label, the
// id-less text just above it in the same column.
function dropField(el) {
  if (el.tagName.toLowerCase() === 'tspan') { (el.closest('text') || el).remove(); return; }
  const x = el.getAttribute('x'), anchor = el.getAttribute('text-anchor') || 'start', y = Number(el.getAttribute('y'));
  el.ownerSVGElement.querySelectorAll('text:not([id])').forEach(t => {
    const dy = y - Number(t.getAttribute('y'));
    if (t.getAttribute('x') === x && (t.getAttribute('text-anchor') || 'start') === anchor && dy > 0 && dy < 80 && !t.querySelector('[id]')) t.remove();
  });
  el.remove();
}

// Shrinks a <text data-ancho-max> (font and spacing together) until the whole line fits. The SVG must
// be in the page, so the browser can measure it. Returns a warning or ''.
function fitLine(t) {
  const max = Number(t.getAttribute('data-ancho-max'));
  const size0 = Number(t.getAttribute('font-size')), ls0 = Number(t.getAttribute('letter-spacing') || 0);
  let size = size0;
  while (t.getComputedTextLength() > max && size > size0 * MIN_FIT) {
    size *= 0.96;
    t.setAttribute('font-size', size.toFixed(2));
    t.setAttribute('letter-spacing', (ls0 * size / size0).toFixed(2));
  }
  const field = (t.id || (t.querySelector('[id^="campo-"]') || {}).id || '').slice(6);
  if (t.getComputedTextLength() > max) return `"${field}" no entra: acortalo.`;
  if (size < size0 * MIN_SCALE) return `"${field}" quedó chico (${Math.round(100 * size / size0)}%): conviene acortarlo.`;
  return '';
}

// Fills a template already in the page. Returns the warnings.
function fill(svg, { photos, campos, W }) {
  const warnings = [];
  svg.querySelectorAll('image[id^="foto-"]').forEach(img => {
    const src = photos[Number(img.id.slice(5)) - 1];
    if (src) { img.setAttribute('href', src); img.setAttributeNS(XLINK, 'xlink:href', src); }
  });
  const modern = !!svg.querySelector('[data-ancho-max]');
  svg.querySelectorAll('[id^="campo-"]').forEach(el => {
    const key = el.id.slice(6);
    if (!FILLED.includes(key)) return;                              // fixed text (web, whatsapp…)
    const value = String(campos[key] || '').trim();
    if (!value) { dropField(el); return; }
    const upper = el.hasAttribute('data-mayusculas') || (!modern && key === 'barrio');
    if (modern || el.tagName.toLowerCase() === 'tspan') el.textContent = upper ? value.toLocaleUpperCase('es-AR') : value;
    else { const w = fitText(el, upper ? value.toLocaleUpperCase('es-AR') : value, W); if (w) warnings.push(w); }   // first Serie 1 upload
  });
  svg.querySelectorAll('text[data-ancho-max]').forEach(t => { const w = fitLine(t); if (w) warnings.push(w); });
  return warnings;
}

async function rasterize(svgText, W, H) {
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.getContext('2d').drawImage(img, 0, 0, W, H);
    return await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo generar la placa.'))), 'image/jpeg', 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Renders every slide. photoBlob(copia) gives the photo's Blob (from the tab's photo cache); campos
// = { barrio, servicios, inmobiliaria } (empty ones are hidden). Returns [{ plantilla, blob, url,
// warning }]; the caller revokes the URLs.
export async function renderSlides({ tipo, fotos, estilo, cierre, campos = {}, photoBlob }) {
  const [templates, fonts] = await Promise.all([loadTemplates(), loadFonts()]);
  const byName = Object.fromEntries(templates.map(t => [t.name, t]));
  const css = fonts.map(f => `@font-face{font-family:'${f.family}';src:url(data:font/otf;base64,${f.base64})}`).join('');
  const look = parseEstilo(estilo);
  const layout = defaultLayout(tipo, fotos, cierre);
  const dataUrls = {};
  for (const p of fotos) {
    const blob = photoBlob(p.copia);
    if (!blob) throw new Error('Falta cargar alguna foto. Esperá a que aparezcan todas y probá de nuevo.');
    dataUrls[p.copia] = await blobToDataUrl(blob);
  }
  // Filled in the page (hidden, but laid out) so text can be measured.
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:-20000px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(box);
  try {
    const out = [];
    for (const slide of layout) {
      const tpl = pickTemplate(byName, slide.plantilla, look);
      if (!tpl) throw new Error(`La plantilla ${look.serie}/${slide.plantilla}${look.noche ? '-noche' : ''} no está en Plantillas o tiene problemas.`);
      const doc = new DOMParser().parseFromString(tpl.svg, 'image/svg+xml');
      const svg = document.importNode(doc.documentElement, true);
      box.replaceChildren(svg);
      const W = Number(svg.getAttribute('width')) || 1080, H = Number(svg.getAttribute('height')) || 1350;
      // A template photo the layout doesn't feed (Serie 2's closing slide) takes the carousel's last photos.
      const own = slide.fotos.map(p => dataUrls[p.copia]);
      const photos = Array.from(svg.querySelectorAll('image[id^="foto-"]'), (_, i) => own[i] || dataUrls[(fotos[fotos.length - 1 - i] || {}).copia]);
      const warning = fill(svg, { photos, campos, W }).join(' ');
      const style = document.createElementNS(SVG_NS, 'style');
      style.textContent = css;
      svg.insertBefore(style, svg.firstChild);
      const blob = await rasterize(new XMLSerializer().serializeToString(svg), W, H);
      out.push({ plantilla: tpl.name, blob, url: URL.createObjectURL(blob), warning });
    }
    return out;
  } finally {
    box.remove();
  }
}

export const blobToBase64 = blob => blobToDataUrl(blob).then(u => u.slice(u.indexOf(',') + 1));
