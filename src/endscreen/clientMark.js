// Cómo se muestra el logo del cliente sobre el fondo grafito del end screen.
//
// Orden de preferencia (mismo criterio que MARCAS en REDES_SPEC.md):
//   1. logo_claro.png          -> 'logo'        (tal cual)
//   2. logo_oscuro.png de un color -> 'silhouette' (se pasa a blanco)
//   3. logo_oscuro.png de varios colores -> 'plate' (sobre una placa gris claro)
//   4. nada                    -> 'text'        (el nombre en Akzidenz)
// Un logo subido a mano se clasifica solo: si es claro va como 1, si es oscuro como 2 o 3.

const defaultCreateCanvas = (w, h) => new OffscreenCanvas(w, h);

/** Recorta los bordes transparentes (los kits de MARCAS ya vienen recortados; los subidos, no). */
export function trimTransparent(image, createCanvas = defaultCreateCanvas) {
  const c = createCanvas(image.width, image.height), g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, image.width, image.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;                                   // totalmente transparente
  if (x0 === 0 && y0 === 0 && x1 === width - 1 && y1 === height - 1) return c;
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(c, -x0, -y0);
  return out;
}

/**
 * Mira los píxeles visibles: luminancia media, si es de un solo color, y si tiene fondo
 * (casi sin transparencia, como un JPG).
 */
export function analyzeLogo(image, createCanvas = defaultCreateCanvas) {
  const k = Math.min(1, 200 / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * k)), h = Math.max(1, Math.round(image.height * k));
  const g = createCanvas(w, h).getContext('2d');
  g.drawImage(image, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const px = [];
  let transparent = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) transparent++;
    if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  }
  if (!px.length) return { empty: true };
  const mean = [0, 1, 2].map(c => px.reduce((s, q) => s + q[c], 0) / px.length);
  const lum = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2];
  const dist = px.map(q => Math.hypot(q[0] - mean[0], q[1] - mean[1], q[2] - mean[2])).sort((a, b) => a - b);
  const p90 = dist[Math.floor(dist.length * 0.9)];
  // opaque: sin transparencia en toda la imagen (un JPG, o un PNG con fondo). Se mira la
  // imagen sin recortar: un logo macizo recortado también queda sin transparencia.
  return { empty: false, lum, mono: p90 < 40, opaque: transparent / (w * h) < 0.005 };
}

function silhouette(image, color, createCanvas) {
  const c = createCanvas(image.width, image.height), g = c.getContext('2d');
  g.drawImage(image, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Prepara la marca del cliente para createScene(..., { client }).
 * @param {object} o
 * @param {string} o.name        nombre de la inmobiliaria (para el respaldo de texto)
 * @param {*} [o.claro]          imagen decodificada de logo_claro.png
 * @param {*} [o.oscuro]         imagen decodificada de logo_oscuro.png
 * @param {*} [o.upload]         imagen subida a mano (tiene prioridad)
 * @returns {{mode:'logo'|'silhouette'|'plate'|'text', image?:*, name:string, source:string}}
 */
export function prepareClientMark({ name = '', claro, oscuro, upload, createCanvas = defaultCreateCanvas } = {}) {
  const asDark = (img, source) => {
    const t = trimTransparent(img, createCanvas); if (!t) return null;
    const a = analyzeLogo(t, createCanvas);
    if (a.empty) return null;
    if (analyzeLogo(img, createCanvas).opaque) return { mode: 'plate', image: t, name, source }; // tiene fondo propio
    if (a.mono) return { mode: 'silhouette', image: silhouette(t, '#FFFFFF', createCanvas), name, source };
    return { mode: 'plate', image: t, name, source };
  };
  if (upload) {
    const t = trimTransparent(upload, createCanvas);
    if (t) {
      const a = analyzeLogo(t, createCanvas);
      if (!a.empty && !analyzeLogo(upload, createCanvas).opaque && a.lum >= 110) return { mode: 'logo', image: t, name, source: 'subido' };
      const dark = asDark(upload, 'subido'); if (dark) return dark;
    }
  }
  if (claro) { const t = trimTransparent(claro, createCanvas); if (t) return { mode: 'logo', image: t, name, source: 'logo_claro' }; }
  if (oscuro) { const dark = asDark(oscuro, 'logo_oscuro'); if (dark) return dark; }
  return { mode: 'text', name, source: 'nombre' };
}

/** Texto corto para avisar en la UI qué se está usando. */
export function describeMark(mark) {
  if (!mark) return '';
  return {
    logo: mark.source === 'subido' ? 'Logo subido.' : 'Logo claro de MARCAS.',
    silhouette: `No hay logo claro: se usa ${mark.source === 'subido' ? 'el subido' : 'el oscuro'} pasado a blanco.`,
    plate: `No hay logo claro: se usa ${mark.source === 'subido' ? 'el subido' : 'el oscuro'} sobre una placa gris.`,
    text: 'No hay logo: se escribe el nombre de la inmobiliaria.',
  }[mark.mode];
}
