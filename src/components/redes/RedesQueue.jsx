import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, Images, MapPin, Building, Clock, CalendarDays, ExternalLink } from 'lucide-react';
import { redesCall, FALTANTES, daysLeft, fmtDate } from './redesApi';
import usePhotos from './usePhotos';

const FILTROS = [
  ['pendiente', 'Pendientes'], ['aprobado', 'Aprobados'], ['programado', 'Programados'],
  ['sueltas', 'Sueltas'], ['descartado', 'Descartados'], ['publicado', 'Publicados'],
];

function Thumb({ cache, draft }) {
  const first = (draft.fotos[0] || {}).copia;
  const get = usePhotos(cache, draft.draftId, first ? [first] : []);
  const p = first ? get(first) : null;
  return (
    <div className="w-full aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
      {p && p.url ? <img src={p.url} alt="" className="w-full h-full object-cover" />
        : <Loader2 size={18} className={`text-gray-300 ${p ? '' : 'animate-spin'}`} />}
    </div>
  );
}

function Card({ draft, cache, onOpen }) {
  const left = draft.estado === 'pendiente' ? daysLeft(draft) : null;
  return (
    <button type="button" onClick={() => onOpen(draft.draftId)}
      className="text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#EB4511]/40 transition p-3 flex flex-col gap-2">
      <Thumb cache={cache} draft={draft} />
      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 truncate">
        <MapPin size={14} className="text-[#EB4511] shrink-0" /> {draft.barrio || 'Sin barrio'}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
        <Building size={13} className="shrink-0" /> {draft.inmobiliaria || 'Inmobiliaria sin identificar'}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1 whitespace-nowrap"><Images size={12} /> {draft.fotos.length} foto{draft.fotos.length === 1 ? '' : 's'}</span>
        <span className="whitespace-nowrap">{draft.tipo === 'suelta' ? 'Suelta' : 'Carrusel'}</span>
        <span className="whitespace-nowrap">{fmtDate(draft.creado)}</span>
      </div>
      {left !== null && (
        <div className={`inline-flex items-center gap-1 text-[11px] font-bold ${left <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
          <Clock size={12} /> {left > 0 ? `Vence en ${left} día${left === 1 ? '' : 's'}` : 'Vence hoy'}
        </div>
      )}
      {draft.estado === 'programado' && (
        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600"><CalendarDays size={12} /> {fmtDate(draft.fechaProgramada)}</div>
      )}
      {draft.estado === 'publicado' && draft.publicadoUrl && (
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600"><ExternalLink size={12} /> publicado</span>
      )}
      {draft.estado === 'descartado' && <div className="text-[11px] text-gray-500">Motivo: {draft.motivoDescarte || '—'}</div>}
      {draft.faltantes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {draft.faltantes.map(f => (
            <span key={f} title={FALTANTES[f] || f} className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 rounded px-1.5 py-0.5">{f}</span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function RedesQueue({ filtro, setFiltro, cache, onOpen }) {
  const [state, setState] = useState({ loading: true, drafts: [], error: '' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    redesCall('redes_list', { filtro })
      .then(res => { if (alive) setState({ loading: false, drafts: res.drafts || [], error: '' }); })
      .catch(e => { if (alive) setState({ loading: false, drafts: [], error: e.message }); });
    return () => { alive = false; };
  }, [filtro, reload]);

  const choose = f => { setState(s => ({ ...s, loading: true })); setFiltro(f); };

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-[#EB4511] font-extrabold uppercase tracking-wider text-sm mr-2">Redes</h2>
        {FILTROS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => choose(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors
              ${filtro === k ? 'bg-[#EB4511] text-white border-[#EB4511]' : 'bg-white text-gray-500 border-gray-200 hover:text-[#EB4511]'}`}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => { setState(s => ({ ...s, loading: true })); setReload(n => n + 1); }}
          className="ml-auto p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#EB4511]" title="Actualizar">
          <RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {state.error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
      {!state.loading && !state.error && state.drafts.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-16">No hay bocetos acá.</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {state.drafts.map(d => <Card key={d.draftId} draft={d} cache={cache} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
