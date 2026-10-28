// Ground, hills, mountains, the river, cobbled paths and swaying grass.
import * as THREE from "three";
import { wind } from "./assets.js";

// ---------- noise ----------
export function rng(seed){ let h = 2166136261 >>> 0; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeNoise(seed){
  const R = rng(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => { const u = (h & 1) ? x : -x, v = (h & 2) ? y : -y; return (h & 4) ? u + v : (u + v) * .7; };
  return (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), a = p[X] + Y, b = p[X + 1] + Y;
    return lerp(lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u), lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u), v); };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- terrain shape ----------
export const TOWN = { rx: 100, rz: 64 };
export function riverZ(x){ return 54 + Math.sin(x * .028) * 7 + Math.sin(x * .071 + 1) * 2.5; }
let N = makeNoise("little-life"), hasRiver = true;
export function configureTerrain(seed, river){ N = makeNoise(seed); hasRiver = river; }
export function heightAt(x, z){
  const fbm = (x, z) => N(x * .012, z * .012) * .6 + N(x * .031, z * .031) * .3 + N(x * .08, z * .08) * .1;
  const e = Math.sqrt((x / TOWN.rx) ** 2 + (z / TOWN.rz) ** 2);
  let h = fbm(x, z) * .5 * (1 - smooth(.6, 1, e) * 0) ;                  // gentle ripples in town
  h += smooth(1.0, 1.9, e) * (9 + fbm(x + 300, z - 200) * 16);            // rolling hills around town
  const far = Math.hypot(x, z);
  h += smooth(230, 380, far) * (45 + N(x * .006, z * .006) * 55 + Math.abs(N(x * .02, z * .02)) * 25);  // mountains
  if (hasRiver){
    const d = Math.abs(z - riverZ(x));
    h = h * smooth(6, 16, d) + (-2.4 + Math.min(d, 6) * .25) * (1 - smooth(6, 16, d));
  }
  return h;
}

// ---------- terrain mesh ----------
// a light, tileable speckle texture (little blades, specks and soft patches) multiplied over the ground colours
function groundDetail(){
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d");
  g.fillStyle = "#f8f8f8"; g.fillRect(0, 0, S, S);
  const R = rng("ground-detail");
  const wrap = (fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]){ g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  for (let i = 0; i < 70; i++){ const x = R() * S, y = R() * S, r = 10 + R() * 26, v = 215 + Math.floor(R() * 40);
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${v},${v},${v},.55)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }); }
  for (let i = 0; i < 900; i++){ const x = R() * S, y = R() * S, l = 3 + R() * 6, a = -Math.PI / 2 + (R() - .5) * .9, v = R() < .5 ? 190 + Math.floor(R() * 30) : 255;
    wrap(() => { g.strokeStyle = `rgba(${v},${v},${v},.7)`; g.lineWidth = 1 + R() * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }); }
  for (let i = 0; i < 300; i++){ const x = R() * S, y = R() * S, v = 175 + Math.floor(R() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 160); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function buildTerrain(scene, palette, quality){
  const size = 900, seg = quality === "low" ? 220 : 340;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const grass = new THREE.Color("#5f9a2c").lerp(new THREE.Color(palette.ground), .15), grassDark = new THREE.Color("#3f7424"), meadow = new THREE.Color("#93bf3e");
  const sand = new THREE.Color("#d9c99a"), rock = new THREE.Color("#8d8a85"), snow = new THREE.Color("#f4f6fa"), dirt = new THREE.Color("#8a6f52"), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z); pos.setY(i, h);
    const slope = Math.abs(heightAt(x + 1.5, z) - h) + Math.abs(heightAt(x, z + 1.5) - h);
    const n = N(x * .05, z * .05) * .5 + .5;
    c.copy(grass).lerp(grassDark, n * .55).lerp(meadow, Math.max(0, N(x * .013 + 9, z * .013) * .8));
    if (hasRiver){ const d = Math.abs(z - riverZ(x)); if (d < 11) c.lerp(sand, smooth(11, 7, d)); if (d < 6.5) c.lerp(dirt, .5); }
    if (slope > 1.1) c.lerp(rock, smooth(1.1, 2.4, slope));
    if (h > 60) c.lerp(snow, smooth(60, 85, h));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, map: groundDetail() });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.name = "terrain";
  scene.add(mesh);
  return mesh;
}

// ---------- water ----------
function waterNormalTexture(){
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s; const g = cv.getContext("2d");
  const img = g.createImageData(s, s), n = makeNoise("water");
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++){
    const f = (a, b) => n(a / 18, b / 18) * .6 + n(a / 7, b / 7) * .4;
    const dx = f(x + 1, y) - f(x - 1, y), dy = f(x, y + 1) - f(x, y - 1), i = (y * s + x) * 4;
    img.data[i] = 128 + dx * 160; img.data[i + 1] = 128 + dy * 160; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export const waterAnim = [];
export function waterMaterial(color){
  const nm = waterNormalTexture(); nm.repeat.set(6, 6);
  const m = new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: 0, transparent: true, opacity: .88, normalMap: nm, normalScale: new THREE.Vector2(.35, .35) });
  m.userData.keep = true; waterAnim.push(nm); return m;
}
export function updateWater(dt){ for (const t of waterAnim){ t.offset.x += dt * .012; t.offset.y += dt * .007; } }

export function buildRiver(scene, palette){
  if (!hasRiver) return null;
  const pts = []; for (let x = -460; x <= 460; x += 4) pts.push({ x, z: riverZ(x) });
  const geo = ribbonGeometry(pts, 15, () => -.55, 30);
  const mesh = new THREE.Mesh(geo, waterMaterial(palette.water)); mesh.receiveShadow = true; mesh.name = "river";
  scene.add(mesh); return mesh;
}

// ---------- ribbons (paths, river) ----------
export function ribbonGeometry(pts, width, yAt, uvScale = 4){
  const pos = [], uv = [], idx = []; let len = 0;
  for (let i = 0; i < pts.length; i++){
    const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    const dx = q.x - o.x, dz = q.z - o.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L * width / 2, nz = dx / L * width / 2;
    if (i) len += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    pos.push(p.x + nx, yAt(p.x + nx, p.z + nz), p.z + nz, p.x - nx, yAt(p.x - nx, p.z - nz), p.z - nz);
    uv.push(0, len / uvScale, 1, len / uvScale);
    if (i){ const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function cobbleTexture(base){
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s; const g = cv.getContext("2d");
  const c = new THREE.Color(base); g.fillStyle = "#" + c.clone().multiplyScalar(.62).getHexString(); g.fillRect(0, 0, s, s);
  const R = rng("cobble");
  for (let row = 0; row < 10; row++) for (let k = 0; k < 7; k++){
    const w = 30 + R() * 10, h = 22 + R() * 6, x = k * 38 + (row % 2) * 18 + R() * 4 - 10, y = row * 26 + R() * 3;
    const shade = .82 + R() * .3; g.fillStyle = "#" + c.clone().multiplyScalar(shade).getHexString();
    g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
    g.fillStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.roundRect(x + 3, y + 2, w - 8, h * .4, 5); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function buildPaths(scene, curves, palette){
  const mat = new THREE.MeshStandardMaterial({ map: cobbleTexture(palette.path), roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 });
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.path).multiplyScalar(.55), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const group = new THREE.Group(); group.name = "paths";
  for (const pts of curves){
    const e = new THREE.Mesh(ribbonGeometry(pts, 3.4, (x, z) => heightAt(x, z) + .04, 3.2), edge); e.receiveShadow = true; group.add(e);
    const m = new THREE.Mesh(ribbonGeometry(pts, 2.7, (x, z) => heightAt(x, z) + .07, 2.7), mat); m.receiveShadow = true; group.add(m);
  }
  scene.add(group); return group;
}

// ---------- grass ----------
export function buildGrass(scene, palette, count, blocked){
  const blade = new THREE.BufferGeometry();
  const bp = [ -.05,0,0,  .05,0,0,  -.035,.45,0,  .035,.45,0,  0,1,0 ];
  blade.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
  blade.setIndex([0,1,2, 1,3,2, 2,3,4]);
  const bc = new THREE.Color(palette.ground).lerp(new THREE.Color("#86c95a"), .35);
  const dark = bc.clone().multiplyScalar(.86), tip = bc.clone().lerp(new THREE.Color("#b9dc6e"), .3);
  const vc = []; for (const y of [0,0,.45,.45,1]){ const c = dark.clone().lerp(tip, y); vc.push(c.r, c.g, c.b); }
  blade.setAttribute("color", new THREE.Float32BufferAttribute(vc, 3));
  blade.computeVertexNormals();
  // a little self-light so blades seen from their shady side stay green instead of going black
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: bc.clone().multiplyScalar(.32) }); mat.userData.keep = true;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWindTime = wind.time; sh.uniforms.uWindStrength = wind.strength;
    sh.vertexShader = "uniform float uWindTime;\nuniform float uWindStrength;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ipG = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ipG = vec3(0.0);
      #endif
      float wG = sin(uWindTime * 1.8 + ipG.x * .35 + ipG.z * .22) * .5 + sin(uWindTime * 3.1 + ipG.x * .9) * .2 + .25;
      transformed.x += wG * position.y * position.y * .35 * uWindStrength;
      transformed.z += cos(uWindTime * 1.4 + ipG.z * .4) * position.y * position.y * .12 * uWindStrength;
    `).replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif");
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count); mesh.receiveShadow = true; mesh.name = "grass";
  const R = rng("grass"), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  let n = 0, tries = 0;
  while (n < count && tries < count * 4){
    tries++;
    // denser near the middle of town, thinning out across the hills
    const r = Math.pow(R(), .7) * 175, a = R() * Math.PI * 2, x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r * .85;
    if (blocked(x, z)) continue;
    const h = heightAt(x, z); if (h > 30) continue;
    if (Math.abs(heightAt(x + 1, z) - h) > 1) continue;
    p.set(x, h - .02, z); e.set((R() - .5) * .3, R() * Math.PI, (R() - .5) * .3); q.setFromEuler(e);
    const hh = .35 + R() * .55; s.set(1 + R() * .6, hh, 1);
    m.compose(p, q, s); mesh.setMatrixAt(n, m);
    col.setHSL(0, 0, .85 + R() * .3); mesh.setColorAt(n, col);
    n++;
  }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  scene.add(mesh); return mesh;
}
