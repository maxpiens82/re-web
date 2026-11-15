// The design picker of a draft (Max, 15 Nov 2026: picking was slow and clumsy). Every design (series × día/noche) as
// a small cover made with THIS draft's first photo, barrio and texts, side by side; one tap picks it and the placas
// are made again on their own. Covers are drawn in the browser from the templates bundled with the portal.
import { useEffect, useRef, useState } from 'react';
import { estiloOf, renderCovers, smallPhotoUrl, PLACEHOLDER_PHOTO } from './slides';
import { SERIE_NAMES } from './seriesInfo';

const COVER_W = 168;   // px drawn; shown at half that on screen, sharp on phones and retina

// `designs`: the estilos that exist (slides.js designsOf); the draft's own is shown even if it went out.
export default function DisenoStrip({ series, designs: available, ocultos, current, photo, campos, disabled, onPick }) {
  const [covers, setCovers] = useState({});      // estilo -> object URL | null (no cover in that series)
  const urls = useRef([]);
  const strip = useRef(null);

  const designs = series.flatMap(se => [false, true].map(n => estiloOf(se, n)))
    .filter(e => e === estiloOf(current.serie, current.noche) || ((!available || available.includes(e)) && !ocultos.includes(e)));

  // Covers again whenever the photo or the texts change: first with a grey stand-in while the photo is on its way,
  // so the designs show at once, then with the photo.
  const designsKey = designs.join(',');
  const camposKey = JSON.stringify(campos);
  useEffect(() => {
    if (!designsKey) return undefined;
    let alive = true;
    (async () => {
      const src = photo ? await smallPhotoUrl(photo).catch(() => PLACEHOLDER_PHOTO) : PLACEHOLDER_PHOTO;
      const blobs = await renderCovers({ estilos: designsKey.split(','), photo: src, campos: JSON.parse(camposKey), width: COVER_W })
        .catch(() => null);
      if (!alive || !blobs) return;
      const next = {};
      const made = [];
      for (const [estilo, blob] of Object.entries(blobs)) {
        next[estilo] = blob ? URL.createObjectURL(blob) : null;
        if (next[estilo]) made.push(next[estilo]);
      }
      urls.current.forEach(u => URL.revokeObjectURL(u));
      urls.current = made;
      setCovers(next);
    })();
    return () => { alive = false; };
  }, [photo, camposKey, designsKey]);
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
                  <span className={`absolute right-1 top-1 rounded px-1 text-[9px] font-bold uppercase ${noche ? 'bg-[#1D1E20] text-white' : 'bg-white/90 text-gray-800'}`}>
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
