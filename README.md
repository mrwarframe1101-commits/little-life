# Little Life

An AI creature wakes up alone in a wild forest, invents itself, dreams up a town, and builds it all by hand:
gathering logs, stone, clay and fibre, sawing planks, raising buildings stage by stage, crafting furniture,
keeping animals, playing real instruments and composing music, while you watch.

## Run it
Double-click **START.bat** (the first run installs everything; needs Node.js).
Or in a terminal in this folder: `npm install` once, then `npm start`.

On first launch, paste an Anthropic API key (console.anthropic.com → API Keys), pick a brain, and press **Begin a life**.

## Controls
- **Space** watch / pause · **1–4** camera: follow, cinematic, free, whole town · drag to orbit, scroll to zoom
- **M** music on/off · **L** place names · **Tab** notes panel · **F11** fullscreen
- **F9** save a screenshot to `debug/` · **F12** developer tools

## Where things are
- Code: `main.js` (window, saving, API calls) and `src/` (the 3D world, creature, brain, music).
- Models: `assets/models` (Kenney kits, CC0). Sounds: `assets/samples` (Salamander piano, tonejs-instruments).
- The save file and settings live in `%APPDATA%\little-life\littlelife\` (daily backups in `backups\`).
- `debug/log.txt` records everything the app prints, for troubleshooting.

## Debug run
`set LL_AUTOSHOT=1 && npm start` saves screenshots to `debug/` at 20, 45 and 90 seconds.
