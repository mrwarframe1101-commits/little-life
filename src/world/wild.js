// The wild land the creature lives off: trees it can fell, rocks to mine, reeds, berry bushes, clay banks,
// plus the marks it leaves: stumps, saplings that grow, campfires, snowmen.
import * as THREE from "three";
import { heightAt, riverZ, rng, TOWN } from "./terrain.js";
import * as A from "./assets.js";

const KENNEY_TREES = [["tree_oak", 7, 10], ["tree_detailed", 6, 9], ["tree_default", 5.5, 8], ["tree_fat", 5.5, 8], ["tree_tall", 8, 11], ["tree_pineDefaultA", 8, 11], ["tree_pineRoundB", 6, 9]];
// Quaternius Stylized Nature MegaKit (CC0) when it is installed; Kenney otherwise
export const QK = "quaternius-stylized-nature-megakit";
const Q_TREES = [["CommonTree_1", 7, 10], ["CommonTree_2", 7, 10], ["CommonTree_3", 6.5, 9.5], ["CommonTree_4", 7, 10], ["CommonTree_5", 6.5, 9], ["Pine_1", 8, 12], ["Pine_2", 8, 11], ["Pine_3", 7, 10], ["Pine_4", 8, 12], ["Pine_5", 7, 10], ["TwistedTree_1", 6, 8], ["TwistedTree_3", 6, 8]];
const Q_NAMES = [...Q_TREES.map(t => t[0]), "Pebble_Round_1", "Pebble_Round_2", "Pebble_Round_3", "Pebble_Round_4", "Pebble_Round_5", "Pebble_Square_1", "Pebble_Square_3", "Rock_Medium_1", "Rock_Medium_2", "Rock_Medium_3", "Mushroom_Common", "Mushroom_Laetiporus", "Bush_Common", "Grass_Wispy_Tall"];

export async function createWild(scene, self, world, opts){
  const R = rng(self.town.name + "wild");
  const group = new THREE.Group(); group.name = "wild"; scene.add(group);
  const hasQ = !!A.find(QK, "CommonTree_1");
  const TREE_KINDS = hasQ ? Q_TREES : KENNEY_TREES;
  const paths = [...(hasQ ? Q_NAMES.map(n => A.find(QK, n)) : []), ...KENNEY_TREES.map(t => A.find("nature-kit", t[0])), A.find("nature-kit", "stump_roundDetailed", "stump_round"), A.find("nature-kit", "stump_old"),
    A.find("nature-kit", "rock_largeA"), A.find("nature-kit", "rock_largeC"), A.find("nature-kit", "rock_tallB"), A.find("nature-kit", "grass_large"), A.find("nature-kit", "plant_bushDetailed", "plant_bush"),
    A.find("nature-kit", "campfire_logs", "campfire_stones"), A.find("nature-kit", "log"), A.find("holiday-kit", "snowman"), A.find("holiday-kit", "snowman-hat"), A.find("nature-kit", "tree_small"),
    A.find("nature-kit", "stone_smallA"), A.find("nature-kit", "stone_smallB"), A.find("nature-kit", "stone_smallC"), A.find("nature-kit", "rock_smallB"), A.find("nature-kit", "rock_smallFlatA"), A.find("nature-kit", "mushroom_red"), A.find("nature-kit", "mushroom_tan")];
  await A.preload(paths);
  const M = {}; for (const p of paths) if (p) M[p] = await A.load(p);
  const model = (n, kit = "nature-kit") => M[A.find(kit, n)] || M[A.find(QK, n)] || null;
  // pick the Quaternius model if present, else the Kenney one
  const pick = (q, k) => (hasQ && model(q)) || model(k);
  const blocked = opts.blocked, camp = opts.camp;

  // ---- choppable trees ----
  const trees = [];
  let tries = 0;
  while (trees.length < 230 && tries < 3000){
    tries++;
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 1.05, x = Math.cos(a) * TOWN.rx * r, z = Math.sin(a) * TOWN.rz * r;
    if (Math.hypot(x - camp.x, z - camp.z) < 11) continue;
    if (opts.hasRiver && Math.abs(z - riverZ(x)) < 10) continue;
    if (blocked && blocked(x, z)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    const [name, lo, hi] = TREE_KINDS[Math.floor(R() * TREE_KINDS.length)];
    trees.push({ id: "t" + trees.length, x, z, name, h: lo + R() * (hi - lo), rot: R() * 6 });
  }
  const felled = world.felled || (world.felled = {});
  for (const t of trees){
    const y = heightAt(t.x, t.z);
    if (felled[t.id]){ const s = A.place(model("stump_roundDetailed") || model("stump_round"), { height: .6, x: t.x, y, z: t.z, rot: t.rot }); if (s) group.add(s); t.stump = s; continue; }
    const o = A.place(model(t.name), { height: t.h, x: t.x, y: y - .05, z: t.z, rot: t.rot }); if (!o) continue;
    const accent = trees.indexOf(t) % 9 === 0; // about one tree in nine keeps its autumn-red leaves
    o.traverse(m => { if (!m.isMesh || !m.material) return;
      if (accent && m.material.userData.recolor){ const c = m.material.clone(); c.userData = { ...m.material.userData, recolor: false, recolorHooked: false }; c.onBeforeCompile = () => {}; m.material = c; }
      if (/leaf|leaves|green|plant|foliage|needle/i.test(m.material.name || "")) A.applyWind(m.material); });
    group.add(o); t.obj = o;
  }
  // ---- big rocks (stone & ore), reeds (fibre), berry bushes (food) ----
  const rocks = [], reeds = [], bushes = [];
  for (let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2 + R() * .3, x = Math.cos(a) * TOWN.rx * (.75 + R() * .3), z = Math.sin(a) * TOWN.rz * (.75 + R() * .3);
    if (opts.hasRiver && Math.abs(z - riverZ(x)) < 12) continue; if (blocked && blocked(x, z)) continue;
    const m = pick(["Rock_Medium_1", "Rock_Medium_2", "Rock_Medium_3"][i % 3], ["rock_largeA", "rock_largeC", "rock_tallB"][i % 3]); const o = A.place(m, { height: 2.2 + R() * 1.5, x, y: heightAt(x, z) - .2, z, rot: R() * 6 });
    if (o){ group.add(o); o.traverse(mm => { if (mm.isMesh && i % 2 === 0){ mm.material = mm.material.clone(); mm.material.color.lerp(new THREE.Color("#7a5a4a"), .35); } }); }
    rocks.push({ x, z, ore: i % 2 === 0 }); }
  if (opts.hasRiver) for (let i = 0; i < 22; i++){ const x = -110 + i * 10 + R() * 4, z = riverZ(x) + (i % 2 ? -1 : 1) * (8.2 + R() * 1.5);
    const objs = [];
    for (let k = 0; k < 6; k++){ const o = A.place(pick("Grass_Wispy_Tall", "grass_large"), { height: 1.2 + R() * .6, x: x + (R() - .5) * 2.4, y: heightAt(x, z) - .05, z: z + (R() - .5) * 1.4, rot: R() * 6 }); if (o){ group.add(o); o.userData.s = o.scale.x; objs.push(o); } }
    reeds.push({ x, z, objs }); }
  for (let i = 0; i < 26; i++){ const a = R() * Math.PI * 2, r = .3 + R() * .8, x = Math.cos(a) * TOWN.rx * r, z = Math.sin(a) * TOWN.rz * r;
    if (opts.hasRiver && Math.abs(z - riverZ(x)) < 10) continue; if (blocked && blocked(x, z)) continue; if (Math.hypot(x - camp.x, z - camp.z) < 9) continue;
    const b = A.place(pick("Bush_Common", "plant_bushDetailed") || model("plant_bush"), { height: 1.3, x, y: heightAt(x, z), z, rot: R() * 6 }); if (!b) continue;
    const berries = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: i % 3 ? "#c2304a" : "#3c4fb0", roughness: .4 });
    for (let k = 0; k < 14; k++){ const s = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bm); const aa = R() * Math.PI * 2, rr = .4 + R() * .3; s.position.set(Math.cos(aa) * rr, .5 + R() * .7, Math.sin(aa) * rr); berries.add(s); }
    b.add(berries); group.add(b); bushes.push({ x, z, berries, regrow: 0 }); }

  // ---- loose materials lying about: stones, branches, clay and sand banks, mushrooms ----
  const stones = [], sticks = [], clays = [], sands = [], shrooms = [];
  const stoneNames = ["stone_smallA", "stone_smallB", "stone_smallC", "rock_smallB", "rock_smallFlatA"];
  const okSpot = (x, z) => !(opts.hasRiver && Math.abs(z - riverZ(x)) < 9.5) && !(blocked && blocked(x, z));
  for (let c = 0; c < 26; c++){
    const a = R() * Math.PI * 2, r = .2 + R() * .95, cx = Math.cos(a) * TOWN.rx * r, cz = Math.sin(a) * TOWN.rz * r; if (!okSpot(cx, cz)) continue;
    const cl = { x: cx, z: cz, items: [] };
    for (let k = 0; k < 7; k++){ const x = cx + (R() - .5) * 3.5, z = cz + (R() - .5) * 3.5; const o = A.place(pick(["Pebble_Round_1", "Pebble_Round_2", "Pebble_Square_1", "Pebble_Round_4", "Pebble_Square_3"][k % 5], stoneNames[k % 5]), { height: .18 + R() * .2, x, y: heightAt(x, z) - .03, z, rot: R() * 6 }); if (o){ group.add(o); cl.items.push({ obj: o, back: 0 }); } }
    stones.push(cl);
  }
  const stickM = new THREE.MeshStandardMaterial({ color: "#7a5a3a", roughness: .9 }), stickG = new THREE.CylinderGeometry(.03, .045, 1, 5);
  for (let c = 0; c < 32; c++){
    const a = R() * Math.PI * 2, r = .15 + R() * 1.0, cx = Math.cos(a) * TOWN.rx * r, cz = Math.sin(a) * TOWN.rz * r; if (!okSpot(cx, cz)) continue;
    const cl = { x: cx, z: cz, items: [] };
    for (let k = 0; k < 5; k++){ const st = new THREE.Group(); const x = cx + (R() - .5) * 3, z = cz + (R() - .5) * 3; st.position.set(x, heightAt(x, z) + .04, z); st.rotation.y = R() * 6;
      const main = new THREE.Mesh(stickG, stickM); main.scale.set(1, .9 + R() * .7, 1); main.rotation.z = Math.PI / 2; main.castShadow = true; st.add(main);
      const twig = new THREE.Mesh(stickG, stickM); twig.scale.set(.6, .4, .6); twig.position.set(.2, .05, .08); twig.rotation.set(0, .8, Math.PI / 2.6); st.add(twig);
      group.add(st); cl.items.push({ obj: st, back: 0 }); }
    sticks.push(cl);
  }
  if (opts.hasRiver){
    const clayM = new THREE.MeshStandardMaterial({ color: "#b0623a", roughness: 1 }), sandM = new THREE.MeshStandardMaterial({ color: "#e8d6a0", roughness: 1 }), holeM = new THREE.MeshStandardMaterial({ color: "#4a3022", roughness: 1 });
    for (let i = 0; i < 8; i++){
      const x = -80 + i * 22 + R() * 6, z = riverZ(x) - 8.6, clay = i % 2 === 0;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), clay ? clayM : sandM); patch.rotation.x = -Math.PI / 2; patch.position.set(x, heightAt(x, z) + .03, z); patch.scale.set(1.3, .8, 1); patch.receiveShadow = true; group.add(patch);
      (clay ? clays : sands).push({ x, z, holes: 0, holeM, mat: clay ? clayM : sandM });
    }
  }
  for (let i = 0; i < 18; i++){ const a = R() * Math.PI * 2, r = .3 + R() * .8, x = Math.cos(a) * TOWN.rx * r, z = Math.sin(a) * TOWN.rz * r; if (!okSpot(x, z)) continue;
    const o = A.place(pick(i % 2 ? "Mushroom_Common" : "Mushroom_Laetiporus", i % 2 ? "mushroom_red" : "mushroom_tan"), { height: .3 + R() * .2, x, y: heightAt(x, z), z, rot: R() * 6 }); if (o){ group.add(o); shrooms.push({ x, z, obj: o, back: 0 }); } }
  // ore lumps on the ore rocks
  const oreM = new THREE.MeshStandardMaterial({ color: "#c9743a", roughness: .5, metalness: .6 });
  for (const r of rocks){ if (!r.ore) continue; r.lumps = [];
    for (let k = 0; k < 6; k++){ const a = k / 6 * Math.PI * 2, l = new THREE.Mesh(new THREE.DodecahedronGeometry(.16, 0), oreM); l.position.set(r.x + Math.cos(a) * 1.2, heightAt(r.x, r.z) + .5 + (k % 3) * .35, r.z + Math.sin(a) * 1.0); l.castShadow = true; group.add(l); r.lumps.push({ obj: l, back: 0 }); } }

  // ---- saplings, campfires, snowmen ----
  const saplings = [], fires = [], snowmen = [];
  const sapModel = pick("CommonTree_2", "tree_small") || model("tree_default");
  function addSapling(s){ const o = A.place(sapModel, { height: 6, x: s.x, y: heightAt(s.x, s.z), z: s.z, rot: s.rot || 0 }); if (!o) return; group.add(o); saplings.push({ ...s, obj: o }); }
  (world.saplings || []).forEach(addSapling);
  const fireModel = model("campfire_logs") || model("campfire_stones");
  function addFire(f){ const o = A.place(fireModel, { height: .55, x: f.x, y: heightAt(f.x, f.z), z: f.z }); if (o) group.add(o);
    const L = new THREE.PointLight(0xff9a40, 0, 12, 1.6); L.position.set(f.x, heightAt(f.x, f.z) + .8, f.z); scene.add(L); fires.push({ ...f, obj: o, light: L }); }
  (world.fires || []).forEach(addFire);
  const snowModel = model("snowman", "holiday-kit");
  function addSnowman(s){ const o = A.place(snowModel, { height: 1.7, x: s.x, y: heightAt(s.x, s.z), z: s.z, rot: s.rot || 0 }); if (o){ group.add(o); snowmen.push({ ...s, obj: o }); } }
  (world.snowmen || []).forEach(addSnowman);

  // ---- falling trees ----
  const falling = [];
  function fell(tree, fromX, fromZ){
    if (!tree || !tree.obj || tree.falling) return;
    tree.falling = true; felled[tree.id] = true;
    const dir = Math.atan2(tree.x - fromX, tree.z - fromZ);
    falling.push({ tree, t: 0, dir });
  }
  function update(dt, clock, weather){
    for (let i = falling.length - 1; i >= 0; i--){ const f = falling[i]; f.t += dt; const k = Math.min(1, f.t / 2.2), e = k * k;
      const o = f.tree.obj; o.rotation.set(0, 0, 0); o.rotateY(f.dir); o.rotateX(e * Math.PI / 2 * .96);
      if (k >= 1 && f.t > 4){ group.remove(o); f.tree.obj = null; const s = A.place(model("stump_roundDetailed") || model("stump_round"), { height: .6, x: f.tree.x, y: heightAt(f.tree.x, f.tree.z), z: f.tree.z, rot: f.tree.rot }); if (s) group.add(s); f.tree.stump = s; falling.splice(i, 1); } }
    for (const s of saplings){ const k = Math.max(.08, Math.min(1, (clock - s.planted) / (3 * 1440))); s.obj.scale.setScalar(k); }
    for (const f of fires){ const burning = clock < f.until; f.light.intensity = burning ? 7 + Math.sin(performance.now() * .013) * 1.5 + Math.sin(performance.now() * .031) : 0; f.burning = burning; }
    for (const s of snowmen){ if (weather !== "snow" && clock - s.made > 1440 * 1.5) { s.melt = (s.melt || 1) - dt * .02; s.obj.scale.setScalar(Math.max(.01, s.melt)); } }
    for (const b of bushes){ if (clock > b.regrow) b.berries.children.forEach(c => c.visible = true); }
    const regrow = list => { for (const cl of list) for (const it of cl.items || [cl]) if (it.back && clock > it.back){ it.back = 0; it.obj.visible = true; } };
    regrow(stones); regrow(sticks); regrow(shrooms); for (const r of rocks) if (r.lumps) for (const l of r.lumps) if (l.back && clock > l.back){ l.back = 0; l.obj.visible = true; }
    for (const r of reeds) for (const o of r.objs || []) if (o.userData.back && clock > o.userData.back){ o.userData.back = 0; o.scale.setScalar(o.userData.s || 1); }
  }
  const standing = () => trees.filter(t => t.obj && !t.falling);
  function nearestTree(x, z, preferIn){ let best = null, bd = Infinity; for (const t of standing()){ let d = Math.hypot(t.x - x, t.z - z); if (preferIn && preferIn(t.x, t.z)) d -= 40; if (d < bd){ bd = d; best = t; } } return best; }
  function nearest(list, x, z, filter){ let best = null, bd = Infinity; for (const p of list){ if (filter && !filter(p)) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd){ bd = d; best = p; } } return best; }
  function treesIn(test){ return standing().filter(t => test(t.x, t.z)); }
  return {
    group, trees, rocks, reeds, bushes, saplings, fires, snowmen,
    update, fell, nearestTree, treesIn, standing,
    // hide trees that stand between the camera and the creature so the view is never blocked
    occlude(cam, target){ const dx = target.x - cam.x, dz = target.z - cam.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      for (const t of trees){ if (!t.obj || t.falling) continue; const px = t.x - cam.x, pz = t.z - cam.z, along = px * ux + pz * uz;
        const side = Math.abs(px * uz - pz * ux); const hide = (along > -1 && along < L - 1.5 && side < 2.6) || Math.hypot(px, pz) < 3; if (t.obj.visible === hide) t.obj.visible = !hide; } },
    nearestRock: (x, z, ore) => nearest(rocks, x, z, r => !ore || r.ore),
    nearestStones: (x, z) => nearest(stones, x, z, c => c.items.some(i => i.obj.visible)), nearestSticks: (x, z) => nearest(sticks, x, z, c => c.items.some(i => i.obj.visible)),
    nearestClay: (x, z) => nearest(clays, x, z), nearestSand: (x, z) => nearest(sands, x, z), nearestShrooms: (x, z) => nearest(shrooms, x, z, s => s.obj.visible),
    // take one visible piece from a cluster (it grows back in a couple of days)
    takeOne(cl, clock, nearPos){ if (!cl) return null; const list = (cl.items || cl.lumps || cl.objs || []).filter(i => (i.obj ? i.obj.visible : !i.userData.back));
      if (!list.length) return null; list.sort((a, b) => (a.obj || a).position.distanceTo(nearPos) - (b.obj || b).position.distanceTo(nearPos)); const it = list[0];
      if (it.obj){ it.obj.visible = false; it.back = clock + 1440 * (1.5 + Math.random()); return it.obj.position.clone(); }
      it.userData.back = clock + 1440; it.scale.setScalar((it.userData.s || 1) * .15); return it.position.clone(); },
    takeBerry(b, clock){ if (!b) return; const left = b.berries.children.filter(c => c.visible); if (left.length) left[0].visible = false; if (left.length <= 1) b.regrow = clock + 1440; },
    dig(spot){ if (!spot || spot.holes > 10) return; spot.holes++; const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
      const h = new THREE.Mesh(new THREE.CircleGeometry(.32 + Math.random() * .15, 12), spot.holeM); h.rotation.x = -Math.PI / 2; h.position.set(spot.x + Math.cos(a) * r * 1.3, heightAt(spot.x, spot.z) + .045, spot.z + Math.sin(a) * r * .8); group.add(h);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), spot.mat); mound.position.copy(h.position).add(new THREE.Vector3(.45, 0, .1)); mound.castShadow = true; group.add(mound); },
    logsAt(x, z){ const g = new THREE.Group(); for (let i = 0; i < 3; i++){ const l = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 1.6, 8), stickM); l.rotation.z = Math.PI / 2; l.rotation.y = i * .9; l.position.set(x + (i - 1) * .4, heightAt(x, z) + .16, z + (i % 2) * .3); l.castShadow = true; g.add(l); } group.add(g); return g; },
    nearestReeds: (x, z) => nearest(reeds, x, z), nearestBush: (x, z, clock) => nearest(bushes, x, z, b => clock > b.regrow),
    pickBush(b, clock){ if (b) b.regrow = clock + 1440; },
    plant(x, z, clock){ const s = { x, z, planted: clock, rot: Math.random() * 6 }; (world.saplings = world.saplings || []).push({ x, z, planted: clock, rot: s.rot }); addSapling(s); },
    light(x, z, clock, minutes = 240){ let f = fires.find(f => Math.hypot(f.x - x, f.z - z) < 3); if (f){ f.until = clock + minutes; const w = (world.fires || []).find(w => Math.hypot(w.x - x, w.z - z) < 3); if (w) w.until = f.until; return f; }
      const nf = { x, z, until: clock + minutes }; (world.fires = world.fires || []).push({ ...nf }); addFire(nf); return fires[fires.length - 1]; },
    nearestFire: (x, z, clock) => nearest(fires, x, z, f => clock < f.until),
    snowman(x, z, clock){ const s = { x, z, made: clock, rot: Math.random() * 6 }; (world.snowmen = world.snowmen || []).push(s); addSnowman(s); },
    blockedByTree(x, z, r = 1.2){ return standing().some(t => Math.abs(t.x - x) < r && Math.abs(t.z - z) < r); },
    dispose(){ scene.remove(group); fires.forEach(f => scene.remove(f.light)); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
