import { useEffect, useState } from 'react';
import { RefreshCw, Images, MapPin, Clock, CalendarDays, ExternalLink, Trash2 } from 'lucide-react';
import { redesCall, FALTANTES, MOTIVOS, daysLeft, fmtDate } from './redesApi';
import usePhotos from './usePhotos';
import MiniLogo from '../MiniLogo';
import LoadingLogo from '../LoadingLogo';

const FILTROS = [
  ['pendiente', 'Pendientes'], ['aprobado', 'Aprobados'], ['programado', 'Programados'],
  ['sueltas', 'Sueltas'], ['descartado', 'Descartados'], ['publicado', 'Publicados'],
];

// What the selection does on each tab. Publicados has none: a published draft stays.
const BULK = { pendiente: 'discard', aprobado: 'discard', programado: 'discard', sueltas: 'discard', descartado: 'restore' };
// A single photo that went into a carousel can't come back: it would be there twice.
const canSelect = (filtro, draft) => !!BULK[filtro] && !(filtro === 'descartado' && draft.motivoDescarte === 'paso a carrusel');

function Thumb({ cache, draft }) {
  const first = (draft.fotos[0] || {}).copia;
  const get = usePhotos(cache, draft.draftId, first ? [first] : []);
  const p = first ? get(first) : null;
  return (
    <div className="w-full aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
      {p && p.url ? <img src={p.url} alt="" className="w-full h-full object-cover" />
        : p ? <Images size={18} className="text-gray-300" /> : <MiniLogo className="w-8 h-8 text-[#E53B12]" />}
    </div>
  );
}

function Card({ draft, cache, onOpen, selectable, selected, onToggle }) {
  const left = draft.estado === 'pendiente' ? daysLeft(draft) : null;
  const address = draft.direccion || 'Sin dirección';
  const agency = draft.inmobiliaria || 'Inmobiliaria sin identificar';
  return (
    <div className={`relative bg-white rounded-xl border shadow-sm hover:shadow-md transition ${selected ? 'border-[#EB4511] ring-2 ring-[#EB4511]/40' : 'border-gray-200 hover:border-[#EB4511]/40'}`}>
    <button type="button" onClick={() => onOpen(draft.draftId)} className="w-full h-full text-left p-3 flex flex-col gap-2">
      <Thumb cache={cache} draft={draft} />
      <div className="flex items-start gap-1.5 text-sm font-bold text-gray-800 min-w-0">
        <MapPin size={14} className="text-[#EB4511] shrink-0 mt-0.5" /> <span className="min-w-0 line-clamp-2 leading-snug" title={address}>{address}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
        <span className={`max-w-[60%] truncate shrink-0 ${draft.barrio ? '' : 'font-bold text-amber-700'}`} title={draft.barrio || 'Sin barrio'}>{draft.barrio || 'Sin barrio'}</span>
        <span className="shrink-0">·</span>
        <span className="min-w-0 truncate" title={agency}>{agency}</span>
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
    {selectable && (
      <label className="absolute top-1 left-1 p-3 cursor-pointer" title="Elegir">
        <input type="checkbox" checked={selected} onChange={() => onToggle(draft.draftId)} aria-label={`Elegir ${address}`}
          className="block w-5 h-5 cursor-pointer accent-[#EB4511] shadow" />
      </label>
    )}
    </div>
  );
}

// Several drafts at once: appears as soon as one is ticked. A discard can be undone in Descartados.
function SelectionBar({ action, count, allCount, busy, onAll, onNone, onRun }) {
  const [motivo, setMotivo] = useState('revisor');
  const [otro, setOtro] = useState('');
  const reason = motivo === 'otro' ? otro.trim() : motivo;
  return (
    <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#EB4511]/40 bg-white shadow-md px-3 py-2">
      <span className="text-sm font-bold text-gray-800">{count} elegida{count === 1 ? '' : 's'}</span>
      {count < allCount && <button type="button" disabled={busy} onClick={onAll} className="text-xs font-bold text-[#E53B12] hover:underline disabled:opacity-50">Elegir todas ({allCount})</button>}
      <button type="button" disabled={busy} onClick={onNone} className="text-xs font-bold text-gray-500 hover:underline disabled:opacity-50">Quitar</button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {action === 'discard' && (
          <>
            <label className="text-xs text-gray-500">Motivo{' '}
              <select value={motivo} disabled={busy} onChange={e => setMotivo(e.target.value)} className="ml-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
                {MOTIVOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            {motivo === 'otro' && <input value={otro} disabled={busy} onChange={e => setOtro(e.target.value)} placeholder="¿Por qué?" className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-xs" />}
            <button type="button" disabled={busy || !reason} onClick={() => onRun(reason)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? <MiniLogo className="w-4 h-4" /> : <Trash2 size={14} />} Descartar {count}
            </button>
          </>
        )}
        {action === 'restore' && (
          <button type="button" disabled={busy} onClick={() => onRun()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#EB4511] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d13c0e] disabled:opacity-50">
            {busy ? <MiniLogo className="w-4 h-4" /> : <RefreshCw size={14} />} Recuperar {count}
          </button>
        )}
      </div>
    </div>
  );
}

// "Diseño al azar": new drafts get a random series and día/noche (re-backend redes_config).
function AzarSwitch() {
  const [on, setOn] = useState(null);       // null while loading
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    redesCall('redes_config').then(r => { if (alive) setOn(!!r.disenoAzar); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const flip = () => {
    setBusy(true);
    redesCall('redes_config', { disenoAzar: !on }).then(r => setOn(!!r.disenoAzar)).catch(() => {}).finally(() => setBusy(false));
  };
  if (on === null) return null;
  return (
    <label className="inline-flex items-center gap-2 text-[11px] font-bold text-gray-500 cursor-pointer select-none"
      title="Los bocetos nuevos salen con una serie y día/noche al azar (nunca la misma que el anterior)">
      <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={flip}
        className={`relative w-8 h-4 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[#EB4511]' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
      </button>
      Diseño al azar
    </label>
  );
}

export default function RedesQueue({ filtro, setFiltro, cache, onOpen }) {
  const [state, setState] = useState({ loading: true, drafts: [], error: '' });
  const [reload, setReload] = useState(0);
  const [picked, setPicked] = useState([]);      // draft IDs ticked on this tab
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState({ ok: '', error: '' });

  useEffect(() => {
    let alive = true;
    redesCall('redes_list', { filtro })
      .then(res => { if (alive) setState({ loading: false, drafts: res.drafts || [], error: '' }); })
      .catch(e => { if (alive) setState({ loading: false, drafts: [], error: e.message }); });
    return () => { alive = false; };
  }, [filtro, reload]);

  const choose = f => { setState(s => ({ ...s, loading: true })); setPicked([]); setNotice({ ok: '', error: '' }); setFiltro(f); };

  const action = BULK[filtro];
  const selectable = state.drafts.filter(d => canSelect(filtro, d));
  const shownPicks = picked.filter(id => selectable.some(d => d.draftId === id));
  const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const runBulk = async reason => {
    setActing(true); setNotice({ ok: '', error: '' });
    try {
      const r = action === 'discard'
        ? await redesCall('redes_discard_many', { draftIds: shownPicks, motivo: reason })
        : await redesCall('redes_restore', { draftIds: shownPicks });
      setState(s => ({ ...s, drafts: s.drafts.filter(d => !r.done.includes(d.draftId)) }));
      setPicked(r.failed.map(f => f.draftId));
      const n = r.done.length;
      const ok = !n ? '' : action === 'discard'
        ? `${n === 1 ? 'Se descartó 1' : `Se descartaron ${n}`}. Se pueden recuperar desde Descartados.`
        : `${n === 1 ? 'Se recuperó 1' : `Se recuperaron ${n}`}: ${n === 1 ? 'está' : 'están'} en Pendientes o Sueltas.`;
      const nameOf = id => (state.drafts.find(d => d.draftId === id) || {}).direccion || 'Sin dirección';
      setNotice({ ok, error: r.failed.map(f => `${nameOf(f.draftId)}: ${f.error}`).join(' · ') });
    } catch (e) {
      setNotice({ ok: '', error: e.message });
    } finally { setActing(false); }
  };

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
        <div className="ml-auto"><AzarSwitch /></div>
        <button type="button" onClick={() => { setState(s => ({ ...s, loading: true })); setReload(n => n + 1); }}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#EB4511]" title="Actualizar">
          <RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {state.error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>}
      {notice.error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{notice.error}</div>}
      {notice.ok && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice.ok}</div>}
      {shownPicks.length > 0 && action && (
        <SelectionBar action={action} count={shownPicks.length} allCount={selectable.length} busy={acting}
          onAll={() => setPicked(selectable.map(d => d.draftId))} onNone={() => setPicked([])} onRun={runBulk} />
      )}
      {state.loading && state.drafts.length === 0 && <LoadingLogo message="Cargando bocetos" />}
      {!state.loading && !state.error && state.drafts.length === 0 && (
        <div className="text-center text-sm text-gray-400 py-16">No hay bocetos acá.</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {state.drafts.map(d => (
          <Card key={d.draftId} draft={d} cache={cache} onOpen={onOpen} selectable={canSelect(filtro, d)} selected={shownPicks.includes(d.draftId)} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
