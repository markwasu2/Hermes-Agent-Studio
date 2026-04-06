const { contextBridge } = require("electron"); contextBridge.exposeInMainWorld("hermesStudio", { platform: process.platform });
