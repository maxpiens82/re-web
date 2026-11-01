import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, Check, Copy, RefreshCw, Download, Send,
  CalendarDays, Trash2, Loader2, AlertTriangle, MapPin, Building, ExternalLink,
} from 'lucide-react';
import { redesCall, FALTANTES, daysLeft, fmtDate } from './redesApi';
import usePhotos from './usePhotos';

const ESTADO_COLOR = { pendiente: 'bg-amber-500', aprobado: 'bg-green-600', programado: 'bg-blue-600', publicado: 'bg-gray-800', descartado: 'bg-gray-400' };
const MOTIVOS = [['revisor', 'No va'], ['fotos', 'Las fotos no sirven'], ['repetido', 'Repetido'], ['otro', 'Otro…']];
const FINAL = ['publicado', 'descartado'];

const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sin-barrio';
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function Section({ title, children, right }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40';
const btnGhost = `${btn} border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`;
const btnMain = `${btn} bg-[#EB4511] text-white hover:bg-[#c42e0d]`;
const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#EB4511]';

function Photo({ p, img, selected, onClick, children, draggable, onDragStart, onDrop, label }) {
  return (
    <div className={`relative rounded-lg overflow-hidden border-2 ${selected ? 'border-[#EB4511]' : 'border-transparent'} bg-gray-100`}
      draggable={draggable} onDragStart={onDragStart} onDragOver={e => draggable && e.preventDefault()} onDrop={onDrop}>
      <button type="button" onClick={onClick} className="block w-full aspect-square">
        {img && img.url ? <img src={img.url} alt="" className="w-full h-full object-cover" draggable={false} />
          : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 p-1 text-center">
            {img ? (img.pending ? 'Drive todavía no hizo la miniatura' : (img.error || 'Sin vista previa')) : <Loader2 size={16} className="animate-spin" />}
          </div>}
      </button>
      <div className="absolute top-1 left-1 flex gap-1">
        {label && <span className="text-[10px] font-bold bg-black/60 text-white rounded px-1">{label}</span>}
        <span className={`text-[10px] font-bold text-white rounded px-1 ${String(p.mark) === '5' ? 'bg-[#EB4511]' : 'bg-blue-600'}`}>{p.mark}</span>
      </div>
      {children && <div className="absolute bottom-1 right-1 flex gap-1">{children}</div>}
    </div>
  );
}

const mini = 'bg-white/90 hover:bg-white text-gray-700 rounded p-1 shadow';

export default function RedesDraft({ draftId, cache, onBack }) {
  const [data, setData] = useState({ loading: true, draft: null, booking: null, error: '' });
  const [order, setOrder] = useState(null);          // { fotos, alts } local, until saved
  const [selected, setSelected] = useState(-1);
  const [dragFrom, setDragFrom] = useState(-1);
  const [text, setText] = useState('');
  const [barrio, setBarrio] = useState('');
  const [brands, setBrands] = useState(null);
  const [brandPick, setBrandPick] = useState('');
  const [fecha, setFecha] = useState(todayIso());
  const [url, setUrl] = useState('');
  const [motivo, setMotivo] = useState('revisor');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [discarding, setDiscarding] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ error: '', ok: '' });

  const apply = d => {
    setData(s => ({ ...s, loading: false, draft: d }));
    setOrder({ fotos: d.fotos, alts: d.alternativas });
    setText(d.copyFinal || '');
    setBarrio(d.barrio || '');
  };

  useEffect(() => {
    let alive = true;
    redesCall('redes_get', { draftId }).then(r => {
      if (!alive) return;
      setData({ loading: false, draft: r.draft, booking: r.booking, error: '' });
      setOrder({ fotos: r.draft.fotos, alts: r.draft.alternativas });
      setText(r.draft.copyFinal || '');
      setBarrio(r.draft.barrio || '');
    }).catch(e => { if (alive) setData({ loading: false, draft: null, booking: null, error: e.message }); });
    return () => { alive = false; };
  }, [draftId]);

  const all = order ? order.fotos.concat(order.alts) : [];
  const getImg = usePhotos(cache, draftId, all.map(p => p.copia));

  const run = async (name, fn, okText) => {
    setBusy(name); setMsg({ error: '', ok: '' });
    try {
      const r = await fn();
      if (r && r.draft) apply(r.draft);
      setMsg({ error: '', ok: typeof okText === 'function' ? okText(r) : (okText || '') });
      return r;
    } catch (e) {
      setMsg({ error: e.message, ok: '' });
      return null;
    } finally { setBusy(''); }
  };

  if (data.loading) return <div className="p-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>;
  if (data.error || !data.draft) return (
    <div className="max-w-3xl mx-auto p-4">
      <button type="button" onClick={onBack} className={btnGhost}><ArrowLeft size={14} /> Volver</button>
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{data.error || 'No se encontró el borrador.'}</div>
    </div>
  );

  const d = data.draft, b = data.booking;
  const open = !FINAL.includes(d.estado);
  const orderDirty = order && (JSON.stringify(order.fotos.map(p => p.crudo)) !== JSON.stringify(d.fotos.map(p => p.crudo)) ||
    JSON.stringify(order.alts.map(p => p.crudo)) !== JSON.stringify(d.alternativas.map(p => p.crudo)));
  const maxFotos = d.tipo === 'suelta' ? 1 : 5;
  const left = d.estado === 'pendiente' ? daysLeft(d) : null;

  // --- photo order (local until "Guardar orden") ---
  const move = (from, to) => setOrder(o => {
    if (to < 0 || to >= o.fotos.length || from === to) return o;
    const f = o.fotos.slice(); const [x] = f.splice(from, 1); f.splice(to, 0, x);
    return { ...o, fotos: f };
  });
  const toAlts = i => setOrder(o => (o.fotos.length <= 1 ? o : { fotos: o.fotos.filter((_, k) => k !== i), alts: o.alts.concat([o.fotos[i]]) }));
  const takeAlt = j => {
    setOrder(o => {
      const alt = o.alts[j];
      if (selected >= 0) {           // swap the selected photo with this alternate
        const f = o.fotos.slice(), a = o.alts.slice();
        a[j] = f[selected]; f[selected] = alt;
        return { fotos: f, alts: a };
      }
      if (o.fotos.length >= maxFotos) return o;
      return { fotos: o.fotos.concat([alt]), alts: o.alts.filter((_, k) => k !== j) };
    });
    setSelected(-1);
  };

  const download = () => run('zip', async () => {
    await cache.load(draftId, order.fotos.map(p => p.copia));
    const zip = new JSZip();
    order.fotos.forEach((p, i) => {
      const img = cache.get(p.copia);
      if (!img || !img.blob) throw new Error(`La foto ${i + 1} todavía no está disponible. Probá de nuevo en un rato.`);
      zip.file(`${String(i + 1).padStart(2, '0')}.jpg`, img.blob);
    });
    zip.file('copy.txt', text || d.copyFinal || '');
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `RE_${slug(d.barrio)}_${todayIso()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return null;
  }, 'Paquete descargado.');

  const loadBrands = () => {
    if (brands) return;
    redesCall('marcas_list').then(r => setBrands(r.brands || [])).catch(e => setMsg({ error: e.message, ok: '' }));
  };

  const textDirty = text !== (d.copyFinal || '');
  const fact = [b && b.servicios && b.servicios.join(' · '), b && b.metros ? `${b.metros} m²` : '', b && b.fecha ? `Sesión ${fmtDate(b.fecha + 'T12:00')}` : '', b && b.empresa ? `EMPRESA: ${b.empresa}` : '']
    .filter(Boolean).join('  ·  ');

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-4 flex flex-col gap-3">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={btnGhost}><ArrowLeft size={14} /> Cola</button>
        <span className={`text-[11px] font-bold uppercase text-white rounded-full px-2.5 py-1 ${ESTADO_COLOR[d.estado] || 'bg-gray-500'}`}>{d.estado}</span>
        <span className="text-sm font-bold text-gray-700">{d.tipo === 'suelta' ? 'Foto suelta' : 'Carrusel'}</span>
        {left !== null && <span className={`text-xs font-bold ${left <= 3 ? 'text-red-600' : 'text-gray-500'}`}>Vence en {Math.max(0, left)} día{left === 1 ? '' : 's'}</span>}
        {d.estado === 'programado' && <span className="text-xs font-bold text-blue-600">Programado para {fmtDate(d.fechaProgramada)}</span>}
        {d.estado === 'descartado' && <span className="text-xs text-gray-500">Motivo: {d.motivoDescarte}</span>}
        <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[50%]">{d.draftId}</span>
      </div>
      {fact && <div className="text-xs text-gray-500">{fact}</div>}

      {d.faltantes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          {d.faltantes.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle size={15} /> {FALTANTES[f] || f}</div>
          ))}
        </div>
      )}

      {msg.error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{msg.error}</div>}
      {msg.ok && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{msg.ok}</div>}

      {/* photos */}
      <Section title={`Fotos (${order.fotos.length}${d.tipo === 'suelta' ? '' : ' de máximo 5'})`}
        right={orderDirty && open && (
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={() => { setOrder({ fotos: d.fotos, alts: d.alternativas }); setSelected(-1); }}>Deshacer</button>
            <button type="button" className={btnMain} disabled={!!busy}
              onClick={() => run('orden', () => redesCall('redes_update', { draftId, cambios: { fotos: order.fotos.map(p => p.crudo), alternativas: order.alts.map(p => p.crudo) } }), 'Orden guardado.')}>
              {busy === 'orden' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar orden
            </button>
          </div>
        )}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {order.fotos.map((p, i) => (
            <Photo key={p.crudo} p={p} img={getImg(p.copia)} label={String(i + 1)} selected={selected === i}
              onClick={() => open && setSelected(selected === i ? -1 : i)}
              draggable={open} onDragStart={() => setDragFrom(i)} onDrop={() => { move(dragFrom, i); setDragFrom(-1); }}>
              {open && <>
                <button type="button" className={mini} title="Antes" onClick={() => move(i, i - 1)}><ChevronLeft size={12} /></button>
                <button type="button" className={mini} title="Después" onClick={() => move(i, i + 1)}><ChevronRight size={12} /></button>
                {order.fotos.length > 1 && <button type="button" className={mini} title="Pasar a alternativas" onClick={() => toAlts(i)}><ArrowDown size={12} /></button>}
              </>}
            </Photo>
          ))}
        </div>
        {order.alts.length > 0 && (
          <>
            <div className="mt-4 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Alternativas {open && <span className="normal-case font-normal tracking-normal">· tocá una foto de arriba y después una alternativa para cambiarlas</span>}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {order.alts.map((p, j) => (
                <Photo key={p.crudo} p={p} img={getImg(p.copia)} onClick={() => open && takeAlt(j)}>
                  {open && <button type="button" className={mini} title={selected >= 0 ? 'Cambiar por la elegida' : 'Agregar al carrusel'} onClick={() => takeAlt(j)}><ArrowUp size={12} /></button>}
                </Photo>
              ))}
            </div>
          </>
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-3">
        {/* barrio */}
        <Section title="Barrio">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <MapPin size={15} className="text-[#EB4511]" />
            <span className="font-bold">{d.barrio || (d.barrioConfirmado ? 'Sin barrio' : '—')}</span>
            <span className={`text-xs ${d.barrioConfirmado ? 'text-green-600' : 'text-amber-700'}`}>{d.barrioConfirmado ? 'confirmado' : 'sin confirmar'}</span>
          </div>
          {open && (
            <div className="flex flex-wrap gap-2">
              <input className={`${input} flex-1 min-w-[160px]`} value={barrio} onChange={e => setBarrio(e.target.value)} placeholder="Barrio" />
              <button type="button" className={btnMain} disabled={!!busy || !barrio.trim()}
                onClick={() => run('barrio', () => redesCall('redes_update', { draftId, cambios: { barrio: barrio.trim(), barrioConfirmado: true } }), 'Barrio confirmado (queda guardado para esta dirección).')}>
                <Check size={14} /> Confirmar
              </button>
              <button type="button" className={btnGhost} disabled={!!busy}
                onClick={() => run('barrio', () => redesCall('redes_update', { draftId, cambios: { sinBarrio: true } }), 'Guardado sin barrio.')}>Sin barrio</button>
            </div>
          )}
        </Section>

        {/* agency */}
        <Section title="Inmobiliaria">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Building size={15} className="text-gray-500" />
            <span className="font-bold">{d.inmobiliaria || 'Sin identificar'}</span>
          </div>
          {open && (
            <div className="flex flex-wrap gap-2">
              <select className={`${input} flex-1 min-w-[160px]`} value={brandPick} onFocus={loadBrands} onClick={loadBrands} onChange={e => setBrandPick(e.target.value)}>
                <option value="">Elegí una marca…</option>
                <option value="particular">Particular (sin inmobiliaria)</option>
                {(brands || []).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <button type="button" className={btnGhost} disabled={!!busy || !brandPick}
                onClick={() => run('inmo', () => redesCall('redes_update', { draftId, cambios: { inmobiliaria: brandPick } }), 'Inmobiliaria guardada.')}>
                <Check size={14} /> Usar
              </button>
            </div>
          )}
        </Section>
      </div>

      {/* caption */}
      <Section title="Texto"
        right={<div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => navigator.clipboard.writeText(text).then(() => setMsg({ error: '', ok: 'Texto copiado.' }))}><Copy size={14} /> Copiar</button>
          {open && <button type="button" className={btnGhost} disabled={!!busy}
            onClick={() => (!textDirty && text === (d.copyIA || '') || window.confirm('Regenerar reemplaza el texto actual. ¿Seguimos?')) &&
              run('regen', () => redesCall('redes_regenerate_copy', { draftId }), r => (r && r.problems && r.problems.length ? 'Texto nuevo, pero no pasó: ' + r.problems.join('; ') : 'Texto nuevo.'))}>
            {busy === 'regen' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerar
          </button>}
        </div>}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-gray-400 mb-1">Final (lo que se publica){busy === 'regen' && ' · Gemini está escribiendo (10–25 s)…'}</div>
            <textarea className={`${input} min-h-[220px] font-sans`} value={text} onChange={e => setText(e.target.value)} disabled={!open} />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[11px] ${text.length > 2200 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{text.length} / 2200</span>
              {open && textDirty && (
                <button type="button" className={btnMain} disabled={!!busy}
                  onClick={() => run('texto', () => redesCall('redes_update', { draftId, cambios: { copyFinal: text } }), 'Texto guardado.')}>
                  <Check size={14} /> Guardar texto
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 mb-1">Versión de Gemini</div>
            <pre className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 rounded-lg border border-gray-100 p-3 min-h-[220px] font-sans">{d.copyIA || '—'}</pre>
          </div>
        </div>
      </Section>

      {/* style + actions */}
      <Section title="Acciones">
        {open && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">Estilo de placas:</span>
            {['estandar', 'noche'].map(e => (
              <button key={e} type="button" disabled={!!busy}
                onClick={() => d.estilo !== e && run('estilo', () => redesCall('redes_update', { draftId, cambios: { estilo: e } }), '')}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${(d.estilo || 'estandar') === e ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>
                {e === 'estandar' ? 'Estándar' : 'Noche'}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          {d.estado === 'pendiente' && (
            <button type="button" className={btnMain} disabled={!!busy || textDirty || orderDirty}
              title={textDirty || orderDirty ? 'Guardá los cambios primero' : ''}
              onClick={() => run('aprobar', () => redesCall('redes_approve', { draftId }), r => (r && r.correccion ? 'Aprobado. Tu corrección del texto queda como ejemplo para Gemini.' : 'Aprobado.'))}>
              {busy === 'aprobar' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Aprobar
            </button>
          )}
          {['aprobado', 'programado'].includes(d.estado) && (
            <div className="flex items-end gap-2">
              <label className="text-[11px] text-gray-400">Fecha
                <input type="date" className={`${input} mt-1`} value={fecha} onChange={e => setFecha(e.target.value)} />
              </label>
              <button type="button" className={btnGhost} disabled={!!busy || !fecha}
                onClick={() => run('programar', () => redesCall('redes_schedule', { draftId, fecha }), 'Programado.')}>
                <CalendarDays size={14} /> {d.estado === 'programado' ? 'Reprogramar' : 'Programar'}
              </button>
            </div>
          )}
          <button type="button" className={btnGhost} disabled={!!busy || !order.fotos.length} onClick={download}>
            {busy === 'zip' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar paquete
          </button>
          {['aprobado', 'programado'].includes(d.estado) && (
            <div className="flex items-end gap-2">
              <label className="text-[11px] text-gray-400">Link (opcional)
                <input className={`${input} mt-1 w-56`} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" />
              </label>
              <button type="button" className={btnMain} disabled={!!busy}
                onClick={() => run('publicar', () => redesCall('redes_mark_published', { draftId, url }), 'Marcado como publicado.')}>
                <Send size={14} /> Marcar publicado
              </button>
            </div>
          )}
          {open && !discarding && (
            <button type="button" className={`${btnGhost} text-red-600 ml-auto`} disabled={!!busy} onClick={() => setDiscarding(true)}><Trash2 size={14} /> Descartar</button>
          )}
          {d.estado === 'publicado' && d.publicadoUrl && (
            <a href={d.publicadoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600"><ExternalLink size={14} /> Ver publicación</a>
          )}
        </div>
        {open && discarding && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="text-[11px] text-red-700">Motivo
              <select className={`${input} mt-1`} value={motivo} onChange={e => setMotivo(e.target.value)}>
                {MOTIVOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            {motivo === 'otro' && <input className={`${input} w-56`} value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} placeholder="¿Por qué?" />}
            <button type="button" className={`${btn} bg-red-600 text-white hover:bg-red-700`} disabled={!!busy || (motivo === 'otro' && !motivoOtro.trim())}
              onClick={() => run('descartar', () => redesCall('redes_discard', { draftId, motivo: motivo === 'otro' ? motivoOtro.trim() : motivo }), 'Descartado.').then(() => setDiscarding(false))}>
              <Trash2 size={14} /> Descartar
            </button>
            <button type="button" className={btnGhost} onClick={() => setDiscarding(false)}>Cancelar</button>
          </div>
        )}
        <p className="mt-3 text-[11px] text-gray-400">El paquete trae las fotos en orden (01.jpg, 02.jpg…) y copy.txt. Publicar: descargalo, subilo desde el celular y volvé a marcarlo como publicado.</p>
      </Section>
    </div>
  );
}
