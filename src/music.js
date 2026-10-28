// Music: real recorded instruments (Tone.js samplers) and the creature's score format.
//
// Score format (what the creature writes):
//   tokens separated by spaces; "|" bar lines are ignored
//   NOTE/DUR      e.g. C4/4  F#5/8  Bb3/2.   (dur: 1 2 4 8 16, "." dotted, "t" triplet)
//   [C4 E4 G4]/2  a chord
//   R/4           a rest
//   NOTE          no "/": keeps the previous duration
//   drums use K (kick), S (snare), H (hi-hat), T1 T2 T3 (toms)
const Tone = window.Tone;

export const INSTRUMENTS = {
  "piano":           { label: "Piano", release: 1.2, vol: 0 },
  "violin":          { label: "Violin", release: .6, vol: -4 },
  "cello":           { label: "Cello", release: .7, vol: -3 },
  "contrabass":      { label: "Double bass", release: .6, vol: -2 },
  "harp":            { label: "Harp", release: 2, vol: -2 },
  "flute":           { label: "Flute", release: .4, vol: -5 },
  "clarinet":        { label: "Clarinet", release: .4, vol: -5 },
  "bassoon":         { label: "Bassoon", release: .4, vol: -4 },
  "saxophone":       { label: "Saxophone", release: .4, vol: -6 },
  "trumpet":         { label: "Trumpet", release: .3, vol: -8 },
  "trombone":        { label: "Trombone", release: .4, vol: -7 },
  "french-horn":     { label: "French horn", release: .5, vol: -6 },
  "tuba":            { label: "Tuba", release: .4, vol: -5 },
  "organ":           { label: "Organ", release: .3, vol: -10 },
  "harmonium":       { label: "Harmonium", release: .4, vol: -8 },
  "guitar-acoustic": { label: "Acoustic guitar", release: 1.2, vol: -2 },
  "guitar-nylon":    { label: "Classical guitar", release: 1.2, vol: -2 },
  "guitar-electric": { label: "Electric guitar", release: .8, vol: -8 },
  "bass-electric":   { label: "Bass guitar", release: .5, vol: -3 },
  "xylophone":       { label: "Xylophone", release: 1, vol: -6 },
  "drums":           { label: "Drums", release: .3, vol: -4 },
};
export const INSTRUMENT_NAMES = Object.keys(INSTRUMENTS);

// which animation and prop goes with an instrument
export const PLAY_ANIM = {
  piano:"play_piano", organ:"play_piano", harmonium:"play_piano", harp:"play_harp", xylophone:"play_xylophone",
  violin:"play_violin", cello:"play_cello", contrabass:"play_cello",
  flute:"play_flute", clarinet:"play_flute", bassoon:"play_flute", saxophone:"play_horn", trumpet:"play_horn", trombone:"play_horn", "french-horn":"play_horn", tuba:"play_horn",
  "guitar-acoustic":"play_guitar", "guitar-nylon":"play_guitar", "guitar-electric":"play_guitar", "bass-electric":"play_guitar", drums:"play_drums",
};

const NOTE_RE = /^([A-Ga-g])(#|b|s)?(-?\d)$/;
const SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function normNote(tok){
  const m = NOTE_RE.exec(tok); if (!m) return null;
  let s = SEMI[m[1].toUpperCase()] + (m[2]==="#"||m[2]==="s" ? 1 : m[2]==="b" ? -1 : 0), o = +m[3];
  if (s < 0){ s += 12; o--; } if (s > 11){ s -= 12; o++; }
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[s] + o;
}
const DRUM = { K:"kick", S:"snare", H:"hihat", T1:"tom1", T2:"tom2", T3:"tom3" };

export function parseTrack(str, isDrums){
  const events = []; let t = 0, dur = 1;
  const src = String(str||"").replace(/\|/g," ").replace(/\[\s*/g,"[").replace(/\s*\]/g,"]").trim();
  if (!src) return { events, beats:0 };
  // keep chords together: split on spaces outside brackets
  const toks = src.match(/\[[^\]]*\](?:\/[0-9.t]+)?|\S+/g) || [];
  for (const raw of toks.slice(0, 1500)){
    let body = raw, d = null; const slash = raw.lastIndexOf("/");
    if (slash > 0){ body = raw.slice(0, slash); d = raw.slice(slash+1); }
    if (d){ const dm = /^(\d+)(\.)?(t)?$/.exec(d); if (dm){ const den = +dm[1]; if (den >= 1 && den <= 32){ dur = 4/den * (dm[2]?1.5:1) * (dm[3]?2/3:1); } } }
    const parts = body.startsWith("[") ? body.slice(1).replace(/\]$/,"").split(/[\s,]+/) : [body];
    const notes = [];
    for (const p of parts){ if (!p || /^r$/i.test(p)) continue;
      if (isDrums){ const k = DRUM[p.toUpperCase()]; if (k) notes.push(k); }
      else { const n = normNote(p); if (n) notes.push(n); } }
    if (notes.length) events.push({ t, d: dur, notes });
    t += dur;
  }
  return { events, beats: t };
}

export function parsePiece(piece){
  const tracks = (piece.tracks||[]).slice(0,4).map(tr => {
    const inst = INSTRUMENTS[tr.instrument] ? tr.instrument : "piano";
    const { events, beats } = parseTrack(tr.notes, inst === "drums");
    return { instrument: inst, volume: Math.max(0, Math.min(1, tr.volume == null ? .8 : +tr.volume)), events, beats };
  }).filter(t => t.events.length);
  const bpm = Math.max(40, Math.min(200, +piece.bpm || 96));
  const beats = Math.max(0, ...tracks.map(t => t.beats));
  return { tracks, bpm, beats, seconds: beats * 60 / bpm };
}

// ---------- sample library ----------
let sampleIndex = null;       // instrument -> [file names]
async function loadIndex(){
  if (sampleIndex) return sampleIndex;
  sampleIndex = {};
  try {
    const txt = await (await fetch("app://local/assets/samples/LIST.txt")).text();
    for (const line of txt.split(/\r?\n/)){
      const l = line.trim().replace(/\\/g,"/"); if (!l.endsWith(".mp3")) continue;
      const parts = l.split("/"); const inst = parts[parts.length-2], f = parts[parts.length-1];
      (sampleIndex[inst] = sampleIndex[inst] || []).push(f);
    }
  } catch(e){ console.warn("no sample list", e); }
  return sampleIndex;
}

let master = null, reverb = null, ready = false;
const samplers = {};
export async function initAudio(){
  if (ready || !Tone) return ready;
  await Tone.start();
  master = new Tone.Volume(-4).toDestination();
  reverb = new Tone.Reverb({ decay: 3.2, wet: .28 }); await reverb.generate(); reverb.connect(master);
  ready = true; return ready;
}
async function getInstrument(name){
  if (samplers[name]) return samplers[name];
  const idx = await loadIndex();
  const files = idx[name] || [];
  const base = `app://local/assets/samples/${name}/`;
  let inst;
  if (name === "drums"){
    const urls = {}; for (const f of files){ urls[f.replace(/\.mp3$/,"")] = base + f; }
    inst = new Tone.Players(urls); inst.isDrums = true;
  } else if (files.length){
    const urls = {};
    for (const f of files){ const n = f.replace(/\.mp3$/,""); const nn = normNote(n); if (nn) urls[nn] = f; }
    inst = new Tone.Sampler({ urls, baseUrl: base, release: INSTRUMENTS[name].release });
  } else {
    inst = new Tone.PolySynth(Tone.Synth, { oscillator:{ type:"triangle" }, envelope:{ attack:.01, decay:.2, sustain:.4, release:.8 } });
  }
  inst.volume.value = INSTRUMENTS[name].vol;
  inst.connect(reverb);
  samplers[name] = inst;
  return inst;
}

// ---------- playback ----------
let current = null;
export function nowPlaying(){ return current ? { title: current.title, started: current.started, seconds: current.seconds, id: current.id } : null; }
export function setMasterLevel(level){ if (master) master.volume.rampTo(level <= 0.001 ? -80 : 20*Math.log10(level), .25); }

export async function playPiece(piece, { onNote, onEnd } = {}){
  if (!Tone) { onEnd && onEnd(); return null; }
  await initAudio();
  stopPiece(true);
  const parsed = parsePiece(piece);
  if (!parsed.tracks.length){ onEnd && onEnd(); return null; }
  const insts = await Promise.all(parsed.tracks.map(t => getInstrument(t.instrument)));
  await Tone.loaded();
  const tr = Tone.Transport; tr.stop(); tr.cancel(0); tr.position = 0; tr.bpm.value = parsed.bpm;
  const spb = 60 / parsed.bpm;
  const parts = parsed.tracks.map((track, ti) => {
    const inst = insts[ti];
    const p = new Tone.Part((time, ev) => {
      const durSec = ev.d * spb * .95, vel = .55 + track.volume * .4;
      if (inst.isDrums){ for (const n of ev.notes){ const pl = inst.has(n) ? inst.player(n) : null; if (pl){ pl.volume.value = -6 + track.volume*6; pl.start(time); } } }
      else inst.triggerAttackRelease(ev.notes, durSec, time, vel);
      if (onNote) Tone.Draw.schedule(() => onNote(ti, ev, track.instrument), time);
    }, track.events.map(ev => [ev.t * spb, ev]));
    p.start(0); return p;
  });
  const id = Math.random().toString(36).slice(2);
  current = { id, title: piece.title, parts, seconds: parsed.seconds, started: performance.now(), onEnd };
  tr.scheduleOnce(() => { Tone.Draw.schedule(() => { if (current && current.id === id) finish(); }, Tone.now()); }, parsed.seconds + 1.2);
  tr.start("+0.15");
  return { id, seconds: parsed.seconds };
}
function finish(){ const c = current; stopPiece(true); if (c && c.onEnd) c.onEnd(); }
export function stopPiece(silent){
  if (!Tone) return;
  const c = current; current = null;
  if (c){ c.parts.forEach(p => { try { p.dispose(); } catch(e){} }); }
  Tone.Transport.stop(); Tone.Transport.cancel(0);
  for (const s of Object.values(samplers)){ try { if (s.releaseAll) s.releaseAll(); if (s.stopAll) s.stopAll(); } catch(e){} }
  if (c && !silent && c.onEnd) c.onEnd();
}
