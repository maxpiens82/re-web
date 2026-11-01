// Opcional: corre prepareClientMark sobre los kits reales de MARCAS y muestra qué modo usa cada
// marca. Se saltea si la carpeta no está (por ejemplo, en Vercel). Corre con: npm run test:marcas
// Carpeta: MARCAS_DIR, o G:\Shared drives\somos.re.ok\MARCAS (Drive para escritorio).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { prepareClientMark } from '../src/endscreen/clientMark.js';

const DIR = process.env.MARCAS_DIR || 'G:\\Shared drives\\somos.re.ok\\MARCAS';
const LOGO_MAX = 1200; // como en la pantalla: los logos se achican al cargarlos

async function load(file) {
  if (!existsSync(file)) return null;
  const img = await loadImage(file);
  const k = Math.min(1, LOGO_MAX / Math.max(img.width, img.height));
  const c = createCanvas(Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k)));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function brandFolders(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'originales' || name === '_RE!' || !statSync(full).isDirectory()) continue;
    out.push(full, ...brandFolders(full));
  }
  return out;
}

test('modo del logo de cada marca de MARCAS', { skip: !existsSync(DIR) && `no está ${DIR}` }, async () => {
  const counts = {};
  for (const folder of brandFolders(DIR)) {
    const claro = await load(join(folder, 'logo_claro.png'));
    const oscuro = await load(join(folder, 'logo_oscuro.png'));
    const mark = prepareClientMark({ claro, oscuro, createCanvas });
    counts[mark.mode] = (counts[mark.mode] || 0) + 1;
    console.log(`${mark.mode.padEnd(10)} ${relative(DIR, folder)}`);
  }
  console.log(counts);
  assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) > 0);
});
