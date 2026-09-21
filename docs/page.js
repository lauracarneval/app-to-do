/* Landing page: estágios da poção e botão de download do sistema do visitante */
(function () {
  const RELEASE = 'https://github.com/lauracarneval/app-to-do/releases/latest/download/';
  const DOWNLOADS = {
    windows: { label: 'Baixar para Windows', file: 'Calendario-de-Pocoes-Windows-Setup.exe' },
    mac: { label: 'Baixar para macOS', file: 'Calendario-de-Pocoes-macOS.dmg' },
    linux: { label: 'Baixar para Ubuntu', file: 'calendario-de-pocoes-ubuntu.deb' }
  };

  /* mesmos estágios e cores do app (src/app.js) */
  const TIERS = [
    { name: 'Água turva', when: '1º dia completo', main: '#7f9bb0', light: '#b4cbd9', dark: '#5b7587' },
    { name: 'Infusão de ervas', when: '5 dias', main: '#4ed44a', light: '#9cf07a', dark: '#2f8f3a' },
    { name: 'Elixir cintilante', when: '10 dias', main: '#3cb4e8', light: '#8fe3ff', dark: '#2478b0' },
    { name: 'Poção arcana', when: '15 dias', main: '#9a4ed4', light: '#c990ff', dark: '#6a2f9c' },
    { name: 'Essência rubra', when: '20 dias', main: '#e0457a', light: '#ff8fb0', dark: '#a02a55' },
    { name: 'Elixir dourado', when: '25 dias', main: '#f2b632', light: '#ffe27a', dark: '#b9791a' },
    { name: 'Elixir lendário', when: 'o mês inteiro', main: '#f2b632', light: '#ffffff', dark: '#b9791a', lendario: true }
  ];

  function frasco(col) {
    return '<svg width="35" height="45" viewBox="0 0 7 9" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="2" y="0" width="3" height="1" fill="#c9a46b"/>' +
      '<rect x="3" y="1" width="1" height="2" fill="#cfe8ff"/>' +
      '<rect x="1" y="3" width="5" height="1" fill="' + col.light + '"/>' +
      '<rect x="0" y="4" width="7" height="4" fill="' + col.main + '"/>' +
      '<rect x="1" y="8" width="5" height="1" fill="' + col.dark + '"/>' +
      '<rect x="1" y="5" width="1" height="2" fill="#ffffff" opacity="0.7"/></svg>';
  }

  const list = document.getElementById('tiers');
  TIERS.forEach(function (t) {
    const li = document.createElement('li');
    if (t.lendario) li.className = 'lendario';
    li.innerHTML = frasco(t);
    const text = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = t.name;
    const when = document.createElement('small');
    when.textContent = t.when;
    text.appendChild(name);
    text.appendChild(when);
    li.appendChild(text);
    list.appendChild(li);
  });

  /* sistema do visitante: o botão principal já baixa o instalador certo */
  function detectOS() {
    const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
    if (/android|iphone|ipad|ipod/i.test(ua)) return null;
    if (/win/i.test(ua)) return 'windows';
    if (/mac/i.test(ua)) return 'mac';
    if (/linux|x11|ubuntu/i.test(ua)) return 'linux';
    return null;
  }

  const os = detectOS();
  if (!os) return;
  const main = document.getElementById('mainDownload');
  main.textContent = DOWNLOADS[os].label;
  main.href = RELEASE + DOWNLOADS[os].file;
  const alt = document.getElementById('altDownloads');
  alt.textContent = 'Também para ';
  Object.keys(DOWNLOADS).filter(function (k) { return k !== os; }).forEach(function (k, i) {
    if (i) alt.appendChild(document.createTextNode(' e '));
    const a = document.createElement('a');
    a.href = RELEASE + DOWNLOADS[k].file;
    a.textContent = DOWNLOADS[k].label.replace('Baixar para ', '');
    alt.appendChild(a);
  });
  const card = document.querySelector('.dl[data-os="' + os + '"]');
  if (card) card.classList.add('is-yours');
})();
