/* ============================================================
   ONBOARDING — escolha da pasta onde os dados ficam guardados.
   Começa com uma pasta sugerida em Documentos; o usuário pode
   trocar por qualquer outra (nova ou já existente).
   ============================================================ */
(function () {
  const desktop = window.desktop;
  const pathLabel = document.getElementById('obPath');
  const foundLabel = document.getElementById('obFound');
  const errorLabel = document.getElementById('obError');
  const missingLabel = document.getElementById('obMissing');
  const chooseBtn = document.getElementById('obChoose');
  const startBtn = document.getElementById('obStart');

  let chosenDir = null;

  function showDir(dir, hasData) {
    chosenDir = dir;
    pathLabel.textContent = dir;
    foundLabel.textContent = hasData ? 'Esta pasta já tem dados: eles serão abertos.' : '';
  }

  function showError(msg) {
    errorLabel.textContent = msg;
    errorLabel.hidden = !msg;
  }

  /* a pasta configurada antes sumiu (HD externo desconectado, pasta movida...) */
  const missing = new URLSearchParams(location.search).get('missing');
  if (missing) {
    missingLabel.textContent = 'A pasta de dados usada antes não foi encontrada: ' + missing;
    missingLabel.hidden = false;
  }

  desktop.folderInfo().then(function (info) {
    document.getElementById('obFile').textContent = info.file;
    showDir(info.suggested, false);
  });

  chooseBtn.addEventListener('click', function () {
    showError('');
    desktop.chooseFolder().then(function (picked) {
      if (picked) showDir(picked.dir, picked.hasData);
    });
  });

  startBtn.addEventListener('click', function () {
    if (!chosenDir) return;
    showError('');
    startBtn.disabled = true;
    desktop.setFolder(chosenDir).then(function (result) {
      if (result.ok) {
        desktop.startApp();
      } else {
        startBtn.disabled = false;
        showError('Não foi possível usar esta pasta: ' + result.error);
      }
    });
  });
})();
