// Detailed procedural buildings. Each builder returns a group whose front faces +Z,
// plus where the door is, where the creature stands, chimney smoke and lights.
import * as THREE from "three";
import { rng } from "./terrain.js";

// ---------- materials & textures ----------
const texCache = new Map(), matCache = new Map();
function canvasTex(key, draw, size = 256){
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t); return t;
}
const hex = c => "#" + new THREE.Color(c).getHexString();
const shadeHex = (c, k) => "#" + new THREE.Color(c).multiplyScalar(k).getHexString();
function plasterTex(color){ return canvasTex("plaster" + color, (g, s) => { g.fillStyle = hex(color); g.fillRect(0, 0, s, s); const R = rng(color);
  for (let i = 0; i < 1800; i++){ g.fillStyle = `rgba(${R() < .5 ? "0,0,0" : "255,255,255"},${R() * .05})`; g.fillRect(R() * s, R() * s, 2 + R() * 5, 2 + R() * 5); } }); }
function woodTex(color){ return canvasTex("wood" + color, (g, s) => { const R = rng(color); for (let i = 0; i < 8; i++){ g.fillStyle = shadeHex(color, .85 + R() * .3); g.fillRect(0, i * s / 8, s, s / 8);
  g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, i * s / 8, s, 2); for (let k = 0; k < 6; k++){ g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(R() * s, i * s / 8 + R() * s / 8, 30 + R() * 60, 1); } } }); }
function tileTex(color){ return canvasTex("tile" + color, (g, s) => { g.fillStyle = shadeHex(color, .55); g.fillRect(0, 0, s, s); const R = rng(color + "t");
  for (let row = 0; row < 8; row++) for (let k = 0; k < 9; k++){ const x = k * 32 + (row % 2) * 16 - 16, y = row * 32; g.fillStyle = shadeHex(color, .85 + R() * .3);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.lineTo(x + 30, y + 22); g.quadraticCurveTo(x + 15, y + 34, x, y + 22); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(x + 3, y + 2, 24, 4); } }); }
function stoneTex(color){ return canvasTex("stone" + color, (g, s) => { g.fillStyle = shadeHex(color, .6); g.fillRect(0, 0, s, s); const R = rng(color + "s");
  for (let row = 0; row < 8; row++) for (let k = 0; k < 5; k++){ const w = 46 + R() * 10, x = k * 56 + (row % 2) * 26 - 20, y = row * 32 + 2; g.fillStyle = shadeHex(color, .8 + R() * .35);
    g.beginPath(); g.roundRect(x, y, w, 28, 5); g.fill(); } }); }
export function mat(color, kind = "plain", repeat = [1, 1]){
  const key = color + kind + repeat.join(",");
  if (matCache.has(key)) return matCache.get(key);
  let m;
  const tex = kind === "plaster" ? plasterTex(color) : kind === "wood" ? woodTex(color) : kind === "tile" ? tileTex(color) : kind === "stone" ? stoneTex(color) : null;
  if (tex){ const t = tex.clone(); t.repeat.set(repeat[0], repeat[1]); t.needsUpdate = true; m = new THREE.MeshStandardMaterial({ map: t, roughness: kind === "tile" ? .75 : .9 }); }
  else m = new THREE.MeshStandardMaterial({ color, roughness: .8 });
  matCache.set(key, m); return m;
}
// windows glow at night; the life loop sets glow each frame
export const glass = new THREE.MeshStandardMaterial({ color: 0x33445e, roughness: .15, metalness: .3, emissive: new THREE.Color("#ffc76a"), emissiveIntensity: 0 });
export const lampGlass = new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: new THREE.Color("#ffc76a"), emissiveIntensity: .2 });
glass.userData.keep = true; lampGlass.userData.keep = true;
export function setNightGlow(k){ glass.emissiveIntensity = k * 1.6; lampGlass.emissiveIntensity = .2 + k * 3; glass.color.setRGB(.2 + .1 * (1 - k), .27, .37); }

// ---------- primitives ----------
function box(w, h, d, m, x = 0, y = 0, z = 0){ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; return b; }
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 16){ const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y + h / 2, z); c.castShadow = c.receiveShadow = true; return c; }
function sph(r, m, x, y, z, seg = 12){ const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .7 | 0)), m); s.position.set(x, y, z); s.castShadow = true; return s; }

export function signTexture(text, wood = "#7a5236"){
  return canvasTex("sign" + text + wood, (g, s) => {
    g.fillStyle = wood; g.fillRect(0, 0, s * 2, s);
    g.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 5; i++) g.fillRect(0, i * s / 5, s * 2, 2);
    g.strokeStyle = "#3d2817"; g.lineWidth = 10; g.strokeRect(5, 5, s * 2 - 10, s - 10);
    g.fillStyle = "#fbf1d8"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = 64; g.font = `bold ${fs}px Georgia, 'Palatino Linotype', serif`; while (g.measureText(text).width > s * 1.8 && fs > 18){ fs -= 4; g.font = `bold ${fs}px Georgia, serif`; }
    g.fillText(text, s, s / 2 + 2);
  }, 256);
}
function hangingSign(name, x, y, z){
  const g = new THREE.Group();
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const ctx = c.getContext("2d");
  ctx.fillStyle = "#7a5236"; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = "rgba(0,0,0,.18)"; for (let i = 0; i < 5; i++) ctx.fillRect(0, i * 51, 512, 3);
  ctx.strokeStyle = "#3d2817"; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 498, 242);
  ctx.fillStyle = "#fbf1d8"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; let fs = 92; ctx.font = `bold ${fs}px Georgia, serif`;
  while (ctx.measureText(name).width > 460 && fs > 24){ fs -= 4; ctx.font = `bold ${fs}px Georgia, serif`; } ctx.fillText(name, 256, 132);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: .8 }), edge = mat("#5a3b24");
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, .9, .08), [edge, edge, edge, edge, face, face]); board.castShadow = true;
  board.position.set(0, -.62, 0); g.add(board);
  g.add(box(.06, .4, .06, mat("#2c2c30"), -.7, -.2, 0)); g.add(box(.06, .4, .06, mat("#2c2c30"), .7, -.2, 0));
  g.add(box(2.1, .08, .08, mat("#2c2c30"), 0, -.04, 0));
  g.position.set(x, y, z); g.userData.swing = true; return g;
}

// ---------- parts ----------
function windowUnit(g, x, y, z, rotY, opts){
  const u = new THREE.Group(); u.position.set(x, y, z); u.rotation.y = rotY;
  const trim = mat(opts.trim), w = opts.ww || 1.1, h = opts.wh || 1.35;
  u.add(box(w + .2, h + .2, .12, trim, 0, -h / 2 - .1, .02));
  const gl = new THREE.Mesh(new THREE.BoxGeometry(w, h, .06), glass); gl.position.set(0, 0, .07); u.add(gl);
  u.add(box(w, .06, .06, trim, 0, -.03, .11)); u.add(box(.06, h, .06, trim, 0, -h / 2, .11));
  u.add(box(w + .4, .1, .26, trim, 0, -h / 2 - .14, .12));
  if (opts.shutters){ const sm = mat(opts.shutters, "wood", [.5, 1]); u.add(box(.5, h, .07, sm, -w / 2 - .32, -h / 2, .05)); u.add(box(.5, h, .07, sm, w / 2 + .32, -h / 2, .05)); }
  if (opts.flowers){ const fb = mat(shadeHex(opts.trim, .7)); u.add(box(w + .2, .26, .3, fb, 0, -h / 2 - .44, .22));
    const cols = ["#e8505b", "#f9d56e", "#ffffff", "#c36ae0", "#ff8fab"]; const R = rng(x + "," + y);
    for (let i = 0; i < 7; i++){ u.add(sph(.09 + R() * .04, mat(cols[Math.floor(R() * cols.length)]), -w / 2 + .1 + i * (w / 6), -h / 2 - .1 + R() * .08, .26 + R() * .08, 6)); }
    for (let i = 0; i < 4; i++) u.add(sph(.12, mat("#3f8a45"), -w / 2 + .2 + i * w / 3, -h / 2 - .17, .3, 6)); }
  g.add(u);
}
function doorUnit(g, x, z, opts){
  const d = new THREE.Group(); d.position.set(x, 0, z);
  const trim = mat(opts.trim), wood = mat(opts.door || "#7a4b2c", "wood", [1, 1.5]);
  d.add(box(1.5, 2.45, .14, trim, 0, .5, .02));
  const hinge = new THREE.Group(); hinge.position.set(-.6, 0, .08); hinge.userData.door = true; d.add(hinge);
  hinge.add(box(1.2, 2.2, .12, wood, .6, .5, 0));
  hinge.add(sph(.06, mat("#d8b15a"), 1.02, 1.55, .09, 8));
  // dark doorway behind the door, seen when it swings open
  d.add(box(1.16, 2.16, .05, new THREE.MeshBasicMaterial({ color: 0x1a1410 }), 0, .52, 0));
  if (opts.arch){ const a = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .14, 16, 1, false, 0, Math.PI), trim); a.rotation.set(Math.PI / 2, 0, Math.PI / 2); a.position.set(0, 2.95, .02); d.add(a); }
  d.add(box(1.9, .25, .9, mat("#9a948a", "stone", [1, .5]), 0, 0, .45)); d.add(box(1.6, .25, .5, mat("#9a948a", "stone", [1, .5]), 0, .25, .3));
  if (opts.awning){ const aw = box(2, .1, .9, mat(opts.awning), 0, 3.05, .45); aw.rotation.x = .25; d.add(aw); }
  g.add(d);
}
function lantern(g, x, y, z){
  const l = new THREE.Group(); l.position.set(x, y, z);
  l.add(box(.06, .06, .35, mat("#2c2c30"), 0, .15, -.15));
  l.add(box(.22, .04, .22, mat("#2c2c30"), 0, .3, 0)); const gl = new THREE.Mesh(new THREE.BoxGeometry(.18, .26, .18), lampGlass); gl.position.y = .15; l.add(gl);
  l.add(box(.24, .04, .24, mat("#2c2c30"), 0, 0, 0)); g.add(l);
  return new THREE.Vector3(x, y + .15, z + .1);
}
function gableRoof(g, w, d, rh, y, color, over = .55){
  const run = d / 2 + over, len = Math.hypot(run, rh), ang = Math.atan2(rh, run), m = mat(color, "tile", [Math.max(1, w / 3), Math.max(1, len / 2.4)]);
  for (const s of [1, -1]){ const p = new THREE.Mesh(new THREE.BoxGeometry(w + over * 2, .22, len), m); p.castShadow = p.receiveShadow = true;
    p.position.set(0, y + rh / 2 + .05, s * run / 2); p.rotation.x = s * ang; g.add(p); }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, w + over * 2 + .1, 8), mat(shadeHex(color, .7))); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, y + rh + .1, 0); ridge.castShadow = true; g.add(ridge);
  return ang;
}
function gableEnds(g, w, d, rh, y, wallM){
  const shape = new THREE.Shape(); shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, rh); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w - .02, bevelEnabled: false }); geo.translate(0, 0, -(w - .02) / 2);
  const m = new THREE.Mesh(geo, wallM); m.rotation.y = Math.PI / 2; m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m);
}
function chimney(g, x, z, top, color){ g.add(box(.9, top, .9, mat(color, "stone", [.5, 2]), x, 0, z)); g.add(box(1.1, .2, 1.1, mat(shadeHex(color, .7)), x, top, z)); return new THREE.Vector3(x, top + .4, z); }
function timber(g, w, d, h, floors, trim){
  const t = mat(trim, "wood", [.2, 1]), fh = h / floors;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.22, h, .22, t, sx * (w / 2 - .02), .5, sz * (d / 2 - .02)));
  for (let f = 1; f <= floors; f++){ g.add(box(w + .1, .2, .1, t, 0, .5 + f * fh - .2, d / 2 + .02)); g.add(box(w + .1, .2, .1, t, 0, .5 + f * fh - .2, -d / 2 - .02));
    g.add(box(.1, .2, d + .1, t, w / 2 + .02, .5 + f * fh - .2, 0)); g.add(box(.1, .2, d + .1, t, -w / 2 - .02, .5 + f * fh - .2, 0)); }
  if (floors > 1){ for (const sx of [-1, 1]){ const br = box(.16, fh * 1.15, .1, t, sx * (w / 2 - .7), .5 + fh, d / 2 + .04); br.rotation.z = sx * .55; br.position.y = .5 + fh * 1.5; g.add(br); } }
}

// ---------- the house family ----------
function house(p, o){
  const g = new THREE.Group(), w = o.w, d = o.d, floors = o.floors, fh = 3.1, h = floors * fh;
  const wall = mat(p.wall, o.walls || "plaster", [w / 3, h / 3]), trim = o.trim || shadeHex(p.roof, .55);
  g.add(box(w + .5, .5, d + .5, mat("#8f8a80", "stone", [w / 2, .3])));
  const body = box(w, h, d, wall, 0, .5, 0); g.add(body);
  if (o.frame) timber(g, w, d, h, floors, trim);
  const winOpts = { trim: o.winTrim || "#f3ecdf", shutters: o.shutters ? p.roof : null, flowers: o.flowers };
  for (let f = 0; f < floors; f++){
    const y = .5 + f * fh + 2.1, n = Math.max(2, Math.floor(w / 2.6));
    for (let i = 0; i < n; i++){ const x = -w / 2 + (i + .5) * (w / n); if (f === 0 && Math.abs(x) < 1.2) continue;
      windowUnit(g, x, y, d / 2 + .01, 0, { ...winOpts, flowers: o.flowers && f > 0 || (o.flowers && f === 0 && floors === 1) }); }
    for (const s of [1, -1]) for (let i = 0; i < Math.max(1, Math.floor(d / 3.2)); i++){ const zz = -d / 2 + (i + .5) * (d / Math.max(1, Math.floor(d / 3.2)));
      windowUnit(g, s * (w / 2 + .01), y, zz, s * Math.PI / 2, { ...winOpts, flowers: false }); }
    windowUnit(g, 0, y, -d / 2 - .01, Math.PI, { ...winOpts, flowers: false });
  }
  doorUnit(g, 0, d / 2, { trim: winOpts.trim, door: o.door, arch: o.arch, awning: o.awning });
  const lights = [lantern(g, 1.15, 2.4, d / 2 + .2)];
  let roofTop = .5 + h;
  if (o.roof === "gable"){ const rh = o.roofH || d * .45; gableEnds(g, w, d, rh, .5 + h, wall); gableRoof(g, w, d, rh, .5 + h, p.roof); roofTop += rh; }
  else if (o.roof === "hip"){ const rh = o.roofH || 2.6; const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + .6, rh, 4), mat(p.roof, "tile", [3, 2])); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414); r.position.y = .5 + h + rh / 2; r.castShadow = true; g.add(r); roofTop += rh; }
  else { g.add(box(w + .5, .35, d + .5, mat(shadeHex(p.roof, .9)), 0, .5 + h, 0)); g.add(box(w + .6, .5, .2, mat(p.roof), 0, .5 + h + .3, d / 2 + .2)); roofTop += .8; }
  const smoke = o.chimney === false ? [] : [chimney(g, w / 2 - 1.2, -d / 4, roofTop - .3 + 1, "#8a7d70")];
  return { group: g, w, d, top: roofTop + 1.2, smoke, lights };
}

// ---------- special buildings ----------
function tower(p){
  const g = new THREE.Group(), r = 3, h = 12, stone = mat(p.wall, "stone", [4, 4]);
  g.add(cyl(r + .4, r + .6, .6, mat("#8f8a80", "stone", [5, .3]), 0, 0, 0, 20));
  g.add(cyl(r, r + .2, h, stone, 0, .5, 0, 20));
  for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + .4; windowUnit(g, Math.sin(a) * (r + .02), 4 + i * 2.2, Math.cos(a) * (r + .02), a, { trim: "#e8e1d3", ww: .8, wh: 1.4 }); }
  for (let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; g.add(box(.7, .8, .5, stone, Math.sin(a) * (r + .1), h + .5, Math.cos(a) * (r + .1))); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r + .8, 6, 20), mat(p.roof, "tile", [6, 3])); roof.position.y = h + .5 + 3.4; roof.castShadow = true; g.add(roof);
  g.add(cyl(.05, .05, 1.6, mat("#3a3a40"), 0, h + 6.3, 0, 6)); const flag = box(.9, .5, .03, mat(p.roof), .45, h + 7.2, 0); flag.userData.flag = true; g.add(flag);
  doorUnit(g, 0, r - .05, { trim: "#e8e1d3", arch: true, door: "#5b3a22" });
  const lights = [lantern(g, 1.1, 2.4, r + .15)];
  return { group: g, w: 7, d: 7, top: h + 9, smoke: [], lights, doorZ: r };
}
function observatory(p){
  const g = new THREE.Group(), r = 4.2;
  g.add(cyl(r + .4, r + .6, .6, mat("#8f8a80", "stone", [6, .3]), 0, 0, 0, 24));
  g.add(cyl(r, r, 4.4, mat(p.wall, "plaster", [5, 2]), 0, .5, 0, 24));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r + .1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: p.roof, roughness: .35, metalness: .55 })); dome.position.y = 4.9; dome.castShadow = true; g.add(dome);
  const slit = box(1.1, .1, r + .3, mat("#1e2235"), 0, 4.9 + r * .55, -.3); slit.rotation.x = -.55; g.add(slit);
  const scope = cyl(.35, .45, 3.2, mat("#c9a24a"), 0, 0, 0, 12); scope.position.set(0, 4.9 + r * .7, 1.2); scope.rotation.x = .7; g.add(scope);
  for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2 + .5; windowUnit(g, Math.sin(a) * (r + .01), 3.4, Math.cos(a) * (r + .01), a, { trim: "#e8e1d3", ww: .7, wh: .9 }); }
  doorUnit(g, 0, r - .05, { trim: "#e8e1d3", arch: true });
  const lights = [lantern(g, 1.1, 2.4, r + .15)];
  return { group: g, w: 9, d: 9, top: 11, smoke: [], lights, doorZ: r };
}
function windmill(p){
  const g = new THREE.Group();
  g.add(cyl(3.6, 3.9, .6, mat("#8f8a80", "stone", [6, .3]), 0, 0, 0, 16));
  g.add(cyl(2.3, 3.3, 9, mat(p.wall, "plaster", [4, 3]), 0, .5, 0, 16));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.9, 3.2, 16), mat(p.roof, "tile", [4, 2])); cap.position.y = 9.5 + 1.6; cap.castShadow = true; g.add(cap);
  const hub = new THREE.Group(); hub.position.set(0, 9.6, 2.7); g.add(hub);
  hub.add(sph(.45, mat("#5a3b24"), 0, 0, 0, 10));
  for (let i = 0; i < 4; i++){ const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; hub.add(arm);
    arm.add(box(.18, 6.2, .18, mat("#6b4a2e"), 0, .2, 0));
    const sail = box(1.4, 5, .06, mat("#efe6d2"), .8, 1.2, .05); arm.add(sail);
    for (let k = 0; k < 5; k++) arm.add(box(1.5, .05, .08, mat("#6b4a2e"), .8, 1.3 + k * 1.1, .08)); }
  hub.userData.spin = .6;
  for (let i = 0; i < 3; i++) windowUnit(g, 0, 3 + i * 2.4, 3.2 - i * .3, 0, { trim: "#f3ecdf", ww: .7, wh: .9, shutters: p.roof });
  doorUnit(g, 0, 3.15, { trim: "#f3ecdf", arch: true });
  const lights = [lantern(g, 1.1, 2.4, 3.4)];
  return { group: g, w: 8, d: 8, top: 14, smoke: [], lights, spinners: [hub], doorZ: 3.2 };
}
function greenhouse(p){
  const g = new THREE.Group(), w = 9, d = 6, h = 3;
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfeef0, roughness: .05, metalness: .1, transparent: true, opacity: .32, depthWrite: false });
  const frame = mat(p.roof);
  g.add(box(w + .3, .4, d + .3, mat("#8f8a80", "stone", [3, .3])));
  const gl = box(w, h, d, glassM, 0, .4, 0); gl.castShadow = false; g.add(gl);
  for (let i = 0; i <= 6; i++){ const x = -w / 2 + i * w / 6; g.add(box(.1, h, .1, frame, x, .4, d / 2)); g.add(box(.1, h, .1, frame, x, .4, -d / 2)); }
  const roofShape = new THREE.Shape(); roofShape.moveTo(-d / 2, 0); roofShape.lineTo(d / 2, 0); roofShape.lineTo(0, 2); roofShape.closePath();
  const rg = new THREE.ExtrudeGeometry(roofShape, { depth: w, bevelEnabled: false }); rg.translate(0, 0, -w / 2);
  const rm = new THREE.Mesh(rg, glassM); rm.rotation.y = Math.PI / 2; rm.position.y = h + .4; g.add(rm);
  g.add(box(w + .2, .12, .12, frame, 0, h + 2.4, 0));
  const R = rng(p.id);
  for (let i = 0; i < 18; i++){ const x = -w / 2 + .8 + R() * (w - 1.6), z = -d / 2 + .8 + R() * (d - 1.6);
    g.add(cyl(.25, .2, .4, mat("#b0623a"), x, .4, z, 8)); g.add(sph(.35 + R() * .3, mat(["#3f8a45", "#57a65a", "#2f6e3a"][i % 3]), x, 1.1 + R() * .4, z, 8));
    if (R() < .5) g.add(sph(.1, mat(["#e8505b", "#f9d56e", "#ff8fab"][i % 3]), x + .2, 1.4, z, 6)); }
  doorUnit(g, 0, d / 2, { trim: p.roof });
  return { group: g, w, d, top: 6.2, smoke: [], lights: [] };
}
function bandstand(p){
  const g = new THREE.Group(), r = 4.2;
  g.add(cyl(r + .3, r + .4, .7, mat(p.wall, "stone", [6, .3]), 0, 0, 0, 8));
  g.add(cyl(r, r, .1, mat("#9a6b43", "wood", [3, 3]), 0, .7, 0, 8));
  for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + Math.PI / 8; g.add(cyl(.14, .16, 3.4, mat("#f3ecdf"), Math.sin(a) * (r - .3), .75, Math.cos(a) * (r - .3), 8));
    if (i !== 0){ const rail = box(2.9, .1, .1, mat("#f3ecdf"), Math.sin(a + Math.PI / 8) * (r - .4), 1.6, Math.cos(a + Math.PI / 8) * (r - .4)); rail.rotation.y = a + Math.PI / 8 + Math.PI / 2; g.add(rail); } }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r + .8, 2.6, 8), mat(p.roof, "tile", [5, 2])); roof.position.y = .75 + 3.4 + 1.3; roof.rotation.y = Math.PI / 8; roof.castShadow = true; g.add(roof);
  g.add(sph(.3, mat("#d8b15a"), 0, .75 + 3.4 + 2.8, 0, 10));
  g.add(buildPiano(0, .8, -1.2, 0));
  const lights = []; for (let i = 0; i < 8; i += 2){ const a = i / 8 * Math.PI * 2 + Math.PI / 8; lights.push(lantern(g, Math.sin(a) * (r - .3), 3.2, Math.cos(a) * (r - .3))); }
  return { group: g, w: 10, d: 10, top: 9, smoke: [], lights, spot: new THREE.Vector3(0, .8, -.2), hasPiano: true, doorZ: r };
}
export function buildPiano(x, y, z, rot){
  const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: .25, metalness: .1 });
  g.add(box(1.6, 1.25, .6, body, 0, .0, -.05));
  g.add(box(1.6, .08, .5, body, 0, .72, .38));
  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.48, .05, .26), new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: .4 })); keys.position.set(0, .77, .42); g.add(keys);
  for (let i = 0; i < 20; i++){ if ([2, 6, 9, 13, 16].includes(i % 21)) continue; const k = box(.035, .04, .14, body, -.7 + i * .074, .79, .36); g.add(k); }
  g.add(box(.08, .7, .08, body, -.72, 0, .55)); g.add(box(.08, .7, .08, body, .72, 0, .55));
  { const music = box(1.0, .06, .3, mat("#e9dcc0"), 0, 1.1, .17); music.rotation.x = -.25; g.add(music); }
  const bench = new THREE.Group(); bench.position.set(0, 0, 1.05); bench.add(box(.9, .08, .4, mat("#3b2a1f", "wood", [1, .3]), 0, .48, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bench.add(box(.06, .48, .06, mat("#2a1d15"), sx * .38, 0, sz * .15)); g.add(bench);
  g.position.set(x, y, z); g.rotation.y = rot; g.userData.isPiano = true; return g;
}
function tentCamp(p, models){
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.ConeGeometry(3, 3.4, 4), mat(p.wall, "plain")); t.rotation.y = Math.PI / 4; t.position.set(0, 1.7, -1); t.castShadow = true; g.add(t);
  const flap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2, 3), mat(shadeHex(p.wall, .5))); flap.position.set(0, 1, 1.0); g.add(flap);
  g.add(cyl(.05, .05, 4, mat("#6b4a2e"), 0, 0, -1, 5));
  return { group: g, w: 7, d: 7, top: 4.5, smoke: [], lights: [], campfire: new THREE.Vector3(2.6, 0, 2.2) };
}


// ---------- small structures the creature builds first ----------
function leanto(p){
  const g = new THREE.Group(), wood = mat("#7a5a3a", "wood", [.3, 1]), thatch = mat("#b89a5a", "wood", [2, 1]);
  for (const sx of [-1.6, 1.6]){ const post = cyl(.1, .12, 2.4, wood, sx, 0, 1, 6); g.add(post); }
  const ridge = cyl(.09, .09, 3.6, wood, 0, 0, 0, 6); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 2.4, 1); g.add(ridge);
  for (let i = -3; i <= 3; i++){ const pole = cyl(.06, .07, 3, wood, i * .5, 0, 0, 5); pole.position.set(i * .5, 1.2, -.1); pole.rotation.x = -1.0; g.add(pole); }
  const roof = box(3.4, .12, 3.1, thatch, 0, 0, 0); roof.position.set(0, 1.25, -.15); roof.rotation.x = -1.0; g.add(roof);
  const bed = box(1.2, .14, 2, mat("#8a9a4a"), 0, 0, -.3); g.add(bed);
  return { group: g, w: 4, d: 4, top: 3, smoke: [], lights: [], spot: new THREE.Vector3(0, 0, 1.6), bed: new THREE.Vector3(0, .1, -.3) };
}
function workbenchS(p){
  const g = new THREE.Group(), wood = mat("#8a5a36", "wood", [1, .4]), dark = mat("#4d3220");
  g.add(box(2.4, .12, 1, wood, 0, .9, 0)); for (const sx of [-1.05, 1.05]) for (const sz of [-.4, .4]) g.add(box(.12, .9, .12, dark, sx, 0, sz));
  g.add(box(2.2, .06, .8, dark, 0, .3, 0));
  const saw = box(.6, .1, .02, mat("#c9ccd2"), -.6, 1.02, .2); saw.rotation.y = .3; g.add(saw);
  g.add(box(.08, .25, .08, mat("#c9a06a"), .6, 1.02, .1)); g.add(box(.22, .08, .08, mat("#555"), .6, 1.25, .1));
  // sawhorse beside it
  const sh = new THREE.Group(); sh.position.set(2.1, 0, .3); g.add(sh);
  sh.add(box(1.4, .1, .14, wood, 0, .65, 0)); for (const sx of [-.55, .55]) for (const s of [-1, 1]){ const l = box(.08, .72, .08, dark, sx, 0, s * .15); l.rotation.x = s * .3; sh.add(l); }
  return { group: g, w: 5, d: 3, top: 1.6, smoke: [], lights: [], spot: new THREE.Vector3(0, 0, 1.0) };
}
function kiln(p){
  const g = new THREE.Group(), stone = mat("#9a8f80", "stone", [2, 1]), clay = mat("#b0623a", "plaster", [2, 2]);
  g.add(cyl(1.4, 1.6, .7, stone, 0, 0, 0, 14));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay); dome.position.y = .7; dome.castShadow = true; g.add(dome);
  g.add(cyl(.25, .3, .9, clay, 0, 1.9, 0, 10));
  const mouth = box(.7, .55, .2, new THREE.MeshStandardMaterial({ color: 0x1a0d08, emissive: new THREE.Color("#ff6a20"), emissiveIntensity: .6 }), 0, .35, 1.3); mouth.userData.glow = true; g.add(mouth);
  return { group: g, w: 4, d: 4, top: 3, smoke: [new THREE.Vector3(0, 2.9, 0)], lights: [], spot: new THREE.Vector3(0, 0, 2.2) };
}
function forge(p){
  const g = new THREE.Group(), stone = mat("#8a8580", "stone", [2, 1]), brick = mat("#a0503a", "stone", [2, 2]);
  g.add(box(2.2, .9, 1.6, stone, 0, 0, 0)); g.add(box(1.4, .1, 1, new THREE.MeshStandardMaterial({ color: 0x220a04, emissive: new THREE.Color("#ff5a10"), emissiveIntensity: .8 }), 0, .9, 0));
  g.add(box(.9, 2.6, .9, brick, 0, .9, -.4)); g.add(box(1.1, .2, 1.1, stone, 0, 3.5, -.4));
  const anvil = new THREE.Group(); anvil.position.set(1.8, 0, .9); g.add(anvil); const iron = new THREE.MeshStandardMaterial({ color: 0x3a3c42, metalness: .8, roughness: .4 });
  anvil.add(cyl(.25, .3, .5, mat("#6b4a2e"), 0, 0, 0, 8)); anvil.add(box(.6, .25, .26, iron, 0, .5, 0));
  return { group: g, w: 4, d: 4, top: 3.8, smoke: [new THREE.Vector3(0, 3.8, -.4)], lights: [], spot: new THREE.Vector3(1.8, 0, 1.8) };
}
function fireRing(p){
  const g = new THREE.Group(); for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(.22, 0), mat("#8a8580")); s.position.set(Math.cos(a) * .75, .1, Math.sin(a) * .75); s.castShadow = true; g.add(s); }
  for (const r of [0, 1.3]){ const log = cyl(.14, .14, 1.6, mat("#6b4a2e", "wood", [.3, 1]), 0, 0, 0, 7); log.rotation.z = Math.PI / 2; log.rotation.y = r; log.position.set(Math.cos(r + 1) * 1.9, .16, Math.sin(r + 1) * 1.9); g.add(log); }
  return { group: g, w: 5, d: 5, top: 1, smoke: [], lights: [], spot: new THREE.Vector3(0, 0, 2.2), fire: new THREE.Vector3(0, 0, 0) };
}
function camp(p){
  const g = new THREE.Group(); const r = fireRing(p); g.add(r.group);
  const leaves = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, .15, 12), mat("#8a7a3a")); leaves.scale.z = 1.6; leaves.position.set(-2.8, .07, -1); leaves.castShadow = leaves.receiveShadow = true; g.add(leaves);
  const R = rng("leaves"); for (let i = 0; i < 18; i++){ const l = new THREE.Mesh(new THREE.CircleGeometry(.14, 5), mat(["#c98a3a", "#a86a2a", "#8a9a4a", "#d0a040"][i % 4])); l.rotation.x = -Math.PI / 2; l.rotation.z = R() * 6; l.position.set(-2.8 + (R() - .5) * 1.8, .16, -1 + (R() - .5) * 3); g.add(l); }
  return { group: g, w: 7, d: 7, top: 1.2, smoke: [], lights: [], spot: new THREE.Vector3(0, 0, 2.2), bed: new THREE.Vector3(-2.8, .15, -1), fire: new THREE.Vector3(0, 0, 0) };
}
export const SMALL_KINDS = ["camp", "leanto", "workbench", "kiln", "forge", "campfire"];
export function buildSmall(p){
  switch (p.kind){ case "camp": return camp(p); case "leanto": return leanto(p); case "workbench": return workbenchS(p); case "kiln": return kiln(p); case "forge": return forge(p); case "campfire": return fireRing(p); }
  return null;
}

// ---------- kind table ----------
export const BUILDING_KINDS = ["house", "cottage", "townhouse", "tower", "observatory", "shop", "cafe", "bakery", "library", "workshop", "barn", "windmill", "greenhouse", "bandstand", "tent"];
export function buildBuilding(p, models){
  const R = rng(p.id);
  switch (p.kind){
    case "cottage": return house(p, { w: 7, d: 6, floors: 1, roof: "gable", roofH: 3.4, frame: true, shutters: true, flowers: true, door: "#5b8a52" });
    case "townhouse": return house(p, { w: 7, d: 7, floors: 3, roof: "gable", roofH: 2.6, frame: R() < .5, shutters: true, flowers: true });
    case "tower": return tower(p);
    case "observatory": return observatory(p);
    case "shop": return house(p, { w: 8.5, d: 6.5, floors: 2, roof: "gable", roofH: 2.4, shutters: false, flowers: true, awning: p.roof, frame: true });
    case "cafe": return house(p, { w: 8.5, d: 7, floors: 1, roof: "hip", roofH: 2.6, flowers: true, awning: p.roof, winTrim: "#fbf6ea" });
    case "bakery": return house(p, { w: 8, d: 7, floors: 1, roof: "gable", roofH: 3, frame: true, flowers: true, awning: "#e8d3b0", door: "#7a4b2c" });
    case "library": return house(p, { w: 11, d: 8, floors: 2, roof: "hip", roofH: 3.2, walls: "stone", arch: true, chimney: false, winTrim: "#efe7d6" });
    case "workshop": return house(p, { w: 9, d: 7, floors: 1, roof: "gable", roofH: 2.8, walls: "wood", door: "#4d3220" });
    case "barn": return house(p, { w: 10, d: 8, floors: 1, roof: "gable", roofH: 4.4, walls: "wood", door: "#f3ecdf", chimney: false, winTrim: "#f3ecdf" });
    case "windmill": return windmill(p);
    case "greenhouse": return greenhouse(p);
    case "bandstand": return bandstand(p);
    case "tent": return tentCamp(p, models);
    default: return house(p, { w: 8, d: 7, floors: 2, roof: "gable", roofH: 3, frame: R() < .6, shutters: R() < .7, flowers: true });
  }
}
export { hangingSign, lantern, box, cyl, sph };
