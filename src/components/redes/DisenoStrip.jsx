// The design picker of a draft (Max, 15 Nov 2026: picking was slow and clumsy). Every design (series × día/noche) as
// a small cover made with THIS draft's first photo, barrio and texts, side by side; one tap picks it and the placas
// are made again on their own. Covers are drawn in the browser from the templates bundled with the portal.
import { useEffect, useRef, useState } from 'react';
import { estiloOf, renderCover, photoDataUrl } from './slides';
import { SERIE_NAMES } from './seriesInfo';

const COVER_W = 168;   // px drawn; shown at half that on screen, sharp on phones and retina

export default function DisenoStrip({ series, ocultos, current, photo, getCampos, camposKey, disabled, onPick }) {
  const [covers, setCovers] = useState({});      // estilo -> object URL | null (no cover in that series)
  const urls = useRef([]);
  const strip = useRef(null);

  const designs = series.flatMap(se => [false, true].map(n => estiloOf(se, n)))
    .filter(e => e === estiloOf(current.serie, current.noche) || !ocultos.includes(e));

  // Covers again whenever the photo or the texts change; one at a time, in the strip's order.
  const designsKey = designs.join(',');
  useEffect(() => {
    if (!photo || !designsKey) return undefined;
    let alive = true;
    (async () => {
      const [src, campos] = await Promise.all([photoDataUrl(photo), getCampos()]);
      if (!alive) return;
      urls.current.forEach(u => URL.revokeObjectURL(u));
      urls.current = [];
      setCovers({});
      for (const estilo of designsKey.split(',')) {
        if (!alive) return;
        const blob = await renderCover({ estilo, photo: src, campos, width: COVER_W }).catch(() => null);
        if (!alive) return;
        const url = blob ? URL.createObjectURL(blob) : null;
        if (url) urls.current.push(url);
        setCovers(c => ({ ...c, [estilo]: url }));
      }
    })();
    return () => { alive = false; };
    // getCampos changes every render; camposKey says when its answer would change.
  }, [photo, camposKey, designsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);

  // The chosen design in sight when the draft opens.
  useEffect(() => {
    const el = strip.current && strip.current.querySelector('[data-actual="1"]');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [current.serie, current.noche, series.length]);

  const bySerie = series.map(se => ({ se, items: designs.filter(e => e === se || e === se + '-noche') })).filter(g => g.items.length);
  return (
    <div ref={strip} className="flex gap-3 overflow-x-auto pb-2 snap-x" role="group" aria-label="Diseños">
      {bySerie.map(({ se, items }) => (
        <div key={se} className="shrink-0 snap-start">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
            {se.replace('serie', '')}{SERIE_NAMES[se] ? ` · ${SERIE_NAMES[se]}` : ''}
          </div>
          <div className="flex gap-1.5">
            {items.map(estilo => {
              const on = estilo === estiloOf(current.serie, current.noche);
              const noche = estilo.endsWith('-noche');
              const src = covers[estilo];
              return (
                <button key={estilo} type="button" data-actual={on ? '1' : '0'} disabled={disabled || on}
                  onClick={() => onPick(estilo)} aria-pressed={on}
                  aria-label={`Serie ${se.replace('serie', '')}${SERIE_NAMES[se] ? ' ' + SERIE_NAMES[se] : ''}, ${noche ? 'noche' : 'día'}`}
                  className={`relative block w-[84px] rounded-md overflow-hidden border-2 transition ${on ? 'border-[#E53B12]' : 'border-transparent hover:border-gray-300'} disabled:cursor-default`}>
                  {src
                    ? <img src={src} alt="" className="block w-full aspect-[4/5] object-cover" />
                    : <span className={`block w-full aspect-[4/5] ${src === null ? 'bg-gray-100' : 'bg-gray-100 animate-pulse'}`} />}
                  <span className={`absolute left-1 bottom-1 rounded px-1 text-[9px] font-bold uppercase ${noche ? 'bg-[#1D1E20] text-white' : 'bg-white/90 text-gray-800'}`}>
                    {noche ? 'Noche' : 'Día'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
