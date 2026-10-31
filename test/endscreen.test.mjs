// Tests del motor del end screen con un canvas de Node (@napi-rs/canvas).
// Corren con: npm run test:endscreen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import {
  FORMATS, TEMPLATES, DEFAULTS, normalizeParams, createScene, drawFrame, settledTime, fileName, allowedWidth,
  clientHandle, frameCount, lastFrameTime,
} from '../src/endscreen/engine.js';
import { prepareClientMark } from '../src/endscreen/clientMark.js';
import { reLogoSvg } from '../src/endscreen/reLogo.js';

// Las fuentes del portal (public/font), o FONT_DIR. Si no se cargan, los tests medirían con otra
// letra y no probarían nada: se corta acá.
const FONT_DIR = process.env.FONT_DIR || fileURLToPath(new URL('../public/font', import.meta.url));
const fontsOk = ['AkzidenzGrotesk-LightExtended.otf', 'AkzidenzGrotesk-Extended.otf']
  .map(f => GlobalFonts.registerFromPath(`${FONT_DIR}/${f}`, 'AkzidenzGrotesk'));
if (!fontsOk.every(Boolean)) throw new Error(`No se pudieron cargar las fuentes de ${FONT_DIR}`);

const reLogo = await loadImage(Buffer.from(reLogoSvg('#E53B12', 800)));
const opts = { createCanvas };

// Un logo de prueba: rectángulos del color pedido.
function fakeLogo(colors, w = 600, h = 200) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  colors.forEach((col, i) => { g.fillStyle = col; g.fillRect(20 + i * (w - 40) / colors.length, 40, (w - 40) / colors.length - 10, h - 80); });
  return c;
}

/**
 * Píxeles visibles de la capa de contenido que caen fuera de la zona segura (hasta 3).
 * ignoreBottom: no mira debajo del límite inferior (ese caso de 9:16 se mide aparte, ver KNOWN).
 */
function outsideSafe(scene, t, canvas, wrap, { ignoreBottom = false } = {}) {
  const { W, H, format } = scene.p, s = FORMATS[format].safe;
  const g = canvas.getContext('2d');
  drawFrame(wrap ? wrap(g) : g, scene, t, { layers: 'content' });
  const d = g.getImageData(0, 0, W, H).data;
  const hits = [];
  const scan = (y, x0, x1) => { for (let x = x0; x < x1 && hits.length < 3; x++) if (d[(y * W + x) * 4 + 3] >= 40) hits.push([x, y]); };
  for (let y = 0; y < H && hits.length < 3; y++) {
    if (y > s.bottom && ignoreBottom) break;
    if (y < s.top || y > s.bottom) { scan(y, 0, W); continue; }
    const right = s.notchY != null && y > s.notchY ? s.notchRight : s.right;
    scan(y, 0, s.left); scan(y, right + 1, W);
  }
  return hits;
}

const instants = p => { const ts = []; for (let k = 0; k / 15 <= lastFrameTime(p) + 1e-9; k++) ts.push(k / 15); return ts; };

/** Cada 1/15 s, de 0 al último cuadro exportado. Devuelve el primer instante con algo afuera. */
function firstEscape(scene, wrap, o) {
  const canvas = createCanvas(scene.p.W, scene.p.H);
  for (const t of instants(scene.p)) {
    const hits = outsideSafe(scene, t, canvas, wrap, o);
    if (hits.length) return { t, hits };
  }
  return null;
}

/** Cuántos px por debajo del límite inferior llega el contenido, en el peor instante. */
function belowBottom(scene) {
  const { W, H, format } = scene.p, limit = FORMATS[format].safe.bottom;
  const canvas = createCanvas(W, H), g = canvas.getContext('2d');
  let worst = { px: 0, t: 0 };
  for (const t of instants(scene.p)) {
    drawFrame(g, scene, t, { layers: 'content' });
    const d = g.getImageData(0, limit + 1, W, H - limit - 1).data;
    for (let i = d.length - 1; i >= 3; i -= 4) {
      if (d[i] >= 40) { const px = Math.floor((i >> 2) / W) + 1; if (px > worst.px) worst = { px, t }; break; }
    }
  }
  return worst;
}

// El mismo contexto, pero sin letterSpacing: obliga al dibujo letra por letra (navegadores viejos).
function withoutLetterSpacing(g) {
  return new Proxy(g, {
    has: (target, k) => k !== 'letterSpacing' && k in target,
    get: (target, k) => { const v = target[k]; return typeof v === 'function' ? v.bind(target) : v; },
    set: (target, k, v) => { target[k] = v; return true; },
  });
}

const TEXTS = {
  normales: { client: { name: 'Inmobiliaria', instagram: '@inmobiliaria' } },
  largos: {
    tag: 'CONTENIDO AUDIOVISUAL Y FOTOGRAFÍA\nPARA REAL ESTATE Y DESARROLLOS',
    web: 'www.unawebmuchisimomaslargadelonormal.com.ar',
    wa: 'WhatsApp +54 9 11 6887-6507 · 11 5555-5555',
    ig: '@somos.re.ok.produccionesaudiovisuales',
    label: 'PRODUCCIÓN AUDIOVISUAL PARA',
    client: { name: 'Coldwell Banker Seniority', instagram: '@coldwellbankerseniorityargentina' },
  },
};

// Conocido (REDES_BUILD.md, paso 2): en 9:16 las líneas de abajo, mientras suben al entrar, pasan
// el límite inferior de Reels (RE!: ~17 px a t≈1,5 s; Producción para: ~3 px a t≈1,55 s). Ya
// asentadas quedan adentro. Es diseño, no ajuste de textos: va a la revisión de movimiento de Max
// y no se cambia sin él. Por eso en 9:16 el control general no mira el borde inferior, y ese borde
// tiene su propio test, marcado todo, que muestra la medida.
const KNOWN_BOTTOM = '9x16';
const KNOWN_TODO = 'conocido: las líneas de abajo entran por debajo del límite de Reels; revisión de movimiento';

function scene(template, format, texts, extra = {}) {
  const params = { template, format, ...texts, ...extra };
  const client = template === 'cobrand' ? prepareClientMark({ claro: fakeLogo(['#ffffff']), createCanvas }) : null;
  return createScene(params, { reLogo, client }, opts);
}

test('normalizeParams completa, acota y descarta lo inválido', () => {
  const p = normalizeParams({ template: 'nada', format: 'x', fps: 29, dur: 99, zoom: -3, seed: 'a', client: { instagram: 'remax', accent: 'rojo' } });
  assert.equal(p.template, 're'); assert.equal(p.format, '9x16'); assert.equal(p.fps, 30);
  assert.equal(p.dur, 8); assert.equal(p.zoom, 1); assert.equal(p.seed, DEFAULTS.seed);
  assert.equal(clientHandle(p.client), '@remax'); assert.equal(p.client.accent, '');
  assert.equal(p.accent, '#E53B12');
  assert.equal(normalizeParams({ template: 'cobrand', client: { accent: '#E53B12' } }).accent, '#E53B12');
  // Un azul marino se aclara para que se vea sobre el grafito, sin cambiar de tono.
  const navy = normalizeParams({ template: 'cobrand', client: { accent: '#083878' } }).accent;
  assert.notEqual(navy, '#083878');
  const [r, g, b] = [1, 3, 5].map(i => parseInt(navy.slice(i, i + 2), 16));
  assert.ok(b > r && b > g, `sigue siendo azul: ${navy}`);
  assert.equal(normalizeParams({ tag: 'A\\nB' }).tag, 'A\nB');
});

test('E1: los textos quedan tal cual se escriben, con espacios', () => {
  // Escribir "Juan Manuel" letra por letra: el estado intermedio "Juan " no pierde el espacio.
  assert.equal(normalizeParams({ client: { name: 'Juan ' } }).client.name, 'Juan ');
  assert.equal(normalizeParams({ client: { name: 'Juan Manuel' } }).client.name, 'Juan Manuel');
  assert.equal(normalizeParams({ client: { instagram: '@kw ' } }).client.instagram, '@kw ');
  assert.equal(clientHandle({ instagram: ' remax ' }), '@remax');
  assert.equal(fileName({ template: 'cobrand', client: { name: ' Juan Manuel ' } }), 'RE_endscreen_juan-manuel_9x16_30fps.mp4');
  const s = scene('cobrand', '4x5', { client: { name: 'Juan Manuel', instagram: ' jm.propiedades ' } });
  assert.deepEqual(s.items.find(it => it.key === 'clientIg').lines, ['@jm.propiedades']);
});

test('E11: textos en NFC', () => {
  assert.equal(normalizeParams({ web: 'México' }).web, 'México');
  assert.equal(normalizeParams({ client: { name: 'Matías Ríos' } }).client.name, 'Matías Ríos');
});

test('nombre de archivo', () => {
  assert.equal(fileName({}), 'RE_endscreen_re_9x16_30fps.mp4');
  assert.equal(fileName({ template: 'cobrand', format: '4x5', fps: 25, client: { name: 'RE/MAX Grupo Platino' } }), 'RE_endscreen_re-max-grupo-platino_4x5_25fps.mp4');
});

test('la zona segura de Reels achica el ancho debajo de los botones', () => {
  assert.equal(allowedWidth('9x16', 600, 700), 2 * (540 - 70));
  assert.equal(allowedWidth('9x16', 1300, 1400), 2 * (887 - 540));
});

for (const template of Object.keys(TEMPLATES)) {
  for (const format of Object.keys(FORMATS)) {
    test(`${template} ${format}: todo el contenido queda dentro de la zona segura`, () => {
      const s = scene(template, format, TEXTS.normales);
      const canvas = createCanvas(s.p.W, s.p.H);
      for (const t of [settledTime(s), s.p.dur - 0.01]) {
        assert.deepEqual(outsideSafe(s, t, canvas), [], `fuera de la zona segura en t=${t.toFixed(2)}`);
      }
    });
  }
}

// §8.3: cada 1/15 s de toda la animación (entradas incluidas), textos normales y largos.
for (const template of Object.keys(TEMPLATES)) {
  for (const format of Object.keys(FORMATS)) {
    for (const kind of Object.keys(TEXTS)) {
      const name = `${template} ${format} ${kind}`;
      test(`zona segura cada 1/15 s: ${name}`, () => {
        const s = scene(template, format, TEXTS[kind]);
        assert.deepEqual(s.overflow, []);
        const bad = firstEscape(s, null, { ignoreBottom: format === KNOWN_BOTTOM });
        assert.equal(bad, null, bad && `se sale en t=${bad.t.toFixed(2)} s: ${JSON.stringify(bad.hits)}`);
      });
      if (format === KNOWN_BOTTOM) {
        test(`borde inferior 9:16: ${template} ${kind}`, { todo: KNOWN_TODO }, () => {
          const w = belowBottom(scene(template, format, TEXTS[kind]));
          assert.equal(w.px, 0, `llega ${w.px} px debajo del límite en t=${w.t.toFixed(2)} s`);
        });
      }
    }
  }
}

// El mismo control dibujando letra por letra (contexto sin letterSpacing), con textos largos.
for (const template of Object.keys(TEMPLATES)) {
  for (const format of Object.keys(FORMATS)) {
    test(`zona segura letra por letra: ${template} ${format} largos`, () => {
      const s = scene(template, format, TEXTS.largos);
      const bad = firstEscape(s, withoutLetterSpacing, { ignoreBottom: format === KNOWN_BOTTOM });
      assert.equal(bad, null, bad && `se sale en t=${bad.t.toFixed(2)} s: ${JSON.stringify(bad.hits)}`);
    });
  }
}

test('textos largos se achican y no se salen (9:16, debajo de los botones)', () => {
  const p = { template: 'cobrand', format: '9x16', web: 'www.unawebmuchisimomaslargadelonormal.com.ar',
    client: { name: 'Coldwell Banker Seniority', instagram: '@coldwellbankerseniorityargentina' } };
  const s = createScene(p, { reLogo, client: prepareClientMark({ createCanvas }) }, opts);
  assert.ok(s.items.find(it => it.key === 'web').fitted);
  assert.deepEqual(outsideSafe(s, settledTime(s), createCanvas(s.p.W, s.p.H)), []);
});

test('un texto que no entra ni al 50% marca la escena (no se puede exportar)', () => {
  const s = createScene({ web: 'W'.repeat(120) }, { reLogo }, opts);
  assert.deepEqual(s.overflow, ['web']);
  assert.deepEqual(createScene({}, { reLogo }, opts).overflow, []);
});

test('mismo t y misma semilla dan el mismo cuadro; otra semilla, otro', () => {
  const hash = params => {
    const s = createScene(params, { reLogo }, opts);
    const c = createCanvas(s.p.W, s.p.H); drawFrame(c.getContext('2d'), s, 2.3);
    return createHash('sha1').update(c.getContext('2d').getImageData(0, 0, s.p.W, s.p.H).data).digest('hex');
  };
  assert.equal(hash({ seed: 7 }), hash({ seed: 7 }));
  assert.notEqual(hash({ seed: 7 }), hash({ seed: 8 }));
});

function meanLevel(g, W, H) {
  const d = g.getImageData(0, 0, W, H).data; let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
  return s / (d.length / 4) / 3;
}

test('fundidos a negro', () => {
  const s = createScene({ fadeIn: 0.5, fadeOut: 0.5 }, { reLogo }, opts);
  const c = createCanvas(s.p.W, s.p.H), g = c.getContext('2d');
  drawFrame(g, s, 0); assert.ok(meanLevel(g, s.p.W, s.p.H) < 0.5, 'arranca en negro');
  drawFrame(g, s, s.p.dur); assert.ok(meanLevel(g, s.p.W, s.p.H) < 0.5, 'termina en negro');
  drawFrame(g, s, 2.5); assert.ok(meanLevel(g, s.p.W, s.p.H) > 5, 'en el medio se ve');
});

test('E2: el último cuadro exportado es negro de verdad, a cualquier fps', () => {
  assert.equal(frameCount(normalizeParams({ dur: 5, fps: 30 })), 150);
  assert.equal(lastFrameTime(normalizeParams({ dur: 5, fps: 30 })), 149 / 30);
  for (const fps of [24, 25, 30, 60]) {
    const s = createScene({ format: '1x1', fadeOut: 0.5, fps }, { reLogo }, opts);
    const c = createCanvas(s.p.W, s.p.H), g = c.getContext('2d');
    drawFrame(g, s, lastFrameTime(s.p));
    assert.equal(meanLevel(g, s.p.W, s.p.H), 0, `${fps} fps: último cuadro`);
    drawFrame(g, s, lastFrameTime(s.p) - 0.6);
    assert.ok(meanLevel(g, s.p.W, s.p.H) > 5, `${fps} fps: antes del fundido se ve`);
  }
});

// Logos de prueba más parecidos a los kits reales de MARCAS.
function wordmark({ w = 700, h = 220, bg = null, parts }) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  for (const p of parts) {
    g.fillStyle = p.color;
    if (p.text) { g.font = p.font; g.textBaseline = 'middle'; g.fillText(p.text, p.x, p.y); }
    else g.fillRect(p.x, p.y, p.w, p.h);
  }
  return c;
}
const LOGOS = {
  claro: wordmark({ parts: [{ text: 'INLAZA', font: '500 120px AkzidenzGrotesk', color: '#FFFFFF', x: 30, y: 110 }] }),
  dosTonos: wordmark({ parts: [
    { text: 'BÖTTS', font: '500 120px AkzidenzGrotesk', color: '#083878', x: 30, y: 110 },
    { x: 560, y: 40, w: 110, h: 140, color: '#F07820' }] }),
  finoUnColor: wordmark({ parts: [{ text: 'Matías Ríos', font: '300 64px AkzidenzGrotesk', color: '#0A3D62', x: 20, y: 110 }] }),
  jpgConFondo: wordmark({ bg: '#FFFFFF', parts: [{ text: 'DELPARQUE', font: '500 90px AkzidenzGrotesk', color: '#1D3557', x: 20, y: 110 }] }),
};

test('logo del cliente: claro, oscuro de un color, oscuro de varios colores, nada', () => {
  assert.equal(prepareClientMark({ claro: fakeLogo(['#ffffff']), createCanvas }).mode, 'logo');
  assert.equal(prepareClientMark({ oscuro: fakeLogo(['#1a237e']), createCanvas }).mode, 'silhouette');
  assert.equal(prepareClientMark({ oscuro: fakeLogo(['#1a237e', '#ff6f00']), createCanvas }).mode, 'plate');
  assert.equal(prepareClientMark({ createCanvas }).mode, 'text');
  // Uno subido a mano gana, y se clasifica solo.
  assert.equal(prepareClientMark({ claro: fakeLogo(['#ffffff']), upload: fakeLogo(['#000000']), createCanvas }).mode, 'silhouette');
  // La silueta queda blanca.
  const s = prepareClientMark({ oscuro: fakeLogo(['#1a237e']), createCanvas }).image;
  const d = s.getContext('2d').getImageData(Math.floor(s.width / 2), Math.floor(s.height / 2), 1, 1).data;
  assert.deepEqual([...d], [255, 255, 255, 255]);
});

test('logos parecidos a los reales: palabra clara, dos tonos, fino de un color, JPG con fondo', () => {
  assert.equal(prepareClientMark({ claro: LOGOS.claro, createCanvas }).mode, 'logo');
  assert.equal(prepareClientMark({ upload: LOGOS.claro, createCanvas }).mode, 'logo');
  assert.equal(prepareClientMark({ oscuro: LOGOS.dosTonos, createCanvas }).mode, 'plate');
  assert.equal(prepareClientMark({ oscuro: LOGOS.finoUnColor, createCanvas }).mode, 'silhouette');
  assert.equal(prepareClientMark({ oscuro: LOGOS.jpgConFondo, createCanvas }).mode, 'plate');
  assert.equal(prepareClientMark({ upload: LOGOS.jpgConFondo, createCanvas }).mode, 'plate');
});

test('sin logo se escribe el nombre tal cual está en el campo', () => {
  const s = createScene({ template: 'cobrand', format: '4x5', client: { name: 'Juan Manuel' } },
    { reLogo, client: prepareClientMark({ createCanvas }) }, opts);
  assert.equal(s.p.client.name, 'Juan Manuel');
  assert.equal(firstEscape(s), null);
});
