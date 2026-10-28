// The creature: a jointed little body built from its chosen look, with a library of
// hand-made animations it blends between, plus the props each activity needs.
import * as THREE from "three";
import { makeProp } from "./props.js";
import { ANIMS2 } from "./anims2.js";
import { toonify, addOutline } from "../world/style.js";

export const ANIM_NAMES = ["idle", "sit", "sleep", "eat", "drink", "read", "write", "paint", "garden", "water_plants", "fish",
  "play_piano", "play_violin", "play_cello", "play_guitar", "play_flute", "play_horn", "play_drums", "play_harp", "play_xylophone",
  "sing", "dance", "stargaze", "telescope", "sweep", "cook", "build", "think", "look_around", "exercise", "meditate", "wave", "celebrate", "stretch"];

const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs;
function defaults(){ return { hipY: 0, hipX: 0, hipYaw: 0, hipZ: 0, torsoX: 0, torsoY: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0,
  shL: [0, 0, .18], elL: -.1, haL: [0, 0, 0], shR: [0, 0, -.18], elR: -.1, haR: [0, 0, 0],
  lgL: 0, lgLz: .02, knL: 0, ftL: 0, lgR: 0, lgRz: -.02, knR: 0, ftR: 0, tail: 0, eyes: 1, mouth: 0, squash: 1 }; }
const sitStool = P => { P.hipY = .1; P.lgL = P.lgR = -1.45; P.knL = P.knR = 1.35; P.ftL = P.ftR = .1; };
const sitGround = P => { P.hipY = -.27; P.lgL = P.lgR = -1.5; P.knL = P.knR = .12; P.lgLz = .14; P.lgRz = -.14; P.torsoX = -.04; };
const crouch = P => { P.hipY = -.13; P.lgL = P.lgR = -1.0; P.knL = P.knR = 1.6; P.ftL = P.ftR = -.5; P.torsoX = .45; };
const restArms = (P, t) => { P.shL[0] = sin(t * 1.6) * .04; P.shR[0] = sin(t * 1.6 + 1) * .04; };

// each animation: pose(P, t, ctx), props held, ground props set down in front
export const ANIMS = {
  idle: { pose(P, t){ P.torsoX = sin(t * 1.6) * .02; P.headY = sin(t * .37) * .4 * (sin(t * .11) > 0 ? 1 : .25); P.headX = sin(t * .23) * .08; restArms(P, t); P.tail = sin(t * 2) * .3;
    if ((t % 14) < 2.2){ const k = sin((t % 14) / 2.2 * Math.PI); P.shR = [-.2 * k, 0, -.18 - k * .3]; } } },
  // soft chibi waddle: short quick steps, a gentle bounce, side-to-side sway and swinging arms
  walk: { pose(P, t, c){ const f = c.phase, sw = sin(f), cs = cos(f), a = Math.min(1.4, c.speed / 1.4);
    P.lgL = sw * .5 * a; P.lgR = -sw * .5 * a; P.knL = max(0, cs) * .55 * a; P.knR = max(0, -cs) * .55 * a; P.ftL = -max(0, cs) * .2 * a; P.ftR = -max(0, -cs) * .2 * a;
    P.shL = [-sw * .45 * a, 0, .18]; P.shR = [sw * .45 * a, 0, -.18]; P.elL = P.elR = -.4;
    P.hipY = abs(sin(f)) * .035 * a - .005; P.hipZ = sw * .055 * a; P.torsoZ = -sw * .04 * a; P.torsoX = .05 * a; P.torsoY = sw * .06;
    P.headZ = -sw * .05 * a; P.headX = -.04 + abs(cs) * .03; P.tail = sin(f) * .4; P.squash = 1 + abs(cs) * .025 * a; } },
  sit: { pose(P, t){ sitGround(P); P.shL = [-.55, 0, .2]; P.shR = [-.55, 0, -.2]; P.elL = P.elR = -.3; P.headY = sin(t * .3) * .45; P.headX = sin(t * .21) * .1; P.tail = sin(t * 1.5) * .25; } },
  sleep: { face: "sleep", fx: "z", pose(P, t){ P.hipY = -.22; P.hipZ = 1.42; P.lgL = P.lgR = -.7; P.knL = P.knR = 1.0; P.shL = [-.7, 0, .1]; P.shR = [-.7, 0, -.1]; P.elL = P.elR = -1.3; P.eyes = 0; P.squash = 1 + sin(t * 1.2) * .025; P.headX = .2; } },
  eat: { props: [["bowl", "handL", [0, -.1, .07], [0, 0, 0]], ["spoon", "handR", [0, -.06, .02], [0, 0, 0]]], ground: [["blanket", [0, 0, .1], 0]],
    pose(P, t){ sitGround(P); const k = (sin(t * 2.1) + 1) / 2; P.shL = [-.95, 0, .3]; P.elL = -.8; P.shR = [-.75 - k * .55, 0, -.22]; P.elR = -.45 - k * .5; P.mouth = k > .75 ? 1 : 0; P.headX = .16 + k * .14; P.tail = sin(t * 3) * .35; } },
  drink: { props: [["cup", "handR", [0, -.1, .04], [0, 0, 0]]], pose(P, t){ sitGround(P); const k = max(0, sin(t * 1.1)); P.shR = [-.8 - k * .5, 0, -.2]; P.elR = -.6 - k * .45; P.headX = .1 - k * .12; P.shL = [-.5, 0, .2]; P.elL = -.3; } },
  read: { props: [["book", "torso", [0, .5, .42], [-.95, 0, 0]]], pose(P, t){ sitGround(P); P.shL = [-1.0, 0, .32]; P.elL = -.95; P.shR = [-1.0, 0, -.32]; P.elR = -.95; P.headX = .38 + sin(t * .3) * .03;
    const pt = t % 9; if (pt < .9){ const k = sin(pt / .9 * Math.PI); P.shR[2] = -.32 + k * .35; P.elR = -.95 - k * .3; } P.tail = sin(t) * .15; } },
  write: { props: [["pen", "handR", [0, -.06, .02], [.4, 0, 0]]], ground: [["notebook", [0, 0, .46], 0]],
    pose(P, t){ sitGround(P); P.torsoX = .4; P.headX = .5; P.shR = [-1.0, 0, -.12]; P.elR = -.35 + sin(t * 9) * .05; P.haR = [sin(t * 7) * .15, 0, 0]; P.shL = [-.85, 0, .18]; P.elL = -.3;
      if ((t % 11) < 1.5){ P.headX = .1; P.shR = [-1.6, 0, -.1]; P.elR = -1.9; } } },
  paint: { fx: "spark", props: [["brush", "handR", [0, -.06, .02], [.3, 0, 0]], ["palette", "handL", [0, -.08, .08], [1.2, 0, 0]]], ground: [["easel", [.15, 0, .7], Math.PI + .25]],
    pose(P, t){ P.shR = [-1.3 + sin(t * 2.1) * .25, 0, -.15 + cos(t * 1.7) * .2]; P.elR = -.45 + sin(t * 4) * .1; P.shL = [-.7, 0, .45]; P.elL = -1.25; P.headZ = sin(t * .5) * .14; P.headX = -.05;
      if ((t % 13) < 2){ P.shR = [-.3, 0, -.2]; P.elR = -1.6; P.headZ = .25; P.torsoX = -.08; } } },
  garden: { props: [["trowel", "handR", [0, -.06, .02], [0, 0, 0]]], pose(P, t){ crouch(P); P.shL = [-.9 + sin(t * 3) * .35, 0, .2]; P.shR = [-.9 - sin(t * 3) * .35, 0, -.2]; P.elL = P.elR = -.4; P.headX = .35; P.tail = sin(t * 2) * .4; } },
  water_plants: { props: [["wateringCan", "handR", [0, -.05, .02], [0, 0, 0]]], pose(P, t){ P.shR = [-1.15, 0, -.12]; P.elR = -.15; P.haR = [-.6 + sin(t * .8) * .25, 0, 0]; P.hipYaw = sin(t * .25) * .5; P.headX = .3; P.shL = [0, 0, .35]; P.elL = -.2; } },
  fish: { props: [["rod", "torso", [0, .32, .38], [1.0, 0, 0]]], ground: [["bobber", [0, .05, 3.6], 0]],
    pose(P, t){ sitGround(P); P.shL = [-1.25, 0, .1]; P.shR = [-1.25, 0, -.1]; P.elL = P.elR = -.55; const tug = (t % 7) < .5 ? sin((t % 7) / .5 * Math.PI) : 0; P.torsoX = -.05 - tug * .15; P.headX = .05; P.tail = sin(t * .8) * .2; } },
  play_piano: { music: true, ground: [["stool", [0, 0, -.02], 0], ["pianoSmall", [0, 0, .74], Math.PI]],
    pose(P, t, c){ sitStool(P); P.shL = [-1.05, 0, .2]; P.shR = [-1.05, 0, -.2]; P.elL = -.6 - c.hitL * .3; P.elR = -.6 - c.hitR * .3; P.haL = [c.hitL * .35, 0, 0]; P.haR = [c.hitR * .35, 0, 0];
      P.shL[2] += sin(t * .9) * .12; P.shR[2] += sin(t * .7 + 1) * .12; P.headX = .18 + sin(t * c.beat * Math.PI) * .06; P.torsoZ = sin(t * .6) * .07; P.torsoX = .1; P.eyes = (sin(t * .2) > .6) ? .2 : 1; } },
  play_violin: { music: true, props: [["violin", "torso", [.14, .78, .26], [-1.25, .55, .2]], ["bow", "handR", [0, -.05, .02], [0, 0, 1.4]]],
    pose(P, t, c){ const b = sin(t * c.bow); P.shL = [-1.2, .35, .95]; P.elL = -1.55; P.shR = [-.95, 0, -.55 + b * .32]; P.elR = -1.15 + b * .5; P.headZ = -.32; P.headX = .1; P.torsoZ = sin(t * .8) * .08; P.torsoY = b * .05; P.eyes = sin(t * .3) > .4 ? .15 : 1; } },
  play_cello: { music: true, props: [["bow", "handR", [0, -.05, .02], [0, 0, 1.5]]], ground: [["stool", [0, 0, -.05], 0], ["cello", [0, 0, .42], 0]],
    pose(P, t, c){ sitStool(P); P.lgLz = .4; P.lgRz = -.4; const b = sin(t * c.bow * .8); P.shL = [-1.35, 0, .3]; P.elL = -.8 - c.hitL * .15; P.shR = [-.85, 0, -.25 + b * .3]; P.elR = -.6 + b * .2; P.headZ = -.18; P.headX = .15; P.torsoZ = sin(t * .5) * .06; } },
  play_guitar: { music: true, props: [["guitar", "torso", [0, .42, .3], [0, 0, -1.15]]], ground: [["stool", [0, 0, -.02], 0]],
    pose(P, t, c){ sitStool(P); P.shR = [-.5, 0, -.12]; P.elR = -1.45 + c.hitR * .35; P.shL = [-.95, .3, .65]; P.elL = -.95 - c.hitL * .1; P.headX = .28; P.headZ = sin(t * c.beat * Math.PI * .5) * .1; P.knR = 1.35 - max(0, sin(t * c.beat * Math.PI)) * .2; } },
  play_flute: { music: true, props: [["flute", "head", [-.2, -.14, .3], [0, .15, 0]]],
    pose(P, t, c){ P.shL = [-1.45, 0, -.25]; P.elL = -1.6; P.shR = [-1.25, 0, -.65]; P.elR = -1.25; P.haL = [sin(t * 12) * .08, 0, 0]; P.haR = [cos(t * 11) * .08, 0, 0]; P.headZ = .12; P.torsoZ = sin(t * 1.1) * .08; P.torsoX = -.03 + c.hitL * .03; P.eyes = .35; } },
  play_horn: { music: true, props: [["horn", "head", [0, -.13, .28], [0, 0, 0]]],
    pose(P, t, c){ P.shL = [-1.3, 0, .22]; P.shR = [-1.3, 0, -.22]; P.elL = P.elR = -1.4; P.torsoX = -.12 - c.hitL * .05; P.headX = -.1; P.hipY = -c.hitL * .02; P.torsoZ = sin(t * .9) * .05; } },
  play_drums: { music: true, props: [["stick", "handL", [0, -.05, .02], [.6, 0, 0]], ["stick", "handR", [0, -.05, .02], [.6, 0, 0]]], ground: [["stool", [0, 0, -.05], 0], ["drum", [0, 0, .58], 0]],
    pose(P, t, c){ sitStool(P); P.shL = [-.75 - c.hitL * .5, 0, .3]; P.shR = [-.75 - c.hitR * .5, 0, -.3]; P.elL = -.8 + c.hitL * .4; P.elR = -.8 + c.hitR * .4; P.headX = .15 + sin(t * c.beat * Math.PI) * .1; P.knR = 1.35 - c.kick * .3; } },
  play_harp: { music: true, ground: [["stool", [0, 0, -.05], 0], ["harp", [.05, 0, .46], Math.PI / 2]],
    pose(P, t, c){ sitStool(P); P.shL = [-1.0 - c.hitL * .1, 0, .35]; P.shR = [-1.1 - c.hitR * .1, 0, -.15]; P.elL = -.7; P.elR = -.8; P.haL = [sin(t * 9) * .2, 0, 0]; P.haR = [cos(t * 8) * .2, 0, 0]; P.headZ = .12; P.headX = .1; P.torsoZ = sin(t * .6) * .05; } },
  play_xylophone: { music: true, props: [["mallet", "handL", [0, -.05, .02], [.8, 0, 0]], ["mallet", "handR", [0, -.05, .02], [.8, 0, 0]]], ground: [["xylophone", [0, 0, .55], 0]],
    pose(P, t, c){ P.shL = [-.85 - c.hitL * .3, 0, .25 + sin(t * 1.3) * .25]; P.shR = [-.85 - c.hitR * .3, 0, -.25 + sin(t * 1.1) * .25]; P.elL = P.elR = -.6; P.headX = .3; P.hipY = -abs(sin(t * c.beat * Math.PI)) * .02; } },
  sing: { music: true, fx: "notes", pose(P, t, c){ const open = .3 + c.hitL * .7; P.mouth = open; P.shL = [-.55, 0, .9 + sin(t * .8) * .25]; P.shR = [-.55, 0, -.9 - sin(t * .7) * .25]; P.elL = P.elR = -.35; P.headZ = sin(t * 1.2) * .12; P.headX = -.15; P.torsoZ = sin(t * 1.2) * .06; P.eyes = .6; } },
  dance: { fx: "heart", pose(P, t){ const b = t * 5; P.hipYaw = sin(t * .8) * 1.6; P.hipY = abs(sin(b)) * .12; P.shL = [-2.6 + sin(b) * .3, 0, .5]; P.shR = [-2.6 - sin(b) * .3, 0, -.5]; P.elL = P.elR = -.4;
    P.lgL = sin(b) * .4; P.lgR = -sin(b) * .4; P.knL = max(0, sin(b)) * .5; P.knR = max(0, -sin(b)) * .5; P.torsoZ = sin(t * 2.5) * .18; P.mouth = .5; P.tail = sin(b * 2) * .7; } },
  stargaze: { ground: [["blanket", [0, 0, -.1], 0]], pose(P, t){ sitGround(P); P.torsoX = -.55; P.shL = [.75, 0, .4]; P.shR = [.75, 0, -.4]; P.elL = P.elR = 0; P.headX = -.65 + sin(t * .2) * .05; P.headY = sin(t * .13) * .5; P.tail = sin(t * .7) * .2; } },
  telescope: { ground: [["telescope", [0, 0, .62], 0]], pose(P, t){ P.torsoX = .25; P.headX = -.25; P.shL = [-1.5, 0, .25]; P.shR = [-1.4, 0, -.25]; P.elL = -.5; P.elR = -.6; P.hipYaw = sin(t * .1) * .1; if ((t % 15) < 3){ P.headX = .1; P.torsoX = 0; P.shR = [-.2, 0, -.5]; P.elR = -1.8; } } },
  sweep: { props: [["broom", "torso", [-.1, .1, .36], [.55, 0, .35]]], pose(P, t){ P.hipYaw = sin(t * 1.5) * .35; P.torsoZ = -sin(t * 1.5) * .1; P.shL = [-.85, 0, .05]; P.shR = [-.6, 0, -.25]; P.elL = -.6; P.elR = -.6; P.headX = .3; P.lgL = sin(t * 1.5) * .1; P.lgR = -sin(t * 1.5) * .1; } },
  cook: { props: [["spoon", "handR", [0, -.04, .02], [0, 0, 0]]], ground: [["pot", [0, 0, .62], 0]],
    pose(P, t){ P.shR = [-1.05 + sin(t * 3) * .15, 0, -.2 + cos(t * 3) * .15]; P.elR = -.55; P.shL = [0, 0, .65]; P.elL = -1.5; P.headX = .35; P.tail = sin(t * 2) * .3; if ((t % 9) < 1.2){ P.mouth = 1; P.headX = .1; P.shR = [-1.6, 0, -.1]; P.elR = -1.8; } } },
  build: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]]], ground: [["plank", [0, 0, .55], .4]],
    pose(P, t){ crouch(P); P.torsoX = .5; const hit = max(0, sin(t * 4)); P.shR = [-1.4 + hit * .9, 0, -.15]; P.elR = -.9; P.shL = [-1.0, 0, .2]; P.elL = -.3; P.headX = .4; } },
  think: { fx: "think", pose(P, t){ P.shR = [-1.15, 0, -.1]; P.elR = -2.05; P.shL = [-.4, 0, -.25]; P.elL = -1.35; P.headZ = .2 + sin(t * .4) * .05; P.headX = -.12; P.headY = sin(t * .25) * .3; P.tail = sin(t * .6) * .3; } },
  look_around: { pose(P, t){ P.headY = sin(t * .6) * .85; P.torsoY = sin(t * .6) * .3; P.headX = -.1; if ((t % 10) < 3){ P.shR = [-1.6, 0, -.2]; P.elR = -1.6; } restArms(P, t); } },
  exercise: { pose(P, t){ const k = (sin(t * 4) + 1) / 2; P.hipY = k * .12; P.shL = [0, 0, .2 + k * 2.5]; P.shR = [0, 0, -.2 - k * 2.5]; P.lgLz = .02 + k * .3; P.lgRz = -.02 - k * .3; P.mouth = .3; } },
  meditate: { face: "calm", pose(P, t){ sitGround(P); P.lgL = P.lgR = -1.25; P.lgLz = .95; P.lgRz = -.95; P.knL = P.knR = 2.1; P.shL = [-.45, 0, .55]; P.shR = [-.45, 0, -.55]; P.elL = P.elR = -.6; P.eyes = 0; P.squash = 1 + sin(t * .6) * .025; P.headX = .08; P.torsoX = 0; } },
  wave: { pose(P, t){ P.shR = [-.3, 0, -2.6]; P.elR = -.4 + sin(t * 8) * .45; P.mouth = .35; P.headZ = -.1; restArms(P, t); P.shR = [-.3, 0, -2.6]; } },
  celebrate: { fx: "spark", pose(P, t){ const j = max(0, sin(t * 5)); P.hipY = j * .35; P.shL = [-2.8, 0, .4]; P.shR = [-2.8, 0, -.4]; P.elL = P.elR = -.2 + j * .3; P.mouth = 1; P.knL = P.knR = (1 - j) * .6; P.lgL = P.lgR = -(1 - j) * .3; P.tail = sin(t * 10) * .8; } },
  stretch: { pose(P, t){ const k = (sin(t * .8) + 1) / 2; P.shL = [-2.9 * k, 0, .3]; P.shR = [-2.9 * k, 0, -.3]; P.elL = P.elR = 0; P.torsoX = -.15 * k; P.headX = -.3 * k; P.mouth = k > .8 ? 1 : 0; P.eyes = k > .8 ? .1 : 1; P.hipY = k * .03; } },
};
Object.assign(ANIMS, ANIMS2);
ANIMS.play_reedflute = { ...ANIMS.play_flute, props: [["reedFlute", "head", [-.2, -.14, .3], [0, .15, 0]]] };
export const ALL_ANIMS = Object.keys(ANIMS);
// faces for each feeling: brow (positive = cross), brow height, eye openness, "^^" eyes, mouth, blush
export const EMO = {
  neutral: { brow: 0, by: 0, open: 1, mouth: "smile", blush: .35 }, happy: { brow: -.08, by: .02, open: 1, mouth: "grin", blush: .55 },
  joyful: { brow: -.12, by: .04, open: 1, arcs: true, mouth: "grin", blush: .75 }, calm: { brow: 0, by: 0, open: .6, mouth: "smile", blush: .35 },
  sad: { brow: -.45, by: .01, open: .8, mouth: "frown", blush: .1 }, tired: { brow: -.2, by: -.02, open: .4, mouth: "flat", blush: .15 },
  angry: { brow: .5, by: -.03, open: .9, mouth: "frown", blush: .05 }, surprised: { brow: -.1, by: .07, open: 1.2, big: .15, mouth: "o", blush: .3 },
  thinking: { brow: .15, by: .02, open: .85, mouth: "flat", blush: .2 }, love: { brow: -.1, by: .03, open: 1, arcs: true, mouth: "grin", blush: 1 },
  focused: { brow: .25, by: -.01, open: .8, mouth: "flat", blush: .2 }, worried: { brow: -.35, by: .03, open: 1, mouth: "flat", blush: .2 },
};
export function emotionFor(mood, needs, anim){
  const m = String(mood || "").toLowerCase();
  if (anim === "sleep" || anim === "nap") return "calm";
  if (/love|ador|affection|warm-?heart/.test(m)) return "love";
  if (/joy|delight|elat|ecstat|thrill|excit|giddy|overjoy/.test(m)) return "joyful";
  if (/happy|cheer|glad|content|proud|bright|playful|hope/.test(m)) return "happy";
  if (/sad|lonely|melanchol|blue|gloom|homesick|down/.test(m)) return "sad";
  if (/angry|cross|annoy|frustrat|grump|irritat/.test(m)) return "angry";
  if (/surpris|amaz|astonish|wonder|awe/.test(m)) return "surprised";
  if (/worr|anxious|nervous|uneasy|scared|afraid/.test(m)) return "worried";
  if (/tired|sleepy|weary|exhaust|drowsy/.test(m) || (needs && needs.energy < 20)) return "tired";
  if (/curious|thought|pensive|ponder|reflect/.test(m)) return "thinking";
  if (/focus|determin|busy|industri|diligent/.test(m) || /^(build|chop|saw|craft|smith|mine)/.test(anim || "")) return "focused";
  if (/calm|peace|serene|relax|cosy|cozy/.test(m)) return "calm";
  return needs && needs.joy > 70 ? "happy" : "neutral";
}
// pick an animation from free text when the creature didn't name one
export function guessAnim(text){
  const t = String(text || "").toLowerCase();
  const rules = [[/sleep|nap|doze|bed/, "sleep"], [/piano|keys|organ|harmonium/, "play_piano"], [/violin|fiddle/, "play_violin"], [/cello|double bass/, "play_cello"], [/guitar|ukulele|lute/, "play_guitar"],
    [/flute|recorder|clarinet|oboe|bassoon/, "play_flute"], [/trumpet|horn|trombone|tuba|sax/, "play_horn"], [/drum|percussion/, "play_drums"], [/harp/, "play_harp"], [/xylophone|marimba|glockenspiel/, "play_xylophone"],
    [/sing|hum|song/, "sing"], [/danc/, "dance"], [/telescope/, "telescope"], [/star|sky|cloud|moon/, "stargaze"], [/eat|breakfast|lunch|dinner|snack|meal|soup/, "eat"], [/tea|coffee|drink|cocoa/, "drink"],
    [/read|book|study/, "read"], [/writ|journal|letter|poem|diary/, "write"], [/paint|draw|sketch/, "paint"], [/water/, "water_plants"], [/garden|plant|weed|dig|harvest|seed/, "garden"],
    [/fish/, "fish"], [/sweep|clean|tidy/, "sweep"], [/cook|bak|stir|kitchen/, "cook"], [/build|repair|fix|hammer|craft|carv/, "build"], [/think|ponder|wonder|daydream/, "think"],
    [/explor|look|wander|watch/, "look_around"], [/exercis|stretch|yoga/, "stretch"], [/meditat|breath|rest/, "meditate"], [/celebrat|jump|cheer/, "celebrate"], [/sit|relax|chat/, "sit"]];
  for (const [re, a] of rules) if (re.test(t)) return a;
  return "idle";
}

// ---------- the body ----------
export function createCreature(look){
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .62, ...o });
  const flat = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const bodyM = std(look.body), bellyM = std(look.belly), accentM = std(look.accent), darkM = std("#2a2233", { roughness: .3 }), whiteM = flat(0xffffff);
  const limbM = std(new THREE.Color(look.body).multiplyScalar(.92));
  // chibi proportions: a big round head on a small body with short limbs
  const dims = { round: [.3, .27, .27, .44], tall: [.25, .33, .24, .41], wide: [.36, .24, .3, .46] }[look.shape] || [.3, .27, .27, .44];
  const [rx, ry, rz, HR] = dims;
  const LEG_T = .12, LEG_S = .1, HIP_Y = LEG_T + LEG_S + .05;
  const mk = (geo, m, p = [0, 0, 0], parent) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o; };
  const face = (geo, m, p, parent) => { const o = mk(geo, m, p, parent); o.castShadow = false; o.userData.noOutline = true; return o; };
  const capsule = (r, len) => { const g = new THREE.CapsuleGeometry(r, len, 4, 10); g.translate(0, -len / 2 - r * .3, 0); return g; };

  const root = new THREE.Group(); root.name = "creature";
  const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const body = mk(new THREE.SphereGeometry(1, 32, 24), bodyM, [0, ry * .95, 0], torso); body.scale.set(rx, ry, rz);
  const belly = mk(new THREE.SphereGeometry(1, 24, 18), bellyM, [0, ry * .8, rz * .5], torso); belly.scale.set(rx * .7, ry * .65, rz * .55); belly.userData.noOutline = true;
  const neck = new THREE.Group(); neck.position.set(0, ry * 1.62, 0); torso.add(neck);
  const head = new THREE.Group(); head.position.y = HR * .84; neck.add(head);
  const skull = mk(new THREE.SphereGeometry(HR, 40, 30), bodyM, [0, 0, 0], head); skull.scale.set(1.04, .96, 1);
  const muzzle = face(new THREE.SphereGeometry(HR * .62, 24, 16), bellyM, [0, -HR * .3, HR * .5], head); muzzle.scale.set(1.15, .7, .6);
  // eyes: white, a big dark iris, two shiny highlights, plus "^^" arcs for joy
  const eyes = [], arcs = [], brows = [];
  for (const s of [-1, 1]){
    const eg = new THREE.Group(); eg.position.set(s * HR * .36, HR * .06, HR * .86); head.add(eg);
    const white = face(new THREE.SphereGeometry(HR * .2, 20, 16), whiteM, [0, 0, 0], eg); white.scale.set(.9, 1.15, .45);
    const iris = face(new THREE.SphereGeometry(HR * .15, 20, 16), flat("#2a2233"), [0, -HR * .02, HR * .06], eg); iris.scale.set(.9, 1.1, .45);
    face(new THREE.SphereGeometry(HR * .055, 10, 8), whiteM, [HR * .05, HR * .07, HR * .12], eg);
    face(new THREE.SphereGeometry(HR * .028, 8, 6), whiteM, [-HR * .045, -HR * .06, HR * .12], eg);
    eyes.push(eg);
    const arc = face(new THREE.TorusGeometry(HR * .11, HR * .025, 6, 16, Math.PI), flat("#2a2233"), [s * HR * .36, HR * .02, HR * .95], head); arc.visible = false; arcs.push(arc);
    const brow = face(new THREE.BoxGeometry(HR * .24, HR * .045, HR * .04), flat("#3a2c3a"), [s * HR * .36, HR * .38, HR * .9], head); brow.rotation.x = -.25; brow.userData.side = s; brows.push(brow);
    const cheek = face(new THREE.SphereGeometry(HR * .14, 12, 10), flat(0xff8fa8, { transparent: true, opacity: .5 }), [s * HR * .62, -HR * .2, HR * .74], head); cheek.scale.set(1, .5, .3); cheek.userData.cheek = true;
  }
  const cheeks = []; head.traverse(o => { if (o.userData.cheek) cheeks.push(o); });
  // mouths: a set of shapes the face switches between
  const mouthM = flat("#5a1f2a"), lineM = flat("#2a2233");
  const mouths = {
    smile: face(new THREE.TorusGeometry(HR * .11, HR * .022, 6, 16, Math.PI), lineM, [0, -HR * .3, HR * .93], head),
    frown: face(new THREE.TorusGeometry(HR * .09, HR * .022, 6, 16, Math.PI), lineM, [0, -HR * .38, HR * .92], head),
    flat: face(new THREE.BoxGeometry(HR * .16, HR * .03, HR * .03), lineM, [0, -HR * .32, HR * .95], head),
    grin: face(new THREE.SphereGeometry(HR * .14, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthM, [0, -HR * .25, HR * .9], head),
    o: face(new THREE.SphereGeometry(HR * .08, 14, 10), mouthM, [0, -HR * .32, HR * .92], head),
  };
  mouths.smile.rotation.z = Math.PI; mouths.grin.scale.set(1, 1, .5);
  const tongue = face(new THREE.SphereGeometry(HR * .07, 10, 8), flat("#ff7a8a"), [0, -HR * .34, HR * .93], head); tongue.scale.set(1, .5, .4);
  mouths.o.scale.set(1, 1.1, .4);
  const mouthO = mouths.o, smile = mouths.smile;
  if (look.face === "beak"){ const b = mk(new THREE.ConeGeometry(HR * .17, HR * .5, 10), accentM, [0, -HR * .05, HR * 1.08], head); b.rotation.x = Math.PI / 2; }
  if (look.face === "snout"){ const s = mk(new THREE.SphereGeometry(HR * .3, 16, 12), accentM, [0, -HR * .1, HR * .88], head); s.scale.set(1, .7, .7); mk(new THREE.SphereGeometry(HR * .08, 8, 6), darkM, [0, -HR * .02, HR * 1.08], head); }
  if (look.face === "whiskers"){ mk(new THREE.SphereGeometry(HR * .07, 8, 6), darkM, [0, -HR * .05, HR * 1.0], head);
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]){ const w = mk(new THREE.BoxGeometry(HR * .7, .006, .006), darkM, [s * HR * .55, -HR * .1 + k * HR * .07, HR * .82], head); w.rotation.z = s * k * .2; w.rotation.y = -s * .3; } }
  // ears
  for (const s of [-1, 1]){
    if (look.ears === "pointy"){ const e = mk(new THREE.ConeGeometry(HR * .3, HR * .75, 6), bodyM, [s * HR * .52, HR * .82, -HR * .05], head); e.rotation.z = -s * .35; mk(new THREE.ConeGeometry(HR * .17, HR * .5, 6), bellyM, [s * HR * .52, HR * .8, HR * .04], head).rotation.z = -s * .35; }
    if (look.ears === "round"){ const e = mk(new THREE.SphereGeometry(HR * .32, 14, 10), bodyM, [s * HR * .62, HR * .75, -HR * .05], head); e.scale.z = .5; const i = mk(new THREE.SphereGeometry(HR * .18, 10, 8), bellyM, [s * HR * .62, HR * .75, HR * .06], head); i.scale.z = .4; }
    if (look.ears === "long"){ const pivot = new THREE.Group(); pivot.position.set(s * HR * .35, HR * .8, -HR * .1); pivot.rotation.z = -s * .2; head.add(pivot); pivot.userData.ear = s;
      const e = mk(new THREE.SphereGeometry(1, 14, 10), bodyM, [0, HR * .7, 0], pivot); e.scale.set(HR * .24, HR * .8, HR * .14); const i = mk(new THREE.SphereGeometry(1, 10, 8), bellyM, [0, HR * .7, HR * .07], pivot); i.scale.set(HR * .12, HR * .6, HR * .05); }
    if (look.ears === "antennae"){ const a = mk(new THREE.CylinderGeometry(.008, .01, HR * 1.1, 5), darkM, [s * HR * .3, HR * 1.25, 0], head); a.rotation.z = -s * .35; mk(new THREE.SphereGeometry(HR * .13, 10, 8), accentM, [s * HR * .52, HR * 1.75, 0], head); }
    if (look.ears === "horns"){ const h = mk(new THREE.ConeGeometry(HR * .12, HR * .55, 8), accentM, [s * HR * .48, HR * .9, 0], head); h.rotation.z = -s * .45; }
  }
  // accessories
  if (look.accessory === "scarf"){ const sc = mk(new THREE.TorusGeometry(rx * .72, .055, 8, 24), accentM, [0, ry * 1.62, 0], torso); sc.rotation.x = Math.PI / 2; const tail = mk(new THREE.BoxGeometry(.09, .26, .03), accentM, [-rx * .35, ry * 1.38, rz * .78], torso); tail.rotation.z = .25; }
  if (look.accessory === "hat"){ const hc = std(new THREE.Color(look.accent).multiplyScalar(.6)); mk(new THREE.CylinderGeometry(HR * .78, HR * .78, .025, 20), hc, [0, HR * .84, 0], head); mk(new THREE.CylinderGeometry(HR * .5, HR * .52, HR * .55, 20), hc, [0, HR * 1.1, 0], head); mk(new THREE.CylinderGeometry(HR * .53, HR * .53, HR * .1, 20), accentM, [0, HR * .92, 0], head); }
  if (look.accessory === "bow"){ for (const s of [-1, 1]){ const b = mk(new THREE.ConeGeometry(HR * .2, HR * .4, 4), accentM, [s * HR * .25 - HR * .35, HR * .9, HR * .2], head); b.rotation.z = s * Math.PI / 2; } mk(new THREE.SphereGeometry(HR * .09, 8, 6), accentM, [-HR * .35, HR * .9, HR * .2], head); }
  if (look.accessory === "glasses"){ for (const s of [-1, 1]) mk(new THREE.TorusGeometry(HR * .22, .008, 6, 18), darkM, [s * HR * .38, HR * .12, HR * .96], head); mk(new THREE.BoxGeometry(HR * .3, .008, .008), darkM, [0, HR * .14, HR * .99], head); }
  if (look.accessory === "flower"){ for (let k = 0; k < 6; k++) mk(new THREE.SphereGeometry(HR * .1, 8, 6), accentM, [-HR * .4 + cos(k * 1.05) * HR * .14, HR * .82 + sin(k * 1.05) * HR * .14, HR * .3], head); mk(new THREE.SphereGeometry(HR * .08, 8, 6), std("#ffd23f"), [-HR * .4, HR * .82, HR * .34], head); }
  // tail
  const tail = new THREE.Group(); tail.position.set(0, ry * .55, -rz * .9); torso.add(tail);
  if (look.tail === "short") mk(new THREE.SphereGeometry(.09, 12, 9), bodyM, [0, 0, -.04], tail);
  if (look.tail === "fluffy") mk(new THREE.SphereGeometry(.16, 14, 10), bellyM, [0, .04, -.1], tail);
  if (look.tail === "long"){ const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .05, -.22), new THREE.Vector3(0, .28, -.38), new THREE.Vector3(0, .45, -.28)]); mk(new THREE.TubeGeometry(curve, 16, .035, 8, false), bodyM, [0, 0, 0], tail); mk(new THREE.SphereGeometry(.05, 8, 6), accentM, [0, .45, -.28], tail); }
  // arms
  const arm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * rx * .92, ry * 1.2, 0); torso.add(sh);
    mk(capsule(.05, .1), limbM, [0, 0, 0], sh);
    const el = new THREE.Group(); el.position.y = -.15; sh.add(el);
    mk(capsule(.046, .08), limbM, [0, 0, 0], el);
    const hand = new THREE.Group(); hand.position.y = -.14; el.add(hand);
    mk(new THREE.SphereGeometry(.068, 14, 12), bellyM, [0, -.02, 0], hand);
    return { sh, el, hand };
  };
  const L = arm(1), Rt = arm(-1);
  // legs
  const leg = (s) => {
    const hip = new THREE.Group(); hip.position.set(s * rx * .38, 0, 0); hips.add(hip);
    mk(capsule(.068, LEG_T - .05), limbM, [0, 0, 0], hip);
    const knee = new THREE.Group(); knee.position.y = -LEG_T; hip.add(knee);
    mk(capsule(.064, LEG_S - .05), limbM, [0, 0, 0], knee);
    const ankle = new THREE.Group(); ankle.position.y = -LEG_S; knee.add(ankle);
    const foot = mk(new THREE.SphereGeometry(.095, 14, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(look.body).multiplyScalar(.72), roughness: .7 }), [0, -.02, .05], ankle); foot.scale.set(1, .55, 1.45);
    return { hip, knee, ankle };
  };
  const LL = leg(1), LR = leg(-1);

  // sockets for props
  const sockets = { handL: L.hand, handR: Rt.hand, torso, head };
  const groundProps = new THREE.Group(); root.add(groundProps);
  // soft contact shadow so the creature always feels planted on the ground
  { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    gr.addColorStop(0, "rgba(30,20,40,.42)"); gr.addColorStop(1, "rgba(30,20,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 1; blob.userData.noOutline = true; blob.userData.noToon = true; root.add(blob); }
  let held = [], anim = "idle", animT = 0;
  const umbrella = makeProp("umbrella"); umbrella.position.set(0, -.06, .02); umbrella.rotation.set(1.2, 0, 0); umbrella.visible = false; Rt.hand.add(umbrella);
  // something carried in both arms while walking (logs, a basket of stones…)
  let carryObj = null, carryName = null;
  function setCarry(name){
    if (name === carryName) return; carryName = name;
    if (carryObj){ torso.remove(carryObj); carryObj = null; }
    if (!name) return;
    const p = makeProp(name === "logs" ? "logCarry" : name === "planks" ? "plankCarry" : "basket"); if (!p) return;
    p.position.set(0, name === "logs" || name === "planks" ? .24 : .16, .4); if (name === "logs" || name === "planks") p.rotation.set(0, Math.PI / 2, 0);
    torso.add(p); carryObj = p; toonify(p);
  }
  const cur = defaults();
  const ctx = { phase: 0, speed: 0, hitL: 0, hitR: 0, kick: 0, beat: 1.6, bow: 3, rain: false };
  let blinkT = 2, blinking = 0, emotion = "neutral";
  const emo = { brow: 0, by: 0, open: 1, blush: .35 };

  function clearProps(){ for (const p of held) p.parent && p.parent.remove(p); held = []; for (const c of [...groundProps.children]) groundProps.remove(c); }
  function setAnim(name, opts = {}){
    if (!ANIMS[name]) name = "idle";
    if (name === anim && !opts.force) return;
    anim = name; animT = 0; clearProps();
    const a = ANIMS[name];
    for (const [pname, socket, pos, rot] of a.props || []){ const p = makeProp(pname); if (!p) continue; p.position.set(...pos); if (socket === "head") p.position.multiplyScalar(HR / .3); p.rotation.set(...rot); sockets[socket].add(p); held.push(p); }
    for (const [pname, pos, rot] of a.ground || []){
      if (opts.noGround && !["stool", "pianoSmall"].includes(pname) && !opts.keepGround) continue;
      if (opts.noPiano && pname === "pianoSmall") continue;
      if (opts.noStool && pname === "stool") continue;
      const p = makeProp(pname); if (!p) continue; p.position.set(...pos); p.rotation.y = rot; groundProps.add(p);
      p.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } }); }
  }
  function apply(P){
    hips.position.y = HIP_Y + P.hipY; hips.rotation.set(P.hipX, P.hipYaw, P.hipZ);
    torso.rotation.set(P.torsoX, P.torsoY, P.torsoZ); torso.scale.set(1 / Math.sqrt(P.squash), P.squash, 1 / Math.sqrt(P.squash));
    neck.rotation.set(P.headX, P.headY, P.headZ);
    L.sh.rotation.set(...P.shL); L.el.rotation.x = P.elL; L.hand.rotation.set(...P.haL);
    Rt.sh.rotation.set(...P.shR); Rt.el.rotation.x = P.elR; Rt.hand.rotation.set(...P.haR);
    LL.hip.rotation.set(P.lgL, 0, P.lgLz); LL.knee.rotation.x = P.knL; LL.ankle.rotation.x = P.ftL;
    LR.hip.rotation.set(P.lgR, 0, P.lgRz); LR.knee.rotation.x = P.knR; LR.ankle.rotation.x = P.ftR;
    tail.rotation.set(0, P.tail, 0);
    const E = EMO[emotion] || EMO.neutral;
    emo.brow += ((E.brow || 0) - emo.brow) * .1; emo.by += ((E.by || 0) - emo.by) * .1; emo.open += ((E.open ?? 1) - emo.open) * .1; emo.blush += ((E.blush ?? .35) - emo.blush) * .05;
    const asleep = P.eyes < .15, useArcs = !asleep && E.arcs;
    const open = P.eyes * emo.open * (blinking > 0 ? .08 : 1);
    eyes.forEach(e => { e.visible = !useArcs && !asleep; e.scale.set(1 + (E.big || 0), Math.max(.06, open), 1); });
    arcs.forEach(a => { a.visible = useArcs || asleep; a.rotation.z = asleep ? Math.PI : 0; a.position.y = asleep ? -HR * .02 : HR * .02; });
    brows.forEach(b => { b.rotation.z = b.userData.side * emo.brow; b.position.y = HR * (.38 + emo.by + (asleep ? -.04 : 0)); });
    cheeks.forEach(c => c.material.opacity = Math.min(.95, .2 + emo.blush * .7));
    let m = E.mouth || "smile"; if (P.mouth >= .35) m = P.mouth > .75 ? "grin" : "o"; if (asleep && m === "grin") m = "smile";
    for (const k in mouths) mouths[k].visible = k === m;
    tongue.visible = m === "grin"; mouths.grin.scale.y = .7 + P.mouth * .5; mouths.o.scale.y = .8 + P.mouth * .6;
  }
  function lerpPose(a, b, k){
    for (const key in b){ const v = b[key];
      if (Array.isArray(v)) for (let i = 0; i < 3; i++) a[key][i] += (v[i] - a[key][i]) * k;
      else a[key] += (v - a[key]) * k; }
  }
  function update(dt, t){
    animT += dt;
    blinkT -= dt; if (blinkT < 0){ blinking = .13; blinkT = 2 + Math.random() * 4; } if (blinking > 0) blinking -= dt;
    ctx.hitL *= Math.pow(.004, dt); ctx.hitR *= Math.pow(.004, dt); ctx.kick *= Math.pow(.002, dt);
    const P = defaults(), name = ctx.speed > .05 ? "walk" : anim;
    ANIMS[name].pose(P, name === "walk" ? t : animT + 1.3, ctx);
    if (umbrella && umbrella.visible){ P.shR = [-1.75, 0, -.2]; P.elR = -1.35; P.haR = [0, 0, 0]; }
    if (carryObj && ctx.speed > .05){ P.shL = [-1.15, 0, .35]; P.shR = [-1.15, 0, -.35]; P.elL = P.elR = -.55; P.torsoX = -.05; }
    lerpPose(cur, P, 1 - Math.pow(name === "walk" ? .00005 : .002, dt));
    apply(cur);
    const still = ctx.speed <= .05;
    groundProps.visible = still; held.forEach(h => h.visible = still);
    if (umbrella) umbrella.visible = ctx.rain && (!still || anim === "idle") && !carryObj;
    if (carryObj) carryObj.visible = !still;
    for (const o of groundProps.children) if (o.userData.tick) o.userData.tick(animT);
    for (const o of held) if (o.userData.tick) o.userData.tick(animT);
    // floppy ears
    head.children.forEach(o => { if (o.userData.ear) o.rotation.x = sin(t * 3) * .05 - ctx.speed * .25; });
    // fishing bobber bob
    groundProps.children.forEach(o => { if (o.position.z > 3) o.position.y = .05 + sin(t * 2) * .03; });
  }
  function hit(instrument, time){ // a note was played: move the hands
    if (Math.random() < .5) ctx.hitL = 1; else ctx.hitR = 1;
    if (instrument === "drums") ctx.kick = Math.random() < .4 ? 1 : ctx.kick;
  }
  toonify(root); addOutline(root, { skip: o => o.userData.noOutline || o.geometry.type === "TorusGeometry" });
  const tmp = new THREE.Vector3();
  return {
    root, setAnim, update, hit, ctx, setCarry,
    setEmotion(e){ if (EMO[e]) emotion = e; }, get emotion(){ return emotion; },
    get anim(){ return anim; },
    headWorld(){ return head.getWorldPosition(tmp).clone(); },
    height: HIP_Y + ry * 1.62 + HR * 1.9,
    groundProps,
    dispose(){ root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
