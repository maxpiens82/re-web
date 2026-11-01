import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { redesCall } from './redesApi';

// "No publicar en redes" para una reserva confirmada (P- / U-). Solo lo ve administración (las acciones
// redes_* son de admins). Activarlo descarta los bocetos abiertos de esa reserva; desactivarlo no los
// trae de vuelta.
export default function NoPublicarSwitch({ eventId }) {
  const [state, setState] = useState({ loading: true, activo: false, error: '' });

  useEffect(() => {
    let alive = true;
    redesCall('redes_no_publicar_get', { eventId })
      .then(r => { if (alive) setState({ loading: false, activo: !!r.activo, error: '' }); })
      .catch(e => { if (alive) setState({ loading: false, activo: false, error: e.message }); });
    return () => { alive = false; };
  }, [eventId]);

  const toggle = async () => {
    const next = !state.activo;
    if (next && !window.confirm('Esta reserva no se va a publicar en redes: se descartan sus bocetos abiertos. ¿Seguimos?')) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      await redesCall('redes_set_no_publicar', { eventId, activo: next });
      setState({ loading: false, activo: next, error: '' });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  };

  return (
    <label className="inline-flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 cursor-pointer select-none" title={state.error || ''}>
      <span className={`relative inline-block w-8 h-4 rounded-full transition-colors ${state.activo ? 'bg-red-500' : 'bg-gray-300'}`}>
        <input type="checkbox" className="sr-only" checked={state.activo} disabled={state.loading} onChange={toggle} />
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${state.activo ? 'left-4' : 'left-0.5'}`} />
      </span>
      {state.loading ? <Loader2 size={12} className="animate-spin" /> : null}
      <span className={state.error ? 'text-red-600' : ''}>No publicar en redes</span>
    </label>
  );
}
