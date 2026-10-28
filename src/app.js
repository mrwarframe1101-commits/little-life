// Little Life — the main loop: builds the world, runs the creature's life, talks to its brain, plays its music.
import * as THREE from "three";
import { createEngine } from "./world/engine.js";
import * as A from "./world/assets.js";
import { configureTerrain, heightAt, buildTerrain, buildRiver, buildGrass, updateWater, riverZ, rng } from "./world/terrain.js";
import { createSky } from "./world/sky.js";
import { buildTown, layoutPlaces, campSpot, OUTDOOR_KINDS, hasRoom } from "./world/town.js";
import { buildNature, createLife } from "./world/nature.js";
import { createStockpile } from "./world/stockpile.js";
import { buildGrassField } from "./world/grass.js";
import { createWild } from "./world/wild.js";
import { createAnimals } from "./world/animals.js";
import { createInteriors } from "./world/interiors.js";
import { createFX } from "./world/fx.js";
import { setNightGlow } from "./world/buildings.js";
import { createCreature, emotionFor } from "./creature/creature.js";
import { toonify } from "./world/style.js";
import { showOnEasel } from "./creature/props.js";
import { ACTIVITIES, animFor } from "./activities.js";
import { STRUCTURES, ITEMS, PROCESS, GATHER, FOOD_VALUE, SOURCE, SHELTER_ORDER, hasAll, missing, take, give, fmtNeed } from "./economy.js";
import * as Music from "./music.js";
import * as Brain from "./brain.js";
import * as UI from "./ui.js";

const $ = s => document.querySelector(s);
const life = window.life;
const clamp = Brain.clamp;
const DECAY = { energy: .05, fullness: .07, joy: .02, wonder: .035, calm: .02 };
const WALK = 1.6, SLEEP_SPEED = 16;
const PRICES = { "claude-haiku-5-5": [0.10, 0.50], "claude-sonnet-5-5": [2, 10] };
const RAW_FOODS = ["fish", "vegetables", "mushrooms", "eggs", "grain", "berries"];
const EMOJI = {"chop_tree": "🪓", "gather_sticks": "🪵", "gather_stones": "🪨", "mine_ore": "⛏️", "dig_clay": "🏺", "dig_sand": "🏖️", "gather_fiber": "🌾", "forage": "🍓", "saw_planks": "🪚", "fire_kiln": "🔥", "smelt": "⚒️", "weave": "🧶", "build": "🔨", "craft": "🛠️", "sleep": "💤", "nap": "💤", "eat": "🍙", "drink": "🍵", "cook": "🍳", "bake": "🥐", "make_coffee": "☕", "wash_dishes": "🫧", "watch_tv": "📺", "play_videogames": "🎮", "use_computer": "💻", "read": "📖", "browse_books": "📚", "write": "✏️", "knit": "🧶", "puzzle": "🧩", "board_game": "🎲", "listen_records": "🎶", "light_fireplace": "🔥", "warm_up": "🔥", "look_out_window": "🪟", "water_plants": "💧", "sweep": "🧹", "paint": "🎨", "pottery": "🏺", "grind_flour": "🌾", "dance": "💃", "telescope": "🔭", "sing": "🎤", "garden": "🌱", "harvest": "🥕", "pick_flowers": "🌸", "plant_tree": "🌳", "stack_wood": "🪵", "make_campfire": "🔥", "roast_marshmallows": "🍡", "fish": "🎣", "swim": "🏊", "skip_stones": "💦", "fly_kite": "🪁", "feed_birds": "🐦", "birdwatch": "🐦", "photograph": "📷", "sketch": "✏️", "jog": "🏃", "juggle": "🤹", "play_ball": "⚽", "jump_rope": "🪢", "cloud_watch": "☁️", "stargaze": "⭐", "sunbathe": "☀️", "build_snowman": "⛄", "catch_snowflakes": "❄️", "splash_puddles": "☔", "pet_animal": "❤️", "feed_animals": "🥕", "play_fetch": "🦴", "collect_eggs": "🥚", "brush_animal": "🪮", "befriend": "💕", "think": "💭", "celebrate": "🎉", "look_around": "👀", "wave": "👋", "bathe": "🛁", "groom": "🪮", "yoga": "🧘", "meditate": "🧘", "exercise": "💪", "stretch": "🙆", "sit": "😌", "idle": "🙂"};
const EMO_EMOJI = { sad: "🌧️", angry: "💢", worried: "💦", love: "💕", joyful: "✨", surprised: "❗", thinking: "❓", tired: "💤" };
const EAT_ORDER = ["meal", "bread", "fish", "vegetables", "eggs", "mushrooms", "berries", "honey", "grain"];

// ---------- state ----------
const S = { self: null, state: null, world: null, days: {}, creations: [], music: [], spend: { usd: 0, inTok: 0, outTok: 0 } };
const run = { running: false, thinking: false, queue: [], current: null, playing: null, settings: null, error: null, speed: 1, labels: true, music: true };
const live = { pos: new THREE.Vector3(), steps: [], phase: "idle", elapsed: 0, placeId: "camp", room: null, yaw: 0, t: 0, pause: 0 };
let E, sky, fx, lifeFx, town, wild, animals, interiors, creature, stock = null, grassField = null, worldObjs = [], lampLights = [], outdoorItems = {};
const doorOpen = {}, roomDoorOpen = {};
window.__LL = { S, run, live };

function freshWorld(){ return { inv: {}, tools: [], sites: {}, items: {}, felled: {}, saplings: [], fires: [], snowmen: [], fireplace: {}, animals: {}, puzzles: {} }; }

// ---------- boot ----------
async function boot(){
  run.settings = await life.getSettings();
  run.speed = run.settings.speed || 1; run.music = run.settings.musicOn !== false;
  E = createEngine($("#view"), run.settings.quality);
  E.cam.onModeChange = mode => UI.setPressed("#camSeg", "cam", mode);
  sky = createSky(E.scene, E.renderer, E.quality);
  fx = createFX(E.scene);
  lifeFx = createLife(E.scene);
  progress("Unpacking the models…");
  await A.loadModelList();
  const saved = await life.load();
  if (saved && saved.self && saved.world){ Object.assign(S, saved); S.music = S.music || []; S.spend = S.spend || { usd: 0, inTok: 0, outTok: 0 }; }
  await buildWorld();
  $("#loading").hidden = true;
  UI.init({ S, run, W, playLibrary, stopMusic: () => stopMusic() });
  wireControls();
  UI.renderAll();
  if (!run.settings.hasKey || !S.self) openSetup();
  requestAnimationFrame(frame);
  setInterval(simTick, 50);
}
const progress = t => { const el = $("#loadingText"); if (el) el.textContent = t; console.log("[build]", t); };

// ---------- world ----------
function clearWorld(){
  for (const o of worldObjs){ if (o.dispose) o.dispose(); else { E.scene.remove(o); o.traverse && o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); } }
  worldObjs = []; lampLights.forEach(l => E.scene.remove(l)); lampLights = [];
  fx.emitters.smoke.length = 0; fx.emitters.fires.length = 0;
  if (creature){ creature.root.parent && creature.root.parent.remove(creature.root); creature.dispose(); creature = null; }
  E.setActiveScene(null);
}
const track = o => { if (o){ if (Array.isArray(o)) o.forEach(track); else worldObjs.push(o); } return o; };
async function buildWorld(){
  clearWorld();
  const empty = { town: { name: "empty valley", ground: "#9cc27a", path: "#c9b99a", water: "#5aa6c9", river: true, decor: ["trees", "flowers", "rocks"], places: [] } };
  const self = S.self || empty, hasRiver = self.town.river !== false;
  configureTerrain(self.town.name, hasRiver);
  progress("Shaping the hills…");
  track(buildTerrain(E.scene, self.town, run.settings.quality));
  track(buildRiver(E.scene, self.town));
  const camp = campSpot(hasRiver);
  if (S.self){
    const places = self.town.places;
    const cp = places.find(p => p.kind === "camp"); if (cp && cp.wx == null){ cp.wx = camp.x; cp.wz = camp.z; cp.rot = 0; }
    if (places.some(p => p.wx == null)) layoutPlaces(places, places.filter(p => p.wx != null).length, hasRiver, camp);
    progress("Marking out the land…");
    town = await buildTown(E.scene, self, S.world, { hasRiver, camp });
    track(town.root); track(town.dynamic);
    for (const p of places) town.setProgress(p.id, siteProgress(p.id));
    town.rebuildTrails(); track(E.scene.children.filter(o => o.name === "trails"));
  } else town = { places: {}, blocked: (x, z) => Math.abs(z - riverZ(x)) < 8.5, lamps: [], smoke: [], spinners: [], signs: [], flags: [], hasRiver, footprints: [] };
  progress("Growing the forest…");
  const builtBlock = (x, z) => (town.hasRiver && Math.abs(z - riverZ(x)) < 8.5) || Object.values(town.places).some(r => (r.kind === "camp" || siteProgress(r.id) >= 0) && Math.hypot(x - r.footprint.x, z - r.footprint.z) < r.footprint.r);
  wild = await createWild(E.scene, self, S.world || freshWorld(), { blocked: S.self ? builtBlock : town.blocked, camp, hasRiver }); track(wild);
  stock = S.self ? createStockpile(E.scene, { x: camp.x, z: camp.z }) : null; if (stock){ track(stock.group); stock.update(S.world ? S.world.inv : {}); }
  const grassBlocked = (x, z) => town.blocked(x, z) || (Math.hypot(x - camp.x, z - camp.z) < 4.5);
  grassField = buildGrassField(E.scene, { count: E.quality.grass, blocked: grassBlocked, hasRiver }); grassField.userData.blocked = grassBlocked; track(grassField);
  track(await buildNature(E.scene, self.town, self.town.places, { ...town, places: {}, blocked: (x, z) => town.blocked(x, z) || Math.hypot(x - camp.x, z - camp.z) < 8, noTrees: (x, z) => !!S.self && Math.sqrt((x / 100) ** 2 + (z / 64) ** 2) < 1.08 }, E.quality, self.town.decor));
  lifeFx.setRiver(hasRiver);
  toonify(E.scene);
  if (S.self){
    progress("Furnishing the rooms…");
    const rooms = Object.values(town.places).filter(r => r.room && siteComplete(r.id)).map(r => ({ id: r.id, wall: placeOf(r.id).wall, items: S.world.items[r.id] || [] }));
    interiors = await createInteriors(E.renderer, rooms); track(interiors);
    animals = createAnimals(E.scene, self, town, (self.animals || []).map(a => ({ ...a, ...(S.world.animals[a.id] || {}) }))); track(animals);
    animals.list.forEach(a => { const s = S.world.animals[a.id]; if (s){ a.friendship = s.friendship || 0; if (s.name) a.name = s.name; } });
    refreshOutdoorItems();
    refreshEmitters();
    toonify(E.scene); toonify(interiors.scene);
    creature = createCreature(S.self.creature.look);
    const st = S.state, rec = town.places[st.place] || town.places.camp;
    live.placeId = rec.id; live.room = null; live.steps = []; live.phase = "idle";
    live.pos.copy(rec.spot); E.scene.add(creature.root); creature.root.position.copy(live.pos); live.yaw = rec.rot;
    UI.buildLabels(town, self.town.places);
    E.controls.target.copy(live.pos); E.camera.position.copy(live.pos).add(new THREE.Vector3(9, 7, 13));
    updateWeather(true);
    creature.setEmotion(emotionFor(S.state.mood, S.state.needs, null));
  } else { UI.buildLabels(null, []); E.controls.target.set(0, 0, 0); E.camera.position.set(30, 40, 80); sky.setWeather("partly cloudy"); interiors = null; animals = null; }
}
function refreshEmitters(){
  fx.emitters.smoke.length = 0; fx.emitters.fires.length = 0;
  town.smoke.forEach(p => fx.emitters.smoke.push(p));
  lampLights.forEach(l => E.scene.remove(l)); lampLights = [];
  const lamps = town.lamps.slice(0, 10);
  for (const l of lamps){ const L = new THREE.PointLight(0xffc77a, 0, 12, 1.6); L.position.copy(l.pos); E.scene.add(L); lampLights.push(L); }
}
// things crafted for outdoor places (a bed at camp, a loom by the lean-to)
function refreshOutdoorItems(){
  for (const g of Object.values(outdoorItems)) E.scene.remove(g); outdoorItems = {};
  for (const [pid, items] of Object.entries(S.world.items)){
    const rec = town.places[pid]; if (!rec || (rec.room && siteComplete(pid))) continue;
    const g = new THREE.Group(); E.scene.add(g); outdoorItems[pid] = g;
    items.forEach((k, i) => { const m = interiors.itemModel(k); const a = Math.PI * .65 + i * .7, r = 4.2 + (i % 2) * 1.1; const x = rec.pos.x + Math.cos(a + rec.rot) * r, z = rec.pos.z + Math.sin(a + rec.rot) * r;
      m.position.set(x, heightAt(x, z), z); m.rotation.y = Math.atan2(rec.pos.x - x, rec.pos.z - z); m.userData = { item: k, pid }; g.add(m); });
  }
}
function outdoorStation(type){
  for (const g of Object.values(outdoorItems)) for (const m of g.children){
    const it = ITEMS[m.userData.item]; if (!it || it.station !== type) continue;
    const f = new THREE.Vector3(Math.sin(m.rotation.y), 0, Math.cos(m.rotation.y));
    const lie = type === "bed", seat = ["sofa", "armchair", "chair"].includes(type);
    const pos = lie || seat ? m.position.clone().addScaledVector(f, .1) : m.position.clone().addScaledVector(f, .9);
    if (lie) pos.y += .56;
    return { pos, yaw: lie || seat ? m.rotation.y : m.rotation.y + Math.PI, seat, lie, pid: m.userData.pid, own: true };
  }
  return null;
}

// ---------- the world, as the brain sees it ----------
const placeOf = id => S.self.town.places.find(p => p.id === id);
function siteState(id){ const p = placeOf(id); const st = S.world.sites[id] || { stage: 0, work: 0, paid: false }; const def = STRUCTURES[p ? p.kind : "camp"] || { stages: [] };
  return { ...st, complete: !p || p.kind === "camp" || st.stage >= def.stages.length, def }; }
const siteComplete = id => siteState(id).complete;
function siteProgress(id){ const s = siteState(id); if (s.complete) return 1; const n = s.def.stages.length; if (s.stage === 0 && !s.paid && !s.work) return -1;
  return (s.stage + (s.paid ? Math.min(1, s.work / s.def.stages[s.stage].minutes) : 0)) / n; }
function footprintTest(id){ const r = town.places[id]; if (!r) return () => false; const f = r.footprint; return (x, z) => Math.hypot(x - f.x, z - f.z) < f.r - .5; }
const W = {
  siteState, treesOnSite: id => wild.treesIn(footprintTest(id)).length,
  fireAt: id => { const r = town.places[id]; if (!r || !r.fire) return false; const f = wild.nearestFire(r.fire.x, r.fire.z, S.state.clock); return !!f && Math.hypot(f.x - r.fire.x, f.z - r.fire.z) < 3; },
  shelters(){ const out = [];
    for (const p of S.self.town.places){ const def = STRUCTURES[p.kind]; if (!def || def.sleep == null || !siteComplete(p.id)) continue; const bed = (S.world.items[p.id] || []).includes("bed");
      out.push({ id: p.id, name: p.name + (bed ? " (in your bed)" : def.room ? " (on the floor)" : ""), q: def.room ? (bed ? 1 : .7) : (bed ? Math.max(def.sleep, .9) : def.sleep) }); }
    return out.sort((a, b) => b.q - a.q); },
  stationsList(){ const out = [];
    for (const p of S.self.town.places){ if (!siteComplete(p.id)) continue; const def = STRUCTURES[p.kind]; if (def && def.station) out.push(`${def.station} at ${p.name} ("${p.id}")`);
      for (const it of new Set(S.world.items[p.id] || [])){ const i = ITEMS[it]; if (i && i.station && ["workbench", "loom", "kiln", "forge"].includes(i.station)) out.push(`${i.station} at ${p.name} ("${p.id}")`); } }
    return out; },
  get animals(){ return animals ? animals.list.filter(a => !a.wild || (a.friendship || 0) > 0 || ["deer", "fox", "rabbit", "duck"].includes(a.species)).slice(0, 12) : []; },
};
// where a work station exists: returns {place, inside}
function findStation(type){
  if (type === "piano"){ const bs = S.self.town.places.find(p => p.kind === "bandstand" && siteComplete(p.id)); if (bs && !Object.values(S.world.items).some(l => l.includes("piano"))) return { place: bs.id, inside: false, bandstand: true }; }
  for (const p of S.self.town.places){ if (!siteComplete(p.id)) continue; const def = STRUCTURES[p.kind];
    if (def && def.station === type && !def.room) return { place: p.id, inside: false };
    if (def && def.station === type && def.room && interiors && interiors.rooms[p.id]) return { place: p.id, inside: true, stationType: type };
    const items = S.world.items[p.id] || [];
    const has = items.some(it => (ITEMS[it] && ITEMS[it].station === type) || (type === "workbench" && it === "workbench_indoor"));
    if (has) return { place: p.id, inside: !!(town.places[p.id].room), stationType: type }; }
  return null;
}

// ---------- weather & seasons ----------
function weatherFor(day){
  const R = rng((S.self ? S.self.town.name : "x") + "-weather-" + day); const r = R(), season = Brain.SEASONS[Math.floor((day - 1) / 7) % 4];
  const t = { spring: [.3, .55, .67, .82, .9, .98], summer: [.5, .75, .82, .9, .95, 1.01], autumn: [.22, .45, .62, .78, .88, .97], winter: [.18, .32, .5, .55, .6, .72] }[season];
  return r < t[0] ? "clear" : r < t[1] ? "partly cloudy" : r < t[2] ? "cloudy" : r < t[3] ? "light rain" : r < t[4] ? "rain" : r < t[5] ? "foggy" : "snow";
}
function updateWeather(force){
  const d = Brain.dayOf(S.state.clock);
  if (force || !S.state.weather || S.state.weather.day !== d) S.state.weather = { day: d, today: weatherFor(d), tomorrow: weatherFor(d + 1) };
  sky.setWeather(S.state.weather.today);
}
const weatherNow = () => (S.state && S.state.weather) ? S.state.weather.today : "clear";

// ---------- frame ----------
let last = performance.now(), simLast = performance.now();
function frame(ts){
  const dt = Math.min(.1, (ts - last) / 1000); last = ts; live.t += dt;
  A.wind.time.value += dt; updateWater(dt);
  const clock = S.state ? S.state.clock : 600;
  const inside = !!live.room;
  const focusOut = creature ? (inside ? town.places[live.room].door.clone() : creature.root.position.clone()) : E.controls.target.clone();
  const st = sky.update(dt, clock, focusOut);
  setNightGlow(st.glow); lampLights.forEach(L => L.intensity = st.glow * 9);
  lifeFx.update(dt, live.t, st, focusOut);
  fx.update(dt, st);
  if (town && town.update){ town.update(dt); town.spinners.forEach(s => s.rotation.z += dt * (s.userData.spin || .5) * (1 + st.cover));
    town.signs.forEach((s, i) => s.rotation.x = Math.sin(live.t * 1.3 + i) * .05 * A.wind.strength.value);
    town.flags.forEach((f, i) => { if (f.userData.baseY == null) f.userData.baseY = f.rotation.y; f.rotation.y = f.userData.baseY + Math.sin(live.t * 3 + i) * .3; });
    for (const rec of Object.values(town.places)) for (const d of rec.site.doors){ const want = (doorOpen[rec.id] || 0) > live.t ? -1.35 : 0; d.rotation.y += (want - d.rotation.y) * Math.min(1, dt * 5); } }
  if (grassField && !inside) grassField.userData.update(E.controls.target, st);
  if (wild) wild.update(dt, clock, weatherNow());
  if (wild && creature && !inside){ occT -= dt; if (occT < 0){ occT = .2; wild.occlude(E.camera.position, creature.root.position); } }
  if (stock && S.world){ stock.tick(dt); stockT -= dt; if (stockT < 0){ stockT = .5; const h = run.current && run.current.haul && live.phase === "walk" ? run.current : null;
    stock.update(h ? { ...S.world.inv, [h.haulKey]: Math.max(0, (S.world.inv[h.haulKey] || 0) - (h.haulN || 0)) } : S.world.inv); } }
  if (creature) creature.setCarry(live.phase === "walk" && run.current && run.current.haul ? run.current.haul : null);
  if (animals) animals.update(dt, live.t, { dark: st.dark, creaturePos: inside ? new THREE.Vector3(9999, 0, 9999) : live.pos });
  if (interiors) interiors.update(dt, { dark: st.dark, warm: st.warm, activeRoom: live.room, anim: creature ? creature.anim : null, clock, fireUntil: S.world ? S.world.fireplace : {}, doorOpen: roomDoorOpen, puzzles: S.world ? S.world.puzzles : {} });
  if (creature){
    const a = run.current, acting = live.phase === "act";
    creature.ctx.speed = live.phase === "walk" ? WALK : (acting && a && a.anim === "jog") ? 3.2 : 0;
    // step rate follows the actual ground speed (body moves faster at 2×/3×), so feet never skate
    creature.ctx.phase += dt * 7.2 * Math.min(run.speed, 3) * (creature.ctx.speed > 0 ? (creature.ctx.speed > 2 ? 1.6 : 1) : 0);
    creature.ctx.rain = !inside && (st.wet > .3) && !(a && ["splash_puddles", "swim"].includes(a.anim));
    creature.update(dt, live.t);
    creature.root.position.copy(live.pos);
    creature.root.rotation.y = lerpAngle(creature.root.rotation.y, live.yaw, 1 - Math.pow(live.phase === "walk" ? .02 : .004, dt));
    if (acting && a) activityFX(a, dt, inside ? interiors.fx : fx);
  }
  // camera: inside a room we film the dollhouse; outside we follow
  const wantInside = inside && (E.cam.mode === "follow" || E.cam.mode === "cinematic");
  if (wantInside && E.activeScene !== interiors.scene){ E.setActiveScene(interiors.scene); const room = interiors.rooms[live.room]; E.controls.target.copy(room.center); E.camera.position.copy(room.origin).add(new THREE.Vector3(1, 8, 13)); E.cam.tween = null; }
  if (!wantInside && E.activeScene !== E.scene){ E.setActiveScene(null); const d = creature ? (live.room ? town.places[live.room].door : live.pos) : new THREE.Vector3(); E.controls.target.copy(d); E.camera.position.copy(d).add(new THREE.Vector3(8, 6, 12)); }
  const camFocus = !creature ? null : wantInside ? creature.root.position.clone().add(new THREE.Vector3(0, .6, 0)).lerp(interiors.rooms[live.room].center, .55) : inside ? focusOut.clone().add(new THREE.Vector3(0, 1.5, 0)) : creature.root.position.clone().add(new THREE.Vector3(0, .8, 0));
  E.updateCamera(dt, camFocus, live.t);
  if (run.playing){ const d = E.camera.position.distanceTo(creature ? creature.root.position : live.pos); Music.setMasterLevel(run.music ? (run.settings.volume ?? .8) * clamp(1.15 - d / 70, .12, 1) : 0); UI.updateNowPlaying(run.playing); }
  E.look.warm = st.warm || 0; E.look.night = st.dark || 0;
  E.render(E.activeScene === E.scene ? st.glow : .3);
  UI.positionOverlay(E, creature, live, run, town, st.dark, E.activeScene !== E.scene);
  requestAnimationFrame(frame);
}
function lerpAngle(a, b, t){ const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
const fwd = (yaw, d) => new THREE.Vector3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
function activityFX(a, dt, F){
  const c = creature.ctx, head = creature.headWorld().add(new THREE.Vector3(0, .5, 0)), front = live.pos.clone().add(fwd(live.yaw, .8)).setY(live.pos.y + .6);
  const anim = creature.anim;
  if (a.sleep && Math.random() < dt * 1.1) F.z(head);
  if (a.anim === "build" && c.chopHit){ c.chopHit = false; }
  if (c.chopHit){ c.chopHit = false; for (let i = 0; i < 5; i++) F.spawn(F.tex.puff, front.clone().add(new THREE.Vector3((Math.random() - .5) * .3, .3, (Math.random() - .5) * .3)), { vel: new THREE.Vector3((Math.random() - .5) * 2, 1.5 + Math.random(), (Math.random() - .5) * 2), life: .6, size: .12, color: anim === "smith" ? 0xffa040 : 0xc9a06a, additive: anim === "smith" }); }
  if (c.throwNow && a.anim === "skip_stones"){ c.throwNow = false; [3, 5.5, 8, 10].forEach((d, i) => setTimeout(() => F.spawn(F.tex.puff, live.pos.clone().add(fwd(live.yaw, d)).setY(-.5), { vel: new THREE.Vector3(0, .6, 0), life: .6, size: .5, grow: 1, color: 0xdfefff, opacity: .8 }), 350 + i * 260)); }
  if (c.throwNow && a.anim === "play_fetch"){ c.throwNow = false; const an = animals.find(a.animal); if (an){ const to = live.pos.clone().add(fwd(live.yaw, 8)); animals.fetchThrow(an, live.pos, to); setTimeout(() => animals.fetchReturn(an, live.pos.clone().add(fwd(live.yaw, 1.2))), 3200); } }
  if (c.scatterNow){ c.scatterNow = false; for (let i = 0; i < 8; i++) F.spawn(F.tex.puff, front.clone(), { vel: new THREE.Vector3((Math.random() - .5) * 2 + Math.sin(live.yaw) * 1.5, .8, (Math.random() - .5) * 2 + Math.cos(live.yaw) * 1.5), life: .7, size: .06, color: 0xe8d090 }); }
  if (c.flashNow){ c.flashNow = false; F.spawn(F.tex.spark, head.clone().add(fwd(live.yaw, .3)), { vel: new THREE.Vector3(), life: .25, size: 1.2, additive: true }); }
  if (anim === "splash_puddles" && c.landNow){ c.landNow = false; for (let i = 0; i < 6; i++) F.spawn(F.tex.puff, live.pos.clone().add(new THREE.Vector3(0, .05, 0)), { vel: new THREE.Vector3((Math.random() - .5) * 3, 1.2, (Math.random() - .5) * 3), life: .5, size: .15, color: 0xbfdcff }); }
  if ((anim === "wash_dishes" || anim === "bathe") && Math.random() < dt * 4) F.spawn(F.tex.puff, front.clone().add(new THREE.Vector3(0, -.1, 0)), { vel: new THREE.Vector3((Math.random() - .5) * .3, .5, 0), life: 1.4, size: .14, color: 0xffffff, opacity: .8 });
  const extra = { paint: "spark", dance: "heart", celebrate: "spark", think: "think", pet: "heart", befriend: "heart" }[anim];
  if (extra && Math.random() < dt * .7) F[extra](head);
  if (anim === "sing" && Math.random() < dt) F.note(head);
  if (a.anim === "build" && Math.random() < dt * 1.2) F.spawn(F.tex.puff, front.clone().add(new THREE.Vector3(0, .4, 0)), { vel: new THREE.Vector3(0, .6, 0), life: .8, size: .3, grow: .6, color: 0xd8c8a8, opacity: .5 });
}

let uiTimer = 0, toonTimer = 0, stockT = 0, occT = 0;
function simTick(){
  const now = performance.now(), dt = Math.min(.25, (now - simLast) / 1000); simLast = now;
  if (S.self && run.running) advance(dt);
  uiTimer += dt; if (uiTimer > 1){ uiTimer = 0; UI.renderHeader(); if (run.running) UI.renderNeeds(); }
  toonTimer += dt; if (toonTimer > 4 && E){ toonTimer = 0; toonify(E.scene); if (interiors) toonify(interiors.scene); }
}

// ---------- moving between places ----------
function obstaclesNear(a, b){
  const minX = Math.min(a.x, b.x) - 4, maxX = Math.max(a.x, b.x) + 4, minZ = Math.min(a.z, b.z) - 4, maxZ = Math.max(a.z, b.z) + 4, out = [];
  for (const t of wild.standing()) if (t.x > minX && t.x < maxX && t.z > minZ && t.z < maxZ) out.push({ x: t.x, z: t.z, r: 1.1 });
  for (const r of Object.values(town.places)){ if (siteProgress(r.id) < 0) continue; const f = r.footprint; if (f.x + f.r > minX && f.x - f.r < maxX && f.z + f.r > minZ && f.z - f.r < maxZ) out.push({ x: f.x, z: f.z, r: f.r * .82 }); }
  return out;
}
function planPath(from, to){
  let pts = [{ x: from.x, z: from.z }, { x: to.x, z: to.z }];
  for (let iter = 0; iter < 24; iter++){
    let hit = null;
    for (let i = 0; i < pts.length - 1 && !hit; i++){
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
      for (const o of obstaclesNear(a, b)){
        if (Math.hypot(o.x - a.x, o.z - a.z) < o.r || Math.hypot(o.x - b.x, o.z - b.z) < o.r) continue;
        const t = clamp(((o.x - a.x) * dx + (o.z - a.z) * dz) / L2, 0, 1), px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(o.x - px, o.z - pz);
        if (d < o.r){ hit = { i, o, px, pz, d }; break; }
      }
    }
    if (!hit) break;
    const { o, px, pz, i } = hit; let nx = px - o.x, nz = pz - o.z, L = Math.hypot(nx, nz);
    if (L < .01){ const a = pts[i], b = pts[i + 1]; nx = -(b.z - a.z); nz = b.x - a.x; L = Math.hypot(nx, nz) || 1; }
    pts.splice(i + 1, 0, { x: o.x + nx / L * (o.r + .9), z: o.z + nz / L * (o.r + .9) });
  }
  return pts.slice(1).map(p => new THREE.Vector3(p.x, heightAt(p.x, p.z), p.z));
}
function moveCreatureTo(scene, pos){ if (creature.root.parent !== scene){ creature.root.parent && creature.root.parent.remove(creature.root); scene.add(creature.root); } live.pos.copy(pos); }
// steps: walk (outside or in a room), enter a room, leave a room, pause
function stepsTo(target){
  const steps = [];
  if (live.room && (!target.room || target.room !== live.room)){ const room = interiors.rooms[live.room]; steps.push({ type: "walk", pts: [room.entry.clone()] }, { type: "exit", room: live.room }); }
  if (target.room){
    if (live.room !== target.room){ const rec = town.places[target.room]; steps.push({ type: "walkOut", to: rec.door.clone() }, { type: "enter", room: target.room }); }
    steps.push({ type: "walk", pts: [target.point.clone()] });
  } else steps.push({ type: "walkOut", to: target.point.clone() });
  return steps;
}
function runStep(dt){
  const step = live.steps[0]; if (!step) return true;
  if (step.type === "walkOut"){ step.type = "walk"; step.pts = planPath(live.pos, step.to); step.pts[step.pts.length - 1].y = step.to.y; }
  if (step.type === "walk"){
    live.phase = "walk";
    let left = WALK * dt * Math.min(run.speed, 3);
    while (left > 0 && step.pts.length){
      const t = step.pts[0], dx = t.x - live.pos.x, dz = t.z - live.pos.z, d = Math.hypot(dx, dz);
      if (d > .02) live.yaw = Math.atan2(dx, dz);
      if (d <= left){ live.pos.copy(t); step.pts.shift(); left -= d; }
      else { live.pos.x += dx / d * left; live.pos.z += dz / d * left; live.pos.y = live.room ? 0 : (step.pts.length === 1 ? THREE.MathUtils.lerp(live.pos.y, t.y, .15) : heightAt(live.pos.x, live.pos.z)); left = 0; }
    }
    if (!step.pts.length) live.steps.shift();
    return false;
  }
  if (step.type === "enter" || step.type === "exit"){
    if (!step.t){ step.t = 0; doorOpen[step.room] = live.t + 2.2; roomDoorOpen[step.room] = true; }
    step.t += dt; live.phase = "walk";
    if (step.t > .7 && !step.done){ step.done = true; const room = interiors.rooms[step.room], rec = town.places[step.room];
      if (step.type === "enter"){ moveCreatureTo(interiors.scene, room.entry.clone()); live.room = step.room; live.yaw = Math.PI / 2; }
      else { moveCreatureTo(E.scene, rec.door.clone()); live.room = null; live.yaw = rec.rot; }
      setTimeout(() => { roomDoorOpen[step.room] = false; }, 1400); }
    if (step.t > 1.1) live.steps.shift();
    return false;
  }
  live.steps.shift(); return false;
}

// ---------- life ----------
function decay(mins, sleeping){ const n = S.state.needs; for (const k of Brain.NEEDS){ let r = DECAY[k]; if (sleeping) r = k === "fullness" ? .02 : 0; n[k] = clamp(n[k] - r * mins, 0, 100); } }
function advance(dt){
  const st = S.state, sp = run.speed;
  if (live.steps.length){ st.clock += dt * sp; decay(dt * sp, false); if (runStep(dt) && !live.steps.length) arrive(); else if (!live.steps.length) arrive(); return; }
  if (live.phase === "act" && run.current){
    const a = run.current, rate = a.sleep ? SLEEP_SPEED * sp : sp, mins = Math.min(dt * rate, Math.max(0, a.minutes - live.elapsed));
    live.elapsed += dt * rate; st.clock += mins; decay(mins, a.sleep);
    const q = a.sleep ? (a.sleepQ || .7) : 1;
    for (const k of Brain.NEEDS) st.needs[k] = clamp(st.needs[k] + (a.effects[k] || 0) * q * mins / a.minutes, 0, 100);
    duringActivity(a, mins, dt);
    const musicBusy = run.playing && run.playing.actionId === a.id && (performance.now() - run.playing.started) / 1000 < (run.playing.seconds || 60) + 15;
    if (live.elapsed >= a.minutes && !musicBusy) finishAction();
    return;
  }
  if (live.phase === "idle" && !run.thinking) nextAction();
}
function nextAction(){
  if (!run.running) return;
  if (!run.queue.length){ if (!run.thinking) think(); return; }
  let a = run.queue.shift(); a.id = Math.random().toString(36).slice(2);
  if (!a.haul) a = resolve(a);
  run.current = a; a.target = targetFor(a);
  S.state.action = { place: a.place, doing: a.doing, anim: a.anim, sleep: a.sleep, minutes: a.minutes, thought: a.thought };
  S.state.thought = a.thought;
  creature.setAnim("idle");
  live.steps = stepsTo(a.target); live.elapsed = 0; live.phase = live.steps.length ? "walk" : "act";
  if (!live.steps.length) arrive();
  appendEntry({ m: Math.round(S.state.clock), kind: "act", place: a.place, text: a.doing, thought: a.thought, note: a.note });
  save(); UI.renderNow();
  if (!run.queue.length) think();
}

// make an action possible, or swap it for the step that gets it closer
function resolve(a, depth = 0){
  const inv = S.world.inv, tools = S.world.tools, notes = a.note && depth ? [a.note] : [];
  const anim0 = a.anim;
  const swap = (anim, extra = {}, why) => { if (why) notes.push(why); return { ...a, anim, ...extra, doing: extra.doing || a.doing, sleep: anim === "sleep" }; };
  const hasTool = t => tools.includes(t) || (t === "axe" && tools.includes("iron_axe"));
  const gatherFor = (miss, depth = 0) => {
    const k = Object.keys(miss)[0]; const act = SOURCE[k] || "forage";
    if (act === "chop_tree" && !hasTool("axe")){ if (hasAll(inv, ITEMS.axe.need)) return { anim: "craft", item: "axe", place: "camp", doing: "making a stone axe" }; return depth < 3 ? gatherFor(missing(inv, ITEMS.axe.need), depth + 1) : { anim: "gather_sticks", place: "camp", doing: "gathering fallen branches" }; }
    const proc = PROCESS[act];
    if (proc){ const stn = findStation(proc.station);
      if (!stn){ const kind = proc.station === "loom" ? null : proc.station; if (kind){ const plan = S.self.town.places.find(p => p.kind === kind); return { anim: "build", place: plan ? plan.id : "camp", plan: plan ? null : { kind, name: kind[0].toUpperCase() + kind.slice(1), near: "camp" }, doing: `building a ${kind}` }; }
        return { anim: "craft", item: "loom", place: "camp", doing: "making a loom" }; }
      const input = act === "fire_kiln" && k === "glass" ? PROCESS.fire_kiln.alt.input : proc.input;
      if (!hasAll(inv, input)) return depth < 3 ? gatherFor(missing(inv, input), depth + 1) : { anim: "gather_stones", place: "camp" };
      return { anim: act, place: stn.place, where: stn.inside ? "inside" : "outside", doing: ACTIVITIES[act].desc.split(" (")[0] };
    }
    return { anim: act, place: a.place, doing: ({ gather_stones: "collecting stones", dig_clay: "digging clay at the river", dig_sand: "digging sand at the river", gather_fiber: "cutting reeds for fibre", mine_ore: "chipping out iron ore", forage: "foraging for food", chop_tree: "chopping a tree" })[act] || a.doing };
  };
  let anim = a.anim;
  // tools
  if (anim === "chop_tree" && !hasTool("axe")){ const g = hasAll(inv, ITEMS.axe.need) ? { anim: "craft", item: "axe", place: a.place, doing: "making a stone axe first" } : gatherFor(missing(inv, ITEMS.axe.need)); a = swap(g.anim, g, "needs an axe first"); anim = a.anim; }
  if (anim === "fish" && !hasTool("fishing_rod")){ const g = hasAll(inv, ITEMS.fishing_rod.need) ? { anim: "craft", item: "fishing_rod", doing: "making a fishing rod" } : gatherFor(missing(inv, ITEMS.fishing_rod.need)); a = swap(g.anim, g, "needs a fishing rod"); anim = a.anim; }
  if (anim === "fly_kite" && !hasTool("kite")){ const g = hasAll(inv, ITEMS.kite.need) ? { anim: "craft", item: "kite", doing: "making a kite" } : { anim: "cloud_watch", doing: "watching the clouds instead" }; a = swap(g.anim, g, "needs a kite"); anim = a.anim; }
  if (ACTIVITIES[anim] && ACTIVITIES[anim].music && ACTIVITIES[anim].tool === "instrument" && !hasTool("instrument") && !a.reedFlute){ a = swap("play_flute", { reedFlute: true, doing: "playing a tune on its reed flute" }, "has no instrument yet, so played its little whittled reed flute"); anim = "play_flute"; }
  if (anim === "play_piano"){ const pst = findStation("piano"); if (!pst){ a = swap("play_flute", { reedFlute: true, doing: "playing a tune on its reed flute" }, "has no piano yet, so played its reed flute"); anim = "play_flute"; } else a = { ...a, place: pst.place, where: pst.inside ? "inside" : "outside" }; }
  // weather
  const w = weatherNow();
  if (["build_snowman", "catch_snowflakes"].includes(anim) && w !== "snow"){ a = swap("look_around", {}, "no snow today"); anim = a.anim; }
  if (anim === "splash_puddles" && !/rain/.test(w)){ a = swap("look_around", {}, "no puddles today"); anim = a.anim; }
  // food
  const food = EAT_ORDER.find(f => (inv[f] || 0) > 0);
  if (anim === "eat" && !food){ const g = gatherFor({ berries: 1 }); a = swap(g.anim, g, "nothing to eat, so went foraging"); anim = a.anim; }
  if (anim === "cook"){ const raw = RAW_FOODS.filter(f => (inv[f] || 0) > 0).reduce((s, f) => s + inv[f], 0);
    if (raw < 2){ const g = gatherFor({ berries: 2 }); a = swap(g.anim, g, "nothing to cook"); anim = a.anim; }
    else if (!findStation("stove")){ a = { ...a, where: "outside", place: "camp" }; if (!W.fireAt("camp") && (inv.log || 0) < 2){ const g = gatherFor({ log: 2 }); a = swap(g.anim, g, "needs firewood to cook"); anim = a.anim; } } }
  if (anim === "bake" && ((inv.grain || 0) < 2 || !findStation("oven"))){ a = swap((inv.grain || 0) < 2 ? "harvest" : "cook", {}, "can't bake yet"); anim = a.anim; }
  if (anim === "harvest" && !S.self.town.places.some(p => ["garden", "field"].includes(p.kind) && siteComplete(p.id))){ a = swap("forage", {}, "no garden yet, so foraged"); anim = "forage"; }
  if (anim === "collect_eggs" && !(animals && animals.list.some(x => x.species === "chicken"))){ a = swap("forage", {}, "no chickens"); anim = "forage"; }
  if ((anim === "make_campfire" || anim === "light_fireplace") && (inv.log || 0) < (anim === "make_campfire" ? 2 : 1)){ const g = gatherFor({ log: 2 }); a = swap(g.anim, g, "needs firewood"); anim = a.anim; }
  if ((anim === "roast_marshmallows" || (anim === "warm_up" && a.where !== "inside")) && !wild.nearestFire(live.pos.x, live.pos.z, S.state.clock)){ if ((inv.log || 0) >= 2) { a = swap("make_campfire", { place: "camp" }, "lit a fire first"); anim = a.anim; } else { const g = gatherFor({ log: 2 }); a = swap(g.anim, g, "needs a fire"); anim = a.anim; } }
  // processing
  if (PROCESS[anim]){ const proc = PROCESS[anim], stn = findStation(proc.station); const input = anim === "fire_kiln" && !hasAll(inv, proc.input) ? proc.alt.input : proc.input;
    if (!stn || !hasAll(inv, input)){ const g = gatherFor(stn ? missing(inv, input) : { [Object.keys(proc.output)[0]]: 1 }); a = swap(g.anim, g, stn ? `needed ${fmtNeed(missing(inv, input))}` : `has no ${proc.station} yet`); anim = a.anim; }
    else a = { ...a, place: stn.place, where: stn.inside ? "inside" : "outside" }; }
  // building
  if (anim === "build"){
    if (a.plan){ const p = addPlan(a.plan); a = { ...a, place: p.id, plan: null }; }
    const p = placeOf(a.place);
    if (!p || p.kind === "camp" || siteComplete(a.place)){ const next = S.self.town.places.find(q => q.kind !== "camp" && !siteComplete(q.id)); if (next) a = { ...a, place: next.id }; else { a = swap("look_around", {}, "nothing left to build"); anim = a.anim; } }
    if (a.anim === "build"){ const ss = siteState(a.place), stage = ss.def.stages[ss.stage];
      const trees = ss.stage === 0 && !ss.paid ? wild.treesIn(footprintTest(a.place)) : [];
      if (trees.length){ if (hasTool("axe")) a = swap("chop_tree", { tree: trees[0].id, doing: "clearing a tree off the building plot" }, "had to clear the plot first"); else { const g = hasAll(inv, ITEMS.axe.need) ? { anim: "craft", item: "axe", doing: "making an axe to clear the plot" } : gatherFor(missing(inv, ITEMS.axe.need)); a = swap(g.anim, g, "needs an axe to clear the plot"); } anim = a.anim; }
      else if (!ss.paid && !hasAll(inv, stage.need)){ const miss = missing(inv, stage.need); const g = gatherFor(miss); a = swap(g.anim, g, `the ${stage.label} needs ${fmtNeed(miss)} more`); anim = a.anim; }
      else { if (!ss.paid){ take(inv, stage.need); S.world.sites[a.place] = { stage: ss.stage, work: ss.work || 0, paid: true }; } a.buildAnim = stage.anim; a.stageLabel = stage.label; a.where = "outside"; } }
  }
  // crafting
  if (anim === "craft"){
    const item = a.item && ITEMS[a.item] ? a.item : null;
    if (a.crafting){ /* already paid for */ }
    else if (!item){ a = swap("build", {}, "nothing to craft"); }
    else { const it = ITEMS[item]; const stn = it.at === "hand" ? null : findStation(it.at);
    if (it.requires && !(Object.values(S.world.items).some(l => l.includes(it.requires)))){ a = swap("craft", { item: it.requires }, `needs a ${ITEMS[it.requires].label} first`); }
    if (it.at !== "hand" && !stn){ const g = gatherFor({ [it.at === "workbench" ? "plank" : it.at === "kiln" ? "brick" : it.at === "forge" ? "metal" : "cloth"]: 1 }); a = swap(g.anim, g, `needs a ${it.at} to make a ${it.label}`); anim = a.anim; }
    else if (!hasAll(inv, it.need)){ const miss = missing(inv, it.need); const g = gatherFor(miss); a = swap(g.anim, g, `a ${it.label} needs ${fmtNeed(miss)} more`); anim = a.anim; }
    else { take(inv, it.need); a.crafting = item; a.minutes = Math.max(a.minutes, Math.round(it.minutes * .6)); a.craftAt = stn;
      if (stn){ a.place = stn.place; a.where = stn.inside ? "inside" : "outside"; }
      if (it.goes === "room" && !a.for){ const home = bestHome(); a.for = home ? home.id : "camp"; } } }
  }
  // sleeping: the best shelter
  if (a.anim === "sleep"){ const s = W.shelters()[0] || { id: "camp", q: .6 }; a.place = s.id; a.sleepQ = s.q; const p = placeOf(s.id); a.sleep = true;
    a.where = p && hasRoom(p.kind) && interiors && interiors.rooms[s.id] ? "inside" : "outside";
    if (a.where === "inside"){ const room = interiors.rooms[s.id]; const bed = (room.stations.bed || [])[0]; const fl = (room.stations.floor || [])[0]; a.station = bed ? { ...bed, type: "bed" } : { ...fl, lie: true, type: "floor-bed", pos: fl.pos.clone().setY(.12) }; } }
  // indoor activities need a finished room with the right furniture
  const def = ACTIVITIES[a.anim] || {};
  if ((a.where === "inside" || def.where === "inside") && !a.sleep){
    const room = roomFor(a.anim, a.place);
    if (room) a = { ...a, place: room.id, where: "inside", station: room.station };
    else if (def.where === "inside"){ const alt = { watch_tv: "cloud_watch", play_videogames: "play_ball", use_computer: "write", browse_books: "read", bake: "cook", make_coffee: "drink", wash_dishes: "sweep", bathe: "swim", groom: "stretch", puzzle: "think", board_game: "think", listen_records: "sing", light_fireplace: "make_campfire", look_out_window: "look_around", pottery: "craft", grind_flour: "harvest", telescope: "stargaze", play_piano: "sing" }[a.anim] || "look_around";
      a = swap(alt === "craft" ? "look_around" : alt, { where: "outside" }, `couldn't ${a.anim.replace(/_/g, " ")} (nowhere to do it yet)`); }
    else a = { ...a, where: "outside" };
  }
  if (a.where === "outside" && ["sit", "read", "write", "knit", "nap", "eat", "drink"].includes(a.anim)){ const os = outdoorStation(ACTIVITIES[a.anim].stations ? ACTIVITIES[a.anim].stations[0] : ""); if (os && Math.random() < .7) a = { ...a, outStation: os, place: os.pid }; }
  if (a.where === "outside" && a.anim === "weave"){ const os = outdoorStation("loom"); if (os) a.outStation = os; }
  // animals
  if (ACTIVITIES[a.anim] && ["pet_animal", "feed_animals", "play_fetch", "brush_animal", "befriend"].includes(a.anim)){
    const an = animals && animals.find(a.animal || (a.anim === "befriend" ? "deer" : a.anim === "play_fetch" ? "dog" : "cat"));
    if (!an){ a = swap("look_around", {}, "couldn't find that animal"); }
    else { a.animalRef = an; a.where = "outside"; if (a.nameAnimal && !an.name){ an.name = a.nameAnimal; (S.world.animals[an.id] = S.world.animals[an.id] || {}).name = a.nameAnimal; notes.push(`named the ${an.species} ${a.nameAnimal}`); } }
  }
  if (notes.length) a.note = [...new Set(notes.join("; ").split("; "))].join("; ");
  if (a.anim !== anim0 && depth < 5) return resolve(a, depth + 1);
  return a;
}
function bestHome(){ const homes = S.self.town.places.filter(p => hasRoom(p.kind) && siteComplete(p.id)); const order = ["house", "cottage", "townhouse", "tower"]; return homes.sort((x, y) => (order.indexOf(x.kind) + 1 || 9) - (order.indexOf(y.kind) + 1 || 9))[0] || null; }
function roomFor(anim, preferId){
  if (!interiors) return null;
  const def = ACTIVITIES[anim] || {}, types = def.stations || ["floor"];
  const tryRoom = id => { const room = interiors.rooms[id]; if (!room) return null; for (const t of types){ if (room.stations[t] && room.stations[t].length) return { id, station: { ...room.stations[t][0], type: t } }; } return null; };
  return tryRoom(preferId) || Object.keys(interiors.rooms).map(tryRoom).find(Boolean) || null;
}
function addPlan(plan){
  const places = S.self.town.places;
  const existing = places.find(p => p.kind === plan.kind && !siteComplete(p.id)); if (existing) return existing;
  let id = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || plan.kind; while (places.some(p => p.id === id)) id += "-2";
  const host = placeOf(plan.near) || placeOf("camp");
  const p = { id, name: plan.name, kind: plan.kind, wall: host.wall || "#efe3c8", roof: host.roof || "#a65a48", near: host.id, about: plan.about || STRUCTURES[plan.kind].desc, activities: [], planned: true };
  places.push(p);
  layoutPlaces(places, places.length - 1, S.self.town.river !== false, campSpot(S.self.town.river !== false));
  town.addPlace(p); town.setProgress(p.id, -1);
  UI.buildLabels(town, places);
  appendEntry({ m: Math.round(S.state.clock), kind: "made", place: p.id, text: `planned a new ${p.kind}: "${p.name}"` });
  return p;
}

// where exactly the creature goes and faces for an action
function targetFor(a){
  const rec = town.places[a.place] || town.places.camp;
  const out = (point, face) => ({ point, face: face ?? rec.rot });
  const near = (r0 = 3, r1 = 9) => { for (let i = 0; i < 20; i++){ const ang = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0), x = rec.spot.x + Math.cos(ang) * r, z = rec.spot.z + Math.sin(ang) * r;
      if (!town.blocked(x, z) && !wild.blockedByTree(x, z, 1.4)) return new THREE.Vector3(x, heightAt(x, z), z); } return rec.spot.clone(); };
  const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  if (a.where === "inside" && a.station && interiors.rooms[a.place]){ const s = a.station; return { room: a.place, point: s.pos.clone(), face: s.yaw, station: s }; }
  if (a.haul && stock){ const p = stock.spot(a.haulKey).clone().add(new THREE.Vector3(0, 0, -1.3)); p.y = heightAt(p.x, p.z); return out(p, 0); }
  if (a.sleep){ if (rec.bed) return out(rec.bed.clone(), rec.rot); return out(rec.spot.clone(), rec.rot); }
  if (a.outStation){ return { point: a.outStation.pos.clone(), face: a.outStation.yaw, station: a.outStation }; }
  const bank = () => { const x = clamp(rec.spot.x, -150, 150), z = riverZ(x) - 8.4; return new THREE.Vector3(x, heightAt(x, z), z); };
  const water = () => { const pond = S.self.town.places.find(p => p.kind === "pond" && siteComplete(p.id)); if (pond && Math.random() < .5) return out(town.places[pond.id].spot.clone(), town.places[pond.id].rot + Math.PI);
    const dock = S.self.town.places.find(p => p.kind === "dock" && siteComplete(p.id)); if (dock && a.anim === "fish") return out(town.places[dock.id].spot.clone(), 0);
    const b = bank(); return out(b, 0); };
  switch (a.anim){
    case "play_piano": if (rec.piano) return out(rec.spot.clone(), rec.rot + Math.PI); break;
    case "chop_tree": { const t = (a.tree && wild.trees.find(x => x.id === a.tree && x.obj)) || wild.nearestTree(rec.spot.x, rec.spot.z, (x, z) => S.self.town.places.some(p => !siteComplete(p.id) && footprintTest(p.id)(x, z))); if (!t) return out(near());
      a.treeRef = t; const dir = Math.atan2(rec.spot.x - t.x, rec.spot.z - t.z); const p = new THREE.Vector3(t.x + Math.sin(dir) * 1.3, 0, t.z + Math.cos(dir) * 1.3); p.y = heightAt(p.x, p.z); return out(p, dir + Math.PI); }
    case "gather_stones": { const c = wild.nearestStones(live.pos.x, live.pos.z); if (c){ a.cluster = c; const p = new THREE.Vector3(c.x + .9, 0, c.z + .9); p.y = heightAt(p.x, p.z); return out(p, facing(p, c)); } }
    // falls through to the big rocks if every loose stone has been taken
    case "mine_ore": { const r = a.anim === "mine_ore" ? wild.nearestRock(rec.spot.x, rec.spot.z, true) : wild.nearestRock(rec.spot.x, rec.spot.z);
      if (!r) return out(near()); if (r.lumps) a.cluster = { lumps: r.lumps }; const dir = Math.atan2(rec.spot.x - r.x, rec.spot.z - r.z); const p = new THREE.Vector3(r.x + Math.sin(dir) * 2.4, 0, r.z + Math.cos(dir) * 2.4); p.y = heightAt(p.x, p.z); return out(p, dir + Math.PI); }
    case "gather_fiber": { const r = wild.nearestReeds(rec.spot.x, rec.spot.z); if (!r) return out(near()); a.cluster = { objs: r.objs || [] }; const p = new THREE.Vector3(r.x, 0, r.z - Math.sign(r.z - riverZ(r.x)) * 1.2); p.y = heightAt(p.x, p.z); return out(p, facing(p, r)); }
    case "forage": { const b = wild.nearestBush(rec.spot.x, rec.spot.z, S.state.clock); if (!b) return out(near()); a.bushRef = b; const dir = Math.atan2(rec.spot.x - b.x, rec.spot.z - b.z); const p = new THREE.Vector3(b.x + Math.sin(dir) * 1.2, 0, b.z + Math.cos(dir) * 1.2); p.y = heightAt(p.x, p.z); return out(p, dir + Math.PI); }
    case "dig_clay": case "dig_sand": { const sp = a.anim === "dig_clay" ? wild.nearestClay(rec.spot.x, rec.spot.z) : wild.nearestSand(rec.spot.x, rec.spot.z); if (sp){ a.digSpot = sp; const p = new THREE.Vector3(sp.x, 0, sp.z - 1.6); p.y = heightAt(p.x, p.z); return out(p, facing(p, sp)); } const b = bank(); return out(b, 0); }
    case "skip_stones": { const b = bank(); return out(b, 0); }
    case "gather_sticks": { const c = wild.nearestSticks(live.pos.x, live.pos.z); if (c){ a.cluster = c; const p = new THREE.Vector3(c.x + .8, 0, c.z - .8); p.y = heightAt(p.x, p.z); return out(p, facing(p, c)); } return out(near(), 0); }
    case "fish": return water();
    case "swim": { const x = clamp(rec.spot.x, -150, 150), p = new THREE.Vector3(x, -.95, riverZ(x)); return out(p, Math.PI / 2); }
    case "build": { const f = rec.footprint, side = Math.random() < .5 ? 1 : -1; const loc = town.toWorld(placeOf(a.place), side * (f.w / 2 + 1.4), f.d / 2 + 1.6); const p = new THREE.Vector3(loc.x, heightAt(loc.x, loc.z), loc.z); return out(p, facing(p, rec.pos)); }
    case "make_campfire": case "roast_marshmallows": case "warm_up": case "cook": {
      const fireSpot = rec.fire ? rec.fire.clone() : (town.places.camp.fire ? town.places.camp.fire.clone() : rec.spot.clone().add(fwd(rec.rot, 2)));
      if (a.anim !== "make_campfire"){ const f = wild.nearestFire(live.pos.x, live.pos.z, S.state.clock); if (f) fireSpot.set(f.x, heightAt(f.x, f.z), f.z); }
      a.fireSpot = fireSpot; const ang = Math.random() * Math.PI * 2; const p = fireSpot.clone().add(new THREE.Vector3(Math.cos(ang) * 1.7, 0, Math.sin(ang) * 1.7)); p.y = heightAt(p.x, p.z); return out(p, facing(p, fireSpot)); }
    case "plant_tree": case "pick_flowers": case "feed_birds": case "jog": case "juggle": case "play_ball": case "jump_rope": case "cloud_watch": case "stargaze": case "sunbathe":
    case "build_snowman": case "catch_snowflakes": case "splash_puddles": case "fly_kite": case "birdwatch": case "photograph": case "sketch": case "look_around": case "stretch": case "yoga": case "exercise": case "meditate": case "dance": {
      const p = near(); return out(p, Math.random() * Math.PI * 2); }
    case "pet_animal": case "feed_animals": case "brush_animal": case "befriend": case "play_fetch": case "collect_eggs": {
      const an = a.animalRef || (animals && animals.find(a.anim === "collect_eggs" ? "chicken" : a.animal)); if (!an) return out(near());
      const p = an.pos.clone().add(new THREE.Vector3(1.6, 0, 1.6)); p.y = heightAt(p.x, p.z); a.animalRef = an; return out(p, facing(p, an.pos)); }
    case "saw_planks": case "craft": case "fire_kiln": case "smelt": {
      if (a.where === "inside" && interiors.rooms[a.place]){ const room = roomFor(a.anim, a.place); if (room) return { room: room.id, point: room.station.pos.clone(), face: room.station.yaw, station: room.station }; }
      return out(rec.spot.clone(), rec.rot + Math.PI); }
  }
  if (OUTDOOR_KINDS.includes(rec.kind)) return out(rec.spot.clone(), facing(rec.spot, rec.pos));
  return out(rec.spot.clone(), rec.rot);
}
function arrive(){
  const a = run.current; if (!a){ live.phase = "idle"; return; }
  live.placeId = a.place; S.state.place = a.place; S.state.room = live.room;
  live.phase = "act"; live.elapsed = 0;
  const tg = a.target; if (tg) live.yaw = tg.face;
  const station = tg && tg.station;
  let anim = a.anim === "build" ? (a.buildAnim || "build_wall") : animFor(a.anim);
  if (a.anim === "craft" && a.crafting === "axe") anim = "craft";
  if (a.reedFlute) anim = "play_reedflute";
  const noGround = !!(station && station.type !== "floor" && station.type !== "mat") || !!(station && station.own);
  creature.setAnim(anim, { noPiano: !!station, noStool: !!(station && station.seat), noGround, force: true });
  if (station && station.lie) live.pos.y = station.pos.y; else if (station && station.inTub) live.pos.y = station.pos.y;
  if (a.anim === "swim") live.pos.y = -.95;
  if (a.animalRef) animals.interact(a.animalRef, a.anim, live.pos, live.yaw);
  if (a.creation && a.creation.type === "drawing" && a.anim === "paint" && a.creation.svg) showOnEasel(String(a.creation.svg));
  if (a.anim === "make_campfire"){ take(S.world.inv, { log: 2 }); a.fireLit = false; }
  if (a.anim === "light_fireplace"){ take(S.world.inv, { log: 1 }); }
  if (a.anim === "puzzle") S.world.puzzles[a.place] = true;
  if (a.music || a.anim === "listen_records") startMusic(a);
  creature.setEmotion(emotionFor(S.state.mood, S.state.needs, a.anim));
  emote(EMOJI[a.anim] || (ACTIVITIES[a.anim] && ACTIVITIES[a.anim].music ? "🎵" : "🙂"));
  a.nextEmote = 9 + Math.random() * 8;
  UI.renderNow();
}
function emote(e){ if (!creature || !e) return; (live.room ? interiors.fx : fx).emote(creature.headWorld().add(new THREE.Vector3(0, .55, 0)), e); }
function duringActivity(a, mins, dt){
  a.nextEmote = (a.nextEmote || 10) - dt;
  if (a.nextEmote < 0){ a.nextEmote = 12 + Math.random() * 10; const e = creature.emotion; emote(Math.random() < .35 && EMO_EMOJI[e] ? EMO_EMOJI[e] : EMOJI[a.anim]); }
  if (a.anim === "build" && town.places[a.place]){
    const ss = S.world.sites[a.place] || { stage: 0, work: 0, paid: true }; ss.work = (ss.work || 0) + mins; S.world.sites[a.place] = ss;
    const def = STRUCTURES[placeOf(a.place).kind], stage = def.stages[ss.stage];
    town.setProgress(a.place, siteProgress(a.place));
    if (stage && ss.work >= stage.minutes){
      ss.stage++; ss.work = 0; ss.paid = false;
      appendEntry({ m: Math.round(S.state.clock), kind: "made", place: a.place, text: `finished the ${stage.label} of ${placeOf(a.place).name}` });
      if (ss.stage >= def.stages.length) completeSite(a.place);
      else town.setProgress(a.place, siteProgress(a.place));
      live.elapsed = a.minutes;            // this stage is done; think about what's next
    }
  }
  // picking up real things: one stone / branch / reed / ore lump / berry every few minutes, and holes where it digs
  if (["gather_stones", "gather_sticks", "gather_fiber", "mine_ore", "forage", "dig_clay", "dig_sand"].includes(a.anim)){
    a.pickT = (a.pickT || 0) + mins;
    const every = a.anim === "forage" ? 4 : a.anim.startsWith("dig") ? 7 : 6;
    while (a.pickT >= every){ a.pickT -= every;
      if (a.anim === "forage" && a.bushRef) wild.takeBerry(a.bushRef, S.state.clock);
      else if (a.digSpot) wild.dig(a.digSpot);
      else if (a.cluster){ const p = wild.takeOne(a.cluster, S.state.clock, live.pos); if (p) fx.spark(p.clone().add(new THREE.Vector3(0, .3, 0))); }
    }
  }
  if (a.anim === "chop_tree" && a.treeRef && !a.felled && live.elapsed > a.minutes * .8){ a.felled = true; wild.fell(a.treeRef, live.pos.x, live.pos.z); give(S.world.inv, { log: S.world.tools.includes("iron_axe") ? 5 : 4 }); }
  if (a.anim === "make_campfire" && !a.fireLit && live.elapsed > a.minutes * .6){ a.fireLit = true; const f = a.fireSpot || live.pos.clone().add(fwd(live.yaw, 1.7)); wild.light(f.x, f.z, S.state.clock, 300); }
  if (a.anim === "jog"){ const c = a.jogC || (a.jogC = live.pos.clone()); a.jogA = (a.jogA || 0) + dt * Math.min(run.speed, 3) * .45; const x = c.x + Math.cos(a.jogA) * 7, z = c.z + Math.sin(a.jogA) * 7; live.yaw = Math.atan2(x - live.pos.x, z - live.pos.z); live.pos.set(x, heightAt(x, z), z); }
  if (a.anim === "swim"){ const c = a.swimC || (a.swimC = live.pos.clone()); a.swimA = (a.swimA || 0) + dt * .25; live.pos.set(c.x + Math.cos(a.swimA) * 2.5, -.95 + Math.sin(live.t * 2) * .04, c.z + Math.sin(a.swimA) * 1.2); live.yaw = a.swimA + Math.PI / 2; }
}
function completeSite(id){
  town.setProgress(id, 1);
  if (grassField) setTimeout(() => grassField.userData.refreshMask(grassField.userData.blocked), 50); town.rebuildTrails(); track(E.scene.children.filter(o => o.name === "trails" && !worldObjs.includes(o)));
  const rec = town.places[id], p = placeOf(id);
  if (rec.room && interiors) interiors.addRoom({ id, wall: p.wall, items: S.world.items[id] || [] });
  refreshEmitters(); refreshOutdoorItems();
  for (let i = 0; i < 14; i++) setTimeout(() => fx.spark(rec.labelPos.clone().add(new THREE.Vector3((Math.random() - .5) * 6, -Math.random() * 4, (Math.random() - .5) * 6))), i * 120);
  UI.toast(`${S.self.creature.name} finished building ${p.name}!`); setTimeout(() => UI.toast(null), 5000);
  creature.setEmotion("joyful"); emote("🎉"); toonify(E.scene);
  appendEntry({ m: Math.round(S.state.clock), kind: "made", place: id, text: `finished building ${p.name}!` });
  UI.renderBuild(); save();
}
function finishAction(){
  const a = run.current; if (!a) return;
  applyOutcome(a);
  // carry what was gathered back to the camp stockpile when it was gathered far away
  if (!a.haul && a.gotKey && stock && !live.room && Math.hypot(live.pos.x - stock.center.x, live.pos.z - stock.center.z) > 12){
    const label = { log: "logs", stone: "stones", clay: "clay", sand: "sand", fiber: "reeds", ore: "ore", berries: "berries", fish: "fish", mushrooms: "mushrooms" }[a.gotKey] || a.gotKey;
    run.queue.unshift({ place: "camp", doing: `carrying the ${label} back to camp`, anim: a.gotKey === "log" ? "gather" : "lay_stones", minutes: 4, thought: "", haul: a.gotKey === "log" ? "logs" : "basket", haulKey: a.gotKey, haulN: a.gotN || 0, effects: {} });
  }
  if (a.creation) applyCreation(a.creation, a.place);
  if (a.animalRef) animals.release(a.animalRef);
  if (a.station && (a.station.lie || a.station.inTub)) live.pos.y = live.room ? 0 : heightAt(live.pos.x, live.pos.z);
  if (a.anim === "swim"){ live.pos.set(live.pos.x, 0, riverZ(live.pos.x) - 8.4); live.pos.y = heightAt(live.pos.x, live.pos.z); }
  if (a.anim === "puzzle") S.world.puzzles[a.place] = true;
  run.current = null; S.state.action = null; live.phase = "idle"; creature.setAnim("idle");
  UI.renderNow(); UI.renderBuild();
  nextAction();
}
function applyOutcome(a){
  const inv = S.world.inv, n = (per) => Math.max(1, Math.round(a.minutes / per));
  const g = GATHER[a.anim];
  if (g && a.anim !== "chop_tree"){
    if (a.anim === "fish" && Math.random() > (g.chance || 1)){ a.result = "caught nothing"; }
    else { const got = {}; for (const [k, v] of Object.entries(g.yields)) got[k] = v * n(g.per); give(inv, got); a.result = "got " + fmtNeed(got); a.gotKey = Object.keys(got)[0]; a.gotN = got[a.gotKey]; }
    if (a.bushRef) wild.pickBush(a.bushRef, S.state.clock);
  }
  if (a.anim === "chop_tree" && a.felled){ a.gotKey = "log"; a.gotN = S.world.tools.includes("iron_axe") ? 5 : 4; }
  const proc = PROCESS[a.anim];
  if (proc){ let input = proc.input, output = proc.output; if (a.anim === "fire_kiln" && !hasAll(inv, proc.input) && hasAll(inv, proc.alt.input)){ input = proc.alt.input; output = proc.alt.output; }
    const batches = Math.max(1, Math.min(Math.floor(a.minutes * proc.perMin) || 1, ...Object.entries(input).map(([k, v]) => Math.floor((inv[k] || 0) / v))));
    if (batches > 0 && hasAll(inv, input)){ for (let i = 0; i < batches; i++){ take(inv, input); give(inv, output); } a.result = "made " + fmtNeed(Object.fromEntries(Object.entries(output).map(([k, v]) => [k, v * batches]))); } }
  if (a.crafting){ const it = ITEMS[a.crafting];
    if (it.goes === "tool"){ if (!S.world.tools.includes(a.crafting)) S.world.tools.push(a.crafting); }
    else { const pid = a.for || "camp"; (S.world.items[pid] = S.world.items[pid] || []).push(a.crafting);
      if (interiors && interiors.rooms[pid]) interiors.refresh(pid, S.world.items[pid]); else refreshOutdoorItems(); }
    appendEntry({ m: Math.round(S.state.clock), kind: "made", place: a.place, text: `made a ${it.label}${it.goes === "room" ? ` for ${(placeOf(a.for || "camp") || {}).name || "camp"}` : ""}` }); }
  if (a.anim === "eat"){ const food = EAT_ORDER.find(f => (inv[f] || 0) > 0); if (food){ inv[food]--; S.state.needs.fullness = clamp(S.state.needs.fullness + FOOD_VALUE[food], 0, 100); a.result = "ate " + food; } }
  if (a.anim === "cook"){ let used = 0; for (const f of RAW_FOODS){ while ((inv[f] || 0) > 0 && used < 2){ inv[f]--; used++; } } if (used >= 2) give(inv, { meal: 1 }); }
  if (a.anim === "bake" && (inv.grain || 0) >= 2){ take(inv, { grain: 2 }); give(inv, { bread: 2 }); }
  if (a.anim === "grind_flour" && (inv.grain || 0) >= 2){ give(inv, { grain: 1 }); }
  if (a.anim === "light_fireplace") S.world.fireplace[a.place] = S.state.clock + 300;
  if (a.anim === "plant_tree"){ const p = live.pos.clone().add(fwd(live.yaw, .9)); wild.plant(p.x, p.z, S.state.clock); }
  if (a.anim === "build_snowman"){ const p = live.pos.clone().add(fwd(live.yaw, 1)); wild.snowman(p.x, p.z, S.state.clock); }
  if (a.anim === "pick_flowers") give(inv, { flowers: 1 });
  if (a.animalRef){ const an = a.animalRef, rec = S.world.animals[an.id] = S.world.animals[an.id] || {}; const gain = a.anim === "befriend" ? a.minutes / 4 : a.minutes / 8;
    an.friendship = clamp((an.friendship || 0) + gain, 0, 100); rec.friendship = an.friendship; if (an.name) rec.name = an.name;
    if (a.anim === "feed_animals"){ const f = ["grain", "berries", "vegetables"].find(k => (inv[k] || 0) > 0); if (f) inv[f]--; } }
  if (a.result) appendEntry({ m: Math.round(S.state.clock), kind: "made", place: a.place, text: `${a.doing}: ${a.result}`, quiet: true });
}

// ---------- music ----------
function resolvePiece(m){
  if (!m) return S.music.length ? S.music[Math.floor(Math.random() * S.music.length)] : null;
  if (m.replay) return S.music.find(x => x.id === m.replay) || null;
  const piece = { id: "m" + Date.now().toString(36), title: m.title, style: m.style, by: m.by, bpm: m.bpm, key: m.key, tracks: m.tracks, at: Math.round(S.state.clock), plays: 0 };
  const parsed = Music.parsePiece(piece); if (!parsed.tracks.length) return null;
  piece.seconds = Math.round(parsed.seconds); S.music.unshift(piece); UI.renderMusic(); return piece;
}
async function startMusic(a){
  const piece = resolvePiece(a.music); if (!piece) return;
  piece.plays = (piece.plays || 0) + 1; piece.lastPlayed = Math.round(S.state.clock);
  appendEntry({ m: Math.round(S.state.clock), kind: "music", place: a.place, text: piece.title + (piece.by && piece.by !== "me" ? " by " + piece.by : "") });
  if (!run.music){ save(); return; }
  run.playing = { actionId: a.id, piece, started: performance.now(), seconds: piece.seconds || 60 };
  UI.showNowPlaying(piece);
  try {
    // before it crafts real instruments, every piece is played solo on the homemade reed flute
    let playP = piece;
    if (a.reedFlute){ const lead = (piece.tracks || []).find(t => t.instrument !== "drums") || (piece.tracks || [])[0]; if (lead) playP = { ...piece, tracks: [{ ...lead, instrument: "flute", volume: .85 }] }; }
    await Music.playPiece(playP, {
      onNote: (ti, ev, inst) => { if (creature){ creature.hit(inst); if (Math.random() < .3) (live.room ? interiors.fx : fx).note(creature.headWorld().add(new THREE.Vector3(0, .4, 0))); } UI.noteHit(ti, ev); },
      onEnd: () => { if (run.playing && run.playing.piece === piece){ run.playing = null; UI.hideNowPlaying(); } },
    });
    if (run.playing && run.playing.piece === piece) run.playing.started = performance.now();
  } catch(e){ console.warn("music failed", e); run.playing = null; UI.hideNowPlaying(); }
  save();
}
function stopMusic(){ Music.stopPiece(true); run.playing = null; UI.hideNowPlaying(); }
async function playLibrary(id){
  const piece = S.music.find(m => m.id === id); if (!piece) return;
  run.playing = { actionId: "viewer", piece, started: performance.now(), seconds: piece.seconds || 60 };
  UI.showNowPlaying(piece);
  await Music.playPiece(piece, { onNote: (ti, ev) => UI.noteHit(ti, ev), onEnd: () => { if (run.playing && run.playing.piece === piece){ run.playing = null; UI.hideNowPlaying(); } } });
}

// ---------- thinking ----------
async function think(){
  if (run.thinking || !S.self) return;
  if (!run.settings.hasKey){ pause(); openSetup("Add your API key so the creature can think."); return; }
  run.thinking = true; UI.renderNow();
  const cur = run.current; let at = S.state.clock; const needs = { ...S.state.needs };
  if (cur){ const left = Math.max(0, cur.minutes - (live.phase === "act" ? live.elapsed : 0)); at += left;
    for (const k of Brain.NEEDS) needs[k] = clamp(needs[k] + (cur.effects[k] || 0) * left / cur.minutes - (cur.sleep ? 0 : DECAY[k] * left), 0, 100); }
  const startAt = Math.round(S.state.clock);
  const w = S.state.weather || { today: "clear", tomorrow: "clear" };
  let prompt;
  try { prompt = Brain.buildPlanPrompt(S, { current: cur, planStart: at, planNeeds: needs, weather: w.today, tomorrow: w.tomorrow }, W); }
  catch(e){ console.error("prompt failed", e); run.thinking = false; return thinkFailed({ code: "error", message: String(e.message || e) }); }
  const res = await life.think({ prompt, maxTokens: 9000 });
  run.thinking = false;
  if (!res.ok) return thinkFailed(res);
  countSpend(res);
  const plan = Brain.validatePlan(Brain.parseJSON(res.text), S);
  if (!plan) return thinkFailed({ code: "bad_reply", message: "The reply wasn't readable." });
  run.error = null; UI.toast(null);
  run.queue.push(...plan.actions);
  if (plan.memory) S.state.memory = plan.memory; if (plan.mood) S.state.mood = plan.mood; if (plan.thought) S.state.thought = plan.thought;
  if (creature){ const e = emotionFor(S.state.mood, S.state.needs, run.current && run.current.anim); creature.setEmotion(e); if (EMO_EMOJI[e]) setTimeout(() => emote(EMO_EMOJI[e]), 600); }
  S.state.chunks = (S.state.chunks || 0) + 1;
  if (plan.diary) appendEntry({ m: startAt, kind: "diary", text: plan.diary });
  save(); UI.renderNow();
  if (run.running && live.phase === "idle" && !live.steps.length) nextAction();
}
let retryTimer = null;
function thinkFailed(res){
  const name = S.self.creature.name;
  const msg = { no_key: "Add your API key in Settings so " + name + " can think.", auth: "Anthropic didn't accept the API key. Check it in Settings.",
    rate_limited: name + " is thinking too fast for your API limits. Trying again in a minute.", overloaded: "Claude is busy right now. Trying again in a minute.",
    network: "Can't reach the AI service. Check your internet. Trying again in a minute.", timeout: "The AI service took too long to answer. Trying again in a minute.", bad_request: "Claude refused the request: " + (res.message || ""), bad_reply: name + " lost their train of thought. Trying again shortly." }[res.code] || ("Something went wrong: " + (res.message || res.code));
  run.error = msg; const retry = ["rate_limited", "overloaded", "network", "timeout", "bad_reply", "error", "busy"].includes(res.code);
  UI.toast(msg, retry ? null : { label: "Settings", fn: () => openSetup() });
  if (retry){ clearTimeout(retryTimer); retryTimer = setTimeout(() => { if (run.running && !run.queue.length) think(); }, res.code === "bad_reply" ? 8000 : 60000); }
  else pause();
  UI.renderNow();
}
function countSpend(res){
  const u = res.usage || {}; const inT = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), outT = u.output_tokens || 0;
  S.spend.inTok += inT; S.spend.outTok += outT;
  const p = PRICES[run.settings.model]; if (p) S.spend.usd += inT / 1e6 * p[0] + outT / 1e6 * p[1]; else S.spend.unknown = true;
}

// ---------- creations ----------
function applyCreation(c, placeId){
  const type = ["poem", "story", "letter", "recipe", "notes", "drawing"].includes(c.type) ? c.type : null; if (!type) return;
  const str = (v, n, d = "") => (typeof v === "string" && v.trim()) ? v.trim().slice(0, n) : d;
  const base = { id: "c" + Date.now().toString(36), type, title: str(c.title, 80, "Untitled"), at: Math.round(S.state.clock), place: placeId };
  if (type === "drawing"){ const svg = String(c.svg || "").trim(); if (!/^<svg[\s>]/i.test(svg) || svg.length > 14000) return; S.creations.unshift({ ...base, about: str(c.about, 200), svg }); }
  else { const text = str(c.text, 3000); if (!text) return; S.creations.unshift({ ...base, text }); }
  appendEntry({ m: base.at, kind: "made", place: placeId, text: `wrote/made a ${type}: "${base.title}"` });
  UI.renderMade(); save();
}

// ---------- diary & save ----------
function appendEntry(e){
  const d = Brain.dayOf(e.m), id = "d" + d;
  if (!S.days[id]) S.days[id] = { day: d, entries: [] };
  S.days[id].entries.push(e); if (S.days[id].entries.length > 160) S.days[id].entries.splice(0, S.days[id].entries.length - 160);
  const ids = Object.keys(S.days).sort((a, b) => S.days[a].day - S.days[b].day); while (ids.length > 60) delete S.days[ids.shift()];
  UI.renderDiary();
  if (S.state && Brain.dayOf(S.state.clock) !== (S.state.weather || {}).day) updateWeather();
}
let saveTimer = null;
function snapshot(){ return JSON.parse(JSON.stringify({ ...S, state: { ...S.state, running: run.running } })); }
function save(){ clearTimeout(saveTimer); saveTimer = setTimeout(() => life.save(snapshot()), 1500); }
window.addEventListener("beforeunload", () => { if (S.self) life.save(snapshot()); });

// ---------- controls ----------
function start(){ if (!S.self) return openSetup(); if (!run.settings.hasKey) return openSetup("Add your API key first."); run.running = true; UI.renderHeader(); UI.renderNow(); if (live.phase === "idle" && !run.current && !live.steps.length) nextAction(); }
function pause(){ run.running = false; stopMusic(); UI.renderHeader(); UI.renderNow(); save(); }
function wireControls(){
  $("#watchBtn").onclick = () => run.running ? pause() : start();
  document.querySelectorAll("#speedSeg button").forEach(b => b.onclick = () => { run.speed = +b.dataset.speed; UI.setPressed("#speedSeg", "speed", b.dataset.speed); life.setSettings({ speed: run.speed }); });
  UI.setPressed("#speedSeg", "speed", String(run.speed));
  document.querySelectorAll("#camSeg button").forEach(b => b.onclick = () => E.setMode(b.dataset.cam, creature ? creature.root.position.clone() : null));
  $("#musicBtn").onclick = () => { run.music = !run.music; $("#musicBtn").setAttribute("aria-pressed", run.music); $("#musicBtn").textContent = run.music ? "Music on" : "Music off"; life.setSettings({ musicOn: run.music }); if (!run.music) Music.setMasterLevel(0); };
  $("#musicBtn").setAttribute("aria-pressed", run.music); $("#musicBtn").textContent = run.music ? "Music on" : "Music off";
  $("#labelsBtn").onclick = () => { run.labels = !run.labels; $("#labelsBtn").setAttribute("aria-pressed", run.labels); $("#labels").hidden = !run.labels; };
  $("#panelBtn").onclick = () => { const p = $("#panel"); p.hidden = !p.hidden; $("#panelBtn").setAttribute("aria-pressed", !p.hidden); };
  $("#settingsBtn").onclick = () => openSetup();
  $("#npStop").onclick = () => stopMusic();
  window.addEventListener("keydown", e => {
    if (e.target.closest("input, select, textarea")) return;
    if (e.code === "Space"){ e.preventDefault(); run.running ? pause() : start(); }
    if (e.key === "1") E.setMode("follow", creature && creature.root.position.clone()); if (e.key === "2") E.setMode("cinematic"); if (e.key === "3") E.setMode("free"); if (e.key === "4") E.setMode("overview");
    if (e.key.toLowerCase() === "m") $("#musicBtn").click(); if (e.key.toLowerCase() === "l") $("#labelsBtn").click();
    if (e.key === "Tab"){ e.preventDefault(); $("#panelBtn").click(); }
  });
  window.addEventListener("pointerdown", () => Music.initAudio().catch(() => {}), { once: true });
  $("#saveSettings").onclick = saveSettingsFromForm;
  $("#testApi").onclick = async () => { await saveSettingsFromForm(); $("#testStatus").innerHTML = '<span class="spinner"></span> Testing…';
    const r = await life.think({ prompt: 'Reply with only this JSON: {"ok":true}', maxTokens: 50 });
    $("#testStatus").textContent = r.ok ? "Connected! The brain works." : ({ auth: "The service rejected the key.", no_key: "Paste the key first.", network: "Couldn't reach that address.", bad_request: "The service refused: " }[r.code] || "Error: ") + (r.code === "bad_request" || !({ auth: 1, no_key: 1, network: 1 })[r.code] ? (r.message || "").slice(0, 160) : ""); };
  $("#beginBtn").onclick = beginLife;
  $("#openSave").onclick = () => life.openSaveFolder();
  $("#newLife").onclick = () => { $("#confirmNew").hidden = false; };
  $("#confirmNewBtn").onclick = async () => { pause(); await life.reset(); location.reload(); };
  $("#setup").addEventListener("click", e => { if (e.target.id === "setup" && S.self && run.settings.hasKey) $("#setup").hidden = true; });
}
function openSetup(note){
  const st = run.settings;
  $("#setup").hidden = false;
  $("#setupTitle").textContent = S.self ? "Settings" : "Welcome to Little Life";
  $("#setupIntro").textContent = note || (S.self ? `${S.self.creature.name}'s life is saved on this PC. Change how it runs here.` : "A small creature is about to wake up in a wild forest with nothing. It will invent itself, dream up the town it wants, and build it all by hand. You just watch.");
  $("#keyState").textContent = st.hasKey ? "· saved" : "";
  $("#keyInput").value = ""; $("#qualitySel").value = st.quality; $("#volRange").value = st.volume;
  const known = [...$("#modelSel").options].some(o => o.value === st.model); $("#modelSel").value = known ? st.model : "claude-haiku-5-5";
  $("#apiBase").value = st.apiBase || ""; $("#apiFormat").value = st.apiFormat || "anthropic"; $("#modelName").value = known ? "" : (st.model || "");
  $("#customApi").open = !!st.apiBase;
  $("#beginBtn").hidden = !!S.self; $("#spend").textContent = "$" + S.spend.usd.toFixed(2) + (S.spend.unknown ? " (plus Opus use, not estimated)" : "") + ` · ${Math.round(S.spend.inTok / 1000)}k tokens in, ${Math.round(S.spend.outTok / 1000)}k out`;
}
async function saveSettingsFromForm(){
  const custom = $("#modelName").value.trim();
  const patch = { model: custom || $("#modelSel").value, quality: $("#qualitySel").value, volume: +$("#volRange").value, apiBase: $("#apiBase").value.trim(), apiFormat: $("#apiFormat").value };
  const k = $("#keyInput").value.trim(); if (k) patch.apiKey = k;
  const before = run.settings.quality;
  run.settings = await life.setSettings(patch);
  $("#keyState").textContent = run.settings.hasKey ? "· saved" : ""; $("#setupStatus").textContent = "Saved." + (before !== run.settings.quality ? " Restart the app to change graphics." : "");
  if (S.self && run.settings.hasKey) setTimeout(() => { $("#setup").hidden = true; $("#setupStatus").textContent = ""; }, 700);
  return run.settings;
}
async function beginLife(){
  await saveSettingsFromForm();
  if (!run.settings.hasKey){ $("#setupStatus").textContent = "Paste your API key first."; return; }
  Music.initAudio().catch(() => {});
  $("#beginBtn").disabled = true; $("#setupStatus").innerHTML = '<span class="spinner"></span> Someone is about to wake up…';
  const res = await life.think({ prompt: Brain.GENESIS_PROMPT, maxTokens: 4000 });
  if (!res.ok){ $("#beginBtn").disabled = false; $("#setupStatus").textContent = res.code === "auth" ? "The AI service didn't accept that key (" + (res.message || "").slice(0, 120) + ")" : res.code === "network" ? "Couldn't reach the AI service. Check your internet or the base URL." : "That didn't work: " + (res.message || res.code); return; }
  countSpend(res);
  const self = Brain.validateGenesis(Brain.parseJSON(res.text));
  if (!self){ $("#beginBtn").disabled = false; $("#setupStatus").textContent = "The reply was garbled. Press Begin to try again."; return; }
  S.self = self; S.world = freshWorld(); S.days = {}; S.creations = []; S.music = [];
  S.state = { clock: 480, needs: { energy: 78, fullness: 45, joy: 60, wonder: 85, calm: 55 }, mood: "just woke up", place: "camp", memory: "", thought: self.firstThought, chunks: 0, action: null };
  $("#loading").hidden = false; progress(`${self.creature.name} is waking up in the forest…`);
  await buildWorld();
  appendEntry({ m: 480, kind: "born", place: "camp", text: self.firstThought });
  $("#loading").hidden = true; $("#setup").hidden = true; $("#beginBtn").disabled = false; $("#setupStatus").textContent = "";
  save(); UI.renderAll();
  E.setMode("follow", creature.root.position.clone());
  start();
}

boot().catch(err => { console.error(err); $("#loadingText").textContent = "Something went wrong while starting: " + (err && err.message || err) + " (press F12 for details)"; });
