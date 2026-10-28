// Inside the buildings: dollhouse rooms (front wall and ceiling cut away) that fill up with whatever
// the creature has crafted for each place. Rooms live in their own scene; the camera visits them.
import * as THREE from "three";
import * as A from "./assets.js";
import { mat, buildPiano, glass } from "./buildings.js";
import { makeProp } from "../creature/props.js";
import { createFX } from "./fx.js";

const W = 14, D = 9, WALL_H = 3.4;
export const KENNEY_FACE = 0;        // rotation offset if the furniture models face another way
const F = {
  bed: ["bedDouble", 2.1, "width"], lamp: ["lampRoundFloor", 1.6, "height"], nightstand: ["sideTableDrawers", .7, "width"], bath: ["bathtub", 1.8, "width"],
  mirror: ["bathroomMirror", .9, "height"], basin: ["bathroomSink", .8, "width"], desk: ["desk", 1.5, "width"], deskChair: ["chairDesk", 1.0, "height"],
  screen: ["computerScreen", .55, "width"], keyboard: ["computerKeyboard", .45, "width"], bookshelf: ["bookcaseOpen", 2.1, "height"], books: ["books", .35, "width"],
  sofa: ["loungeSofa", 2.3, "width"], armchair: ["loungeChair", 1.0, "width"], rug: ["rugRounded", 3.2, "width"], tvCabinet: ["cabinetTelevision", 1.6, "width"], tv: ["televisionModern", 1.3, "width"],
  stove: ["kitchenStove", .9, "width"], hood: ["hoodModern", .9, "width"], sink: ["kitchenSink", .9, "width"], cabinet: ["kitchenCabinet", .9, "width"], coffee: ["kitchenCoffeeMachine", .3, "height"],
  fridge: ["kitchenFridgeLarge", 2.0, "height"], counter: ["kitchenBar", 1.8, "width"], table: ["tableRound", 1.3, "width"], chair: ["chairCushion", 1.0, "height"],
  sideTable: ["sideTable", .7, "width"], speaker: ["speakerSmall", .5, "height"], plant: ["pottedPlant", 1.1, "height"], plantS: ["plantSmall2", .45, "height"], plantS2: ["plantSmall1", .4, "height"],
  coatRack: ["coatRackStanding", 1.8, "height"], doormat: ["rugDoormat", 1.0, "width"], ceilingLamp: ["lampSquareCeiling", .5, "width"], radio: ["radio", .35, "width"], trash: ["trashcan", .5, "height"],
  laptop: ["laptop", .4, "width"], pillow: ["pillow", .5, "width"], toaster: ["toaster", .3, "width"], microwave: ["kitchenMicrowave", .55, "width"], upper: ["kitchenCabinetUpper", .9, "width"],
};
// KayKit Furniture Bits / Restaurant Bits (CC0) replace the Kenney piece when installed
const KK = {
  bed: ["kaykit-furniture", "bed_double_A"], armchair: ["kaykit-furniture", "armchair_pillows"], sofa: ["kaykit-furniture", "couch_pillows"], bookshelf: ["kaykit-furniture", "shelf_B_large_decorated"],
  lamp: ["kaykit-furniture", "lamp_standing"], rug: ["kaykit-furniture", "rug_oval_A"], nightstand: ["kaykit-furniture", "cabinet_small_decorated"], sideTable: ["kaykit-furniture", "table_small"],
  pillow: ["kaykit-furniture", "pillow_A"], books: ["kaykit-furniture", "book_set"], chair: ["kaykit-furniture", "chair_A_wood"],
  table: ["kaykit-restaurant", "table_round_A"], stove: ["kaykit-restaurant", "stove_single"], sink: ["kaykit-restaurant", "kitchencounter_sink_backsplash"], cabinet: ["kaykit-restaurant", "kitchencabinet"],
  fridge: ["kaykit-restaurant", "fridge_A_decorated"], counter: ["kaykit-restaurant", "kitchencounter_straight_A_decorated"],
};
export const KAYKIT_FACE = 0;
const DECOR = [["kaykit-furniture", "pictureframe_large_A"], ["kaykit-furniture", "pictureframe_medium"], ["kaykit-furniture", "pictureframe_small_B"], ["kaykit-furniture", "shelf_A_small"], ["kaykit-restaurant", "jar_A_medium"], ["kaykit-restaurant", "pot_A_stew"], ["kaykit-restaurant", "dishrack_plates"]];
// where each crafted thing goes in a room: [x, z, facing]. Facing 0 = toward the open front (+Z).
const SLOT = {
  bed: [5.1, -3.1, 0], bath: [6.15, 2.6, -Math.PI / 2], mirror: [6.85, .3, -Math.PI / 2], desk: [2.4, -3.9, 0], bookshelf: [-.4, -4.15, 0], fireplace: [-4.8, -4.25, 0],
  tv: [-1.9, -4.15, 0], console: [-1.0, -4.0, 0], sofa: [-2.7, -.6, Math.PI], armchair: [-5.4, -1.6, Math.PI * .8], rug: [-2.7, -2.1, 0], records: [.9, -4.05, 0],
  stove: [-6.55, -2.4, Math.PI / 2], oven: [-6.5, -3.6, Math.PI / 2], sink: [-6.55, -1.4, Math.PI / 2], coffee: [-6.55, -.4, Math.PI / 2], counter: [-6.4, .9, Math.PI / 2],
  table: [-4.2, 2.3, 0], piano: [1.6, 3.6, Math.PI], easel: [3.9, 1.5, -.6], plants: [6.2, -1.5, 0], mat: [3.7, -1.5, 0], loom: [-.8, 2.9, Math.PI / 2], lamp: [-6.3, -3.3, 0],
  workbench_indoor: [4.6, 3.6, Math.PI], wheel: [3.6, -1.4, 0], millstone: [3.4, 0, 0], telescope: [4.4, -2.6, 0], chair: [-4.2, 3.2, Math.PI], computer: null,
};
const EXTRA_CHAIRS = [[-4.2, 1.3, 0], [-5.2, 2.3, Math.PI / 2], [-3.2, 2.3, -Math.PI / 2]];
const ENTRY = new THREE.Vector3(-6.2, 0, 3.1), FLOOR_SPOT = [.4, 1.3, 0], WINDOW_SPOT = [4.0, -3.5, Math.PI];

export async function createInteriors(renderer, rooms){
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#17130f");
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x3a2c22, .55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 60 }); sun.shadow.bias = -.0004; scene.add(sun); scene.add(sun.target);
  const fx = createFX(scene);
  const pathFor = k => (KK[k] && A.find(...KK[k])) || A.find("furniture-kit", F[k][0]);
  const names = [...new Set([...Object.keys(F).map(pathFor), ...DECOR.map(d => A.find(...d))].filter(Boolean))];
  await A.preload(names);
  const models = {}, kay = {}; for (const k of Object.keys(F)){ const p = pathFor(k); models[k] = p ? await A.load(p) : null; kay[k] = !!(p && p.startsWith("kaykit-")); }
  const decor = []; for (const d of DECOR){ const p = A.find(...d); if (p){ const m = await A.load(p); if (m) decor.push({ name: d[1], m }); } }
  const placeF = (key, x, z, rot, y = 0, size) => { const f = F[key]; const m = models[key]; if (!m) return null; const o = A.place(m, { [f[2]]: size || f[1], x, z, rot: rot + (kay[key] ? KAYKIT_FACE : KENNEY_FACE) }); o.position.y = y; return o; };

  // screens (TV game, computer) drawn on canvases
  const tvCanvas = document.createElement("canvas"); tvCanvas.width = 256; tvCanvas.height = 144; const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace;
  const pcCanvas = document.createElement("canvas"); pcCanvas.width = 256; pcCanvas.height = 160; const pcTex = new THREE.CanvasTexture(pcCanvas); pcTex.colorSpace = THREE.SRGBColorSpace;
  const screenOff = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: .2, metalness: .3 });
  const tvMat = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false }), pcMat = new THREE.MeshBasicMaterial({ map: pcTex, toneMapped: false });

  const out = { scene, rooms: {}, fx, sun };

  function makeRoom(r, index){
    const origin = new THREE.Vector3(index * 40, 0, 0);
    const room = { id: r.id, origin, group: new THREE.Group(), furn: new THREE.Group(), stations: {}, lights: [], screens: {}, fire: null, disc: null, wheel: null, mill: null, wallColor: r.wall || "#efe3c8" };
    room.group.position.copy(origin); scene.add(room.group); room.group.add(room.furn);
    const floorM = mat("#a8774a", "wood", [6, 4]), wallM = mat(room.wallColor, "plaster", [5, 1.2]), trimM = mat("#6b4a30", "wood", [3, .2]);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + .4, .2, D + .4), floorM); floor.position.y = -.1; floor.receiveShadow = true; room.group.add(floor);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 1.6, .6, D + 1.6), mat("#5a4a3a")); slab.position.y = -.5; room.group.add(slab);
    const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; room.group.add(m); return m; };
    // back wall with two windows
    const winX = [4.0, -.2], winY = [1.1, 2.6];
    let cx = -W / 2; for (const wx of winX.slice().sort((a, b) => a - b)){ const left = wx - .8; if (left > cx) wall(left - cx, WALL_H, .2, (cx + left) / 2, WALL_H / 2, -D / 2); wall(1.6, winY[0], .2, wx, winY[0] / 2, -D / 2); wall(1.6, WALL_H - winY[1], .2, wx, (winY[1] + WALL_H) / 2, -D / 2); cx = wx + .8; }
    wall(W / 2 - cx, WALL_H, .2, (cx + W / 2) / 2, WALL_H / 2, -D / 2);
    // side walls (left has the door, right has a window)
    wall(.2, WALL_H, D - 2.2, -W / 2, WALL_H / 2, -1.1); wall(.2, WALL_H - 2.4, 1.4, -W / 2, (2.4 + WALL_H) / 2, 3.1); wall(.2, WALL_H, .8, -W / 2, WALL_H / 2, D / 2 - .4);
    wall(.2, WALL_H, 2.6, W / 2, WALL_H / 2, -3.2); wall(.2, 1.1, 1.6, W / 2, .55, -1.1); wall(.2, WALL_H - 2.6, 1.6, W / 2, (2.6 + WALL_H) / 2, -1.1); wall(.2, WALL_H, 4.7, W / 2, WALL_H / 2, 2.15);
    // trims
    for (const [w, d, x, z] of [[W, .26, 0, -D / 2 + .12], [.26, D, -W / 2 + .12, 0], [.26, D, W / 2 - .12, 0]]){ const t = new THREE.Mesh(new THREE.BoxGeometry(w, .16, d), trimM); t.position.set(x, .08, z); room.group.add(t);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .14, d + .1), trimM); top.position.set(x, WALL_H - .07, z); room.group.add(top); }
    // window glass that shows the sky, and frames
    room.windows = [];
    const addWin = (x, z, ry) => { const g = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.5), new THREE.MeshBasicMaterial({ color: 0x9fc8ee, toneMapped: false })); g.position.set(x, 1.85, z); g.rotation.y = ry; room.group.add(g); room.windows.push(g);
      const fr = mat("#f3ecdf"); for (const [w, h, ox, oy] of [[1.7, .1, 0, .75], [1.7, .1, 0, -.75], [.1, 1.5, .8, 0], [.1, 1.5, -.8, 0], [.06, 1.5, 0, 0], [1.6, .06, 0, 0]]){ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), fr); b.position.set(ox, oy, .05); g.add(b); } };
    winX.forEach(x => addWin(x, -D / 2 + .02, 0)); addWin(W / 2 - .02, -1.1, -Math.PI / 2);
    // the door (on the left wall)
    const doorFrame = mat("#5a3b24", "wood", [1, 1]);
    const hinge = new THREE.Group(); hinge.position.set(-W / 2 + .05, 0, 3.8); room.group.add(hinge);
    const dp = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.3, 1.3), doorFrame); dp.position.set(0, 1.15, -.65); dp.castShadow = true; hinge.add(dp); room.door = hinge;
    // a few things every room has
    const base = new THREE.Group(); room.group.add(base);
    [["doormat", -5.6, 3.1, Math.PI / 2], ["coatRack", -6.5, 4.1, 0]].forEach(([k, x, z, ro]) => { const o = placeF(k, x, z, ro); if (o) base.add(o); });
    for (const [x, z] of [[-3, -1], [3, -1]]){ const L = new THREE.PointLight(0xffd29a, 0, 13, 1.4); L.position.set(x, WALL_H - .3, z); room.group.add(L); room.lights.push(L); const f = placeF("ceilingLamp", x, z, 0, WALL_H - .45); if (f) base.add(f); }
    room.entry = origin.clone().add(ENTRY); room.center = origin.clone().add(new THREE.Vector3(0, 1, 0));
    furnish(room, r.items || []);
    return room;
  }

  function station(room, type, x, z, yaw, opts = {}){ (room.stations[type] = room.stations[type] || []).push({ pos: room.origin.clone().add(new THREE.Vector3(x, opts.y || 0, z)), yaw, ...opts }); }
  const front = (x, z, rot, d) => [x + Math.sin(rot) * d, z + Math.cos(rot) * d];
  function furnish(room, items){
    const g = room.furn; for (const c of [...g.children]) g.remove(c);
    room.stations = {}; room.screens = {}; room.fire = null; room.disc = null; room.wheel = null; room.mill = null; room.items = items.slice();
    const has = k => items.includes(k);
    const count = k => items.filter(x => x === k).length;
    const add = o => { if (o){ o.traverse(m => { if (m.isMesh){ m.castShadow = true; m.receiveShadow = true; } }); g.add(o); } return o; };
    station(room, "floor", ...FLOOR_SPOT);
    // pictures on the back wall (KayKit), chosen per room so each home looks a bit different
    const frames = decor.filter(d => d.name.startsWith("pictureframe")); const seed = [...room.id].reduce((h, c) => h + c.charCodeAt(0), 0);
    if (frames.length) [[-5.4, 2.3], [-2.0, 2.75], [2.2, 2.4]].forEach(([x, y], i) => { const d = frames[(seed + i) % frames.length]; const o = A.place(d.m, { height: d.name.includes("large") ? .9 : .6, x, z: -D / 2 + .14, rot: KAYKIT_FACE }); if (o){ o.position.y = y - .3; add(o); } });
    const shelf = decor.find(d => d.name === "shelf_A_small"); if (shelf){ const o = A.place(shelf.m, { width: 1.1, x: 6.2, z: -D / 2 + .25, rot: KAYKIT_FACE }); if (o){ o.position.y = 1.9; add(o); } }
    if (true){ const [x, z, r] = WINDOW_SPOT; station(room, "window", x, z, r); }
    const free = [[0, 3.4, Math.PI], [4.6, 3.6, Math.PI], [-.8, -2.2, 0], [5.6, 1.4, -Math.PI / 2]]; let fi = 0;
    const slot = k => SLOT[k] || free[(fi++) % free.length];
    for (const k of new Set(items)){
      const [x, z, rot] = slot(k);
      switch (k){
        case "bed": add(placeF("bed", x, z, rot)); add(placeF("nightstand", x + 1.5, z - .5, rot)); add(placeF("pillow", x - .35, z - .6, rot, .58)); station(room, "bed", x, z + .1, rot, { y: .56, lie: true }); break;
        case "bath": add(placeF("bath", x, z, rot)); station(room, "bath", x, z, rot + Math.PI / 2, { y: .12, inTub: true }); break;
        case "mirror": add(placeF("basin", x, z, rot)); add(placeF("mirror", x + Math.sin(rot) * -.25, z + Math.cos(rot) * -.25, rot, 1.3)); { const [sx, sz] = front(x, z, rot, .9); station(room, "mirror", sx, sz, rot + Math.PI); } break;
        case "desk": { add(placeF("desk", x, z, rot)); const [cx, cz] = front(x, z, rot, .75); add(placeF("deskChair", cx, cz, rot + Math.PI)); station(room, "desk", cx, cz, rot + Math.PI, { seat: true });
          if (has("computer")){ add(placeF("screen", x, z - .15, rot, .76)); add(placeF("keyboard", x, z + .2, rot, .76));
            const scr = new THREE.Mesh(new THREE.PlaneGeometry(.5, .31), screenOff); scr.position.set(x, 1.0, z - .12); scr.rotation.y = rot; add(scr); room.screens.pc = scr; station(room, "computer", cx, cz, rot + Math.PI, { seat: true }); }
          else add(placeF("books", x + .4, z, rot, .76)); break; }
        case "bookshelf": add(placeF("bookshelf", x, z, rot)); if (count("bookshelf") > 1) add(placeF("bookshelf", x + 1.1, z, rot)); { const [sx, sz] = front(x, z, rot, .9); station(room, "bookshelf", sx, sz, rot + Math.PI); } break;
        case "sofa": { add(placeF("sofa", x, z, rot)); add(placeF("rug", x, z - 1.4, 0)); const [sx, sz] = front(x, z, rot, .12); station(room, "sofa", sx, sz, rot, { seat: true }); break; }
        case "armchair": { add(placeF("armchair", x, z, rot)); add(placeF("lamp", x - .9, z - .3, rot)); const [sx, sz] = front(x, z, rot, .1); station(room, "armchair", sx, sz, rot, { seat: true }); break; }
        case "rug": add(placeF("rug", x, z, rot)); break;
        case "tv": add(placeF("tvCabinet", x, z, rot)); add(placeF("tv", x, z - .05, rot, .62));
          { const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.12, .64), screenOff); scr.position.set(x, 1.2, z + .02); scr.rotation.y = rot; add(scr); room.screens.tv = scr; } break;
        case "console": { const c = new THREE.Mesh(new THREE.BoxGeometry(.35, .08, .25), new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: .3 })); c.position.set(x, .62, z); add(c); const led = new THREE.Mesh(new THREE.BoxGeometry(.04, .02, .01), new THREE.MeshBasicMaterial({ color: 0x5fd19a })); led.position.set(x + .12, .63, z + .13); add(led); break; }
        case "records": { add(placeF("sideTable", x, z, rot)); const tt = new THREE.Group(); tt.position.set(x, .62, z); add(tt);
          tt.add(new THREE.Mesh(new THREE.BoxGeometry(.5, .1, .4), mat("#6b4a2e", "wood", [1, .3]))); const disc = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .01, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .2 })); disc.position.y = .06; tt.add(disc); room.disc = disc;
          const label = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .012, 12), mat("#e05a6a")); label.position.y = .061; tt.add(label); disc.add(label); label.position.y = 0.001;
          add(placeF("speaker", x + .6, z, rot)); add(placeF("speaker", x - .6, z, rot)); const [sx, sz] = front(x, z, rot, .9); station(room, "records", sx, sz, rot + Math.PI); break; }
        case "stove": add(placeF("stove", x, z, rot)); add(placeF("hood", x, z, rot, 1.75)); { const [sx, sz] = front(x, z, rot, .8); station(room, "stove", sx, sz, rot + Math.PI); } break;
        case "oven": { const ov = new THREE.Group(); ov.position.set(x, 0, z); ov.rotation.y = rot; add(ov); const br = mat("#a0503a", "stone", [2, 1]);
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.1), br); body.position.y = .55; ov.add(body); const dome = new THREE.Mesh(new THREE.SphereGeometry(.65, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), br); dome.position.y = 1.1; ov.add(dome);
          const mouth = new THREE.Mesh(new THREE.BoxGeometry(.55, .4, .05), new THREE.MeshStandardMaterial({ color: 0x1a0d08, emissive: new THREE.Color("#ff6a20"), emissiveIntensity: .9 })); mouth.position.set(0, .7, .56); ov.add(mouth);
          const [sx, sz] = front(x, z, rot, 1.0); station(room, "oven", sx, sz, rot + Math.PI); break; }
        case "sink": add(placeF("sink", x, z, rot)); add(placeF("upper", x, z - .1, rot, 1.6)); { const [sx, sz] = front(x, z, rot, .8); station(room, "sink", sx, sz, rot + Math.PI); } break;
        case "coffee": add(placeF("cabinet", x, z, rot)); add(placeF("coffee", x, z, rot, .9)); add(placeF("toaster", x, z + .3, rot, .9)); { const [sx, sz] = front(x, z, rot, .8); station(room, "coffee", sx, sz, rot + Math.PI); station(room, "counter", sx, sz, rot + Math.PI); } break;
        case "counter": add(placeF("counter", x, z, rot)); { const [sx, sz] = front(x, z, rot, .9); station(room, "counter", sx, sz, rot + Math.PI); } break;
        case "table": { add(placeF("table", x, z, rot)); const chairs = [[x, z + .95, Math.PI], ...EXTRA_CHAIRS.slice(0, Math.max(0, count("chair") - 1))];
          chairs.forEach(([cx, cz, cr]) => add(placeF("chair", cx, cz, cr))); station(room, "table", x, z + .95, Math.PI, { seat: true });
          if (room.puzzle !== false){ const pz = new THREE.Mesh(new THREE.BoxGeometry(.6, .01, .45), mat("#7aa0c8")); pz.position.set(x, .77, z + .05); pz.visible = false; add(pz); room.puzzleMesh = pz; } break; }
        case "chair": if (!has("table")) { add(placeF("chair", x, z, rot)); station(room, "chair", x, z, rot, { seat: true }); } break;
        case "piano": { const p = buildPiano(x, 0, z, rot); add(p); const [sx, sz] = front(x, z, rot, 1.05); station(room, "piano", sx, sz, rot + Math.PI, { seat: true, ownSeat: true }); break; }
        case "easel": { const e = makeProp("easel"); e.position.set(x, 0, z); e.rotation.y = rot + Math.PI; add(e); const [sx, sz] = front(x, z, rot, -.75); station(room, "easel", sx, sz, rot, { own: true }); break; }
        case "plants": add(placeF("plant", x, z, rot)); add(placeF("plantS", x - .7, z + .4, rot)); add(placeF("plant", x - .2, z + 1.6, rot, 0, .9)); { station(room, "plants", x - 1.0, z + .9, Math.PI / 2 + .4); } break;
        case "mat": { const m = new THREE.Mesh(new THREE.BoxGeometry(.8, .02, 1.9), mat("#5f9e8f")); m.position.set(x, .01, z); m.rotation.y = rot; add(m); station(room, "mat", x, z, rot); break; }
        case "loom": { const l = makeLoom(); l.position.set(x, 0, z); l.rotation.y = rot; add(l); const [sx, sz] = front(x, z, rot, .7); station(room, "loom", sx, sz, rot + Math.PI, { seat: true }); break; }
        case "lamp": add(placeF("lamp", x, z, rot)); break;
        case "fireplace": { const fp = makeFireplace(); fp.position.set(x, 0, z); fp.rotation.y = rot; add(fp); room.fire = { pos: room.origin.clone().add(new THREE.Vector3(x + Math.sin(rot) * .25, .35, z + Math.cos(rot) * .25)), light: null };
          const L = new THREE.PointLight(0xff8a3a, 0, 10, 1.5); L.position.copy(room.fire.pos).sub(room.origin).add(new THREE.Vector3(0, .4, .5)); room.group.add(L); room.fire.light = L;
          const [sx, sz] = front(x, z, rot, 1.4); station(room, "fireplace", sx, sz, rot + Math.PI, { floorSit: true }); break; }
        case "workbench_indoor": { const wb = makeBench(); wb.position.set(x, 0, z); wb.rotation.y = rot; add(wb); const [sx, sz] = front(x, z, rot, .9); station(room, "workbench", sx, sz, rot + Math.PI); break; }
        case "wheel": { const w = makeWheel(); w.position.set(x, 0, z); w.rotation.y = rot; add(w); room.wheel = w.userData.spin; const [sx, sz] = front(x, z, rot, .55); station(room, "wheel", sx, sz, rot + Math.PI, { seat: true }); break; }
        case "millstone": { const ms = makeMill(); ms.position.set(x, 0, z); add(ms); room.mill = ms.userData.spin; station(room, "millstone", x + 1.6, z, -Math.PI / 2); break; }
        case "telescope": { const t = makeProp("telescope"); t.scale.setScalar(1.5); t.position.set(x, 0, z); t.rotation.y = rot + Math.PI; add(t); const [sx, sz] = front(x, z, rot, -.9); station(room, "telescope", sx, sz, rot); break; }
      }
    }
    if (has("tv")){ const s = room.stations.sofa ? room.stations.sofa[0] : null; const base = s || { pos: room.origin.clone().add(new THREE.Vector3(SLOT.tv[0], 0, SLOT.tv[1] + 2.4)), yaw: Math.PI, floorSit: true };
      (room.stations.tv = []).push({ ...base }); if (has("console")) (room.stations.console = []).push({ ...base }); }
  }
  function makeFireplace(){ const g = new THREE.Group(), st = mat("#8a8580", "stone", [2, 2]);
    const add = (w, h, d, x, y, z, m = st) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; g.add(b); };
    add(1.9, .2, .8, 0, 0, .1); add(.35, 1.2, .6, -.78, .2, 0); add(.35, 1.2, .6, .78, .2, 0); add(1.9, .5, .6, 0, 1.4, 0); add(2.1, .12, .75, 0, 1.4, .05, mat("#5a3b24", "wood", [1, .2])); add(1.2, 1.5, .5, 0, 1.9, -.05);
    add(1.2, .9, .05, 0, .2, -.25, new THREE.MeshStandardMaterial({ color: 0x120b08 }));
    for (const r of [0, .5]){ const log = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .7, 7), mat("#6b4a2e", "wood", [.3, 1])); log.rotation.z = Math.PI / 2; log.rotation.y = r; log.position.set(0, .3, 0); g.add(log); }
    return g; }
  function makeBench(){ const g = new THREE.Group(), w = mat("#8a5a36", "wood", [1, .4]), d = mat("#4d3220");
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, .1, .8), w); b.position.y = .9; g.add(b); for (const sx of [-.9, .9]) for (const sz of [-.3, .3]){ const l = new THREE.Mesh(new THREE.BoxGeometry(.1, .9, .1), d); l.position.set(sx, .45, sz); g.add(l); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 1, .05), w); back.position.set(0, 1.45, -.38); g.add(back);
    for (let i = 0; i < 5; i++){ const t = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .03), mat(["#c9ccd2", "#c98b45", "#555", "#c9ccd2", "#8a5a36"][i])); t.position.set(-.7 + i * .35, 1.5, -.34); g.add(t); }
    return g; }
  function makeWheel(){ const g = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(.35, .4, .5, 14), mat("#6b4a2e", "wood", [1, .4])); base.position.y = .25; g.add(base);
    const spin = new THREE.Group(); spin.position.y = .52; g.add(spin); spin.add(new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .04, 18), mat("#8a8580"))); const pot = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .2, 14), mat("#b0623a")); pot.position.y = .12; spin.add(pot);
    g.userData.spin = spin; return g; }
  function makeMill(){ const g = new THREE.Group(); const st = mat("#9a948a", "stone", [2, 1]); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, .4, 20), st); b.position.y = .2; g.add(b);
    const spin = new THREE.Group(); spin.position.y = .4; g.add(spin); const top = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .3, 20), st); top.position.y = .15; spin.add(top);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, .12, .12), mat("#6b4a2e", "wood", [1, .2])); beam.position.y = .5; spin.add(beam); g.userData.spin = spin; return g; }
  function makeLoom(){ const g = new THREE.Group(), w = mat("#8a5a36", "wood", [.3, 1]);
    for (const sx of [-.6, .6]){ const p = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.5, .08), w); p.position.set(sx, .75, 0); g.add(p); }
    for (const y of [.4, 1.4]){ const r = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.3, 8), w); r.rotation.z = Math.PI / 2; r.position.y = y; g.add(r); }
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .9), new THREE.MeshStandardMaterial({ color: 0xd8b46a, side: THREE.DoubleSide })); cloth.position.y = .9; g.add(cloth); return g; }

  // ---------- per-frame ----------
  let gameT = 0;
  function drawGame(dt){
    gameT += dt; const g = tvCanvas.getContext("2d"), w = 256, h = 144, sc = (gameT * 60) % 64;
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#5c94fc"); sky.addColorStop(1, "#a8d0ff"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff"; for (let i = 0; i < 3; i++){ const cx = ((i * 110 - gameT * 12) % 330 + 330) % 330 - 40; g.fillRect(cx, 20 + i * 12, 34, 10); g.fillRect(cx + 8, 14 + i * 12, 18, 8); }
    g.fillStyle = "#c84c0c"; for (let x = -sc; x < w; x += 16){ g.fillRect(x, 120, 15, 11); g.fillRect(x + 8, 131, 15, 11); }
    g.fillStyle = "#30a030"; for (let k = 0; k < 3; k++){ const px = ((k * 140 + 90 - gameT * 60) % 420 + 420) % 420 - 30; g.fillRect(px, 92, 24, 28); g.fillRect(px - 3, 88, 30, 8); }
    const jump = Math.max(0, Math.sin(gameT * 3.2)) * 40, hx = 70, hy = 104 - jump;
    g.fillStyle = "#e52521"; g.fillRect(hx, hy, 12, 6); g.fillStyle = "#f8b878"; g.fillRect(hx + 2, hy + 5, 9, 6); g.fillStyle = "#2038ec"; g.fillRect(hx, hy + 10, 12, 8); g.fillStyle = "#6b3a1f"; g.fillRect(hx - 1, hy + 16, 6, 3); g.fillRect(hx + 8, hy + 16, 6, 3);
    g.fillStyle = "#ffd700"; for (let k = 0; k < 4; k++){ const cx2 = ((k * 60 + 30 - gameT * 60) % 260 + 260) % 260; g.beginPath(); g.arc(cx2, 70 + Math.sin(gameT * 4 + k) * 4, 4, 0, 7); g.fill(); }
    g.fillStyle = "#fff"; g.font = "bold 11px monospace"; g.fillText("SCORE " + String(Math.floor(gameT * 37)).padStart(6, "0"), 8, 14); g.fillText("WORLD 1-" + (1 + Math.floor(gameT / 40) % 4), 170, 14);
    tvTex.needsUpdate = true;
  }
  function drawShow(dt){ gameT += dt; const g = tvCanvas.getContext("2d"); const k = gameT * .5;
    g.fillStyle = `hsl(${(k * 40) % 360},55%,40%)`; g.fillRect(0, 0, 256, 144);
    for (let i = 0; i < 5; i++){ g.fillStyle = `hsla(${(k * 40 + i * 60) % 360},70%,65%,.8)`; g.beginPath(); g.arc(128 + Math.sin(k + i) * 80, 72 + Math.cos(k * 1.3 + i) * 40, 14 + i * 3, 0, 7); g.fill(); }
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 118, 256, 26); g.fillStyle = "#fff"; g.font = "11px sans-serif"; g.fillText("NATURE HOUR · the secret lives of moths", 8, 135); tvTex.needsUpdate = true; }
  let codeLines = [];
  function drawPC(dt){ const g = pcCanvas.getContext("2d"); gameT += dt; if (Math.random() < dt * 8){ const words = ["let", "garden", "=", "plant(", "seeds", ");", "// tomorrow:", "build", "a", "boat", "for", "(i", "in", "stars)", "wish(i)", "music.play(", "\"nocturne\")"]; codeLines.push(Array.from({ length: 3 + Math.floor(Math.random() * 5) }, () => words[Math.floor(Math.random() * words.length)]).join(" ")); if (codeLines.length > 11) codeLines.shift(); }
    g.fillStyle = "#14202c"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#2a3a4c"; g.fillRect(0, 0, 256, 14); g.fillStyle = "#9fd8a8"; g.font = "10px monospace";
    codeLines.forEach((l, i) => g.fillText(l, 6, 28 + i * 12)); if (Math.sin(gameT * 6) > 0) g.fillRect(6 + (codeLines[codeLines.length - 1] || "").length * 6, 18 + codeLines.length * 12, 6, 10); pcTex.needsUpdate = true; }

  out.update = (dt, ctx) => {
    const day = 1 - ctx.dark;
    hemi.intensity = .35 + day * .45; sun.intensity = day * 1.6;
    for (const room of Object.values(out.rooms)){
      room.windows.forEach(w => w.material.color.setRGB(.25 + day * .45, .32 + day * .5, .5 + day * .45).lerp(new THREE.Color("#ffb070"), ctx.warm * .4));
      room.lights.forEach(L => L.intensity = (room.id === ctx.activeRoom ? 1 : .4) * (5 + ctx.dark * 10));
      const lit = room.fire && ctx.fireUntil && ctx.fireUntil[room.id] > ctx.clock;
      if (room.fire){ room.fire.light.intensity = lit ? 6 + Math.sin(performance.now() * .015) * 1.5 : 0; if (lit && Math.random() < dt * 14) fx.spawn(fx.tex.puff, room.fire.pos.clone().add(new THREE.Vector3((Math.random() - .5) * .5, 0, 0)), { vel: new THREE.Vector3(0, 1, 0), life: .6, size: .45, grow: -.4, color: Math.random() < .5 ? 0xff8a2a : 0xffd36a, opacity: .9, additive: true }); }
      const tv = room.screens.tv, pc = room.screens.pc, a = ctx.activeRoom === room.id ? ctx.anim : null;
      if (tv){ if (a === "play_videogames"){ drawGame(dt); tv.material = tvMat; } else if (a === "watch_tv"){ drawShow(dt); tv.material = tvMat; } else tv.material = screenOff; }
      if (pc){ if (a === "use_computer"){ drawPC(dt); pc.material = pcMat; } else pc.material = screenOff; }
      if (room.disc && a === "listen_records") room.disc.rotation.y += dt * 3.5;
      if (room.wheel && a === "pottery") room.wheel.rotation.y += dt * 9;
      if (room.mill && a === "grind_flour") room.mill.rotation.y += dt * .6;
      if (room.puzzleMesh) room.puzzleMesh.visible = (ctx.puzzles || {})[room.id] || a === "puzzle";
      if (room.door){ const want = ctx.doorOpen && ctx.doorOpen[room.id] ? -1.3 : 0; room.door.rotation.y += (want - room.door.rotation.y) * Math.min(1, dt * 5); }
    }
    if (ctx.activeRoom && out.rooms[ctx.activeRoom]){ const o = out.rooms[ctx.activeRoom].origin; sun.position.copy(o).add(new THREE.Vector3(8, 14, -6)); sun.target.position.copy(o); }
    fx.update(dt, { dark: ctx.dark });
  };
  // a single piece of furniture on its own, for things kept outdoors at camp
  out.itemModel = (k) => {
    const g = new THREE.Group(); const map = { bed: "bed", table: "table", chair: "chair", sofa: "sofa", armchair: "armchair", bookshelf: "bookshelf", desk: "desk", rug: "rug", lamp: "lamp", stove: "stove", sink: "sink", coffee: "cabinet", counter: "counter", bath: "bath", mirror: "mirror", tv: "tv" };
    let o = null;
    if (map[k]) o = placeF(map[k], 0, 0, 0);
    else if (k === "piano") o = buildPiano(0, 0, 0, 0); else if (k === "easel") o = makeProp("easel"); else if (k === "loom") o = makeLoom(); else if (k === "fireplace") o = makeFireplace();
    else if (k === "workbench_indoor") o = makeBench(); else if (k === "wheel") o = makeWheel(); else if (k === "millstone") o = makeMill(); else if (k === "telescope"){ o = makeProp("telescope"); o.scale.setScalar(1.5); }
    else if (k === "plants") o = placeF("plant", 0, 0, 0); else if (k === "mat") { o = new THREE.Mesh(new THREE.BoxGeometry(.8, .02, 1.9), mat("#5f9e8f")); }
    else { o = new THREE.Mesh(new THREE.BoxGeometry(.7, .55, .7), mat("#a8774a", "wood", [1, 1])); o.position.y = .27; }
    if (o){ g.add(o); g.traverse(m => { if (m.isMesh){ m.castShadow = true; m.receiveShadow = true; } }); }
    return g;
  };
  out.refresh = (id, items) => { const room = out.rooms[id]; if (room) furnish(room, items); };
  out.addRoom = (r) => { out.rooms[r.id] = makeRoom(r, Object.keys(out.rooms).length); return out.rooms[r.id]; };
  let i = 0;
  for (const r of rooms){ out.rooms[r.id] = makeRoom(r, i++); }
  out.dispose = () => { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); };
  return out;
}
