// Lo que necesita una escena además de los parámetros: tipografía, logo de RE! y logo del cliente.
// Lo usan la pantalla End screen y el cierre en video de los carruseles de Redes
// (re-backend docs/REDES_SPEC.md §7.2b), así los dos dibujan exactamente lo mismo.
import { RE_COLORS, createScene } from './engine.js';
import { prepareClientMark } from './clientMark.js';
import { loadReLogo } from './reLogo.js';

const FONT_FACES = ['300 40px AkzidenzGrotesk', '500 40px AkzidenzGrotesk'];
// Los logos se achican a este lado máximo al cargarlos: algunos kits son enormes (Inlaza, 5170 px)
// y analizarlos enteros traba la pantalla. Un SVG se dibuja a este tamaño.
const LOGO_MAX = 1200;

// Las dos fuentes, cargadas de verdad: si no, se exportaría con otra tipografía sin avisar.
export async function loadFonts() {
  const loaded = await Promise.all(FONT_FACES.map(f => document.fonts.load(f).catch(() => [])));
  return loaded.every(faces => faces.length > 0 && faces.every(ff => ff.status === 'loaded'))
    && FONT_FACES.every(f => document.fonts.check(f));
}

// URL (data:, http) o archivo -> canvas de lado ≤ LOGO_MAX. Pasa por <img>, que sí lee SVG
// (createImageBitmap no). La URL temporal de un archivo se libera al terminar.
export async function decodeImage(src) {
  if (!src) return null;
  const file = src instanceof Blob;
  const url = file ? URL.createObjectURL(src) : src;
  try {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { throw new Error('No se pudo leer la imagen.'); }
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error('La imagen no tiene tamaño. Si es un SVG, exportalo con ancho y alto.');
    const svg = (file && src.type === 'image/svg+xml') || /^data:image\/svg/.test(url);
    const k = svg ? LOGO_MAX / Math.max(w, h) : Math.min(1, LOGO_MAX / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    if (file) URL.revokeObjectURL(url);
  }
}

// Logos claro/oscuro de una marca de MARCAS (los que tenga), ya decodificados.
export async function loadBrandLogos(brand, loadBrandLogo) {
  if (!brand || !loadBrandLogo) return { claro: null, oscuro: null };
  const get = (kind, has) => (has ? loadBrandLogo(brand.id, kind).then(decodeImage).catch(() => null) : Promise.resolve(null));
  const [claro, oscuro] = await Promise.all([get('claro', brand.hasClaro), get('oscuro', brand.hasOscuro)]);
  return { claro, oscuro };
}

// Escena lista para drawFrame/exportMp4, fuera de la pantalla. Falla si la tipografía no cargó.
export async function buildScene(params, { brand, loadBrandLogo } = {}) {
  const [fontsOk, reLogo, logos] = await Promise.all([loadFonts(), loadReLogo(RE_COLORS.naranja),
    params.template === 'cobrand' ? loadBrandLogos(brand, loadBrandLogo) : Promise.resolve({})]);
  if (!fontsOk) throw new Error('No se pudo cargar la tipografía Akzidenz Grotesk. Recargá la página (F5).');
  const client = params.template === 'cobrand' ? prepareClientMark({ claro: logos.claro, oscuro: logos.oscuro }) : null;
  return createScene(params, { reLogo, client });
}
