// The settlement: the creature's planned and finished places. Each place is a building site that rises
// piece by piece as the creature works on it, with stakes when planned and scaffolding while it's built.
import * as THREE from "three";
import { heightAt, riverZ, rng, waterMaterial, ribbonGeometry } from "./terrain.js";
import { buildBuilding, BUILDING_KINDS, SMALL_KINDS, buildSmall, hangingSign, mat, lampGlass, box, cyl, sph } from "./buildings.js";
import * as A from "./assets.js";

export const OUTDOOR_KINDS = ["garden", "pond", "grove", "plaza", "field", "dock", "well"];
export const ALL_KINDS = [...BUILDING_KINDS.filter(k => k !== "tent"), "tent", ...OUTDOOR_KINDS, ...SMALL_KINDS.filter(k => k !== "camp")];
const ROOM_KINDS = new Set(["house", "cottage", "townhouse", "tower", "observatory", "shop", "cafe", "bakery", "library", "workshop", "barn", "windmill", "greenhouse"]);
export const hasRoom = kind => ROOM_KINDS.has(kind);

// ---------- layout ----------
export function layoutPlaces(places, fixed = 0, hasRiver = true, camp = { x: 0, z: 30 }){
  const minD = 24;
  for (const p of places){
    if (p.wx == null){
      if (p.near){ const host = places.find(q => q.id === p.near && q.wx != null) || { wx: camp.x, wz: camp.z }; const a = Math.random() * Math.PI * 2; p.wx = host.wx + Math.cos(a) * 8; p.wz = host.wz + Math.sin(a) * 8; }
      else { p.wx = -72 + Math.max(0, Math.min(100, +p.x || 50)) * 1.44; p.wz = -46 + Math.max(0, Math.min(100, +p.y || 50)) * .8; }
    }
    if (p.kind === "dock" && hasRiver) p.wz = riverZ(p.wx) - 10.5;
  }
  const small = p => SMALL_KINDS.includes(p.kind);
  for (let it = 0; it < 220; it++){
    for (let i = 0; i < places.length; i++) for (let j = i + 1; j < places.length; j++){
      const a = places[i], b = places[j], mi = i >= fixed && a.kind !== "camp", mj = j >= fixed && b.kind !== "camp"; if (!mi && !mj) continue;
      const need = small(a) && small(b) ? 7.5 : small(a) || small(b) ? 13 : minD;
      let dx = b.wx - a.wx, dz = b.wz - a.wz, d = Math.hypot(dx, dz); if (d >= need) continue;
      if (d < .01){ dx = 1; dz = .5; d = 1.1; }
      const push = (need - d) / 2, ux = dx / d, uz = dz / d, fa = mi && mj ? 1 : mi ? 2 : 0, fb = mi && mj ? 1 : mj ? 2 : 0;
      a.wx -= ux * push * fa; a.wz -= uz * push * fa; b.wx += ux * push * fb; b.wz += uz * push * fb;
    }
    for (const p of places){ if (p.kind === "camp") continue; p.wx = Math.max(-84, Math.min(84, p.wx)); p.wz = Math.max(-52, Math.min(hasRiver ? riverZ(p.wx) - (p.kind === "dock" ? 10.5 : 14) : 44, p.wz)); }
  }
  for (const p of places){
    if (p.rot == null){
      if (p.kind === "dock") p.rot = 0;
      else { const dx = camp.x - p.wx, dz = camp.z - p.wz; p.rot = Math.hypot(dx, dz) < 3 ? 0 : Math.atan2(dx, dz); }
    }
    p.wx = Math.round(p.wx * 10) / 10; p.wz = Math.round(p.wz * 10) / 10;
  }
}
export function campSpot(hasRiver){ return { x: 4, z: hasRiver ? riverZ(4) - 17 : 20 }; }

function curve(A_, B_, bend){
  const mx = (A_.x + B_.x) / 2, mz = (A_.z + B_.z) / 2, dx = B_.x - A_.x, dz = B_.z - A_.z, L = Math.hypot(dx, dz) || 1;
  const cx = mx - dz / L * bend, cz = mz + dx / L * bend, pts = [], n = Math.max(8, Math.ceil(L / 1.5));
  for (let i = 0; i <= n; i++){ const t = i / n, u = 1 - t; pts.push({ x: u * u * A_.x + 2 * u * t * cx + t * t * B_.x, z: u * u * A_.z + 2 * u * t * cz + t * t * B_.z }); }
  return pts;
}

// ---------- town ----------
export async function buildTown(scene, self, world, opts){
  const { hasRiver } = opts;
  const town = self.town;
  const root = new THREE.Group(); root.name = "town"; scene.add(root);
  const dynamic = new THREE.Group(); dynamic.name = "town-dynamic"; scene.add(dynamic);
  const info = { places: {}, footprints: [], lamps: [], smoke: [], spinners: [], signs: [], flags: [], ponds: [], root, dynamic, hasRiver };
  const M = {};
  const want = {
    fountain: A.find("fantasy-town-kit", "fountain-round-detail", "fountain-round"), cart: A.find("fantasy-town-kit", "cart"), cartHigh: A.find("fantasy-town-kit", "cart-high"),
    stall: A.find("fantasy-town-kit", "stall-red", "stall"), stallGreen: A.find("fantasy-town-kit", "stall-green", "stall"), bannerR: A.find("fantasy-town-kit", "banner-red"),
    hedge: A.find("fantasy-town-kit", "hedge"), hedgeL: A.find("fantasy-town-kit", "hedge-large"), fenceN: A.find("nature-kit", "fence_simple"), fenceP: A.find("nature-kit", "fence_planks"),
    logStack: A.find("nature-kit", "log_stack"), logStackL: A.find("nature-kit", "log_stackLarge"), log: A.find("nature-kit", "log"), stump: A.find("nature-kit", "stump_roundDetailed", "stump_round"),
    potL: A.find("nature-kit", "pot_large"), bush: A.find("nature-kit", "plant_bushDetailed", "plant_bush"), bushS: A.find("nature-kit", "plant_bushSmall"),
    lilyL: A.find("nature-kit", "lily_large"), lilyS: A.find("nature-kit", "lily_small"), reeds: A.find("nature-kit", "grass_large"), canoe: A.find("nature-kit", "canoe"), paddle: A.find("nature-kit", "canoe_paddle"),
    rockS: A.find("nature-kit", "rock_smallA"), stoneS: A.find("nature-kit", "stone_smallB", "stone_smallA"), mushG: A.find("nature-kit", "mushroom_redGroup"), mushT: A.find("nature-kit", "mushroom_tanGroup"),
    oak: A.find("nature-kit", "tree_oak"), detailed: A.find("nature-kit", "tree_detailed"), fat: A.find("nature-kit", "tree_fat"), dtree: A.find("nature-kit", "tree_default"),
    statue: A.find("nature-kit", "statue_obelisk", "statue_column"), table: A.find("furniture-kit", "tableRound", "table"), chair: A.find("furniture-kit", "chair"),
    bread: A.find("food-kit", "loaf", "bread"), pie: A.find("food-kit", "pie"), barrel: A.find("food-kit", "barrel"),
    pumpkin: A.find("nature-kit", "crop_pumpkin"), carrot: A.find("nature-kit", "crop_carrot"), melon: A.find("nature-kit", "crop_melon"), turnip: A.find("nature-kit", "crop_turnip"),
    dirtRow: A.find("nature-kit", "crops_dirtDoubleRow", "crops_dirtRow"), corn: A.find("nature-kit", "crops_cornStageD", "crops_cornStageC"), wheat: A.find("nature-kit", "crops_wheatStageB", "crops_wheatStageA"),
    leafs: A.find("nature-kit", "crops_leafsStageB"), wheel: A.find("fantasy-town-kit", "wheel"), lanternH: A.find("holiday-kit", "lantern-hanging"),
  };
  await A.preload(Object.values(want));
  for (const [k, p] of Object.entries(want)) M[k] = p ? await A.load(p) : null;
  const R = rng(town.name + "town");

  info.toWorld = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return { x: p.wx + lx * c + lz * s, z: p.wz - lx * s + lz * c }; };

  function makeSite(p){
    const site = { id: p.id, root: new THREE.Group(), main: new THREE.Group(), reveal: new THREE.Group(), decor: new THREE.Group(), meshes: [], shown: 0, progress: -1, merged: null, doors: [], dynamic: [] };
    site.root.add(site.main, site.reveal, site.decor); root.add(site.root);
    const g = site.main; g.position.set(p.wx, heightAt(p.wx, p.wz), p.wz); g.rotation.y = p.rot;
    const put = (target) => (key, lx, lz, o = {}) => { const w = info.toWorld(p, lx, lz); const obj = A.place(M[key], { ...o, x: w.x, z: w.z, rot: (o.rot || 0) + p.rot }); if (obj){ obj.position.y += heightAt(w.x, w.z); target.add(obj); } return obj; };
    const rec = { id: p.id, kind: p.kind, name: p.name, pos: new THREE.Vector3(p.wx, heightAt(p.wx, p.wz), p.wz), rot: p.rot, top: 4, room: hasRoom(p.kind), site };
    let depth = 8, width = 8, spotL = [1.6, 5.4], doorL = [0, 4];
    if (SMALL_KINDS.includes(p.kind)){
      const b = buildSmall(p); g.add(b.group); depth = b.d; width = b.w; rec.top = b.top; spotL = [b.spot.x, b.spot.z]; doorL = [b.spot.x, b.spot.z];
      if (b.bed) rec.bedL = b.bed; if (b.fire) rec.fireL = b.fire;
      b.smoke.forEach(s => site.smokeL = (site.smokeL || []).concat([s]));
    } else if (BUILDING_KINDS.includes(p.kind)){
      const b = buildBuilding(p, M); g.add(b.group); depth = b.d; width = b.w; rec.top = b.top;
      const dz = b.doorZ != null ? b.doorZ : b.d / 2;
      doorL = [0, dz + .6]; spotL = b.spot ? [b.spot.x, b.spot.z] : [1.9, dz + 2.2];
      if (b.hasPiano) rec.piano = true;
      site.smokeL = b.smoke; site.lightsL = b.lights; site.spinners = b.spinners || [];
      if (p.kind !== "tent"){ const sign = hangingSign(p.name, -1.9, 3.3, dz + .55); g.add(sign); site.sign = sign; }
      decorateBuilding(p, b, put(site.decor), R, M);
      if (b.campfire){ rec.fireL = b.campfire; }
    } else {
      const o = buildOutdoor(p, g, put(site.reveal), R, M, info, info.toWorld); depth = o.depth; width = o.width; spotL = o.spot; doorL = o.door; rec.top = o.top;
      const sw = info.toWorld(p, o.signAt[0], o.signAt[1]);
      const post = new THREE.Group(); post.position.set(sw.x, heightAt(sw.x, sw.z), sw.z); post.rotation.y = p.rot;
      post.add(box(.14, 2.6, .14, mat("#5a3b24", "wood", [.2, 1]), 0, 0, 0)); const s = hangingSign(p.name, .95, 2.55, 0); post.add(s); site.decor.add(post); site.sign = s;
      if (o.fishFacing != null) rec.fishFacing = o.fishFacing;
    }
    const door = info.toWorld(p, doorL[0], doorL[1]), spot = info.toWorld(p, spotL[0], spotL[1]), anchor = info.toWorld(p, doorL[0], doorL[1] + 2.4);
    rec.door = new THREE.Vector3(door.x, heightAt(door.x, door.z), door.z);
    rec.spot = new THREE.Vector3(spot.x, heightAt(spot.x, spot.z), spot.z);
    if (p.kind === "bandstand") rec.spot.y += .8;
    rec.anchor = { x: anchor.x, z: anchor.z };
    rec.labelPos = new THREE.Vector3(p.wx, rec.pos.y + rec.top + .8, p.wz);
    if (rec.bedL){ const w = info.toWorld(p, rec.bedL.x, rec.bedL.z); rec.bed = new THREE.Vector3(w.x, heightAt(w.x, w.z) + rec.bedL.y, w.z); }
    if (rec.fireL){ const w = info.toWorld(p, rec.fireL.x, rec.fireL.z); rec.fire = new THREE.Vector3(w.x, heightAt(w.x, w.z), w.z); }
    rec.footprint = { x: p.wx, z: p.wz, r: Math.max(width, depth) * .62 + (SMALL_KINDS.includes(p.kind) ? .4 : 1.2), w: width, d: depth };
    // doors, flags and signs move, so they stay outside the merged mesh
    g.traverse(o => { if (o.userData.door) site.doors.push(o); if (o.userData.flag) info.flags.push(o); });
    // the order things appear in: bottom to top, then left to right
    root.updateMatrixWorld(true);
    const box3 = new THREE.Box3();
    const collect = (grp) => grp.traverse(m => { if (!m.isMesh) return; if (isUnder(m, site.sign)) return; box3.setFromObject(m); site.meshes.push({ m, y: Math.round(box3.min.y * 4) / 4, x: box3.getCenter(new THREE.Vector3()).x, s: m.scale.clone(), pop: 1 }); });
    collect(site.main); collect(site.reveal);
    site.meshes.sort((a, b) => a.y - b.y || a.x - b.x);
    // stakes and string for a planned site
    site.stakes = new THREE.Group(); root.add(site.stakes);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => info.toWorld(p, sx * width / 2, sz * depth / 2));
    corners.forEach((c, i) => { const st = cyl(.05, .06, .9, mat("#c9a06a"), c.x, heightAt(c.x, c.z), c.z, 5); site.stakes.add(st);
      const n = corners[(i + 1) % 4], L = Math.hypot(n.x - c.x, n.z - c.z); const line = box(L, .02, .02, mat("#f3ecdf"), (c.x + n.x) / 2, heightAt(c.x, c.z) + .6, (c.z + n.z) / 2); line.rotation.y = -Math.atan2(n.z - c.z, n.x - c.x); site.stakes.add(line); });
    const planSign = new THREE.Group(); const pw = info.toWorld(p, width / 2 + .6, depth / 2 + .6); planSign.position.set(pw.x, heightAt(pw.x, pw.z), pw.z); planSign.rotation.y = p.rot;
    planSign.add(box(.1, 1.3, .1, mat("#7a5a3a"), 0, 0, 0)); const ps = hangingSign("Plan: " + p.name, 0, 1.6, .06); ps.scale.setScalar(.6); planSign.add(ps); site.stakes.add(planSign);
    // scaffolding and material piles while it's being built
    site.scaffold = new THREE.Group(); root.add(site.scaffold);
    if (!SMALL_KINDS.includes(p.kind) && BUILDING_KINDS.includes(p.kind)){
      const sw = mat("#b89060", "wood", [.2, 1]), H = Math.min(rec.top * .8, 10);
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1]]){ const c = info.toWorld(p, sx * (width / 2 + .7), sz * (depth / 2 + .7)); site.scaffold.add(cyl(.07, .07, H, sw, c.x, heightAt(c.x, c.z), c.z, 5)); }
      for (let lv = 1; lv < H / 2.2; lv++) for (const sz of [-1, 1]){ const c = info.toWorld(p, 0, sz * (depth / 2 + .7)); const pl = box(width + 1.6, .08, .5, sw, c.x, heightAt(c.x, c.z) + lv * 2.2, c.z); pl.rotation.y = p.rot; site.scaffold.add(pl); }
      const pile = info.toWorld(p, width / 2 + 2.2, depth / 2 + 1.5);
      for (let i = 0; i < 6; i++){ const l = cyl(.14, .14, 2.2, mat("#7a5a3a", "wood", [.3, 1]), 0, 0, 0, 7); l.rotation.z = Math.PI / 2; l.rotation.y = p.rot; l.position.set(pile.x + (i % 3) * .05, heightAt(pile.x, pile.z) + .15 + Math.floor(i / 3) * .27, pile.z + (i % 3) * .29 - .29); site.scaffold.add(l); }
      for (let i = 0; i < 5; i++){ const pl = box(1.8, .06, .3, mat("#c9a06a", "wood", [1, .2]), pile.x + 1.4, heightAt(pile.x, pile.z) + i * .07, pile.z + .4); pl.rotation.y = p.rot; site.scaffold.add(pl); }
    }
    site.hasRoom = rec.room;
    info.places[p.id] = rec;
    return rec;
  }
  function isUnder(o, anc){ if (!anc) return false; for (let c = o; c; c = c.parent) if (c === anc) return true; return false; }

  // progress: -1 planned, 0..1 being built, 1 complete
  function setProgress(id, prog){
    const rec = info.places[id]; if (!rec) return; const site = rec.site; if (site.progress === prog && site.merged) return;
    site.progress = prog;
    const planned = prog < 0, done = prog >= 1;
    site.stakes.visible = planned;
    site.scaffold.visible = !planned && !done && prog > .05;
    site.decor.visible = done;
    if (site.sign) site.sign.visible = done;
    if (done){ finish(rec); return; }
    const n = planned ? 0 : Math.floor(Math.max(.02, prog) * site.meshes.length);
    site.meshes.forEach((e, i) => { const v = i < n; if (v && !e.m.visible){ e.pop = 0; } e.m.visible = v; });
    site.shown = n;
  }
  function finish(rec){
    const site = rec.site; if (site.merged) return;
    site.meshes.forEach(e => { e.m.visible = true; e.m.scale.copy(e.s); });
    root.updateMatrixWorld(true);
    for (const d of site.doors) dynamic.attach(d);
    if (site.sign) dynamic.attach(site.sign);
    for (const sp of site.spinners || []){ dynamic.attach(sp); info.spinners.push(sp); }
    site.main.traverse(o => { if (o.isMesh && o.userData.glow) site.dynamic.push(o); });
    site.dynamic.forEach(o => dynamic.attach(o));
    const batch = new A.Batch(rec.id); batch.add(site.main); batch.add(site.reveal);
    const merged = new THREE.Group(); site.root.add(merged);
    batch.build(merged, { windy: m => /leaf|grass|plant|flower|bush/i.test(m.name || "") });
    site.root.remove(site.main); site.root.remove(site.reveal); site.merged = merged;
    site.scaffold.visible = false; site.stakes.visible = false;
    if (site.smokeL) site.smokeL.forEach(s => info.smoke.push(site.main.localToWorld(s.clone())));
    if (site.lightsL) site.lightsL.forEach(l => info.lamps.push({ pos: site.main.localToWorld(l.clone()), strong: false }));
    if (site.sign) info.signs.push(site.sign);
    rec.complete = true;
  }
  info.setProgress = setProgress;
  info.addPlace = (p) => { const rec = makeSite(p); setProgress(p.id, -1); buildBlockGrid(); return rec; };
  // little pop when a new piece appears
  info.update = (dt) => {
    for (const rec of Object.values(info.places)){ const site = rec.site; if (site.merged || site.progress < 0) continue;
      for (let i = Math.max(0, site.shown - 40); i < site.shown; i++){ const e = site.meshes[i]; if (e.pop < 1){ e.pop = Math.min(1, e.pop + dt * 2.8); const k = e.pop, b = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2; e.m.scale.copy(e.s).multiplyScalar(Math.max(.01, b)); } } }
  };

  for (const p of town.places) makeSite(p);

  // ---------- trails ----------
  let trails = null;
  info.rebuildTrails = () => {
    if (trails){ scene.remove(trails); trails.traverse(o => o.geometry && o.geometry.dispose()); }
    trails = new THREE.Group(); trails.name = "trails"; scene.add(trails);
    const done = Object.values(info.places).filter(r => r.complete || r.kind === "camp");
    if (done.length < 2) return;
    const nodes = done.map(r => r.anchor), inT = new Set([0]), edges = [];
    while (inT.size < nodes.length){ let best = null, bd = Infinity; for (const i of inT) for (let j = 0; j < nodes.length; j++) if (!inT.has(j)){ const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z); if (d < bd){ bd = d; best = [i, j]; } } inT.add(best[1]); edges.push(best); }
    const dirt = new THREE.MeshStandardMaterial({ color: new THREE.Color(town.path).lerp(new THREE.Color("#8a6f52"), .55), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const [i, j] of edges){ const pts = curve(nodes[i], nodes[j], (R() - .5) * 6); const m = new THREE.Mesh(ribbonGeometry(pts, 1.8, (x, z) => heightAt(x, z) + .05, 2), dirt); m.receiveShadow = true; trails.add(m); }
    for (const r of done){ const pts = curve(r.anchor, { x: r.door.x, z: r.door.z }, 0); const m = new THREE.Mesh(ribbonGeometry(pts, 1.4, (x, z) => heightAt(x, z) + .05, 2), dirt); trails.add(m); }
  };

  // ---------- where nothing else may grow ----------
  const GR = 260; let grid = new Uint8Array(GR * 2 * GR * 2);
  function buildBlockGrid(){
    grid = new Uint8Array(GR * 2 * GR * 2);
    const mark = (x, z, r) => { for (let gx = Math.floor(x - r); gx <= Math.ceil(x + r); gx++) for (let gz = Math.floor(z - r); gz <= Math.ceil(z + r); gz++){
      if ((gx - x) ** 2 + (gz - z) ** 2 > r * r) continue; const ix = gx + GR, iz = gz + GR; if (ix >= 0 && iz >= 0 && ix < GR * 2 && iz < GR * 2) grid[iz * GR * 2 + ix] = 1; } };
    for (const r of Object.values(info.places)) mark(r.footprint.x, r.footprint.z, r.footprint.r);
    for (const p of info.ponds) mark(p.x, p.z, p.r);
    info.footprints = Object.values(info.places).map(r => r.footprint);
  }
  buildBlockGrid();
  info.blocked = (x, z) => {
    if (hasRiver && Math.abs(z - riverZ(x)) < 8.5) return true;
    const ix = Math.round(x) + GR, iz = Math.round(z) + GR;
    if (ix < 0 || iz < 0 || ix >= GR * 2 || iz >= GR * 2) return false;
    return grid[iz * GR * 2 + ix] === 1;
  };
  return info;
}

function streetLamp(){
  const g = new THREE.Group(), iron = mat("#2c2f36");
  g.add(cyl(.22, .28, .3, iron, 0, 0, 0, 8)); g.add(cyl(.07, .09, 3.4, iron, 0, .3, 0, 8));
  g.add(box(.5, .06, .5, iron, 0, 3.7, 0)); const gl = new THREE.Mesh(new THREE.CylinderGeometry(.2, .14, .45, 6), lampGlass); gl.position.y = 3.45; g.add(gl);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.32, .3, 6), iron); cap.position.y = 3.88; g.add(cap);
  return g;
}

// ---------- surroundings for buildings ----------
function decorateBuilding(p, b, putAt, R, M){
  const fz = b.d / 2, side = b.w / 2;
  // flower pots and bushes by the door
  putAt(p, "potL", -1.5, fz + 1.3, { height: .9 }); putAt(p, "bush", 1.6 + side * .5, fz + .9, { height: 1.1 });
  putAt(p, "bushS", -side + .6, fz + .9, { height: .8 }); putAt(p, "bushS", side - .4, -fz - .8, { height: .9 });
  const k = p.kind;
  if (["house", "cottage", "townhouse"].includes(k)){
    putAt(p, "logStack", side + 1.3, -1, { height: 1.1, rot: Math.PI / 2 });
    for (let i = -2; i <= 2; i++) if (i !== 0) putAt(p, "fenceN", i * 2.1, fz + 3.4, { width: 2.1 });
    if (R() < .7) putAt(p, "hedge", -side - 1.4, 0, { width: 3, rot: Math.PI / 2 });
  }
  if (k === "shop" || k === "bakery" || k === "cafe"){
    putAt(p, R() < .5 ? "stall" : "stallGreen", side + 3.4, fz + 1.5, { width: 3.4, rot: -.4 });
    putAt(p, "bannerR", -side - .4, fz + .2, { height: 3.2 }); putAt(p, "barrel", side + .6, fz + .6, { height: 1 });
    if (k === "bakery"){ putAt(p, "bread", side + 3.2, fz + 1.5, { height: .3, rot: .3 }); putAt(p, "pie", side + 3.8, fz + 1.2, { height: .2 }); }
  }
  if (k === "cafe"){
    for (let i = 0; i < 3; i++){ const x = -3 + i * 3, z = fz + 3.4; putAt(p, "table", x, z, { height: .8 }); putAt(p, "chair", x - .8, z, { height: 1, rot: Math.PI / 2 }); putAt(p, "chair", x + .8, z, { height: 1, rot: -Math.PI / 2 }); }
  }
  if (k === "workshop" || k === "barn"){ putAt(p, "cart", side + 2.6, fz - 1, { width: 3.2, rot: .5 }); putAt(p, "logStackL", -side - 2, -1, { height: 1.4, rot: Math.PI / 2 }); putAt(p, "wheel", side + .4, fz + .3, { height: 1.2, rot: .2, tilt: -.25 }); }
  if (k === "barn"){ putAt(p, "pumpkin", -3, fz + 2.5, { height: .7 }); putAt(p, "pumpkin", -2.2, fz + 3.1, { height: .6 }); putAt(p, "cartHigh", -side - 3, fz, { width: 3.4, rot: -.6 }); }
  if (k === "library"){ putAt(p, "statue", -side - 1.6, fz + 1.8, { height: 2.8 }); putAt(p, "statue", side + 1.6, fz + 1.8, { height: 2.8 }); putAt(p, "hedgeL", 0, -fz - 1.6, { width: b.w }); }
  if (k === "tower" || k === "observatory" || k === "windmill"){ putAt(p, "rockS", 4.2, 2.6, { height: .8 }); putAt(p, "bush", -4.6, 1.4, { height: 1.2 }); }
}

// ---------- outdoor places ----------
function buildOutdoor(p, g, putAt, R, M, info, toWorld){
  const out = { depth: 10, width: 10, spot: [0, 3], door: [0, 5.5], top: 3, signAt: [4.8, 5.6] };
  const wood = mat("#7a5236", "wood", [1, .4]);
  switch (p.kind){
    case "garden": {
      out.width = 12; out.depth = 10;
      const soil = box(11, .18, 8.6, mat(p.wall, "plain"), 0, 0, -.6); g.add(soil);
      const crops = ["carrot", "turnip", "melon", "pumpkin", "leafs", "corn"];
      for (let r = 0; r < 4; r++){ putAt(p, "dirtRow", -3, -3.6 + r * 2, { width: 4.2, rot: Math.PI / 2 }); putAt(p, "dirtRow", 2.2, -3.6 + r * 2, { width: 4.2, rot: Math.PI / 2 });
        for (let c = 0; c < 5; c++){ const key = crops[(r * 2 + c) % crops.length]; putAt(p, key, -4.8 + c * 1.9 + R() * .4, -3.6 + r * 2 + (R() - .5) * .3, { height: key === "corn" ? 2.1 : .5 + R() * .3, rot: R() * 6 }); } }
      for (let i = -2; i <= 2; i++){ putAt(p, "fenceN", i * 2.4, 3.4, { width: 2.4 }); putAt(p, "fenceN", i * 2.4, -5.4, { width: 2.4 }); }
      for (let i = -1; i <= 1; i++){ putAt(p, "fenceN", -6, i * 2.6 - 1, { width: 2.6, rot: Math.PI / 2 }); putAt(p, "fenceN", 6, i * 2.6 - 1, { width: 2.6, rot: Math.PI / 2 }); }
      scarecrow(g, p, 3.8, -2.2);
      out.spot = [0, 2.6]; out.door = [0, 4.6]; out.signAt = [4.6, 4.6];
      break; }
    case "pond": {
      out.width = 13; out.depth = 12;
      const water = new THREE.Mesh(new THREE.CircleGeometry(5.6, 40), waterMaterial(new THREE.Color(p.roof || "#5aa6c9")));
      water.rotation.x = -Math.PI / 2; water.position.set(0, .14, -1.2); water.receiveShadow = true; g.add(water);
      const rim = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.6, 40), mat("#8b7f6a")); rim.rotation.x = -Math.PI / 2; rim.position.set(0, .1, -1.2); g.add(rim);
      for (let i = 0; i < 20; i++){ const a = i / 20 * Math.PI * 2; putAt(p, i % 3 ? "stoneS" : "rockS", Math.cos(a) * 6.2, -1.2 + Math.sin(a) * 6.2, { height: .4 + R() * .4, rot: R() * 6 }); }
      for (let i = 0; i < 6; i++){ const a = R() * Math.PI * 2, r = 1.5 + R() * 3.5; putAt(p, i % 2 ? "lilyL" : "lilyS", Math.cos(a) * r, -1.2 + Math.sin(a) * r, { width: .8 + R() * .5, rot: R() * 6 }); }
      for (let i = 0; i < 6; i++){ const a = Math.PI * (1.1 + R() * .8), r = 5.8; putAt(p, "reeds", Math.cos(a) * r, -1.2 + Math.sin(a) * r, { height: 1.4 + R() * .6, rot: R() * 6 }); }
      // little jetty for fishing
      const jetty = new THREE.Group(); jetty.position.set(0, .3, 3.2);
      jetty.add(box(1.6, .12, 3.4, wood, 0, 0, -1.2)); for (const sx of [-.7, .7]) for (const sz of [-2.6, .2]) jetty.add(cyl(.08, .08, .9, mat("#5a3b24"), sx, -.75, sz, 6));
      g.add(jetty);
      out.spot = [0, 1.2]; out.door = [0, 6]; out.signAt = [4.2, 6.6]; out.fishFacing = Math.PI;
      const c = toWorld(p, 0, -1.2); info.ponds.push({ x: c.x, z: c.z, r: 6.8 });
      break; }
    case "grove": {
      out.width = 16; out.depth = 14; out.top = 9;
      const trees = ["oak", "detailed", "fat", "oak", "dtree", "detailed", "oak"];
      for (let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2 + R() * .4, r = 4.5 + R() * 3.5; putAt(p, trees[i % trees.length], Math.cos(a) * r, Math.sin(a) * r - 1, { height: 7 + R() * 4, rot: R() * 6 }); }
      putAt(p, "mushG", -1.5, -1.5, { height: .6 }); putAt(p, "mushT", 2, 0, { height: .5 }); putAt(p, "stump", 1.2, -2.4, { height: .7 }); putAt(p, "log", -2.6, .8, { width: 2.4, rot: .7 });
      bench(g, 0, 1.8, Math.PI);
      out.spot = [0, 1.2]; out.door = [0, 7]; out.signAt = [3.5, 7.2];
      break; }
    case "plaza": {
      out.width = 18; out.depth = 18; out.top = 5;
      const pave = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), mat(p.wall || "#c9c2b3", "stone", [6, 6])); pave.rotation.x = -Math.PI / 2; pave.position.y = .09; pave.receiveShadow = true; g.add(pave);
      const ring = new THREE.Mesh(new THREE.RingGeometry(8.4, 9, 48), mat("#8f8a80")); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; g.add(ring);
      if (M.fountain) putAt(p, "fountain", 0, 0, { width: 5.2 }); else { g.add(cyl(2.4, 2.6, .8, mat(p.roof || "#9aa0a6", "stone", [4, .4]), 0, 0, 0, 24)); g.add(cyl(.4, .5, 2.6, mat(p.roof || "#9aa0a6"), 0, .5, 0, 12)); }
      for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + Math.PI / 4; bench(g, Math.sin(a) * 6, Math.cos(a) * 6, a + Math.PI); }
      for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2; const l = streetLamp(); l.position.set(Math.sin(a) * 8.1, 0, Math.cos(a) * 8.1); g.add(l); info.lamps.push({ pos: g.localToWorld(new THREE.Vector3(Math.sin(a) * 8.1, 3.6, Math.cos(a) * 8.1)), strong: true }); }
      out.spot = [Math.sin(Math.PI / 4) * 6, Math.cos(Math.PI / 4) * 6 + .8]; out.door = [0, 9.5]; out.signAt = [3, 9.6];
      break; }
    case "field": {
      out.width = 16; out.depth = 12;
      g.add(box(14, .14, 10, mat("#8a6f52"), 0, 0, -1));
      const crop = R() < .5 ? "wheat" : "corn";
      for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) putAt(p, crop, -6.2 + c * 1.55, -5 + r * 1.6, { height: crop === "corn" ? 2.2 : 1.1, rot: R() * 6 });
      for (let i = -3; i <= 3; i++) putAt(p, "fenceP", i * 2.3, 4.6, { width: 2.3 });
      scarecrow(g, p, 0, -1);
      out.spot = [2.2, 5.6]; out.door = [0, 6.4]; out.signAt = [5, 6.4];
      break; }
    case "dock": {
      out.width = 8; out.depth = 10;
      const deck = new THREE.Group(); deck.position.set(0, .45, 4.5);
      deck.add(box(3, .16, 9, wood, 0, 0, 0)); for (const sx of [-1.3, 1.3]) for (let sz = -4; sz <= 4; sz += 2.6) deck.add(cyl(.12, .12, 2.2, mat("#5a3b24"), sx, -2, sz, 6));
      g.add(deck);
      putAt(p, "canoe", 3, 8, { width: 3.6, rot: .2 }); putAt(p, "paddle", 1.2, 1.8, { height: 1.4, tilt: 1.3 });
      out.spot = [0, 7.6]; out.door = [0, -1.5]; out.signAt = [2.4, -1.4]; out.fishFacing = 0;
      break; }
    case "well": {
      out.width = 6; out.depth = 6; out.top = 4;
      g.add(cyl(1.3, 1.4, 1.1, mat("#9a948a", "stone", [3, .5]), 0, 0, 0, 16)); { const wtr = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), new THREE.MeshStandardMaterial({ color: 0x1d3140 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = .9; g.add(wtr); }
      for (const sx of [-1.2, 1.2]) g.add(box(.16, 2.6, .16, wood, sx, 1, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 1.1, 4), mat(p.roof || "#a65a48", "tile", [2, 1])); roof.rotation.y = Math.PI / 4; roof.position.y = 3.9; roof.castShadow = true; g.add(roof);
      g.add(cyl(.32, .28, .4, mat("#7a5236", "wood", [1, .3]), .4, 1.7, 0, 10));
      out.spot = [1.6, 1.4]; out.door = [0, 3.4]; out.signAt = [2.6, 2.6];
      break; }
  }
  return out;
}
function bench(g, x, z, rot){
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = rot;
  const w = mat("#8a5a36", "wood", [1, .3]), iron = mat("#2c2f36");
  b.add(box(1.8, .08, .5, w, 0, .45, 0)); const back = box(1.8, .5, .07, w, 0, .58, -.25); back.rotation.x = -.15; b.add(back);
  for (const sx of [-.8, .8]){ b.add(box(.07, .45, .07, iron, sx, 0, .18)); b.add(box(.07, 1, .07, iron, sx, 0, -.22)); }
  g.add(b);
}
function scarecrow(g, p, x, z){
  const s = new THREE.Group(); s.position.set(x, 0, z);
  s.add(cyl(.06, .06, 2.4, mat("#6b4a2e"), 0, 0, 0, 6)); const arm = cyl(.05, .05, 1.8, mat("#6b4a2e"), 0, 0, 0, 6); arm.rotation.z = Math.PI / 2; arm.position.y = 1.7; s.add(arm);
  s.add(box(.7, .8, .3, mat(p.roof || "#a65a48"), 0, 1.2, 0)); s.add(sph(.28, mat("#e8d3a0"), 0, 2.2, 0, 10));
  const hat = cyl(.45, .45, .05, mat("#c9a24a"), 0, 2.38, 0, 12); s.add(hat); s.add(cyl(.22, .26, .3, mat("#c9a24a"), 0, 2.4, 0, 12));
  g.add(s);
}
