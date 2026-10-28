// The side panel, the floating labels and bubble, the now-playing card and toasts.
import * as THREE from "three";
import { fmtClock, NEEDS } from "./brain.js";
import { INSTRUMENTS, parsePiece } from "./music.js";
import { createCreature } from "./creature/creature.js";
import { STRUCTURES, ITEMS, MATERIALS, FOODS, fmtNeed, missing } from "./economy.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NEED_LABEL = { energy: "Energy", fullness: "Fullness", joy: "Joy", wonder: "Wonder", calm: "Calm" };
const WEATHER_ICON = { clear: "☀ Clear", "partly cloudy": "⛅ Partly cloudy", cloudy: "☁ Cloudy", "light rain": "🌦 Light rain", rain: "🌧 Rain", foggy: "🌫 Foggy", snow: "❄ Snow" };
let S, run, hooks, W;

export function init(ctx){ S = ctx.S; run = ctx.run; hooks = ctx; W = ctx.W;
  document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => selectTab(b.dataset.tab));
  $("#pane-music").addEventListener("click", e => { const b = e.target.closest("[data-play]"); if (b) hooks.playLibrary(b.dataset.play); const st = e.target.closest("[data-stop]"); if (st) hooks.stopMusic(); });
  try { const t = localStorage.getItem("ll-tab"); if (t) selectTab(t); } catch {}
}
function selectTab(name){ document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  for (const n of ["now", "build", "diary", "made", "music", "about"]) $("#pane-" + n).hidden = n !== name; try { localStorage.setItem("ll-tab", name); } catch {}
  if (name === "about") renderAbout(); }
export function setPressed(sel, key, val){ document.querySelectorAll(sel + " button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset[key] === String(val)))); }

export function renderAll(){ renderHeader(); renderNow(); renderBuild(); renderDiary(); renderMade(); renderMusic(); renderAbout(); }
export function renderHeader(){
  const has = !!S.self;
  $("#townName").textContent = has ? S.self.town.name : "Little Life";
  $("#whoLine").textContent = has ? `Home of ${S.self.creature.name}, ${/^[aeiou]/i.test(S.self.creature.species) ? "an" : "a"} ${S.self.creature.species}` : "Nobody lives here yet";
  $("#clock").textContent = has && S.state ? fmtClock(S.state.clock) + (run.running ? "" : " · paused") : "—";
  $("#liveDot").classList.toggle("live", run.running);
  $("#weather").textContent = has && S.state && S.state.weather ? WEATHER_ICON[S.state.weather.today] || S.state.weather.today : "";
  $("#watchBtn").textContent = run.running ? "Pause" : has ? `Watch ${S.self.creature.name}` : "Begin";
  $("#watchBtn").classList.toggle("primary", !run.running);
}
function needsHtml(n){ return NEEDS.map(k => { const v = Math.round(n[k]); return `<div class="need${v < 25 ? " low" : ""}" data-need="${k}"><span>${NEED_LABEL[k]}</span><div class="bar"><i style="width:${v}%"></i></div><span class="v">${v}</span></div>`; }).join(""); }
export function renderNeeds(){ if (!S.state) return; for (const k of NEEDS){ const el = document.querySelector(`[data-need="${k}"]`); if (!el) continue; const v = Math.round(S.state.needs[k]); el.classList.toggle("low", v < 25); el.querySelector("i").style.width = v + "%"; el.querySelector(".v").textContent = v; } }
export function renderNow(){
  const el = $("#pane-now");
  if (!S.self || !S.state){ el.innerHTML = `<p class="empty">When a creature moves in, you'll see here what it's doing, what it's thinking and how it feels.</p>`; return; }
  const cr = S.self.creature, a = run.current, pl = S.self.town.places.find(p => p.id === (a ? a.place : S.state.place));
  const doing = a ? (a.sleep ? "Sleeping" : a.doing[0].toUpperCase() + a.doing.slice(1)) : run.thinking ? "Deciding what to do next" : "Waiting";
  const status = run.error ? `<div class="status">${esc(run.error)}</div>` : run.thinking ? `<div class="status"><span class="spinner"></span> ${esc(cr.name)} is thinking about what to do next…</div>` : !run.running ? `<div class="status">Paused. Press Watch (or Space) to let time move.</div>` : "";
  const up = run.queue.length ? `<div><div class="label">Planning next</div><ul class="upnext">${run.queue.map(q => `<li>${esc(q.sleep ? "sleep" : q.doing)} <span>· ${esc((S.self.town.places.find(p => p.id === q.place) || {}).name || "")}</span></li>`).join("")}</ul></div>` : "";
  const note = a && a.note ? `<div class="where">(${esc(a.note)})</div>` : "";
  el.innerHTML = `<div><div class="label">Right now</div><p class="doing">${esc(doing)}</p><div class="where">${pl ? "at " + esc(pl.name) + (S.state.room ? " · inside" : "") : ""}</div>${note}</div>
    ${S.state.thought ? `<p class="thought">“${esc(S.state.thought)}”</p>` : ""}
    <div><span class="chip">Feeling ${esc(S.state.mood || "—")}</span></div>
    <div class="needs">${needsHtml(S.state.needs)}</div>${up}${status}
    <div><div class="label">Carrying</div>${invHtml()}</div>`;
}
function invHtml(){ const inv = S.world ? S.world.inv : {}; const parts = [...Object.keys(MATERIALS).map(k => [MATERIALS[k].label, inv[k] || 0]), ...Object.keys(FOODS).filter(k => inv[k]).map(k => [FOODS[k], inv[k]])].filter(([, n]) => n > 0);
  const tools = (S.world ? S.world.tools : []).map(t => ITEMS[t] ? ITEMS[t].label : t);
  return `<div class="inv">${parts.map(([l, n]) => `<span>${esc(l)}<b>${n}</b></span>`).join("") || '<span>nothing yet</span>'}${tools.map(t => `<span>🔧 ${esc(t)}</span>`).join("")}</div>`; }
export function renderBuild(){
  const el = $("#pane-build"); if (!el) return;
  if (!S.self || !S.world){ el.innerHTML = `<p class="empty">Once it wakes up, you'll see what it's gathered and everything it's building here.</p>`; return; }
  const sites = S.self.town.places.filter(p => p.kind !== "camp").map(p => { const st = W.siteState(p.id), def = st.def, n = def.stages.length;
    const bars = def.stages.map((sg, i) => `<i class="${i < st.stage ? "on" : i === st.stage && st.paid ? "half" : ""}"></i>`).join("");
    const label = st.complete ? "built" : st.stage === 0 && !st.paid && !st.work ? "planned" : "building";
    const stage = def.stages[st.stage];
    const need = st.complete ? `${(S.world.items[p.id] || []).length ? "Has: " + esc((S.world.items[p.id] || []).map(i => ITEMS[i] ? ITEMS[i].label : i).join(", ")) : "Nothing inside yet"}` : stage ? `Next: ${esc(stage.label)} · ${st.paid ? "materials in place, " + Math.max(0, Math.round(stage.minutes - st.work)) + " min of work left" : "needs " + esc(fmtNeed(stage.need)) + (Object.keys(missing(S.world.inv, stage.need)).length ? " (missing " + esc(fmtNeed(missing(S.world.inv, stage.need))) + ")" : " (ready)")}` : "";
    return `<div class="site"><div class="top"><b>${esc(p.name)}</b><span class="st ${st.complete ? "done" : label === "building" ? "wip" : ""}">${label} · ${esc(p.kind)}</span></div>${n ? `<div class="stages">${bars}</div>` : ""}<div class="need">${need}</div></div>`; }).join("");
  const camp = (S.world.items.camp || []).map(i => ITEMS[i] ? ITEMS[i].label : i);
  el.innerHTML = `<div><div class="label">Stores</div>${invHtml()}</div>
    <div><div class="label">Sleeps at</div><p>${esc((W.shelters()[0] || { name: "camp" }).name)}</p></div>
    ${camp.length ? `<div><div class="label">At camp</div><p>${esc(camp.join(", "))}</p></div>` : ""}
    <div><div class="label">Places</div><div class="places" style="gap:8px">${sites || '<p class="empty">No plans yet.</p>'}</div></div>`;
}
export function renderDiary(){
  const el = $("#pane-diary"); if (!S.self){ el.innerHTML = `<p class="empty">The diary is empty.</p>`; return; }
  const days = Object.values(S.days).sort((a, b) => b.day - a.day).slice(0, 14);
  el.innerHTML = days.map(d => `<section class="day"><h3>Day ${d.day}</h3><div class="entries">${d.entries.map(e => {
    const t = fmtClock(e.m, false), pl = S.self.town.places.find(p => p.id === e.place);
    if (e.kind === "diary") return `<div class="e-diary"><small>DIARY · ${t}</small>${esc(e.text)}</div>`;
    if (e.kind === "born") return `<div class="e-diary"><small>FIRST THOUGHT · ${t}</small>${esc(e.text)}</div>`;
    if (e.kind === "made") return `<div class="e-made"><time>${t}</time><span>${esc(e.text[0].toUpperCase() + e.text.slice(1))}</span></div>`;
    if (e.kind === "music") return `<div class="e-made"><time>${t}</time><span>♪ Played “${esc(e.text)}”</span></div>`;
    return `<div class="e-act"><time>${t}</time><span>${esc(e.text)}${pl ? ` <span class="where">· ${esc(pl.name)}</span>` : ""}${e.note ? ` <span class="where">(${esc(e.note)})</span>` : ""}${e.thought ? `<span class="q">${esc(e.thought)}</span>` : ""}</span></div>`; }).join("")}</div></section>`).join("") || `<p class="empty">Nothing yet.</p>`;
}
export function renderMade(){
  const el = $("#pane-made"); $("#madeCount").textContent = S.creations.length || "";
  if (!S.creations.length){ el.innerHTML = `<p class="empty">Nothing yet. When it feels like it, it writes poems and letters, paints on its easel and builds new places in town.</p>`; return; }
  el.innerHTML = S.creations.map(c => {
    const meta = `<div class="meta"><span class="type">${esc(c.type === "building" ? "new place" : c.type)}</span><span>${fmtClock(c.at)}</span></div><h4>${esc(c.title)}</h4>`;
    if (c.type === "drawing") return `<div class="item">${meta}<img alt="${esc(c.title)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}">${c.about ? `<p class="about">${esc(c.about)}</p>` : ""}</div>`;
    if (c.type === "building") return `<div class="item">${meta}<p class="about">${esc(c.about || "")}</p></div>`;
    return `<div class="item">${meta}<pre>${esc(c.text)}</pre></div>`; }).join("");
}
export function renderMusic(){
  const el = $("#pane-music"); $("#musicCount").textContent = S.music.length || "";
  if (!S.music.length){ el.innerHTML = `<p class="empty">Its music library is empty. Every piece it composes or plays from memory is kept here, and you can play any of them yourself.</p>`; return; }
  el.innerHTML = S.music.map(m => `<div class="item"><div class="meta"><span class="type">${esc(m.style || "music")}</span><span>${m.seconds ? Math.floor(m.seconds / 60) + ":" + String(m.seconds % 60).padStart(2, "0") : ""}</span></div>
    <h4>${esc(m.title)}</h4><p class="about">${m.by && m.by !== "me" ? "by " + esc(m.by) + " · played by " + esc(S.self.creature.name) : "composed by " + esc(S.self.creature.name)}${m.key ? " · " + esc(m.key) : ""}</p>
    <div class="row"><button class="small" data-play="${esc(m.id)}">Play</button><span class="inst">${m.tracks.map(t => esc((INSTRUMENTS[t.instrument] || {}).label || t.instrument)).join(" · ")} · played ${m.plays || 0}×</span></div></div>`).join("");
}
let portraitDone = "";
export function renderAbout(){
  const el = $("#pane-about");
  if (!S.self){ el.innerHTML = `<p class="empty">Once it exists, you'll learn who it is here.</p>`; return; }
  const c = S.self.creature, t = S.self.town;
  el.innerHTML = `<div class="who"><canvas class="portrait" id="portrait" width="184" height="184"></canvas><div><h2>${esc(c.name)}</h2><p>${esc(c.species)} · ${esc(c.pronoun)}</p></div></div>
    <p>${esc(c.personality)}</p>
    <div><div class="label">Loves</div><div class="chips">${c.loves.map(x => `<span>${esc(x)}</span>`).join("")}</div></div>
    <div><div class="label">Dislikes</div><div class="chips">${c.dislikes.map(x => `<span>${esc(x)}</span>`).join("")}</div></div>
    <div><div class="label">Music</div><p>${esc(c.musicTaste)} · favourite instrument: ${esc((INSTRUMENTS[c.favoriteInstrument] || {}).label || c.favoriteInstrument)}</p></div>
    <div><div class="label">Dream</div><p>${esc(c.dream)}</p></div>
    <div><div class="label">Why ${esc(t.name)}</div><p class="thought">“${esc(t.why)}”</p></div>
    ${S.self.animals && S.self.animals.length ? `<div><div class="label">Animals ${esc(c.name)} wanted</div><p>${S.self.animals.map(a => esc((a.name ? a.name + " the " : "a ") + a.species)).join(", ")}</p></div>` : ""}
    <div><div class="label">Dream places</div><div class="places">${t.places.map(p => `<div class="place"><span class="sw" style="background:${p.roof}"></span><div><b>${esc(p.name)} · ${esc(p.kind)}</b><span>${esc(p.about)}</span></div></div>`).join("")}</div></div>
    <p class="fine where">3D models by Kenney (kenney.nl, CC0). Instrument samples: Salamander Grand Piano and tonejs-instruments.</p>`;
  drawPortrait(c.look);
}
let pr = null;
function drawPortrait(look){
  const cv = $("#portrait"); if (!cv) return;
  try {
    if (!pr){ const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(184, 184); r.outputColorSpace = THREE.SRGBColorSpace;
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.3)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(2, 3, 4); sc.add(d);
      const cam = new THREE.PerspectiveCamera(30, 1, .1, 20); cam.position.set(.9, 1.1, 2.8); cam.lookAt(0, .75, 0); pr = { r, sc, cam, c: null }; }
    const key = JSON.stringify(look);
    if (portraitDone !== key){ if (pr.c) pr.sc.remove(pr.c.root); pr.c = createCreature(look); pr.c.setAnim("wave"); pr.sc.add(pr.c.root); portraitDone = key; for (let i = 0; i < 40; i++) pr.c.update(.05, 2 + i * .05); }
    pr.r.render(pr.sc, pr.cam); cv.getContext("2d").drawImage(pr.r.domElement, 0, 0);
  } catch(e){ console.warn("portrait", e); }
}

// ---------- labels & bubble ----------
let labelEls = [];
export function buildLabels(town, places){
  const layer = $("#labels"); layer.textContent = ""; labelEls = [];
  if (!town) return;
  for (const p of places){ const r = town.places[p.id]; if (!r) continue; const d = document.createElement("div"); d.className = "lbl"; d.textContent = p.name; layer.appendChild(d); labelEls.push({ el: d, pos: r.labelPos }); }
}
const v = new THREE.Vector3();
function project(E, p){ v.copy(p).project(E.camera); const w = innerWidth, h = innerHeight; return { x: (v.x * .5 + .5) * w, y: (-v.y * .5 + .5) * h, vis: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 }; }
export function positionOverlay(E, creature, live, run, town, dark, insideView){
  const camPos = E.camera.position;
  for (const l of labelEls){ const s = project(E, l.pos); const dist = camPos.distanceTo(l.pos); l.el.hidden = insideView || !s.vis || dist > 160; if (l.el.hidden) continue;
    l.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%)`; l.el.style.opacity = dist < 12 ? .35 : 1; l.el.classList.toggle("night", dark > .5); }
  const b = $("#bubble");
  if (!creature || !S.self){ b.hidden = true; return; }
  let text = "";
  const a = run.current;
  if (run.thinking && live.phase === "idle") text = "…thinking about what to do…";
  else if (live.phase === "walk" && a) text = "heading to " + ((S.self.town.places.find(p => p.id === a.place) || {}).name || "somewhere");
  else if (live.phase === "act" && a) text = a.sleep ? "z z z" : a.doing;
  if (!text){ b.hidden = true; return; }
  const creatureVisible = insideView ? !!live.room : !live.room;
  const head = creatureVisible ? creature.headWorld().add(new THREE.Vector3(0, .75, 0)) : (town.places[live.room] ? town.places[live.room].labelPos.clone() : null);
  if (!creatureVisible && head) text = "inside: " + text;
  if (!head){ b.hidden = true; return; }
  const s = project(E, head); b.hidden = !s.vis || camPos.distanceTo(head) > 90; if (b.hidden) return;
  const t = $("#bubbleText"); if (t.textContent !== text) t.textContent = text;
  b.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%)`;
}

// ---------- now playing ----------
let np = null;
export function showNowPlaying(piece){
  const parsed = parsePiece(piece); np = { piece, parsed, started: performance.now(), hits: [] };
  $("#npTitle").textContent = piece.title; $("#npBy").textContent = (piece.by && piece.by !== "me" ? "by " + piece.by + " · " : "composed by " + (S.self ? S.self.creature.name : "") + " · ") + piece.tracks.map(t => (INSTRUMENTS[t.instrument] || {}).label || t.instrument).join(", ");
  $("#nowPlaying").hidden = false;
}
export function hideNowPlaying(){ $("#nowPlaying").hidden = true; np = null; }
export function noteHit(ti, ev){ if (np) np.hits.push({ ti, t: performance.now(), notes: ev.notes }); }
const TRACK_COL = ["#ffc76a", "#8fd3ff", "#ff9fc0"];
export function updateNowPlaying(playing){
  if (!np) return; const cv = $("#npRoll"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
  const el = (performance.now() - (playing.started || np.started)) / 1000, total = np.parsed.seconds || 1, spb = 60 / np.parsed.bpm;
  $("#npBar").style.width = Math.min(100, el / total * 100) + "%";
  g.clearRect(0, 0, W, H);
  const win = 8, x0 = el - 2;   // seconds shown
  let lo = 127, hi = 0; np.parsed.tracks.forEach(t => { if (t.instrument === "drums") return; t.events.forEach(e => e.notes.forEach(n => { const m = midi(n); if (m < lo) lo = m; if (m > hi) hi = m; })); });
  if (lo > hi){ lo = 48; hi = 72; } const span = Math.max(12, hi - lo + 2);
  g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(W * 2 / win, 0, 2, H);
  np.parsed.tracks.forEach((t, ti) => { g.fillStyle = TRACK_COL[ti % 3];
    for (const e of t.events){ const s = e.t * spb, d = e.d * spb; if (s + d < x0 || s > x0 + win) continue;
      for (const n of e.notes){ const m = t.instrument === "drums" ? lo + 2 : midi(n); const y = H - ((m - lo + 1) / span) * H; const x = (s - x0) / win * W;
        g.globalAlpha = s <= el && el < s + d ? 1 : .55; g.fillRect(x, y - 3, Math.max(3, d / win * W - 1), 5); } } });
  g.globalAlpha = 1;
}
function midi(n){ const m = /^([A-G])(#?)(-?\d)$/.exec(n); if (!m) return 60; return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); }

// ---------- toast ----------
export function toast(msg, action){
  const t = $("#toast"); if (!msg){ t.hidden = true; return; }
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="small" id="toastBtn">${esc(action.label)}</button>` : ""}`; t.hidden = false;
  if (action) $("#toastBtn").onclick = () => { t.hidden = true; action.fn(); };
}
