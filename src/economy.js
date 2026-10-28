// Materials, what they're made from, what every building and object costs, and the stages buildings go up in.
export const MATERIALS = {
  log:   { label: "logs",      raw: true },  plank: { label: "planks" },
  stone: { label: "stones",    raw: true },  clay:  { label: "clay",   raw: true },
  fiber: { label: "fibre",     raw: true },  sand:  { label: "sand",   raw: true },
  ore:   { label: "iron ore",  raw: true },  brick: { label: "bricks" },
  glass: { label: "glass" },   metal: { label: "metal" }, cloth: { label: "cloth" },
};
export const FOODS = { berries: "berries", mushrooms: "mushrooms", fish: "fish", vegetables: "vegetables", eggs: "eggs", grain: "grain", bread: "bread", meal: "cooked meals", honey: "honey" };
export const FOOD_VALUE = { berries: 12, mushrooms: 14, fish: 28, vegetables: 18, eggs: 16, grain: 6, bread: 30, meal: 45, honey: 10 };

// processing: [activity, needs station, input, output]
export const PROCESS = {
  saw_planks: { station: "workbench", input: { log: 1 }, output: { plank: 3 }, perMin: 1 / 20, desc: "saw logs into planks (1 log → 3 planks)" },
  fire_kiln:  { station: "kiln", input: { clay: 2 }, output: { brick: 2 }, alt: { input: { sand: 2 }, output: { glass: 1 } }, perMin: 1 / 30, desc: "fire clay into bricks (2 clay → 2 bricks), or sand into glass (2 sand → 1 glass)" },
  smelt:      { station: "forge", input: { ore: 2 }, output: { metal: 1 }, perMin: 1 / 30, desc: "smelt iron ore into metal (2 ore → 1 metal)" },
  weave:      { station: "loom", input: { fiber: 3 }, output: { cloth: 1 }, perMin: 1 / 25, desc: "weave fibre into cloth (3 fibre → 1 cloth)" },
};
// gathering: activity → what it yields per 30 minutes of work
export const GATHER = {
  chop_tree:     { yields: { log: 4 }, per: "tree", desc: "chop down a tree (one tree → 4 logs)" },
  gather_sticks: { yields: { log: 1 }, per: 30, desc: "gather fallen branches (about 1 log every 30 min)" },
  gather_stones: { yields: { stone: 3 }, per: 30, desc: "collect stones (3 every 30 min)" },
  mine_ore:      { yields: { ore: 1, stone: 1 }, per: 30, desc: "chip iron ore out of the big rocks (1 ore and 1 stone every 30 min)" },
  dig_clay:      { yields: { clay: 3 }, per: 30, desc: "dig clay at the riverbank (3 every 30 min)", water: true },
  dig_sand:      { yields: { sand: 3 }, per: 30, desc: "dig sand at the riverbank (3 every 30 min)", water: true },
  gather_fiber:  { yields: { fiber: 3 }, per: 30, desc: "gather reeds and grasses for fibre (3 every 30 min)" },
  forage:        { yields: { berries: 2, mushrooms: 1 }, per: 30, desc: "forage berries and mushrooms" },
  fish:          { yields: { fish: 1 }, per: 45, chance: .6, desc: "fish (often catch one)", water: true },
  harvest:       { yields: { vegetables: 3, grain: 2 }, per: 30, needsPlace: ["garden", "field"], desc: "harvest the garden or field (vegetables and grain)" },
  collect_eggs:  { yields: { eggs: 2 }, per: 20, needsAnimal: "chicken", desc: "collect eggs from the chickens" },
};

// ---------- structures ----------
// every place kind: stages (each: materials, minutes of hands-on work), whether you can sleep there, and its size class
const S = (label, need, minutes, anim) => ({ label, need, minutes, anim });
export const STRUCTURES = {
  camp:       { stages: [], sleep: .6, small: true, desc: "your first camp: a leaf bed by the fire pit" },
  leanto:     { stages: [S("frame", { log: 4 }, 40, "build_frame"), S("cover", { fiber: 6 }, 40, "thatch")], sleep: .75, small: true, desc: "a lean-to shelter of logs and woven grass" },
  tent:       { stages: [S("poles", { log: 3 }, 30, "build_frame"), S("canvas", { cloth: 3 }, 40, "thatch")], sleep: .85, small: true, desc: "a canvas tent" },
  workbench:  { stages: [S("bench", { log: 4 }, 60, "build_frame")], small: true, station: "workbench", desc: "an outdoor workbench for sawing and crafting" },
  kiln:       { stages: [S("base", { stone: 8 }, 50, "lay_stones"), S("dome", { clay: 4 }, 50, "plaster")], small: true, station: "kiln", desc: "a clay kiln for bricks and glass" },
  forge:      { stages: [S("hearth", { stone: 10 }, 60, "lay_stones"), S("chimney", { clay: 4, brick: 2 }, 60, "plaster")], small: true, station: "forge", desc: "a forge for smelting metal" },
  campfire:   { stages: [S("fire ring", { stone: 4 }, 20, "lay_stones")], small: true, desc: "a permanent stone fire ring" },
  garden:     { stages: [S("beds", {}, 60, "dig"), S("fence", { log: 4 }, 45, "build_frame")], desc: "vegetable beds" },
  field:      { stages: [S("plough", {}, 90, "dig"), S("fence", { plank: 6 }, 45, "build_frame")], desc: "a grain field" },
  pond:       { stages: [S("dig", {}, 120, "dig"), S("stones", { stone: 10 }, 60, "lay_stones")], desc: "a pond" },
  plaza:      { stages: [S("paving", { stone: 20 }, 120, "lay_stones"), S("fountain", { stone: 8, metal: 1 }, 60, "build_wall")], desc: "a paved plaza with a fountain" },
  dock:       { stages: [S("posts", { log: 4 }, 45, "build_frame"), S("deck", { plank: 8 }, 60, "build_wall")], desc: "a wooden dock on the river" },
  well:       { stages: [S("shaft", { stone: 12 }, 80, "lay_stones"), S("roof", { plank: 4, metal: 1 }, 40, "build_roof")], desc: "a stone well" },
  grove:      { stages: [S("planting", {}, 60, "dig")], desc: "a grove of trees (plant saplings there too)" },
  bandstand:  { stages: [S("platform", { stone: 8, plank: 6 }, 60, "lay_stones"), S("pillars", { plank: 8 }, 60, "build_frame"), S("roof", { plank: 10 }, 60, "build_roof")], desc: "an open bandstand for music" },
  cottage:    { stages: [S("foundation", { stone: 12 }, 60, "lay_stones"), S("frame", { log: 10 }, 80, "build_frame"), S("walls", { plank: 18 }, 120, "build_wall"), S("roof", { plank: 12, fiber: 6 }, 90, "build_roof"), S("door & windows", { plank: 4, glass: 2 }, 60, "build_detail")], sleep: .9, room: true, desc: "a cosy cottage" },
  house:      { stages: [S("foundation", { stone: 16 }, 70, "lay_stones"), S("frame", { log: 14 }, 100, "build_frame"), S("walls", { plank: 26, brick: 4 }, 150, "build_wall"), S("roof", { plank: 16 }, 100, "build_roof"), S("door & windows", { plank: 6, glass: 4, metal: 1 }, 70, "build_detail")], sleep: 1, room: true, desc: "a two-storey house" },
  townhouse:  { stages: [S("foundation", { stone: 18 }, 70, "lay_stones"), S("frame", { log: 16 }, 110, "build_frame"), S("walls", { plank: 30, brick: 8 }, 170, "build_wall"), S("roof", { plank: 16 }, 100, "build_roof"), S("door & windows", { plank: 6, glass: 6, metal: 1 }, 80, "build_detail")], sleep: 1, room: true, desc: "a tall townhouse" },
  tower:      { stages: [S("foundation", { stone: 20 }, 80, "lay_stones"), S("walls", { stone: 30 }, 180, "build_wall"), S("roof", { plank: 14 }, 100, "build_roof"), S("door & windows", { plank: 4, glass: 4 }, 60, "build_detail")], sleep: 1, room: true, desc: "a stone tower" },
  shop:       { stages: [S("foundation", { stone: 12 }, 60, "lay_stones"), S("frame", { log: 10 }, 80, "build_frame"), S("walls", { plank: 20 }, 120, "build_wall"), S("roof", { plank: 12 }, 90, "build_roof"), S("door & windows", { plank: 4, glass: 3, cloth: 2 }, 60, "build_detail")], room: true, desc: "a little shop" },
  cafe:       { stages: [S("foundation", { stone: 12 }, 60, "lay_stones"), S("frame", { log: 10 }, 80, "build_frame"), S("walls", { plank: 20 }, 120, "build_wall"), S("roof", { plank: 12 }, 90, "build_roof"), S("door & windows", { plank: 4, glass: 3, cloth: 2 }, 60, "build_detail")], room: true, desc: "a café" },
  bakery:     { stages: [S("foundation", { stone: 12 }, 60, "lay_stones"), S("frame", { log: 10 }, 80, "build_frame"), S("walls", { plank: 16, brick: 6 }, 120, "build_wall"), S("roof", { plank: 12 }, 90, "build_roof"), S("door & windows", { plank: 4, glass: 2 }, 60, "build_detail")], room: true, desc: "a bakery" },
  library:    { stages: [S("foundation", { stone: 20 }, 80, "lay_stones"), S("walls", { stone: 24, brick: 8 }, 170, "build_wall"), S("roof", { plank: 18 }, 110, "build_roof"), S("door & windows", { plank: 6, glass: 6 }, 70, "build_detail")], room: true, desc: "a library" },
  workshop:   { stages: [S("foundation", { stone: 10 }, 50, "lay_stones"), S("frame", { log: 10 }, 80, "build_frame"), S("walls", { plank: 18 }, 110, "build_wall"), S("roof", { plank: 12 }, 80, "build_roof"), S("doors", { plank: 4 }, 40, "build_detail")], room: true, station: "workbench", desc: "a workshop (an indoor workbench)" },
  barn:       { stages: [S("foundation", { stone: 12 }, 60, "lay_stones"), S("frame", { log: 16 }, 110, "build_frame"), S("walls", { plank: 26 }, 140, "build_wall"), S("roof", { plank: 18 }, 110, "build_roof"), S("doors", { plank: 6 }, 50, "build_detail")], sleep: .7, room: true, desc: "a barn" },
  windmill:   { stages: [S("foundation", { stone: 16 }, 70, "lay_stones"), S("tower", { stone: 20, plank: 8 }, 160, "build_wall"), S("cap", { plank: 10 }, 90, "build_roof"), S("sails", { plank: 8, cloth: 4 }, 80, "build_detail")], room: true, desc: "a windmill for grinding flour" },
  greenhouse: { stages: [S("foundation", { stone: 8 }, 50, "lay_stones"), S("frame", { plank: 10, metal: 2 }, 80, "build_frame"), S("glass", { glass: 10 }, 110, "build_wall")], room: true, desc: "a glass greenhouse" },
  observatory:{ stages: [S("foundation", { stone: 18 }, 70, "lay_stones"), S("walls", { stone: 24 }, 150, "build_wall"), S("dome", { metal: 6, plank: 8 }, 120, "build_roof"), S("door & windows", { plank: 4, glass: 4 }, 60, "build_detail")], room: true, desc: "an observatory" },
};
export const SHELTER_ORDER = ["house", "townhouse", "tower", "cottage", "tent", "barn", "leanto", "camp"];

// ---------- crafted things ----------
// at: which station makes it ("hand" = anywhere). goes: "room" (placed inside a building) or "camp" (outdoors at camp).
export const ITEMS = {
  bed:        { at: "workbench", need: { plank: 6, fiber: 6 }, minutes: 90, goes: "room", station: "bed", label: "bed" },
  table:      { at: "workbench", need: { plank: 4 }, minutes: 50, goes: "room", station: "table", label: "table" },
  chair:      { at: "workbench", need: { plank: 2 }, minutes: 30, goes: "room", station: "chair", label: "chair" },
  sofa:       { at: "workbench", need: { plank: 6, cloth: 4 }, minutes: 100, goes: "room", station: "sofa", label: "sofa" },
  armchair:   { at: "workbench", need: { plank: 3, cloth: 2 }, minutes: 60, goes: "room", station: "armchair", label: "armchair" },
  bookshelf:  { at: "workbench", need: { plank: 6 }, minutes: 60, goes: "room", station: "bookshelf", label: "bookshelf" },
  desk:       { at: "workbench", need: { plank: 4 }, minutes: 50, goes: "room", station: "desk", label: "desk" },
  easel:      { at: "workbench", need: { plank: 2 }, minutes: 25, goes: "room", station: "easel", label: "easel" },
  rug:        { at: "loom", need: { cloth: 3 }, minutes: 40, goes: "room", label: "rug" },
  loom:       { at: "workbench", need: { plank: 5 }, minutes: 60, goes: "room", station: "loom", label: "loom" },
  plants:     { at: "kiln", need: { clay: 2 }, minutes: 25, goes: "room", station: "plants", label: "potted plants" },
  lamp:       { at: "forge", need: { metal: 1, glass: 1 }, minutes: 30, goes: "room", label: "lamp" },
  stove:      { at: "forge", need: { brick: 6, metal: 2 }, minutes: 90, goes: "room", station: "stove", label: "stove" },
  oven:       { at: "kiln", need: { brick: 8 }, minutes: 80, goes: "room", station: "oven", label: "bread oven" },
  sink:       { at: "forge", need: { metal: 2, clay: 2 }, minutes: 50, goes: "room", station: "sink", label: "sink" },
  bath:       { at: "kiln", need: { clay: 8 }, minutes: 90, goes: "room", station: "bath", label: "bathtub" },
  mirror:     { at: "kiln", need: { glass: 2, plank: 1 }, minutes: 30, goes: "room", station: "mirror", label: "mirror" },
  fireplace:  { at: "hand", need: { stone: 10, brick: 2 }, minutes: 90, goes: "room", station: "fireplace", label: "fireplace" },
  coffee:     { at: "forge", need: { metal: 2, glass: 1 }, minutes: 50, goes: "room", station: "coffee", label: "coffee machine" },
  counter:    { at: "workbench", need: { plank: 6 }, minutes: 60, goes: "room", station: "counter", label: "counter" },
  piano:      { at: "workbench", need: { plank: 12, metal: 3 }, minutes: 180, goes: "room", station: "piano", label: "piano" },
  records:    { at: "forge", need: { metal: 2, glass: 1, plank: 2 }, minutes: 80, goes: "room", station: "records", label: "record player" },
  tv:         { at: "forge", need: { metal: 3, glass: 3 }, minutes: 120, goes: "room", label: "television" },
  console:    { at: "forge", need: { metal: 2, glass: 1 }, minutes: 90, goes: "room", label: "game console", requires: "tv" },
  computer:   { at: "forge", need: { metal: 3, glass: 2 }, minutes: 120, goes: "room", label: "computer", requires: "desk" },
  workbench_indoor: { at: "hand", need: { plank: 4, log: 2 }, minutes: 60, goes: "room", station: "workbench", label: "workbench" },
  wheel:      { at: "workbench", need: { plank: 2, stone: 4 }, minutes: 60, goes: "room", station: "wheel", label: "potter's wheel" },
  millstone:  { at: "hand", need: { stone: 8 }, minutes: 90, goes: "room", station: "millstone", label: "millstone" },
  telescope:  { at: "forge", need: { metal: 2, glass: 2 }, minutes: 90, goes: "room", station: "telescope", label: "telescope" },
  mat:        { at: "loom", need: { cloth: 2 }, minutes: 25, goes: "room", station: "mat", label: "exercise mat" },
  // things that make life outdoors nicer
  kite:       { at: "hand", need: { cloth: 1, fiber: 2 }, minutes: 30, goes: "tool", label: "kite" },
  fishing_rod:{ at: "hand", need: { log: 1, fiber: 2 }, minutes: 20, goes: "tool", label: "fishing rod" },
  axe:        { at: "hand", need: { log: 1, stone: 2 }, minutes: 20, goes: "tool", label: "stone axe" },
  iron_axe:   { at: "forge", need: { metal: 2, log: 1 }, minutes: 40, goes: "tool", label: "iron axe (chops twice as fast)" },
  instrument: { at: "workbench", need: { plank: 3, fiber: 2, metal: 1 }, minutes: 120, goes: "tool", label: "a musical instrument (name it in \"of\")" },
};
export const TOOLS_AT_START = ["hands"];

export function hasAll(inv, need){ for (const [k, n] of Object.entries(need || {})) if ((inv[k] || 0) < n) return false; return true; }
export function missing(inv, need){ const out = {}; for (const [k, n] of Object.entries(need || {})) if ((inv[k] || 0) < n) out[k] = n - (inv[k] || 0); return out; }
export function take(inv, need){ for (const [k, n] of Object.entries(need || {})) inv[k] = (inv[k] || 0) - n; }
export function give(inv, got){ for (const [k, n] of Object.entries(got || {})) inv[k] = (inv[k] || 0) + n; }
export const fmtNeed = need => Object.entries(need || {}).map(([k, n]) => `${n} ${MATERIALS[k] ? MATERIALS[k].label : FOODS[k] || k}`).join(", ") || "nothing";
// which gathering activity yields a material
export const SOURCE = { log: "chop_tree", plank: "saw_planks", stone: "gather_stones", clay: "dig_clay", fiber: "gather_fiber", sand: "dig_sand", ore: "mine_ore", brick: "fire_kiln", glass: "fire_kiln", metal: "smelt", cloth: "weave" };
