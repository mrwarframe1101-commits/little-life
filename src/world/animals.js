// Animals: procedurally built low-poly bodies with walk cycles, and simple lives of their own
// (wander, graze, nap at night, swim, flee if shy) plus reactions when the creature interacts with them.
import * as THREE from "three";
import { heightAt, riverZ, rng } from "./terrain.js";
import { toonify, addOutline } from "./style.js";

export const SPECIES = {
  cat:      { body: [.28, .2, .42], leg: .22, legR: .05, head: .2, neck: [0, .12, .36], snout: 0, ears: "pointy", tail: "long", colors: ["#e3a35a", "#fff4e0", "#f7b2b7"], speed: 1.4, sound: "mew", pet: true },
  dog:      { body: [.32, .25, .55], leg: .32, legR: .07, head: .24, neck: [0, .18, .48], snout: .16, ears: "floppy", tail: "short-up", colors: ["#a8743f", "#f1e3c8", "#2a1d15"], speed: 2.6, pet: true },
  chicken:  { bird: true, body: [.2, .2, .26], leg: .14, legR: .025, head: .11, neck: [0, .2, .16], beak: true, comb: true, tail: "feathers", colors: ["#f6f1e7", "#e0b243", "#d23a3a"], speed: 1.1, pecks: true },
  duck:     { bird: true, body: [.2, .16, .3], leg: .08, legR: .025, head: .12, neck: [0, .2, .22], beak: "flat", tail: "feathers", colors: ["#f2f0e6", "#f0a032", "#3f8a55"], speed: 1, swims: true },
  rabbit:   { body: [.2, .2, .28], leg: .1, legR: .05, head: .15, neck: [0, .14, .2], ears: "long", tail: "puff", colors: ["#c9b39a", "#fbf6ee", "#f7b2b7"], speed: 3, hops: true },
  sheep:    { body: [.45, .4, .62], leg: .36, legR: .06, head: .2, neck: [0, .2, .6], snout: .08, ears: "side", tail: "puff", fluffy: true, colors: ["#f4f1ea", "#2c2a2a", "#2c2a2a"], speed: 1.1, grazes: true },
  cow:      { body: [.6, .55, 1.0], leg: .6, legR: .1, head: .3, neck: [0, .25, .95], snout: .2, ears: "side", horns: true, tail: "long", spots: true, colors: ["#f4f1ea", "#2c2a2a", "#e8a3a8"], speed: 1, grazes: true },
  pig:      { body: [.4, .34, .6], leg: .22, legR: .07, head: .24, neck: [0, .08, .58], snout: .14, ears: "pointy", tail: "curl", colors: ["#f2b2b0", "#f7c8c6", "#e08a88"], speed: 1.2, grazes: true },
  goat:     { body: [.32, .3, .5], leg: .45, legR: .05, head: .18, neck: [0, .3, .48], snout: .1, ears: "side", horns: true, beard: true, tail: "short-up", colors: ["#e8e2d6", "#8a7a66", "#2a2520"], speed: 1.6, grazes: true },
  horse:    { body: [.48, .5, 1.05], leg: .95, legR: .09, head: .26, neck: [0, .6, .95], snout: .3, ears: "pointy", mane: true, tail: "long", colors: ["#7a4b2c", "#3a2416", "#f1e3c8"], speed: 3, grazes: true },
  deer:     { body: [.32, .34, .7], leg: .7, legR: .05, head: .18, neck: [0, .45, .65], snout: .12, ears: "side", antlers: true, tail: "puff", colors: ["#b07a48", "#f1e3c8", "#3a2416"], speed: 3.5, shy: true, grazes: true },
  fox:      { body: [.24, .2, .5], leg: .25, legR: .045, head: .17, neck: [0, .1, .45], snout: .14, ears: "pointy", tail: "bushy", colors: ["#d9682b", "#fbf2e6", "#2a1d15"], speed: 3, shy: true },
  hedgehog: { body: [.18, .13, .22], leg: .05, legR: .03, head: .1, neck: [0, .02, .18], snout: .07, ears: "none", spiky: true, colors: ["#6b4a2e", "#e6cfa8", "#2a1d15"], speed: .6, shy: true },
  frog:     { body: [.14, .09, .16], leg: .05, legR: .03, head: .1, neck: [0, .05, .1], ears: "none", bulgeEyes: true, colors: ["#5aa64a", "#d9e8a0", "#2a3a1a"], speed: 1.5, hops: true, swims: true },
  squirrel: { body: [.11, .11, .17], leg: .08, legR: .025, head: .09, neck: [0, .1, .13], snout: .04, ears: "pointy", tail: "bushy-up", colors: ["#b0602a", "#f1e3c8", "#3a2416"], speed: 3, shy: true, hops: true },
};
export const SPECIES_NAMES = Object.keys(SPECIES);

function build(spec, colors){
  const [c0, c1, c2] = (colors || spec.colors).map(c => new THREE.Color(c));
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, flatShading: !!o.flat, ...o });
  const main = M(c0), second = M(c1), accent = M(c2), dark = M("#16161c"), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mk = (geo, m, p, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); o.castShadow = true; parent.add(o); return o; };
  const [rx, ry, rz] = spec.body, legLen = spec.leg;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const bodyY = legLen + ry * .8; body.position.y = bodyY;
  const torso = mk(spec.fluffy ? new THREE.IcosahedronGeometry(1, 1) : new THREE.SphereGeometry(1, 18, 14), spec.fluffy ? M(c0, { flat: true }) : main, [0, 0, 0], body); torso.scale.set(rx, ry, rz);
  if (spec.fluffy) for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; mk(new THREE.IcosahedronGeometry(rx * .42, 0), M(c0, { flat: true }), [Math.cos(a) * rx * .8, Math.sin(i * 1.7) * ry * .4 + ry * .25, Math.sin(a) * rz * .75], body); }
  if (spec.spots) for (let i = 0; i < 6; i++){ const s = mk(new THREE.SphereGeometry(rx * .35, 10, 8), second, [(i % 2 ? 1 : -1) * rx * .78, (i % 3 - 1) * ry * .3, (i / 6 - .4) * rz * 1.3], body); s.scale.set(.35, 1, 1.2); }
  if (spec.spiky) for (let i = 0; i < 26; i++){ const a = (i / 26) * Math.PI * 2, b = (i % 5) / 5; const sp = mk(new THREE.ConeGeometry(.025, .12, 4), second, [Math.cos(a) * rx * .8 * (1 - b * .4), ry * (.3 + b * .6), Math.sin(a) * rz * .7 - .02], body); sp.lookAt(sp.position.clone().multiplyScalar(3).add(new THREE.Vector3(0, .3, -.2))); sp.rotateX(Math.PI / 2); sp.material = M(c2); }
  if (!spec.bird && !spec.spiky && !spec.fluffy) { const belly = mk(new THREE.SphereGeometry(1, 14, 10), second, [0, -ry * .35, rz * .05], body); belly.scale.set(rx * .75, ry * .55, rz * .8); }
  // head
  const neck = new THREE.Group(); neck.position.set(...spec.neck); body.add(neck);
  const head = new THREE.Group(); neck.add(head);
  const hr = spec.head;
  mk(new THREE.SphereGeometry(hr, 16, 12), spec.fluffy ? second : main, [0, 0, 0], head);
  if (spec.snout) { const s = mk(new THREE.SphereGeometry(hr * .6, 12, 10), spec.fluffy ? second : main, [0, -hr * .2, hr * .7 + spec.snout * .3], head); s.scale.set(.85, .75, 1 + spec.snout * 2); mk(new THREE.SphereGeometry(hr * .14, 8, 6), dark, [0, -hr * .05, hr * .9 + spec.snout * .9], head); }
  if (spec.beak === true) { const b = mk(new THREE.ConeGeometry(hr * .3, hr * .7, 6), M("#f0b03a"), [0, -hr * .1, hr * 1.1], head); b.rotation.x = Math.PI / 2; }
  if (spec.beak === "flat") { const b = mk(new THREE.BoxGeometry(hr * .7, hr * .18, hr * .9), M("#f0a032"), [0, -hr * .2, hr * 1.1], head); }
  if (spec.comb) for (let i = 0; i < 3; i++) mk(new THREE.SphereGeometry(hr * .2, 8, 6), accent, [0, hr * (.9 + (i % 2) * .1), hr * (-.2 + i * .25)], head);
  const eyeR = spec.bulgeEyes ? hr * .28 : hr * .13;
  for (const s of [-1, 1]){ mk(new THREE.SphereGeometry(eyeR, 10, 8), spec.bulgeEyes ? M("#e8e8a0") : dark, [s * hr * .45, hr * (spec.bulgeEyes ? .6 : .2), hr * .72], head);
    if (spec.bulgeEyes) mk(new THREE.SphereGeometry(eyeR * .5, 8, 6), dark, [s * hr * .45, hr * .62, hr * .72 + eyeR * .7], head);
    else mk(new THREE.SphereGeometry(eyeR * .35, 6, 5), white, [s * hr * .45 + .01, hr * .25, hr * .72 + eyeR * .8], head);
    if (spec.ears === "pointy"){ const e = mk(new THREE.ConeGeometry(hr * .28, hr * .7, 4), main, [s * hr * .5, hr * .85, -hr * .05], head); e.rotation.z = -s * .25; }
    if (spec.ears === "long"){ const e = mk(new THREE.SphereGeometry(1, 10, 8), main, [s * hr * .3, hr * 1.4, -hr * .1], head); e.scale.set(hr * .2, hr * .75, hr * .1); e.userData.ear = s; }
    if (spec.ears === "floppy"){ const e = mk(new THREE.SphereGeometry(1, 10, 8), accent, [s * hr * .85, hr * .05, 0], head); e.scale.set(hr * .18, hr * .6, hr * .35); e.rotation.z = s * .25; e.userData.ear = s; }
    if (spec.ears === "side"){ const e = mk(new THREE.SphereGeometry(1, 10, 8), main, [s * hr * 1.05, hr * .35, -hr * .1], head); e.scale.set(hr * .45, hr * .14, hr * .25); }
    if (spec.horns){ const h = mk(new THREE.ConeGeometry(hr * .1, hr * .6, 6), M("#e9dcc0"), [s * hr * .45, hr * 1.0, -hr * .1], head); h.rotation.z = -s * .5; }
    if (spec.antlers){ const a = new THREE.Group(); a.position.set(s * hr * .4, hr * .9, -hr * .1); head.add(a); const m = M("#8a6a4a");
      mk(new THREE.CylinderGeometry(.015, .02, hr * 2, 5), m, [s * hr * .3, hr * .8, 0], a).rotation.z = -s * .4; mk(new THREE.CylinderGeometry(.012, .015, hr * 1, 5), m, [s * hr * .7, hr * 1.3, .05], a).rotation.z = -s * 1.1; mk(new THREE.CylinderGeometry(.012, .015, hr * .9, 5), m, [s * hr * .2, hr * 1.5, .1], a); }
  }
  if (spec.beard) { const b = mk(new THREE.ConeGeometry(hr * .2, hr * .6, 5), second, [0, -hr * .7, hr * .9], head); b.rotation.x = Math.PI; }
  if (spec.mane) for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(.05, .22, .14), second, [0, .1 + i * .05, -i * .09], neck).rotation.x = .4;
  // neck geometry for long-necked animals
  if (spec.neck[1] > .25){ const len = Math.hypot(spec.neck[1], spec.neck[2] - rz * .8); const n = mk(new THREE.CylinderGeometry(hr * .55, hr * .75, len, 10), main, [0, spec.neck[1] / 2, (spec.neck[2] + rz * .8) / 2 - rz * .4], body); n.rotation.x = Math.atan2(spec.neck[2] - rz * .8, spec.neck[1]); }
  // tail
  const tail = new THREE.Group(); tail.position.set(0, ry * .2, -rz * .95); body.add(tail);
  if (spec.tail === "long"){ const t = mk(new THREE.CylinderGeometry(.02, .035, rz * .9, 6), main, [0, -rz * .3, -rz * .25], tail); t.rotation.x = -.6; }
  if (spec.tail === "short-up"){ const t = mk(new THREE.CylinderGeometry(.02, .04, rz * .5, 6), main, [0, rz * .2, -.05], tail); t.rotation.x = -.5; }
  if (spec.tail === "puff") mk(new THREE.SphereGeometry(rx * .3, 10, 8), second, [0, 0, -.03], tail);
  if (spec.tail === "bushy" || spec.tail === "bushy-up"){ const t = mk(new THREE.SphereGeometry(1, 12, 10), main, spec.tail === "bushy-up" ? [0, rz * .7, -rz * .2] : [0, -rz * .1, -rz * .5], tail); t.scale.set(rx * .55, spec.tail === "bushy-up" ? rz * .8 : rx * .55, spec.tail === "bushy-up" ? rx * .5 : rz * .6); mk(new THREE.SphereGeometry(rx * .3, 8, 6), second, spec.tail === "bushy-up" ? [0, rz * 1.35, -rz * .3] : [0, -rz * .15, -rz * 1.0], tail); }
  if (spec.tail === "curl"){ const t = mk(new THREE.TorusGeometry(.05, .015, 6, 10, Math.PI * 1.6), main, [0, .02, -.03], tail); t.rotation.y = Math.PI / 2; }
  if (spec.tail === "feathers") for (let i = 0; i < 3; i++){ const f = mk(new THREE.BoxGeometry(.06, .18, .04), i === 1 ? accent : main, [(i - 1) * .05, .1, -.02], tail); f.rotation.x = -.5; f.rotation.z = (i - 1) * .3; }
  // wings for birds
  const wings = [];
  if (spec.bird) for (const s of [-1, 1]){ const w = new THREE.Group(); w.position.set(s * rx * .9, ry * .1, 0); body.add(w); const m = mk(new THREE.SphereGeometry(1, 10, 8), main, [s * .02, 0, -.02], w); m.scale.set(.05, ry * .7, rz * .8); wings.push(w); }
  // legs
  const legs = [];
  const legPos = spec.bird ? [[-rx * .35, 0], [rx * .35, 0]] : [[-rx * .55, rz * .55], [rx * .55, rz * .55], [-rx * .55, -rz * .55], [rx * .55, -rz * .55]];
  for (const [x, z] of legPos){ const l = new THREE.Group(); l.position.set(x, legLen, z); root.add(l);
    mk(new THREE.CylinderGeometry(spec.legR, spec.legR * .85, legLen, 7), spec.bird ? M("#f0b03a") : main, [0, -legLen / 2, 0], l);
    mk(new THREE.SphereGeometry(spec.legR * 1.25, 8, 6), spec.bird ? M("#f0b03a") : accent === second ? main : (spec.colors[2] ? M(spec.colors[2]) : main), [0, -legLen + spec.legR * .3, spec.legR * .5], l).scale.set(1, .6, 1.4);
    legs.push(l); }
  root.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  toonify(root); addOutline(root, { skip: o => o.geometry.parameters && o.geometry.parameters.radius < .03 });
  return { root, body, neck, head, tail, legs, wings, bodyY, height: bodyY + spec.neck[1] + hr * 1.5 };
}

// ---------- the herd ----------
export function createAnimals(scene, self, town, savedAnimals){
  const R = rng((self ? self.town.name : "x") + "animals");
  const list = [], group = new THREE.Group(); group.name = "animals"; scene.add(group);
  const places = town.places;
  const placeOf = id => places[id] || null;
  const homeFor = (species, homeId) => {
    const r = placeOf(homeId); if (r) return { x: r.spot.x, z: r.spot.z, r: 9 };
    const kinds = { chicken: ["barn", "garden", "field"], duck: ["pond", "dock"], sheep: ["field", "barn"], cow: ["field", "barn"], pig: ["barn", "field"], goat: ["barn", "field"], horse: ["barn", "field"],
      frog: ["pond"], cat: ["house", "cottage", "townhouse"], dog: ["house", "cottage", "townhouse"], rabbit: ["garden", "grove"], squirrel: ["grove"], hedgehog: ["garden", "grove"] }[species] || [];
    const hit = Object.values(places).find(p => kinds.includes(p.kind)); if (hit) return { x: hit.spot.x, z: hit.spot.z, r: 10 };
    if (species === "duck" && town.hasRiver){ const x = R() * 60 - 30; return { x, z: riverZ(x), r: 12, river: true }; }
    const a = R() * Math.PI * 2; return { x: Math.cos(a) * 95, z: Math.sin(a) * 60, r: 22 };
  };
  const add = (entry) => {
    const spec = SPECIES[entry.species]; if (!spec) return;
    const body = build(spec, entry.colors);
    const home = entry.home || homeFor(entry.species, entry.homeId);
    const a = { ...entry, spec, b: body, home, pos: new THREE.Vector3(home.x + (R() - .5) * 4, 0, home.z + (R() - .5) * 4), yaw: R() * 6, state: "idle", t: R() * 5, target: null, phase: R() * 6, react: null };
    a.pos.y = heightAt(a.pos.x, a.pos.z); body.root.position.copy(a.pos); group.add(body.root); list.push(a);
  };
  for (const e of savedAnimals) add(e);
  // wildlife that just lives here
  const wild = [];
  if (!list.some(a => a.species === "rabbit")) wild.push("rabbit", "rabbit");
  if (!list.some(a => a.species === "squirrel")) wild.push("squirrel");
  wild.push("deer", "frog", "hedgehog");
  if (town.hasRiver && !list.some(a => a.species === "duck")) wild.push("duck", "duck");
  wild.forEach((sp, i) => add({ id: "wild-" + sp + "-" + i, species: sp, name: null, wild: true }));

  const tmp = new THREE.Vector3();
  function waterAt(a){ if (a.home.river) return riverZ(a.pos.x); return null; }
  function update(dt, t, ctx){
    const night = ctx.dark > .6, creaturePos = ctx.creaturePos;
    for (const a of list){
      const sp = a.spec, b = a.b; a.t -= dt;
      // reacting to the creature
      if (a.react){
        const rc = a.react; rc.t += dt;
        const goal = rc.goal;
        if (rc.mode === "approach" || rc.mode === "fetch"){
          const d = Math.hypot(goal.x - a.pos.x, goal.z - a.pos.z);
          if (d > .25){ moveToward(a, goal, sp.speed * (rc.mode === "fetch" ? 1.4 : .9) * dt, true); }
          else { a.state = rc.after || "sit"; a.yaw = Math.atan2(creaturePos.x - a.pos.x, creaturePos.z - a.pos.z); }
        }
        if (rc.until && rc.t > rc.until){ a.react = null; a.state = "idle"; a.t = 2; }
      } else {
        // fleeing if shy and the creature is close
        const dc = creaturePos ? Math.hypot(creaturePos.x - a.pos.x, creaturePos.z - a.pos.z) : 99;
        if (sp.shy && (a.friendship || 0) < 40 && dc < 6){ const away = tmp.set(a.pos.x - creaturePos.x, 0, a.pos.z - creaturePos.z).normalize().multiplyScalar(10).add(a.pos); a.target = { x: away.x, z: away.z }; a.state = "walk"; a.t = 3; a.fast = true; }
        if (a.t <= 0){
          a.fast = false;
          if (night && !sp.swims){ a.state = "sleep"; a.t = 20; }
          else { const r = Math.random();
            if (r < .45){ const ang = Math.random() * Math.PI * 2, rad = Math.random() * a.home.r; a.target = { x: a.home.x + Math.cos(ang) * rad, z: a.home.z + Math.sin(ang) * rad * (a.home.river ? .25 : 1) }; a.state = "walk"; a.t = 8; }
            else if (r < .75 && (sp.grazes || sp.pecks)){ a.state = "graze"; a.t = 4 + Math.random() * 6; }
            else if (r < .9){ a.state = "sit"; a.t = 5 + Math.random() * 8; }
            else { a.state = "idle"; a.t = 3 + Math.random() * 4; } }
        }
        if (a.state === "walk" && a.target){ if (moveToward(a, a.target, sp.speed * (a.fast ? 1.8 : .45) * dt)){ a.state = "idle"; a.t = 1 + Math.random() * 3; } }
      }
      // pose
      const walking = a.state === "walk" || (a.react && a.react.moving);
      a.phase += dt * (walking ? 9 * Math.min(2, sp.speed * (a.fast ? 1.4 : .6)) : 0);
      const sw = Math.sin(a.phase);
      b.legs.forEach((l, i) => { l.rotation.x = walking ? (i % 2 === (i > 1 ? 1 : 0) ? sw : -sw) * .55 : 0; });
      let bodyY = b.bodyY, headX = 0, bodyX = 0;
      if (sp.hops && walking) bodyY += Math.abs(sw) * .15;
      else if (walking) bodyY += Math.abs(Math.cos(a.phase)) * .02;
      if (a.state === "graze"){ headX = .9 + Math.sin(t * (sp.pecks ? 8 : 1.5) + a.phase) * (sp.pecks ? .35 : .08); }
      if (a.state === "sit" || a.state === "sleep"){ bodyY = b.bodyY * (sp.bird ? .75 : .55); b.legs.forEach(l => l.rotation.x = sp.bird ? 0 : 1.3 * (l.position.z > 0 ? -1 : 1)); headX = a.state === "sleep" ? .35 : -.05 + Math.sin(t * .4 + a.phase) * .1; }
      if (a.state === "happy"){ bodyY += Math.abs(Math.sin(t * 6)) * .12; headX = -.2; }
      if (a.state === "eat"){ headX = .9 + Math.sin(t * 5) * .15; }
      // swimming ducks/frogs on a river sit on the water
      const wz = waterAt(a);
      let groundY = heightAt(a.pos.x, a.pos.z);
      if (sp.swims && wz != null && Math.abs(a.pos.z - wz) < 6.5){ groundY = -.55 - b.bodyY * .7; b.legs.forEach(l => l.visible = false); } else b.legs.forEach(l => l.visible = true);
      b.root.position.set(a.pos.x, groundY, a.pos.z);
      b.body.position.y = bodyY; b.body.rotation.x = bodyX;
      b.neck.rotation.x += (headX - b.neck.rotation.x) * Math.min(1, dt * 6);
      b.neck.rotation.y = a.state === "idle" ? Math.sin(t * .6 + a.phase) * .4 : 0;
      b.tail.rotation.y = Math.sin(t * (a.state === "happy" ? 14 : 2) + a.phase) * (a.state === "happy" ? .6 : .25);
      b.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * (a.state === "happy" || a.fast ? Math.abs(Math.sin(t * 18)) * .8 : .05));
      b.head.children.forEach(o => { if (o.userData.ear) o.rotation.x = Math.sin(t * 2 + a.phase) * .1; });
      b.root.rotation.y += (wrap(a.yaw - b.root.rotation.y)) * Math.min(1, dt * 5);
    }
  }
  function moveToward(a, target, step){
    const dx = target.x - a.pos.x, dz = target.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d < .2) return true;
    a.yaw = Math.atan2(dx, dz); const s = Math.min(step, d); a.pos.x += dx / d * s; a.pos.z += dz / d * s;
    if (a.react) a.react.moving = d > .3;
    return false;
  }
  const wrap = x => ((x + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  function find(nameOrSpecies){
    if (!nameOrSpecies) return null; const q = String(nameOrSpecies).toLowerCase();
    return list.find(a => a.name && a.name.toLowerCase() === q) || list.find(a => a.id === q) || list.find(a => a.species === q) || list.find(a => q.includes(a.species)) || null;
  }
  // the creature starts an interaction with an animal; returns where the creature should stand
  function interact(a, kind, creatureSpot, faceYaw){
    const front = new THREE.Vector3(Math.sin(faceYaw), 0, Math.cos(faceYaw));
    const goal = creatureSpot.clone().addScaledVector(front, kind === "play_fetch" ? 2.5 : 1.1);
    const shy = a.spec.shy && (a.friendship || 0) < 40;
    a.react = { mode: "approach", goal: { x: goal.x, z: goal.z }, t: 0, until: 600, after: kind === "feed_animals" ? "eat" : kind === "pet_animal" ? "happy" : kind === "brush_animal" ? "idle" : "sit" };
    if (shy && kind === "befriend") a.react.slow = true;
    return goal;
  }
  function release(a){ if (a){ a.react = null; a.state = "idle"; a.t = 2; } }
  function fetchThrow(a, from, to){ if (!a || !a.react) return; a.react.mode = "fetch"; a.react.goal = { x: to.x, z: to.z }; a.react.after = "happy"; a.react.back = { x: from.x, z: from.z }; }
  function fetchReturn(a, to){ if (!a || !a.react) return; a.react.mode = "approach"; a.react.goal = { x: to.x, z: to.z }; a.react.after = "happy"; }
  function near(pos, r){ return list.filter(a => Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < r); }
  function dispose(){ scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  return { list, update, find, interact, release, fetchThrow, fetchReturn, near, dispose, group };
}
export { build as buildAnimal };
