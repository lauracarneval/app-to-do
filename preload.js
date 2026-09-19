/* Ponte entre as páginas do app e o processo principal.
   As páginas não têm acesso ao Node: só enxergam o que está exposto aqui. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  /* dados do usuário (arquivo JSON na pasta escolhida) */
  loadData: function () { return ipcRenderer.sendSync('storage:load'); },
  saveData: function (json) { ipcRenderer.send('storage:save', json); },
  onDataChanged: function (callback) { ipcRenderer.on('storage:changed', function () { callback(); }); },

  /* pasta de dados */
  folderInfo: function () { return ipcRenderer.invoke('folder:info'); },
  chooseFolder: function () { return ipcRenderer.invoke('folder:choose'); },
  setFolder: function (dir) { return ipcRenderer.invoke('folder:set', dir); },
  openFolder: function () { return ipcRenderer.invoke('folder:open'); },

  /* janelas */
  openWidget: function () { ipcRenderer.send('widget:open'); },
  closeWidget: function () { ipcRenderer.send('widget:close'); },
  showApp: function (dateStr) { ipcRenderer.send('app:show', dateStr || null); },
  onGoToDate: function (callback) { ipcRenderer.on('app:go-to-date', function (e, dateStr) { callback(dateStr); }); },
  splashDone: function () { ipcRenderer.send('splash:done'); },
  startApp: function () { ipcRenderer.send('app:start'); }
});
