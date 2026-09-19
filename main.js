/* ============================================================
   CALENDÁRIO DE POÇÕES — processo principal (Electron)
   Offline first: os dados do usuário ficam num arquivo JSON dentro
   da pasta escolhida no onboarding (como um cofre do Obsidian).
   ============================================================ */
const { app, BrowserWindow, Menu, dialog, ipcMain, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DATA_FILE = 'calendario-de-pocoes.json';
const SRC = path.join(__dirname, 'src');
const ICON = path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

/* Mesmo id do instalador (package.json > build.appId). Sem isso o Windows trata as
   janelas como "Electron" genérico: o botão da barra de tarefas e o atalho fixado
   ficam com o ícone do átomo em vez do frasco. */
const APP_ID = 'com.lauraviana.calendariodepocoes';
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

/* permite apontar o perfil do app para outra pasta (usado nos testes) */
if (process.env.POCOES_USER_DATA) app.setPath('userData', process.env.POCOES_USER_DATA);

let splashWin = null;
let mainWin = null;
let widgetWin = null;

/* ------------------------------------------------------------
   CONFIGURAÇÃO DO APP (fica no perfil do app, não na pasta de dados)
   ------------------------------------------------------------ */
function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeConfig(patch) {
  const next = Object.assign(readConfig(), patch);
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
  return next;
}

/* ------------------------------------------------------------
   PASTA E ARQUIVO DE DADOS
   ------------------------------------------------------------ */
function dataDir() {
  return readConfig().dataDir || null;
}

function dataFile(dir) {
  return path.join(dir || dataDir(), DATA_FILE);
}

function isUsableDir(dir) {
  try {
    if (!dir || !fs.statSync(dir).isDirectory()) return false;
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function suggestedDir() {
  return path.join(app.getPath('documents'), 'Calendário de Poções');
}

function loadDataText() {
  try {
    return fs.readFileSync(dataFile(), 'utf8');
  } catch (e) {
    return '';
  }
}

/* grava num arquivo temporário e renomeia: uma queda de energia no meio
   da escrita não corrompe os dados já salvos */
function saveDataText(json) {
  const file = dataFile();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, file);
}

/* ------------------------------------------------------------
   JANELAS
   ------------------------------------------------------------ */
function webPrefs() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  };
}

/* links externos (a música do dia) abrem no navegador do sistema;
   nenhuma janela do app navega para fora dos próprios arquivos */
function lockDown(win) {
  win.webContents.setWindowOpenHandler(function (details) {
    if (/^https:\/\//i.test(details.url)) shell.openExternal(details.url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', function (e, url) {
    if (!url.startsWith(pathToFileURL(SRC).href)) e.preventDefault();
  });
}

function createSplash() {
  splashWin = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    resizable: false,
    show: false,
    center: true,
    backgroundColor: '#0f0b24',
    icon: ICON,
    webPreferences: webPrefs()
  });
  lockDown(splashWin);
  splashWin.loadFile(path.join(SRC, 'splash.html'));
  splashWin.once('ready-to-show', function () { splashWin.show(); });
  splashWin.on('closed', function () { splashWin = null; });
}

function createMain(page, query) {
  const saved = readConfig().mainBounds;
  mainWin = new BrowserWindow(Object.assign({
    width: 1320,
    height: 900,
    minWidth: 380,
    minHeight: 480,
    show: false,
    backgroundColor: '#0f0b24',
    icon: ICON,
    title: 'Calendário de Poções',
    webPreferences: webPrefs()
  }, boundsOnScreen(saved)));
  lockDown(mainWin);
  mainWin.loadFile(path.join(SRC, page), { query: query || {} });
  mainWin.once('ready-to-show', function () { mainWin.show(); });
  mainWin.on('close', function () { writeConfig({ mainBounds: mainWin.getBounds() }); });
  mainWin.on('closed', function () { mainWin = null; });
}

function createWidget() {
  if (widgetWin) {
    widgetWin.show();
    widgetWin.focus();
    return;
  }
  const area = screen.getPrimaryDisplay().workArea;
  const size = { width: 400, height: 690 };
  const saved = boundsOnScreen(readConfig().widgetBounds);
  widgetWin = new BrowserWindow(Object.assign({
    x: area.x + area.width - size.width - 24,
    y: area.y + area.height - size.height - 24,
    width: size.width,
    height: size.height,
    minWidth: 300,
    minHeight: 360,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: '#0f0b24',
    icon: ICON,
    title: 'Poções — widget',
    webPreferences: webPrefs()
  }, saved));
  lockDown(widgetWin);
  widgetWin.loadFile(path.join(SRC, 'index.html'), { query: { widget: '1' } });
  widgetWin.once('ready-to-show', function () { widgetWin.show(); });
  widgetWin.on('close', function () { writeConfig({ widgetBounds: widgetWin.getBounds() }); });
  widgetWin.on('closed', function () { widgetWin = null; });
}

/* só reaproveita a posição salva se ela ainda cair dentro de algum monitor */
function boundsOnScreen(b) {
  if (!b || typeof b.x !== 'number') return {};
  const visible = screen.getAllDisplays().some(function (d) {
    const a = d.workArea;
    return b.x < a.x + a.width - 40 && b.x + b.width > a.x + 40 && b.y >= a.y - 10 && b.y < a.y + a.height - 40;
  });
  return visible ? { x: b.x, y: b.y, width: b.width, height: b.height } : {};
}

/* depois da abertura: onboarding se ainda não há pasta de dados utilizável */
function openFirstScreen() {
  if (mainWin) return;
  const dir = dataDir();
  if (isUsableDir(dir)) createMain('index.html');
  else createMain('onboarding.html', dir ? { missing: dir } : {});
  if (splashWin) splashWin.close();
}

function reloadAppWindows() {
  if (mainWin) mainWin.loadFile(path.join(SRC, 'index.html'));
  if (widgetWin) widgetWin.loadFile(path.join(SRC, 'index.html'), { query: { widget: '1' } });
}

/* ------------------------------------------------------------
   IPC — só aceita mensagens das páginas do próprio app
   ------------------------------------------------------------ */
function fromApp(event) {
  const frame = event.senderFrame;
  return !!frame && frame.url.startsWith(pathToFileURL(SRC).href);
}

ipcMain.on('storage:load', function (event) {
  event.returnValue = fromApp(event) && isUsableDir(dataDir()) ? loadDataText() : '';
});

ipcMain.on('storage:save', function (event, json) {
  if (!fromApp(event) || typeof json !== 'string' || !isUsableDir(dataDir())) return;
  try {
    JSON.parse(json);
    saveDataText(json);
  } catch (e) {
    dialog.showErrorBox('Não foi possível salvar', 'Os dados não puderam ser gravados em:\n' + dataFile() + '\n\n' + e.message);
    return;
  }
  /* avisa as outras janelas (app <-> widget) para recarregarem os dados */
  BrowserWindow.getAllWindows().forEach(function (win) {
    if (win.webContents !== event.sender) win.webContents.send('storage:changed');
  });
});

ipcMain.handle('folder:info', function (event) {
  if (!fromApp(event)) return null;
  const dir = dataDir();
  return {
    dir: dir,
    file: DATA_FILE,
    usable: isUsableDir(dir),
    suggested: suggestedDir()
  };
});

ipcMain.handle('folder:choose', async function (event) {
  if (!fromApp(event)) return null;
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Escolha a pasta dos seus dados',
    defaultPath: dataDir() || app.getPath('documents'),
    buttonLabel: 'Usar esta pasta',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const dir = result.filePaths[0];
  return { dir: dir, hasData: fs.existsSync(dataFile(dir)) };
});

/* Define a pasta de dados. Se a pasta nova já tem um arquivo de dados, ele é
   aberto (como abrir um cofre existente); senão, os dados atuais são levados para lá. */
ipcMain.handle('folder:set', function (event, dir) {
  if (!fromApp(event) || typeof dir !== 'string' || !path.isAbsolute(dir)) return { ok: false, error: 'Pasta inválida.' };
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (!isUsableDir(dir)) return { ok: false, error: 'Sem permissão para gravar nesta pasta.' };
    const previous = dataDir();
    const hadData = fs.existsSync(dataFile(dir));
    if (!hadData && isUsableDir(previous) && path.resolve(previous) !== path.resolve(dir) && fs.existsSync(dataFile(previous))) {
      fs.copyFileSync(dataFile(previous), dataFile(dir));
    }
    writeConfig({ dataDir: dir });
    return { ok: true, dir: dir, hadData: hadData };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('folder:open', function (event) {
  if (!fromApp(event) || !isUsableDir(dataDir())) return false;
  shell.openPath(dataDir());
  return true;
});

ipcMain.on('app:start', function (event) {
  if (!fromApp(event) || !isUsableDir(dataDir())) return;
  reloadAppWindows();
});

ipcMain.on('widget:open', function (event) {
  if (fromApp(event) && isUsableDir(dataDir())) createWidget();
});

ipcMain.on('widget:close', function (event) {
  if (fromApp(event) && widgetWin) widgetWin.close();
});

ipcMain.on('app:show', function (event, dateStr) {
  if (!fromApp(event)) return;
  const goTo = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
  if (!mainWin) {
    createMain('index.html', goTo ? { date: goTo } : {});
    return;
  }
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
  if (goTo) mainWin.webContents.send('app:go-to-date', goTo);
});

ipcMain.on('splash:done', function (event) {
  if (fromApp(event)) openFirstScreen();
});

/* ------------------------------------------------------------
   CICLO DE VIDA
   ------------------------------------------------------------ */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', function () {
    const win = mainWin || widgetWin || splashWin;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(function () {
    /* sem barra de menu nativa no Windows/Linux; no macOS o menu padrão é o que dá copiar/colar */
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
    createSplash();
    /* rede de segurança: se a abertura travar por algum motivo, o app abre mesmo assim */
    setTimeout(openFirstScreen, 8000);
  });

  app.on('window-all-closed', function () {
    app.quit();
  });
}
