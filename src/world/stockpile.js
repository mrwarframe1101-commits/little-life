// The camp stockpile: what the creature owns, piled up where you can see it.
// Each material gets its own little heap that grows and shrinks with the inventory.
import * as THREE from "three";
import { heightAt } from "./terrain.js";
import * as A from "./assets.js";

// KayKit Resource Bits / Restaurant Bits (CC0): [small, medium, large] model per material, with display heights
const RB = "kaykit-resource-bits", RS = "kaykit-restaurant";
const KAY = {
  log:   [[RB, "Wood_Log_A", .45], [RB, "Wood_Log_Stack", .8], [RB, "Wood_Log_Stack", 1.2]],
  plank: [[RB, "Wood_Planks_Stack_Small", .35], [RB, "Wood_Planks_Stack_Medium", .55], [RB, "Wood_Planks_Stack_Large", .8]],
  stone: [[RB, "Stone_Chunks_Small", .35], [RB, "Stone_Chunks_Large", .6], [RB, "Stone_Chunks_Large", .9]],
  brick: [[RB, "Stone_Bricks_Stack_Small", .35], [RB, "Stone_Bricks_Stack_Medium", .55], [RB, "Stone_Bricks_Stack_Large", .8]],
  ore:   [[RB, "Iron_Nugget_Medium", .25], [RB, "Iron_Nuggets", .4], [RB, "Iron_Nuggets", .6]],
  metal: [[RB, "Iron_Bars_Stack_Small", .3], [RB, "Iron_Bars_Stack_Medium", .45], [RB, "Iron_Bars_Stack_Large", .65]],
  cloth: [[RB, "Textiles_Stack_Small", .35], [RB, "Textiles_Stack_Large", .6], [RB, "Textiles_Stack_Large_Colored", .8]],
  food:  [[RS, "crate_carrots", .5], [RS, "crate_tomatoes", .5], [RS, "crate_potatoes", .5]],
};

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
const M = {
  log: mat("#8a5a34"), logEnd: mat("#d9b27a"), plank: mat("#c99a5e"), stone: mat("#9a9a98"), clay: mat("#b0623a"), fiber: mat("#a8b85a"),
  sand: mat("#e8d6a0"), ore: new THREE.MeshStandardMaterial({ color: "#a0603a", roughness: .5, metalness: .5 }), brick: mat("#b8483a"),
  glass: new THREE.MeshStandardMaterial({ color: "#bfe8ff", roughness: .1, transparent: true, opacity: .7 }), metal: new THREE.MeshStandardMaterial({ color: "#c8ccd2", roughness: .3, metalness: .8 }),
  cloth: mat("#e88aa8"), food: mat("#d23a4a"), crate: mat("#a07444"),
};
const G = { log: new THREE.CylinderGeometry(.16, .16, 1.5, 9), plank: new THREE.BoxGeometry(1.3, .07, .24), stone: new THREE.DodecahedronGeometry(.17, 0), brick: new THREE.BoxGeometry(.34, .14, .17),
  lump: new THREE.SphereGeometry(.2, 8, 6), mound: new THREE.SphereGeometry(.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bar: new THREE.BoxGeometry(.4, .1, .14), pane: new THREE.BoxGeometry(.5, .5, .04),
  bolt: new THREE.CylinderGeometry(.12, .12, .7, 10), bundle: new THREE.CylinderGeometry(.18, .18, .9, 8), berry: new THREE.SphereGeometry(.07, 6, 5) };

// slots around the camp (relative offsets), one per material
const SLOTS = { log: [3.2, 1.2], plank: [3.2, -.6], stone: [1.6, 2.8], brick: [0, 3.2], clay: [-1.6, 2.8], sand: [-3, 2], ore: [-3.2, .4], metal: [-3.2, -1.1], glass: [-2.4, -2.4], fiber: [2.4, -2.4], cloth: [.8, -3], food: [-.8, -3] };
const FOODS = ["berries", "fish", "mushroom", "egg", "vegetable", "bread", "wheat", "flour", "apple", "carrot", "veg"];

export function createStockpile(scene, center){
  const group = new THREE.Group(); group.name = "stockpile"; scene.add(group);
  const piles = {}; let last = "";
  const kay = {}; // material -> [small, medium, large] loaded models
  (async () => { try { const want = Object.values(KAY).flat().map(([kit, n]) => A.find(kit, n)).filter(Boolean); if (!want.length) return; await A.preload(want);
    for (const [k, tiers] of Object.entries(KAY)){ const ms = []; for (const [kit, n, h] of tiers){ const p = A.find(kit, n); const m = p ? await A.load(p) : null; if (m) ms.push({ m, h }); } if (ms.length === 3) kay[k] = ms; }
    last = ""; for (const k in piles) piles[k].n = -1; } catch(e){ console.warn("stockpile models", e); } })();
  const at = (k, dx = 0, dz = 0) => { const [ox, oz] = SLOTS[k]; const x = center.x + ox + dx, z = center.z + oz + dz; return new THREE.Vector3(x, heightAt(x, z), z); };
  const mesh = (g, m, p) => { const o = new THREE.Mesh(g, m); o.position.copy(p); o.castShadow = o.receiveShadow = true; return o; };

  function build(k, n){
    const g = new THREE.Group(); if (n <= 0) return g;
    const base = at(k); g.position.copy(base);
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    if (kay[k]){ // one model per tier, plus extra copies as the pile grows
      const tier = n < 4 ? 0 : n < 12 ? 1 : 2, { m, h } = kay[k][tier], copies = k === "food" ? Math.min(3, Math.ceil(n / 4)) : 1 + Math.min(2, Math.floor(n / 20));
      for (let i = 0; i < copies; i++){ const o = A.place(k === "food" ? kay.food[i % 3].m : m, { height: h, x: (i - (copies - 1) / 2) * .9, z: (i % 2) * .3, rot: i * .7 }); if (o){ o.traverse(c => { if (c.isMesh){ c.castShadow = c.receiveShadow = true; } }); g.add(o); } }
      return g;
    }
    if (k === "log"){ const c = Math.min(n, 15); let i = 0; for (let row = 0; i < c; row++) for (let j = 0; j < 5 - row && i < c; j++, i++){ const o = mesh(G.log, M.log, v((j - (4 - row) / 2) * .34, .16 + row * .29, 0)); o.rotation.x = Math.PI / 2; g.add(o); } }
    else if (k === "plank"){ for (let i = 0; i < Math.min(n, 16); i++){ const o = mesh(G.plank, M.plank, v((i % 2) * .05, .04 + i * .075, 0)); o.rotation.y = (i % 2) * .08; g.add(o); } }
    else if (k === "stone" || k === "ore"){ const c = Math.min(n, 18); for (let i = 0; i < c; i++){ const ring = i < 8 ? 0 : i < 14 ? 1 : 2, a = i * 2.4, r = [.45, .25, 0][ring]; g.add(mesh(G.stone, k === "ore" ? M.ore : M.stone, v(Math.cos(a) * r, .14 + ring * .22, Math.sin(a) * r))); } }
    else if (k === "brick"){ for (let i = 0; i < Math.min(n, 24); i++){ const layer = Math.floor(i / 6), j = i % 6; const o = mesh(G.brick, M.brick, v((j % 3 - 1) * .36 + (layer % 2) * .1, .07 + layer * .145, (Math.floor(j / 3) - .5) * .19)); g.add(o); } }
    else if (k === "clay" || k === "sand"){ const s = Math.min(1.4, .45 + n * .08); const o = mesh(G.mound, M[k], v(0, 0, 0)); o.scale.set(s, s * .6, s); g.add(o); }
    else if (k === "metal"){ for (let i = 0; i < Math.min(n, 12); i++) g.add(mesh(G.bar, M.metal, v((i % 3 - 1) * .15, .05 + Math.floor(i / 3) * .1, 0))); }
    else if (k === "glass"){ for (let i = 0; i < Math.min(n, 8); i++){ const o = mesh(G.pane, M.glass, v(0, .26, i * .06)); o.rotation.x = -.15; g.add(o); } }
    else if (k === "fiber"){ for (let i = 0; i < Math.min(n, 9); i++){ const o = mesh(G.bundle, M.fiber, v((i % 3 - 1) * .38, .18 + Math.floor(i / 3) * .32, 0)); o.rotation.z = Math.PI / 2; g.add(o); } }
    else if (k === "cloth"){ for (let i = 0; i < Math.min(n, 8); i++){ const o = mesh(G.bolt, M.cloth, v((i % 2) * .26, .12 + Math.floor(i / 2) * .23, 0)); o.rotation.z = Math.PI / 2; g.add(o); } }
    else if (k === "food"){ const crate = mesh(new THREE.BoxGeometry(.7, .35, .5), M.crate, v(0, .17, 0)); g.add(crate); for (let i = 0; i < Math.min(n * 3, 24); i++) g.add(mesh(G.berry, M.food, v((Math.random() - .5) * .55, .37 + Math.random() * .08, (Math.random() - .5) * .38))); }
    return g;
  }
  function update(inv){
    const counts = {}; for (const k of Object.keys(SLOTS)) counts[k] = 0;
    for (const [k, v] of Object.entries(inv || {})){ if (k in counts) counts[k] += v; else if (FOODS.includes(k)) counts.food += v; }
    const sig = JSON.stringify(counts); if (sig === last) return; last = sig;
    for (const [k, n] of Object.entries(counts)){
      const prevN = piles[k] ? piles[k].n : 0; if (prevN === n) continue;
      if (piles[k]) group.remove(piles[k].g);
      const g = build(k, Math.round(n)); group.add(g); piles[k] = { g, n };
      if (n > prevN && prevN >= 0){ g.scale.setScalar(.6); g.userData.pop = .35; }
    }
  }
  function tick(dt){ for (const p of Object.values(piles)){ const u = p.g.userData; if (u.pop > 0){ u.pop -= dt; p.g.scale.setScalar(1 - Math.max(0, u.pop) / .35 * .4 + Math.sin(Math.max(0, u.pop) / .35 * Math.PI) * .15); } } }
  return { group, update, tick, spot: k => at(k in SLOTS ? k : FOODS.includes(k) ? "food" : "stone", 0, 0), center };
}
