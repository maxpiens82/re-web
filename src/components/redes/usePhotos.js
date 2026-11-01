import { useEffect, useState } from 'react';

// Asks the tab's photo cache for these copies and re-renders when they arrive.
// Returns cache.get, so a photo is { url, blob } | { pending } | { error } | undefined (loading).
export default function usePhotos(cache, draftId, ids) {
  const [, setVersion] = useState(0);
  const key = ids.join(',');
  useEffect(() => {
    if (!draftId || !key) return undefined;
    let alive = true;
    cache.load(draftId, key.split(',')).then(() => { if (alive) setVersion(v => v + 1); });
    return () => { alive = false; };
  }, [cache, draftId, key]);
  return cache.get;
}
