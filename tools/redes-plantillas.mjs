// Packs the Redes templates into the portal (Max, 15 Nov 2026: they used to come from Drive through the backend, 2.5 to
// 15 s every time a draft opened). Reads the SVGs made by build.py, checks them like the backend does
// (re-backend RedesCode.js redesTemplateProblems_), and writes src/components/redes/plantillas.json, which slides.js
// loads as its own cached file. Publishing the portal publishes the templates.
//
//   node tools/redes-plantillas.mjs [--from "<folder with serie1/, serie2/…>"]
//
// Keep Drive's Plantillas in step (sandbox and production): the backend still reads the series' names there to pick a
// random design for new drafts.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--from');
const FROM = at >= 0 ? args[at + 1] : 'G:/My Drive/Identidad/Plantillas redes RE!/svg';
const OUT = new URL('../src/components/redes/plantillas.json', import.meta.url);
// Designs voted out (serie or serie-noche): their SVGs are left out of the bundle.
const RETIRADOS = JSON.parse(readFileSync(new URL('./disenos-retirados.json', import.meta.url), 'utf8')).retirados;
const designOf = name => `${name.split('/')[0]}${/-noche$/.test(name) ? '-noche' : ''}`;

// Same rules as the backend.
const SLOTS = {
  'carrusel-portada': ['foto-1'], 'carrusel-panorama': ['foto-1'], 'carrusel-doble': ['foto-1', 'foto-2'],
  'carrusel-simple': ['foto-1'], 'carrusel-cierre': [], 'foto-en-marco-1350': ['foto-1'], 'foto-en-marco-1080': ['foto-1'],
};
const FIELDS = ['barrio', 'servicios', 'inmobiliaria', 'web', 'whatsapp', 'marca', 'cierre-1', 'cierre-2'];

function problemsOf(name, svg) {
  const problems = [];
  const root = (svg.match(/<svg\b[^>]*>/) || [''])[0];
  if (!root) return ['no es un SVG'];
  ['width', 'height', 'viewBox'].forEach(a => { if (!new RegExp('\\s' + a + '="[^"]+"').test(root)) problems.push(`al <svg> le falta ${a}`); });
  const tags = {};
  (svg.match(/<[A-Za-z][\w:.-]*\b[^>]*\sid="[^"]+"[^>]*>/g) || []).forEach(t => {
    tags[t.match(/\sid="([^"]+)"/)[1]] = { tag: t.match(/^<([A-Za-z][\w:.-]*)/)[1], text: t };
  });
  for (const [id, t] of Object.entries(tags)) {
    if (/^foto-\d+$/.test(id)) {
      if (t.tag !== 'image') problems.push(`${id} tiene que ser una <image>`);
      else if (!/preserveAspectRatio="[^"]*slice[^"]*"/.test(t.text)) problems.push(`${id} necesita preserveAspectRatio con "slice"`);
    }
    if (/^campo-/.test(id)) {
      if (t.tag !== 'text' && t.tag !== 'tspan') problems.push(`${id} tiene que ser un <text> o <tspan>`);
      if (!FIELDS.includes(id.slice(6))) problems.push(`${id}: campo desconocido`);
    }
  }
  const base = name.replace(/^[^/]+\//, '').replace(/-noche$/, '');
  if (!SLOTS[base]) problems.push(`"${base}" no es una plantilla conocida`);
  (SLOTS[base] || []).forEach(id => { if (!tags[id]) problems.push(`falta ${id}`); });
  return problems;
}

const templates = [];
const bad = [];
for (const serie of readdirSync(FROM).filter(n => /^[a-z][a-z0-9]*$/.test(n) && statSync(join(FROM, n)).isDirectory())) {
  for (const f of readdirSync(join(FROM, serie)).filter(n => /\.svg$/i.test(n))) {
    const name = `${serie}/${f.replace(/\.svg$/i, '')}`;
    if (RETIRADOS.includes(designOf(name))) continue;
    const svg = readFileSync(join(FROM, serie, f), 'utf8');
    const problems = problemsOf(name, svg);
    if (problems.length) bad.push(`${name}: ${problems.join('; ')}`);
    else templates.push({ name, svg });
  }
}
if (bad.length) {
  console.error('Plantillas con problemas (no se empaquetó nada):\n  ' + bad.join('\n  '));
  process.exit(1);
}
const num = n => Number((n.match(/^serie(\d+)/) || [])[1]) || 0;
templates.sort((a, z) => num(a.name) - num(z.name) || a.name.localeCompare(z.name));
const version = createHash('sha256').update(JSON.stringify(templates)).digest('hex').slice(0, 12);
writeFileSync(OUT, JSON.stringify({ version, templates }));
const series = new Set(templates.map(t => t.name.split('/')[0]));
console.log(`ok: ${templates.length} plantillas de ${series.size} series (versión ${version}) en src/components/redes/plantillas.json` +
  ` (sin ${RETIRADOS.length} diseños retirados)`);
