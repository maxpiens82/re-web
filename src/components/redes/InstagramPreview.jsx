// "Ver como en Instagram" (weekend plan, 14 Nov 2026): the post as it looks on a phone, to judge a template before
// publishing. The 4:5 frame of a carousel, the slides one by one (arrows, keys or a swipe), both closings in order
// (the client's slide, then the end screen video), and the text cut after two lines
// with "… más", the way Instagram shows it.
import { useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Heart, Maximize2, MessageCircle, Minimize2, MoreHorizontal, Send, X } from 'lucide-react';
import MiniLogo from '../MiniLogo';

const HANDLE = 'somos.re.ok';

// Every slide goes in the post: since 15 Nov 2026 the client's closing slide and the end screen video both go, one
// after the other, with different jobs (the client's contact, then RE!'s).

export default function InstagramPreview({ items, caption, onClose }) {
  const shown = items;
  const [i, setI] = useState(0);
  const [more, setMore] = useState(false);
  const touch = useRef(null);
  // Full screen (Max, 15 Nov 2026): on a phone the post always takes the whole screen; on a computer a button puts the
  // preview in full screen and the post grows to the screen's height.
  const box = useRef(null);
  // The post grows to the screen's height either way; the browser's own full screen is tried on top, when allowed.
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);
  const toggleFull = () => {
    if (full) { setFull(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); return; }
    setFull(true);
    if (document.fullscreenEnabled && box.current.requestFullscreen) box.current.requestFullscreen().catch(() => {});
  };
  // "… más" only when two lines don't hold the whole text, as on Instagram.
  const cap = useRef(null);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = cap.current;
    if (el && !more) setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [caption, more]);
  const at = Math.min(i, shown.length - 1);
  const go = n => setI(Math.max(0, Math.min(shown.length - 1, n)));

  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') { if (document.fullscreenElement) return; if (full) setFull(false); else onClose(); }
      else if (e.key === 'ArrowRight') setI(n => Math.min(shown.length - 1, n + 1));
      else if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [shown.length, onClose, full]);

  const it = shown[at];
  const text = String(caption || '').trim();
  const arrow = 'absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow flex items-center justify-center';

  return (
    <div ref={box} className="fixed inset-0 z-[120] bg-black sm:bg-black/80 flex items-center justify-center sm:p-3" onClick={onClose} role="dialog" aria-modal="true" aria-label="Vista previa como en Instagram">
      <div className="flex flex-col items-center gap-3 w-full h-full sm:w-auto sm:h-auto sm:max-h-full" onClick={e => e.stopPropagation()}>
        <div className="hidden sm:flex items-center gap-2 text-white text-xs">
          {(
            <button type="button" onClick={toggleFull} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 font-bold">
              {full ? <><Minimize2 size={14} /> Achicar</> : <><Maximize2 size={14} /> Pantalla completa</>}
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-2 p-1.5 rounded-full bg-white/15 hover:bg-white/25" aria-label="Cerrar"><X size={16} /></button>
        </div>

        {/* the phone: the whole screen on a phone; on a computer, a phone-sized card (screen-high in full screen) */}
        <div style={{ '--ig-w': full ? 'min(92vw, calc((100dvh - 240px) * 0.8))' : 'min(400px, 92vw)' }}
          className="w-full h-full overflow-y-auto bg-white text-[13px] text-gray-900 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 sm:h-auto sm:w-[var(--ig-w)] sm:rounded-[22px] sm:max-h-[calc(100dvh-80px)] sm:shadow-2xl">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-[#F9CE34] via-[#EE2A7B] to-[#6228D7]">
              <span className="w-full h-full rounded-full bg-white flex items-center justify-center"><MiniLogo className="w-5 h-5 text-[#E53B12]" /></span>
            </span>
            <span className="font-semibold">{HANDLE}</span>
            <MoreHorizontal size={18} className="ml-auto hidden sm:block" />
            <button type="button" onClick={onClose} className="ml-auto sm:hidden p-1.5 -mr-1.5" aria-label="Cerrar"><X size={22} /></button>
          </div>

          <div className="relative w-full aspect-[4/5] bg-black select-none"
            onTouchStart={e => { touch.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touch.current === null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              touch.current = null;
              if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1));
            }}>
            {it && (it.video
              ? <video key={it.url} src={it.url} poster={it.poster} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              : <img src={it.url} alt="" className="w-full h-full object-cover" draggable={false} />)}
            {shown.length > 1 && <span className="absolute top-3 right-3 rounded-full bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5">{at + 1}/{shown.length}</span>}
            {at > 0 && <button type="button" className={`${arrow} left-2`} onClick={() => go(at - 1)} aria-label="Anterior"><ChevronLeft size={16} /></button>}
            {at < shown.length - 1 && <button type="button" className={`${arrow} right-2`} onClick={() => go(at + 1)} aria-label="Siguiente"><ChevronRight size={16} /></button>}
          </div>

          <div className="relative flex items-center gap-4 px-3 pt-2.5 pb-1">
            <Heart size={23} /><MessageCircle size={23} /><Send size={22} />
            {shown.length > 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
                {shown.map((s, k) => <span key={s.url} className={`w-1.5 h-1.5 rounded-full ${k === at ? 'bg-[#0095F6]' : 'bg-gray-300'}`} />)}
              </div>
            )}
            <Bookmark size={23} className="ml-auto" />
          </div>

          <div className="px-3 pb-4 pt-1">
            {text ? (
              more
                ? <p className="whitespace-pre-wrap break-words"><span className="font-semibold">{HANDLE}</span> {text}</p>
                : (
                  <button type="button" className="text-left w-full" onClick={() => clipped && setMore(true)}>
                    <p ref={cap} className="whitespace-pre-wrap break-words line-clamp-2"><span className="font-semibold">{HANDLE}</span> {text}</p>
                    {clipped && <span className="text-gray-500">… más</span>}
                  </button>
                )
            ) : <p className="text-gray-400">Sin texto todavía.</p>}
          </div>
        </div>
        <p className="hidden sm:block text-[11px] text-white/70">← → para pasar las placas · Esc para cerrar</p>
      </div>
    </div>
  );
}
