'use strict';
/**
 * TTS engine adapters — PERMISSIVE LICENCES ONLY.
 *
 * SOP: every shipped dependency must pass the licence gate
 * (project_source/docs/OPEN_SOURCE_REUSE_SOP.md §2 / §11).  The previous engine
 * `@andresaya/edge-tts` is GPL-3.0-only and was removed (strong copyleft,
 * incompatible with closed-source distribution).
 *
 * Engines (all loaded lazily, all optional — absence degrades gracefully):
 *   - msedge-tts     MIT   primary
 *   - node-edge-tts  MIT   fallback
 *
 * Each engine exposes a uniform `synthesize(text, {voice, rate, pitch}) -> Buffer`.
 * `rate` is a percentage integer (-50..50, 0 = normal); `pitch` is Hz (-50..50).
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function tryRequire(name) {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
}

function fmtPct(n) {
  const v = Number(n) || 0;
  return `${v >= 0 ? '+' : ''}${v}%`;
}

function fmtHz(n) {
  const v = Number(n) || 0;
  return `${v >= 0 ? '+' : ''}${v}Hz`;
}

/** Primary: msedge-tts (MIT). Streams MP3 and concatenates to a Buffer. */
class MsEdgeEngine {
  constructor(mod) {
    this.name = 'msedge-tts';
    this.license = 'MIT';
    this.mod = mod;
  }

  static load() {
    const mod = tryRequire('msedge-tts');
    if (!mod || typeof mod.MsEdgeTTS !== 'function') return null;
    return new MsEdgeEngine(mod);
  }

  async synthesize(text, opts = {}) {
    const { MsEdgeTTS, OUTPUT_FORMAT } = this.mod;
    const tts = new MsEdgeTTS();
    const fmt = (OUTPUT_FORMAT && (OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
      || OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)) || undefined;
    await tts.setMetadata(opts.voice, fmt);
    // msedge-tts rate is a multiplier (1.0 = normal) and pitch a signed string.
    const rateMultiplier = 1 + (Number(opts.rate) || 0) / 100;
    const res = await tts.toStream(text, { rate: rateMultiplier, pitch: fmtHz(opts.pitch) });
    const stream = (res && res.audioStream) ? res.audioStream : res;
    const chunks = [];
    await new Promise((resolve, reject) => {
      if (!stream || typeof stream.on !== 'function') {
        return reject(new Error('msedge-tts: no audio stream returned'));
      }
      stream.on('data', (c) => chunks.push(Buffer.from(c)));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    return Buffer.concat(chunks);
  }
}

/** Fallback: node-edge-tts (MIT). Writes a temp file, reads it back, cleans up. */
class NodeEdgeEngine {
  constructor(mod) {
    this.name = 'node-edge-tts';
    this.license = 'MIT';
    this.mod = mod;
  }

  static load() {
    const mod = tryRequire('node-edge-tts');
    if (!mod || typeof mod.EdgeTTS !== 'function') return null;
    return new NodeEdgeEngine(mod);
  }

  async synthesize(text, opts = {}) {
    const { EdgeTTS } = this.mod;
    const voice = opts.voice || 'en-US-JennyNeural';
    const locale = (voice.split('-').slice(0, 2).join('-')) || 'en-US';
    const tts = new EdgeTTS({
      voice,
      lang: locale,
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
      saveSubtitles: false,
      rate: fmtPct(opts.rate),
      pitch: fmtPct(opts.pitch),
      volume: '+0%',
      timeout: 10000
    });
    const out = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
    await tts.ttsPromise(text, out);
    const buf = fs.readFileSync(out);
    try { fs.unlinkSync(out); } catch (e) { /* ignore */ }
    return buf;
  }
}

const ENGINE_ORDER = [MsEdgeEngine, NodeEdgeEngine];

/**
 * Resolve the best available permissive engine.
 * @returns {object|null} adapter instance or null when none is installed.
 */
function loadEngine() {
  for (const Klass of ENGINE_ORDER) {
    const engine = Klass.load();
    if (engine) {
      logger.info(`TTS engine loaded: ${engine.name} (${engine.license})`);
      return engine;
    }
  }
  logger.warn('TTS: no permissive engine installed (msedge-tts / node-edge-tts)');
  return null;
}

module.exports = { loadEngine, MsEdgeEngine, NodeEdgeEngine, ENGINE_ORDER };
