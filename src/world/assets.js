// Loads the Kenney CC0 models, sizes them by their real bounds, and batches static copies
// into a few merged meshes so thousands of objects stay cheap to draw.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const loader = new GLTFLoader();
const cache = new Map();
let list = [];

export async function loadModelList(){
  try {
    const txt = await (await fetch("app://local/assets/models/LIST.txt")).text();
    list = txt.split(/\r?\n/).map(s => s.trim().replace(/\\/g, "/")).filter(s => /\.(glb|gltf)$/i.test(s));
  } catch(e){ console.warn("model list missing", e); list = []; }
  return list;
}
// find a model path: kit prefix + exact base name, or a regex fallback
export function find(kit, ...names){
  for (const n of names){
    if (n instanceof RegExp){ const hit = list.find(p => p.startsWith(kit + "/") && n.test(p)); if (hit) return hit; }
    else { const hit = list.find(p => p.startsWith(kit + "/") && p.replace(/^.*\//, "").replace(/\.(glb|gltf)$/i, "") === n); if (hit) return hit; }
  }
  return null;
}
export function findAll(kit, re){ return list.filter(p => p.startsWith(kit + "/") && re.test(p)); }

export function load(path){
  if (!path) return Promise.resolve(null);
  if (cache.has(path)) return cache.get(path);
  const p = new Promise(res => {
    loader.load("app://local/assets/models/" + path, gltf => {
      const root = gltf.scene;
      root.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true;
        const geo = o.geometry;
        // foliage packs often store wind weights in vertex colours (dark near the stem): never let those tint the model black
        if (geo && geo.attributes.color){ const c = geo.attributes.color, n = Math.min(c.count, 400); let sum = 0;
          for (let i = 0; i < n; i++) sum += c.getX(i) * .3 + c.getY(i) * .59 + c.getZ(i) * .11;
          const mats0 = Array.isArray(o.material) ? o.material : [o.material];
          if (sum / Math.max(1, n) < .55 || path.startsWith("quaternius")) mats0.forEach(m => { if (m) m.vertexColors = false; }); }
        if (geo && !geo.attributes.normal) geo.computeVertexNormals();
        // red/autumn leaf textures: mark them so the cartoon pass can turn them green (a few trees keep the red as accents)
        for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && m.map && m.alphaTest > 0 && redLeaves(m.map)) m.userData.recolor = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace; if (m){ m.roughness = Math.max(m.roughness ?? .8, .55); m.metalness = Math.min(m.metalness ?? 0, .2); } }); } });
      const box = new THREE.Box3().setFromObject(root);
      res({ root, box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) });
    }, undefined, err => { console.warn("model failed", path, err); res(null); });
  });
  cache.set(path, p);
  return p;
}
export async function preload(paths){ await Promise.all([...new Set(paths.filter(Boolean))].map(load)); }

// A placed copy, normalized: feet on y=0, centered, scaled so its height (or width) matches.
export function place(model, { height, width, scale, x = 0, y = 0, z = 0, rot = 0, tilt = 0 } = {}){
  if (!model) return null;
  const inner = model.root.clone(true);
  let s = scale || 1;
  if (height) s = height / Math.max(model.size.y, 1e-3);
  else if (width) s = width / Math.max(model.size.x, model.size.z, 1e-3);
  inner.position.set(-model.center.x * s, -model.box.min.y * s, -model.center.z * s);
  inner.scale.setScalar(s);
  const g = new THREE.Group(); g.add(inner);
  g.position.set(x, y, z); g.rotation.set(tilt, rot, 0);
  g.userData.scale = s;
  return g;
}

// ---------- static batching ----------
// Everything added to a Batch is flattened into world space and merged per material.
export class Batch {
  constructor(name){ this.name = name; this.items = []; }
  add(obj){ if (obj) this.items.push(obj); return obj; }
  build(parent, { castShadow = true, receiveShadow = true, windy = null } = {}){
    const groups = new Map();
    const tmp = new THREE.Group(); tmp.updateMatrixWorld(true);
    for (const obj of this.items){
      obj.updateMatrixWorld(true);
      obj.traverse(m => {
        if (!m.isMesh || !m.geometry) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        if (mats.length > 1 || m.geometry.groups.length > 1){
          // split multi-material meshes by group
          const geo = m.geometry;
          for (const grp of geo.groups){
            const mat = mats[grp.materialIndex] || mats[0];
            const sub = geo.clone(); sub.clearGroups();
            const idx = geo.index ? Array.from(geo.index.array.slice(grp.start, grp.start + grp.count)) : Array.from({ length: grp.count }, (_, i) => grp.start + i);
            sub.setIndex(idx);
            push(groups, mat, sub, m.matrixWorld);
          }
        } else push(groups, mats[0], m.geometry, m.matrixWorld);
      });
    }
    const out = [];
    for (const [, { mat, geos }] of groups){
      const merged = mergeGeometries(geos.map(normalizeAttrs), false);
      geos.forEach(g => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; mesh.matrixAutoUpdate = false;
      if (windy && windy(mat)) applyWind(mat);
      parent.add(mesh); out.push(mesh);
    }
    this.items = [];
    return out;
  }
}
function push(groups, mat, geo, matrix){
  const key = mat ? (mat.name + "|" + (mat.color ? mat.color.getHexString() : "") + "|" + (mat.map ? mat.map.uuid : "") + "|" + mat.type + "|" + (mat.transparent ? 1 : 0)) : "none";
  if (!groups.has(key)) groups.set(key, { mat, geos: [] });
  const g = plain(geo); g.applyMatrix4(matrix);
  if (matrix.determinant() < 0){ const p = g.attributes.position; for (let i = 0; i < p.count; i += 3){ for (const a of Object.values(g.attributes)){ const s = a.itemSize; for (let k = 0; k < s; k++){ const t = a.array[(i + 1) * s + k]; a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k]; a.array[(i + 2) * s + k] = t; } } } }
  groups.get(key).geos.push(g);
}
// a fresh, non-indexed geometry with plain float position / normal / uv (handles interleaved and quantized data)
function plain(src){
  const idx = src.index ? src.index.array : null, pos = src.attributes.position, n = idx ? idx.length : pos.count;
  const out = new THREE.BufferGeometry();
  const take = (attr, size, fill) => { const arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++){ const j = idx ? idx[i] : i;
      if (!attr){ for (let k = 0; k < size; k++) arr[i * size + k] = fill; continue; }
      arr[i * size] = attr.getX(j); if (size > 1) arr[i * size + 1] = attr.getY(j); if (size > 2) arr[i * size + 2] = attr.getZ(j); }
    return new THREE.BufferAttribute(arr, size); };
  out.setAttribute("position", take(pos, 3, 0));
  if (src.attributes.normal) out.setAttribute("normal", take(src.attributes.normal, 3, 0));
  out.setAttribute("uv", take(src.attributes.uv, 2, 0));
  if (!src.attributes.normal) out.computeVertexNormals();
  return out;
}
function normalizeAttrs(g){ return g; }

// ---------- wind ----------
export const wind = { time: { value: 0 }, strength: { value: 1 } };
const windDone = new WeakSet();
// average colour of a texture, sampled small; true when it is mostly red (autumn leaves)
const redCache = new WeakMap();
function redLeaves(tex){
  const img = tex.image; if (!img || !img.width) return false; if (redCache.has(img)) return redCache.get(img);
  let red = false;
  try { const c = document.createElement("canvas"); c.width = c.height = 24; const g = c.getContext("2d"); g.drawImage(img, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data;
    let r = 0, gr = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128){ r += d[i]; gr += d[i + 1]; n++; }
    red = n > 20 && r / n > 70 && r > gr * 1.3; } catch(e){}
  redCache.set(img, red); return red;
}
export function recolorHook(mat){
  if (mat.userData.recolorHooked) return; mat.userData.recolorHooked = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => { if (prev) prev.call(mat, shader, r);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      diffuseColor.rgb = vec3(diffuseColor.g * 0.85 + diffuseColor.r * 0.12, diffuseColor.r * 0.9 + diffuseColor.g * 0.1, diffuseColor.b * 0.7);`); };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => "";
  mat.customProgramCacheKey = () => key() + "|recolor";
}
export function applyWind(mat){
  if (windDone.has(mat)) return; windDone.add(mat); mat.userData.windy = true;
  const prevHook = mat.userData.recolorHooked ? mat.onBeforeCompile : null;
  const baseKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => "";
  mat.customProgramCacheKey = () => baseKey() + "|wind";
  mat.onBeforeCompile = (shader, r) => { if (prevHook) prevHook.call(mat, shader, r);
    shader.uniforms.uWindTime = wind.time; shader.uniforms.uWindStrength = wind.strength;
    shader.vertexShader = "uniform float uWindTime;\nuniform float uWindStrength;\n" + shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vec4 wpW = modelMatrix * vec4(transformed, 1.0);
      float hW = max(wpW.y - 0.8, 0.0);
      float swayW = sin(uWindTime * 1.3 + wpW.x * 0.21 + wpW.z * 0.17) * 0.6 + sin(uWindTime * 2.7 + wpW.x * 0.6) * 0.25;
      transformed.x += swayW * hW * 0.022 * uWindStrength;
      transformed.z += cos(uWindTime * 1.1 + wpW.z * 0.23) * hW * 0.016 * uWindStrength;
    `);
  };
  mat.needsUpdate = true;
}
