// Renderer, scene, cameras, post-processing.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// final look: gentle contrast, warm highlights, lilac shadows, a little saturation, soft vignette,
// and a light tilt-shift blur at the top and bottom of the frame for a miniature-diorama feel
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTilt: { value: .9 }, uWarm: { value: 0 }, uNight: { value: 0 }, uFocus: { value: .5 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTilt, uWarm, uNight, uFocus; varying vec2 vUv;
    vec3 sat(vec3 c, float s){ float l = dot(c, vec3(.299, .587, .114)); return mix(vec3(l), c, s); }
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // tilt-shift: blur grows away from the focus band
      float d = abs(vUv.y - uFocus); float b = smoothstep(.22, .55, d) * uTilt;
      if (b > .01){ vec2 px = b * 2.2 / uRes; vec3 acc = col; float w = 1.0;
        for (int i = 0; i < 8; i++){ float a = float(i) * 0.785398; vec2 o = vec2(cos(a), sin(a)) * px * (1.0 + mod(float(i), 2.0));
          acc += texture2D(tDiffuse, vUv + o).rgb; w += 1.0; }
        col = mix(col, acc / w, min(1.0, b * 1.6)); }
      float l = dot(col, vec3(.299, .587, .114));
      col = sat(col, 1.2);
      col = mix(col, col * vec3(.9, .97, 1.08), (1.0 - smoothstep(.0, .4, l)) * .3);               // lilac shadows
      col = mix(col, col * vec3(1.07, 1.03, .88), smoothstep(.4, 1.0, l) * (.45 + uWarm * .5));          // warm highlights
      col = col + (col - .5) * .12;                                                                    // soft contrast
      col = mix(col, col * vec3(.85, .9, 1.15), uNight * .25);                                         // cool moonlit nights
      vec2 q = vUv - .5; col *= 1.0 - dot(q, q) * .3;                                                 // vignette
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

export const QUALITY = {
  low:    { pixelRatio: 1,   shadows: 1024, grass: 45000, bloom: false, trees: .6 },
  medium: { pixelRatio: 1.25, shadows: 2048, grass: 110000, bloom: true,  trees: .8 },
  high:   { pixelRatio: 1.5, shadows: 4096, grass: 200000, bloom: true,  trees: 1 },
  ultra:  { pixelRatio: 2,   shadows: 4096, grass: 330000, bloom: true, trees: 1.25 },
};

export function createEngine(canvas, qualityName = "high"){
  const q = QUALITY[qualityName] || QUALITY.high;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbfd8ee, 0.0042);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
  camera.position.set(0, 60, 95);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 2.5; controls.maxDistance = 260;
  controls.target.set(0, 0, 0);

  let composer = null, bloom = null, renderPass = null, grade = null, activeScene = scene; const look = { warm: 0, night: 0 };
  if (q.bloom){
    // multisampled (MSAA) buffer: the composer otherwise renders without anti-aliasing, making leaves and edges jagged
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: qualityName === "low" ? 0 : qualityName === "medium" ? 4 : 8 });
    composer = new EffectComposer(renderer, rt);
    renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.0, 0.7, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    grade = new ShaderPass(GradeShader); composer.addPass(grade);
  }

  function resize(){
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer){ composer.setSize(w, h); bloom.setSize(w, h); if (grade) grade.uniforms.uRes.value.set(w, h); }
  }
  window.addEventListener("resize", resize); resize();

  // ---------- camera modes ----------
  // follow: orbit around the creature, keeping whatever angle the viewer chose
  // free: plain orbit, nothing moves the camera
  // cinematic: slow automatic shots around the creature
  const cam = { mode: "follow", userAt: 0, shot: 0, shotT: 0, tween: null, lastFocus: new THREE.Vector3() };
  controls.addEventListener("start", () => { cam.userAt = performance.now(); cam.tween = null; if (cam.mode === "cinematic") cam.mode = "follow"; cam.onModeChange && cam.onModeChange(cam.mode); });

  function setMode(mode, focus){
    cam.mode = mode; cam.onModeChange && cam.onModeChange(mode);
    if (mode === "follow" && focus){ cam.tween = { target: focus.clone(), pos: focus.clone().add(new THREE.Vector3(6, 4.5, 9)) }; }
    if (mode === "overview"){ cam.mode = "free"; cam.tween = { target: new THREE.Vector3(0, 0, 0), pos: new THREE.Vector3(10, 85, 120) }; cam.onModeChange && cam.onModeChange("free"); }
    if (mode === "cinematic"){ cam.shotT = 0; cam.shot = (cam.shot + 1) % 6; }
  }
  const SHOTS = [
    (f, t) => f.clone().add(new THREE.Vector3(Math.cos(t*.05)*9, 3.2, Math.sin(t*.05)*9)),
    (f, t) => f.clone().add(new THREE.Vector3(3.2, 1.4, 4.2)),
    (f, t) => f.clone().add(new THREE.Vector3(-14, 9, 12 + Math.sin(t*.04)*3)),
    (f, t) => f.clone().add(new THREE.Vector3(Math.cos(t*.03)*22, 14, Math.sin(t*.03)*22)),
    (f, t) => f.clone().add(new THREE.Vector3(1.8, .9, -3.4)),
    (f, t) => f.clone().add(new THREE.Vector3(0, 30, 26)),
  ];
  function updateCamera(dt, focus, time){
    if (cam.tween){
      controls.target.lerp(cam.tween.target, 1 - Math.pow(.02, dt));
      camera.position.lerp(cam.tween.pos, 1 - Math.pow(.02, dt));
      if (camera.position.distanceTo(cam.tween.pos) < .15) cam.tween = null;
    } else if (cam.mode === "follow" && focus && performance.now() - cam.userAt > 250){
      const delta = focus.clone().sub(controls.target).multiplyScalar(1 - Math.pow(.08, dt));
      controls.target.add(delta); camera.position.add(delta);
    } else if (cam.mode === "cinematic" && focus){
      cam.shotT += dt;
      if (cam.shotT > 18){ cam.shotT = 0; cam.shot = (cam.shot + 1) % SHOTS.length; camera.position.copy(SHOTS[cam.shot](focus, time)); controls.target.copy(focus); }
      const want = SHOTS[cam.shot](focus, time);
      camera.position.lerp(want, 1 - Math.pow(.25, dt));
      controls.target.lerp(focus.clone().add(new THREE.Vector3(0, .8, 0)), 1 - Math.pow(.05, dt));
    }
    controls.update();
  }

  function render(nightGlow){
    if (composer){ bloom.strength = activeScene === scene ? 0.3 + nightGlow * 0.6 : .3;
      if (grade){ const out = activeScene === scene; grade.uniforms.uTilt.value = out ? (cam.mode === "overview" ? .7 : .25) : .35; grade.uniforms.uWarm.value = look.warm; grade.uniforms.uNight.value = out ? look.night : 0; }
      composer.render(); }
    else renderer.render(activeScene, camera);
  }
  function setActiveScene(s){ activeScene = s || scene; if (renderPass) renderPass.scene = activeScene; }

  return { THREE, renderer, scene, camera, controls, quality: q, qualityName, resize, render, cam, look, setMode, updateCamera, setActiveScene, get activeScene(){ return activeScene; } };
}
