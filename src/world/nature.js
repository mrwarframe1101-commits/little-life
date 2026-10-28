// Forests, meadows, rocks and the small living things: birds, butterflies, fireflies, jumping fish.
import * as THREE from "three";
import { heightAt, riverZ, rng } from "./terrain.js";
import * as A from "./assets.js";

const DECOR_SETS = {
  trees:     [["tree_oak", 8, 12], ["tree_detailed", 7, 11], ["tree_default", 6, 9], ["tree_fat", 6, 9], ["tree_tall", 9, 13]],
  pines:     [["tree_pineTallA_detailed", 10, 16], ["tree_pineDefaultA", 8, 12], ["tree_pineRoundB", 7, 11], ["tree_pineTallC", 10, 15], ["tree_cone", 7, 10]],
  autumn:    [["tree_oak_fall", 8, 12], ["tree_detailed_fall", 7, 11], ["tree_default_fall", 6, 9], ["tree_fat_fall", 6, 9], ["tree_tall_fall", 9, 13]],
  palms:     [["tree_palmTall", 9, 13], ["tree_palmDetailedTall", 9, 13], ["tree_palmBend", 8, 11], ["tree_palmShort", 5, 7]],
  blossoms:  [["tree_blocks", 6, 9], ["tree_simple", 6, 8], ["tree_small", 4, 6]],
};
const GROUND_SETS = {
  flowers:   [["flower_redA", .5, .8], ["flower_yellowB", .5, .8], ["flower_purpleC", .5, .8], ["flower_redC", .4, .7], ["flower_yellowA", .4, .7], ["flower_purpleA", .4, .7]],
  bushes:    [["plant_bushDetailed", 1, 1.6], ["plant_bushLarge", 1.2, 2], ["plant_bush", .8, 1.3], ["plant_bushTriangle", 1, 1.6]],
  rocks:     [["rock_largeA", 1.2, 2.6], ["rock_smallC", .4, .8], ["rock_tallB", 1.5, 3], ["stone_largeC", 1, 2], ["rock_smallFlatB", .3, .5]],
  mushrooms: [["mushroom_redGroup", .4, .7], ["mushroom_tanGroup", .4, .7], ["mushroom_redTall", .5, .8]],
  grasses:   [["grass_large", .6, 1.1], ["grass_leafsLarge", .5, .9], ["plant_flatTall", .5, .9]],
  stumps:    [["stump_oldTall", .8, 1.2], ["log_large", .6, 1], ["stump_roundDetailed", .5, .8]],
};

// Quaternius Stylized Nature MegaKit (CC0), used when installed. "Q:" entries come from it.
const QK = "quaternius-stylized-nature-megakit";
const Q_SETS = {
  trees:   [["Q:CommonTree_1", 8, 12], ["Q:CommonTree_2", 8, 12], ["Q:CommonTree_3", 7, 11], ["Q:CommonTree_4", 8, 12], ["Q:CommonTree_5", 7, 11]],
  pines:   [["Q:Pine_1", 10, 15], ["Q:Pine_2", 9, 14], ["Q:Pine_3", 9, 13], ["Q:Pine_4", 10, 15], ["Q:Pine_5", 8, 12]],
  twisted: [["Q:TwistedTree_1", 7, 10], ["Q:TwistedTree_2", 7, 10], ["Q:TwistedTree_4", 6, 9], ["Q:DeadTree_2", 6, 9]],
  flowers: [["Q:Flower_3_Group", .5, .8], ["Q:Flower_4_Group", .5, .8], ["Q:Flower_3_Single", .4, .6], ["Q:Flower_4_Single", .4, .6], ["Q:Bush_Common_Flowers", .9, 1.3]],
  bushes:  [["Q:Bush_Common", 1, 1.6], ["Q:Bush_Common_Flowers", 1, 1.5], ["Q:Plant_1_Big", .9, 1.4], ["Q:Plant_7_Big", .9, 1.4]],
  rocks:   [["Q:Rock_Medium_1", 1, 2.2], ["Q:Rock_Medium_2", 1, 2.2], ["Q:Rock_Medium_3", 1, 2], ["Q:Pebble_Round_2", .25, .45], ["Q:Pebble_Square_4", .25, .4]],
  grasses: [["Q:Grass_Common_Tall", .6, 1], ["Q:Grass_Common_Short", .4, .6], ["Q:Grass_Wispy_Tall", .7, 1.1], ["Q:Grass_Wispy_Short", .4, .7]],
  ferns:   [["Q:Fern_1", .7, 1.2], ["Q:Plant_1", .5, .8], ["Q:Plant_7", .5, .8]],
  clover:  [["Q:Clover_1", .15, .25], ["Q:Clover_2", .15, .25], ["Q:Petal_1", .08, .12], ["Q:Petal_3", .08, .12]],
  mushrooms: [["Q:Mushroom_Common", .35, .6], ["Q:Mushroom_Laetiporus", .3, .5]],
  pebbles: [["Q:Pebble_Round_1", .2, .4], ["Q:Pebble_Round_3", .2, .4], ["Q:Pebble_Round_5", .2, .35], ["Q:Pebble_Square_2", .2, .35], ["Q:Pebble_Square_5", .2, .35], ["Q:Pebble_Square_6", .2, .35]],
};
const pathOf = n => n.startsWith("Q:") ? A.find(QK, n.slice(2)) : A.find("nature-kit", n);

export async function buildNature(scene, town, places, info, quality, decor){
  const R = rng(town.name + "nature");
  const hasQ = !!A.find(QK, "CommonTree_1");
  const G = { ...GROUND_SETS, ferns: [["plant_flatTall", .5, .9], ["grass_leafsLarge", .5, .9]], clover: [["grass", .2, .3]], pebbles: [["stone_smallA", .2, .35], ["stone_smallB", .2, .35], ["rock_smallFlatA", .2, .3]] };
  if (hasQ) for (const k of ["flowers", "bushes", "rocks", "grasses", "ferns", "clover", "mushrooms", "pebbles"]) G[k] = k === "rocks" || k === "mushrooms" ? [...Q_SETS[k], ...G[k]] : Q_SETS[k];
  const want = new Set(decor || []);
  const treeSets = [hasQ ? Q_SETS.trees : DECOR_SETS.trees];
  if (hasQ){ treeSets.push(Q_SETS.pines); if (want.has("autumn") || R() < .4) treeSets.push(Q_SETS.twisted); }
  if (!hasQ && want.has("pines")) treeSets.push(DECOR_SETS.pines); if (!hasQ && want.has("autumn")) treeSets.push(DECOR_SETS.autumn); if (want.has("palms")) treeSets.push(DECOR_SETS.palms); if (!hasQ && want.has("blossoms")) treeSets.push(DECOR_SETS.blossoms);
  const paths = new Set();
  for (const set of treeSets) set.forEach(([n]) => paths.add(pathOf(n)));
  for (const set of Object.values(G)) set.forEach(([n]) => paths.add(pathOf(n)));
  paths.add(A.find("nature-kit", "log_large")); paths.add(A.find("nature-kit", "stump_old"));
  await A.preload([...paths]);
  const models = {}; for (const p of paths) if (p) models[p] = await A.load(p);
  const pick = (set) => { const [n, lo, hi] = set[Math.floor(R() * set.length)]; const path = pathOf(n); return { m: models[path], h: lo + R() * (hi - lo) }; };
  const batch = new A.Batch("nature");
  const ok = (x, z, margin = 0) => { if (info.blocked(x, z)) return false; const h = heightAt(x, z); if (h < -.2 || h > 55) return false; return Math.abs(heightAt(x + 1, z) - h) + Math.abs(heightAt(x, z + 1) - h) < 1.6 + margin; };
  const add = (set, x, z, scale = 1) => { const { m, h } = pick(set); if (!m) return; const o = A.place(m, { height: h * scale, x, z, rot: R() * Math.PI * 2 }); o.position.y = heightAt(x, z) - .05; batch.add(o); return o; };
  const tf = quality.trees;

  // forests on the hills ring
  const forestN = Math.round(900 * tf);
  for (let i = 0; i < forestN; i++){
    const a = R() * Math.PI * 2, r = 1.08 + Math.pow(R(), .8) * 1.4, x = Math.cos(a) * 100 * r, z = Math.sin(a) * 66 * r;
    const clump = (Math.sin(x * .05) + Math.cos(z * .06)) > -.3; if (!clump && R() < .6) continue;
    if (!ok(x, z, 1)) continue;
    if (info.noTrees && info.noTrees(x, z)) continue;
    add(treeSets[Math.floor(R() * treeSets.length)], x, z, .9 + R() * .4);
  }
  // scattered town trees, avoiding buildings
  for (let i = 0; i < 140 * tf; i++){
    const x = R() * 190 - 95, z = R() * 110 - 60; if (!ok(x, z)) continue; if (info.noTrees && info.noTrees(x, z)) continue;
    if (Object.values(info.places).some(p => Math.hypot(p.pos.x - x, p.pos.z - z) < 13)) continue;
    add(treeSets[0], x, z, .85 + R() * .3);
  }
  // meadow flowers, bushes, rocks, mushrooms
  const scatter = (set, n, rad, scale = 1) => { for (let i = 0; i < n; i++){ const a = R() * Math.PI * 2, r = Math.sqrt(R()) * rad, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r * .8; if (ok(x, z)) add(set, x, z, scale); } };
  // flowers come in patches
  for (let p = 0; p < 110 * tf; p++){ const cx = R() * 220 - 110, cz = R() * 140 - 70; for (let i = 0; i < 16; i++){ const x = cx + (R() - .5) * 9, z = cz + (R() - .5) * 9; if (ok(x, z)) add(G.flowers, x, z); } }
  // clover and petal carpets, fern clumps at forest edges
  for (let p = 0; p < 70 * tf; p++){ const cx = R() * 200 - 100, cz = R() * 120 - 60; for (let i = 0; i < 14; i++){ const x = cx + (R() - .5) * 6, z = cz + (R() - .5) * 6; if (ok(x, z)) add(G.clover, x, z); } }
  for (let i = 0; i < 260 * tf; i++){ const a = R() * Math.PI * 2, r = .85 + R() * .6, x = Math.cos(a) * 100 * r, z = Math.sin(a) * 66 * r; if (ok(x, z)) add(G.ferns, x, z, .9 + R() * .5); }
  scatter(G.bushes, 200 * tf, 150);
  scatter(G.rocks, 140 * tf, 190);
  scatter(G.grasses, 520 * tf, 150);
  scatter(G.mushrooms, 80 * tf, 150);
  if (!hasQ) scatter(G.stumps, 40 * tf, 160);
  scatter(G.pebbles, 160 * tf, 150);
  // fallen logs lying in the woods, with mushrooms growing on them
  const barkM = new THREE.MeshStandardMaterial({ color: "#5e4130", roughness: 1 }), ringM = new THREE.MeshStandardMaterial({ color: "#c9a36e", roughness: 1 }), mossM = new THREE.MeshStandardMaterial({ color: "#6f9a48", roughness: 1 });
  for (let i = 0; i < 40 * tf; i++){ const a = R() * Math.PI * 2, r = .7 + R() * .9, x = Math.cos(a) * 100 * r, z = Math.sin(a) * 66 * r; if (!ok(x, z)) continue;
    const len = 2.4 + R() * 2.2, rad = .22 + R() * .14, o = new THREE.Group(); o.position.set(x, heightAt(x, z) + rad * .8, z); o.rotation.y = R() * 6;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.08, len, 10), barkM); body.rotation.z = Math.PI / 2; o.add(body);
    for (const sx of [-1, 1]){ const cap = new THREE.Mesh(new THREE.CircleGeometry(rad * .96, 10), ringM); cap.position.x = sx * len / 2 + sx * .002; cap.rotation.y = sx * Math.PI / 2; o.add(cap); }
    const moss = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.02, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3), mossM); moss.scale.set(len / rad * .35, .6, 1); o.add(moss);
    batch.add(o);
    for (let k = 0; k < 3; k++) add(G.mushrooms, x + (R() - .5) * 1.5, z + (R() - .5) * 1.5, .6); }
  // river banks: reeds and rocks
  if (info.hasRiver !== false){
    for (let i = 0; i < 220; i++){ const x = R() * 400 - 200, z = riverZ(x) + (R() < .5 ? -1 : 1) * (8.8 + R() * 3); if (heightAt(x, z) > -.5 && !info.blocked(x, z)) add(R() < .55 ? G.grasses : R() < .5 ? G.pebbles : G.rocks, x, z); }
    // stones in the shallows and along the water's edge
    for (let i = 0; i < 160; i++){ const x = R() * 360 - 180, side = R() < .5 ? -1 : 1, z = riverZ(x) + side * (5.5 + R() * 2.5); const o = add(G.pebbles, x, z, 1.4 + R()); if (o) o.position.y = Math.max(heightAt(x, z), -.75) - .08; }
    // lily pads floating on the slow water
    const padM = new THREE.MeshStandardMaterial({ color: "#5fae4a", roughness: .7, side: THREE.DoubleSide }), padG = new THREE.CircleGeometry(.45, 14, .3, Math.PI * 2 - .5); padG.rotateX(-Math.PI / 2);
    const flowerM = new THREE.MeshStandardMaterial({ color: "#ffd0e6", roughness: .5 }), flowerG = new THREE.SphereGeometry(.12, 8, 6);
    for (let c = 0; c < 30; c++){ const cx = R() * 300 - 150, side = R() < .5 ? -1 : 1, cz = riverZ(cx) + side * (4 + R() * 2.5);
      for (let k = 0; k < 6; k++){ const p = new THREE.Mesh(padG, padM); p.position.set(cx + (R() - .5) * 3, -.53, cz + (R() - .5) * 1.6); p.rotation.y = R() * 6; p.scale.setScalar(.7 + R() * .7); p.receiveShadow = true; batch.add(p);
        if (R() < .25){ const f = new THREE.Mesh(flowerG, flowerM); f.position.copy(p.position).add(new THREE.Vector3(0, .08, 0)); f.scale.set(1, .6, 1); batch.add(f); } } }
  }
  const meshes = batch.build(scene, { windy: m => /leaf|grass|plant|flower|bush|petal|green/i.test(m.name || "") });
  return meshes;
}

// ---------- living things ----------
export function createLife(scene){
  const group = new THREE.Group(); scene.add(group);
  const R = rng("life");
  // butterflies
  const bfly = [];
  const wingGeo = new THREE.PlaneGeometry(.22, .16); wingGeo.translate(.11, 0, 0);
  const cols = ["#ffb347", "#f6f0a0", "#9ad1ff", "#ff8fab", "#ffffff", "#c39bff"];
  for (let i = 0; i < 26; i++){
    const b = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide });
    const l = new THREE.Mesh(wingGeo, m), r = new THREE.Mesh(wingGeo, m); r.scale.x = -1; b.add(l, r);
    b.userData = { l, r, home: new THREE.Vector3(R() * 140 - 70, 0, R() * 90 - 55), ph: R() * 10, sp: .6 + R() * .6 };
    group.add(b); bfly.push(b);
  }
  // birds
  const birds = []; const birdMat = new THREE.MeshBasicMaterial({ color: 0x2b2f3a, side: THREE.DoubleSide });
  const bw = new THREE.BufferGeometry(); bw.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, .9, .15, -.25, .9, .15, .25, 0, 0, 0, -.9, .15, -.25, -.9, .15, .25], 3));
  for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++){ const b = new THREE.Mesh(bw, birdMat); b.userData = { flock: f, i, ph: R() * 6 }; group.add(b); birds.push(b); }
  // fireflies
  const FF = 160, fg = new THREE.BufferGeometry(), fp = new Float32Array(FF * 3), seeds = [];
  for (let i = 0; i < FF; i++){ seeds.push([R() * 160 - 80, R() * 100 - 55, R() * 10]); }
  fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const ffMat = new THREE.PointsMaterial({ color: 0xfff3a0, size: .35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireflies = new THREE.Points(fg, ffMat); fireflies.frustumCulled = false; group.add(fireflies);
  // fish that jump in the river
  const fish = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc7d3dc, roughness: .3, metalness: .4 })); fish.scale.set(1, .5, 2.2); fish.visible = false; group.add(fish);
  let fishT = 5, fishFrom = null;

  function update(dt, t, sky, focus){
    const day = 1 - sky.dark, wet = sky.wet;
    for (const b of bfly){ const u = b.userData; b.visible = day > .5 && wet < .3; if (!b.visible) continue;
      const tt = t * u.sp + u.ph; const x = u.home.x + Math.sin(tt * .4) * 6 + Math.sin(tt * 1.3) * 1.5, z = u.home.z + Math.cos(tt * .33) * 6;
      const y = heightAt(x, z) + .8 + Math.sin(tt * 2.1) * .4 + .4; const nx = x - b.position.x, nz = z - b.position.z;
      b.position.set(x, y, z); b.rotation.y = Math.atan2(nx, nz); const flap = Math.sin(t * 22 + u.ph) * 1.1; u.l.rotation.y = flap; u.r.rotation.y = -flap; }
    for (const b of birds){ const u = b.userData; b.visible = day > .35 && wet < .6; if (!b.visible) continue;
      const ang = t * .08 + u.flock * 2.1, cx = Math.cos(u.flock * 2) * 60, cz = Math.sin(u.flock * 2) * 40 - 10;
      const off = (u.i - 2.5) * 1.6, a = ang - u.i * .03;
      b.position.set(cx + Math.cos(a) * (50 + off), 38 + u.flock * 6 + Math.sin(t + u.i) * .6, cz + Math.sin(a) * (40 + off));
      b.rotation.set(0, -a, 0); const flap = Math.sin(t * 8 + u.ph); b.scale.set(1, 1 + flap * .6, 1); b.rotation.z = flap * .25; }
    ffMat.opacity = Math.max(0, sky.dark - .4) * 1.4 * (1 - wet);
    if (ffMat.opacity > 0){ for (let i = 0; i < FF; i++){ const [sx, sz, ph] = seeds[i]; const x = sx + Math.sin(t * .3 + ph) * 2, z = sz + Math.cos(t * .27 + ph * 2) * 2;
      fp[i * 3] = x; fp[i * 3 + 1] = heightAt(x, z) + .6 + Math.sin(t * .8 + ph) * .5 + (Math.sin(t * 3 + ph * 7) > .7 ? .05 : 0); fp[i * 3 + 2] = z; }
      fg.attributes.position.needsUpdate = true; ffMat.size = .25 + Math.sin(t * 4) * .05; }
    fishT -= dt;
    if (fishT < 0 && info_river){ fishT = 6 + Math.random() * 10; const x = (focus ? focus.x : 0) + (Math.random() - .5) * 60; fishFrom = { x, z: riverZ(x) + (Math.random() - .5) * 5, t: 0 }; }
    if (fishFrom){ fishFrom.t += dt; const k = fishFrom.t / .9; if (k > 1){ fishFrom = null; fish.visible = false; }
      else { fish.visible = true; fish.position.set(fishFrom.x + k * 1.4, -.55 + Math.sin(k * Math.PI) * 1.2, fishFrom.z); fish.rotation.x = (k - .5) * 2.2; } }
  }
  let info_river = true;
  return { update, setRiver(v){ info_river = v; } };
}
