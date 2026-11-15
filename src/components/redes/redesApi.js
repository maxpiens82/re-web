import { gasPost } from '../../lib/gasApi';

// Calls a redes_* / marcas_* action (re-backend RedesCode.js). gasPost returns the raw Response; the
// action's arguments go inside payload. Throws with a readable message on any refusal.
export async function redesCall(action, payload = {}) {
  const res = await (await gasPost({ action, payload })).json();
  if (res.authError) throw new Error('Tu sesión venció o no tenés permiso. Recargá la página (F5).');
  if (!res.success) throw new Error(String(res.error || 'No se pudo completar la acción.').replace(/^Error:\s*/, ''));
  return res;
}

// The hash is REDES or REDES/<draftId>. Draft IDs carry "@google.com", so they travel encoded.
export const redesHash = draftId => (draftId ? `REDES/${encodeURIComponent(draftId)}` : 'REDES');
export const draftIdFromHash = hash => {
  const m = String(hash || '').match(/^REDES\/(.+)$/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};

// What each badge means, for people.
export const FALTANTES = {
  barrio: 'Falta confirmar el barrio',
  inmobiliaria: 'Inmobiliaria sin identificar',
  instagram: 'La inmobiliaria no tiene Instagram cargado',
  logo: 'La inmobiliaria no tiene logo en MARCAS',
  copy: 'No hay texto: Gemini falló, probá Regenerar',
  'copy-revisar': 'El texto no pasó los controles automáticos: revisalo',
  'pocas-fotos': 'Menos de 3 fotos',
  'fotos-nuevas': 'Llegaron fotos nuevas: están en Alternativas',
};

// Why a draft is discarded: [what's saved, what people read]. 'otro' asks for the text.
export const MOTIVOS = [['revisor', 'No va'], ['fotos', 'Las fotos no sirven'], ['repetido', 'Repetido'], ['otro', 'Otro…']];

export const EXPIRY_DAYS = 14;
export function daysLeft(draft) {
  const t = new Date(draft.listoDesde || '').getTime();
  if (!t) return null;
  return Math.ceil((t + EXPIRY_DAYS * 86400000 - Date.now()) / 86400000);
}

export const fmtDate = v => {
  const d = new Date(v || '');
  return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const b64ToBlob = (b64, mime) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'image/jpeg' });
};

// Photos Drive never makes a preview of (very big images: a drone photo at full size, 57 MB, 14 Nov 2026). Smaller ones
// without a preview are just new, and Drive makes it soon. The big ones are fetched whole, in pieces (redes_photo_part),
// and shrunk here, once for both sizes: 480 px (thumb) and 2048 px (full) on the long side.
const NO_PREVIEW_BYTES = 40 * 1024 * 1024;
const PART_BYTES = 6 * 1024 * 1024;
const bigPhotos = new Map();   // copia -> Promise<{ thumb: Blob, full: Blob }>

const shrink = (bitmap, px) => {
  const k = Math.min(1, px / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo achicar la foto.'))), 'image/jpeg', 0.9));
};

function loadBigPhoto(draftId, id, bytes) {
  if (!bigPhotos.has(id)) {
    const p = (async () => {
      const parts = [];
      for (let got = 0; got < bytes;) {
        const r = await redesCall('redes_photo_part', { draftId, fileId: id, offset: got, length: PART_BYTES });
        if (!r.base64) break;
        const part = b64ToBlob(r.base64, 'application/octet-stream');
        parts.push(part);
        got += part.size;
      }
      const bitmap = await createImageBitmap(new Blob(parts, { type: 'image/jpeg' }));
      try { return { thumb: await shrink(bitmap, 480), full: await shrink(bitmap, 2048) }; } finally { bitmap.close(); }
    })();
    p.catch(() => bigPhotos.delete(id));
    bigPhotos.set(id, p);
  }
  return bigPhotos.get(id);
}

// Photo loader for one Redes tab: redes_photo in batches of up to 6 IDs, at most 2 requests in flight
// (every request is an Apps Script execution, and production shares the 30-at-once limit). Photos are
// kept as object URLs (and their Blobs) until dispose(). size 'thumb' (480 px) for the grid and the
// queue; 'full' (2048 px) only for the placas and the zip.
export function createPhotoCache(size = 'full') {
  const urls = new Map();      // copia -> { url, blob }
  const waiting = new Map();   // copia -> Promise
  const queue = [];
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn());
  let running = 0;
  let disposed = false;

  const pump = () => {
    while (running < 2 && queue.length && !disposed) {
      const job = queue.shift();
      running++;
      // A big photo takes a minute or two: the batch's other photos show at once (notify) and the slot is freed for
      // other requests; the batch's promise waits for the big one, since the placas need it.
      let released = false;
      const release = () => { if (!released) { released = true; running--; pump(); } };
      redesCall('redes_photo', { draftId: job.draftId, fileIds: job.ids, size })
        .then(async res => {
          const big = [];
          job.ids.forEach(id => {
            const p = (res.photos || {})[id] || {};
            if (p.base64 && !disposed) {
              const blob = b64ToBlob(p.base64, p.mime);
              urls.set(id, { url: URL.createObjectURL(blob), blob });
            } else if (p.pending && p.bytes > NO_PREVIEW_BYTES) big.push([id, p.bytes]);
            else if (!disposed) urls.set(id, { pending: !!p.pending, error: p.error || '' });
          });
          if (big.length) { notify(); release(); }
          await Promise.all(big.map(([id, bytes]) => loadBigPhoto(job.draftId, id, bytes)
            .then(both => { if (!disposed) { const blob = size === 'thumb' ? both.thumb : both.full; urls.set(id, { url: URL.createObjectURL(blob), blob }); } })
            .catch(e => { if (!disposed) urls.set(id, { error: 'La foto es muy pesada y no se pudo bajar: ' + e.message }); })));
          job.resolve();
          notify();
        })
        .catch(e => { job.ids.forEach(id => urls.set(id, { error: e.message })); job.resolve(); })
        .finally(release);
    }
  };

  return {
    get: id => urls.get(id),
    // fn() runs whenever photos arrive outside a load() promise (the rest of a batch while a big photo is still coming).
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // Loads what isn't loaded yet; resolves when this request's photos are in.
    load(draftId, ids) {
      const todo = ids.filter(id => id && !urls.has(id) && !waiting.has(id));
      const promises = [];
      for (let i = 0; i < todo.length; i += 6) {
        const batch = todo.slice(i, i + 6);
        const p = new Promise(resolve => queue.push({ draftId, ids: batch, resolve }));
        batch.forEach(id => waiting.set(id, p));
        promises.push(p);
      }
      pump();
      return Promise.all(promises.concat(ids.map(id => waiting.get(id)).filter(Boolean)))
        .then(() => ids.forEach(id => waiting.delete(id)));
    },
    forget(ids) { ids.forEach(id => { const u = urls.get(id); if (u && u.url) URL.revokeObjectURL(u.url); urls.delete(id); }); },
    dispose() { disposed = true; listeners.clear(); urls.forEach(u => u.url && URL.revokeObjectURL(u.url)); urls.clear(); queue.length = 0; },
  };
}
