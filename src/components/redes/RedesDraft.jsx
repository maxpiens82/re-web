import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, Check, Copy, RefreshCw, Download, Send,
  CalendarDays, Trash2, AlertTriangle, MapPin, Building, ExternalLink, Images, Layers, Pencil, X, Smartphone, Film,
} from 'lucide-react';
import { redesCall, FALTANTES, MOTIVOS, daysLeft, fmtDate } from './redesApi';
import usePhotos from './usePhotos';
import MiniLogo from '../MiniLogo';
import LoadingLogo from '../LoadingLogo';
import { renderSlides, blobToBase64, loadTemplates, parseEstilo, estiloOf, seriesOf, serieLabel, servicesText } from './slides';
import { closingOf, disenoFor, startSettings, toSaved, settingsKey, renderEndscreen, canMakeVideo, brandForDraft } from './cierre';
import EndScreen from '../../endscreen/EndScreen.jsx';
import SeriesSamples from './SeriesSamples';
import InstagramPreview from './InstagramPreview';
import InstagramField from './InstagramField';

const ESTADO_COLOR = { pendiente: 'bg-amber-500', aprobado: 'bg-green-600', programado: 'bg-blue-600', publicado: 'bg-gray-800', descartado: 'bg-gray-400' };
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
const pill = on => `px-3 py-1 rounded-full text-xs font-bold border disabled:opacity-60 ${on ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`;

function Photo({ p, img, selected, onClick, children, draggable, onDragStart, onDrop, label }) {
  return (
    <div className={`relative rounded-lg overflow-hidden border-2 ${selected ? 'border-[#EB4511]' : 'border-transparent'} bg-gray-100`}
      draggable={draggable} onDragStart={onDragStart} onDragOver={e => draggable && e.preventDefault()} onDrop={onDrop}>
      <button type="button" onClick={onClick} className="block w-full aspect-square">
        {img && img.url ? <img src={img.url} alt="" className="w-full h-full object-cover" draggable={false} />
          : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 p-1 text-center">
            {img ? (img.pending ? 'Drive todavía no hizo la miniatura' : (img.error || 'Sin vista previa')) : <MiniLogo className="w-8 h-8 text-[#E53B12]" />}
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

// "Arrobar en el texto": one account's toggle (weekend plan). Off when there's no handle to tag.
function ArrobaSwitch({ on, handle, disabled, onChange }) {
  const can = !!handle;
  return (
    <label className={`inline-flex items-center gap-2 text-[11px] font-bold select-none ${can ? 'text-gray-600 cursor-pointer' : 'text-gray-300'}`}
      title={can ? '' : 'Cargá primero su Instagram'}>
      <span className={`relative inline-block w-8 h-4 rounded-full transition-colors ${on && can ? 'bg-[#EB4511]' : 'bg-gray-300'}`}>
        <input type="checkbox" className="sr-only" checked={on && can} disabled={disabled || !can} onChange={e => onChange(e.target.checked)} />
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${on && can ? 'left-4' : 'left-0.5'}`} />
      </span>
      Arrobar en el texto
    </label>
  );
}

// A slide's name in the package: numbered, except the two closings, which are alternatives. The supercut keeps its
// place in the numbering and its own format (Instagram crops it to 4:5 when publishing).
const packageName = (it, i) => (it.supercut ? `${String(i + 1).padStart(2, '0')}-supercut.${/quicktime/.test(it.mime || '') ? 'mov' : 'mp4'}`
  : it.video ? 'cierre-end-screen.mp4' : it.cierre ? 'cierre-plantilla.jpg' : `${String(i + 1).padStart(2, '0')}.jpg`);
// Where the supercut goes among the slides before the closing: the saved place, else right after the cover (after the
// cover's panorama, in a series that has one).
const supercutAt = (d, body) => Math.max(0, Math.min(body.length, d.supercutPos === null || d.supercutPos === undefined
  ? (body[1] && body[1].panorama ? 2 : 1) : d.supercutPos));
// "@agencia" out of a text: the @ and the space before it (the text is edited, then saved with Guardar cambios).
const withoutHandle = (t, handle) => !handle ? t : t.replace(new RegExp(`\\s?@${handle.replace(/[.]/g, '\\.')}(?!\\w|\\.\\w)`, 'gi'), '')
  .replace(/ {2,}/g, ' ').replace(/ ([.,;:!?])/g, '$1');
// The photos on screen (or their order) differ from the draft's.
const orderChanged = (o, dr) => JSON.stringify(o.fotos.map(p => p.crudo)) !== JSON.stringify(dr.fotos.map(p => p.crudo)) ||
  JSON.stringify(o.alts.map(p => p.crudo)) !== JSON.stringify(dr.alternativas.map(p => p.crudo));

export default function RedesDraft({ draftId, cache, fullCache, onBack }) {
  const [data, setData] = useState({ loading: true, draft: null, booking: null, error: '' });
  const [order, setOrder] = useState(null);          // { fotos, alts } local, until saved
  const [selected, setSelected] = useState(-1);
  const [dragFrom, setDragFrom] = useState(-1);
  const [text, setText] = useState('');
  const [videoProblem, setVideoProblem] = useState('');   // why the end screen video isn't in the package
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
  const [slides, setSlides] = useState({ key: '', items: [] });   // rendered placas (object URLs)
  const [tplProblems, setTplProblems] = useState([]);
  // Unsaved changes: the browser asks before closing or reloading the tab (Santi, 11 Nov 2026: a text was lost).
  const dirtyRef = useRef(false);
  useEffect(() => {
    const warn = e => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const slideUrls = useRef([]);
  useEffect(() => () => slideUrls.current.forEach(u => URL.revokeObjectURL(u)), []);
  // Closing video (end screen): kept while its settings don't change, so it isn't encoded again.
  const video = useRef(null);                       // { key, item: { blob, url, poster, video: true } }
  useEffect(() => () => { const v = video.current; if (v) { URL.revokeObjectURL(v.item.url); URL.revokeObjectURL(v.item.poster); } }, []);
  const [vprog, setVprog] = useState(null);          // { done, total } while it encodes
  // The supercut (weekend plan, 14 Nov 2026), downloaded once in pieces through redes_video: { copia, item }.
  const supercutRef = useRef(null);
  useEffect(() => () => { const s = supercutRef.current; if (s) URL.revokeObjectURL(s.item.url); }, []);
  const [scprog, setScprog] = useState(null);        // { done, total } bytes while it downloads
  const [editor, setEditor] = useState(null);        // start settings while the end screen editor is open
  const brandsRef = useRef(null);
  const [series, setSeries] = useState([]);          // template series in Plantillas: ["serie1", "serie2"…]
  const [samples, setSamples] = useState(false);     // showing how each series looks
  const [preview, setPreview] = useState(false);     // "Ver como en Instagram"
  const [ocultos, setOcultos] = useState([]);        // designs hidden for everyone ("serie3", "serie5-noche"), redes_config
  useEffect(() => {
    let alive = true;
    redesCall('redes_config').then(r => { if (alive) setOcultos(r.ocultos || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const toggleOculto = (estilo, oculto) => redesCall('redes_config', { ocultar: { estilo, oculto } }).then(r => setOcultos(r.ocultos || []))
    .catch(e => setMsg({ error: e.message, ok: '' }));
  useEffect(() => {
    let alive = true;
    loadTemplates().then(t => { if (alive) setSeries(seriesOf(t)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const loadBrandLogo = useCallback(async (id, kind) => {
    const r = await redesCall('marcas_logo', { id, kind });
    return `data:${r.mime};base64,${r.base64}`;
  }, []);

  // A draft from the server, after any action. What the producer changed and hasn't saved stays as they left it:
  // before, choosing a design or confirming the barrio wiped an unsaved text. Only an action that replaces a
  // field on purpose (`replace`: Regenerar the text, Sin barrio the barrio, Guardar cambios all) overwrites it.
  const apply = (nd, replace = {}) => {
    const old = data.draft;
    setData(s => ({ ...s, loading: false, draft: nd }));
    setOrder(o => (old && o && !replace.order && orderChanged(o, old) ? o : { fotos: nd.fotos, alts: nd.alternativas }));
    setText(t => (old && !replace.text && t !== (old.copyFinal || '') ? t : (nd.copyFinal || '')));
    setBarrio(x => (old && !replace.barrio && x.trim() !== (old.barrio || '').trim() ? x : (nd.barrio || '')));
  };

  useEffect(() => {
    let alive = true;
    redesCall('redes_get', { draftId }).then(r => {
      if (!alive) return;
      setData({ loading: false, draft: r.draft, booking: r.booking, supercut: r.supercut || null, error: '' });
      setOrder({ fotos: r.draft.fotos, alts: r.draft.alternativas });
      setText(r.draft.copyFinal || '');
      setBarrio(r.draft.barrio || '');
    }).catch(e => { if (alive) setData({ loading: false, draft: null, booking: null, error: e.message }); });
    return () => { alive = false; };
  }, [draftId]);

  const all = order ? order.fotos.concat(order.alts) : [];
  const getImg = usePhotos(cache, draftId, all.map(p => p.copia));

  const run = async (name, fn, okText, replace) => {
    setBusy(name); setMsg({ error: '', ok: '' });
    try {
      const r = await fn();
      if (r && r.draft) apply(r.draft, replace);
      setMsg({ error: '', ok: typeof okText === 'function' ? okText(r) : (okText || '') });
      return r;
    } catch (e) {
      setMsg({ error: e.message, ok: '' });
      return null;
    } finally { setBusy(''); }
  };

  if (data.loading) return <LoadingLogo message="Cargando boceto" />;
  if (data.error || !data.draft) return (
    <div className="max-w-3xl mx-auto p-4">
      <button type="button" onClick={onBack} className={btnGhost}><ArrowLeft size={14} /> Volver</button>
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{data.error || 'No se encontró el borrador.'}</div>
    </div>
  );

  const d = data.draft, b = data.booking;
  const open = !FINAL.includes(d.estado);
  const orderDirty = !!order && orderChanged(order, d);
  // Everything changed on screen and not saved yet, saved together by "Guardar cambios" (Max, 11 Nov 2026).
  const textDirty = text !== (d.copyFinal || '');
  const barrioDirty = open && barrio.trim() !== '' && barrio.trim() !== (d.barrio || '').trim();
  const inmoDirty = open && brandPick !== '' && brandPick !== (d.inmobiliaria || '');
  const pending = open ? [textDirty && 'el texto', orderDirty && 'el orden de las fotos', barrioDirty && 'el barrio', inmoDirty && 'la inmobiliaria'].filter(Boolean) : [];
  dirtyRef.current = pending.length > 0;
  const saveAll = () => {
    const cambios = {};
    if (textDirty) cambios.copyFinal = text;
    if (orderDirty) { cambios.fotos = order.fotos.map(p => p.crudo); cambios.alternativas = order.alts.map(p => p.crudo); }
    if (barrioDirty) { cambios.barrio = barrio.trim(); cambios.barrioConfirmado = true; }
    if (inmoDirty) cambios.inmobiliaria = brandPick;
    return run('guardar', () => redesCall('redes_update', { draftId, cambios }), 'Cambios guardados.', { text: true, order: true, barrio: true });
  };
  // Which accounts the text tags (weekend plan, 14 Nov 2026). Saved at once; switching one off also takes its @ out
  // of the text on screen (then Guardar cambios), switching one on asks for Regenerar if the text doesn't have it.
  const arrobas = d.arrobas || { inmobiliaria: true, cliente: false };
  const toggleArroba = (kind, on, handle) => run('arrobas', () => redesCall('redes_update', { draftId, cambios: { arrobas: { ...arrobas, [kind]: on } } }),
    !on ? (handle && text.toLowerCase().includes('@' + handle.toLowerCase()) ? `Saqué @${handle} del texto: tocá Guardar cambios.` : 'Listo: no se arroba.')
      : handle && !text.toLowerCase().includes('@' + handle.toLowerCase()) ? `Listo. El texto todavía no menciona a @${handle}: tocá Regenerar, o agregalo a mano.` : 'Listo: se arroba.')
    .then(r => { if (r && !on && handle) setText(t => withoutHandle(t, handle)); });
  const undoAll = () => {
    setText(d.copyFinal || ''); setOrder({ fotos: d.fotos, alts: d.alternativas }); setSelected(-1); setBarrio(d.barrio || ''); setBrandPick('');
  };
  const leave = () => {
    if (pending.length && !window.confirm(`Tenés cambios sin guardar (${pending.join(', ')}). ¿Salir sin guardarlos?`)) return;
    onBack();
  };
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

  // --- closing slide (carousels): end screen video or the template (spec §7.2b) ---
  const closing = closingOf(d);
  const ensureBrands = () => {
    if (!brandsRef.current) {
      brandsRef.current = redesCall('marcas_list').then(r => { setBrands(r.brands || []); return r.brands || []; })
        .catch(e => { brandsRef.current = null; throw e; });
    }
    return brandsRef.current;
  };
  const saveEndscreen = (saved, okText) =>
    run('cierre', () => redesCall('redes_update', { draftId, cambios: { diseno: disenoFor('endscreen', saved) } }), okText || '');
  const openEditor = () => run('editor', async () => { setEditor(startSettings(closing, d, await ensureBrands())); }, '');
  // The MP4 for the current settings (reused while they don't change), plus a still for the strip.
  const closingVideo = async () => {
    const list = await ensureBrands();
    const settings = startSettings(closing, d, list);
    const key = settingsKey(settings);
    if (video.current && video.current.key === key) return video.current.item;
    setVprog({ done: 0, total: 0 });
    try {
      const { blob, still } = await renderEndscreen(settings, { brands: list, loadBrandLogo, onProgress: (done, total) => setVprog({ done, total }) });
      const old = video.current;
      if (old) { URL.revokeObjectURL(old.item.url); URL.revokeObjectURL(old.item.poster); }
      const item = { plantilla: 'end screen (video)', blob, url: URL.createObjectURL(blob), poster: URL.createObjectURL(still), video: true, warning: '' };
      video.current = { key, item };
      return item;
    } finally { setVprog(null); }
  };

  // --- placas: rendered from the SAVED draft (order, barrio, estilo, closing), so they match what's stored ---
  const look = parseEstilo(d.estilo);
  const sc = data.supercut;
  const slidesKeyOf = dr => JSON.stringify([dr.tipo, dr.fotos.map(p => p.crudo), dr.barrio || '', dr.estilo || '', dr.inmobiliaria || '',
    closing && closing.saved, sc && sc.copia, dr.supercutPos]);
  const slidesKey = slidesKeyOf(d);
  // The supercut as a slide: its bytes come from Drive in pieces (an Apps Script answer can't carry 50 MB at once).
  const supercutItem = async () => {
    if (supercutRef.current && supercutRef.current.copia === sc.copia) return supercutRef.current.item;
    const parts = [];
    let got = 0, size = sc.bytes || 0;
    setScprog({ done: 0, total: size });
    try {
      for (;;) {
        const r = await redesCall('redes_video', { draftId, fileId: sc.copia, offset: got, length: 5 * 1024 * 1024 });
        size = r.size || size;
        if (!r.base64) break;
        const bin = atob(r.base64);
        const bytes = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        parts.push(bytes);
        got += bytes.length;
        setScprog({ done: got, total: size });
        if (size && got >= size) break;
      }
    } finally { setScprog(null); }
    const blob = new Blob(parts, { type: sc.mime || 'video/mp4' });
    const item = { supercut: true, video: true, blob, url: URL.createObjectURL(blob), mime: sc.mime, plantilla: `supercut de ${sc.editor || 'el editor'}`, warning: '' };
    if (supercutRef.current) URL.revokeObjectURL(supercutRef.current.item.url);
    supercutRef.current = { copia: sc.copia, item };
    return item;
  };
  // Photos' slides with the supercut at its place, then the closings.
  const withSupercut = (list, dr, item) => {
    const body = list.filter(it => !it.cierre && !(it.video && !it.supercut) && !it.supercut);
    const end = list.filter(it => it.cierre || (it.video && !it.supercut));
    if (!item) return body.concat(end);
    const at = supercutAt(dr, body);
    return body.slice(0, at).concat([item], body.slice(at), end);
  };
  // What the templates' fields get: the barrio, the booked services and the agency's @ (its name when
  // it has no Instagram; nothing for a private owner, so that line is hidden).
  const camposFor = async () => {
    const brand = brandForDraft(d, await ensureBrands().catch(() => []));
    const ig = brand && String(brand.instagram || '').trim();
    return { barrio: d.barrio || '', servicios: servicesText(b && b.servicios),
      inmobiliaria: brand ? (ig ? (ig.startsWith('@') ? ig : '@' + ig) : brand.name) : '' };
  };
  const slidesFresh = slides.key === slidesKey && slides.items.length > 0;
  const makeSlides = async () => {
    const templates = await loadTemplates();
    setTplProblems(templates.filter(t => !t.ok).map(t => `${t.name}: ${t.problems.join('; ')}`));
    await fullCache.load(draftId, d.fotos.map(p => p.copia));
    // A carousel closes both ways, to choose when publishing (Max, 8 Nov 2026): the template's slide and the end
    // screen video, the edited one or else the default. A video that can't be made doesn't stop the package.
    const items = await renderSlides({ tipo: d.tipo, fotos: d.fotos, estilo: d.estilo, cierre: 'plantilla', campos: await camposFor(),
      photoBlob: id => (fullCache.get(id) || {}).blob });
    slideUrls.current.forEach(u => URL.revokeObjectURL(u));
    slideUrls.current = items.map(it => it.url);       // the video's URLs live in `video`
    let all = items;
    setVideoProblem('');
    if (closing) {
      try { all = items.concat([await closingVideo()]); }
      catch (e) { setVideoProblem(e.message); }
    }
    let scItem = null;
    if (sc) {
      try { scItem = await supercutItem(); }
      catch (e) { setVideoProblem('el supercut no se pudo bajar: ' + e.message); }
    }
    all = withSupercut(all, d, scItem);
    setSlides({ key: slidesKey, items: all });
    return all;
  };
  // The supercut one place earlier or later, saved at once, like the design: the slides are reordered here, no rendering.
  const moveSupercut = delta => {
    const body = slides.items.filter(it => !it.cierre && !(it.video && !it.supercut));
    const now = body.findIndex(it => it.supercut);
    const to = Math.max(0, Math.min(body.length - 1, now + delta));
    if (now < 0 || to === now) return;
    run('supercut', () => redesCall('redes_update', { draftId, cambios: { supercutPos: to } }), '').then(r => {
      if (r && r.draft) setSlides(s => ({ key: slidesKeyOf(r.draft), items: withSupercut(s.items, r.draft, s.items.find(it => it.supercut)) }));
    });
  };
  // Each placa (and the closing video) goes to Composites/<draftId>/ in Drive (one call per slide;
  // it's the backup copy). The supercut doesn't: it's in Redes already, and too big for that call.
  const saveSlides = async all => {
    const items = all.filter(it => !it.supercut);
    let last = null;
    for (let i = 0; i < items.length; i++) {
      last = await redesCall('redes_composite_save', { draftId, slide: i + 1, total: items.length, base64: await blobToBase64(items[i].blob),
        ...(items[i].video ? { mime: 'video/mp4' } : {}) });
    }
    return last;
  };

  const download = () => run('zip', async () => {
    const zip = new JSZip();
    let items = slidesFresh ? slides.items : null, note = '';
    if (!items) {
      try { items = await makeSlides(); }
      catch (e) { note = ` Sin placas (${e.message}): van las fotos.`; }
    }
    if (items) {
      items.forEach((it, i) => zip.file(packageName(it, i), it.blob));
    } else {
      await fullCache.load(draftId, order.fotos.map(p => p.copia));
      order.fotos.forEach((p, i) => {
        const img = fullCache.get(p.copia);
        if (!img || !img.blob) throw new Error(`La foto ${i + 1} todavía no está disponible. Probá de nuevo en un rato.`);
        zip.file(`${String(i + 1).padStart(2, '0')}.jpg`, img.blob);
      });
    }
    zip.file('copy.txt', text || d.copyFinal || '');
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `RE_${slug(d.barrio)}_${todayIso()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    // The placas also go to Drive (backup), unless the draft is already closed.
    if (items && open) return { ...(await saveSlides(items)), note };
    return { note };
  }, r => 'Paquete descargado.' + ((r && r.note) || '') + (r && r.fileId ? ' Placas guardadas en Drive.' : ''));

  const loadBrands = () => { ensureBrands().catch(e => setMsg({ error: e.message, ok: '' })); };

  const fact = [b && b.servicios && b.servicios.join(' · '), b && b.metros ? `${b.metros} m²` : '', b && b.fecha ? `Sesión ${fmtDate(b.fecha + 'T12:00')}` : '', b && b.empresa ? `EMPRESA: ${b.empresa}` : '']
    .filter(Boolean).join('  ·  ');

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-4 flex flex-col gap-3">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={leave} className={btnGhost}><ArrowLeft size={14} /> Cola</button>
        <span className={`text-[11px] font-bold uppercase text-white rounded-full px-2.5 py-1 ${ESTADO_COLOR[d.estado] || 'bg-gray-500'}`}>{d.estado}</span>
        <span className="text-sm font-bold text-gray-700">{d.tipo === 'suelta' ? 'Foto suelta' : 'Carrusel'}</span>
        {left !== null && <span className={`text-xs font-bold ${left <= 3 ? 'text-red-600' : 'text-gray-500'}`}>Vence en {Math.max(0, left)} día{left === 1 ? '' : 's'}</span>}
        {d.estado === 'programado' && <span className="text-xs font-bold text-blue-600">Programado para {fmtDate(d.fechaProgramada)}</span>}
        {d.estado === 'descartado' && <span className="text-xs text-gray-500">Motivo: {d.motivoDescarte}</span>}
        <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[50%]">{d.draftId}</span>
      </div>
      {b && (
        <div className="flex items-center gap-1.5 text-base font-bold text-gray-800">
          <MapPin size={16} className="text-[#EB4511] shrink-0" /> {b.direccion || 'Sin dirección'}
        </div>
      )}
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
          <button type="button" className={btnGhost} onClick={() => { setOrder({ fotos: d.fotos, alts: d.alternativas }); setSelected(-1); }}>Deshacer</button>
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

      {/* placas */}
      <Section title="Placas"
        right={<div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} disabled={!!busy || orderDirty || !order.fotos.length}
            title={orderDirty ? 'Guardá los cambios primero' : 'La publicación a pantalla completa, como se ve en el celular'}
            onClick={async () => { if (slidesFresh || await run('placas', makeSlides, '')) setPreview(true); }}>
            <Smartphone size={14} /> Ver como en Instagram
          </button>
          <button type="button" className={btnGhost} disabled={!!busy || orderDirty || !order.fotos.length}
            title={orderDirty ? 'Guardá los cambios primero' : ''}
            onClick={() => run('placas', makeSlides, items => {
              const w = (items || []).filter(it => it.warning).length;
              return w ? `Placas listas, pero ${w} con texto muy largo.` : 'Placas listas.';
            })}>
            {busy === 'placas' ? <MiniLogo className="w-4 h-4" /> : <Layers size={14} />} {slides.items.length ? 'Actualizar placas' : 'Generar placas'}
          </button>
        </div>}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Diseño:</span>
          {(series.length ? series : [look.serie])
            .filter(se => se === look.serie || !(ocultos.includes(estiloOf(se, false)) && ocultos.includes(estiloOf(se, true)))).map(se => (
            <button key={se} type="button" disabled={!open || !!busy} className={pill(look.serie === se)}
              onClick={() => look.serie !== se && run('estilo', () => redesCall('redes_update', { draftId, cambios: { estilo: estiloOf(se, look.noche) } }), '')}>
              {serieLabel(se)}
            </button>
          ))}
          <span className="w-px h-5 bg-gray-200 mx-1" />
          {[[false, 'Día'], [true, 'Noche']].map(([n, l]) => (
            <button key={l} type="button" disabled={!open || !!busy || (look.noche !== n && ocultos.includes(estiloOf(look.serie, n)))}
              title={look.noche !== n && ocultos.includes(estiloOf(look.serie, n)) ? 'Oculta' : ''} className={pill(look.noche === n)}
              onClick={() => look.noche !== n && run('estilo', () => redesCall('redes_update', { draftId, cambios: { estilo: estiloOf(look.serie, n) } }), '')}>
              {l}
            </button>
          ))}
          <button type="button" className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-[#E53B12] hover:underline" onClick={() => setSamples(true)}>
            <Images size={14} /> Ver cómo es cada serie
          </button>
        </div>
        {samples && (
          <SeriesSamples series={series} tipo={d.tipo} current={look} canChoose={open && !busy} onClose={() => setSamples(false)}
            ocultos={ocultos} onToggleOculto={toggleOculto}
            onChoose={(se, n) => {
              setSamples(false);
              run('estilo', () => redesCall('redes_update', { draftId, cambios: { estilo: estiloOf(se, n) } }), '');
            }} />
        )}
        {closing && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Cierre: el paquete trae los dos, la plantilla y el video del end screen{closing.saved ? ' (editado)' : ''}.</span>
            {open && (
              <button type="button" className={btnGhost} disabled={!!busy} onClick={openEditor}>
                {busy === 'editor' ? <MiniLogo className="w-4 h-4" /> : <Pencil size={14} />} Editar end screen
              </button>
            )}
            {!canMakeVideo() && <span className="text-[11px] font-bold text-red-600">Este navegador no arma el video: usá Chrome o Edge.</span>}
            {videoProblem && <span className="text-[11px] font-bold text-red-600">Sin video: {videoProblem}</span>}
          </div>
        )}
        {sc && (
          <p className="mb-3 text-xs text-gray-500">
            <Film size={13} className="inline -mt-0.5 mr-1 text-[#EB4511]" />
            Supercut de {sc.editor || 'el editor'} ({Math.round((sc.bytes || 0) / 1e6)} MB): va como una placa más, en el lugar que elijas con las flechas.
            Instagram lo recorta a 4:5 al publicar.
          </p>
        )}
        {tplProblems.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Plantillas con problemas (no se usan): {tplProblems.join(' · ')}
          </div>
        )}
        {busy === 'placas' || (busy === 'zip' && !slidesFresh) ? (
          <div className="py-10 flex flex-col items-center gap-3 text-[#E53B12]">
            <MiniLogo className="w-12 h-12" />
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 animate-pulse">
              {scprog ? `Bajando el supercut: ${Math.round(scprog.done / 1e6)} de ${Math.round(scprog.total / 1e6) || '?'} MB…`
                : vprog ? (vprog.total ? `Video del cierre: ${vprog.done}/${vprog.total} cuadros…` : 'Preparando el video del cierre…') : 'Armando placas…'}
            </p>
          </div>
        ) : !slides.items.length ? (
          <p className="text-xs text-gray-400">Las placas se arman con las plantillas ({serieLabel(look.serie)}, {look.noche ? 'noche' : 'día'}), las fotos en este orden, el barrio, los servicios y la inmobiliaria{closing ? ', y el cierre sale de las dos maneras: plantilla y video del end screen' : ''}. También se generan solas al descargar el paquete.</p>
        ) : (
          <>
            {!slidesFresh && <p className="mb-2 text-xs font-bold text-amber-700">Cambiaste fotos, barrio, diseño, inmobiliaria o end screen: tocá "Actualizar placas".</p>}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${slidesFresh ? '' : 'opacity-50'}`}>
              {slides.items.map((it, i) => (
                <figure key={it.url} className="m-0">
                  {it.video
                    ? <video src={it.url} poster={it.poster} controls muted loop playsInline className="w-full rounded-lg border border-gray-200 bg-[#1D1E20]" />
                    : <img src={it.url} alt="" className="w-full rounded-lg border border-gray-200" />}
                  <figcaption className="text-[10px] text-gray-500 mt-1">{packageName(it, i)} · {it.plantilla}</figcaption>
                  {it.supercut && open && slidesFresh && (
                    <div className="mt-1 flex gap-1">
                      <button type="button" className={btnGhost} disabled={!!busy} title="Un lugar antes" onClick={() => moveSupercut(-1)}><ChevronLeft size={12} /></button>
                      <button type="button" className={btnGhost} disabled={!!busy} title="Un lugar después" onClick={() => moveSupercut(1)}><ChevronRight size={12} /></button>
                    </div>
                  )}
                  {it.warning && <div className="text-[10px] font-bold text-red-600">{it.warning}</div>}
                </figure>
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
                onClick={() => run('barrio', () => redesCall('redes_update', { draftId, cambios: { sinBarrio: true } }), 'Guardado sin barrio.', { barrio: true })}>Sin barrio</button>
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

      {/* Instagram handles, typed once and kept: the agency's (placas, closing, text) and the client's */}
      {b && (
        <Section title="Instagram">
          <div className="grid md:grid-cols-2 gap-3">
            {d.inmobiliaria && d.inmobiliaria !== 'particular' ? (
              <div className="flex flex-col gap-1.5">
              <InstagramField label={`Inmobiliaria · ${d.inmobiliaria}`} value={b.inmobiliariaInstagram} disabled={!open}
                hint="Va en las placas, en el cierre y en el texto. Cambiarlo acá vale para todas sus publicaciones."
                onSave={async text => {
                  const r = await redesCall('marcas_instagram', { inmobiliaria: d.inmobiliaria, instagram: text });
                  setData(s => ({ ...s, booking: { ...s.booking, inmobiliariaInstagram: r.instagram || '' } }));
                  // The draft checks again what's missing ("La inmobiliaria no tiene Instagram cargado").
                  const u = await redesCall('redes_update', { draftId, cambios: { inmobiliaria: d.inmobiliaria } });
                  if (u.draft) apply(u.draft);
                  return r.instagram || '';
                }} />
              <ArrobaSwitch on={arrobas.inmobiliaria} handle={b.inmobiliariaInstagram} disabled={!open || !!busy} onChange={v => toggleArroba('inmobiliaria', v, b.inmobiliariaInstagram)} />
              </div>
            ) : <p className="text-xs text-gray-400 self-center">{d.inmobiliaria === 'particular' ? 'Particular: sin inmobiliaria.' : 'Elegí la inmobiliaria para cargar su Instagram.'}</p>}
            {b.cliente ? (
              <div className="flex flex-col gap-1.5">
              <InstagramField label={`Cliente · ${b.cliente.nombre || 'sin nombre'}`} value={b.cliente.instagram}
                hint="Queda guardado para este cliente."
                onSave={async text => {
                  const r = await redesCall('marcas_instagram', { cliente: b.cliente, instagram: text });
                  setData(s => ({ ...s, booking: { ...s.booking, cliente: { ...s.booking.cliente, instagram: r.instagram || '' } } }));
                  return r.instagram || '';
                }} />
              <ArrobaSwitch on={arrobas.cliente} handle={b.cliente.instagram} disabled={!open || !!busy} onChange={v => toggleArroba('cliente', v, b.cliente.instagram)} />
              </div>
            ) : <p className="text-xs text-gray-400 self-center">Esta publicación no tiene reserva con cliente.</p>}
          </div>
        </Section>
      )}

      {/* caption */}
      <Section title="Texto"
        right={<div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => navigator.clipboard.writeText(text).then(() => setMsg({ error: '', ok: 'Texto copiado.' }))}><Copy size={14} /> Copiar</button>
          {open && <button type="button" className={btnGhost} disabled={!!busy}
            onClick={() => (!textDirty && text === (d.copyIA || '') || window.confirm('Regenerar reemplaza el texto actual. ¿Seguimos?')) &&
              run('regen', () => redesCall('redes_regenerate_copy', { draftId }), r => (r && r.problems && r.problems.length ? 'Texto nuevo, pero no pasó: ' + r.problems.join('; ') : 'Texto nuevo.'), { text: true })}>
            {busy === 'regen' ? <MiniLogo className="w-4 h-4" /> : <RefreshCw size={14} />} Regenerar
          </button>}
        </div>}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-gray-400 mb-1">Final (lo que se publica){busy === 'regen' && ' · Gemini está escribiendo (10–25 s)…'}</div>
            <textarea className={`${input} min-h-[220px] font-sans`} value={text} onChange={e => setText(e.target.value)} disabled={!open} />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[11px] ${text.length > 2200 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{text.length} / 2200</span>
              {open && textDirty && <span className="text-[11px] font-bold text-amber-700">Sin guardar</span>}
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
        <div className="flex flex-wrap items-end gap-2">
          {d.estado === 'pendiente' && (
            <button type="button" className={btnMain} disabled={!!busy || pending.length > 0}
              title={pending.length ? 'Guardá los cambios primero' : ''}
              onClick={() => run('aprobar', () => redesCall('redes_approve', { draftId }), r => (r && r.correccion ? 'Aprobado. Tu corrección del texto queda como ejemplo para Gemini.' : 'Aprobado.'))}>
              {busy === 'aprobar' ? <MiniLogo className="w-4 h-4" /> : <Check size={14} />} Aprobar
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
            {busy === 'zip' ? <MiniLogo className="w-4 h-4" /> : <Download size={14} />} Descargar paquete
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
          {d.estado === 'descartado' && d.motivoDescarte !== 'paso a carrusel' && (
            <button type="button" className={btnGhost} disabled={!!busy}
              onClick={() => run('recuperar', async () => {
                const r = await redesCall('redes_restore', { draftIds: [draftId] });
                if (r.failed.length) throw new Error(r.failed[0].error);
                return redesCall('redes_get', { draftId });
              }, 'Recuperado: volvió a pendiente.')}>
              <RefreshCw size={14} /> Recuperar
            </button>
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
        <p className="mt-3 text-[11px] text-gray-400">El paquete trae las placas en orden (01.jpg, 02.jpg…), los dos cierres para elegir al publicar (cierre-plantilla.jpg y cierre-end-screen.mp4), y copy.txt; si las plantillas fallan, las fotos. Publicar: descargalo, subilo desde el celular y volvé a marcarlo como publicado.</p>
      </Section>

      {/* unsaved changes: one button saves them all, always in sight while scrolling */}
      {pending.length > 0 && (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 shadow-lg">
          <AlertTriangle size={16} className="text-amber-700 shrink-0" />
          <span className="flex-1 min-w-[180px] text-sm font-bold text-amber-800">Sin guardar: {pending.join(', ')}.</span>
          <button type="button" className={btnGhost} disabled={!!busy} onClick={undoAll}>Deshacer</button>
          <button type="button" className={btnMain} disabled={!!busy} onClick={saveAll}>
            {busy === 'guardar' ? <MiniLogo className="w-4 h-4" /> : <Check size={14} />} Guardar cambios
          </button>
        </div>
      )}

      {preview && slides.items.length > 0 && <InstagramPreview items={slides.items} caption={text} onClose={() => setPreview(false)} />}

      {/* end screen editor for the closing slide */}
      {editor && (
        <div className="fixed inset-0 z-[110] bg-black/40 flex">
          <div className="m-auto w-full h-full md:w-[95vw] md:h-[94vh] bg-[#F0F2F5] md:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E53B12] truncate">Cierre del carrusel{d.barrio ? ` · ${d.barrio}` : ''}</span>
              <button type="button" onClick={() => setEditor(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0">
              <EndScreen brands={brands || []} loadBrandLogo={loadBrandLogo} initialParams={editor.params} initialBrandId={editor.brandId} lockFormat
                onCancel={() => setEditor(null)}
                onUse={s => { setEditor(null); saveEndscreen(toSaved(s), 'Cierre guardado. Tocá "Actualizar placas" para armar el video.'); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
