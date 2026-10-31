# End screen (re-web)

Closing card for Instagram videos, with RE!'s identity or co-branded "Producción para" a client.
It's rendered and exported to MP4 **in the browser** (canvas + WebCodecs). No server, no Apps
Script, nothing uploaded. Spec: `re-backend/docs/REDES_SPEC.md`, "End screen" section.

Ported from `re-endscreen` v0.2 (31 Oct 2026, REDES_BUILD.md step 2) with the fixes E1–E12 of
spec §8.2. This folder is now the single source of truth; `re-endscreen` is an archive.

## How re-web uses it

`src/components/EndScreenTab.jsx` (hash `ENDSCREEN`, every signed-in staff member) loads the brands
once and gives the screen a stable `loadBrandLogo`. Both go through `gasPost`, which returns the raw
`Response`, and the action's arguments go inside `payload`:

```jsx
const r = await (await gasPost({ action: 'marcas_list', payload: {} })).json();
// r.brands = [{ id, name, variantes, instagram, accent, hasClaro, hasOscuro }]

const loadBrandLogo = useCallback(async (id, kind) => {
  const r = await (await gasPost({ action: 'marcas_logo', payload: { id, kind } })).json();
  if (!r.success) throw new Error(r.error || 'No se pudo cargar el logo.');
  return `data:${r.mime};base64,${r.base64}`;
}, []);

<EndScreen brands={brands} loadBrandLogo={loadBrandLogo} />
```

`loadBrandLogo(brandId, kind)` must keep the same identity between renders (`useCallback`),
because the screen reloads the logos when it changes.

## Backend (re-backend, `RedesCode.js`)

Both actions are `marcas_*`, so the auth gate always verifies the login (any staff member).

- `marcas_list`: active rows of `Inmobiliarias`. `id` = the row's `carpetaId`, `name` =
  `canonica`, `accent` = `color_acento`, plus `hasClaro` / `hasOscuro` (whether `logo_claro.png`
  / `logo_oscuro.png` exist in the folder).
- `marcas_logo` (`payload: { id, kind }`, `kind`: `claro` | `oscuro`): only folder IDs of active
  `Inmobiliarias` rows. Looks the file up **by fixed name inside the folder** and returns
  `{ success, mime, base64 }`. Over 2 MB, the Drive thumbnail at 1600 px instead.

## Behaviour that must be kept

- **Deterministic:** frame = f(params, t). Particles use a seeded random generator (`seed`).
  The preview and the export draw the same thing.
- **Zoom out on the content layer only.** The background and particles don't zoom.
- **Animated tracking:** each line opens at `trkStart`, closes to `trkEnd` in 1.3 s (ease-out)
  and then "breathes" ±`breath`.
- **Safe zone:** texts are fitted (they shrink if long) so they stay inside Instagram's Reels safe
  zone (measured from the template in `MARCAS/_RE!/plantillas`). In 9:16, below y=1110 the right
  margin is 193 px because of the button column. The tests check every template × format.
- **Client accent:** if the accent is too dark for grafito (navy, black), it's lightened toward
  white until the contrast reaches 3:1, keeping the hue.
- **Client logo** (`clientMark.js`):
  1. `logo_claro` as is.
  2. Otherwise `logo_oscuro`: a single-colour logo is turned white; a multi-colour one, or one
     with its own background, goes on a light grey plate.
  3. Otherwise the agency's name in Akzidenz.

  A logo uploaded by hand wins and is classified the same way. The screen says which case
  applies.
- Logos are sized by **area**, not width, so a wide logo and a square one look about the same
  size.
- **Safe zone, every frame:** each line is fitted against its widest tracking, the zoom and its
  rise while it's visible; if even then it doesn't fit, `drawText` caps that line's tracking. A
  line that doesn't fit at 50% size even without tracking marks `scene.overflow`, and the screen
  blocks export. Known and left for Max's motion review: in 9:16 the bottom lines dip below the
  Reels limit while they rise in (RE! ~15 px, Producción para ~2 px); settled, they're inside.
- **Last frame:** the export draws `frameCount` frames at `frameTime(i)`; the fade-out ends at
  `lastFrameTime`, so the last exported frame is fully black.
- **Texts** are kept as typed (spaces included) and NFC-normalised; they're trimmed when laid out
  and in `fileName`. `clientHandle` adds the `@`.

## Tests

- `npm run test:endscreen`: engine and logo tests with `@napi-rs/canvas` and the OTFs in
  `public/font` (or `FONT_DIR`). They fail at once if the fonts don't load.
- `npm run test:marcas` (optional): `prepareClientMark` over the real kits in
  `G:\Shared drives\somos.re.ok\MARCAS` (or `MARCAS_DIR`), printing the mode per folder. Skipped
  when the folder isn't there.
