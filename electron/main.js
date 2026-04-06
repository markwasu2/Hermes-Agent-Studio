const { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let splashWindow = null;
let tray = null;
let nextProcess = null;
let hermesProcess = null;
const STUDIO_PORT = 3131;
const HERMES_PORT = 8642;
const HERMES_KEY = 'hermes-studio-autokey';

// ── Find hermes binary ────────────────────────────────────────────────────
function findHermes() {
  const candidates = [
    path.join(os.homedir(), '.hermes', 'bin', 'hermes'),
    path.join(os.homedir(), '.local', 'bin', 'hermes'),
    '/usr/local/bin/hermes',
    '/opt/homebrew/bin/hermes',
  ];
  // Also try PATH
  try {
    const which = execSync('which hermes 2>/dev/null').toString().trim();
    if (which) candidates.unshift(which);
  } catch {}

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ── Ensure Hermes .env has API server enabled ─────────────────────────────
function ensureHermesEnv() {
  const envPath = path.join(os.homedir(), '.hermes', '.env');
  const hermesDir = path.join(os.homedir(), '.hermes');

  if (!fs.existsSync(hermesDir)) {
    fs.mkdirSync(hermesDir, { recursive: true });
  }

  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  let changed = false;

  if (!content.includes('API_SERVER_ENABLED=true')) {
    content += '\nAPI_SERVER_ENABLED=true';
    changed = true;
  }
  if (!content.includes('API_SERVER_KEY=')) {
    content += `\nAPI_SERVER_KEY=${HERMES_KEY}`;
    changed = true;
  }
  if (!content.includes('API_SERVER_CORS_ORIGINS=')) {
    content += `\nAPI_SERVER_CORS_ORIGINS=http://localhost:${STUDIO_PORT}`;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(envPath, content.trim() + '\n');
  }
}

// ── Check if a port is alive ──────────────────────────────────────────────
function checkPort(port) {
  return new Promise(resolve => {
    http.get(`http://127.0.0.1:${port}/health`, res => {
      resolve(res.statusCode < 500);
    }).on('error', () => resolve(false));
  });
}

// ── Start Hermes gateway ──────────────────────────────────────────────────
async function startHermes() {
  // Already running?
  const alive = await checkPort(HERMES_PORT);
  if (alive) {
    updateSplash('Hermes gateway already running ✓', 60);
    return true;
  }

  const hermesBin = findHermes();
  if (!hermesBin) {
    return false; // Will handle in UI
  }

  ensureHermesEnv();
  updateSplash('Starting Hermes gateway...', 40);

  return new Promise(resolve => {
    hermesProcess = spawn(hermesBin, ['gateway'], {
      env: { ...process.env, HOME: os.homedir() },
      stdio: 'pipe',
      detached: false,
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(false); }
    }, 30_000);

    function tryResolve(success) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(success);
      }
    }

    hermesProcess.stdout.on('data', d => {
      const text = d.toString();
      if (text.includes('API server listening') || text.includes('8642')) {
        updateSplash('Hermes gateway ready ✓', 70);
        setTimeout(() => tryResolve(true), 500);
      }
    });

    hermesProcess.stderr.on('data', d => {
      const text = d.toString();
      if (text.includes('8642') || text.includes('listening')) {
        updateSplash('Hermes gateway ready ✓', 70);
        setTimeout(() => tryResolve(true), 500);
      }
    });

    hermesProcess.on('error', () => tryResolve(false));

    // Poll as fallback
    const poll = setInterval(async () => {
      const ok = await checkPort(HERMES_PORT);
      if (ok) { clearInterval(poll); tryResolve(true); }
    }, 1000);
  });
}

// ── Start Next.js ─────────────────────────────────────────────────────────
async function startNext() {
  const appDir = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..');
  const nextBin = path.join(appDir, 'node_modules', '.bin', 'next');
  const cmd = app.isPackaged ? 'start' : 'dev';

  nextProcess = spawn(process.execPath, [nextBin, cmd, '--port', String(STUDIO_PORT)], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: String(STUDIO_PORT),
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_GATEWAY_URL: `http://localhost:${HERMES_PORT}`,
      NEXT_PUBLIC_API_KEY: HERMES_KEY,
    },
    stdio: 'pipe',
  });

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) reject(new Error('Studio server timeout'));
    }, 60_000);

    function done() {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    }

    nextProcess.stdout.on('data', d => {
      if (d.toString().includes('Ready') || d.toString().includes('ready')) done();
    });
    nextProcess.stderr.on('data', d => {
      if (d.toString().includes('Ready') || d.toString().includes('ready')) done();
    });
    nextProcess.on('error', reject);

    // Poll fallback
    const poll = setInterval(async () => {
      const ok = await checkPort(STUDIO_PORT);
      if (ok) { clearInterval(poll); done(); }
    }, 800);
  });
}

// ── Splash window helpers ─────────────────────────────────────────────────
function updateSplash(message, progress) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `document.getElementById('msg').textContent=${JSON.stringify(message)};` +
      `document.getElementById('bar').style.width='${progress}%';`
    ).catch(() => {});
  }
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420, height: 300, frame: false, resizable: false,
    backgroundColor: '#080a0d', center: true,
    webPreferences: { nodeIntegration: false },
  });

  splashWindow.loadURL(`data:text/html,<!DOCTYPE html>
<html><head><style>
* { margin:0;padding:0;box-sizing:border-box; }
body { background:#080a0d;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#e8eaf0; }
.logo { width:64px;height:64px;background:#f0a500;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#080a0d;margin-bottom:16px;font-family:monospace; }
h1 { font-size:20px;font-weight:700;letter-spacing:-.02em;margin-bottom:6px; }
p { color:#8896a8;font-size:13px;margin-bottom:28px; }
.track { width:240px;height:3px;background:#1f2a3a;border-radius:2px;overflow:hidden; }
.bar { height:100%;background:#f0a500;border-radius:2px;transition:width 0.4s ease;width:10%; }
.msg { margin-top:14px;font-size:12px;color:#4a5568;font-family:monospace; }
</style></head><body>
<div class="logo">H</div>
<h1>Hermes Studio</h1>
<p>Starting your AI agent...</p>
<div class="track"><div class="bar" id="bar"></div></div>
<div class="msg" id="msg">Initializing...</div>
</body></html>`);
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 600,
    title: 'Hermes Studio',
    backgroundColor: '#080a0d',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 16 },
  });

  mainWindow.loadURL(`http://localhost:${STUDIO_PORT}`);
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // External links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${STUDIO_PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

// ── Boot sequence ─────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  updateSplash('Initializing...', 10);

  try {
    // Step 1: Start Hermes (if installed)
    updateSplash('Starting Hermes Agent...', 20);
    const hermesOk = await startHermes();

    // Step 2: Start Studio
    updateSplash('Starting Hermes Studio...', 75);
    await startNext();

    // Step 3: Open main window
    updateSplash('Opening...', 95);
    createMain();

    // Store whether hermes started for onboarding
    if (!hermesOk) {
      // Hermes not installed — studio will show onboarding with install instructions
      process.env.HERMES_NOT_INSTALLED = '1';
    }

  } catch (err) {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.loadURL(`data:text/html,<body style="background:#080a0d;color:#ff4d6d;font-family:monospace;padding:32px;text-align:center;"><h2>Failed to start</h2><p style="margin-top:12px;color:#8896a8">${err.message}</p></body>`);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMain();
});

app.on('before-quit', () => {
  if (nextProcess) { nextProcess.kill(); nextProcess = null; }
  if (hermesProcess) { hermesProcess.kill(); hermesProcess = null; }
});

// Tray
app.whenReady().then(() => {
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  tray = new Tray(icon);
  tray.setToolTip('Hermes Studio');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Hermes Studio', click: () => mainWindow ? mainWindow.focus() : createMain() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
});
