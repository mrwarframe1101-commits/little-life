// More animations: building, gathering, crafting, chores, play, animals.
// Each pose(P, t, ctx) moves joints; props are [prop, socket, position, rotation]; ground props sit in front.
const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs;
const sitStool = P => { P.hipY = .1; P.lgL = P.lgR = -1.45; P.knL = P.knR = 1.35; P.ftL = P.ftR = .1; };
const sitGround = P => { P.hipY = -.27; P.lgL = P.lgR = -1.5; P.knL = P.knR = .12; P.lgLz = .14; P.lgRz = -.14; P.torsoX = -.04; };
const crouch = P => { P.hipY = -.13; P.lgL = P.lgR = -1.0; P.knL = P.knR = 1.6; P.ftL = P.ftR = -.5; P.torsoX = .45; };
const lieBack = P => { P.hipY = -.25; P.hipX = -1.45; P.lgL = -.15; P.lgR = -.75; P.knR = 1.3; };
const cyc = (t, period) => (t % period) / period;
const ease = k => k * k * (3 - 2 * k);

export const ANIMS2 = {
  // ---- building ----
  lay_stones: { props: [["stoneCarry", "handR", [0, -.1, .05], [0, 0, 0]]], ground: [["stonePile", [.6, 0, .5], 0]],
    pose(P, t){ const k = cyc(t, 3.2); crouch(P); const reach = k < .5 ? ease(k * 2) : ease((1 - k) * 2); P.torsoX = .45 + reach * .35; P.shR = [-1.0 - reach * .6, 0, -.25 + (k < .5 ? .5 : 0)]; P.elR = -.4; P.shL = [-1.2, 0, .3]; P.elL = -.3; P.headX = .4; } },
  build_frame: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]]], ground: [["logCarryPile", [-.7, 0, .4], .6]],
    pose(P, t){ const hit = max(0, sin(t * 4.2)); P.shR = [-2.2 + hit * .9, 0, -.25]; P.elR = -1.1 + hit * .4; P.shL = [-1.9, 0, .15]; P.elL = -.5; P.headX = -.45; P.torsoX = -.1; P.hipY = .02; } },
  build_wall: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]], ["plankCarry", "handL", [0, -.1, .05], [0, 0, 1.4]]], ground: [["plankPile", [.8, 0, .2], .3]],
    pose(P, t){ const ph = cyc(t, 8); if (ph < .5){ const hit = max(0, sin(t * 4.5)); P.shR = [-1.55 + hit * .7, 0, -.2]; P.elR = -1.0 + hit * .4; P.shL = [-1.4, 0, .35]; P.elL = -.4; P.headX = -.1; }
      else { const s = sin(t * 5); P.shR = [-1.1 + s * .25, 0, -.2]; P.elR = -.7 - s * .4; P.shL = [-.9, 0, .3]; P.elL = -.6; P.torsoX = .3; P.headX = .35; P.torsoY = s * .08; } } },
  build_roof: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]]],
    pose(P, t){ const hit = max(0, sin(t * 4)); P.shR = [-2.7 + hit * .6, 0, -.2]; P.elR = -.8 + hit * .3; P.shL = [-2.5, 0, .2]; P.elL = -.4; P.headX = -.7; P.torsoX = -.18; P.hipY = abs(sin(t * .4)) * .04; } },
  build_detail: { props: [["brush", "handR", [0, -.06, .02], [.3, 0, 0]]], ground: [["paintPot", [.4, 0, .45], 0]],
    pose(P, t){ P.shR = [-1.5 + sin(t * 2.5) * .35, 0, -.25 + cos(t * 2) * .2]; P.elR = -.5; P.shL = [-.4, 0, .35]; P.elL = -.8; P.headX = -.2; P.headZ = sin(t * .6) * .12; } },
  plaster: { pose(P, t){ crouch(P); P.torsoX = .3; P.shR = [-1.3 + sin(t * 3) * .3, 0, -.3 + cos(t * 3) * .25]; P.shL = [-1.3 - sin(t * 3) * .3, 0, .3 - cos(t * 3) * .25]; P.elL = P.elR = -.4; P.headX = .2; } },
  thatch: { props: [["fiberBundle", "handL", [0, -.1, .05], [0, 0, 0]]], pose(P, t){ const k = sin(t * 3); P.shR = [-1.9 + k * .3, 0, -.4]; P.elR = -.8 - k * .4; P.shL = [-1.6, 0, .3]; P.elL = -.7; P.headX = -.4; } },
  dig: { props: [["shovel", "handR", [0, -.05, .03], [0, 0, 0]]], pose(P, t){ const k = cyc(t, 2.2), push = k < .4 ? ease(k / .4) : 1 - ease((k - .4) / .6);
    P.torsoX = .3 + push * .4; P.shR = [-.9 - push * .4, 0, -.15]; P.elR = -.5; P.shL = [-1.1 - push * .3, 0, .15]; P.elL = -.8; P.knR = push * .4; P.lgR = -push * .3; P.headX = .4; } },
  // ---- gathering ----
  chop: { props: [["axe", "handR", [0, -.04, .02], [0, 0, 0]]], fx: "chips",
    pose(P, t, c){ const k = cyc(t, 1.5); const up = k < .55 ? ease(k / .55) : 1 - ease(Math.min(1, (k - .55) / .2));
      P.shR = [-.6 - up * 1.9, 0, -.55 + up * .3]; P.shL = [-.6 - up * 1.8, 0, -.25]; P.elR = -.4 - up * .5; P.elL = -.5 - up * .5; P.torsoY = .55 - up * .8; P.torsoX = .15 - up * .25 + (1 - up) * .2; P.headY = .3; P.lgL = -.25; P.lgR = .2; c.chopHit = k > .7 && k < .78; } },
  gather: { props: [["logCarry", "torso", [0, .26, .36], [0, Math.PI / 2, 0]]], pose(P, t){ const k = cyc(t, 3.6), bend = k < .5 ? ease(k * 2) : ease((1 - k) * 2);
    P.torsoX = bend * .9; P.hipY = -bend * .1; P.knL = P.knR = bend * .6; P.lgL = P.lgR = -bend * .4; P.shL = [-1.0 - bend * .3, 0, .35]; P.shR = [-1.0 - bend * .3, 0, -.35]; P.elL = P.elR = -.9 + bend * .6; P.headX = .3 + bend * .3; } },
  gather_low: { props: [["basket", "handL", [0, -.15, .05], [0, 0, 0]]], pose(P, t){ crouch(P); const k = sin(t * 2.4); P.shR = [-1.1 + k * .35, 0, -.25 + cos(t * 1.7) * .25]; P.elR = -.4; P.shL = [-.5, 0, .45]; P.elL = -.6; P.headX = .5; P.headY = sin(t * .5) * .3; } },
  mine: { props: [["pickaxe", "handR", [0, -.04, .02], [0, 0, 0]]], fx: "chips",
    pose(P, t, c){ const k = cyc(t, 1.3), up = k < .55 ? ease(k / .55) : 1 - ease(Math.min(1, (k - .55) / .18));
      P.shR = [-.5 - up * 2.2, 0, -.2]; P.shL = [-.5 - up * 2.1, 0, .1]; P.elR = P.elL = -.3 - up * .6; P.torsoX = .35 - up * .45; P.headX = .3; c.chopHit = k > .7 && k < .76; } },
  shovel: { props: [["shovel", "handR", [0, -.05, .03], [0, 0, 0]]], ground: [["bucket", [.6, 0, .3], 0]],
    pose(P, t){ const k = cyc(t, 2.4), dig = k < .45 ? ease(k / .45) : 1 - ease((k - .45) / .55); crouch(P); P.torsoX = .35 + dig * .3; P.shR = [-1.0 - dig * .5, 0, -.2 + (k > .5 ? .3 : 0)]; P.shL = [-1.2 - dig * .4, 0, .1]; P.elR = -.4; P.elL = -.7; P.headX = .5; } },
  cut_reeds: { props: [["sickle", "handR", [0, -.05, .02], [0, 0, 0]], ["fiberBundle", "handL", [0, -.1, .05], [0, 0, 0]]],
    pose(P, t){ crouch(P); P.torsoX = .3; const s = sin(t * 3.2); P.shR = [-1.1, s * .2, -.6 + s * .6]; P.elR = -.3; P.shL = [-1.0, 0, .35]; P.elL = -.5; P.headX = .35; P.torsoY = s * .15; } },
  forage: { props: [["basket", "handL", [0, -.15, .05], [0, 0, 0]]], pose(P, t){ const k = cyc(t, 4), bend = k < .5 ? ease(k * 2) : ease((1 - k) * 2);
    P.torsoX = bend * .75; P.knL = P.knR = bend * .4; P.lgL = P.lgR = -bend * .25; P.shR = [-1.1 - bend * .5, 0, -.2]; P.elR = -.3 - (1 - bend) * .9; P.shL = [-.4, 0, .4]; P.elL = -.7; P.headX = .3 + bend * .3; } },
  // ---- crafting & processing ----
  saw: { props: [["handSaw", "handR", [0, -.05, .03], [0, 0, 0]]], ground: [["sawhorseLog", [0, 0, .75], Math.PI / 2]],
    pose(P, t){ const s = sin(t * 5.5); P.torsoX = .45; P.headX = .4; P.shR = [-1.0 + s * .35, 0, -.15]; P.elR = -.9 - s * .45; P.shL = [-1.2, 0, .3]; P.elL = -.6; P.torsoY = s * .06; P.lgL = -.2; P.lgR = .15; } },
  craft: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]]], pose(P, t){ const ph = cyc(t, 10);
    if (ph < .5){ const hit = max(0, sin(t * 4.5)); P.shR = [-1.3 + hit * .6, 0, -.2]; P.elR = -1.1 + hit * .4; P.shL = [-1.1, 0, .25]; P.elL = -.6; P.torsoX = .3; P.headX = .45; }
    else { P.shR = [-1.15 + sin(t * 6) * .15, 0, -.1]; P.elR = -.9; P.shL = [-1.15 + cos(t * 5) * .1, 0, .1]; P.elL = -.9; P.torsoX = .35; P.headX = .5; P.headZ = sin(t) * .1; } } },
  weave: { pose(P, t){ sitStool(P); const s = sin(t * 2.2); P.shL = [-1.2, 0, .2 + s * .4]; P.shR = [-1.2, 0, -.2 + s * .4]; P.elL = P.elR = -.7; P.headX = .2; P.torsoY = s * .1; } },
  stoke: { props: [["poker", "handR", [0, -.05, .02], [.3, 0, 0]]], pose(P, t){ crouch(P); P.torsoX = .3; const k = sin(t * 2); P.shR = [-1.1 + k * .2, 0, -.15]; P.elR = -.3; P.shL = [-1.1, 0, .35]; P.elL = -.2; P.haL = [-.8, 0, 0]; P.headX = .2; } },
  smith: { props: [["hammer", "handR", [0, -.05, .02], [0, 0, 0]], ["tongs", "handL", [0, -.06, .03], [.4, 0, 0]]], fx: "sparks",
    pose(P, t, c){ const k = cyc(t, .9), up = k < .6 ? ease(k / .6) : 1 - ease(Math.min(1, (k - .6) / .15)); P.shR = [-1.0 - up * 1.4, 0, -.2]; P.elR = -.6 - up * .7; P.shL = [-1.05, 0, .2]; P.elL = -.6; P.torsoX = .3; P.headX = .45; c.chopHit = k > .74 && k < .8; } },
  // ---- home life ----
  nap: { face: "sleep", fx: "z", pose(P, t){ sitStool(P); P.torsoX = -.25; P.headZ = .45; P.headX = .15; P.eyes = 0; P.shL = [-.4, 0, .25]; P.shR = [-.4, 0, -.25]; P.elL = P.elR = -.9; P.squash = 1 + sin(t * 1.2) * .025; } },
  watch_tv: { pose(P, t){ sitStool(P); P.torsoX = -.12; P.shL = [-.6, 0, .25]; P.shR = [-.6, 0, -.25]; P.elL = P.elR = -.9; P.headX = .02; if ((t % 11) < 1.3){ P.mouth = 1; P.torsoX = -.25 + abs(sin(t * 14)) * .08; } } },
  play_videogames: { props: [["controller", "torso", [0, .28, .42], [-.4, 0, 0]]], pose(P, t){ sitStool(P); P.torsoX = .22 + sin(t * .7) * .05; P.torsoZ = sin(t * .9) * .16; P.shL = [-.95, 0, .12]; P.shR = [-.95, 0, -.12]; P.elL = P.elR = -1.2; P.haL = [sin(t * 23) * .1, 0, 0]; P.haR = [cos(t * 19) * .12, 0, 0]; P.headX = .05;
    if ((t % 20) < 2){ P.shL = [-2.8, 0, .3]; P.shR = [-2.8, 0, -.3]; P.elL = P.elR = -.3; P.mouth = 1; P.torsoX = -.2; } } },
  use_computer: { pose(P, t){ sitStool(P); P.shL = [-1.0, 0, .18]; P.shR = [-1.0, 0, -.18]; P.elL = P.elR = -.65; P.haL = [max(0, sin(t * 17)) * .3, 0, 0]; P.haR = [max(0, sin(t * 15 + 1)) * .3, 0, 0]; P.headX = .05; P.torsoX = .12;
    if ((t % 12) < 2.5){ P.shR = [-1.2, 0, -.1]; P.elR = -2.0; P.haR = [0, 0, 0]; P.headZ = .15; } } },
  browse_books: { props: [["book", "handL", [0, -.1, .08], [1.2, 0, 0]]], pose(P, t){ const k = sin(t * .7); P.shR = [-2.2 + k * .5, 0, -.25 + k * .2]; P.elR = -.3; P.headX = -.35 - k * .1; P.headY = k * .3; P.shL = [-.9, 0, .25]; P.elL = -1.3; } },
  bake: { props: [["rollingPin", "torso", [0, .32, .5], [0, 0, Math.PI / 2]]], ground: [["dough", [0, .9, .6], 0]], pose(P, t){ const k = sin(t * 2.6); P.torsoX = .35 + k * .08; P.shL = [-1.05 + k * .25, 0, .2]; P.shR = [-1.05 + k * .25, 0, -.2]; P.elL = P.elR = -.3; P.headX = .4; P.hipY = abs(k) * .01; } },
  make_coffee: { props: [["cup", "handL", [0, -.1, .04], [0, 0, 0]]], pose(P, t){ P.shL = [-1.0, 0, .2]; P.elL = -1.0; P.shR = [-1.2 + sin(t * 1.5) * .2, 0, -.1]; P.elR = -.7; P.haR = [-.5 + sin(t * 1.5) * .3, 0, 0]; P.headX = .25; if ((t % 9) < 2){ P.shL = [-1.5, 0, .1]; P.elL = -1.8; P.headX = -.2; } } },
  wash_dishes: { props: [["plate", "handL", [0, -.1, .06], [1.3, 0, 0]], ["sponge", "handR", [0, -.08, .03], [0, 0, 0]]], fx: "bubbles",
    pose(P, t){ P.torsoX = .3; P.headX = .4; P.shL = [-1.0, 0, .15]; P.elL = -.9; P.shR = [-1.05 + sin(t * 6) * .12, 0, -.1 + cos(t * 6) * .12]; P.elR = -.95; } },
  bathe: { fx: "bubbles", pose(P, t){ sitGround(P); P.hipY = -.33; P.shL = [-.3, 0, 1.25]; P.shR = [-.3, 0, -1.25]; P.elL = P.elR = -.3; P.headX = -.25; P.eyes = .3 + (sin(t * .3) > .5 ? .7 : 0); P.mouth = (t % 14) < 3 ? .7 : 0; P.torsoX = -.25; } },
  groom: { props: [["comb", "handR", [0, -.05, .02], [0, 0, 0]]], pose(P, t){ P.shR = [-2.5, 0, -.45]; P.elR = -1.5 + sin(t * 6) * .35; P.shL = [-.3, 0, .3]; P.elL = -.4; P.headZ = sin(t * .6) * .15; P.headY = sin(t * .4) * .25; } },
  knit: { props: [["knitting", "torso", [0, .24, .42], [-.6, 0, 0]]], pose(P, t){ sitStool(P); P.shL = [-1.0, 0, .05]; P.shR = [-1.0, 0, -.05]; P.elL = -1.45 + sin(t * 7) * .1; P.elR = -1.45 - sin(t * 7) * .1; P.headX = .4; } },
  puzzle: { pose(P, t){ sitStool(P); P.torsoX = .4; P.headX = .55; const k = cyc(t, 5); P.shR = [-1.1 - (k < .5 ? k : 1 - k) * .4, 0, -.15 + sin(t) * .15]; P.elR = -.5; P.shL = [-.7, 0, .2]; P.elL = -.9; if ((t % 13) < 2){ P.shR = [-1.1, 0, -.1]; P.elR = -2; P.headZ = .2; P.headX = .2; } } },
  board_game: { ground: [], pose(P, t){ sitStool(P); P.torsoX = .3; P.headX = .45; const k = cyc(t, 6); P.shR = [-1.0 - (k < .3 ? sin(k / .3 * Math.PI) * .3 : 0), 0, -.15]; P.elR = -.6; P.shL = [-.8, 0, .2]; P.elL = -1.0; P.headY = sin(t * .3) * .2; if ((t % 17) < 1.5){ P.mouth = 1; P.shL = [-2.6, 0, .3]; P.elL = -.3; } } },
  listen_records: { face: "calm", pose(P, t, c){ const b = sin(t * c.beat * Math.PI); P.headX = .1 + b * .08; P.torsoZ = sin(t * c.beat * Math.PI * .5) * .1; P.eyes = .1; P.shL = [-.2, 0, .3]; P.shR = [-.2, 0, -.3]; P.elL = P.elR = -.3; P.hipY = abs(b) * .015; P.tail = sin(t * 3) * .4; } },
  light_fireplace: { props: [["logCarry", "torso", [0, .24, .36], [0, Math.PI / 2, 0]]], pose(P, t){ crouch(P); const k = cyc(t, 6); if (k < .5){ P.shL = [-1.2, 0, .3]; P.shR = [-1.2, 0, -.3]; P.elL = P.elR = -.6; P.torsoX = .5 + sin(t * 2) * .05; } else { P.shR = [-1.1, 0, -.1]; P.elR = -.3 + sin(t * 16) * .1; P.shL = [-1.1, 0, .1]; P.elL = -.3; P.headX = .3; } } },
  warm_up: { face: "calm", pose(P, t){ sitGround(P); P.shL = [-1.25, 0, .25]; P.shR = [-1.25, 0, -.25]; P.elL = P.elR = -.15; P.haL = [-1.2, 0, 0]; P.haR = [-1.2, 0, 0]; P.eyes = .5; P.headX = .05; P.torsoZ = sin(t * .7) * .05; } },
  look_out_window: { pose(P, t){ P.shL = [.45, 0, .1]; P.shR = [.45, 0, -.1]; P.elL = P.elR = -.6; P.headY = sin(t * .25) * .4; P.headX = -.05; P.hipYaw = sin(t * .1) * .1; P.tail = sin(t * 1.2) * .4; } },
  pottery: { pose(P, t){ sitStool(P); P.torsoX = .35; P.headX = .45; P.shL = [-1.15, 0, .1]; P.shR = [-1.15, 0, -.1]; P.elL = -.55 + sin(t * 1.3) * .08; P.elR = -.55 - sin(t * 1.3) * .08; P.haL = [-.4, 0, 0]; P.haR = [-.4, 0, 0]; } },
  grind_flour: { pose(P, t){ P.torsoX = .4; P.shL = [-1.4, 0, .1]; P.shR = [-1.4, 0, -.1]; P.elL = P.elR = -.4; const s = sin(t * 4); P.lgL = s * .4; P.lgR = -s * .4; P.knL = max(0, cos(t * 4)) * .6; P.knR = max(0, -cos(t * 4)) * .6; P.headX = .1; } },
  yoga: { face: "calm", ground: [["yogaMat", [0, 0, 0], 0]], pose(P, t){ const step = Math.floor(t / 7) % 4;
    if (step === 0){ P.shL = [-2.9, 0, .1]; P.shR = [-2.9, 0, -.1]; P.elL = P.elR = 0; P.lgR = -.4; P.lgRz = -.9; P.knR = 2.0; P.eyes = .2; }
    else if (step === 1){ P.lgL = -.7; P.lgR = .55; P.knL = .7; P.shL = [0, 0, 1.55]; P.shR = [0, 0, -1.55]; P.headY = .6; P.hipY = -.1; P.hipYaw = .5; }
    else if (step === 2){ P.hipX = 1.2; P.hipY = -.05; P.shL = [-2.9, 0, .15]; P.shR = [-2.9, 0, -.15]; P.lgL = P.lgR = -.9; P.headX = .2; }
    else { sitGround(P); P.lgLz = .95; P.lgRz = -.95; P.lgL = P.lgR = -1.25; P.knL = P.knR = 2.1; P.shL = [-.45, 0, .55]; P.shR = [-.45, 0, -.55]; P.elL = P.elR = -.6; P.eyes = 0; } } },
  // ---- outdoors ----
  harvest: { props: [["basket", "handL", [0, -.15, .05], [0, 0, 0]]], pose(P, t){ crouch(P); const k = sin(t * 2); P.shR = [-1.2 + k * .3, 0, -.2]; P.elR = -.3 - max(0, -k) * .9; P.shL = [-.5, 0, .45]; P.elL = -.6; P.headX = .5; } },
  pick_flowers: { props: [["bouquet", "handL", [0, -.08, .05], [0, 0, 0]]], pose(P, t){ const k = cyc(t, 3.4), bend = k < .5 ? ease(k * 2) : ease((1 - k) * 2); P.torsoX = bend * .8; P.knL = P.knR = bend * .5; P.lgL = P.lgR = -bend * .3; P.shR = [-.9 - bend * .5, 0, -.2]; P.elR = -.2; P.shL = [-1.2, 0, .2]; P.elL = -1.4; P.headX = .2 + bend * .3; } },
  plant_tree: { props: [["trowel", "handR", [0, -.06, .02], [0, 0, 0]]], ground: [["sapling", [0, 0, .7], 0]], pose(P, t){ crouch(P); const k = sin(t * 2.6); P.shR = [-1.0 + k * .3, 0, -.15]; P.elR = -.4; P.shL = [-.9 - max(0, k) * .3, 0, .15]; P.elL = -.3; P.headX = .5; } },
  stack_wood: { props: [["axe", "handR", [0, -.04, .02], [0, 0, 0]]], ground: [["chopBlock", [0, 0, .7], 0]], fx: "chips",
    pose(P, t, c){ const k = cyc(t, 1.7), up = k < .55 ? ease(k / .55) : 1 - ease(Math.min(1, (k - .55) / .2)); P.shR = [-.7 - up * 2.1, 0, -.1]; P.shL = [-.7 - up * 2.0, 0, .1]; P.elR = P.elL = -.4 - up * .4; P.torsoX = .35 - up * .4; P.headX = .4; c.chopHit = k > .72 && k < .78; } },
  make_campfire: { pose(P, t){ crouch(P); const k = cyc(t, 8); if (k < .55){ P.shL = [-1.1, 0, .3 - sin(t * 2) * .2]; P.shR = [-1.1, 0, -.3 + sin(t * 2) * .2]; P.elL = P.elR = -.5; } else { P.shL = [-1.05, 0, .05]; P.shR = [-1.05, 0, -.05]; P.elL = -.5 + sin(t * 22) * .15; P.elR = -.5 - sin(t * 22) * .15; P.headX = .4; } } },
  roast_marshmallows: { props: [["marshStick", "handR", [0, -.04, .02], [-1.0, 0, 0]]], pose(P, t){ sitGround(P); P.shR = [-1.15, 0, -.1]; P.elR = -.25; P.haR = [sin(t * .9) * .15, 0, 0]; P.shL = [-1.2, 0, .3]; P.elL = -.2; P.haL = [-1.1, 0, 0]; P.eyes = .7;
    if ((t % 15) < 2.5){ P.shR = [-1.5, 0, -.1]; P.elR = -1.9; P.mouth = 1; } } },
  swim: { pose(P, t){ P.hipY = -.65; P.hipX = 1.1; const s = t * 2.6; P.shL = [-2.4 + sin(s) * .5, 0, .5 + cos(s) * .7]; P.shR = [-2.4 + sin(s) * .5, 0, -.5 - cos(s) * .7]; P.elL = P.elR = -.4; P.lgL = sin(s * 2) * .35; P.lgR = -sin(s * 2) * .35; P.headX = -1.0; P.mouth = .3; } },
  skip_stones: { props: [["pebble", "handR", [0, -.07, .02], [0, 0, 0]]], pose(P, t, c){ const k = cyc(t, 3.2), wind = k < .5 ? ease(k / .5) : 0, throwK = k >= .5 && k < .65 ? (k - .5) / .15 : k >= .65 ? 1 : 0;
    P.torsoX = .35; P.hipY = -.06; P.knL = P.knR = .35; P.lgL = -.3; P.lgR = .2; P.shR = [-.3 - throwK * .6, 0, -1.4 + wind * .3 + throwK * 1.0]; P.elR = -.6 + throwK * .4; P.torsoY = -wind * .6 + throwK * .9; P.shL = [-.5, 0, .7]; P.elL = -.3; c.throwNow = k > .55 && k < .6; } },
  fly_kite: { ground: [["kite", [0, 0, 0], 0]], pose(P, t){ P.shR = [-2.0 + sin(t * 1.2) * .1, 0, -.15]; P.elR = -.3; P.shL = [-1.7, 0, .15]; P.elL = -.5; P.headX = -.55; P.headY = sin(t * .5) * .15; P.lgL = sin(t * .5) * .15; P.tail = sin(t * 2) * .4; if ((t % 9) < 1.2) { P.shR[0] -= .3; P.torsoX = -.15; } } },
  birdwatch: { props: [["binoculars", "head", [0, .02, .34], [0, 0, 0]]], pose(P, t){ P.shL = [-1.55, 0, .35]; P.shR = [-1.55, 0, -.35]; P.elL = P.elR = -1.95; P.headY = sin(t * .3) * .5; P.headX = -.25 + sin(t * .2) * .1; P.torsoY = sin(t * .3) * .2; } },
  photograph: { props: [["camera", "head", [0, -.02, .36], [0, 0, 0]]], fx: "flash", pose(P, t, c){ const k = cyc(t, 6); if (k < .7){ P.shL = [-1.5, 0, .3]; P.shR = [-1.5, 0, -.3]; P.elL = P.elR = -1.9; P.torsoX = .05; } else { P.shR = [-.6, 0, -.2]; P.elR = -1.0; P.headX = .3; } c.flashNow = k > .5 && k < .52; P.headY = sin(t * .2) * .3; } },
  sketch: { props: [["sketchbook", "handL", [0, -.1, .1], [1.2, 0, 0]], ["pen", "handR", [0, -.06, .02], [.4, 0, 0]]], pose(P, t){ sitGround(P); P.shL = [-1.0, 0, .2]; P.elL = -1.2; P.shR = [-1.0, 0, -.1]; P.elR = -1.1 + sin(t * 7) * .05; const look = (t % 6) < 2.5; P.headX = look ? -.2 : .45; } },
  juggle: { ground: [["juggleBalls", [0, 0, .3], 0]], pose(P, t){ const s = sin(t * 7); P.shL = [-1.0 + s * .3, 0, .25]; P.shR = [-1.0 - s * .3, 0, -.25]; P.elL = -1.1 - s * .2; P.elR = -1.1 + s * .2; P.headX = -.35; P.mouth = .2; } },
  play_ball: { ground: [["ball", [0, 0, 0], 0]], pose(P, t){ const k = cyc(t, 2.4), kick = k > .4 && k < .6 ? sin((k - .4) / .2 * Math.PI) : 0; P.lgR = -kick * 1.3; P.knR = (1 - kick) * .3; P.shL = [-.3 - kick * .3, 0, .6]; P.shR = [.3, 0, -.6]; P.torsoX = -kick * .15; P.hipY = abs(sin(t * 4)) * .03; P.headX = .3; } },
  jump_rope: { ground: [["rope", [0, 0, 0], 0]], pose(P, t){ const j = abs(sin(t * 6)); P.hipY = j * .14; P.knL = P.knR = (1 - j) * .4; P.lgL = P.lgR = -(1 - j) * .2; P.shL = [-.5, 0, .55]; P.shR = [-.5, 0, -.55]; P.elL = P.elR = -.8; P.haL = [sin(t * 6) * .6, 0, 0]; P.haR = [sin(t * 6) * .6, 0, 0]; P.mouth = .3; } },
  cloud_watch: { ground: [["blanket", [0, 0, -.4], 0]], pose(P, t){ lieBack(P); P.shL = [-2.9, 0, .5]; P.shR = [-2.9, 0, -.5]; P.elL = P.elR = -1.8; P.headX = .1; P.headY = sin(t * .2) * .3; P.eyes = (t % 20) < 5 ? .1 : 1; } },
  sunbathe: { face: "calm", ground: [["blanket", [0, 0, -.4], 0]], pose(P, t){ lieBack(P); P.lgR = -.1; P.knR = 0; P.shL = [0, 0, .5]; P.shR = [0, 0, -.5]; P.eyes = 0; P.squash = 1 + sin(t * .9) * .02; } },
  build_snowman: { ground: [["snowball", [0, 0, .9], 0]], pose(P, t){ crouch(P); P.torsoX = .55; P.shL = [-1.1 + sin(t * 2) * .2, 0, .25]; P.shR = [-1.1 + sin(t * 2) * .2, 0, -.25]; P.elL = P.elR = -.2; P.lgL = -1 + sin(t * 2) * .15; P.headX = .3; } },
  catch_snowflakes: { pose(P, t){ P.headX = -.8; P.mouth = .9; P.shL = [-.4, 0, 1.2]; P.shR = [-.4, 0, -1.2]; P.elL = P.elR = -.2; P.hipY = max(0, sin(t * 2.2)) * .12; P.headY = sin(t * .9) * .3; } },
  splash_puddles: { fx: "splash", pose(P, t, c){ const j = max(0, sin(t * 4.2)); P.hipY = j * .3; P.knL = P.knR = (1 - j) * .6; P.lgL = P.lgR = -(1 - j) * .3; P.shL = [-1.6 * j, 0, .5]; P.shR = [-1.6 * j, 0, -.5]; P.mouth = 1; c.landNow = j < .05; } },
  // ---- animals ----
  pet: { pose(P, t){ crouch(P); P.torsoX = .4; P.shR = [-1.2 + sin(t * 3) * .12, 0, -.15]; P.elR = -.3; P.shL = [-.9, 0, .25]; P.elL = -.4; P.headX = .45; P.mouth = .3; } },
  scatter: { props: [["seedBag", "handL", [0, -.1, .05], [0, 0, 0]]], pose(P, t, c){ const k = cyc(t, 2.4), sw = k < .3 ? ease(k / .3) : 1 - ease((k - .3) / .7); P.shR = [-.8 - sw * .5, 0, -.2 - sw * .9]; P.elR = -.6 + sw * .5; P.shL = [-.9, 0, .2]; P.elL = -1.1; P.torsoY = -sw * .3; P.headX = .35; c.scatterNow = k > .22 && k < .26; } },
  brush: { props: [["comb", "handR", [0, -.05, .02], [0, 0, 0]]], pose(P, t){ P.torsoX = .3; P.shR = [-1.3 + sin(t * 3) * .3, 0, -.1]; P.elR = -.4; P.shL = [-1.1, 0, .2]; P.elL = -.3; P.headX = .3; P.headZ = sin(t * .5) * .1; } },
  befriend: { pose(P, t){ crouch(P); P.torsoX = .3; P.hipY = -.18; P.shR = [-1.35, 0, -.1]; P.elR = -.1; P.haR = [-.3 + sin(t * .8) * .1, 0, 0]; P.shL = [-.4, 0, .3]; P.elL = -.4; P.headX = .2; P.eyes = .8; } },
  throw: { props: [["stick", "handR", [0, -.05, .02], [.4, 0, 0]]], pose(P, t, c){ const k = cyc(t, 4.5), wind = k < .3 ? ease(k / .3) : 0, rel = k >= .3 && k < .42 ? (k - .3) / .12 : k >= .42 ? 1 : 0;
    P.shR = [-.8 + wind * -1.6 + rel * 2.2 - (rel >= 1 ? 1.4 : 0), 0, -.25]; P.elR = -.5 - wind * .6; P.torsoY = .3 * wind - .3 * rel; P.lgL = -.3 * rel; c.throwNow = k > .33 && k < .37; c.holdStick = k < .35 || k > .9; } },
};
