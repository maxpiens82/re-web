import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import MiniLogo from '../MiniLogo';
import { gasPost } from '../../lib/gasApi';

// Servicios adicionales de una reserva confirmada (P- / U-). Es un módulo aparte del formulario:
// guarda por su cuenta (acciones addons_* de re-backend AddonsCode.js), no viaja con "Guardar" ni
// con el checkout. Los precios los calcula el servidor; acá solo se muestran.
// Si el servidor dice que los adicionales están desactivados, o no hay nada que mostrar, no dibuja nada.

async function addonsCall(action, payload) {
  const res = await (await gasPost({ action, payload })).json();
  if (res.authError) throw new Error('Tu sesión venció o no tenés permiso. Recargá la página (F5).');
  if (!res.success) throw new Error(String(res.error || 'No se pudo completar la acción.').replace(/^Error:\s*/, ''));
  return res;
}

const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

// units: las unidades del formulario ({ indicaciones, metrosCuadrados }), para elegir a cuál corresponde.
export default function AddonsPanel({ eventId, units = [] }) {
  const [data, setData] = useState(null); // { enabled, catalog, items }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [addonId, setAddonId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unitIndex, setUnitIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    addonsCall('addons_for_booking', { eventId })
      .then(r => { if (alive) setData({ enabled: !!r.enabled, catalog: r.catalog || [], items: r.items || [] }); })
      .catch(() => { if (alive) setData({ enabled: false, catalog: [], items: [] }); }); // sin adicionales, el formulario sigue igual
    return () => { alive = false; };
  }, [eventId]);

  if (!data || !data.enabled || (data.catalog.length === 0 && data.items.length === 0)) return null;

  const multi = units.length > 1;
  const unit = units[Math.min(unitIndex, units.length - 1)] || {};
  const unitLabel = (u, i) => String(u.indicaciones || '').trim() || `Unidad ${i + 1}`;
  const chosen = data.catalog.find(a => a.id === addonId);
  const total = data.items.reduce((sum, it) => sum + (it.total || 0), 0);

  const run = async (action, payload) => {
    setBusy(true);
    setError('');
    try {
      const r = await addonsCall(action, { eventId, ...payload });
      setData(d => ({ ...d, items: r.items || [] }));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!chosen) return;
    const ok = await run('addons_add', {
      addonId: chosen.id,
      cantidad: Number(cantidad) || 1,
      metros: String(unit.metrosCuadrados || ''),
      unidad: multi ? unitLabel(unit, Math.min(unitIndex, units.length - 1)) : '',
    });
    if (ok) { setAddonId(''); setCantidad(1); }
  };

  const remove = it => {
    if (!window.confirm(`¿Quitar "${it.nombre}" de esta reserva?`)) return;
    run('addons_remove', { itemId: it.itemId });
  };

  const field = 'bg-[#F4F4F5] border-none py-2 px-3 md:py-2.5 md:px-3.5 rounded-lg outline-none font-medium text-[13px] md:text-sm';

  return (
    <section className="bg-white rounded-[20px] md:rounded-3xl p-3.5 md:p-8 shadow-sm border border-gray-100">
      <div className="mb-3 md:mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm md:text-lg font-bold uppercase text-[#EB4511]">Adicionales</h2>
        {busy && <MiniLogo className="w-4 h-4 text-[#E53B12]" />}
      </div>

      {data.items.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-100">
          {data.items.map(it => (
            <li key={it.itemId} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-[13px] md:text-sm truncate">
                  {it.nombre}{it.cantidad > 1 ? ` × ${it.cantidad}` : ''}
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  {[it.unidad, it.metros ? `${it.metros} m²` : '', it.agregadoPor].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="font-extrabold text-[13px] md:text-sm whitespace-nowrap">{money(it.total)}</span>
                <button type="button" onClick={() => remove(it)} disabled={busy} aria-label={`Quitar ${it.nombre}`}
                  className="bg-red-50 text-red-500 hover:bg-red-100 w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-50">
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            </li>
          ))}
          <li className="pt-2 flex items-center justify-between text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
            <span>Total adicionales</span>
            <span className="text-sm text-gray-800 normal-case tracking-normal">{money(total)}</span>
          </li>
        </ul>
      )}

      {data.catalog.length > 0 && (
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <select value={addonId} onChange={e => setAddonId(e.target.value)} disabled={busy} className={`${field} flex-1 min-w-0 cursor-pointer`}>
            <option value="">Agregar un adicional…</option>
            {data.catalog.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} · {money(a.precio)}{a.aplicaMetros ? ' (por m²)' : ''}</option>
            ))}
          </select>
          {chosen && multi && (
            <select value={unitIndex} onChange={e => setUnitIndex(Number(e.target.value))} disabled={busy} className={`${field} md:w-44 cursor-pointer`}>
              {units.map((u, i) => <option key={u.id ?? i} value={i}>{unitLabel(u, i)}</option>)}
            </select>
          )}
          {chosen && (
            <input type="number" min="1" max="99" step="1" value={cantidad} onChange={e => setCantidad(e.target.value)} disabled={busy}
              aria-label="Cantidad" className={`${field} w-full md:w-20 text-center`} />
          )}
          {chosen && (
            <button type="button" onClick={add} disabled={busy}
              className="shrink-0 px-4 py-2 md:py-2.5 bg-[#EB4511] hover:bg-[#d13d0f] text-white font-extrabold rounded-full text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-50 transition-colors">
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>
      )}

      {chosen && chosen.aplicaMetros && (
        <p className="mt-2 text-[11px] text-gray-400">Se calcula con los m² de {multi ? 'la unidad elegida' : 'la unidad'} ({unit.metrosCuadrados || '—'} m²), tal como están ahora.</p>
      )}
      <p className="mt-2 text-[11px] text-gray-400">Se guardan al instante, aparte del formulario. Se cobran con el trabajo; el Total Estimado de abajo no los incluye.</p>
      {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
    </section>
  );
}
