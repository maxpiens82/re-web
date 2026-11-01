import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Loader2, X, ChevronDown, ChevronRight, RotateCcw, Upload, ScanLine, Check } from 'lucide-react';
import {
  DEFAULTS, CONTROLS, FORMATS, TEMPLATES, FPS_OPTIONS, RE_COLORS, DRIFT_MODES,
  normalizeParams, createScene, drawFrame, drawSafeZone, fileName, frameCount,
} from './engine.js';
import { prepareClientMark, describeMark } from './clientMark.js';
import { exportMp4, canExport } from './exportMp4.js';
import { loadReLogo } from './reLogo.js';
import { loadFonts, decodeImage } from './assets.js';

// Pantalla "End screen" del portal.
//
// props
//   brands         [{ id, name, instagram, accent, variantes, hasClaro, hasOscuro }]
//                  (en re-web: las filas activas de Inmobiliarias, vía gasPost('marcas_list'))
//   loadBrandLogo  (brandId, 'claro'|'oscuro') => Promise<string|Blob|null>
//                  (en re-web: gasPost('marcas_logo') y devolver un data URL). Que sea estable
//                  (useCallback): si cambia, se vuelven a pedir los logos.
//   initialParams  opcional, se mezcla con DEFAULTS
//   Para editar el cierre de un carrusel de Redes (REDES_SPEC §7.2b), todos opcionales:
//   initialBrandId la inmobiliaria ya elegida
//   lockFormat     sin selector de formato (el carrusel es 4:5)
//   onUse          ({ params, brandId }) => void: muestra "Usar en este carrusel" en lugar de
//                  exportar, y oculta "Otro logo" (un archivo subido no se puede guardar en el borrador)
//   onCancel       muestra "Cancelar"

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function Label({ children, hint }) {
  return (
    <div className="flex justify-between items-baseline mb-1">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{children}</span>
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#E53B12]';

function Slider({ k, value, onChange }) {
  const c = CONTROLS[k];
  const shown = k === 'zoom' ? `${Math.round((value - 1) * 1000) / 10} %` : `${value}${c.unit && c.unit !== '%' ? ' ' + c.unit : ''}`;
  return (
    <label className="block">
      <Label hint={shown}>{c.label}</Label>
      <input type="range" min={c.min} max={c.max} step={c.step} value={value}
        onChange={e => onChange(k, Number(e.target.value))} className="w-full accent-[#E53B12]" />
    </label>
  );
}

export default function EndScreen({ brands = [], loadBrandLogo, initialParams, initialBrandId = '', lockFormat = false, onUse, onCancel }) {
  const [params, setParams] = useState(() => normalizeParams({ ...DEFAULTS, ...initialParams }));
  const [fonts, setFonts] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reLogo, setReLogo] = useState(null);
  const [brandId, setBrandId] = useState(initialBrandId);
  const [query, setQuery] = useState(() => (brands.find(b => b.id === initialBrandId) || {}).name || '');
  const [listOpen, setListOpen] = useState(false);
  const [logos, setLogos] = useState({ claro: null, oscuro: null, loading: !!initialBrandId && !!loadBrandLogo });
  const [upload, setUpload] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [exp, setExp] = useState({ running: false, done: 0, total: 0, message: '', error: false });
  const canvasRef = useRef(null);
  const abortRef = useRef(null);
  const clockRef = useRef({ start: 0, t: 0 });

  const brand = brands.find(b => b.id === brandId) || null;
  // Lo único de la marca que necesita el pedido de logos: así un array nuevo de brands (la misma
  // lista, recargada) no vuelve a pedirlos.
  const hasClaro = !!brand?.hasClaro, hasOscuro = !!brand?.hasOscuro;

  // Fuentes y logo de RE!: una vez.
  useEffect(() => {
    let alive = true;
    loadFonts().then(ok => { if (alive) setFonts(ok ? 'ready' : 'error'); });
    loadReLogo(RE_COLORS.naranja).then(img => { if (alive) setReLogo(img); });
    return () => { alive = false; };
  }, []);

  // Logos de la inmobiliaria elegida.
  useEffect(() => {
    if (!brandId || !loadBrandLogo) return undefined;
    let alive = true;
    const get = (kind, has) => (has ? loadBrandLogo(brandId, kind).then(decodeImage).catch(() => null) : Promise.resolve(null));
    Promise.all([get('claro', hasClaro), get('oscuro', hasOscuro)]).then(([claro, oscuro]) => { if (alive) setLogos({ claro, oscuro, loading: false }); });
    return () => { alive = false; };
  }, [brandId, hasClaro, hasOscuro, loadBrandLogo]);

  // Solo de las imágenes: el nombre va aparte (escribirlo no vuelve a analizar los logos).
  const mark = useMemo(() => {
    if (params.template !== 'cobrand') return null;
    return prepareClientMark({ claro: logos.claro, oscuro: logos.oscuro, upload });
  }, [params.template, logos.claro, logos.oscuro, upload]);

  const scene = useMemo(() => {
    if (fonts !== 'ready' || !reLogo) return null;
    return createScene(params, { reLogo, client: mark });
  }, [params, reLogo, mark, fonts]);

  // Bucle de la vista previa. Se detiene mientras se exporta.
  const exporting = exp.running;
  useEffect(() => {
    if (!scene || exporting) return undefined;
    const cv = canvasRef.current, g = cv.getContext('2d');
    let raf = 0, lastShown = -1;
    const clock = clockRef.current;
    clock.start = performance.now() - clock.t * 1000;   // sigue desde donde estaba
    const tick = now => {
      if (playing) clock.t = ((now - clock.start) / 1000) % scene.p.dur;
      drawFrame(g, scene, clock.t);
      if (showSafe) drawSafeZone(g, scene);
      const shown = Math.round(clock.t * 20);
      if (shown !== lastShown) { lastShown = shown; setTime(clock.t); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, playing, showSafe, exporting]);

  const set = (k, v) => setParams(p => normalizeParams({ ...p, [k]: v }));
  const setClient = (k, v) => setParams(p => normalizeParams({ ...p, client: { ...p.client, [k]: v } }));

  const chooseBrand = b => {
    setBrandId(b ? b.id : '');
    setQuery(b ? b.name : '');
    setListOpen(false);
    setUpload(null);
    setLogos({ claro: null, oscuro: null, loading: !!b && !!loadBrandLogo });
    setParams(p => normalizeParams({ ...p, client: b ? { name: b.name, instagram: b.instagram || '', accent: b.accent || '' } : DEFAULTS.client }));
  };

  const matches = useMemo(() => {
    const q = norm(query);
    const list = q ? brands.filter(b => norm(b.name).includes(q) || norm(b.variantes).includes(q)) : brands;
    return list.slice(0, 12);
  }, [brands, query]);

  const togglePlay = () => {
    const clock = clockRef.current;
    if (!playing) clock.start = performance.now() - clock.t * 1000;
    setPlaying(!playing);
  };
  const scrub = v => { setPlaying(false); clockRef.current.t = v * params.dur; setTime(clockRef.current.t); };

  const onUpload = async e => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setUploadError('');
    try { setUpload(await decodeImage(f)); } catch (err) { setUpload(null); setUploadError(`${f.name}: ${err.message}`); }
  };

  const startExport = async () => {
    if (!scene || scene.overflow.length) return;
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setExp({ running: true, done: 0, total: frameCount(scene.p), message: '', error: false });
    try {
      const { blob, h264 } = await exportMp4(scene, { signal: ctrl.signal, onProgress: (done, total) => setExp(s => ({ ...s, done, total })) });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fileName(params); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      setExp({ running: false, done: 0, total: 0, error: false, warn: !h264,
        message: `Listo: ${a.download} · ${(blob.size / 1e6).toFixed(1)} MB` +
          (h264 ? '' : '. Ojo: este equipo no codifica H.264 y se exportó en VP9. DaVinci Resolve puede no abrirlo: probá en otra PC.') });
    } catch (err) {
      const cancelled = err?.name === 'AbortError';
      setExp({ running: false, done: 0, total: 0, error: !cancelled, message: cancelled ? 'Exportación cancelada.' : (err?.message || 'No se pudo exportar.') });
    }
  };

  const f = FORMATS[params.format];
  const fitted = scene ? scene.items.filter(it => it.fitted).map(it => it.key) : [];
  const overflow = scene ? scene.overflow : [];
  const exportable = canExport();

  return (
    <div className="h-full bg-[#F0F2F5] font-sans text-gray-800 overflow-y-auto w-full">
      <div className="max-w-[1400px] w-full mx-auto p-3 flex flex-col lg:flex-row gap-4">

        {/* ---------- Controles ---------- */}
        <aside className="lg:w-[340px] shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="text-[#E53B12] text-[11px] font-bold uppercase tracking-wider">End screen</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
              {Object.entries(TEMPLATES).map(([k, name]) => (
                <button key={k} type="button" onClick={() => set('template', k)}
                  className={`rounded-md py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${params.template === k ? 'bg-white text-[#E53B12] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {name}
                </button>
              ))}
            </div>
            {lockFormat ? (
              <div className="text-[11px] text-gray-500">Formato: <b>{FORMATS[params.format].label}</b> (el del carrusel)</div>
            ) : (
              <label className="block">
                <Label>Formato</Label>
                <select className={inputCls} value={params.format} onChange={e => set('format', e.target.value)}>
                  {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Slider k="dur" value={params.dur} onChange={set} />
              <label className="block">
                <Label>Cuadros por segundo</Label>
                <select className={inputCls} value={params.fps} onChange={e => set('fps', Number(e.target.value))}>
                  {FPS_OPTIONS.map(v => <option key={v} value={v}>{v} fps</option>)}
                </select>
              </label>
            </div>
          </div>

          {params.template === 'cobrand' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</div>
              <div className="relative">
                <Label>Inmobiliaria</Label>
                <input className={inputCls} value={query} placeholder="Buscar en MARCAS…"
                  onChange={e => { setQuery(e.target.value); setListOpen(true); }}
                  onFocus={() => setListOpen(true)} onBlur={() => setTimeout(() => setListOpen(false), 150)} />
                {listOpen && matches.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {matches.map(b => (
                      <li key={b.id}>
                        <button type="button" onMouseDown={() => chooseBrand(b)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between gap-2">
                          <span className="truncate">{b.name}</span>
                          {!b.hasClaro && <span className="text-[10px] text-gray-400 shrink-0">{b.hasOscuro ? 'sin logo claro' : 'sin logo'}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="block">
                <Label>Nombre (si no hay logo)</Label>
                <input className={inputCls} value={params.client.name} onChange={e => setClient('name', e.target.value)} />
              </label>
              <label className="block">
                <Label>Instagram</Label>
                <input className={inputCls} value={params.client.instagram} placeholder="@inmobiliaria" onChange={e => setClient('instagram', e.target.value)} />
              </label>
              <div className="flex items-end gap-3">
                <label className="block flex-1">
                  <Label>Color de acento</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={params.client.accent || RE_COLORS.naranja} onChange={e => setClient('accent', e.target.value)}
                      className="h-9 w-12 rounded border border-gray-200 bg-white" />
                    <span className="text-[11px] text-gray-400">{params.client.accent ? params.client.accent.toUpperCase() : 'naranja RE!'}</span>
                  </div>
                </label>
                {!onUse && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-500 hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                    <Upload size={14} /> Otro logo
                    <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" onChange={onUpload} />
                  </label>
                )}
              </div>
              {uploadError && <div className="text-[11px] text-red-600">{uploadError}</div>}
              {logos.loading ? (
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Cargando logo…</div>
              ) : mark && (
                <div className={`text-[11px] ${mark.mode === 'logo' ? 'text-gray-500' : 'text-amber-700'}`}>
                  {describeMark(mark)}
                  {upload && <button type="button" className="ml-1 underline" onClick={() => { setUpload(null); setUploadError(''); }}>Quitar el subido</button>}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Textos</div>
            {params.template === 're' && (
              <label className="block">
                <Label hint="Enter = salto de línea">Línea superior</Label>
                <textarea rows={2} className={inputCls} value={params.tag} onChange={e => set('tag', e.target.value)} />
              </label>
            )}
            {params.template === 'cobrand' && (
              <label className="block"><Label>Encabezado</Label>
                <input className={inputCls} value={params.label} onChange={e => set('label', e.target.value)} /></label>
            )}
            <label className="block"><Label>Web</Label><input className={inputCls} value={params.web} onChange={e => set('web', e.target.value)} /></label>
            {params.template === 're' && (
              <label className="block"><Label>WhatsApp</Label><input className={inputCls} value={params.wa} onChange={e => set('wa', e.target.value)} /></label>
            )}
            <label className="block"><Label>Instagram de RE!</Label><input className={inputCls} value={params.ig} onChange={e => set('ig', e.target.value)} /></label>
            {fitted.length > 0 && overflow.length === 0 && <div className="text-[11px] text-amber-700">Texto largo: se achicó para que entre en la zona segura.</div>}
            {overflow.length > 0 && <div className="text-[11px] text-red-600">Un texto no entra en la zona segura ni a la mitad de su tamaño. Acortalo para poder exportar.</div>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <button type="button" onClick={() => setAdvanced(!advanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Animación {advanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {advanced && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                {Object.keys(CONTROLS).filter(k => CONTROLS[k].advanced).map(k => (
                  <div key={k} className="flex flex-col gap-3">
                    {k === 'driftAngle' && (
                      <label className="block">
                        <Label>Movimiento de las partículas</Label>
                        <select className={inputCls} value={params.driftMode} onChange={e => set('driftMode', e.target.value)}>
                          {Object.entries(DRIFT_MODES).map(([m, name]) => <option key={m} value={m}>{name}</option>)}
                        </select>
                      </label>
                    )}
                    {(!CONTROLS[k].drift || CONTROLS[k].drift === params.driftMode) && <Slider k={k} value={params[k]} onChange={set} />}
                  </div>
                ))}
                <button type="button" onClick={() => setParams(p => normalizeParams({ ...p, driftMode: DEFAULTS.driftMode, ...Object.fromEntries(Object.keys(CONTROLS).filter(k => CONTROLS[k].advanced).map(k => [k, DEFAULTS[k]])) }))}
                  className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                  <RotateCcw size={12} /> Valores por defecto
                </button>
              </div>
            )}
          </div>

          {onUse ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
              <button type="button" disabled={!scene || overflow.length > 0} onClick={() => onUse({ params, brandId })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53B12] hover:bg-[#c42e0d] disabled:opacity-40 text-white font-bold uppercase tracking-wider text-sm py-3">
                <Check size={16} /> Usar en este carrusel
              </button>
              {onCancel && (
                <button type="button" onClick={onCancel}
                  className="w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-xs py-2.5">
                  Cancelar
                </button>
              )}
              <div className="text-[11px] text-gray-400">El video se arma con las placas ("Generar placas" o al descargar el paquete).</div>
            </div>
          ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
            {exp.running ? (
              <>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#E53B12] transition-[width]" style={{ width: `${exp.total ? (100 * exp.done / exp.total) : 0}%` }} />
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>Renderizando {exp.done}/{exp.total} cuadros…</span>
                  <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1 font-bold hover:text-gray-800"><X size={12} /> Cancelar</button>
                </div>
              </>
            ) : (
              <button type="button" disabled={!scene || !exportable || overflow.length > 0} onClick={startExport}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53B12] hover:bg-[#c42e0d] disabled:opacity-40 text-white font-bold uppercase tracking-wider text-sm py-3">
                <Download size={16} /> Exportar MP4
              </button>
            )}
            {!exportable && <div className="text-[11px] text-red-600">Este navegador no puede exportar video. Usá Chrome o Edge actualizados.</div>}
            {exp.message && <div className={`text-[11px] ${exp.error ? 'text-red-600' : exp.warn ? 'text-amber-700 font-bold' : 'text-gray-500'}`}>{exp.message}</div>}
          </div>
          )}
        </aside>

        {/* ---------- Vista previa: en pantalla grande queda fija mientras se bajan los controles,
             y su alto deja lugar para el encabezado del portal y la línea de tiempo ---------- */}
        <main className="flex-1 min-w-0">
          <div className="lg:sticky lg:top-3 flex flex-col items-center gap-3">
            <div className="w-full flex justify-center">
              <canvas ref={canvasRef} width={f.W} height={f.H}
                className="rounded-xl shadow-md bg-[#1D1E20] max-w-full"
                style={{ maxHeight: 'calc(100vh - 300px)', aspectRatio: `${f.W} / ${f.H}` }} />
            </div>
            {fonts === 'error' && <div className="text-xs text-red-600 max-w-[560px] text-center">No se pudo cargar la tipografía Akzidenz Grotesk. Sin ella el video saldría con otra letra, así que no se puede exportar. Recargá la página (F5).</div>}
            {!scene && fonts === 'loading' && <div className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Cargando tipografía…</div>}
            <div className="flex items-center gap-3 w-full max-w-[560px]">
              <button type="button" onClick={togglePlay} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg border border-gray-200 bg-white" aria-label={playing ? 'Pausa' : 'Reproducir'}>
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <input type="range" min={0} max={1} step={0.001} value={params.dur ? time / params.dur : 0}
                onChange={e => scrub(Number(e.target.value))} className="flex-1 accent-[#E53B12]" />
              <span className="text-xs tabular-nums text-gray-500 w-14 text-right">{time.toFixed(2)} s</span>
              <button type="button" onClick={() => setShowSafe(!showSafe)} title="Zona segura de Instagram (no se exporta)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${showSafe ? 'border-[#E53B12] text-[#E53B12] bg-white' : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-100'}`}>
                <ScanLine size={16} /> Zona segura
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
