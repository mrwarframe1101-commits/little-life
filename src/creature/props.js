// Things the creature holds or sets up: instruments, books, tools, an easel that shows its drawings.
import * as THREE from "three";

const M = {};
const m = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M[k]) M[k] = new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o }); return M[k]; };
const wood = () => m("#8a5a36"), dark = () => m("#2a1d15"), metal = () => m("#c9ccd2", { metalness: .8, roughness: .25 }), brass = () => m("#d8b15a", { metalness: .85, roughness: .3 });
function mesh(geo, mat, x = 0, y = 0, z = 0){ const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; return o; }
const B = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const C = (rt, rb, h, mat, x, y, z, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const S = (r, mat, x, y, z) => mesh(new THREE.SphereGeometry(r, 12, 9), mat, x, y, z);

const easelCanvas = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g, t }; })();
export function showOnEasel(svg){
  const img = new Image();
  img.onload = () => { const { g, t } = easelCanvas; g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, 256, 256); g.drawImage(img, 8, 8, 240, 240); t.needsUpdate = true; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
export function clearEasel(){ const { g, t } = easelCanvas; g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, 256, 256); t.needsUpdate = true; }

const BUILD = {
  book(){ const g = new THREE.Group(); const cover = m(["#7a2f3a", "#2f4f7a", "#3f6a3a"][Math.floor(Math.random() * 3)]);
    g.add(B(.34, .03, .24, cover, 0, 0, 0)); const pages = B(.32, .025, .22, m("#f7f1e1"), 0, .022, 0); g.add(pages);
    const l = B(.16, .012, .22, m("#f7f1e1"), -.085, .045, 0); l.rotation.z = .12; g.add(l); const r = B(.16, .012, .22, m("#f7f1e1"), .085, .045, 0); r.rotation.z = -.12; g.add(r); return g; },
  cup(){ const g = new THREE.Group(); g.add(C(.05, .04, .1, m("#f3ecdf"), 0, 0, 0)); g.add(C(.044, .044, .01, m("#6b3a1f"), 0, .045, 0)); const h = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 6, 10), m("#f3ecdf")); h.position.set(.055, 0, 0); g.add(h); return g; },
  apple(){ const g = new THREE.Group(); g.add(S(.06, m("#d23a3a"))); g.add(C(.005, .005, .04, m("#4d3220"), 0, .06, 0, 4)); return g; },
  bread(){ const g = new THREE.Group(); const b = S(.08, m("#c98b45")); b.scale.set(1.5, .7, .9); g.add(b); return g; },
  spoon(){ const g = new THREE.Group(); g.add(C(.008, .008, .18, metal(), 0, -.06, 0, 6)); const s = S(.025, metal(), 0, -.16, 0); s.scale.set(1, 1.4, .5); g.add(s); return g; },
  bowl(){ const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m("#e9dcc0", { side: THREE.DoubleSide })); b.castShadow = true; g.add(b); g.add(C(.085, .085, .01, m("#c57b3b"), 0, -.01, 0)); return g; },
  pen(){ const g = new THREE.Group(); g.add(C(.008, .004, .16, m("#1f2a44"), 0, -.06, 0, 6)); g.add(C(.012, .006, .03, brass(), 0, -.14, 0, 6)); return g; },
  notebook(){ const g = new THREE.Group(); g.add(B(.32, .02, .42, m("#f7f1e1"), 0, .01, 0)); for (let i = 0; i < 7; i++) g.add(B(.26, .002, .004, m("#9ab0d6"), 0, .022, -.15 + i * .05)); return g; },
  easel(){ const g = new THREE.Group(); const w = wood();
    for (const sx of [-.32, .32]){ const leg = C(.02, .02, 1.7, w, sx, .85, .05, 6); leg.rotation.x = -.12; g.add(leg); }
    const back = C(.02, .02, 1.6, w, 0, .8, -.25, 6); back.rotation.x = .3; g.add(back);
    g.add(B(.8, .04, .08, w, 0, .55, .12));
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(.75, .75, .03), [m("#e9e2cf"), m("#e9e2cf"), m("#e9e2cf"), m("#e9e2cf"), new THREE.MeshStandardMaterial({ map: easelCanvas.t, roughness: .9 }), m("#e9e2cf")]);
    canvas.position.set(0, .98, .1); canvas.rotation.x = -.12; canvas.castShadow = true; g.add(canvas); return g; },
  brush(){ const g = new THREE.Group(); g.add(C(.009, .009, .22, m("#c98b45"), 0, -.08, 0, 6)); g.add(C(.012, .004, .05, m("#e05a6a"), 0, -.21, 0, 6)); return g; },
  palette(){ const g = new THREE.Group(); const p = C(.13, .13, .015, m("#c9a06a"), 0, 0, 0, 16); p.scale.z = .75; g.add(p);
    ["#e05a6a", "#f6d04d", "#4a90d9", "#58b368", "#ffffff"].forEach((c, i) => g.add(S(.018, m(c), -.08 + i * .04, .012, .03))); return g; },
  trowel(){ const g = new THREE.Group(); g.add(C(.012, .012, .1, wood(), 0, -.03, 0, 6)); const b = B(.05, .1, .008, metal(), 0, -.13, 0); g.add(b); return g; },
  wateringCan(){ const g = new THREE.Group(); const body = C(.1, .11, .16, m("#5f9e8f", { metalness: .5, roughness: .35 }), 0, -.12, .05); g.add(body);
    const spout = C(.012, .02, .26, m("#5f9e8f", { metalness: .5 }), 0, -.1, .2); spout.rotation.x = 1.0; g.add(spout); const h = new THREE.Mesh(new THREE.TorusGeometry(.07, .01, 6, 12, Math.PI), m("#5f9e8f", { metalness: .5 })); h.position.set(0, -.04, .05); h.rotation.y = Math.PI / 2; g.add(h); return g; },
  rod(){ const g = new THREE.Group(); const r = C(.008, .016, 2.2, m("#6b4a2e"), 0, 1.1, 0, 6); g.add(r); g.add(C(.03, .03, .05, metal(), 0, .2, .03, 8));
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, 2.6, 3), m("#ffffff")); line.position.set(0, 2.2 - 1.3, .9); line.rotation.x = -.45; g.add(line); g.userData.line = line; return g; },
  bobber(){ const g = new THREE.Group(); g.add(S(.04, m("#e0403a"))); g.add(S(.03, m("#ffffff"), 0, .03, 0)); return g; },
  violin(){ const g = new THREE.Group(); const body = S(.11, m("#9a4a1f", { roughness: .3 })); body.scale.set(.75, 1.25, .3); g.add(body);
    g.add(B(.03, .26, .02, dark(), 0, .24, .03)); g.add(S(.025, dark(), 0, .38, .03)); g.add(B(.08, .01, .02, dark(), 0, -.05, .04)); return g; },
  bow(){ const g = new THREE.Group(); g.add(C(.006, .006, .62, m("#4d3220"), 0, -.28, 0, 5)); g.add(B(.004, .6, .004, m("#f3ecdf"), .02, -.28, 0)); return g; },
  cello(){ const g = new THREE.Group(); const body = S(.3, m("#8a3e18", { roughness: .3 })); body.scale.set(.8, 1.3, .32); body.position.y = .55; g.add(body);
    g.add(B(.06, .6, .04, dark(), 0, 1.15, .06)); g.add(C(.01, .01, .3, metal(), 0, .05, 0, 4)); return g; },
  guitar(){ const g = new THREE.Group(); const lo = S(.17, m("#c98a4a", { roughness: .35 })); lo.scale.set(1, 1, .32); g.add(lo); const hi = S(.13, m("#c98a4a", { roughness: .35 })); hi.scale.set(1, 1, .32); hi.position.y = .2; g.add(hi);
    { const hole = C(.05, .05, .02, dark(), 0, .05, .055, 12); hole.rotation.x = Math.PI / 2; g.add(hole); } g.add(B(.05, .46, .025, dark(), 0, .52, .02)); g.add(B(.08, .1, .03, dark(), 0, .78, .02)); return g; },
  reedFlute(){ const g = new THREE.Group(); const f = C(.022, .02, .42, m("#b8935a", { roughness: .8 }), 0, 0, 0, 8); f.rotation.z = Math.PI / 2; g.add(f);
    for (let i = 0; i < 4; i++){ const h = C(.008, .008, .01, m("#3a2a1a"), -.05 + i * .045, .02, 0, 6); g.add(h); } const band = C(.026, .026, .03, m("#6b8e3a"), .17, 0, 0, 8); band.rotation.z = Math.PI / 2; g.add(band); return g; },
  flute(){ const g = new THREE.Group(); const f = C(.014, .014, .55, m("#d9dce2", { metalness: .9, roughness: .2 }), 0, 0, 0, 8); f.rotation.z = Math.PI / 2; g.add(f); return g; },
  horn(){ const g = new THREE.Group(); const t = C(.018, .018, .32, brass(), 0, 0, .16, 8); t.rotation.x = Math.PI / 2; g.add(t); const bell = C(.08, .02, .12, brass(), 0, 0, .36, 12); bell.rotation.x = Math.PI / 2; g.add(bell);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 12), brass()); loop.position.set(0, -.05, .15); loop.rotation.y = Math.PI / 2; g.add(loop); return g; },
  drum(){ const g = new THREE.Group(); g.add(C(.32, .32, .38, m("#b7322c"), 0, .19, 0, 18)); g.add(C(.33, .33, .02, m("#f3ecdf"), 0, .39, 0, 18)); g.add(C(.33, .33, .03, brass(), 0, .02, 0, 18));
    const t2 = C(.2, .2, .2, m("#2c4f7a"), .45, .45, -.05, 14); g.add(t2); g.add(C(.21, .21, .015, m("#f3ecdf"), .45, .56, -.05, 14));
    const cym = C(.24, .24, .01, brass(), -.48, .85, -.1, 16); cym.rotation.z = .15; g.add(cym); g.add(C(.012, .012, .85, metal(), -.48, .42, -.1, 6)); return g; },
  stick(){ const g = new THREE.Group(); g.add(C(.01, .008, .32, m("#e0c08a"), 0, -.12, 0, 6)); return g; },
  harp(){ const g = new THREE.Group(); const w = m("#b07a3a", { roughness: .35 });
    g.add(B(.08, 1.2, .08, w, -.25, .6, 0)); const top = B(.6, .08, .08, w, .03, 1.2, 0); top.rotation.z = -.25; g.add(top); const col = B(.1, .9, .1, w, .3, .55, 0); col.rotation.z = .25; g.add(col);
    for (let i = 0; i < 9; i++) g.add(C(.003, .003, .6 + i * .05, m("#f3ecdf"), -.18 + i * .05, .55 + i * .02, 0, 3)); return g; },
  xylophone(){ const g = new THREE.Group(); g.add(B(1.0, .05, .4, wood(), 0, .55, 0)); for (const sx of [-.42, .42]) for (const sz of [-.15, .15]) g.add(C(.02, .02, .55, dark(), sx, .27, sz, 6));
    const cols = ["#e05a6a", "#f39a4a", "#f6d04d", "#58b368", "#4a90d9", "#7a5fc8", "#c85fb0", "#e05a6a"]; cols.forEach((c, i) => g.add(B(.09, .03, .34 - i * .02, m(c), -.4 + i * .115, .6, 0))); return g; },
  mallet(){ const g = new THREE.Group(); g.add(C(.008, .008, .26, wood(), 0, -.1, 0, 6)); g.add(S(.03, m("#f3ecdf"), 0, -.24, 0)); return g; },
  telescope(){ const g = new THREE.Group(); for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2; const l = C(.015, .015, 1.3, wood(), Math.sin(a) * .25, .6, Math.cos(a) * .25, 6); l.rotation.set(Math.cos(a) * .2, 0, -Math.sin(a) * .2); g.add(l); }
    const tube = C(.06, .08, .9, brass(), 0, 1.3, .1, 12); tube.rotation.x = -.9; g.add(tube); return g; },
  broom(){ const g = new THREE.Group(); g.add(C(.015, .015, 1.2, wood(), 0, .6, 0, 6)); const bristle = C(.04, .14, .3, m("#d8b46a"), 0, -.12, 0, 8); g.add(bristle); return g; },
  pot(){ const g = new THREE.Group(); for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2; const l = C(.012, .012, 1, dark(), Math.sin(a) * .28, .45, Math.cos(a) * .28, 5); l.rotation.set(Math.cos(a) * .28, 0, -Math.sin(a) * .28); g.add(l); }
    g.add(C(.2, .16, .22, m("#30302f", { metalness: .6, roughness: .4 }), 0, .45, 0, 14)); g.add(C(.18, .18, .01, m("#c46a3a"), 0, .56, 0, 14));
    for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; const lg = C(.04, .04, .4, m("#6b4a2e"), Math.sin(a) * .18, .05, Math.cos(a) * .18, 6); lg.rotation.set(Math.PI / 2, a, 0); g.add(lg); }
    g.userData.fire = new THREE.Vector3(0, .1, 0); return g; },
  hammer(){ const g = new THREE.Group(); g.add(C(.012, .012, .26, wood(), 0, -.1, 0, 6)); g.add(B(.12, .045, .045, metal(), 0, -.23, 0)); return g; },
  plank(){ const g = new THREE.Group(); g.add(B(1.2, .06, .3, m("#c08a52"), 0, .03, 0)); { const p2 = B(.8, .06, .3, m("#b07a42"), .1, .09, .02); p2.rotation.y = .3; g.add(p2); } return g; },
  stool(){ const g = new THREE.Group(); g.add(C(.2, .2, .05, wood(), 0, .44, 0, 14)); for (let i = 0; i < 3; i++){ const a = i / 3 * Math.PI * 2; g.add(C(.02, .02, .44, dark(), Math.sin(a) * .14, .22, Math.cos(a) * .14, 6)); } return g; },
  blanket(){ const g = new THREE.Group(); const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++){ x.fillStyle = (i + j) % 2 ? "#e05a6a" : "#fbf6ea"; x.fillRect(i * 8, j * 8, 8, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, .02, 1.3), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); b.position.y = .01; b.receiveShadow = true; g.add(b); return g; },
  pianoSmall(){ const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: .25 });
    g.add(B(1.5, 1.2, .55, body, 0, .6, -.05)); g.add(B(1.5, .06, .45, body, 0, .74, .36)); g.add(B(1.4, .04, .24, m("#f6f2e8"), 0, .79, .4));
    for (let i = 0; i < 18; i++) if (![2, 6, 9, 13, 16].includes(i)) g.add(B(.035, .04, .13, body, -.66 + i * .078, .82, .34));
    g.add(B(.07, .72, .07, body, -.68, .36, .52)); g.add(B(.07, .72, .07, body, .68, .36, .52)); return g; },
};

// ---------- tools, materials and toys ----------
const stoneM = () => m("#8f8a85"), logM = () => m("#7a5a3a"), plankM = () => m("#c9a06a"), strawM = () => m("#c8a85a");
Object.assign(BUILD, {
  stoneCarry(){ const g = new THREE.Group(); const s = mesh(new THREE.DodecahedronGeometry(.11, 0), stoneM()); g.add(s); return g; },
  stonePile(){ const g = new THREE.Group(); for (let i = 0; i < 9; i++){ const s = mesh(new THREE.DodecahedronGeometry(.12 + (i % 3) * .03, 0), stoneM(), (i % 3) * .2 - .2, .1 + Math.floor(i / 5) * .15, Math.floor(i / 3) * .18 - .2); s.rotation.set(i, i * 2, 0); g.add(s); } return g; },
  logCarryPile(){ const g = new THREE.Group(); for (let i = 0; i < 5; i++){ const l = C(.1, .1, 1.6, logM(), 0, .1 + Math.floor(i / 3) * .19, (i % 3) * .21 - .2, 7); l.rotation.z = Math.PI / 2; g.add(l); } return g; },
  plankCarry(){ const g = new THREE.Group(); g.add(B(.9, .04, .16, plankM(), 0, -.05, 0)); return g; },
  plankPile(){ const g = new THREE.Group(); for (let i = 0; i < 7; i++) g.add(B(1.6, .05, .22, plankM(), 0, .03 + i * .055, (i % 2) * .05)); return g; },
  paintPot(){ const g = new THREE.Group(); g.add(C(.1, .09, .16, m("#d8d8de", { metalness: .6 }), 0, .08, 0)); g.add(C(.09, .09, .01, m("#e05a6a"), 0, .165, 0)); return g; },
  fiberBundle(){ const g = new THREE.Group(); for (let i = 0; i < 8; i++){ const r = C(.008, .008, .5, strawM(), (i % 3 - 1) * .02, -.1, (Math.floor(i / 3) - 1) * .02, 4); r.rotation.z = (i - 4) * .04; g.add(r); } g.add(C(.04, .04, .03, m("#8a6a3a"), 0, -.1, 0, 6)); return g; },
  shovel(){ const g = new THREE.Group(); g.add(C(.015, .015, .9, logM(), 0, -.2, 0, 6)); const b = B(.18, .24, .02, metal(), 0, -.75, .02); g.add(b); return g; },
  axe(){ const g = new THREE.Group(); g.add(C(.017, .02, .7, logM(), 0, -.25, 0, 6)); const h = B(.05, .14, .2, metal(), 0, -.56, .09); g.add(h); return g; },
  pickaxe(){ const g = new THREE.Group(); g.add(C(.017, .02, .7, logM(), 0, -.25, 0, 6)); const h = B(.04, .05, .5, metal(), 0, -.58, 0); g.add(h); return g; },
  logCarry(){ const g = new THREE.Group(); for (let i = 0; i < 3; i++){ const l = C(.07, .07, .7, logM(), 0, i * .12, (i - 1) * .02, 7); l.rotation.z = Math.PI / 2; g.add(l); } return g; },
  basket(){ const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .16, 12, 1, true), m("#b08a50", { side: THREE.DoubleSide })); b.position.y = -.08; g.add(b);
    const h = new THREE.Mesh(new THREE.TorusGeometry(.14, .012, 6, 12, Math.PI), m("#8a6a3a")); h.position.y = 0; g.add(h); for (let i = 0; i < 5; i++) g.add(S(.04, m(["#e0403a", "#f39a4a", "#58b368"][i % 3]), (i - 2) * .05, -.02, (i % 2) * .05)); return g; },
  bucket(){ const g = new THREE.Group(); g.add(C(.16, .13, .26, m("#8a6a4a"), 0, .13, 0)); g.add(C(.15, .15, .01, m("#9a6a4a"), 0, .25, 0)); return g; },
  sickle(){ const g = new THREE.Group(); g.add(C(.014, .014, .16, logM(), 0, -.05, 0, 6)); const b = new THREE.Mesh(new THREE.TorusGeometry(.12, .012, 4, 12, Math.PI * 1.1), metal()); b.position.set(.08, -.2, 0); g.add(b); return g; },
  handSaw(){ const g = new THREE.Group(); g.add(B(.05, .1, .04, logM(), 0, -.02, 0)); g.add(B(.008, .5, .1, metal(), 0, -.3, .03)); return g; },
  sawhorseLog(){ const g = new THREE.Group(); g.add(B(1.2, .08, .12, logM(), 0, .6, 0)); for (const sx of [-.5, .5]) for (const s of [-1, 1]){ const l = B(.06, .66, .06, m("#4d3220"), sx, .3, s * .14); l.rotation.x = s * .35; g.add(l); }
    const log = C(.13, .13, 1.1, logM(), 0, .79, 0, 8); log.rotation.z = Math.PI / 2; log.rotation.y = Math.PI / 2; g.add(log); return g; },
  poker(){ const g = new THREE.Group(); g.add(C(.01, .01, .7, m("#3a3a40", { metalness: .7 }), 0, -.3, 0, 5)); return g; },
  tongs(){ const g = new THREE.Group(); for (const s of [-1, 1]){ const t = C(.008, .008, .45, m("#3a3a40", { metalness: .7 }), s * .02, -.2, 0, 4); t.rotation.z = s * .06; g.add(t); } g.add(B(.1, .03, .05, m("#ff7a2a", { emissive: new THREE.Color("#ff5010"), emissiveIntensity: 1.4 }), 0, -.44, 0)); return g; },
  controller(){ const g = new THREE.Group(); const b = B(.22, .05, .1, m("#2c2f3a", { roughness: .3 }), 0, 0, 0); g.add(b); for (const s of [-1, 1]) g.add(S(.045, m("#2c2f3a"), s * .1, -.01, -.03)); g.add(S(.015, m("#e05a6a"), .06, .03, .02)); g.add(S(.015, m("#4a90d9"), .08, .03, -.01)); return g; },
  rollingPin(){ const g = new THREE.Group(); const r = C(.04, .04, .4, m("#e0c08a"), 0, 0, 0, 10); g.add(r); for (const s of [-1, 1]) g.add(C(.015, .015, .1, m("#c98b45"), 0, s * .25, 0, 6)); return g; },
  dough(){ const g = new THREE.Group(); const d = S(.2, m("#f1dcb4")); d.scale.set(1.4, .3, 1); g.add(d); return g; },
  plate(){ const g = new THREE.Group(); g.add(C(.13, .1, .02, m("#f6f2e8"), 0, 0, 0, 16)); return g; },
  sponge(){ const g = new THREE.Group(); g.add(B(.09, .05, .06, m("#f6d04d"), 0, -.05, 0)); return g; },
  comb(){ const g = new THREE.Group(); g.add(B(.03, .18, .05, m("#c98b45"), 0, -.08, 0)); g.add(B(.03, .1, .02, m("#f3ecdf"), 0, -.1, .035)); return g; },
  knitting(){ const g = new THREE.Group(); const y = S(.08, m("#c85fb0")); g.add(y); for (const s of [-1, 1]){ const n = C(.006, .006, .35, m("#c9ccd2"), s * .06, .05, 0, 4); n.rotation.z = s * .7; g.add(n); } const scarf = B(.22, .02, .14, m("#c85fb0"), 0, -.08, .05); g.add(scarf); return g; },
  yogaMat(){ const g = new THREE.Group(); g.add(B(.7, .02, 1.8, m("#5f9e8f"), 0, .01, 0)); return g; },
  bouquet(){ const g = new THREE.Group(); for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; g.add(C(.004, .004, .22, m("#3f8a45"), Math.cos(a) * .02, .06, Math.sin(a) * .02, 3)); g.add(S(.03, m(["#e8505b", "#f9d56e", "#ffffff", "#c36ae0"][i % 4]), Math.cos(a) * .045, .18, Math.sin(a) * .045)); } return g; },
  sapling(){ const g = new THREE.Group(); g.add(C(.02, .03, .7, logM(), 0, .35, 0, 5)); g.add(S(.22, m("#58b368"), 0, .75, 0)); g.add(C(.25, .3, .06, m("#6b4a2e"), 0, .03, 0, 10)); return g; },
  chopBlock(){ const g = new THREE.Group(); g.add(C(.3, .32, .5, logM(), 0, .25, 0, 12)); const half = C(.12, .12, .4, plankM(), .1, .7, 0, 8); half.rotation.z = .2; g.add(half);
    for (let i = 0; i < 4; i++){ const l = C(.08, .08, .5, logM(), .7, .08 + Math.floor(i / 2) * .16, (i % 2) * .17 - .08, 6); l.rotation.z = Math.PI / 2; g.add(l); } return g; },
  marshStick(){ const g = new THREE.Group(); g.add(C(.008, .01, .8, logM(), 0, -.38, 0, 5)); const mm = C(.035, .035, .05, m("#fff3e0"), 0, -.78, 0, 10); g.add(mm); g.userData.tick = (t) => { mm.material = m(((t % 15) > 8) ? "#d8a060" : "#fff3e0"); }; return g; },
  pebble(){ const g = new THREE.Group(); const p = S(.035, stoneM()); p.scale.set(1.2, .5, 1); g.add(p); return g; },
  kite(){ const g = new THREE.Group(); const k = new THREE.Group(); g.add(k);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(.6, 1.1, 4, 1), m("#e05a6a", { side: THREE.DoubleSide })); sail.scale.z = .08; sail.rotation.z = Math.PI; k.add(sail);
    const tail = new THREE.Group(); tail.position.y = -.6; k.add(tail); for (let i = 0; i < 5; i++){ const bw = B(.14, .05, .02, m(["#f6d04d", "#4a90d9"][i % 2]), 0, -i * .3, 0); tail.add(bw); }
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 3), m("#ffffff")); g.add(line);
    g.userData.tick = (t) => { k.position.set(sin(t * .4) * 1.5, 8.5 + sin(t * .7) * .8, 6 + cos(t * .3)); k.rotation.set(sin(t * 1.3) * .2, 0, sin(t * .9) * .3); tail.rotation.z = sin(t * 2) * .3;
      const a = new THREE.Vector3(-.15, 1.25, .25), b = k.position; const mid = a.clone().add(b).multiplyScalar(.5); line.position.copy(mid); line.scale.y = a.distanceTo(b); line.lookAt(b); line.rotateX(Math.PI / 2); };
    return g; },
  binoculars(){ const g = new THREE.Group(); for (const s of [-1, 1]){ const t = C(.035, .04, .12, m("#2c2f3a"), s * .04, 0, 0, 10); t.rotation.x = Math.PI / 2; g.add(t); } return g; },
  camera(){ const g = new THREE.Group(); g.add(B(.18, .11, .07, m("#2c2f3a"), 0, 0, 0)); const lens = C(.035, .035, .06, m("#111"), 0, 0, .06, 10); lens.rotation.x = Math.PI / 2; g.add(lens); g.add(B(.03, .02, .02, m("#d8d8de"), .06, .065, 0)); return g; },
  sketchbook(){ const g = new THREE.Group(); g.add(B(.26, .02, .2, m("#f7f1e1"), 0, 0, 0)); g.add(B(.26, .015, .2, m("#5a3b24"), 0, -.015, 0)); return g; },
  juggleBalls(){ const g = new THREE.Group(); const cols = ["#e05a6a", "#f6d04d", "#4a90d9"]; const balls = cols.map(c => { const b = S(.06, m(c)); g.add(b); return b; });
    g.userData.tick = (t) => balls.forEach((b, i) => { const ph = (t * 1.2 + i / 3) % 1; const side = Math.floor(t * 1.2 + i / 3) % 2 ? 1 : -1; b.position.set(side * (.22 - ph * .44), 1.05 + Math.sin(ph * Math.PI) * .55, .1); }); return g; },
  ball(){ const g = new THREE.Group(); const b = S(.16, m("#f3ecdf")); g.add(b); const stripe = new THREE.Mesh(new THREE.TorusGeometry(.16, .02, 6, 16), m("#e05a6a")); b.add(stripe);
    g.userData.tick = (t) => { const k = (t % 2.4) / 2.4, out = k > .45 ? Math.sin(Math.min(1, (k - .45) / .55) * Math.PI) : 0; b.position.set(.15, .16 + Math.abs(Math.sin(out * Math.PI * 2)) * .3 * out, .4 + out * 3.2); b.rotation.x = t * 6; }; return g; },
  rope(){ const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.TorusGeometry(.62, .012, 4, 24, Math.PI), m("#e05a6a")); r.position.y = .75; g.add(r); g.userData.tick = (t) => { r.rotation.set(t * 6, 0, Math.PI / 2); }; return g; },
  snowball(){ const g = new THREE.Group(); const b = S(.3, m("#f4f6fa")); b.position.y = .3; g.add(b); const born = performance.now(); g.userData.tick = (t) => { const k = Math.min(1, (performance.now() - born) / 60000); b.scale.setScalar(.3 + k * 1.4); b.position.y = .3 * (.3 + k * 1.4); b.rotation.x = t; }; return g; },
  seedBag(){ const g = new THREE.Group(); const b = S(.1, m("#c8a870")); b.scale.set(1, 1.3, .8); b.position.y = -.1; g.add(b); return g; },
  umbrella(){ const g = new THREE.Group(); g.add(C(.01, .01, .9, m("#3a3a40"), 0, .2, 0, 5)); const top = new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), m("#e05a6a", { side: THREE.DoubleSide })); top.position.y = .55; g.add(top); return g; },
});
const sin = Math.sin, cos = Math.cos;

export function makeProp(name){ const f = BUILD[name]; return f ? f() : null; }
export const PROP_NAMES = Object.keys(BUILD);
