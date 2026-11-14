import { useState } from 'react';
import { AtSign, Check } from 'lucide-react';
import MiniLogo from '../MiniLogo';

// One Instagram handle, typed once and kept (weekend plan, 14 Nov 2026): a client's or an agency's. Shows it with
// its "@", saves on Guardar or Enter (the backend cleans "@" and instagram.com/ links, and refuses what can't be a
// handle). `onSave(text)` resolves to the handle as saved.
export default function InstagramField({ label, value, onSave, disabled, hint, compact }) {
  const [draft, setDraft] = useState(null);          // what's typed; null shows the saved value
  const [state, setState] = useState({ busy: false, error: '', ok: false });
  const text = draft === null ? (value || '') : draft;
  const dirty = draft !== null && draft.trim().replace(/^@+/, '') !== String(value || '');
  const setText = setDraft;

  const save = async () => {
    if (!dirty || state.busy) return;
    setState({ busy: true, error: '', ok: false });
    try {
      await onSave(text);
      setDraft(null);
      setState({ busy: false, error: '', ok: true });
    } catch (e) {
      setState({ busy: false, error: e.message, ok: false });
    }
  };

  return (
    <div className="flex flex-col gap-1 min-w-0">
      {label && <span className={`${compact ? 'text-[10px] md:text-xs tracking-widest' : 'text-[11px]'} font-bold text-gray-500 uppercase`}>{label}</span>}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <AtSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={text.replace(/^@+/, '')} disabled={disabled || state.busy} placeholder="usuario"
            onChange={e => { setText(e.target.value); setState(s => ({ ...s, ok: false, error: '' })); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#EB4511] disabled:bg-gray-50" />
        </div>
        {dirty && !disabled && (
          <button type="button" onClick={save} disabled={state.busy}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide bg-[#EB4511] text-white hover:bg-[#c42e0d] disabled:opacity-40">
            {state.busy ? <MiniLogo className="w-4 h-4" /> : <Check size={14} />} Guardar
          </button>
        )}
      </div>
      {state.error ? <span className="text-[11px] font-bold text-red-600">{state.error}</span>
        : state.ok ? <span className="text-[11px] font-bold text-green-700">Guardado.</span>
          : hint ? <span className="text-[11px] text-gray-400">{hint}</span> : null}
    </div>
  );
}
