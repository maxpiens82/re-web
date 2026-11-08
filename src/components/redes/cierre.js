// Closing of a carousel (re-backend docs/REDES_SPEC.md §7.2b): the package brings both, the "carrusel-cierre"
// template and the end screen video, to choose when publishing. The video's settings, when edited, are the
// last entry of the draft's `diseno`: { plantilla: 'endscreen', endscreen: { params, brandId } }.
import { DEFAULTS, normalizeParams, drawFrame, lastFrameTime } from '../../endscreen/engine.js';
import { buildScene } from '../../endscreen/assets.js';
import { exportMp4, canExport } from '../../endscreen/exportMp4.js';

const FORMAT = '4x5';   // 1080×1350, the carousel's size
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// null for a suelta (no closing slide). Otherwise { kind: 'endscreen' | 'plantilla', saved }.
export function closingOf(draft) {
  if (!draft || draft.tipo === 'suelta') return null;
  const diseno = Array.isArray(draft.diseno) ? draft.diseno : [];
  const last = diseno[diseno.length - 1] || {};
  return { kind: last.plantilla === 'carrusel-cierre' ? 'plantilla' : 'endscreen', saved: last.endscreen || null };
}

// What to store in `diseno` for this choice.
export const disenoFor = (kind, saved) => [{ plantilla: kind === 'plantilla' ? 'carrusel-cierre' : 'endscreen', ...(saved ? { endscreen: saved } : {}) }];

// The draft's agency in MARCAS (the same names `inmobiliaria` holds), or null.
export function brandForDraft(draft, brands) {
  const n = norm(draft && draft.inmobiliaria);
  if (!n || n === 'particular' || !brands) return null;
  return brands.find(b => norm(b.name) === n || (Array.isArray(b.variantes) && b.variantes.some(v => norm(v) === n))) || null;
}

// Settings to start from: the saved ones, or the end screen defaults with the draft's agency
// (co-branded) or RE! when there is none. The format is always the carousel's.
export function startSettings(closing, draft, brands) {
  const saved = closing && closing.saved;
  if (saved && saved.params) {
    return { params: normalizeParams({ ...DEFAULTS, ...saved.params, format: FORMAT }), brandId: saved.brandId || '' };
  }
  const brand = brandForDraft(draft, brands);
  const params = normalizeParams({
    ...DEFAULTS, format: FORMAT, template: brand ? 'cobrand' : 're',
    client: brand ? { name: brand.name, instagram: brand.instagram || '', accent: brand.accent || '' } : DEFAULTS.client,
  });
  return { params, brandId: brand ? brand.id : '' };
}

// What goes into `diseno` (the format is implied).
export function toSaved({ params, brandId }) {
  const p = { ...params };
  delete p.format;
  return { params: p, brandId: params.template === 'cobrand' ? (brandId || '') : '' };
}

export const settingsKey = s => JSON.stringify([s.params, s.brandId]);
export const canMakeVideo = canExport;

// The MP4 and a still of its settled moment (logo and texts in place, before any fade-out), for the
// slide strip. onProgress(done, total) while encoding.
export async function renderEndscreen({ params, brandId }, { brands, loadBrandLogo, onProgress, signal } = {}) {
  if (!canExport()) throw new Error('Este navegador no puede armar el video del cierre. Usá Chrome o Edge.');
  const brand = (brands || []).find(b => b.id === brandId) || null;
  const scene = await buildScene(params, { brand, loadBrandLogo });
  if (scene.overflow.length) throw new Error('Un texto del end screen no entra: tocá "Editar end screen" y acortalo.');
  const canvas = document.createElement('canvas');
  canvas.width = scene.p.W; canvas.height = scene.p.H;
  drawFrame(canvas.getContext('2d'), scene, Math.max(0, lastFrameTime(scene.p) - (scene.p.fadeOut || 0)));
  const still = await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo dibujar el cierre.'))), 'image/jpeg', 0.9));
  const { blob } = await exportMp4(scene, { onProgress, signal });
  return { blob, still };
}
