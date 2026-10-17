import { auth } from './firebase';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

// POSTs an action to the Apps Script backend. If someone is signed in, it attaches their
// Firebase ID token (Firebase refreshes it automatically before it expires), so the backend
// can verify who is asking instead of trusting the email in the payload. Returns the raw
// fetch Response, so callers keep their existing `.json()` handling.
// Use it for every staff/admin action. See re-backend CLAUDE.md, "Agreed security plan".
export async function gasPost(body) {
  const user = auth.currentUser;
  const idToken = user ? await user.getIdToken() : undefined;
  return fetch(GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(idToken ? { ...body, idToken } : body),
  });
}
