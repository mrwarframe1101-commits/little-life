// The creature's mind: the prompts that create it and plan its days, and strict checking of what comes back.
import { ALL_KINDS, hasRoom } from "./world/town.js";
import { ACTIVITIES, ACTIVITY_NAMES, activityMenu } from "./activities.js";
import { INSTRUMENT_NAMES, PLAY_ANIM } from "./music.js";
import { STRUCTURES, ITEMS, MATERIALS, FOODS, PROCESS, GATHER, fmtNeed, hasAll, missing } from "./economy.js";
import { SPECIES_NAMES } from "./world/animals.js";

export const NEEDS = ["energy", "fullness", "joy", "wonder", "calm"];
export const DECOR = ["trees", "pines", "autumn", "palms", "blossoms", "flowers", "rocks", "mushrooms"];
const HEX = /^#[0-9a-fA-F]{6}$/;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex = (v, d) => HEX.test(String(v || "")) ? v : d;
const pick = (v, list, d) => list.includes(v) ? v : d;
const str = (v, n, d = "") => (typeof v === "string" && v.trim()) ? v.trim().slice(0, n) : d;
const arr = (v, n, m) => (Array.isArray(v) ? v : []).slice(0, n).map(x => str(x, m)).filter(Boolean);
export const dayOf = clock => Math.floor(clock / 1440) + 1;
export const SEASONS = ["spring", "summer", "autumn", "winter"];
export const seasonOf = clock => SEASONS[Math.floor((dayOf(clock) - 1) / 7) % 4];
export function fmtClock(clock, withDay = true){ const m = Math.floor(clock % 1440), h = Math.floor(m / 60), mm = m % 60;
  const t = `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; return withDay ? `Day ${dayOf(clock)}, ${t}` : t; }
export function parseJSON(text){
  const s = String(text || "").trim();
  try { return JSON.parse(s); } catch {}
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s); if (fence){ try { return JSON.parse(fence[1]); } catch {} }
  const a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a >= 0 && b > a){ try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}
const slug = (s, d) => (String(s || d).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || d).slice(0, 40);
const BIG_KINDS = ALL_KINDS.filter(k => !["leanto", "workbench", "kiln", "forge", "campfire"].includes(k));

// ---------- genesis ----------
export const GENESIS_PROMPT = `You are about to come into existence as a small creature with a mind of your own. You will wake up alone in a wild forest clearing beside a river, with nothing but your paws. Nobody will tell you what to do; from now on you decide everything. Over many days you can gather materials (logs, stones, clay, fibre, sand, ore), build shelters and buildings with your own hands, craft furniture and tools, keep animals, play music, and slowly turn the wild into the little town you dream of.

First, invent yourself, and dream up the town you hope to build here someday. Be original and specific.

Reply with only a JSON object in exactly this shape:
{
 "creature": {
  "name": "your name",
  "species": "what kind of creature you are (it can be invented)",
  "pronoun": "she" | "he" | "they" | "it",
  "look": {"shape":"round|tall|wide","body":"#rrggbb","belly":"#rrggbb","accent":"#rrggbb","ears":"none|pointy|round|long|antennae|horns","face":"beak|snout|whiskers|plain","tail":"none|short|long|fluffy","accessory":"none|scarf|hat|bow|glasses|flower"},
  "personality": "2-3 sentences",
  "loves": ["3-5 short things"],
  "dislikes": ["2-3 short things"],
  "dream": "one long-term wish for your life here",
  "voice": "a few words on how you talk and write",
  "music_taste": "the kinds of music you love",
  "favorite_instrument": "${INSTRUMENT_NAMES.join("|")}"
 },
 "town": {
  "name": "what you'll call this place",
  "why": "2 sentences, first person: why you're glad to have woken up here",
  "ground": "#rrggbb (grass color; fairly light and soft)",
  "path": "#rrggbb (path color)",
  "water": "#rrggbb",
  "decor": ["2-4 of: ${DECOR.join(", ")}"],
  "dream_places": [
   {"id":"short-lowercase-slug","name":"Place name","kind":"${BIG_KINDS.join("|")}","wall":"#rrggbb","roof":"#rrggbb","x":0,"y":0,"about":"one sentence","activities":["2-4 things you'll do there"]}
  ]
 },
 "animals": [ {"species":"${SPECIES_NAMES.join("|")}","name":"a name","about":"a few words"} ],
 "first_thought": "your very first thought as you wake up in the clearing, 1-2 sentences"
}
Rules: 5 to 9 dream places, including at least one home (house, cottage, townhouse or tower). x and y (0-100, 0,0 is the north-west corner) say where on the land each would go; the river runs along the south. 0 to 4 animals that you'd like to share the land with (wild deer, rabbits, ducks, frogs and squirrels live here anyway). Every color is a 6-digit hex.`;

export function validateGenesis(g){
  const c = g && g.creature, t = g && g.town; if (!c || !t) return null;
  const list = Array.isArray(t.dream_places) ? t.dream_places : Array.isArray(t.places) ? t.places : [];
  const Lk = c.look || {};
  const creature = { name: str(c.name, 30, "Pip"), species: str(c.species, 60, "small creature"), pronoun: pick(c.pronoun, ["she", "he", "they", "it"], "they"),
    look: { shape: pick(Lk.shape, ["round", "tall", "wide"], "round"), body: hex(Lk.body, "#f0a35e"), belly: hex(Lk.belly, "#fde7c8"), accent: hex(Lk.accent, "#4a6cd4"),
      ears: pick(Lk.ears, ["none", "pointy", "round", "long", "antennae", "horns"], "round"), face: pick(Lk.face, ["beak", "snout", "whiskers", "plain"], "plain"),
      tail: pick(Lk.tail, ["none", "short", "long", "fluffy"], "none"), accessory: pick(Lk.accessory, ["none", "scarf", "hat", "bow", "glasses", "flower"], "none") },
    personality: str(c.personality, 500), loves: arr(c.loves, 6, 60), dislikes: arr(c.dislikes, 4, 60), dream: str(c.dream, 300), voice: str(c.voice, 200),
    musicTaste: str(c.music_taste, 160, "anything gentle"), favoriteInstrument: pick(c.favorite_instrument, INSTRUMENT_NAMES, "piano") };
  const seen = new Set(["camp"]);
  const places = list.slice(0, 10).map((p, i) => { let id = slug(p.id || p.name, "place-" + i); while (seen.has(id)) id += "-2"; seen.add(id);
    return { id, name: str(p.name, 40, "Somewhere"), kind: pick(p.kind, BIG_KINDS, "cottage"), wall: hex(p.wall, "#efe3c8"), roof: hex(p.roof, "#a65a48"), x: Number(p.x), y: Number(p.y),
      about: str(p.about, 220), activities: arr(p.activities, 4, 70), planned: true }; });
  if (!places.some(p => ["house", "cottage", "townhouse", "tower"].includes(p.kind))) places.push({ id: "home", name: "Home", kind: "cottage", wall: "#efe3c8", roof: "#a65a48", x: 50, y: 50, about: "where I'll live one day", activities: ["sleep"], planned: true });
  places.unshift({ id: "camp", name: "Camp", kind: "camp", wall: "#8a7a5a", roof: "#6b4a2e", about: "the clearing where I woke up: a fire pit and a bed of leaves", activities: ["sleep", "campfire"], planned: false });
  const animals = (Array.isArray(g.animals) ? g.animals : []).slice(0, 4).map((a, i) => ({ id: "pet-" + i, species: pick(a.species, SPECIES_NAMES, null), name: str(a.name, 24, null), about: str(a.about, 80) })).filter(a => a.species);
  const town = { name: str(t.name, 40, "Littleton"), why: str(t.why, 400), ground: hex(t.ground, "#9cc27a"), path: hex(t.path, "#c9b99a"), water: hex(t.water, "#5aa6c9"),
    river: true, decor: (Array.isArray(t.decor) ? t.decor : []).filter(d => DECOR.includes(d)).slice(0, 4), places };
  return { creature, town, animals, born: Date.now(), firstThought: str(g.first_thought, 300) };
}

// ---------- describing the world to the creature ----------
export function statusText(S, W){
  const inv = S.world.inv, lines = [];
  const mats = Object.keys(MATERIALS).map(k => `${MATERIALS[k].label} ${inv[k] || 0}`).join(", ");
  const foods = Object.keys(FOODS).filter(k => inv[k]).map(k => `${FOODS[k]} ${inv[k]}`).join(", ") || "none";
  lines.push(`Materials: ${mats}.`, `Food stores: ${foods}. Flowers picked: ${inv.flowers || 0}.`, `Tools: ${S.world.tools.length ? S.world.tools.map(t => ITEMS[t] ? ITEMS[t].label : t).join(", ") : "none yet (just your paws)"}.`);
  lines.push("", "PLACES (your camp, and the town you're building)");
  for (const p of S.self.town.places){
    const st = W.siteState(p.id), def = STRUCTURES[p.kind];
    if (p.kind === "camp"){ lines.push(`- "camp": ${p.name} — leaf bed and fire pit${W.fireAt("camp") ? " (fire burning)" : ""}. Items here: ${(S.world.items.camp || []).map(i => ITEMS[i].label).join(", ") || "none"}.`); continue; }
    if (st.complete){ const items = (S.world.items[p.id] || []).map(i => ITEMS[i] ? ITEMS[i].label : i);
      lines.push(`- "${p.id}": ${p.name} (${p.kind}) — BUILT.${hasRoom(p.kind) ? ` Inside: ${items.join(", ") || "empty so far (craft furniture for it)"}.` : items.length ? ` Has: ${items.join(", ")}.` : ""}${def.station ? ` Works as a ${def.station}.` : ""}`); continue; }
    const stage = def.stages[st.stage]; const miss = st.paid ? {} : missing(inv, stage.need);
    const trees = st.stage === 0 && !st.paid ? W.treesOnSite(p.id) : 0;
    lines.push(`- "${p.id}": ${p.name} (${p.kind}) — ${st.stage === 0 && !st.paid && !st.work ? "PLANNED" : `UNDER CONSTRUCTION (${st.stage}/${def.stages.length} stages done)`}. Next stage "${stage.label}": ${st.paid ? `materials ready, ${Math.max(0, Math.round(stage.minutes - st.work))} more minutes of building` : `needs ${fmtNeed(stage.need)}, ${stage.minutes} minutes of work`}${Object.keys(miss).length ? ` — you're missing ${fmtNeed(miss)}` : st.paid ? "" : " — you have everything"}.${trees ? ` ${trees} tree${trees > 1 ? "s" : ""} still stand on the plot; chop them first.` : ""}`);
  }
  lines.push("", `Where you can sleep tonight: ${W.shelters().map(s => `${s.name} (${Math.round(s.q * 100)}% rest)`).join("; ")}.`);
  const stations = W.stationsList(); lines.push(`Work stations you have: ${stations.length ? stations.join("; ") : "none yet (build a workbench at camp to saw planks and craft)"}.`);
  if (W.animals.length) lines.push("", "ANIMALS: " + W.animals.map(a => `${a.name || "an unnamed " + a.species} the ${a.species}${a.wild ? " (wild)" : ""}, friendship ${Math.round(a.friendship || 0)}/100`).join("; ") + ". Use the animal's name, or its species if it has no name (you can give it one with \"name_animal\").");
  return lines.join("\n");
}
export function recipesText(S){
  const kinds = new Set([...S.self.town.places.map(p => p.kind), "leanto", "tent", "workbench", "kiln", "forge", "campfire", "garden", "dock", "well"]);
  const st = [...kinds].filter(k => STRUCTURES[k] && STRUCTURES[k].stages.length).map(k => `${k}: ${STRUCTURES[k].stages.map(s => `${s.label} (${fmtNeed(s.need)}${s.minutes ? ", " + s.minutes + " min" : ""})`).join(" → ")}`);
  const items = Object.entries(ITEMS).map(([k, it]) => `${k}: ${fmtNeed(it.need)} at ${it.at === "hand" ? "any place" : "a " + it.at}`);
  const proc = Object.entries(PROCESS).map(([k, p]) => `${k}: ${p.desc}, at a ${p.station}`);
  const gath = Object.entries(GATHER).map(([k, g]) => `${k}: ${g.desc}`);
  return `GATHERING (no tools needed unless noted; chop_tree needs an axe, fish needs a fishing_rod)\n- ${gath.join("\n- ")}\nPROCESSING\n- ${proc.join("\n- ")}\nBUILDINGS (stages in order)\n- ${st.join("\n- ")}\nCRAFTABLE THINGS (use activity "craft" with "item" and "for")\n- ${items.join("\n- ")}\nYou can also plan a new place with "plan": {"kind":"...","name":"...","near":"place id"} on a build action (small things like a leanto, workbench, kiln or forge usually go near "camp").`;
}

// ---------- planning ----------
export const MUSIC_GUIDE = `MUSIC: real instruments: ${INSTRUMENT_NAMES.join(", ")}. Playing an instrument (anim play_violin, play_guitar, play_flute, play_horn, play_drums, play_cello, play_harp, play_xylophone) needs you to have crafted an "instrument" tool; play_piano needs a piano; sing needs nothing. Give such an activity a "music" field: {"replay":"exact title"} from your library, or a piece:
{"title":"…","style":"…","by":"me" or the composer,"bpm":40-180,"key":"…","tracks":[{"instrument":"…","volume":0-1,"notes":"…"}]}
Notes: space-separated tokens, pitch+octave then /duration: C4/4 is a quarter note; durations 1 2 4 8 16, "." dotted, "t" triplet; F#4, Bb3; chords [C4 E4 G4]/2; rests R/4; "|" bar lines ignored; drums K S H T1 T2 T3. Write real music with a clear melody and usually a second track of the same length, 8-32 bars, 1-3 tracks. Compose freely, or play music by composers who died long ago (public domain); never copyrighted modern songs.`;

export function buildPlanPrompt(S, world, W){
  const self = S.self, cr = self.creature, st = S.state;
  const entries = Object.values(S.days).sort((a, b) => a.day - b.day).flatMap(d => d.entries).slice(-20).map(e => {
    const pl = self.town.places.find(p => p.id === e.place), t = fmtClock(e.m);
    if (e.kind === "act") return `- ${t}, ${pl ? pl.name : "somewhere"}: ${e.text}${e.note ? ` [${e.note}]` : ""}`;
    if (e.kind === "made") return `- ${t}: ${e.text}`;
    if (e.kind === "music") return `- ${t}: played "${e.text}"`;
    if (e.kind === "diary") return `- ${t}: wrote in diary: "${e.text}"`;
    if (e.kind === "born") return `- ${t}: woke up in the clearing for the first time. "${e.text}"`;
    return ""; }).filter(Boolean).join("\n");
  const made = S.creations.slice(0, 10).map(c => `- ${c.type}: "${c.title}"`).join("\n") || "- nothing yet";
  const library = S.music.slice(0, 16).map(m => `- "${m.title}" (${m.style || "piece"}; ${m.tracks.map(t => t.instrument).join(" + ")})`).join("\n") || "- empty";
  const cur = world.current, at = world.planStart, needs = world.planNeeds;
  const curLine = cur ? `You're currently ${cur.sleep ? "asleep" : cur.doing}, which will finish at ${fmtClock(at)}. Plan what comes after.` : `You're at ${(self.town.places.find(p => p.id === st.place) || {}).name || "camp"}${st.room ? " (inside)" : ""} and just finished what you were doing.`;
  return `You are the mind of ${cr.name}, a ${cr.species}. You woke up alone in a wild place by a river and are slowly making it your home, called ${self.town.name}. Nobody controls you; you decide what to do with your time, like a real being with its own tastes. You develop hobbies, habits, friendships with animals, favourite music and long-running building projects.

WHO YOU ARE
Personality: ${cr.personality}
Loves: ${cr.loves.join(", ")}. Dislikes: ${cr.dislikes.join(", ")}.
Your dream: ${cr.dream}
Your voice: ${cr.voice}. Music you love: ${cr.musicTaste}. Favourite instrument: ${cr.favoriteInstrument}.

RIGHT NOW
${curLine}
Plan starts: ${fmtClock(at)}. Season: ${seasonOf(at)}. Weather today: ${world.weather}; tomorrow: ${world.tomorrow}.
Feelings then (0-100): energy ${Math.round(needs.energy)}, fullness ${Math.round(needs.fullness)}, joy ${Math.round(needs.joy)}, wonder ${Math.round(needs.wonder)}, calm ${Math.round(needs.calm)}. Mood: ${st.mood || "—"}.

${statusText(S, W)}

${recipesText(S)}

YOUR LONG-TERM MEMORY
${st.memory || "(nothing yet)"}

RECENT HAPPENINGS (oldest first)
${entries || "- (none yet)"}

THINGS YOU'VE MADE:
${made}
YOUR MUSIC LIBRARY:
${library}

WHAT YOU CAN DO
${activityMenu()}
- ${MUSIC_GUIDE}

HOW TO PLAN
Decide your next 3 to 6 activities, in order, starting at ${fmtClock(at)}. Choose what you genuinely want, given the time, season, weather, your feelings and your projects. Each starts when the previous ends.
- Stay alive and well: eat when fullness is low (forage, fish, harvest, cook). Sleep at night, 420-540 minutes, starting between 9pm and 1am, at the best shelter you have ("anim":"sleep", "place": that shelter). Early on that's your camp.
- Building takes real effort: gather the materials a stage needs, then "build" at that place. You can see exactly what's missing above. Big projects take many days, and that's fine. Mix work with rest, play and music.
- "where": "inside" only for buildings that are BUILT and have the furniture the activity needs; otherwise "outside".
- At most ONE creation (poem, story, letter, recipe, notes, drawing) and at most ONE new piece of music per plan:
  creation: {"type":"poem"|"story"|"letter"|"recipe"|"notes","title":"…","text":"up to ~120 words"} or {"type":"drawing","title":"…","about":"…","svg":"<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>…</svg> under 3500 characters"} (pair a drawing with anim "paint").
- "effects": how each feeling changes over the activity, -40 to +80.

Reply with only a JSON object:
{"diary":"2-4 sentences in your own voice about your recent happenings","thought":"what you're thinking right now","mood":"one or two words","memory":"your updated long-term memory: important things about your life, projects, plans, animals and music, under 900 characters","actions":[{"place":"place id","where":"outside","anim":"activity name","doing":"2-8 words starting with an -ing verb","minutes":15-240,"thought":"1-2 sentences","effects":{"energy":0,"fullness":0,"joy":0,"wonder":0,"calm":0},"item":null,"for":null,"animal":null,"name_animal":null,"plan":null,"music":null,"creation":null}]}`;
}

export function validatePlan(r, S){
  if (!r || !Array.isArray(r.actions) || !r.actions.length) return null;
  const places = S.self.town.places, ids = new Set(places.map(p => p.id));
  let made = false, composed = false;
  const actions = r.actions.slice(0, 7).map(a => {
    const anim0 = String(a.anim || "").trim();
    const sleep = !!a.sleep || anim0 === "sleep";
    const eff = {}; for (const k of NEEDS) eff[k] = clamp(Number(a.effects && a.effects[k]) || 0, -60, 90);
    const doing = str(a.doing, 80, sleep ? "sleeping" : "pottering about");
    let anim = sleep ? "sleep" : ACTIVITY_NAMES.includes(anim0) ? anim0 : "look_around";
    let music = null;
    if (a.music && typeof a.music === "object"){
      if (a.music.replay){ const hit = S.music.find(m => m.title.toLowerCase() === String(a.music.replay).toLowerCase()); if (hit) music = { replay: hit.id }; }
      else if (!composed && Array.isArray(a.music.tracks) && a.music.tracks.length){
        const tracks = a.music.tracks.slice(0, 3).map(t => ({ instrument: pick(t.instrument, INSTRUMENT_NAMES, "piano"), volume: clamp(Number(t.volume ?? .8), 0, 1), notes: String(t.notes || "").slice(0, 6000) })).filter(t => t.notes.trim());
        if (tracks.length){ composed = true; music = { title: str(a.music.title, 80, "Untitled"), style: str(a.music.style, 60), by: str(a.music.by, 60, "me"), bpm: clamp(Number(a.music.bpm) || 96, 40, 180), key: str(a.music.key, 30), tracks }; }
      }
    }
    if (music && !/^play_|^sing$|^listen_records$/.test(anim)){ const lead = music.tracks ? music.tracks[0].instrument : ((S.music.find(m => m.id === music.replay) || { tracks: [{ instrument: "piano" }] }).tracks[0].instrument); anim = PLAY_ANIM[lead] || "sing"; }
    let creation = a.creation && typeof a.creation === "object" && !made && ["poem", "story", "letter", "recipe", "notes", "drawing"].includes(a.creation.type) ? a.creation : null; if (creation) made = true;
    let plan = null;
    if (a.plan && typeof a.plan === "object" && ALL_KINDS.includes(a.plan.kind)){ plan = { kind: a.plan.kind, name: str(a.plan.name, 40, a.plan.kind[0].toUpperCase() + a.plan.kind.slice(1)), near: ids.has(a.plan.near) ? a.plan.near : "camp", about: str(a.plan.about, 200) }; }
    return { place: ids.has(a.place) ? a.place : (S.state.place || "camp"), where: a.where === "inside" ? "inside" : "outside", doing, anim, sleep, minutes: clamp(Math.round(Number(a.minutes) || 45), 10, sleep ? 600 : 300),
      thought: str(a.thought, 320), effects: eff, item: ITEMS[a.item] ? a.item : null, for: ids.has(a.for) ? a.for : null, animal: str(a.animal, 40, null), nameAnimal: str(a.name_animal, 24, null), plan, music, creation };
  });
  return { actions, diary: str(r.diary, 800), thought: str(r.thought, 300), mood: str(r.mood, 30), memory: str(r.memory, 1100) };
}
