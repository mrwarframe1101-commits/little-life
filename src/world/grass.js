// A dense, living grass field in the spirit of open-world adventure games: hundreds of thousands of soft blades
// in a tile that follows the camera, rolling wind waves with a bright sheen where gusts pass, colour drift
// across meadows, and blades that fade out at the tile edge into ground painted the same green.
// Positions come from a baked height texture and a mask (no grass on water, buildings, paths, camp).
import * as THREE from "three";
import { heightAt, riverZ } from "./terrain.js";
import { wind } from "./assets.js";

const AREA = 520, RES = 400;               // baked height/mask covers [-AREA/2, AREA/2] metres
export const GRASS_COLORS = { base: new THREE.Color("#3f7a24"), mid: new THREE.Color("#6fa833"), tip: new THREE.Color("#c4e06a"), dry: new THREE.Color("#b8c25a") };

function bakeHeight(){
  const d = new Float32Array(RES * RES);
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++){ const x = (i + .5) / RES * AREA - AREA / 2, z = (j + .5) / RES * AREA - AREA / 2; d[j * RES + i] = heightAt(x, z); }
  H = d;
  const t = new THREE.DataTexture(d, RES, RES, THREE.RedFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
let H = null; // baked heights, reused for the mask's slope test
function bakeMask(blocked, hasRiver, tex){
  const d = tex ? tex.image.data : new Uint8Array(RES * RES);
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++){
    const x = (i + .5) / RES * AREA - AREA / 2, z = (j + .5) / RES * AREA - AREA / 2, h = H[j * RES + i];
    let v = 255;
    if (hasRiver){ const dr = Math.abs(z - riverZ(x)); if (dr < 8.6) v = 0; else if (dr < 10.5) v = Math.min(v, (dr - 8.6) / 1.9 * 255); }
    if (h > 34) v = Math.min(v, Math.max(0, 255 - (h - 34) * 40));
    const cell = AREA / RES, slope = (Math.abs(H[j * RES + Math.min(RES - 1, i + 1)] - h) + Math.abs(H[Math.min(RES - 1, j + 1) * RES + i] - h)) / cell; if (slope > 1.3) v = Math.min(v, Math.max(0, 255 - (slope - 1.3) * 300));
    if (v > 0 && blocked(x, z)) v = 0;
    d[j * RES + i] = v;
  }
  if (tex){ tex.needsUpdate = true; return tex; }
  const t = new THREE.DataTexture(d, RES, RES, THREE.RedFormat, THREE.UnsignedByteType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export function buildGrassField(scene, { count = 200000, tile = 72, blocked = () => false, hasRiver = true } = {}){
  // one blade: 7 vertices, tapered and slightly cupped; y = 0..1 along the blade
  const bp = [], ys = [];
  const rows = [[0, .055], [.3, .048], [.58, .036], [.82, .02]];
  for (const [y, w] of rows){ bp.push(-w, y, 0, w, y, 0); ys.push(y, y); }
  bp.push(0, 1, 0); ys.push(1);
  const idx = []; for (let r = 0; r < 3; r++){ const a = r * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } idx.push(6, 7, 8);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3)); geo.setIndex(idx);
  const off = new Float32Array(count * 4); // x, z inside the tile, random, height scale
  let seed = 1234567; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++){ off[i * 4] = rnd() * tile; off[i * 4 + 1] = rnd() * tile; off[i * 4 + 2] = rnd(); off[i * 4 + 3] = .55 + rnd() * .75; }
  geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

  const heightTex = bakeHeight(), maskTex = bakeMask(blocked, hasRiver);
  const uni = {
    uCenter: { value: new THREE.Vector2() }, uTile: { value: tile }, uArea: { value: AREA }, uRes: { value: RES },
    uHeight: { value: heightTex }, uMask: { value: maskTex }, uTime: wind.time, uWind: wind.strength,
    uBase: { value: GRASS_COLORS.base }, uMid: { value: GRASS_COLORS.mid }, uTip: { value: GRASS_COLORS.tip }, uDry: { value: GRASS_COLORS.dry },
    uSunDir: { value: new THREE.Vector3(.4, .8, .3) }, uSheen: { value: 1 }, uSnow: { value: 0 }, uBladeH: { value: .62 },
  };
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  mat.userData.keep = true;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = `
      attribute vec4 aOff;
      uniform vec2 uCenter; uniform float uTile, uArea, uRes, uTime, uWind, uBladeH, uSnow; uniform sampler2D uHeight, uMask; uniform vec3 uSunDir;
      varying float vY; varying float vGust; varying float vVar; varying float vSheen;
      float hgt(vec2 p){ vec2 t = (p / uArea + .5) * uRes - .5; vec2 f = fract(t); vec2 b = floor(t);
        float a = texture2D(uHeight, (b + vec2(.5, .5)) / uRes).r, c = texture2D(uHeight, (b + vec2(1.5, .5)) / uRes).r,
              d = texture2D(uHeight, (b + vec2(.5, 1.5)) / uRes).r, e = texture2D(uHeight, (b + vec2(1.5, 1.5)) / uRes).r;
        return mix(mix(a, c, f.x), mix(d, e, f.x), f.y); }
      float n2(vec2 p){ return sin(p.x) * sin(p.y * 1.3 + 1.7) * .5 + sin(p.x * .7 - p.y * .9 + 3.1) * .5; }
      ` + sh.vertexShader
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
      .replace("#include <begin_vertex>", `
        // nearest copy of this blade's tile slot to the camera focus: stable, no swimming
        vec2 slot = aOff.xy; vec2 wp = slot + floor((uCenter - slot + uTile * .5) / uTile) * uTile;
        vec2 rel = (wp - uCenter) / (uTile * .5); float edge = 1.0 - smoothstep(.72, 1.0, length(rel));
        vec2 muv = wp / uArea + .5; float mask = (muv.x < 0.0 || muv.y < 0.0 || muv.x > 1.0 || muv.y > 1.0) ? 0.0 : texture2D(uMask, muv).r;
        float meadow = n2(wp * .045) * .5 + .5;                       // big soft patches: taller lush / shorter
        float h = uBladeH * aOff.w * mix(.7, 1.25, meadow) * edge * smoothstep(.15, .6, mask) * (1.0 - uSnow * .6);
        float ang = aOff.z * 6.2831;
        // wind: a steady sway plus big travelling gusts that roll across the field
        vec2 wdir = normalize(vec2(1.0, .35));
        float gust = sin(dot(wp, wdir) * .09 - uTime * 1.6) * .5 + .5; gust = pow(gust, 3.0) * (.6 + .4 * sin(dot(wp, vec2(-.35, 1.0)) * .05 + uTime * .3));
        float sway = sin(uTime * 2.3 + wp.x * .7 + wp.y * .5 + aOff.z * 6.0) * .12;
        float bend = (sway + gust * .9 + .15) * uWind;
        float y = position.y;
        vec3 transformed = vec3(position.x * cos(ang), y * h, position.x * sin(ang));
        float b = y * y * bend * h;
        transformed.xz += wdir * b + vec2(cos(ang + 1.57), sin(ang + 1.57)) * y * y * (aOff.z - .5) * .25 * h;
        transformed.y -= b * b * .35;
        transformed.xz += wp;
        transformed.y += hgt(wp) - .03;
        vY = y; vGust = gust; vVar = meadow;
        vSheen = gust * y;
      `);
    sh.fragmentShader = `
      uniform vec3 uBase, uMid, uTip, uDry; uniform float uSheen, uSnow;
      varying float vY; varying float vGust; varying float vVar; varying float vSheen;
      ` + sh.fragmentShader
      .replace("#include <color_fragment>", `
        vec3 gcol = mix(uBase, uMid, smoothstep(.0, .55, vY));
        gcol = mix(gcol, uTip, smoothstep(.45, 1.0, vY));
        gcol = mix(gcol, uDry, smoothstep(.55, 1.0, vVar) * .35 * vY);
        gcol = mix(gcol, vec3(.93, .95, 1.0), uSnow * .75);
        diffuseColor.rgb = gcol;
      `)
      .replace("#include <opaque_fragment>", `
        // gust sheen: light rolling over the blades, plus a soft self-light so shaded blades stay green
        outgoingLight += vec3(.95, 1.0, .75) * vSheen * .32 * uSheen + diffuseColor.rgb * .22;
        #include <opaque_fragment>
      `);
  };
  mat.customProgramCacheKey = () => "grassfield-v1";
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.name = "grassfield";
  scene.add(mesh);
  mesh.userData.update = (center, sky) => {
    uni.uCenter.value.set(center.x, center.z);
    if (sky){ uni.uSheen.value = (1 - (sky.dark || 0)) * (1 - (sky.cover || 0) * .5); uni.uSnow.value = sky.snow || 0; }
  };
  mesh.userData.refreshMask = (b) => bakeMask(b || blocked, hasRiver, maskTex);
  mesh.userData.dispose = () => { geo.dispose(); mat.dispose(); heightTex.dispose(); maskTex.dispose(); };
  return mesh;
}
