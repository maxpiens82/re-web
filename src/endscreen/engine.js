// =====================================================================================
// Motor del end screen de RE!
//
// Funciones puras: parámetros + tiempo -> cuadro. No usa React ni el DOM (solo un canvas),
// así que corre igual en la vista previa, en la exportación y en los tests de Node.
//
//   const scene = createScene(params, assets, { createCanvas });
//   drawFrame(ctx, scene, t);           // t en segundos, de 0 a scene.p.dur
//
// Todo depende solo de (params, t): la misma semilla da siempre el mismo video.
// =====================================================================================

export const RE_COLORS = { grafito: '#1D1E20', naranja: '#E53B12', gris: '#EAEAEA', apagado: '#A8A8A8', blanco: '#FFFFFF' };

// Zonas seguras medidas sobre la plantilla de Reels de Instagram (_RE!/plantillas en MARCAS):
// arriba 250 px, abajo 385 px, izquierda 70, derecha 55, y debajo de y=1110 la columna de
// botones ocupa 193 px a la derecha. Solo aplica a 9:16. En 4:5, la grilla del perfil
// recorta 34 px por lado.
export const FORMATS = {
  '9x16': { W: 1080, H: 1920, label: 'Vertical 9:16 · Reels / Stories',
    safe: { top: 250, bottom: 1535, left: 70, right: 1025, notchY: 1110, notchRight: 887 } },
  '4x5': { W: 1080, H: 1350, label: 'Feed 4:5', safe: { top: 40, bottom: 1310, left: 74, right: 1006 } },
  '1x1': { W: 1080, H: 1080, label: 'Cuadrado 1:1', safe: { top: 40, bottom: 1040, left: 40, right: 1040 } },
  '16x9': { W: 1920, H: 1080, label: 'Horizontal 16:9 · YouTube', safe: { top: 54, bottom: 1026, left: 96, right: 1824 } },
};

export const TEMPLATES = { re: 'RE!', cobrand: 'Producción para' };

export const FPS_OPTIONS = [24, 25, 30, 60];

// Cómo se mueven las partículas: en una dirección (driftAngle), o radial desde/hacia el centro del
// resplandor (más rápido cuanto más lejos del centro, así el medio nunca se vacía).
export const DRIFT_MODES = { direccion: 'En una dirección', afuera: 'Radial hacia afuera', adentro: 'Radial hacia adentro' };

export const DEFAULTS = Object.freeze({
  template: 're',
  format: '9x16',
  dur: 5,
  fps: 30,
  tag: 'CONTENIDO AUDIOVISUAL\nPARA REAL ESTATE',
  web: 'somosreok.com',
  wa: 'WhatsApp 11 6887-6507',
  ig: '@somos.re.ok',
  label: 'PRODUCCIÓN PARA',
  client: { name: '', instagram: '', accent: '' },
  // Movimiento: valores de Max, revisión del 31 Oct 2026 (antes 0.42 / 0.14 / 0.02 / 1.06).
  trkStart: 0.8,
  trkEnd: 0.4,
  breath: 0.02,
  zoom: 1.13,
  density: 1,
  seed: 7,
  fadeIn: 0,
  fadeOut: 0,
  // Ángulos en grados, 0° = a la derecha, 90° = hacia arriba. 30° es el ángulo del logo; 67° es
  // el "arriba y a la derecha" de siempre.
  glowAngle: 30,
  driftAngle: 67,
  driftMode: 'direccion',
});

// Rangos de los controles numéricos (la UI se arma con esto, así no se desincroniza).
export const CONTROLS = {
  dur: { label: 'Duración', min: 3, max: 8, step: 0.5, unit: 's' },
  trkStart: { label: 'Tracking inicial', min: 0, max: 1.5, step: 0.01, unit: 'em', advanced: true },
  trkEnd: { label: 'Tracking final', min: 0, max: 0.8, step: 0.01, unit: 'em', advanced: true },
  breath: { label: 'Respiración del tracking', min: 0, max: 0.06, step: 0.005, unit: 'em', advanced: true },
  zoom: { label: 'Zoom out de textos', min: 1, max: 1.15, step: 0.005, unit: '%', advanced: true },
  glowAngle: { label: 'Ángulo del resplandor', min: 0, max: 180, step: 1, unit: '°', advanced: true },
  density: { label: 'Densidad de partículas', min: 0, max: 2, step: 0.1, unit: '×', advanced: true },
  driftAngle: { label: 'Dirección de las partículas', min: 0, max: 359, step: 1, unit: '°', advanced: true, drift: 'direccion' },
  seed: { label: 'Semilla de partículas', min: 1, max: 99, step: 1, unit: '', advanced: true },
  fadeIn: { label: 'Entrada desde negro', min: 0, max: 1, step: 0.1, unit: 's', advanced: true },
  fadeOut: { label: 'Salida a negro', min: 0, max: 1, step: 0.1, unit: 's', advanced: true },
};

// Fuentes: mismas familias y pesos que re-web (src/index.css): 300 = Light Extended, 500 = Extended.
export const DEFAULT_FONTS = { light: '300 {px}px AkzidenzGrotesk', regular: '500 {px}px AkzidenzGrotesk' };

const HEX = /^#[0-9a-f]{6}$/i;
const nfc = s => String(s ?? '').normalize('NFC');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const clamp01 = x => clamp(x, 0, 1);
export const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const relLum = rgb => { const c = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

/**
 * Color de acento que se vea sobre el grafito: si es muy oscuro (un azul marino, un negro),
 * se aclara mezclándolo con blanco hasta un contraste mínimo de 3:1. El tono se conserva.
 */
export function legibleAccent(hex) {
  const bg = relLum(hexRgb(RE_COLORS.grafito));
  let rgb = hexRgb(hex);
  for (let i = 0; i < 20 && (relLum(rgb) + 0.05) / (bg + 0.05) < 3; i++) rgb = rgb.map(v => v + (255 - v) * 0.12);
  return toHex(rgb);
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Completa y acota los parámetros. Lo que no se reconoce se descarta. */
export function normalizeParams(input = {}) {
  const p = { ...DEFAULTS, ...input, client: { ...DEFAULTS.client, ...(input.client || {}) } };
  if (!TEMPLATES[p.template]) p.template = DEFAULTS.template;
  if (!FORMATS[p.format]) p.format = DEFAULTS.format;
  if (!FPS_OPTIONS.includes(+p.fps)) p.fps = DEFAULTS.fps;
  if (!DRIFT_MODES[p.driftMode]) p.driftMode = DEFAULTS.driftMode;
  p.fps = +p.fps;
  for (const [k, c] of Object.entries(CONTROLS)) {
    const v = Number(p[k]);
    p[k] = Number.isFinite(v) ? clamp(v, c.min, c.max) : DEFAULTS[k];
  }
  if (p.fadeIn + p.fadeOut > p.dur / 2) { p.fadeIn = Math.min(p.fadeIn, p.dur / 4); p.fadeOut = Math.min(p.fadeOut, p.dur / 4); }
  // Textos en NFC (lo que viene de Sheets/Drive puede estar descompuesto, y el tracking cuenta
  // letras) y tal cual se escriben: con espacios. Se recortan al diagramar y en fileName.
  for (const k of ['tag', 'web', 'wa', 'ig', 'label']) p[k] = nfc(p[k]).replace(/\\n/g, '\n');
  p.client.accent = HEX.test(p.client.accent) ? p.client.accent : '';
  p.client.instagram = nfc(p.client.instagram);
  p.client.name = nfc(p.client.name);
  const f = FORMATS[p.format];
  p.W = f.W; p.H = f.H;
  p.accent = p.template === 'cobrand' && p.client.accent ? legibleAccent(p.client.accent) : RE_COLORS.naranja;
  return p;
}

/** El Instagram del cliente como se muestra: recortado y con @. */
export function clientHandle(client) {
  const h = String(client?.instagram || '').trim();
  return h && !h.startsWith('@') ? '@' + h : h;
}

/** Nombre del archivo exportado. */
export function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
export function fileName(params) {
  const p = normalizeParams(params);
  const who = p.template === 'cobrand' ? (slug(p.client.name) || 'cliente') : 're';
  return `RE_endscreen_${who}_${p.format}_${p.fps}fps.mp4`;
}

// -------------------------------------------------------------------------------------
// Diseño de cada plantilla. y = desplazamiento relativo al centro, en unidades de 1080 px
// (luego se escala con S). t0 = cuándo entra, d = duración del fundido, trk = cuánto del
// tracking animado recibe esa línea.
// -------------------------------------------------------------------------------------
function layoutFor(p) {
  if (p.template === 're') {
    return [
      { kind: 'text', key: 'tag', text: p.tag, font: 'light', size: 34, y: -0.33, color: RE_COLORS.gris, t0: 0.45, d: 0.9, trk: 1 },
      { kind: 'reLogo', w: 430, y: 0.02, t0: 0, d: 0.9, pop: true },
      { kind: 'rule', w: 60, h: 3, y: 0.235, t0: 0.85, d: 0.6, color: p.accent },
      { kind: 'text', key: 'web', text: p.web, font: 'light', size: 46, y: 0.39, color: RE_COLORS.blanco, t0: 1.05, d: 0.75, trk: 0.6 },
      { kind: 'text', key: 'wa', text: p.wa, font: 'light', size: 32, y: 0.455, color: RE_COLORS.apagado, t0: 1.25, d: 0.75, trk: 0.6 },
      { kind: 'text', key: 'ig', text: p.ig, font: 'regular', size: 32, y: 0.51, color: p.accent, t0: 1.45, d: 0.75, trk: 0.5 },
    ];
  }
  return [
    { kind: 'text', key: 'label', text: p.label, font: 'regular', size: 30, y: -0.36, color: RE_COLORS.apagado, t0: 0.3, d: 0.9, trk: 1 },
    { kind: 'client', side: 330, w: 700, h: 300, y: -0.12, t0: 0.1, d: 0.9, pop: true },
    { kind: 'text', key: 'clientIg', text: clientHandle(p.client), font: 'light', size: 36, y: 0.06, color: RE_COLORS.blanco, t0: 0.7, d: 0.75, trk: 0.6 },
    { kind: 'rule', w: 60, h: 3, y: 0.16, t0: 0.95, d: 0.6, color: p.accent },
    { kind: 'reLogo', w: 190, y: 0.3, t0: 1.1, d: 0.8 },
    { kind: 'text', key: 'web', text: p.web, font: 'light', size: 36, y: 0.44, color: RE_COLORS.blanco, t0: 1.35, d: 0.75, trk: 0.6 },
    { kind: 'text', key: 'ig', text: p.ig, font: 'regular', size: 30, y: 0.5, color: RE_COLORS.naranja, t0: 1.5, d: 0.75, trk: 0.5 },
  ].filter(it => it.kind !== 'text' || it.text.trim());
}

/** Ancho máximo permitido para algo centrado horizontalmente que ocupa [top, bottom]. */
export function allowedWidth(format, top, bottom) {
  const f = FORMATS[format], s = f.safe, cx = f.W / 2;
  let right = s.right;
  if (s.notchY != null && bottom > s.notchY) right = Math.min(right, s.notchRight);
  return 2 * Math.max(0, Math.min(cx - s.left, right - cx));
}

function fontString(fonts, which, px) { return fonts[which].replace('{px}', px.toFixed(2)); }

function lineWidth(ctx, line, em, px) {
  // Se mide sin letterSpacing y se suma el espaciado entre letras: igual en todos los navegadores.
  ctx.letterSpacing = '0px';
  const n = [...line].length;
  return ctx.measureText(line).width + em * px * Math.max(0, n - 1);
}

// Cuadros: la exportación dibuja frameCount cuadros en frameTime(i); el último es lastFrameTime,
// no dur. El fundido a negro termina ahí, así el último cuadro exportado es negro de verdad.
export const frameCount = p => Math.max(1, Math.round(p.dur * p.fps));
export const frameTime = (p, i) => i / p.fps;
export const lastFrameTime = p => frameTime(p, frameCount(p) - 1);

/** Escala de la capa de contenido en t: arranca en p.zoom y termina en 1. */
export const zoomAt = (p, t) => 1 + (p.zoom - 1) * (1 - easeOut(t / p.dur));
/** Cuánto más abajo está un elemento mientras entra (sube hasta su lugar). */
const riseAt = (it, t, S) => (1 - easeOut((t - it.t0) / it.d)) * 18 * S;

// Una línea "se ve" desde este alfa (los tests cuentan píxeles con alfa >= 40/255).
const VISIBLE_ALPHA = 0.15;

/** Ancho disponible (sin zoom) para un bloque de texto centrado en y, de alto h, con zoom z. */
function availableWidth(scene, y, h, z) {
  const { p, cy } = scene;
  const top = cy + (y - h / 2 - cy) * z, bottom = cy + (y + h / 2 - cy) * z;
  return allowedWidth(p.format, top, bottom) / z;
}

/** Tracking (em) de una línea en el instante t: abre ancho, cierra con ease-out y "respira". */
export function trackingAt(p, t, t0, mul = 1) {
  const k = easeOut((t - t0) / 1.3);
  return mul * (p.trkEnd + (p.trkStart - p.trkEnd) * (1 - k) + p.breath * k * (0.5 + 0.5 * Math.sin((t - t0) * 1.4)));
}

// -------------------------------------------------------------------------------------
// Escena: todo lo que no cambia con t se calcula una vez (fondo, partículas, posiciones,
// tamaños de texto ajustados al ancho disponible).
// -------------------------------------------------------------------------------------
export function createScene(params, assets = {}, opts = {}) {
  const p = normalizeParams(params);
  const createCanvas = opts.createCanvas || ((w, h) => new OffscreenCanvas(w, h));
  const fonts = opts.fonts || DEFAULT_FONTS;
  const S = Math.min(p.W / 1080, 0.62 * p.H / 950, 1);
  // El contenido se centra en la zona que Instagram deja ver, no en el cuadro: en 9:16 esa zona
  // está 67 px más arriba (Max, 31 Oct 2026). En los otros formatos es lo mismo.
  const safe = FORMATS[p.format].safe;
  const cx = p.W / 2, cy = (safe.top + safe.bottom) / 2;
  const measure = createCanvas(8, 8).getContext('2d');
  const items = layoutFor(p).map(it => ({ ...it, cy: cy + it.y * 1080 * S }));

  const geo = { p, cy };
  for (const it of items) {
    if (it.kind !== 'text') continue;
    const lines = it.text.split('\n').map(l => l.trim());
    const gaps = lines.map(l => Math.max(0, [...l].length - 1));
    const lh = 1.45;
    // Instantes en que la línea ya se ve, cada 1/60 s: con el tracking de ese momento (el más
    // ancho es al entrar), el zoom de ese momento y la subida de la entrada incluida.
    const when = [];
    for (let t = it.t0; t <= p.dur + 1e-9; t += 1 / 60) if (easeOut((t - it.t0) / it.d) >= VISIBLE_ALPHA) when.push(t);
    // withTracking = false: sin espaciado entre letras (lo mínimo que puede ocupar a ese tamaño).
    const fits = (px, withTracking = true) => {
      measure.font = fontString(fonts, it.font, px);
      measure.letterSpacing = '0px';
      const base = lines.map(l => measure.measureText(l).width);
      return when.every(t => {
        const em = withTracking ? trackingAt(p, t, it.t0, it.trk) : 0;
        const w = Math.max(...base.map((b, i) => b + em * px * gaps[i]));
        return w <= availableWidth(geo, it.cy + riseAt(it, t, S), px * lh * lines.length, zoomAt(p, t));
      });
    };
    // Se achican tamaño y tracking juntos, de a 3%, hasta el 50%. Si a ese tamaño todavía no entra
    // con su tracking, drawText le pone tope al tracking. Si no entra ni sin tracking, la escena
    // queda marcada (overflow) y la pantalla no deja exportar hasta que se acorte el texto.
    const full = it.size * S, minPx = full * 0.5;
    let px = full;
    while (!fits(px) && px > minPx) px *= 0.97;
    it.px = Math.max(px, minPx); it.lines = lines; it.lh = lh;
    it.fitted = it.px < full - 0.01;
    it.overflow = !fits(it.px, false);
  }

  const client = assets.client || null;
  return { p, S, cx, cy, fonts, items, assets: { reLogo: assets.reLogo || null, client },
    overflow: items.filter(it => it.overflow).map(it => it.key),
    bg: buildBackground(p, createCanvas), particles: buildParticles(p) };
}

// ---------- fondo: grafito + resplandor diagonal a glowAngle (30° = el ángulo del logo) + viñeta ----------
function buildBackground(p, createCanvas) {
  const c = createCanvas(p.W, p.H), g = c.getContext('2d');
  g.fillStyle = RE_COLORS.grafito; g.fillRect(0, 0, p.W, p.H);
  const [r, gg, b] = hexRgb(p.accent), cx = p.W / 2, cy = p.H * 0.47, L = Math.max(p.W, p.H);
  g.save(); g.translate(cx, cy); g.rotate(-p.glowAngle * Math.PI / 180); g.scale(1, 0.27);
  const rad = g.createRadialGradient(0, 0, 0, 0, 0, L * 0.95);
  rad.addColorStop(0, `rgba(${r},${gg},${b},0.24)`);
  rad.addColorStop(0.45, `rgba(${r},${gg},${b},0.10)`);
  rad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = rad; g.fillRect(-L * 2, -L * 4, L * 4, L * 8); g.restore();
  const vig = g.createRadialGradient(cx, cy, L * 0.25, cx, cy, L * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vig; g.fillRect(0, 0, p.W, p.H);
  return c;
}

// ---------- partículas: polvo fino concentrado en la banda + bokeh suave ----------
// Velocidades: en modo 'direccion', ~15 px/s (polvo) y ~10 px/s (bokeh) hacia driftAngle, con algo
// de variación propia. En modo radial, una tasa: la distancia al centro crece (afuera) o se achica
// (adentro) ~2,5 %/s.
const DUST_SPEED = 15, BOKEH_SPEED = 10, DUST_RATE = 0.025, BOKEH_RATE = 0.017;

function buildParticles(p) {
  const rnd = mulberry32(p.seed * 9973), S = Math.min(p.W, p.H) / 1080, cx = p.W / 2, cy = p.H * 0.47;
  const g = -p.glowAngle * Math.PI / 180, ca = Math.cos(g), sa = Math.sin(g);
  const a = p.driftAngle * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a);  // y de la pantalla va hacia abajo
  // Hacia adentro, lo que hoy está en el borde termina más cerca del centro: se siembra un área más
  // grande (con la misma densidad) para que los bordes no se vacíen.
  const grow = p.driftMode === 'adentro' ? 1 / (1 - DUST_RATE * 1.3 * p.dur) : 1;
  const spanX = (p.W + 120) * grow, spanY = (p.H + 120) * grow;
  const n = Math.round(2600 * p.density * (p.W * p.H) / (1080 * 1920) * grow * grow), dust = [];
  const velocity = (speed, along, across) => [(dx * along - dy * across) * speed * S, (dy * along + dx * across) * speed * S];
  let guard = 0;
  while (dust.length < n && guard++ < n * 20) {
    const x = p.W / 2 + (rnd() - 0.5) * spanX, y = p.H / 2 + (rnd() - 0.5) * spanY;
    const u = (x - cx) * ca - (y - cy) * sa, v = (x - cx) * sa + (y - cy) * ca;
    const pr = 0.12 + 0.88 * Math.exp(-((v / (330 * S)) ** 2)) * Math.exp(-((u / (1200 * S)) ** 2));
    if (rnd() < pr) {
      const along = 1 + (rnd() - 0.5) * 0.6, across = (rnd() - 0.5) * 0.5;
      const [vx, vy] = velocity(DUST_SPEED, along, across);
      dust.push({ x, y, s: (0.6 + rnd() * 1.6) * S, a: 0.15 + rnd() * 0.6, vx, vy, rate: DUST_RATE * along,
        ph: rnd() * 6.283, tw: 0.6 + rnd() * 1.6, warm: rnd() < 0.35 });
    }
  }
  const bok = [], nb = Math.round(34 * Math.min(p.density, 1.5));
  for (let i = 0; i < nb; i++) {
    const x = rnd() * p.W, y = rnd() * p.H, r = (14 + rnd() * 46) * S, al = 0.03 + rnd() * 0.07;
    const along = 1 + (rnd() - 0.5) * 0.6, across = (rnd() - 0.5) * 0.6;
    const [vx, vy] = velocity(BOKEH_SPEED, along, across);
    bok.push({ x, y, r, a: al, vx, vy, rate: BOKEH_RATE * along, ph: rnd() * 6.283 });
  }
  return { dust, bok, cx, cy };
}

// Dónde está una partícula en t (sin el temblor propio).
function particleAt(p, parts, k, t) {
  if (p.driftMode === 'direccion') return [k.x + k.vx * t, k.y + k.vy * t];
  const f = 1 + (p.driftMode === 'afuera' ? 1 : -1) * k.rate * t;
  return [parts.cx + (k.x - parts.cx) * f, parts.cy + (k.y - parts.cy) * f];
}

function drawParticles(g, scene, t) {
  const { p } = scene, parts = scene.particles, { dust, bok } = parts;
  for (const k of bok) {
    let [x, y] = particleAt(p, parts, k, t);
    // En una dirección, el bokeh que sale por un borde vuelve a entrar por el otro.
    if (p.driftMode === 'direccion') { x = ((x % p.W) + p.W) % p.W; y = ((y % p.H) + p.H) % p.H; }
    const a = k.a * (0.8 + 0.2 * Math.sin(t * 1.3 + k.ph));
    const gr = g.createRadialGradient(x, y, 0, x, y, k.r);
    gr.addColorStop(0, `rgba(255,214,196,${a})`); gr.addColorStop(0.7, `rgba(255,214,196,${a * 0.8})`); gr.addColorStop(1, 'rgba(255,214,196,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, k.r, 0, 6.283); g.fill();
  }
  for (const d of dust) {
    const [px, py] = particleAt(p, parts, d, t);
    const x = px + 9 * Math.sin(t * 0.7 + d.ph), y = py + 9 * Math.cos(t * 0.5 + d.ph);
    g.globalAlpha = d.a * (0.55 + 0.45 * Math.sin(t * d.tw * 2 + d.ph));
    g.fillStyle = d.warm ? '#FFAA8C' : '#F0F0F0';
    g.beginPath(); g.arc(x, y, d.s, 0, 6.283); g.fill();
  }
  g.globalAlpha = 1;
}

// ---------- texto con tracking animado, centrado ----------
// z = zoom de la capa en este cuadro. El tracking de cada línea tiene un tope: nunca la hace más
// ancha que lo disponible en ese lugar y momento (tampoco al dibujar letra por letra, que mide
// un poco distinto).
function drawText(g, scene, it, alpha, em, dy, z = 1) {
  g.font = fontString(scene.fonts, it.font, it.px);
  g.fillStyle = it.color; g.globalAlpha = alpha; g.textBaseline = 'middle'; g.textAlign = 'left';
  const lh = it.px * it.lh;
  const avail = availableWidth(scene, it.cy + dy, lh * it.lines.length, z);
  const native = 'letterSpacing' in g;
  it.lines.forEach((ln, i) => {
    const yy = it.cy + dy + (i - (it.lines.length - 1) / 2) * lh;
    const chars = [...ln];
    const ws = native ? null : chars.map(ch => g.measureText(ch).width);
    const base = native ? lineWidth(g, ln, 0, it.px) : ws.reduce((a, b) => a + b, 0);
    const gaps = Math.max(0, chars.length - 1);
    const sp = gaps ? Math.max(0, Math.min(em * it.px, (avail - base) / gaps)) : 0;
    if (native) {
      // letterSpacing también agrega espacio después de la última letra: se mide sin él.
      g.letterSpacing = sp + 'px';
      g.fillText(ln, scene.cx - (base + sp * gaps) / 2, yy);
      g.letterSpacing = '0px';
    } else {
      let xx = scene.cx - (base + sp * gaps) / 2;
      chars.forEach((ch, k) => { g.fillText(ch, xx, yy); xx += ws[k] + sp; });
    }
  });
  g.globalAlpha = 1;
}

// Tamaño óptico parejo: un logo apaisado (RE/MAX Advance) y uno cuadrado (XO, Braulio) ocupan
// más o menos la misma superficie, sin pasarse de un ancho y un alto máximos.
function markSize(iw, ih, side, maxW, maxH) {
  const ar = iw / ih;
  let w = side * Math.sqrt(ar), h = side / Math.sqrt(ar);
  const k = Math.min(1, maxW / w, maxH / h);
  return [w * k, h * k];
}

function drawClient(g, scene, it, alpha, sc, z) {
  const { S, cx } = scene, m = scene.assets.client;
  const y = it.cy;
  g.globalAlpha = alpha;
  if (m && (m.mode === 'logo' || m.mode === 'silhouette')) {
    const [w, h] = markSize(m.image.width, m.image.height, it.side * S, it.w * S, it.h * S);
    g.drawImage(m.image, cx - w * sc / 2, y - h * sc / 2, w * sc, h * sc);
  } else if (m && m.mode === 'plate') {
    // Logo pensado para fondo claro y de varios colores: va sobre una placa gris claro.
    const [w, h] = markSize(m.image.width, m.image.height, it.side * 0.8 * S, it.w * 0.82 * S, it.h * 0.7 * S);
    const padX = 34 * S, padY = 26 * S;
    const pw = (w + 2 * padX) * sc, ph = (h + 2 * padY) * sc, r = 16 * S;
    g.fillStyle = RE_COLORS.gris;
    g.beginPath(); g.roundRect(cx - pw / 2, y - ph / 2, pw, ph, r); g.fill();
    g.drawImage(m.image, cx - w * sc / 2, y - h * sc / 2, w * sc, h * sc);
  } else {
    // Sin logo: el nombre de la inmobiliaria en Akzidenz.
    const name = (scene.p.client.name.trim() || (m && m.name) || 'INMOBILIARIA').toUpperCase();
    const maxW = it.w * 0.9 * S;
    let px = 60 * S;
    g.font = fontString(scene.fonts, 'light', px);
    while (lineWidth(g, name, 0.12, px) > maxW && px > 20 * S) { px *= 0.95; g.font = fontString(scene.fonts, 'light', px); }
    drawText(g, scene, { ...it, font: 'light', px, lh: 1.45, lines: [name], color: RE_COLORS.blanco }, alpha, 0.12, 0, z);
  }
  g.globalAlpha = 1;
}

/** Capa de contenido: textos, logos y filete. Es la única que hace zoom out. */
function drawContent(g, scene, t) {
  const { p, S, cx, cy } = scene;
  const z = zoomAt(p, t);
  g.save(); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
  for (const it of scene.items) {
    const a = easeOut((t - it.t0) / it.d);
    if (a <= 0) continue;
    const rise = riseAt(it, t, S);
    if (it.kind === 'text') drawText(g, scene, it, a, trackingAt(p, t, it.t0, it.trk), rise, z);
    else if (it.kind === 'rule') {
      const w = it.w * S * a; g.fillStyle = it.color; g.fillRect(cx - w / 2, it.cy, w, it.h * S);
    } else if (it.kind === 'reLogo' && scene.assets.reLogo) {
      const img = scene.assets.reLogo, w = it.w * S, h = w * img.height / img.width, sc = it.pop ? 1.04 - 0.04 * a : 1;
      g.globalAlpha = a; g.drawImage(img, cx - w * sc / 2, it.cy - h * sc / 2, w * sc, h * sc); g.globalAlpha = 1;
    } else if (it.kind === 'client') drawClient(g, scene, it, a, it.pop ? 1.04 - 0.04 * a : 1, z);
  }
  g.restore();
}

/**
 * Dibuja el cuadro del instante t.
 * layers: 'all' (por defecto) o 'content' (solo textos y logos sobre transparente; lo usan los tests).
 */
export function drawFrame(g, scene, t, { layers = 'all' } = {}) {
  const { p } = scene;
  if (layers === 'content') g.clearRect(0, 0, p.W, p.H);
  else {
    g.drawImage(scene.bg, 0, 0);
    drawParticles(g, scene, t);       // las partículas no hacen zoom
  }
  drawContent(g, scene, t);           // textos y logos: tracking animado + zoom out
  if (layers === 'all') {
    const end = lastFrameTime(p);
    const black = Math.max(p.fadeIn > 0 ? 1 - clamp01(t / p.fadeIn) : 0,
      p.fadeOut > 0 ? clamp01((t - (end - p.fadeOut)) / p.fadeOut) : 0);
    if (black > 0) { g.globalAlpha = black; g.fillStyle = '#000'; g.fillRect(0, 0, p.W, p.H); g.globalAlpha = 1; }
  }
}

/** Guía de zona segura para la vista previa (no se exporta). */
export function drawSafeZone(g, scene) {
  const f = FORMATS[scene.p.format], s = f.safe;
  g.save();
  g.fillStyle = 'rgba(229,59,18,0.18)';
  g.beginPath();
  g.rect(0, 0, f.W, f.H);
  g.moveTo(s.left, s.top);
  if (s.notchY != null) {
    g.lineTo(s.left, s.bottom); g.lineTo(s.notchRight, s.bottom); g.lineTo(s.notchRight, s.notchY);
    g.lineTo(s.right, s.notchY); g.lineTo(s.right, s.top);
  } else { g.lineTo(s.left, s.bottom); g.lineTo(s.right, s.bottom); g.lineTo(s.right, s.top); }
  g.closePath();
  g.fill('evenodd');
  g.restore();
}

/** Momento a partir del cual todo ya entró (útil para miniaturas y tests). */
export function settledTime(scene) {
  return Math.max(...scene.items.map(it => it.t0 + it.d), 1.3 + Math.max(...scene.items.map(it => it.t0)));
}
