// Small particle effects: chimney smoke, music notes, sleep z's, hearts, sparkles, campfire flames.
import * as THREE from "three";

function glyphTex(glyph, color, font = "bold 96px Georgia, serif"){
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = "rgba(20,20,40,.55)"; g.strokeText(glyph, 64, 70); g.fillStyle = color; g.fillText(glyph, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function puffTex(){
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

const bubbleCache = new Map();
function bubbleTex(emoji){
  if (bubbleCache.has(emoji)) return bubbleCache.get(emoji);
  const c = document.createElement("canvas"); c.width = c.height = 160; const g = c.getContext("2d");
  g.fillStyle = "rgba(60,40,70,.25)"; g.beginPath(); g.ellipse(82, 72, 64, 58, 0, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; g.strokeStyle = "#3a2c3a"; g.lineWidth = 6;
  g.beginPath(); g.ellipse(80, 68, 62, 56, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(64, 118); g.lineTo(80, 152); g.lineTo(94, 118); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(64, 120); g.lineTo(80, 152); g.lineTo(94, 120); g.stroke();
  g.fillStyle = "#ffffff"; g.fillRect(60, 108, 40, 14);
  g.font = "64px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 80, 72);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; bubbleCache.set(emoji, t); return t;
}
export function createFX(scene){
  const tex = {
    notes: ["♪", "♫", "♩", "♬"].map((n, i) => glyphTex(n, ["#ffe28a", "#ffffff", "#ffb3d1", "#a9d8ff"][i])),
    z: glyphTex("z", "#ffffff", "bold 100px 'Trebuchet MS', sans-serif"),
    heart: glyphTex("♥", "#ff6b8a"), spark: glyphTex("✦", "#fff6c0"), q: glyphTex("?", "#ffffff"), bang: glyphTex("!", "#ffe28a"),
    puff: puffTex(),
  };
  const pool = [];
  function spawn(map, pos, { vel = new THREE.Vector3(0, .8, 0), life = 2, size = .5, grow = 0, color = 0xffffff, opacity = 1, wobble = 0, additive = false, pop = false } = {}){
    let s = pool.find(p => !p.visible);
    if (!s){ s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); scene.add(s); pool.push(s); }
    s.material.map = map; s.material.color.set(color); s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; s.material.needsUpdate = true;
    s.position.copy(pos); s.visible = true; s.scale.setScalar(size);
    s.userData = { vel: vel.clone(), life, age: 0, size, grow, opacity, wobble, ph: Math.random() * 6, pop };
    return s;
  }
  const emitters = { smoke: [], fires: [] };
  let smokeT = 0;
  function update(dt, sky){
    smokeT -= dt;
    if (smokeT < 0){ smokeT = .35;
      for (const p of emitters.smoke){ spawn(tex.puff, p.clone().add(new THREE.Vector3((Math.random() - .5) * .3, 0, (Math.random() - .5) * .3)),
        { vel: new THREE.Vector3(.35 + Math.random() * .2, .9 + Math.random() * .3, .1), life: 5, size: .7, grow: .55, color: sky.dark > .6 ? 0x6a7088 : 0xdedede, opacity: .55 }); } }
    for (const f of emitters.fires){ if (Math.random() < dt * 14) spawn(tex.puff, f.clone().add(new THREE.Vector3((Math.random() - .5) * .4, .2, (Math.random() - .5) * .4)),
      { vel: new THREE.Vector3(0, 1.2, 0), life: .7, size: .5, grow: -.4, color: Math.random() < .5 ? 0xff9a3a : 0xffd36a, opacity: .9, additive: true }); }
    for (const s of pool){ if (!s.visible) continue; const u = s.userData; u.age += dt;
      if (u.age > u.life){ s.visible = false; continue; }
      const k = u.age / u.life;
      s.position.addScaledVector(u.vel, dt); if (u.wobble) s.position.x += Math.sin(u.age * 5 + u.ph) * u.wobble * dt;
      const popK = u.pop ? (u.age < .2 ? 1.25 * Math.sin(u.age / .2 * Math.PI / 2) : 1 + .25 * Math.max(0, 1 - (u.age - .2) * 6)) : 1;
      s.scale.setScalar(Math.max(.01, u.size * (1 + u.grow * u.age) * popK));
      s.material.opacity = u.opacity * (k < .15 ? k / .15 : 1 - Math.max(0, (k - .6) / .4));
    }
  }
  return {
    update, emitters, spawn, tex,
    note(pos){ spawn(tex.notes[Math.floor(Math.random() * 4)], pos.clone().add(new THREE.Vector3((Math.random() - .5) * .6, 0, (Math.random() - .5) * .6)), { vel: new THREE.Vector3((Math.random() - .5) * .4, 1, 0), life: 2.2, size: .42, wobble: 1.2 }); },
    z(pos){ spawn(tex.z, pos, { vel: new THREE.Vector3(.25, .6, 0), life: 2.6, size: .3, grow: .5, wobble: .6 }); },
    heart(pos){ spawn(tex.heart, pos, { vel: new THREE.Vector3(0, .9, 0), life: 1.6, size: .4 }); },
    spark(pos){ spawn(tex.spark, pos.clone().add(new THREE.Vector3((Math.random() - .5), Math.random() * .6, (Math.random() - .5))), { vel: new THREE.Vector3(0, .4, 0), life: 1.1, size: .3, additive: true }); },
    think(pos){ spawn(tex.q, pos, { vel: new THREE.Vector3(0, .35, 0), life: 1.6, size: .45 }); },
    emote(pos, emoji, life = 2.4){ spawn(bubbleTex(emoji), pos.clone().add(new THREE.Vector3(.35, .25, 0)), { vel: new THREE.Vector3(0, .12, 0), life, size: .62, pop: true }); },
    idea(pos){ spawn(tex.bang, pos, { vel: new THREE.Vector3(0, .5, 0), life: 1.2, size: .5 }); },
  };
}
