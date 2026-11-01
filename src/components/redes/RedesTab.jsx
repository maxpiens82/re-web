import { useEffect, useMemo, useState } from 'react';
import { createPhotoCache, draftIdFromHash, redesHash } from './redesApi';
import RedesQueue from './RedesQueue';
import RedesDraft from './RedesDraft';

// Pestaña "Redes" (solo admins): la cola de bocetos y cada boceto. route = el hash sin "#": "REDES" o
// "REDES/<draftId>" (así llega el link de Telegram). Las fotos se guardan mientras la pestaña está
// abierta y se liberan al salir.
export default function RedesTab({ route, onNavigate }) {
  const cache = useMemo(() => createPhotoCache('thumb'), []);
  const fullCache = useMemo(() => createPhotoCache('full'), []);
  useEffect(() => () => cache.dispose(), [cache]);
  useEffect(() => () => fullCache.dispose(), [fullCache]);
  const [filtro, setFiltro] = useState('pendiente');
  const draftId = draftIdFromHash(route);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F0F2F5]">
      {draftId ? (
        <RedesDraft key={draftId} draftId={draftId} cache={cache} fullCache={fullCache} onBack={() => onNavigate(redesHash(''))} />
      ) : (
        <RedesQueue filtro={filtro} setFiltro={setFiltro} cache={cache} onOpen={id => onNavigate(redesHash(id))} />
      )}
    </div>
  );
}
