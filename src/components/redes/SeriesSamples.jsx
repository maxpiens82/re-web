import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { serieLabel } from './slides';
import { SERIE_NAMES as NAMES, PANORAMA } from './seriesInfo';

// How each template series looks, before making any placas. The images are in public/redes-muestras/
// (one per template, day and night), made with render.js in Plantillas redes RE! from the photos the
// landing already shows: this folder is public, so never put an unpublished client's photos in it.
const SAMPLE_SERIES = Array.from({ length: 16 }, (_, i) => `serie${i + 1}`);
const CARRUSEL = [['carrusel-portada', 'Portada'], ['carrusel-doble', 'Doble'], ['carrusel-simple', 'Simple'], ['carrusel-cierre', 'Cierre']];
const SUELTA = [['foto-en-marco-1350', 'Vertical'], ['foto-en-marco-1080', 'Cuadrada']];

const pill = on => `px-3 py-1 rounded-full text-xs font-bold border ${on ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`;
const srcOf = (serie, template, noche) => `/redes-muestras/${serie}/${template}${noche ? '-noche' : ''}.jpg`;

export default function SeriesSamples({ series, designs, tipo, current, canChoose, onChoose, onClose, ocultos = [], onToggleOculto }) {
  const [noche, setNoche] = useState(current.noche);
  const [big, setBig] = useState(null);
  // Only the versions that exist (day or night): a series whose other version was voted out shows in one tab only.
  const exists = e => !designs || designs.includes(e);
  const shown = (series && series.length ? series : SAMPLE_SERIES).filter(s => SAMPLE_SERIES.includes(s) && exists(`${s}${noche ? '-noche' : ''}`));
  const templatesOf = serie => (tipo === 'suelta' ? SUELTA
    : PANORAMA.includes(serie) ? [CARRUSEL[0], ['carrusel-panorama', 'Panorámica'], ...CARRUSEL.slice(1)] : CARRUSEL);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { if (big) setBig(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [big, onClose]);

  // On the page's body and over the portal's top bar (z-[100]).
  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/40 flex" onClick={onClose}>
      <div className="m-auto w-full h-full md:w-[min(95vw,64rem)] md:h-[94vh] bg-white md:rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#E53B12] mr-auto">Cómo es cada serie</span>
          {[[false, 'Día'], [true, 'Noche']].map(([n, l]) => (
            <button key={l} type="button" className={pill(noche === n)} onClick={() => setNoche(n)}>{l}</button>
          ))}
          <button type="button" onClick={onClose} className="ml-2 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {shown.map(serie => {
            const inUse = current.serie === serie && current.noche === noche;
            const estilo = `${serie}${noche ? '-noche' : ''}`;
            const oculta = ocultos.includes(estilo);
            return (
              <section key={serie}>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h4 className={`text-sm font-bold ${oculta ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{serieLabel(serie)}{NAMES[serie] ? ` · ${NAMES[serie]}` : ''}</h4>
                  {inUse
                    ? <span className="text-xs font-bold text-green-700">En uso</span>
                    : canChoose && !oculta && <button type="button" className="text-xs font-bold text-[#E53B12] hover:underline" onClick={() => onChoose(serie, noche)}>Usar esta, {noche ? 'noche' : 'día'}</button>}
                  {onToggleOculto && (
                    <button type="button" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800"
                      title={oculta ? 'Vuelve a aparecer en los borradores y en el azar' : 'Deja de aparecer en los borradores y en el azar. No se borra nada.'}
                      onClick={() => onToggleOculto(estilo, !oculta)}>
                      {oculta ? <><Eye size={14} /> Oculta · Mostrar</> : <><EyeOff size={14} /> Ocultar {noche ? 'noche' : 'día'}</>}
                    </button>
                  )}
                </div>
                <div className={`grid gap-2 ${tipo === 'suelta' ? 'grid-cols-2 max-w-md' : PANORAMA.includes(serie) ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} ${oculta ? 'opacity-40' : ''}`}>
                  {templatesOf(serie).map(([template, label]) => (
                    <figure key={template} className="m-0">
                      <button type="button" className="block w-full" aria-label={`Ver grande: ${serieLabel(serie)}, ${label}`} onClick={() => setBig(srcOf(serie, template, noche))}>
                        <img src={srcOf(serie, template, noche)} alt="" loading="lazy" style={{ aspectRatio: template === 'foto-en-marco-1080' ? '1 / 1' : '4 / 5' }} className="w-full rounded border border-gray-200 bg-gray-100" />
                      </button>
                      <figcaption className="mt-1 text-[11px] text-gray-400">{label}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            );
          })}
          <p className="text-[11px] text-gray-400">Son ejemplos, con fotos del portfolio. Las placas salen con las fotos, el barrio, los servicios y la inmobiliaria de cada publicación.</p>
        </div>
      </div>
      {big && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex p-4" onClick={e => { e.stopPropagation(); setBig(null); }}>
          <img src={big} alt="" className="m-auto max-w-full max-h-full rounded shadow-2xl" />
        </div>
      )}
    </div>,
    document.body
  );
}
