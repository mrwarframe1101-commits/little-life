// Sky dome, sun and moon, stars, clouds, weather and all the lighting that follows the clock.
import * as THREE from "three";
import { rng } from "./terrain.js";
import { wind } from "./assets.js";

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const WEATHERS = ["clear", "partly cloudy", "cloudy", "light rain", "rain", "foggy", "snow"];

export function createSky(scene, renderer, quality){
  // ---- dome ----
  const uni = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color() }, sunSize: { value: .9994 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
    uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
        float s = dot(normalize(vDir), normalize(sunDir));
        c += sunColor * smoothstep(sunSize, 1.0, s) * 2.0 + sunColor * pow(max(s, 0.0), 24.0) * 0.35;
        if (h < 0.0) c = mix(c, horizon * 0.8, clamp(-h * 5.0, 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  dome.renderOrder = -10; scene.add(dome);

  // ---- stars ----
  const R = rng("stars"), sp = [];
  for (let i = 0; i < 2600; i++){ const u = R() * 2 - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - u * u); if (u < .05) continue; sp.push(Math.cos(a) * r * 1300, u * 1300, Math.sin(a) * r * 1300); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(sg, starMat); scene.add(stars);

  // ---- moon ----
  const moonTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, "rgba(255,250,235,1)"); gr.addColorStop(.42, "rgba(255,250,235,1)"); gr.addColorStop(.48, "rgba(220,225,255,.35)"); gr.addColorStop(1, "rgba(200,210,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(190,190,200,.35)"; [[52,50,7],[74,70,9],[60,80,5]].forEach(([x,y,r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false, transparent: true })); moon.scale.setScalar(120); scene.add(moon);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b7a55, .7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadows, quality.shadows);
  const sc = sun.shadow.camera; sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = .04;
  scene.add(sun); scene.add(sun.target);
  const ambient = new THREE.AmbientLight(0x8090b0, .12); scene.add(ambient);
  // a soft cool rim light from behind the scene so characters and trees pop off the background
  const rim = new THREE.DirectionalLight(0xbfd8ff, .45); scene.add(rim); scene.add(rim.target);

  // ---- clouds ----
  const clouds = new THREE.Group(); scene.add(clouds);
  const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: .97 }); cloudMat.userData.keep = true;
  const cR = rng("clouds");
  for (let i = 0; i < 34; i++){
    const c = new THREE.Group(); const n = 4 + Math.floor(cR() * 5);
    for (let k = 0; k < n; k++){ const s = 5 + cR() * 7; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), cloudMat);
      m.position.set((k - n / 2) * 6 + cR() * 3, cR() * 3, cR() * 6 - 3); m.scale.y = .62; m.castShadow = true; c.add(m); }
    c.position.set(cR() * 700 - 350, 70 + cR() * 30, cR() * 700 - 350); c.userData.speed = .8 + cR() * 1.2; c.userData.base = i;
    clouds.add(c);
  }

  // ---- precipitation ----
  const RAIN = 9000;
  const rg = new THREE.BufferGeometry(), rp = new Float32Array(RAIN * 6);
  for (let i = 0; i < RAIN; i++){ const x = R() * 160 - 80, y = R() * 60, z = R() * 160 - 80; rp.set([x, y, z, x - .05, y - .7, z], i * 6); }
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaac4e0, transparent: true, opacity: .45 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const SNOW = 5000, sng = new THREE.BufferGeometry(), snp = new Float32Array(SNOW * 3);
  for (let i = 0; i < SNOW; i++){ snp.set([R() * 160 - 80, R() * 60, R() * 160 - 80], i * 3); }
  sng.setAttribute("position", new THREE.BufferAttribute(snp, 3));
  const snow = new THREE.Points(sng, new THREE.PointsMaterial({ color: 0xffffff, size: .22, transparent: true, opacity: .9 })); snow.frustumCulled = false; snow.visible = false; scene.add(snow);

  const C = { dayTop: new THREE.Color("#4aaef5"), dayHor: new THREE.Color("#d2f0ff"), duskTop: new THREE.Color("#6a5aa8"), duskHor: new THREE.Color("#ffa88f"),
    nightTop: new THREE.Color("#0b1233"), nightHor: new THREE.Color("#2b3266"), grey: new THREE.Color("#8c97a6"), greyHor: new THREE.Color("#b9c1cb"),
    sunDay: new THREE.Color("#ffefd2"), sunDusk: new THREE.Color("#ff9a55"), moon: new THREE.Color("#a9b9ff"), t1: new THREE.Color(), t2: new THREE.Color() };

  let weather = "clear", cover = 0, wet = 0, fogAmt = 0, snowAmt = 0;
  const state = { dark: 0, warm: 0, glow: 0 };

  function setWeather(w){ weather = WEATHERS.includes(w) ? w : "clear"; }
  function update(dt, minute, focus){
    const m = ((minute % 1440) + 1440) % 1440;
    // targets from the weather
    const tCover = { clear: .05, "partly cloudy": .45, cloudy: .9, "light rain": .85, rain: 1, foggy: .7, snow: .9 }[weather];
    const tWet = weather === "rain" ? 1 : weather === "light rain" ? .45 : 0, tSnow = weather === "snow" ? 1 : 0, tFog = weather === "foggy" ? 1 : weather === "rain" ? .45 : weather === "snow" ? .4 : 0;
    const k = 1 - Math.pow(.6, dt); cover += (tCover - cover) * k * .2; wet += (tWet - wet) * k * .3; snowAmt += (tSnow - snowAmt) * k * .3; fogAmt += (tFog - fogAmt) * k * .2;

    // sun path: rises 6:00, sets 19:00
    const dayFrac = (m - 360) / 780, alt = Math.sin(dayFrac * Math.PI), az = dayFrac * Math.PI;
    const dark = m < 330 ? 1 : m < 420 ? 1 - smooth(330, 420, m) : m < 1110 ? 0 : m < 1200 ? smooth(1110, 1200, m) : 1;
    const warm = Math.max(0, 1 - Math.abs(alt) * 5) * (1 - dark * .6);
    state.dark = dark; state.warm = warm;
    const sunDir = new THREE.Vector3(Math.cos(az) * -1, Math.max(alt, -.3), .35).normalize();
    const moonDir = new THREE.Vector3(-sunDir.x * .8, Math.max(.35, -alt * .9 + .2), -.45).normalize();

    // sky colors
    C.t1.copy(C.dayTop).lerp(C.duskTop, warm).lerp(C.nightTop, dark).lerp(C.grey.clone().multiplyScalar(1 - dark * .85), cover * .65);
    C.t2.copy(C.dayHor).lerp(C.duskHor, warm).lerp(C.nightHor, dark).lerp(C.greyHor.clone().multiplyScalar(1 - dark * .8), cover * .6);
    uni.top.value.copy(C.t1); uni.horizon.value.copy(C.t2); uni.sunDir.value.copy(sunDir);
    uni.sunColor.value.copy(C.sunDay).lerp(C.sunDusk, warm).multiplyScalar((1 - dark) * (1 - cover * .9));
    starMat.opacity = dark * (1 - cover * .9);
    moon.position.copy(moonDir).multiplyScalar(1100); moon.material.opacity = smooth(.3, .9, dark) * (1 - cover * .8);
    stars.rotation.y += dt * .002;

    // lights
    const f = focus || new THREE.Vector3();
    const lightDir = dark < .5 ? sunDir : moonDir;
    sun.position.copy(f).addScaledVector(lightDir, 160); sun.target.position.copy(f);
    const sunI = (1 - dark) * (.35 + .75 * Math.max(alt, 0)) * (1 - cover * .65);
    const moonI = dark * .32 * (1 - cover * .6);
    sun.intensity = (sunI + moonI) * 1.8;
    rim.position.copy(f).add(new THREE.Vector3(-lightDir.x * 120, 60, -lightDir.z * 120 - 40)); rim.target.position.copy(f);
    rim.intensity = (.35 + warm * .35) * (1 - dark * .55) * (1 - cover * .4); rim.color.copy(dark > .5 ? C.moon : new THREE.Color("#c9ddff").lerp(new THREE.Color("#ffc6a8"), warm * .6));
    sun.color.copy(dark < .5 ? C.sunDay.clone().lerp(C.sunDusk, warm) : C.moon);
    // cool lilac-blue sky fill and warm green bounce: shadows read as soft colour, not grey
    hemi.intensity = .55 + (1 - dark) * .35 - cover * .1;
    hemi.color.copy(C.t1).lerp(new THREE.Color("#eef2ff"), .6).lerp(new THREE.Color("#ffd9c2"), warm * .35);
    hemi.groundColor.set("#8fa86a").lerp(new THREE.Color("#c9a27a"), warm * .3).multiplyScalar(.55 * (1 - dark * .7));
    ambient.intensity = .1 + dark * .15;

    // fog
    // airy aerial haze: distance melts into a bright, slightly warm sky colour
    scene.fog.color.copy(C.t2).lerp(new THREE.Color("#eef6ff"), .35 * (1 - dark)).lerp(C.sunDusk, warm * .25);
    scene.fog.density = .0011 + fogAmt * .011 + dark * .0004;

    // clouds
    clouds.children.forEach(c => { c.position.x += c.userData.speed * dt * (1 + wind.strength.value * .6); if (c.position.x > 380) c.position.x = -380;
      c.visible = (c.userData.base / 34) < .25 + cover * .9; });
    cloudMat.color.setRGB(1, 1, 1).lerp(new THREE.Color("#8a93a6"), cover * .35 + wet * .3).multiplyScalar(1 - dark * .75).add(C.sunDusk.clone().multiplyScalar(warm * .3));

    // precipitation follows the camera's focus
    rain.visible = wet > .03; rain.material.opacity = .45 * wet;
    if (rain.visible){ const a = rain.geometry.attributes.position.array, sp = 38 * dt;
      for (let i = 0; i < a.length; i += 6){ a[i + 1] -= sp; a[i + 4] -= sp; if (a[i + 4] < 0){ const nx = f.x + (Math.random() * 160 - 80), nz = f.z + (Math.random() * 160 - 80); a[i] = nx; a[i + 1] = 60; a[i + 2] = nz; a[i + 3] = nx - .05; a[i + 4] = 59.3; a[i + 5] = nz; } }
      rain.geometry.attributes.position.needsUpdate = true; }
    snow.visible = snowAmt > .03; snow.material.opacity = .9 * snowAmt;
    if (snow.visible){ const a = snow.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3){ a[i + 1] -= 2.2 * dt; a[i] += Math.sin(a[i + 1] * .6 + i) * dt * .5; if (a[i + 1] < 0){ a[i] = f.x + Math.random() * 160 - 80; a[i + 1] = 60; a[i + 2] = f.z + Math.random() * 160 - 80; } }
      snow.geometry.attributes.position.needsUpdate = true; }
    wind.strength.value = 1 + cover * .8 + wet * 1.2;

    state.glow = smooth(.25, .8, dark);
    state.cover = cover; state.wet = wet; state.snow = snowAmt; state.fog = fogAmt;
    dome.position.copy(f).setY(0); stars.position.copy(dome.position);
    return state;
  }
  return { update, setWeather, get weather(){ return weather; }, state, sun };
}
