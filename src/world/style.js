// The cartoon look: turns the world's materials into bright cel-shaded "toon" materials, and gives
// characters a soft dark outline (inverted hull), in the spirit of cosy life-sim games.
import * as THREE from "three";
import { applyWind, recolorHook } from "./assets.js";

export const TOON = { enabled: true, saturate: 1.06, lift: 1.04 };
const gradient = (() => { const d = new Uint8Array([150, 168, 196, 218, 238, 255, 255, 255]); const t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toonGradient = gradient;
const cache = new WeakMap();
const hsl = {};
function brighten(c){ if (!c) return c; const out = c.clone(); out.getHSL(hsl); out.setHSL(hsl.h, Math.min(1, hsl.s * TOON.saturate), Math.min(.97, hsl.l * TOON.lift)); return out; }

export function toonMaterial(m){
  if (!m || m.userData.keep || m.isMeshToonMaterial || m.isShaderMaterial || m.isMeshBasicMaterial || m.isPointsMaterial || m.isSpriteMaterial || m.isLineBasicMaterial) return m;
  if (!(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return m;
  if (cache.has(m)) return cache.get(m);
  const t = new THREE.MeshToonMaterial({
    color: brighten(m.color), map: m.map || null, gradientMap: gradient, vertexColors: m.vertexColors,
    emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), emissiveIntensity: m.emissiveIntensity ?? 1, emissiveMap: m.emissiveMap || null,
    transparent: m.transparent, opacity: m.opacity, side: m.side, alphaTest: m.alphaTest, normalMap: m.normalMap || null, alphaMap: m.alphaMap || null, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, name: m.name,
  });
  if (t.alphaTest > 0){ t.alphaToCoverage = true; t.alphaTest = Math.min(t.alphaTest, .35); } // smooth, non-shimmering leaf edges under MSAA
  if (m.userData.recolor) recolorHook(t);
  if (m.userData.windy) applyWind(t);
  cache.set(m, t);
  return t;
}
export function toonify(root){
  if (!TOON.enabled || !root) return;
  root.traverse(o => {
    if (!o.isMesh || o.userData.noToon || o.userData.outline) return;
    o.material = Array.isArray(o.material) ? o.material.map(toonMaterial) : toonMaterial(o.material);
  });
}

// ---------- outlines ----------
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2a2233, side: THREE.BackSide });
outlineMat.onBeforeCompile = (sh) => {
  sh.uniforms.uThick = { value: .022 };
  sh.vertexShader = "uniform float uThick;\n" + sh.vertexShader.replace("#include <begin_vertex>", `
    vec3 transformed = vec3(position);
    vec3 wsScale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
    transformed += normalize(normal) * uThick / max(wsScale, vec3(0.0001));
  `);
};
outlineMat.userData.keep = true;
export function addOutline(root, { skip } = {}){
  const meshes = [];
  root.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.noOutline && !(skip && skip(o))) meshes.push(o); });
  for (const m of meshes){
    if (!m.geometry || !m.geometry.attributes.normal) continue;
    const ol = new THREE.Mesh(m.geometry, outlineMat); ol.userData.outline = true; ol.castShadow = false; ol.receiveShadow = false; ol.renderOrder = -1;
    m.add(ol);
  }
}
