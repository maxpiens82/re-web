import { useEffect, useState } from 'react';
import { redesCall } from './redesApi';
import InstagramField from './InstagramField';

// The client's Instagram in the booking form (weekend plan, 14 Nov 2026). Kept apart from Clientes, in
// Instagram_Clientes, found by phone (else email): it saves on its own, before or after checkout, apart from
// Guardar. Staff only (marcas_* actions); the form's other fields are untouched.
const phoneKey = t => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-10) : ''; };

export default function ClienteInstagram({ telefono, email, nombre }) {
  const key = phoneKey(telefono);
  const mail = /\S+@\S+\.\S+/.test(String(email || '')) ? String(email).trim().toLowerCase() : '';
  const [value, setValue] = useState({ who: '', handle: '' });
  const who = key || mail;

  // Looked up once the phone (or email) has stopped changing for a moment.
  useEffect(() => {
    if (!who) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      redesCall('marcas_instagram', { cliente: { telefono: key, email: mail } })
        .then(r => { if (alive) setValue({ who, handle: r.instagram || '' }); })
        .catch(() => { if (alive) setValue({ who, handle: '' }); });
    }, 700);
    return () => { alive = false; clearTimeout(t); };
  }, [who, key, mail]);

  return (
    <div className="sm:col-span-2">
      <InstagramField compact label="Instagram del cliente" value={value.who === who ? value.handle : ''} disabled={!who}
        hint={who ? 'Se guarda aparte, con su botón, y queda para las próximas reservas.' : 'Cargá primero el teléfono o el email.'}
        onSave={async text => {
          const r = await redesCall('marcas_instagram', { cliente: { telefono: key, email: mail, nombre }, instagram: text });
          setValue({ who, handle: r.instagram || '' });
          return r.instagram || '';
        }} />
    </div>
  );
}
