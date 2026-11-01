// Placas (slides) for a draft, rendered in the browser from the SVG templates in Plantillas
// (re-backend redes_templates). Spec: re-backend docs/REDES_SPEC.md §7.2.
//
// Fill: <image id="foto-N"> gets the photo as a data: URI; <text id="campo-barrio"> gets the barrio in
// upper case, shrunk to fit. The fonts are EMBEDDED in each SVG: an SVG drawn to a canvas through an
// image doesn't see the page's @font-face and silently falls back to another typeface.
import { redesCall } from './redesApi';

const XLINK = 'http://www.w3.org/1999/xlink';
const SVG_NS = 'http://www.w3.org/2000/svg';
const FONTS = [
  ['AkzidenzGroteskBQ-LigExt', '/font/AkzidenzGrotesk-LightExtended.otf'],
  ['AkzidenzGroteskBQ-Ext', '/font/AkzidenzGrotesk-Extended.otf'],
];
const MARGIN = 72;          // px kept free from the edges for text (spec §7.2.4)
const MIN_SCALE = 0.6;      // below this the text is "muy largo" and the approver shortens it

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

// Renders every slide. photoBlob(copia) gives the photo's Blob (from the tab's photo cache).
// Returns [{ plantilla, blob, url, warning }]; the caller revokes the URLs.
export async function renderSlides({ tipo, fotos, barrio, estilo, cierre, photoBlob }) {
  const [templates, fonts] = await Promise.all([loadTemplates(), loadFonts()]);
  const byName = Object.fromEntries(templates.map(t => [t.name, t]));
  const css = fonts.map(f => `@font-face{font-family:'${f.family}';src:url(data:font/otf;base64,${f.base64})}`).join('');
  const layout = defaultLayout(tipo, fotos, cierre);
  const dataUrls = {};
  for (const p of fotos) {
    const blob = photoBlob(p.copia);
    if (!blob) throw new Error('Falta cargar alguna foto. Esperá a que aparezcan todas y probá de nuevo.');
    dataUrls[p.copia] = await blobToDataUrl(blob);
  }
  const out = [];
  for (const slide of layout) {
    const wanted = estilo === 'noche' ? `${slide.plantilla}-noche` : slide.plantilla;
    const tpl = (byName[wanted] && byName[wanted].ok) ? byName[wanted] : byName[slide.plantilla];
    if (!tpl || !tpl.ok) throw new Error(`La plantilla ${wanted} no está en Plantillas o tiene problemas.`);
    const doc = new DOMParser().parseFromString(tpl.svg, 'image/svg+xml');
    const root = doc.documentElement;
    const W = Number(root.getAttribute('width')) || 1080, H = Number(root.getAttribute('height')) || 1350;
    slide.fotos.forEach((p, i) => {
      const el = doc.getElementById(`foto-${i + 1}`);
      if (!el) return;
      el.setAttribute('href', dataUrls[p.copia]);
      el.setAttributeNS(XLINK, 'xlink:href', dataUrls[p.copia]);
    });
    let warning = '';
    const barrioEl = doc.getElementById('campo-barrio');
    if (barrioEl) warning = fitText(barrioEl, String(barrio || '').toLocaleUpperCase('es-AR'), W);
    const style = doc.createElementNS(SVG_NS, 'style');
    style.textContent = css;
    root.insertBefore(style, root.firstChild);
    const blob = await rasterize(new XMLSerializer().serializeToString(doc), W, H);
    out.push({ plantilla: tpl.name, blob, url: URL.createObjectURL(blob), warning });
  }
  return out;
}

export const blobToBase64 = blob => blobToDataUrl(blob).then(u => u.slice(u.indexOf(',') + 1));
