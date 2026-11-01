// Exporta la escena a MP4 en el navegador: WebCodecs (H.264, o VP9 si el equipo no tiene
// H.264) + mp4-muxer. Sin servidor y sin subir nada. Video sin audio: la música va en Resolve.
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { drawFrame, frameCount, frameTime } from './engine.js';

// High 5.1, 4.2, 4.0, Main 5.1. El nivel 4.0 (640028) no alcanza para 1080×1920 a más de 30 fps.
const H264 = ['avc1.640033', 'avc1.64002A', 'avc1.640028', 'avc1.4D0033'];
const LEVEL_40 = 'avc1.640028';
// Cuadros en la cola del codificador antes de esperar: cada uno es un cuadro entero (~8 MB).
const MAX_QUEUE = 4;

export function canExport() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'OffscreenCanvas' in window;
}

async function pickCodec(W, H, fps) {
  const bitrate = fps > 30 ? 20e6 : 14e6;
  for (const codec of H264) {
    if (codec === LEVEL_40 && fps > 30) continue;
    const cfg = { codec, width: W, height: H, bitrate, framerate: fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'avc' }; } catch { /* siguiente */ }
  }
  const vp9 = { codec: 'vp09.00.40.08', width: W, height: H, bitrate, framerate: fps };
  try { if ((await VideoEncoder.isConfigSupported(vp9)).supported) return { cfg: vp9, mux: 'vp9' }; } catch { /* nada */ }
  return null;
}

/**
 * @param {object} scene         de createScene()
 * @param {object} [o]
 * @param {(done:number,total:number)=>void} [o.onProgress]
 * @param {AbortSignal} [o.signal]  para cancelar
 * @returns {Promise<{blob: Blob, codec: string, h264: boolean}>}
 */
export async function exportMp4(scene, { onProgress, signal } = {}) {
  if (!canExport()) throw new Error('Este navegador no puede exportar video. Usá Chrome o Edge actualizados.');
  const { W, H, fps } = scene.p;
  const pick = await pickCodec(W, H, fps);
  if (!pick) throw new Error('Este equipo no puede codificar video en el navegador.');

  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: pick.mux, width: W, height: H, frameRate: fps }, fastStart: 'in-memory' });
  let failure = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e; } });
  enc.configure(pick.cfg);

  const stop = () => {
    if (signal?.aborted) throw new DOMException('Exportación cancelada', 'AbortError');
    if (failure) throw failure;
  };
  // Espera a que el codificador libere cuadros. Con tope de tiempo, por si falla y no avisa.
  const drain = () => new Promise(r => {
    const t = setTimeout(r, 250);
    enc.addEventListener('dequeue', () => { clearTimeout(t); r(); }, { once: true });
  });

  const canvas = new OffscreenCanvas(W, H), g = canvas.getContext('2d');
  const N = frameCount(scene.p), frameUs = 1e6 / fps;
  try {
    for (let i = 0; i < N; i++) {
      stop();
      drawFrame(g, scene, frameTime(scene.p, i));
      while (enc.encodeQueueSize > MAX_QUEUE) { await drain(); stop(); }
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameUs), duration: Math.round(frameUs) });
      enc.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
      if (i % 10 === 0) { onProgress?.(i, N); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush();
    if (failure) throw failure;
  } catch (e) {
    try { enc.close(); } catch { /* ya cerrado */ }
    throw e;
  }
  enc.close();
  muxer.finalize();
  onProgress?.(N, N);
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), codec: pick.cfg.codec, h264: pick.mux === 'avc' };
}
