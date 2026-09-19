/* ============================================================
   TESTE DE ACEITE — roda o app de verdade dentro do Electron.
   uso: npm test            (fase 1: primeira execução, do zero)
        fase 2 roda sozinha em seguida: reabre o app e confere a persistência.
   Usa pastas temporárias: não toca nos dados reais do usuário.
   ============================================================ */
const { app, BrowserWindow, dialog, shell, session } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PHASE = Number(process.env.POCOES_E2E_PHASE || 1);
const BASE = process.env.POCOES_E2E_BASE || fs.mkdtempSync(path.join(os.tmpdir(), 'pocoes-e2e-'));
const OUT = process.env.POCOES_E2E_OUT || BASE;
const DIR_A = path.join(BASE, 'cofre A');
const DIR_B = path.join(BASE, 'cofre B');
const DATA_FILE = 'calendario-de-pocoes.json';

process.env.POCOES_USER_DATA = path.join(BASE, 'perfil');
fs.mkdirSync(DIR_A, { recursive: true });
fs.mkdirSync(DIR_B, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

/* ---------- dublês: nada de diálogos nativos nem de abrir o navegador ---------- */
let nextFolder = DIR_A;
const opened = [];
const externalRequests = [];
const consoleErrors = [];
dialog.showOpenDialog = async function () { return { canceled: false, filePaths: [nextFolder] }; };
dialog.showErrorBox = function (t, m) { consoleErrors.push('errorBox: ' + t + ' ' + m); };
shell.openExternal = async function (url) { opened.push(url); };
shell.openPath = async function (p) { opened.push('path:' + p); return ''; };

const results = [];
function check(name, ok, detail) {
  results.push({ name: name, ok: !!ok });
  console.log((ok ? 'PASSOU  ' : 'FALHOU  ') + name + (detail !== undefined ? '   [' + detail + ']' : ''));
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function waitFor(fn, label, timeout) {
  const end = Date.now() + (timeout || 15000);
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) { /* página ainda carregando */ }
    await sleep(100);
  }
  throw new Error('tempo esgotado esperando: ' + label);
}

function findWin(part) {
  return BrowserWindow.getAllWindows().find(function (w) {
    return !w.isDestroyed() && w.webContents.getURL().indexOf(part) !== -1;
  });
}

function js(win, code) { return win.webContents.executeJavaScript(code, true); }

async function shot(win, name) {
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, name + '.png'), img.toPNG());
}

function readData(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, DATA_FILE), 'utf8'));
}

/* clique num ponto do cenário, em coordenadas do canvas 192x120 */
function sceneClick(x, y) {
  return "(function(){var c=document.getElementById('scene'),r=c.getBoundingClientRect();" +
    "c.dispatchEvent(new MouseEvent('click',{clientX:r.left+" + x + "/192*r.width,clientY:r.top+" + y + "/120*r.height,bubbles:true}));})()";
}

function watch(win) {
  win.webContents.on('console-message', function (e) {
    const level = e.level, message = e.message;
    if (level === 'error' || level === 3) consoleErrors.push(message);
  });
  win.webContents.on('preload-error', function (e, p, err) { consoleErrors.push('preload: ' + err.message); });
  win.webContents.on('render-process-gone', function () { consoleErrors.push('renderer caiu'); });
}

app.on('browser-window-created', function (e, win) { watch(win); });

async function phase1() {
  /* ---------- abertura ---------- */
  const splash = await waitFor(function () { return findWin('splash.html'); }, 'janela de abertura');
  await sleep(900);
  await shot(splash, '1-abertura');
  check('abertura: aparece antes de tudo', true);
  check('abertura: janela sem moldura', !splash.isResizable());

  /* ---------- onboarding ---------- */
  const main = await waitFor(function () { return findWin('onboarding.html'); }, 'onboarding', 12000);
  check('abertura: fecha sozinha ao terminar', !findWin('splash.html'));
  await waitFor(function () { return js(main, "document.getElementById('obPath').textContent.length > 0"); }, 'pasta sugerida');
  const suggested = await js(main, "document.getElementById('obPath').textContent");
  check('onboarding: sugere uma pasta em Documentos', /Calend.rio de Po..es$/.test(suggested), suggested);
  check('onboarding: nenhum dado gravado antes da escolha', !fs.existsSync(path.join(process.env.POCOES_USER_DATA, 'config.json')));
  await js(main, "document.getElementById('obChoose').click()");
  await waitFor(function () { return js(main, "document.getElementById('obPath').textContent === " + JSON.stringify(DIR_A)); }, 'pasta escolhida');
  check('onboarding: mostra a pasta escolhida pelo usuário', true, DIR_A);
  await sleep(200);
  await shot(main, '2-onboarding');
  await js(main, "document.getElementById('obStart').click()");

  /* ---------- app principal ---------- */
  await waitFor(function () { return main.webContents.getURL().indexOf('index.html') !== -1 && js(main, "!!document.querySelector('.day-cell')"); }, 'app principal');
  const cfg = JSON.parse(fs.readFileSync(path.join(process.env.POCOES_USER_DATA, 'config.json'), 'utf8'));
  check('onboarding: pasta escolhida fica registrada', cfg.dataDir === DIR_A);
  await waitFor(function () { return js(main, "document.fonts.ready.then(function(){return true;})"); }, 'fontes');
  check('offline: fontes embutidas carregadas', await js(main, "document.fonts.check('12px \"Press Start 2P\"') && document.fonts.check('12px VT323')"));
  check('app: mês e dia de hoje selecionados', await js(main, "!!document.querySelector('.day-cell.today.selected')"));
  check('app: botões Widget e Pasta de dados visíveis', await js(main, "!document.getElementById('appActions').hidden"));

  /* tarefas: adicionar */
  await js(main, "(function(){var i=document.getElementById('newTaskInput');i.value='Colher ervas';document.getElementById('addTaskForm').requestSubmit();i.value='Moer cristais';document.getElementById('addTaskForm').requestSubmit();})()");
  check('tarefas: adicionar cria itens na lista', await js(main, "document.querySelectorAll('#taskList .task-item').length === 2"));
  check('tarefas: dia fica marcado como pendente', await js(main, "document.querySelector('.day-cell.today').classList.contains('has-pending')"));
  check('tarefas: contador "0 de 2 concluídas"', await js(main, "document.getElementById('taskProgress').textContent === '0 de 2 concluídas'"));
  await sleep(150);
  const today = await js(main, "(function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})()");
  check('dados: gravados no arquivo da pasta escolhida', readData(DIR_A).tasks[today].length === 2);
  check('dados: nada no localStorage', await js(main, "localStorage.length === 0"));

  /* editar com dois cliques */
  await js(main, "document.querySelectorAll('#taskList .task-text')[1].dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))");
  check('editar: dois cliques abrem o campo', await js(main, "!!document.querySelector('.task-edit')"));
  await js(main, "(function(){var i=document.querySelector('.task-edit');i.value='Moer cristais de lua';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()");
  await sleep(150);
  check('editar: Enter salva o novo título no arquivo', readData(DIR_A).tasks[today][1].text === 'Moer cristais de lua');

  /* concluir */
  const tierBefore = await js(main, "document.getElementById('potionName').textContent");
  await js(main, "document.querySelectorAll('#taskList .task-checkbox')[0].click()");
  check('concluir: item riscado, dia ainda pendente', await js(main, "document.querySelectorAll('#taskList .task-item.done').length === 1 && document.querySelector('.day-cell.today').classList.contains('has-pending')"));
  await js(main, "document.querySelectorAll('#taskList .task-text')[0].dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))");
  check('editar: tarefa concluída não abre edição', await js(main, "!document.querySelector('.task-edit')"));
  await js(main, "document.querySelectorAll('#taskList .task-checkbox')[1].click()");
  check('dia completo: célula fica verde com frasquinho', await js(main, "document.querySelector('.day-cell.today').classList.contains('all-done') && !!document.querySelector('.day-cell.today .marker svg')"));
  check('dia completo: aviso no cenário', await js(main, "document.getElementById('sceneToast').classList.contains('show')"), await js(main, "document.getElementById('sceneToast').textContent"));
  check('dia completo: poção evolui de "Frasco vazio"', tierBefore === 'Frasco vazio' && /gua turva/.test(await js(main, "document.getElementById('potionName').textContent")));
  check('dia completo: barra de gomos mostra 1 dia feito', await js(main, "document.querySelectorAll('#daySegments .seg.done').length === 1"));
  await sleep(300);
  await shot(main, '3-app');

  /* desmarcar faz a poção descer; marcar de novo */
  await js(main, "document.querySelectorAll('#taskList .task-checkbox')[1].click()");
  check('desmarcar: poção volta para "Frasco vazio"', await js(main, "document.getElementById('potionName').textContent === 'Frasco vazio'"));
  await js(main, "document.querySelectorAll('#taskList .task-checkbox')[1].click()");

  /* calendário */
  const mesAntes = await js(main, "document.getElementById('monthLabel').textContent");
  await js(main, "document.getElementById('nextMonth').click()");
  check('calendário: próximo mês muda o rótulo e a poção', await js(main, "document.getElementById('monthLabel').textContent !== " + JSON.stringify(mesAntes) + " && document.getElementById('potionName').textContent === 'Frasco vazio'"));
  await js(main, "document.getElementById('todayBtn').click()");
  check('calendário: botão Hoje volta ao mês atual', await js(main, "document.getElementById('monthLabel').textContent === " + JSON.stringify(mesAntes)));

  /* cenário interativo */
  await js(main, sceneClick(27, 6));
  await js(main, sceneClick(165, 50));
  await js(main, sceneClick(78, 55));
  await sleep(500);
  check('cenário: caveira, gato e velas reagem sem erro', consoleErrors.length === 0, consoleErrors.join(' | '));

  /* bilhete: música do dia abre no navegador do sistema, não numa janela do app */
  await js(main, sceneClick(105, 87));
  check('bilhete: abre "Música do dia"', await js(main, "document.getElementById('scrollTitle').textContent === 'Música do dia' && !document.getElementById('scrollOverlay').hidden"));
  const janelasAntes = BrowserWindow.getAllWindows().length;
  await js(main, "document.querySelector('.song-link').click()");
  await sleep(400);
  check('bilhete: link vai direto ao vídeo, no navegador do sistema', opened.length === 1 && /^https:\/\/www\.youtube\.com\/watch\?v=/.test(opened[0]) && BrowserWindow.getAllWindows().length === janelasAntes, opened[0]);
  await js(main, "document.getElementById('scrollClose').click()");

  /* livro e cartazes */
  await js(main, sceneClick(130, 67));
  check('livro: abre "Livro de conquistas"', await js(main, "document.getElementById('scrollTitle').textContent === 'Livro de conquistas'"));
  await js(main, "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  check('pergaminho: Esc fecha', await js(main, "document.getElementById('scrollOverlay').hidden"));
  await js(main, sceneClick(87, 19));
  check('cartaz pequeno: abre "Pendências" na hora', await js(main, "document.getElementById('scrollTitle').textContent === 'Pendências' && !document.getElementById('scrollOverlay').hidden"));
  await js(main, "document.getElementById('scrollClose').click()");
  await js(main, sceneClick(73, 27));
  check('cartaz grande: cai antes de abrir (pergaminho ainda fechado)', await js(main, "document.getElementById('scrollOverlay').hidden"));
  await waitFor(function () { return js(main, "!document.getElementById('scrollOverlay').hidden"); }, 'receita abrir', 4000);
  check('cartaz grande: abre a receita sem a descrição removida', await js(main, "/^Receita de /.test(document.getElementById('scrollTitle').textContent) && document.querySelectorAll('.recipe-row').length === 7 && document.getElementById('scrollBody').textContent.indexOf('Cada dia completo') === -1"));
  await js(main, "document.getElementById('scrollClose').click()");

  /* ---------- widget ---------- */
  await js(main, "document.getElementById('widgetBtn').click()");
  const widget = await waitFor(function () { return findWin('widget=1'); }, 'janela do widget');
  await waitFor(function () { return js(widget, "document.querySelectorAll('#taskList .task-item').length === 2"); }, 'tarefas no widget');
  check('widget: abre a partir do app', true);
  check('widget: sempre visível e fora da barra de tarefas', widget.isAlwaysOnTop());
  check('widget: mostra cenário e tarefas de hoje, sem calendário', await js(widget, "document.documentElement.classList.contains('is-widget') && getComputedStyle(document.querySelector('.calendar-panel')).display === 'none' && !!document.getElementById('scene') && !!document.querySelector('.widget-bar')"));
  await js(main, "document.getElementById('widgetBtn').click()");
  await sleep(300);
  check('widget: clicar de novo não duplica a janela', BrowserWindow.getAllWindows().filter(function (w) { return w.webContents.getURL().indexOf('widget=1') !== -1; }).length === 1);

  /* sincronização nos dois sentidos */
  await js(widget, "document.querySelectorAll('#taskList .task-checkbox')[0].click()");
  await waitFor(function () { return js(main, "document.querySelectorAll('#taskList .task-item.done').length === 1"); }, 'app refletir o widget', 4000);
  check('widget -> app: desmarcar no widget atualiza o app', await js(main, "document.querySelector('.day-cell.today').classList.contains('has-pending')"));
  await js(main, "document.querySelectorAll('#taskList .task-checkbox')[0].click()");
  await waitFor(function () { return js(widget, "document.querySelectorAll('#taskList .task-item.done').length === 2"); }, 'widget refletir o app', 4000);
  check('app -> widget: marcar no app atualiza o widget', true);
  await sleep(400);
  await shot(widget, '4-widget');

  /* ---------- trocar a pasta de dados ---------- */
  nextFolder = DIR_B;
  await js(main, "document.getElementById('folderBtn').click()");
  await waitFor(function () { return js(main, "document.querySelector('.folder-path').textContent.indexOf('cofre A') !== -1"); }, 'pasta atual no pergaminho');
  check('pasta de dados: pergaminho mostra a pasta atual', true);
  await shot(main, '5-pasta');
  await js(main, "document.querySelectorAll('.folder-actions .pending-btn')[0].click()");
  await sleep(200);
  check('pasta de dados: "Abrir pasta" abre a pasta no sistema', opened.indexOf('path:' + DIR_A) !== -1);
  await js(main, "document.querySelectorAll('.folder-actions .pending-btn')[1].click()");
  await waitFor(function () { return fs.existsSync(path.join(DIR_B, DATA_FILE)); }, 'dados copiados para a pasta nova');
  await waitFor(function () { return js(main, "document.getElementById('scrollOverlay').hidden && document.querySelectorAll('#taskList .task-item').length === 2"); }, 'app recarregar na pasta nova');
  check('trocar pasta: dados copiados e app recarregado', readData(DIR_B).tasks[today].length === 2);
  await js(main, "(function(){var i=document.getElementById('newTaskInput');i.value='Engarrafar o elixir';document.getElementById('addTaskForm').requestSubmit();})()");
  await sleep(200);
  check('trocar pasta: novas gravações vão só para a pasta nova', readData(DIR_B).tasks[today].length === 3 && readData(DIR_A).tasks[today].length === 2);

  check('offline: nenhuma requisição de rede feita pelo app', externalRequests.length === 0, externalRequests.join(' | '));
  check('sem erros no console durante todo o uso', consoleErrors.length === 0, consoleErrors.join(' | '));
}

async function phase2() {
  /* reabrindo o app: sem onboarding, direto com os dados de antes */
  await waitFor(function () { return findWin('splash.html'); }, 'janela de abertura');
  const main = await waitFor(function () { return findWin('index.html'); }, 'app principal', 12000);
  await waitFor(function () { return js(main, "document.querySelectorAll('#taskList .task-item').length > 0"); }, 'tarefas carregadas');
  check('reabrir: pula o onboarding', !findWin('onboarding.html'));
  check('reabrir: as 3 tarefas continuam lá', await js(main, "document.querySelectorAll('#taskList .task-item').length === 3"));
  check('reabrir: título editado persistiu', await js(main, "document.querySelectorAll('#taskList .task-text')[1].textContent === 'Moer cristais de lua'"));
  check('reabrir: poção e calendário refletem os dados', await js(main, "document.querySelector('.day-cell.today').classList.contains('has-pending') && document.querySelectorAll('#taskList .task-item.done').length === 2"));
  check('sem erros no console', consoleErrors.length === 0, consoleErrors.join(' | '));
}

app.whenReady().then(function () {
  session.defaultSession.webRequest.onBeforeRequest(function (details, cb) {
    if (!/^(file|devtools|chrome-extension|data|blob):/.test(details.url)) externalRequests.push(details.url);
    cb({});
  });
});

require('../main.js');

app.whenReady().then(async function () {
  let failed = false;
  try {
    await (PHASE === 1 ? phase1() : phase2());
  } catch (e) {
    failed = true;
    console.log('FALHOU  erro no roteiro: ' + e.message);
    const w = BrowserWindow.getAllWindows()[0];
    if (w) await shot(w, 'erro-fase' + PHASE).catch(function () {});
  }
  const bad = results.filter(function (r) { return !r.ok; }).length + (failed ? 1 : 0);
  console.log('--- fase ' + PHASE + ': ' + results.filter(function (r) { return r.ok; }).length + ' passaram, ' + bad + ' falharam');

  BrowserWindow.getAllWindows().forEach(function (w) { w.destroy(); });

  let code = bad ? 1 : 0;
  if (PHASE === 1 && !bad) {
    /* fase 2 num processo novo, com o mesmo perfil e as mesmas pastas */
    app.releaseSingleInstanceLock();
    const r = spawnSync(process.execPath, [__filename], {
      env: Object.assign({}, process.env, { POCOES_E2E_PHASE: '2', POCOES_E2E_BASE: BASE, POCOES_E2E_OUT: OUT }),
      stdio: 'inherit'
    });
    code = r.status || 0;
  }
  if (PHASE === 1) console.log('capturas de tela em: ' + OUT);
  app.exit(code);
});
