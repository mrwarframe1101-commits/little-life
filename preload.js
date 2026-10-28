const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("life", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  load: () => ipcRenderer.invoke("save:load"),
  save: (data) => ipcRenderer.invoke("save:write", data),
  reset: () => ipcRenderer.invoke("save:reset"),
  openSaveFolder: () => ipcRenderer.invoke("save:folder"),
  think: (req) => ipcRenderer.invoke("brain:think", req),
});
