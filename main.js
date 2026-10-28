// Little Life — Electron main process.
// Serves the app from app://local/, keeps the API key and save files on this PC,
// and makes the calls to Claude so the key never reaches the page.
const { app, BrowserWindow, ipcMain, protocol, net, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const ROOT = __dirname;
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

const dataDir = () => path.join(app.getPath("userData"), "littlelife");
const file = (name) => path.join(dataDir(), name);
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch { return fallback; }
}
function writeJSON(name, data) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const target = file(name), tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, target);
}

const DEFAULT_SETTINGS = { apiKey: "", model: "claude-haiku-5-5", volume: 0.8, quality: "high", speed: 1, musicOn: true, apiBase: "", apiFormat: "anthropic" };
let settings = { ...DEFAULT_SETTINGS, ...readJSON("settings.json", {}) };

let win, logLine = (l) => console.log(l);
function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1000, minHeight: 640,
    backgroundColor: "#141a2e", autoHideMenuBar: true, title: "Little Life",
    webPreferences: { preload: path.join(ROOT, "preload.js"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.loadURL("app://local/src/index.html");
  // ---- logging & screenshots, so problems can be diagnosed ----
  const logFile = path.join(ROOT, "debug", "log.txt");
  try { fs.mkdirSync(path.dirname(logFile), { recursive: true }); fs.writeFileSync(logFile, `Little Life log ${new Date().toISOString()}\n`); } catch {}
  const log = (line) => { try { fs.appendFileSync(logFile, line + "\n"); } catch {} console.log(line); };
  logLine = log;
  win.webContents.on("console-message", (_e, level, message, line, source) => {
    const lv = typeof level === "number" ? ["log", "warn", "error", "info"][level] || level : level;
    log(`[${lv}] ${message}${source ? `  (${String(source).replace(/^app:\/\/local\//, "")}:${line})` : ""}`);
  });
  win.webContents.on("render-process-gone", (_e, d) => log(`[fatal] renderer gone: ${d.reason}`));
  win.webContents.on("did-fail-load", (_e, code, desc, url) => log(`[fatal] failed to load ${url}: ${desc}`));
  const shot = async (name) => { try { const img = await win.webContents.capturePage(); const f = path.join(ROOT, "debug", name); fs.writeFileSync(f, img.toPNG()); log(`[shot] saved ${f}`); } catch (e) { log("[shot] failed " + e); } };
  win.webContents.on("before-input-event", (e, input) => { if (input.type === "keyDown" && input.key === "F9") shot(`shot-${Date.now()}.png`); });
  if (process.env.LL_AUTOSHOT) [20, 45, 90].forEach(s => setTimeout(() => shot(`auto-${s}s.png`), s * 1000));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.key === "F12") win.webContents.toggleDevTools();
    if (input.type === "keyDown" && input.key === "F11") win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    const full = path.normalize(path.join(ROOT, rel));
    if (!full.startsWith(ROOT)) return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(full).toString());
  });
  createWindow();
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => app.quit());

// ---------- settings ----------
ipcMain.handle("settings:get", () => ({ ...settings, apiKey: settings.apiKey ? "set" : "", hasKey: !!settings.apiKey }));
ipcMain.handle("settings:set", (_e, patch) => {
  const clean = {};
  if (typeof patch.apiKey === "string" && patch.apiKey.trim()) clean.apiKey = patch.apiKey.trim();
  if (patch.clearKey) clean.apiKey = "";
  if (typeof patch.model === "string") clean.model = patch.model;
  if (typeof patch.volume === "number") clean.volume = Math.max(0, Math.min(1, patch.volume));
  if (typeof patch.quality === "string") clean.quality = patch.quality;
  if (typeof patch.speed === "number") clean.speed = patch.speed;
  if (typeof patch.musicOn === "boolean") clean.musicOn = patch.musicOn;
  if (typeof patch.apiBase === "string") clean.apiBase = patch.apiBase.trim().replace(/\/+$/, "");
  if (patch.apiFormat === "anthropic" || patch.apiFormat === "openai") clean.apiFormat = patch.apiFormat;
  settings = { ...settings, ...clean };
  writeJSON("settings.json", settings);
  return { ...settings, apiKey: settings.apiKey ? "set" : "", hasKey: !!settings.apiKey };
});

// ---------- save files ----------
ipcMain.handle("save:load", () => readJSON("world.json", null));
let lastBackupDay = "";
ipcMain.handle("save:write", (_e, data) => {
  writeJSON("world.json", data);
  const day = new Date().toISOString().slice(0, 10);
  if (day !== lastBackupDay) {
    lastBackupDay = day;
    try { fs.mkdirSync(file("backups"), { recursive: true }); fs.copyFileSync(file("world.json"), path.join(file("backups"), `world-${day}.json`)); } catch {}
  }
  return true;
});
ipcMain.handle("save:reset", () => {
  try { if (fs.existsSync(file("world.json"))) fs.renameSync(file("world.json"), file(`world-retired-${Date.now()}.json`)); } catch {}
  return true;
});
ipcMain.handle("save:folder", () => { fs.mkdirSync(dataDir(), { recursive: true }); shell.openPath(dataDir()); return dataDir(); });

// ---------- the brain ----------
let inFlight = 0;
ipcMain.handle("brain:think", async (_e, { prompt, maxTokens = 4000, model }) => {
  if (!settings.apiKey) return { ok: false, code: "no_key", message: "No API key yet." };
  if (inFlight >= 2) return { ok: false, code: "busy", message: "Already thinking." };
  inFlight++;
  try {
    const useModel = model || settings.model;
    const openai = settings.apiFormat === "openai";
    let base = settings.apiBase || (openai ? "https://api.openai.com/v1" : "https://api.anthropic.com");
    const url = openai ? base + "/chat/completions" : (/\/v1$/.test(base) ? base + "/messages" : base + "/v1/messages");
    const headers = { "content-type": "application/json" };
    if (openai) headers.authorization = "Bearer " + settings.apiKey;
    else { headers["x-api-key"] = settings.apiKey; headers["anthropic-version"] = "2023-06-01"; if (settings.apiBase) headers.authorization = "Bearer " + settings.apiKey; }
    const body = openai ? { model: useModel, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] } : { model: useModel, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] };
    // never wait forever: give up after 90 s so the app can retry
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 90000);
    let res; try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal }); } finally { clearTimeout(timer); }
    const raw = await res.text(); let data = {}; try { data = JSON.parse(raw); } catch {}
    logLine(`[brain] ${url} model=${useModel} -> HTTP ${res.status}${res.ok ? "" : " " + raw.slice(0, 300)}`);
    if (!res.ok){
      const code = res.status === 401 || res.status === 403 ? "auth" : res.status === 429 ? "rate_limited" : res.status === 529 || res.status === 503 ? "overloaded" : res.status === 400 || res.status === 404 ? "bad_request" : "error";
      const msg = (data && data.error && (data.error.message || data.error)) || raw.slice(0, 200) || `HTTP ${res.status}`;
      return { ok: false, code, status: res.status, message: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    let text = "", usage = null;
    if (openai || data.choices){ text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ""; if (data.usage) usage = { input_tokens: data.usage.prompt_tokens || 0, output_tokens: data.usage.completion_tokens || 0 }; }
    else { text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join(""); usage = data.usage || null; }
    if (!text) return { ok: false, code: "error", message: "The service answered, but with no text: " + raw.slice(0, 160) };
    return { ok: true, text, usage, model: data.model };
  } catch (err) {
    const timedOut = err && err.name === "AbortError"; logLine("[brain] failed: " + (timedOut ? "timed out after 90 s" : String(err && err.message || err)));
    return { ok: false, code: timedOut ? "timeout" : "network", message: timedOut ? "The AI service didn't answer within 90 seconds." : String(err && err.message || err) };
  } finally {
    inFlight--;
  }
});
