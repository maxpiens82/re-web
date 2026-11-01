import { useCallback, useEffect, useState } from 'react';
import EndScreen from '../endscreen/EndScreen.jsx';
import { gasPost } from '../lib/gasApi';

// Pestaña "End screen" del portal (todo el staff). Trae las inmobiliarias de MARCAS una vez
// (marcas_list) y le da a la pantalla un loadBrandLogo estable (marcas_logo -> data URL).
// Sin marcas igual funciona: la plantilla RE! no las necesita.
export default function EndScreenTab() {
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await (await gasPost({ action: 'marcas_list', payload: {} })).json();
        if (!alive) return;
        if (r.success) setBrands(r.brands || []);
        else setError(r.authError ? 'Tu sesión venció: recargá la página (F5) para ver las inmobiliarias.' : (r.error || 'No se pudieron cargar las inmobiliarias.'));
      } catch {
        if (alive) setError('No se pudieron cargar las inmobiliarias. Revisá la conexión.');
      }
    })();
    return () => { alive = false; };
  }, []);

  const loadBrandLogo = useCallback(async (id, kind) => {
    const r = await (await gasPost({ action: 'marcas_logo', payload: { id, kind } })).json();
    if (!r.success) throw new Error(r.error || 'No se pudo cargar el logo.');
    return `data:${r.mime};base64,${r.base64}`;
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {error && <div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}
      <div className="flex-1 min-h-0">
        <EndScreen brands={brands} loadBrandLogo={loadBrandLogo} />
      </div>
    </div>
  );
}
