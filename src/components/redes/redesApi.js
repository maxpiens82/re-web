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

// Photo loader for one Redes tab: redes_photo in batches of up to 6 IDs, at most 2 requests in flight
// (every request is an Apps Script execution, and production shares the 30-at-once limit). Photos are
// kept as object URLs (and their Blobs, for the zip) until dispose().
export function createPhotoCache() {
  const urls = new Map();      // copia -> { url, blob }
  const waiting = new Map();   // copia -> Promise
  const queue = [];
  let running = 0;
  let disposed = false;

  const pump = () => {
    while (running < 2 && queue.length && !disposed) {
      const job = queue.shift();
      running++;
      redesCall('redes_photo', { draftId: job.draftId, fileIds: job.ids })
        .then(res => {
          job.ids.forEach(id => {
            const p = (res.photos || {})[id] || {};
            if (p.base64 && !disposed) {
              const blob = b64ToBlob(p.base64, p.mime);
              urls.set(id, { url: URL.createObjectURL(blob), blob });
            } else if (!disposed) urls.set(id, { pending: !!p.pending, error: p.error || '' });
          });
          job.resolve();
        })
        .catch(e => { job.ids.forEach(id => urls.set(id, { error: e.message })); job.resolve(); })
        .finally(() => { running--; pump(); });
    }
  };

  return {
    get: id => urls.get(id),
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
    dispose() { disposed = true; urls.forEach(u => u.url && URL.revokeObjectURL(u.url)); urls.clear(); queue.length = 0; },
  };
}
