// Every activity the creature can choose. where: "inside" (needs furniture/stations in a room), "outside", or "either".
// stations: furniture that hosts it indoors. anim: which body animation plays (defaults to the activity's name).
import { PROCESS, GATHER } from "./economy.js";

export const ACTIVITIES = {
  // ---- survival & making ----
  chop_tree:        { where: "outside", desc: "chop down a tree with an axe (it falls; 4 logs)" },
  gather_sticks:    { where: "outside", desc: "gather fallen branches (slow logs, no axe needed)" },
  gather_stones:    { where: "outside", desc: "collect stones" },
  mine_ore:         { where: "outside", desc: "chip iron ore from the big rocks" },
  dig_clay:         { where: "outside", desc: "dig clay at the riverbank" },
  dig_sand:         { where: "outside", desc: "dig sand at the riverbank" },
  gather_fiber:     { where: "outside", desc: "cut reeds and grasses for fibre" },
  forage:           { where: "outside", desc: "forage berries and mushrooms" },
  saw_planks:       { where: "either", stations: ["workbench"], desc: PROCESS.saw_planks.desc + " — at a workbench" },
  fire_kiln:        { where: "outside", desc: PROCESS.fire_kiln.desc + " — at your kiln" },
  smelt:            { where: "outside", desc: PROCESS.smelt.desc + " — at your forge" },
  weave:            { where: "either", stations: ["loom"], desc: PROCESS.weave.desc + " — at a loom" },
  build:            { where: "outside", desc: "work on the next stage of a building (set place to it)" },
  craft:            { where: "either", stations: ["workbench"], desc: "craft an object (set \"item\", and \"for\" = the place it goes)" },
  // ---- rest & body ----
  sleep:            { where: "either", stations: ["bed"], desc: "sleep (wherever your best shelter is)" },
  nap:              { where: "either", stations: ["sofa", "bed", "armchair"], desc: "take a nap" },
  sit:              { where: "either", stations: ["sofa", "armchair", "chair"], desc: "sit and rest" },
  bathe:            { where: "inside", stations: ["bath"], desc: "take a warm bath" },
  groom:            { where: "inside", stations: ["mirror"], desc: "brush your fur at the mirror" },
  stretch:          { where: "either", stations: ["mat", "floor"], desc: "stretch" },
  yoga:             { where: "either", stations: ["mat", "floor"], desc: "do yoga" },
  exercise:         { where: "either", stations: ["mat", "floor"], desc: "work out" },
  meditate:         { where: "either", stations: ["mat", "floor"], desc: "meditate" },
  // ---- food ----
  eat:              { where: "either", stations: ["table"], desc: "eat (uses food from your stores)" },
  drink:            { where: "either", stations: ["table", "armchair", "sofa"], desc: "sip a hot drink" },
  cook:             { where: "either", stations: ["stove"], desc: "cook a meal (stove inside, or over a campfire; uses 2 food → 1 cooked meal)" },
  bake:             { where: "inside", stations: ["oven"], desc: "bake bread (2 grain → 2 bread)" },
  make_coffee:      { where: "inside", stations: ["coffee"], desc: "brew coffee or tea" },
  wash_dishes:      { where: "inside", stations: ["sink"], desc: "wash the dishes" },
  // ---- home & hobbies ----
  watch_tv:         { where: "inside", stations: ["tv"], desc: "watch TV" },
  play_videogames:  { where: "inside", stations: ["console"], desc: "play video games" },
  use_computer:     { where: "inside", stations: ["computer"], desc: "use the computer" },
  read:             { where: "either", stations: ["armchair", "sofa", "bed", "table"], desc: "read a book" },
  browse_books:     { where: "inside", stations: ["bookshelf"], desc: "browse and tidy your bookshelves" },
  write:            { where: "either", stations: ["desk", "table"], desc: "write (journal, letters, poems)" },
  knit:             { where: "either", stations: ["armchair", "sofa"], desc: "knit" },
  puzzle:           { where: "inside", stations: ["table"], desc: "do a jigsaw puzzle" },
  board_game:       { where: "inside", stations: ["table"], desc: "play a board game against yourself" },
  listen_records:   { where: "inside", stations: ["records"], desc: "play a record from your music library" },
  light_fireplace:  { where: "inside", stations: ["fireplace"], desc: "light the fireplace (uses 1 log)" },
  warm_up:          { where: "either", stations: ["fireplace"], desc: "warm up by a fire" },
  look_out_window:  { where: "inside", stations: ["window"], desc: "gaze out of the window" },
  water_plants:     { where: "either", stations: ["plants"], desc: "water the plants" },
  sweep:            { where: "either", stations: ["floor"], desc: "tidy and sweep" },
  paint:            { where: "either", stations: ["easel"], desc: "paint" },
  pottery:          { where: "inside", stations: ["wheel"], desc: "throw pots on the potter's wheel" },
  grind_flour:      { where: "inside", stations: ["millstone"], desc: "grind grain (2 grain → 3 grain as flour)" },
  dance:            { where: "either", stations: ["records", "floor"], desc: "dance" },
  telescope:        { where: "inside", stations: ["telescope"], desc: "look through the telescope" },
  // ---- music ----
  play_piano:       { where: "inside", stations: ["piano"], desc: "play the piano", music: true },
  play_violin:      { where: "either", stations: ["floor"], desc: "play the violin", music: true, tool: "instrument" },
  play_cello:       { where: "either", stations: ["floor"], desc: "play the cello", music: true, tool: "instrument" },
  play_guitar:      { where: "either", stations: ["sofa", "chair", "floor"], desc: "play the guitar", music: true, tool: "instrument" },
  play_flute:       { where: "either", stations: ["floor"], desc: "play a flute or clarinet", music: true, tool: "instrument" },
  play_horn:        { where: "either", stations: ["floor"], desc: "play a horn or saxophone", music: true, tool: "instrument" },
  play_drums:       { where: "either", stations: ["floor"], desc: "play drums", music: true, tool: "instrument" },
  play_harp:        { where: "either", stations: ["floor"], desc: "play the harp", music: true, tool: "instrument" },
  play_xylophone:   { where: "either", stations: ["floor"], desc: "play the xylophone", music: true, tool: "instrument" },
  sing:             { where: "either", stations: ["floor"], desc: "sing (no instrument needed)", music: true },
  // ---- outdoors & play ----
  garden:           { where: "outside", desc: "tend a garden (needs a built garden)" },
  harvest:          { where: "outside", desc: "harvest your garden or field" },
  pick_flowers:     { where: "outside", desc: "pick flowers" },
  plant_tree:       { where: "outside", desc: "plant a sapling (it grows over a few days)" },
  stack_wood:       { where: "outside", desc: "split and stack firewood" },
  make_campfire:    { where: "outside", desc: "light a campfire (uses 2 logs)" },
  roast_marshmallows:{ where: "outside", desc: "roast marshmallows over a campfire" },
  fish:             { where: "outside", desc: "fish (needs a fishing rod)" },
  swim:             { where: "outside", desc: "swim in the river or pond" },
  skip_stones:      { where: "outside", desc: "skip stones on the water" },
  fly_kite:         { where: "outside", desc: "fly a kite (needs a kite)" },
  feed_birds:       { where: "outside", desc: "scatter seeds for the birds" },
  birdwatch:        { where: "outside", desc: "birdwatch" },
  photograph:       { where: "outside", desc: "take photos" },
  sketch:           { where: "outside", desc: "sketch the view" },
  jog:              { where: "outside", desc: "go for a jog" },
  juggle:           { where: "outside", desc: "practise juggling" },
  play_ball:        { where: "outside", desc: "kick a ball around" },
  jump_rope:        { where: "outside", desc: "jump rope" },
  cloud_watch:      { where: "outside", desc: "lie in the grass watching clouds" },
  stargaze:         { where: "outside", desc: "lie back and look at the stars" },
  sunbathe:         { where: "outside", desc: "lie in the sun" },
  build_snowman:    { where: "outside", desc: "build a snowman (only when it snows)" },
  catch_snowflakes: { where: "outside", desc: "catch snowflakes (only when it snows)" },
  splash_puddles:   { where: "outside", desc: "jump in puddles (only when it rains)" },
  // ---- animals (set "animal") ----
  pet_animal:       { where: "either", desc: "pet or cuddle an animal" },
  feed_animals:     { where: "outside", desc: "feed an animal" },
  play_fetch:       { where: "outside", desc: "play fetch" },
  collect_eggs:     { where: "outside", desc: "collect eggs from chickens" },
  brush_animal:     { where: "outside", desc: "brush a furry animal" },
  befriend:         { where: "outside", desc: "slowly make friends with a shy wild animal" },
  // ---- anything ----
  look_around:      { where: "either", desc: "wander and look around" },
  think:            { where: "either", desc: "stop and think" },
  wave:             { where: "either", desc: "wave at the world" },
  celebrate:        { where: "either", desc: "celebrate" },
  idle:             { where: "either", desc: "just be" },
};
export const ACTIVITY_NAMES = Object.keys(ACTIVITIES);
// which body animation plays for activities whose motion is shared
export const ANIM_FOR = {
  saw_planks: "saw", craft: "craft", weave: "weave", fire_kiln: "stoke", smelt: "smith", gather_sticks: "gather", gather_stones: "gather_low", mine_ore: "mine",
  dig_clay: "shovel", dig_sand: "shovel", gather_fiber: "cut_reeds", forage: "forage", pet_animal: "pet", feed_animals: "scatter", feed_birds: "scatter", collect_eggs: "gather_low",
  brush_animal: "brush", befriend: "befriend", play_fetch: "throw", chop_tree: "chop", stack_wood: "stack_wood",
};
export const animFor = a => ANIM_FOR[a] || a;

export function activityMenu(){
  const groups = { inside: [], outside: [], either: [] };
  for (const [k, a] of Object.entries(ACTIVITIES)){ if (k === "idle") continue; groups[a.where].push(`${k}: ${a.desc}`); }
  return `Outside only:\n- ${groups.outside.join("\n- ")}\nInside a building (needs the right furniture there):\n- ${groups.inside.join("\n- ")}\nInside or outside:\n- ${groups.either.join("\n- ")}`;
}
export { GATHER };
