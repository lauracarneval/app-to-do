/* ============================================================
   CALENDÁRIO DE POÇÕES
   Tarefas por dia + cenário em pixel art. Cada dia com todas
   as tarefas concluídas fortalece a poção do mês exibido.
   ============================================================ */
(function () {
  const STORAGE_KEY = 'todo-calendar-pet-v1'; /* mesma chave de antes: as tarefas antigas continuam valendo */

  /* -------- estágios da poção (a cada 5 dias completos ela evolui) -------- */
  const DIAS_POR_NIVEL = 5;
  const TIERS = [
    { name: 'Frasco vazio',      main: '#6d7a99', light: '#aab4cc', dark: '#4a5470' },
    { name: 'Água turva',        main: '#7f9bb0', light: '#b4cbd9', dark: '#5b7587' },
    { name: 'Infusão de ervas',  main: '#4ed44a', light: '#9cf07a', dark: '#2f8f3a' },
    { name: 'Elixir cintilante', main: '#3cb4e8', light: '#8fe3ff', dark: '#2478b0' },
    { name: 'Poção arcana',      main: '#9a4ed4', light: '#c990ff', dark: '#6a2f9c' },
    { name: 'Essência rubra',    main: '#e0457a', light: '#ff8fb0', dark: '#a02a55' },
    { name: 'Elixir dourado',    main: '#f2b632', light: '#ffe27a', dark: '#b9791a' },
    { name: 'Elixir lendário',   main: '#f2b632', light: '#ffffff', dark: '#b9791a' }
  ];
  const TIER_LENDARIO = 7;

  /* -------- ícones em pixel usados no calendário -------- */
  function svgPendente(size) {
    size = size || 8;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 4 4" shape-rendering="crispEdges">' +
      '<rect x="1" y="0" width="2" height="4" fill="#ff9a3d"/><rect x="0" y="1" width="4" height="2" fill="#ff9a3d"/>' +
      '<rect x="1" y="1" width="1" height="1" fill="#ffd9a8"/></svg>';
  }
  /* col = { main, light, dark } do líquido; silhueta = frasco ainda não descoberto */
  function svgFrasco(scale, col, silhueta) {
    scale = scale || 2;
    col = col || { main: '#4ed44a', light: '#9cf07a', dark: '#2f8f3a' };
    const s = silhueta ? '#a8966a' : null;
    return '<svg width="' + (7 * scale) + '" height="' + (9 * scale) + '" viewBox="0 0 7 9" shape-rendering="crispEdges">' +
      '<rect x="2" y="0" width="3" height="1" fill="' + (s || '#c9a46b') + '"/>' +
      '<rect x="3" y="1" width="1" height="2" fill="' + (s || '#cfe8ff') + '"/>' +
      '<rect x="1" y="3" width="5" height="1" fill="' + (s || col.light) + '"/>' +
      '<rect x="0" y="4" width="7" height="4" fill="' + (s || col.main) + '"/>' +
      '<rect x="1" y="8" width="5" height="1" fill="' + (s || col.dark) + '"/>' +
      (s ? '' : '<rect x="1" y="5" width="1" height="2" fill="#ffffff" opacity="0.7"/>') + '</svg>';
  }
  const SVG_CHECK = '<svg viewBox="0 0 7 6" shape-rendering="crispEdges" fill="#4ed44a">' +
    '<rect x="0" y="2" width="1" height="2"/><rect x="1" y="3" width="1" height="2"/><rect x="2" y="4" width="1" height="2"/>' +
    '<rect x="3" y="3" width="1" height="2"/><rect x="4" y="2" width="1" height="2"/><rect x="5" y="1" width="1" height="2"/>' +
    '<rect x="6" y="0" width="1" height="2"/></svg>';

  /* ------------------------------------------------------------
     PERSISTÊNCIA
     ------------------------------------------------------------ */
  /* No app desktop os dados ficam num arquivo JSON dentro da pasta escolhida pelo
     usuário (window.desktop vem do preload do Electron). Aberto direto no navegador,
     o app continua usando o localStorage. */
  const desktop = window.desktop || null;
  const IS_WIDGET = !!desktop && new URLSearchParams(location.search).has('widget');

  function loadData() {
    try {
      const raw = desktop ? desktop.loadData() : localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.tasks = parsed.tasks || {};
      return parsed;
    } catch (e) {
      return { tasks: {} };
    }
  }

  function saveData() {
    try {
      if (desktop) desktop.saveData(JSON.stringify(data, null, 2));
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* sem armazenamento: o app segue funcionando só na memória */ }
  }

  let data = loadData();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = formatDate(today);

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseDate(str) {
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const weekdayNamesFull = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

  const monthLabel = document.getElementById('monthLabel');
  const daysGrid = document.getElementById('daysGrid');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  const selectedDateLabel = document.getElementById('selectedDateLabel');
  const taskProgress = document.getElementById('taskProgress');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');

  const potionTitle = document.getElementById('potionTitle');
  const potionName = document.getElementById('potionName');
  const potionCount = document.getElementById('potionCount');
  const potionHint = document.getElementById('potionHint');
  const daySegments = document.getElementById('daySegments');
  const sceneToast = document.getElementById('sceneToast');

  document.getElementById('legendPending').innerHTML = svgPendente(10) + ' tarefas pendentes';
  document.getElementById('legendDone').innerHTML = svgFrasco(2) + ' dia completo';

  /* ------------------------------------------------------------
     ESTADO DA POÇÃO — derivado das tarefas do mês
     ------------------------------------------------------------ */
  function dayStatus(dateStr) {
    const tasks = data.tasks[dateStr];
    if (!tasks || tasks.length === 0) return 'none';
    return tasks.every(function (t) { return t.done; }) ? 'all-done' : 'has-pending';
  }

  function potionState(year, month) {
    const total = new Date(year, month + 1, 0).getDate();
    const statuses = [];
    const doneDays = [];
    for (let d = 1; d <= total; d++) {
      const st = dayStatus(formatDate(new Date(year, month, d)));
      statuses.push(st);
      if (st === 'all-done') doneDays.push(d);
    }
    const done = doneDays.length;
    let tier;
    if (done === 0) tier = 0;
    else if (done === total) tier = TIER_LENDARIO;
    else tier = Math.min(TIER_LENDARIO - 1, Math.floor(done / DIAS_POR_NIVEL) + 1);
    return { total: total, done: done, doneDays: doneDays, statuses: statuses, tier: tier };
  }

  let potion = potionState(viewYear, viewMonth);

  function renderPotionHUD() {
    const tier = TIERS[potion.tier];
    potionTitle.textContent = 'Poção de ' + monthNames[viewMonth] + ' de ' + viewYear;
    potionName.textContent = tier.name + (potion.tier > 0 ? ' · Nv ' + potion.tier : '');
    potionName.style.color = potion.tier === 0 ? 'var(--text-dim)' : tier.light;
    potionCount.textContent = potion.done + '/' + potion.total + ' dias completos';

    daySegments.innerHTML = '';
    potion.statuses.forEach(function (st) {
      const seg = document.createElement('div');
      seg.className = 'seg' + (st === 'all-done' ? ' done' : st === 'has-pending' ? ' pending' : '');
      daySegments.appendChild(seg);
    });

    if (potion.tier === TIER_LENDARIO) {
      potionHint.textContent = 'Mês perfeito! A poção atingiu o nível máximo.';
    } else {
      const proximo = potion.tier === 0 ? 1
        : potion.tier === TIER_LENDARIO - 1 ? potion.total
        : potion.tier * DIAS_POR_NIVEL;
      const faltam = proximo - potion.done;
      potionHint.textContent = potion.tier === 0
        ? 'Complete um dia para começar a poção.'
        : (faltam === 1 ? 'Falta 1 dia' : 'Faltam ' + faltam + ' dias') + ' para evoluir: ' + TIERS[potion.tier + 1].name + '.';
    }

    canvas.setAttribute('aria-label', 'Ateliê de poções. ' + tier.name + ', ' + potion.done + ' de ' + potion.total + ' dias completos.');
  }

  /* ------------------------------------------------------------
     CALENDÁRIO
     ------------------------------------------------------------ */
  function renderCalendar() {
    monthLabel.textContent = monthNames[viewMonth] + ' ' + viewYear;
    daysGrid.innerHTML = '';

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day-cell';

      let cellDate, dayNum, isOtherMonth = false;

      if (i < startWeekday) {
        dayNum = daysInPrevMonth - startWeekday + i + 1;
        cellDate = new Date(viewYear, viewMonth - 1, dayNum);
        isOtherMonth = true;
      } else if (i >= startWeekday + daysInMonth) {
        dayNum = i - startWeekday - daysInMonth + 1;
        cellDate = new Date(viewYear, viewMonth + 1, dayNum);
        isOtherMonth = true;
      } else {
        dayNum = i - startWeekday + 1;
        cellDate = new Date(viewYear, viewMonth, dayNum);
      }

      const dateStr = formatDate(cellDate);

      const numSpan = document.createElement('span');
      numSpan.textContent = dayNum;
      cell.appendChild(numSpan);

      if (isOtherMonth) {
        cell.classList.add('other-month');
      } else {
        const status = dayStatus(dateStr);
        if (status === 'has-pending') cell.classList.add('has-pending');
        if (status === 'all-done') cell.classList.add('all-done');

        if (status !== 'none') {
          const marker = document.createElement('span');
          marker.className = 'marker';
          marker.innerHTML = status === 'has-pending' ? svgPendente(10) : svgFrasco(2);
          cell.appendChild(marker);
        }
      }

      if (cellDate.getTime() === today.getTime()) cell.classList.add('today');
      if (dateStr === selectedDate) cell.classList.add('selected');

      cell.addEventListener('click', function () {
        if (isOtherMonth) {
          viewYear = cellDate.getFullYear();
          viewMonth = cellDate.getMonth();
        }
        selectedDate = dateStr;
        renderAll();
      });

      daysGrid.appendChild(cell);
    }
  }

  /* ------------------------------------------------------------
     PAINEL DE TAREFAS DO DIA
     ------------------------------------------------------------ */
  function renderTasks() {
    const d = parseDate(selectedDate);
    const weekday = weekdayNamesFull[d.getDay()];
    selectedDateLabel.textContent = weekday + ', ' + d.getDate() + ' de ' + monthNames[d.getMonth()];

    const tasks = data.tasks[selectedDate] || [];
    const doneCount = tasks.filter(function (t) { return t.done; }).length;

    taskProgress.textContent = tasks.length === 0 ? '' : (doneCount + ' de ' + tasks.length + ' concluídas');

    taskList.innerHTML = '';

    if (tasks.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      tasks.forEach(function (task) {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.done ? ' done' : '');
        li.dataset.id = task.id;

        const checkbox = document.createElement('button');
        checkbox.type = 'button';
        checkbox.className = 'task-checkbox';
        checkbox.setAttribute('role', 'checkbox');
        checkbox.setAttribute('aria-checked', task.done ? 'true' : 'false');
        checkbox.setAttribute('aria-label', task.text);
        checkbox.innerHTML = SVG_CHECK;
        checkbox.addEventListener('click', function () { toggleTask(task.id); });

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;
        /* dois cliques editam o título; tarefa concluída não pode ser editada */
        if (!task.done) {
          text.title = 'Clique duas vezes para editar';
          text.addEventListener('dblclick', function () { startEditTask(task, text); });
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'x';
        delBtn.setAttribute('aria-label', 'Excluir tarefa: ' + task.text);
        delBtn.addEventListener('click', function () { deleteTask(task.id); });

        li.appendChild(checkbox);
        li.appendChild(text);
        li.appendChild(delBtn);
        taskList.appendChild(li);
      });
    }
  }

  function renderAll() {
    potion = potionState(viewYear, viewMonth);
    renderCalendar();
    renderTasks();
    renderPotionHUD();
    refreshPosterSprites();
    drawFrame();
  }

  /* Aplica uma mudança nas tarefas do dia selecionado e, se o dia
     acabou de ficar completo, mostra o mês dele e comemora. */
  function changeTasks(mutate) {
    const d = parseDate(selectedDate);
    const statusAntes = dayStatus(selectedDate);
    const tierAntes = potionState(d.getFullYear(), d.getMonth()).tier;

    mutate();
    saveData();

    const ficouCompleto = statusAntes !== 'all-done' && dayStatus(selectedDate) === 'all-done';
    if (ficouCompleto) {
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();
    }
    renderAll();
    if (ficouCompleto) celebrate(tierAntes);
  }

  function addTask(text) {
    changeTasks(function () {
      if (!data.tasks[selectedDate]) data.tasks[selectedDate] = [];
      data.tasks[selectedDate].push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text: text,
        done: false
      });
    });
  }

  function toggleTask(id) {
    const tasks = data.tasks[selectedDate];
    if (!tasks) return;
    const task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    changeTasks(function () { task.done = !task.done; });

    const li = Array.prototype.find.call(taskList.children, function (el) { return el.dataset.id === id; });
    if (li) {
      li.classList.add('flash');
      li.addEventListener('animationend', function () { li.classList.remove('flash'); }, { once: true });
    }
  }

  /* troca o título por um campo de texto: Enter ou clicar fora salva, Esc cancela */
  function startEditTask(task, span) {
    if (task.done) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit';
    input.maxLength = 200;
    input.value = task.text;
    input.setAttribute('aria-label', 'Editar tarefa');
    span.replaceWith(input);
    input.focus();
    input.select();

    let encerrado = false;
    function finish(salvar) {
      if (encerrado) return;
      encerrado = true;
      const novo = input.value.trim();
      if (salvar && novo && novo !== task.text) {
        changeTasks(function () { task.text = novo; });
      } else {
        renderTasks();
      }
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function deleteTask(id) {
    const tasks = data.tasks[selectedDate];
    if (!tasks) return;

    changeTasks(function () {
      data.tasks[selectedDate] = tasks.filter(function (t) { return t.id !== id; });
      if (data.tasks[selectedDate].length === 0) delete data.tasks[selectedDate];
    });
  }

  addTaskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = newTaskInput.value.trim();
    if (!text) return;
    addTask(text);
    newTaskInput.value = '';
    newTaskInput.focus();
  });

  prevMonthBtn.addEventListener('click', function () {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderAll();
  });

  nextMonthBtn.addEventListener('click', function () {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderAll();
  });

  todayBtn.addEventListener('click', function () {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    selectedDate = formatDate(today);
    renderAll();
  });

  /* ------------------------------------------------------------
     COMEMORAÇÃO: faíscas saindo do frasco + aviso no cenário
     ------------------------------------------------------------ */
  function celebrate(tierAntes) {
    const tier = TIERS[potion.tier];
    if (potion.tier > tierAntes) {
      showToast('A poção evoluiu: ' + tier.name + '!');
    } else {
      showToast('Dia completo! A poção ficou mais forte.');
    }
    const cores = [tier.light, tier.main, '#ffffff', '#ffe27a'];
    for (let i = 0; i < 34; i++) {
      sparks.push({
        x: 106, y: 24,
        vx: (Math.random() - 0.5) * 3.2,
        vy: -1 - Math.random() * 2.6,
        life: 10 + Math.floor(Math.random() * 10),
        color: cores[Math.floor(Math.random() * cores.length)]
      });
    }
  }

  function showToast(msg) {
    sceneToast.textContent = msg;
    sceneToast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      sceneToast.classList.remove('show');
    }, 3000);
  }

  /* ------------------------------------------------------------
     PERGAMINHO — aberto pelos cartazes, pelo livro e pelo bilhete
     ------------------------------------------------------------ */
  const scrollOverlay = document.getElementById('scrollOverlay');
  const scrollTitle = document.getElementById('scrollTitle');
  const scrollBody = document.getElementById('scrollBody');
  const scrollClose = document.getElementById('scrollClose');
  let scrollOpen = false;
  let scrollSource = null;

  /* -------- música do dia: título, álbum e ano, com link para ouvir -------- */
  const FF_ALBUMS = {
    ff:   ['Foo Fighters', 1995],
    tcs:  ['The Colour and the Shape', 1997],
    tnl:  ['There Is Nothing Left to Lose', 1999],
    obo:  ['One by One', 2002],
    iyh:  ['In Your Honor', 2005],
    espg: ['Echoes, Silence, Patience & Grace', 2007],
    gh:   ['Greatest Hits', 2009],
    wl:   ['Wasting Light', 2011],
    sh:   ['Sonic Highways', 2014],
    sc:   ['Saint Cecilia (EP)', 2015],
    cg:   ['Concrete and Gold', 2017],
    mam:  ['Medicine at Midnight', 2021],
    bhwa: ['But Here We Are', 2023]
  };

  /* [título, álbum] */
  const FF_SONGS = [
    ['This Is a Call', 'ff'],
    ["I'll Stick Around", 'ff'],
    ['Big Me', 'ff'],
    ['Alone + Easy Target', 'ff'],
    ['Good Grief', 'ff'],
    ['Floaty', 'ff'],
    ['For All the Cows', 'ff'],
    ['Exhausted', 'ff'],
    ['Doll', 'tcs'],
    ['Monkey Wrench', 'tcs'],
    ['Hey, Johnny Park!', 'tcs'],
    ['My Poor Brain', 'tcs'],
    ['Wind Up', 'tcs'],
    ['Up in Arms', 'tcs'],
    ['My Hero', 'tcs'],
    ['See You', 'tcs'],
    ['Enough Space', 'tcs'],
    ['February Stars', 'tcs'],
    ['Everlong', 'tcs'],
    ['Walking After You', 'tcs'],
    ['New Way Home', 'tcs'],
    ['Stacked Actors', 'tnl'],
    ['Breakout', 'tnl'],
    ['Learn to Fly', 'tnl'],
    ['Gimme Stitches', 'tnl'],
    ['Generator', 'tnl'],
    ['Aurora', 'tnl'],
    ['Live-In Skin', 'tnl'],
    ['Next Year', 'tnl'],
    ['Headwires', 'tnl'],
    ["Ain't It the Life", 'tnl'],
    ['M.I.A.', 'tnl'],
    ['All My Life', 'obo'],
    ['Low', 'obo'],
    ['Have It All', 'obo'],
    ['Times Like These', 'obo'],
    ['Disenchanted Lullaby', 'obo'],
    ['Tired of You', 'obo'],
    ['Halo', 'obo'],
    ['Lonely as You', 'obo'],
    ['Overdrive', 'obo'],
    ['Burn Away', 'obo'],
    ['Come Back', 'obo'],
    ['In Your Honor', 'iyh'],
    ['No Way Back', 'iyh'],
    ['Best of You', 'iyh'],
    ['DOA', 'iyh'],
    ['Hell', 'iyh'],
    ['The Last Song', 'iyh'],
    ['Free Me', 'iyh'],
    ['Resolve', 'iyh'],
    ['The Deepest Blues Are Black', 'iyh'],
    ['End Over End', 'iyh'],
    ['Still', 'iyh'],
    ['What If I Do?', 'iyh'],
    ['Miracle', 'iyh'],
    ['Another Round', 'iyh'],
    ['Friend of a Friend', 'iyh'],
    ['Over and Out', 'iyh'],
    ['On the Mend', 'iyh'],
    ['Virginia Moon', 'iyh'],
    ['Cold Day in the Sun', 'iyh'],
    ['Razor', 'iyh'],
    ['The Pretender', 'espg'],
    ['Let It Die', 'espg'],
    ['Erase/Replace', 'espg'],
    ['Long Road to Ruin', 'espg'],
    ['Come Alive', 'espg'],
    ['Stranger Things Have Happened', 'espg'],
    ['Cheer Up, Boys (Your Make Up Is Running)', 'espg'],
    ["Summer's End", 'espg'],
    ['Statues', 'espg'],
    ['But, Honestly', 'espg'],
    ['Home', 'espg'],
    ['Wheels', 'gh'],
    ['Word Forward', 'gh'],
    ['Bridge Burning', 'wl'],
    ['Rope', 'wl'],
    ['Dear Rosemary', 'wl'],
    ['White Limo', 'wl'],
    ['Arlandria', 'wl'],
    ['These Days', 'wl'],
    ['Back & Forth', 'wl'],
    ['A Matter of Time', 'wl'],
    ['Miss the Misery', 'wl'],
    ['I Should Have Known', 'wl'],
    ['Walk', 'wl'],
    ['Something from Nothing', 'sh'],
    ['The Feast and the Famine', 'sh'],
    ['Congregation', 'sh'],
    ['What Did I Do? / God as My Witness', 'sh'],
    ['Outside', 'sh'],
    ['In the Clear', 'sh'],
    ['Subterranean', 'sh'],
    ['I Am a River', 'sh'],
    ['Saint Cecilia', 'sc'],
    ['Run', 'cg'],
    ['Make It Right', 'cg'],
    ['The Sky Is a Neighborhood', 'cg'],
    ['La Dee Da', 'cg'],
    ['Dirty Water', 'cg'],
    ['Arrows', 'cg'],
    ['Happy Ever After (Zero Hour)', 'cg'],
    ['Sunday Rain', 'cg'],
    ['The Line', 'cg'],
    ['Concrete and Gold', 'cg'],
    ['Making a Fire', 'mam'],
    ['Shame Shame', 'mam'],
    ['Cloudspotter', 'mam'],
    ['Waiting on a War', 'mam'],
    ['Medicine at Midnight', 'mam'],
    ['No Son of Mine', 'mam'],
    ['Holding Poison', 'mam'],
    ['Chasing Birds', 'mam'],
    ['Love Dies Young', 'mam'],
    ['Rescued', 'bhwa'],
    ['Under You', 'bhwa'],
    ['Hearing Voices', 'bhwa'],
    ['But Here We Are', 'bhwa'],
    ['The Glass', 'bhwa'],
    ['Nothing at All', 'bhwa'],
    ['Show Me How', 'bhwa'],
    ['Beyond Me', 'bhwa'],
    ['The Teacher', 'bhwa'],
    ['Rest', 'bhwa']
  ];

  /* quando o repertório do Foo Fighters acaba, entram outras bandas de rock:
     [artista, título, álbum, ano] */
  const OTHER_SONGS = [
    ['Nirvana', 'Come as You Are', 'Nevermind', 1991],
    ['Them Crooked Vultures', 'New Fang', 'Them Crooked Vultures', 2009],
    ['Queens of the Stone Age', 'No One Knows', 'Songs for the Deaf', 2002],
    ['Pearl Jam', 'Alive', 'Ten', 1991],
    ['Queen', "Don't Stop Me Now", 'Jazz', 1978],
    ['Soundgarden', 'Black Hole Sun', 'Superunknown', 1994],
    ['The Beatles', 'Here Comes the Sun', 'Abbey Road', 1969],
    ['Led Zeppelin', 'Ramble On', 'Led Zeppelin II', 1969],
    ['Red Hot Chili Peppers', 'Under the Bridge', 'Blood Sugar Sex Magik', 1991],
    ['The Rolling Stones', 'Gimme Shelter', 'Let It Bleed', 1969],
    ['AC/DC', 'Back in Black', 'Back in Black', 1980],
    ['Tom Petty', "I Won't Back Down", 'Full Moon Fever', 1989],
    ['David Bowie', 'Heroes', '"Heroes"', 1977],
    ['Green Day', 'Basket Case', 'Dookie', 1994],
    ['The Smashing Pumpkins', 'Today', 'Siamese Dream', 1993],
    ['Weezer', "Say It Ain't So", 'Weezer (Blue Album)', 1994],
    ['Audioslave', 'Like a Stone', 'Audioslave', 2002],
    ['Pixies', 'Where Is My Mind?', 'Surfer Rosa', 1988],
    ['R.E.M.', 'Losing My Religion', 'Out of Time', 1991],
    ['U2', 'Beautiful Day', "All That You Can't Leave Behind", 2000],
    ['The Killers', 'Mr. Brightside', 'Hot Fuss', 2004],
    ['Arctic Monkeys', 'Do I Wanna Know?', 'AM', 2013],
    ['The Strokes', 'Last Nite', 'Is This It', 2001],
    ['Oasis', "Don't Look Back in Anger", "(What's the Story) Morning Glory?", 1995],
    ['Stone Temple Pilots', 'Interstate Love Song', 'Purple', 1994],
    ['Queens of the Stone Age', 'Go with the Flow', 'Songs for the Deaf', 2002],
    ['Pearl Jam', 'Even Flow', 'Ten', 1991],
    ['Nirvana', 'Lithium', 'Nevermind', 1991],
    ['Red Hot Chili Peppers', "Can't Stop", 'By the Way', 2002],
    ['Queen', 'Under Pressure', 'Hot Space', 1982]
  ];

  /* vídeo de cada música no canal oficial da banda no YouTube ("artista | título" -> id).
     Música sem id aqui cai na busca do YouTube. */
  const VIDEO_IDS = {
    "Foo Fighters | This Is a Call": "h-Rnr3wTX9I",
    "Foo Fighters | I'll Stick Around": "X_rTTsZZ9KE",
    "Foo Fighters | Big Me": "pLdJQFTnZfA",
    "Foo Fighters | Alone + Easy Target": "T0kV8yqiL8M",
    "Foo Fighters | Good Grief": "wUAbQEenPCs",
    "Foo Fighters | Floaty": "bLmiOuLAO3A",
    "Foo Fighters | For All the Cows": "Hyxy_KMom7g",
    "Foo Fighters | Exhausted": "Ttzjq29EgwU",
    "Foo Fighters | Doll": "0I601JImgHk",
    "Foo Fighters | Monkey Wrench": "I7rCNiiNPxA",
    "Foo Fighters | Hey, Johnny Park!": "_axQz7WCU90",
    "Foo Fighters | My Poor Brain": "C78y-Bghtcw",
    "Foo Fighters | Wind Up": "gAhv979WI9I",
    "Foo Fighters | Up in Arms": "TULQB8esDro",
    "Foo Fighters | My Hero": "EqWRaAF6_WY",
    "Foo Fighters | See You": "CRQwH76oxKY",
    "Foo Fighters | Enough Space": "6VOu-Zq1L1M",
    "Foo Fighters | February Stars": "_P0EslJ3qOA",
    "Foo Fighters | Everlong": "eBG7P-K-r1Y",
    "Foo Fighters | Walking After You": "TNwkN9vrUYY",
    "Foo Fighters | New Way Home": "IipJAYA1p4I",
    "Foo Fighters | Stacked Actors": "qj91k4Omyfo",
    "Foo Fighters | Breakout": "4eNBM17tkjI",
    "Foo Fighters | Learn to Fly": "1VQ_3sBZEm0",
    "Foo Fighters | Generator": "coatlRPYpcE",
    "Foo Fighters | Aurora": "2Psg8CaJkUQ",
    "Foo Fighters | Next Year": "j1qQuSuQaHY",
    "Foo Fighters | Headwires": "Z9lB3P8hosk",
    "Foo Fighters | Ain't It the Life": "k3b2ySkbIFQ",
    "Foo Fighters | M.I.A.": "J_sCvUSY448",
    "Foo Fighters | All My Life": "xQ04WbgI9rg",
    "Foo Fighters | Low": "ySlZdASmGCM",
    "Foo Fighters | Have It All": "5L09yCEtWi8",
    "Foo Fighters | Times Like These": "rhzmNRtIp8k",
    "Foo Fighters | Disenchanted Lullaby": "vddgYdUPfWw",
    "Foo Fighters | Tired of You": "Q_UG4lkohF0",
    "Foo Fighters | Halo": "kF7rRQOxuF8",
    "Foo Fighters | Lonely as You": "NagnivoIoYk",
    "Foo Fighters | Overdrive": "T5BM4QTyRf8",
    "Foo Fighters | Burn Away": "0ksJgUVudcg",
    "Foo Fighters | Come Back": "s9Sgvf_vlDc",
    "Foo Fighters | In Your Honor": "VDvCuHO6x-o",
    "Foo Fighters | No Way Back": "fTaOlBWcl48",
    "Foo Fighters | Best of You": "h_L4Rixya64",
    "Foo Fighters | DOA": "5mTq0QvUbv8",
    "Foo Fighters | Hell": "i4g4n4zbQz8",
    "Foo Fighters | Free Me": "OIvHhcmmNtE",
    "Foo Fighters | Resolve": "ZrRbJRTRGeM",
    "Foo Fighters | The Deepest Blues Are Black": "MQpqHver0M0",
    "Foo Fighters | End Over End": "WZAtggwsSS4",
    "Foo Fighters | Still": "6hpSVF1FaHo",
    "Foo Fighters | What If I Do?": "lTmJrBmiFzY",
    "Foo Fighters | Miracle": "cuXNGIM-It4",
    "Foo Fighters | Another Round": "RYH_MR07mwQ",
    "Foo Fighters | Friend of a Friend": "8HdnyCIe-Kk",
    "Foo Fighters | Over and Out": "-BojII3WFiw",
    "Foo Fighters | On the Mend": "Nkoq9JoUY7w",
    "Foo Fighters | Virginia Moon": "plXjq-80zb0",
    "Foo Fighters | Cold Day in the Sun": "zxjHSJpMn_I",
    "Foo Fighters | Razor": "FBnH6sBvnl0",
    "Foo Fighters | The Pretender": "SBjQ9tuuTJQ",
    "Foo Fighters | Let It Die": "cXT7DBeVxA4",
    "Foo Fighters | Erase/Replace": "zAnd5RRwOmE",
    "Foo Fighters | Long Road to Ruin": "308KpFZ4cT8",
    "Foo Fighters | Come Alive": "TBSQISK5FdY",
    "Foo Fighters | Stranger Things Have Happened": "GWaQTpv-R-c",
    "Foo Fighters | Cheer Up, Boys (Your Make Up Is Running)": "n50LrYEcqo4",
    "Foo Fighters | Summer's End": "xPNkxL3CTPU",
    "Foo Fighters | Statues": "gcKWwugvldI",
    "Foo Fighters | But, Honestly": "7DtCdO6jfG0",
    "Foo Fighters | Home": "uDhy9hNso6w",
    "Foo Fighters | Wheels": "52vvt1f3sYw",
    "Foo Fighters | Word Forward": "SQEX9Y34gG8",
    "Foo Fighters | Bridge Burning": "PbdRBLabJWU",
    "Foo Fighters | Rope": "kbpqZT_56Ns",
    "Foo Fighters | Dear Rosemary": "264oAenLETE",
    "Foo Fighters | White Limo": "ebJ2brErERQ",
    "Foo Fighters | Arlandria": "Gt3j_nm25LU",
    "Foo Fighters | These Days": "YDVAQI-4lto",
    "Foo Fighters | Back & Forth": "fnW66mnZ2lw",
    "Foo Fighters | A Matter of Time": "jKWue-pYLzM",
    "Foo Fighters | Miss the Misery": "So8pSJ9jn-c",
    "Foo Fighters | I Should Have Known": "5cn6dKy1rIc",
    "Foo Fighters | Walk": "4PkcfQtibmU",
    "Foo Fighters | Something from Nothing": "V_YlZ1JdcVk",
    "Foo Fighters | The Feast and the Famine": "c6fR_mp8gag",
    "Foo Fighters | Congregation": "AZHtZrfFuhU",
    "Foo Fighters | What Did I Do? / God as My Witness": "II2qM619h94",
    "Foo Fighters | Outside": "dV7c6ThfXvs",
    "Foo Fighters | In the Clear": "qYzY25b_uek",
    "Foo Fighters | Subterranean": "Ze5hzWWBrEY",
    "Foo Fighters | I Am a River": "9cqHAgnub_M",
    "Foo Fighters | Saint Cecilia": "XjBUBFKb5zY",
    "Foo Fighters | Run": "ifwc5xgI3QM",
    "Foo Fighters | Make It Right": "QUPfi-sFeRw",
    "Foo Fighters | The Sky Is a Neighborhood": "TRqiFPpw2fY",
    "Foo Fighters | La Dee Da": "COSQ8A8iSbw",
    "Foo Fighters | Dirty Water": "8RUHD3snV_k",
    "Foo Fighters | Arrows": "0sdplr_vY4Q",
    "Foo Fighters | Happy Ever After (Zero Hour)": "W7_M8wh2FYw",
    "Foo Fighters | Sunday Rain": "k0jX8y53ceY",
    "Foo Fighters | The Line": "8TsNkgW2ox0",
    "Foo Fighters | Concrete and Gold": "XTeDhSypRgY",
    "Foo Fighters | Making a Fire": "gfbJCzaEdps",
    "Foo Fighters | Shame Shame": "R1G6-RUz3OA",
    "Foo Fighters | Cloudspotter": "sFDGizcogb4",
    "Foo Fighters | Waiting on a War": "CJd82T1_o1A",
    "Foo Fighters | Medicine at Midnight": "PeFcpUxkYmg",
    "Foo Fighters | No Son of Mine": "xAVfdoovrIU",
    "Foo Fighters | Holding Poison": "1x9_1QC5fTY",
    "Foo Fighters | Chasing Birds": "1qYI-RtmYNI",
    "Foo Fighters | Love Dies Young": "eT_FJHM-Qhs",
    "Foo Fighters | Rescued": "j3S8wdJhgac",
    "Foo Fighters | Under You": "seok6lO1n-8",
    "Foo Fighters | Hearing Voices": "7dJTBdfY6-g",
    "Foo Fighters | But Here We Are": "qnl6sL49BcM",
    "Foo Fighters | The Glass": "RVpFu31xxWo",
    "Foo Fighters | Nothing at All": "D061lFsy5LI",
    "Foo Fighters | Show Me How": "idib1kDvPyM",
    "Foo Fighters | Beyond Me": "ixojSsgRLgc",
    "Foo Fighters | The Teacher": "6MF6trC529M",
    "Foo Fighters | Rest": "26Ofs8WrsYc",
    "Nirvana | Come as You Are": "vabnZ9-ex7o",
    "Them Crooked Vultures | New Fang": "S7_vH3H8LPI",
    "Queens of the Stone Age | No One Knows": "s88r_q7oufE",
    "Pearl Jam | Alive": "qM0zINtulhM",
    "Queen | Don't Stop Me Now": "HgzGwKwLmgM",
    "Soundgarden | Black Hole Sun": "3mbBbFH9fAg",
    "The Beatles | Here Comes the Sun": "KQetemT1sWc",
    "Led Zeppelin | Ramble On": "LzGBQerkvWs",
    "Red Hot Chili Peppers | Under the Bridge": "GLvohMXgcBo",
    "The Rolling Stones | Gimme Shelter": "3kkKiqgjOt4",
    "AC/DC | Back in Black": "pAgnJDJN4VA",
    "Tom Petty | I Won't Back Down": "nvlTJrNJ5lA",
    "David Bowie | Heroes": "lXgkuM2NhYI",
    "Green Day | Basket Case": "NUTGr5t3MoY",
    "The Smashing Pumpkins | Today": "xmUZ6nCFNoU",
    "Weezer | Say It Ain't So": "ENXvZ9YRjbo",
    "Audioslave | Like a Stone": "7QU1nvuxaMA",
    "Pixies | Where Is My Mind?": "OJ62RzJkYUo",
    "R.E.M. | Losing My Religion": "xwtdhWltSIg",
    "U2 | Beautiful Day": "co6WMzDOh1o",
    "The Killers | Mr. Brightside": "gGdGFtwCNBE",
    "Arctic Monkeys | Do I Wanna Know?": "bpOSxM0rNPM",
    "The Strokes | Last Nite": "TOypSnKFHrE",
    "Oasis | Don't Look Back in Anger": "cmpRLQZkTb8",
    "Stone Temple Pilots | Interstate Love Song": "yjJL9DGU7Gg",
    "Queens of the Stone Age | Go with the Flow": "DcHKOC64KnE",
    "Pearl Jam | Even Flow": "CxKWTzr-k6s",
    "Nirvana | Lithium": "pkcJEvMcnEg",
    "Red Hot Chili Peppers | Can't Stop": "8DyziWtkfBw",
    "Queen | Under Pressure": "a01QQZyl-_I",
    "Foo Fighters | Gimme Stitches": "A1OUAAcK2Sg",
    "Foo Fighters | Live-In Skin": "E9K4S55BBJw",
    "Foo Fighters | The Last Song": "zZJNOwg1J-w"
  };

  function songUrl(song) {
    const id = VIDEO_IDS[song.artist + ' | ' + song.title];
    return id
      ? 'https://www.youtube.com/watch?v=' + id
      : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(song.artist + ' ' + song.title + ' official');
  }

  /* fila completa: Foo Fighters embaralhado (sempre na mesma ordem), depois as outras bandas */
  const PLAYLIST = (function () {
    const ff = FF_SONGS.map(function (s) {
      return { artist: 'Foo Fighters', title: s[0], album: FF_ALBUMS[s[1]][0], year: FF_ALBUMS[s[1]][1] };
    });
    const rnd = makeRng(1995);
    for (let i = ff.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = ff[i]; ff[i] = ff[j]; ff[j] = tmp;
    }
    return ff.concat(OTHER_SONGS.map(function (s) {
      return { artist: s[0], title: s[1], album: s[2], year: s[3] };
    }));
  })();

  function songOfTheDay() {
    /* dias corridos desde 18/09/2026, em UTC para não tropeçar em horário de verão */
    const dias = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(2026, 8, 18)) / 86400000);
    const n = PLAYLIST.length;
    return PLAYLIST[((dias % n) + n) % n];
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function tierThreshold(i, total) {
    return i === 1 ? 1 : i === TIER_LENDARIO ? total : (i - 1) * DIAS_POR_NIVEL;
  }

  function buildRecipe() {
    scrollTitle.textContent = 'Receita de ' + monthNames[viewMonth];
    const list = el('ul', 'scroll-list');
    for (let i = 1; i <= TIER_LENDARIO; i++) {
      const alcancado = potion.tier >= i;
      const li = el('li', 'recipe-row' + (alcancado ? ' reached' : '') + (potion.tier === i ? ' current' : ''));
      const icon = el('span', 'row-icon');
      icon.innerHTML = svgFrasco(2, TIERS[i], !alcancado);
      const n = tierThreshold(i, potion.total);
      const quando = i === TIER_LENDARIO ? 'todos os ' + n + ' dias do mês' : n === 1 ? '1 dia' : n + ' dias';
      li.appendChild(icon);
      li.appendChild(el('span', 'row-name', alcancado ? TIERS[i].name : '???'));
      li.appendChild(el('span', 'row-detail', potion.tier === i ? quando + ' · atual' : quando));
      list.appendChild(li);
    }
    scrollBody.appendChild(list);
  }

  function goToDate(dateStr) {
    /* o widget só mostra o dia de hoje: outro dia abre no app principal */
    if (IS_WIDGET) {
      closeScroll();
      desktop.showApp(dateStr);
      return;
    }
    const d = parseDate(dateStr);
    selectedDate = dateStr;
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    closeScroll();
    renderAll();
  }

  function buildPending() {
    scrollTitle.textContent = 'Pendências';
    const hoje = formatDate(today);
    const atrasadas = [], proximas = [];
    Object.keys(data.tasks).sort().forEach(function (ds) {
      data.tasks[ds].forEach(function (t) {
        if (!t.done) (ds < hoje ? atrasadas : proximas).push({ date: ds, text: t.text });
      });
    });

    if (atrasadas.length === 0 && proximas.length === 0) {
      scrollBody.appendChild(el('p', 'scroll-note', 'Nenhuma pendência. O ateliê está em ordem!'));
      return;
    }

    function secao(titulo, itens) {
      if (itens.length === 0) return;
      scrollBody.appendChild(el('h3', 'scroll-sub', titulo));
      const list = el('ul', 'scroll-list');
      itens.slice(0, 15).forEach(function (it) {
        const d = parseDate(it.date);
        const li = el('li');
        const btn = el('button', 'pending-btn');
        btn.type = 'button';
        btn.appendChild(el('span', 'pending-date', String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')));
        btn.appendChild(el('span', 'pending-text', it.text));
        btn.addEventListener('click', function () { goToDate(it.date); });
        li.appendChild(btn);
        list.appendChild(li);
      });
      scrollBody.appendChild(list);
      if (itens.length > 15) scrollBody.appendChild(el('p', 'scroll-note', '...e mais ' + (itens.length - 15) + '.'));
    }

    secao('Próximos dias', proximas);
    secao('Atrasadas', atrasadas);
    scrollBody.appendChild(el('p', 'scroll-note', 'Toque numa tarefa para ir até o dia dela.'));
  }

  function buildAchievements() {
    scrollTitle.textContent = 'Livro de conquistas';
    const mesAtual = formatDate(today).slice(0, 7);
    const meses = {};
    Object.keys(data.tasks).forEach(function (ds) { meses[ds.slice(0, 7)] = true; });

    const linhas = Object.keys(meses).filter(function (ym) { return ym < mesAtual; }).sort().reverse()
      .map(function (ym) {
        const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1;
        return { y: y, m: m, st: potionState(y, m) };
      })
      .filter(function (r) { return r.st.done > 0; });

    const agora = potionState(today.getFullYear(), today.getMonth());
    scrollBody.appendChild(el('h3', 'scroll-sub', 'Em preparo'));
    const atual = el('ul', 'scroll-list');
    atual.appendChild(achievementRow(today.getFullYear(), today.getMonth(), agora));
    scrollBody.appendChild(atual);

    scrollBody.appendChild(el('h3', 'scroll-sub', 'Meses anteriores'));
    if (linhas.length === 0) {
      scrollBody.appendChild(el('p', 'scroll-note', 'Nenhuma poção guardada ainda. As poções de cada mês que passar aparecerão aqui.'));
      return;
    }
    const list = el('ul', 'scroll-list');
    linhas.forEach(function (r) { list.appendChild(achievementRow(r.y, r.m, r.st)); });
    scrollBody.appendChild(list);
  }

  function achievementRow(y, m, st) {
    const li = el('li', 'recipe-row reached plain');
    const icon = el('span', 'row-icon');
    icon.innerHTML = svgFrasco(2, TIERS[st.tier], st.tier === 0);
    li.appendChild(icon);
    li.appendChild(el('span', 'row-name', monthNames[m] + ' ' + y));
    li.appendChild(el('span', 'row-detail', TIERS[st.tier].name + ' · ' + st.done + (st.done === 1 ? ' dia' : ' dias')));
    return li;
  }

  function buildQuote() {
    scrollTitle.textContent = 'Música do dia';
    const song = songOfTheDay();
    scrollBody.appendChild(el('p', 'song-title', song.title));
    scrollBody.appendChild(el('p', 'song-meta', song.artist + ' · ' + song.album + ' (' + song.year + ')'));

    const link = el('a', 'song-link', 'Ouvir a música');
    link.href = songUrl(song);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    scrollBody.appendChild(link);

    scrollBody.appendChild(el('p', 'scroll-note', 'Amanhã toca outra.'));
  }

  /* pasta de dados (só no app desktop): mostra onde os dados estão e permite trocar */
  function buildFolder() {
    scrollTitle.textContent = 'Pasta de dados';
    const pathBox = el('p', 'folder-path', '...');
    const status = el('p', 'scroll-note', '');
    scrollBody.appendChild(el('p', 'scroll-note', 'Seus dados ficam só neste computador, dentro desta pasta:'));
    scrollBody.appendChild(pathBox);

    const actions = el('div', 'folder-actions');
    const openBtn = el('button', 'pending-btn', 'Abrir pasta');
    const changeBtn = el('button', 'pending-btn', 'Trocar de pasta...');
    openBtn.type = 'button';
    changeBtn.type = 'button';
    actions.appendChild(openBtn);
    actions.appendChild(changeBtn);
    scrollBody.appendChild(actions);
    scrollBody.appendChild(status);
    scrollBody.appendChild(el('p', 'scroll-note', 'Ao trocar: se a pasta nova já tiver dados do app, eles são abertos; senão, os dados atuais são copiados para lá.'));

    desktop.folderInfo().then(function (info) {
      pathBox.textContent = info.dir + ' (' + info.file + ')';
    });
    openBtn.addEventListener('click', function () { desktop.openFolder(); });
    changeBtn.addEventListener('click', function () {
      desktop.chooseFolder().then(function (picked) {
        if (!picked) return;
        desktop.setFolder(picked.dir).then(function (result) {
          if (result.ok) desktop.startApp(); /* recarrega app e widget já na pasta nova */
          else status.textContent = 'Não foi possível usar esta pasta: ' + result.error;
        });
      });
    });
  }

  function openScroll(kind) {
    scrollBody.innerHTML = '';
    scrollSource = kind;
    if (kind === 'recipe') buildRecipe();
    else if (kind === 'pending') buildPending();
    else if (kind === 'book') buildAchievements();
    else if (kind === 'folder') buildFolder();
    else buildQuote();
    scrollOverlay.hidden = false;
    scrollOpen = true;
    scrollClose.focus();
  }

  function closeScroll() {
    if (!scrollOpen) return;
    scrollOverlay.hidden = true;
    scrollOpen = false;
    if (posters[scrollSource]) returnPoster(scrollSource);
    scrollSource = null;
  }

  scrollClose.addEventListener('click', closeScroll);
  scrollOverlay.addEventListener('click', function (e) {
    if (e.target === scrollOverlay) closeScroll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeScroll();
  });

  /* ============================================================
     CENÁRIO EM PIXEL ART
     Desenhado num canvas de 192x120 e ampliado via CSS.
     O fundo fixo é desenhado uma vez; frasco, estante, velas,
     gato e partículas são redesenhados a cada quadro.
     ============================================================ */
  const SW = 192, SH = 120;
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas');
  bg.width = SW;
  bg.height = SH;

  const INK = '#14102b';
  let tick = 0;
  let bubbles = [];
  let fumes = [];
  let sparks = [];

  function R(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function makeRng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function drawBackground() {
    const c = bg.getContext('2d');
    const rnd = makeRng(7);

    /* parede de pedra */
    for (let row = 0; row < 10; row++) {
      const y = row * 8, off = row % 2 ? 8 : 0;
      for (let x = -off; x < SW; x += 16) {
        const v = rnd();
        R(c, x, y, 16, 8, v < 0.15 ? '#232c6e' : v > 0.85 ? '#3344a0' : '#2a3580');
        R(c, x, y + 1, 15, 1, '#3a4db0');
        R(c, x + 15, y, 1, 8, '#171a4d');
      }
      R(c, 0, y, SW, 1, '#171a4d');
    }

    /* piso de tábuas */
    R(c, 0, 80, SW, 40, '#3a2220');
    for (let row = 0; row < 5; row++) {
      const y = 80 + row * 8, off = (row * 23) % 40;
      R(c, 0, y, SW, 1, '#1f1218');
      R(c, 0, y + 1, SW, 1, '#4a2d27');
      for (let x = -off; x < SW; x += 40) R(c, x, y, 1, 8, '#1f1218');
    }
    R(c, 0, 78, SW, 2, '#121038');

    /* janela com lua */
    R(c, 144, 6, 36, 38, INK);
    R(c, 145, 7, 34, 36, '#5a6fc0');
    R(c, 147, 9, 30, 32, INK);
    R(c, 148, 10, 28, 30, '#0d1540');
    R(c, 148, 28, 28, 12, '#14205a');
    R(c, 165, 13, 6, 8, '#f4f0d0');
    R(c, 164, 14, 8, 6, '#f4f0d0');
    R(c, 167, 15, 2, 2, '#d8d2a8');
    R(c, 143, 43, 38, 3, '#6f86d8');
    R(c, 143, 46, 38, 1, INK);

    /* facho de luar no chão */
    for (let y = 47; y < SH; y++) {
      R(c, 146 - Math.floor((y - 47) * 0.6), y, 30, 1, 'rgba(120,160,255,0.07)');
    }

    /* marcas dos pregos dos cartazes (os cartazes são animados) */
    R(c, 73, 20, 1, 1, '#171a4d');
    R(c, 87, 14, 1, 1, '#171a4d');

    /* ervas penduradas */
    R(c, 130, 0, 1, 7, INK);
    R(c, 127, 7, 7, 2, '#5c3420');
    R(c, 125, 9, 3, 8, '#2f8f3a');
    R(c, 128, 9, 2, 10, '#1f6b2c');
    R(c, 130, 9, 3, 9, '#4ed44a');
    R(c, 133, 9, 2, 7, '#2f8f3a');
    R(c, 126, 17, 2, 3, '#4ed44a');
    R(c, 131, 18, 2, 3, '#2f8f3a');

    /* estante */
    R(c, 7, 11, 56, 70, INK);
    R(c, 8, 12, 54, 68, '#5c3420');
    R(c, 8, 12, 54, 1, '#9c6236');
    R(c, 11, 15, 48, 63, '#1c1020');
    [28, 44, 60, 76].forEach(function (y) {
      R(c, 11, y, 48, 2, '#7a4a2a');
      R(c, 11, y, 48, 1, '#9c6236');
    });
    R(c, 8, 13, 1, 67, '#7a4a2a');
    R(c, 61, 13, 1, 67, '#3d2318');
    R(c, 8, 80, 3, 2, '#3d2318');
    R(c, 59, 80, 3, 2, '#3d2318');

    /* livros em cima da estante (a caveira é animada) */
    R(c, 40, 5, 4, 6, '#8c2f4a');
    R(c, 44, 4, 3, 7, '#2f6f8c');
    R(c, 47, 6, 4, 5, '#c9a46b');
    R(c, 52, 8, 8, 3, '#4a7a3a');

    /* caixote */
    R(c, 149, 63, 36, 34, INK);
    R(c, 150, 64, 34, 32, '#5c3420');
    for (let i = 0; i < 26; i++) R(c, 153 + i, 67 + i, 2, 1, '#7a4a2a');
    R(c, 150, 64, 34, 3, '#7a4a2a');
    R(c, 150, 93, 34, 3, '#7a4a2a');
    R(c, 150, 64, 3, 32, '#7a4a2a');
    R(c, 181, 64, 3, 32, '#7a4a2a');
    R(c, 150, 64, 34, 1, '#9c6236');
    R(c, 149, 97, 36, 2, 'rgba(0,0,0,0.3)');

    /* mesa */
    R(c, 71, 75, 70, 29, INK);
    R(c, 72, 75, 68, 28, '#5c3420');
    for (let x = 83; x < 140; x += 12) R(c, x, 75, 1, 28, '#3d2318');
    R(c, 72, 75, 68, 2, '#3d2318');
    R(c, 67, 69, 78, 6, INK);
    R(c, 68, 70, 76, 4, '#7a4a2a');
    R(c, 68, 70, 76, 1, '#b07840');
    R(c, 69, 104, 74, 2, 'rgba(0,0,0,0.3)');
    /* bilhete da música do dia, com uma colcheia desenhada */
    R(c, 100, 82, 10, 11, '#e8d9a8');
    R(c, 106, 84, 1, 6, '#3d2318');
    R(c, 107, 84, 2, 1, '#3d2318');
    R(c, 108, 85, 1, 2, '#3d2318');
    R(c, 104, 89, 3, 2, '#3d2318');

    /* castiçal (as chamas são animadas) */
    R(c, 74, 67, 9, 3, '#8a8fa8');
    R(c, 74, 67, 9, 1, '#b8bdd0');
    R(c, 78, 58, 1, 9, '#8a8fa8');
    R(c, 74, 60, 9, 1, '#8a8fa8');
    R(c, 73, 54, 3, 6, '#e8e4d8');
    R(c, 81, 54, 3, 6, '#e8e4d8');
    R(c, 77, 51, 3, 7, '#e8e4d8');

    /* frasquinho na mesa (o livro de conquistas é animado) */
    R(c, 140, 62, 1, 2, '#cfe8ff');
    R(c, 139, 64, 3, 6, '#d63b5a');

    /* vinheta nas bordas */
    R(c, 0, 0, 3, SH, 'rgba(5,4,20,0.35)');
    R(c, SW - 3, 0, 3, SH, 'rgba(5,4,20,0.35)');
    R(c, 0, 0, SW, 2, 'rgba(5,4,20,0.35)');
    R(c, 0, SH - 2, SW, 2, 'rgba(5,4,20,0.35)');
  }

  /* -------- elementos animados -------- */
  const STARS = [[151, 13], [156, 19], [153, 33], [172, 31], [158, 36], [174, 12]];

  /* contadores (em quadros) das reações ao toque */
  const SKULL_RATTLE = 14, CAT_LOOK = 24, CANDLE_BLOW = 18;
  let skullT = 0, catT = 0, candleT = 0;

  /* rajada de vento: -1..1, varia devagar e embala janela e velas */
  function gust() {
    return (Math.sin(tick * 0.04) + Math.sin(tick * 0.013 + 1.3)) / 2;
  }

  /* -------- janela: nuvens, galho, folhas e riscos de vento lá fora -------- */
  const clouds = [
    { x: 150, y: 13, speed: 0.12, shape: [[2, 0, 8, 1], [0, 1, 13, 2], [3, 3, 8, 1]] },
    { x: 128, y: 20, speed: 0.17, shape: [[3, 0, 7, 1], [0, 1, 14, 2], [2, 3, 9, 1]] },
    { x: 165, y: 31, speed: 0.08, shape: [[1, 0, 6, 1], [0, 1, 10, 2]] }
  ];
  let streaks = [];
  let leaves = [];

  function stepWind() {
    const g01 = (gust() + 1) / 2;

    clouds.forEach(function (cl) {
      cl.x += cl.speed * (0.5 + g01);
      if (cl.x > 178) cl.x = 130 - Math.random() * 18;
    });

    if (Math.random() < 0.02 + g01 * 0.07) {
      streaks.push({ x: 144, y: 10 + Math.floor(Math.random() * 30), len: 3 + Math.floor(Math.random() * 4), v: 1 + Math.random() * 0.8 });
    }
    streaks.forEach(function (s) { s.x += s.v; });
    streaks = streaks.filter(function (s) { return s.x < 178; });

    if (Math.random() < 0.01 + g01 * 0.03) {
      leaves.push({ x: 146, y: 12 + Math.random() * 24, v: 0.5 + Math.random() * 0.5, ph: Math.random() * 6, color: Math.random() < 0.5 ? '#4a8a4a' : '#b07840' });
    }
    leaves.forEach(function (l) {
      l.x += l.v;
      l.ph += 0.3;
      l.y += Math.sin(l.ph) * 0.4 + 0.05;
    });
    leaves = leaves.filter(function (l) { return l.x < 178; });
  }

  function drawWindow() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(148, 10, 28, 30);
    ctx.clip();

    STARS.forEach(function (s, i) {
      const apagada = ((tick >> 2) + i * 3) % 7 === 0;
      R(ctx, s[0], s[1], 1, 1, apagada ? '#3a4a8a' : '#cfe0ff');
    });

    clouds.forEach(function (cl) {
      const cx = Math.round(cl.x);
      cl.shape.forEach(function (p, i) {
        R(ctx, cx + p[0], cl.y + p[1], p[2], p[3], i === 0 ? '#3d4f9a' : '#26346f');
      });
    });

    /* galho balançando no canto da janela */
    const s = Math.max(-2, Math.min(2, Math.round(Math.sin(tick * 0.1) * (0.7 + (gust() + 1) / 2))));
    const half = Math.round(s / 2);
    const BR = '#0a0d2a', LF = '#123a3a';
    R(ctx, 171, 34, 5, 1, BR);
    R(ctx, 167, 33 + half, 4, 1, BR);
    R(ctx, 164, 32 + s, 3, 1, BR);
    R(ctx, 168, 35 + half, 3, 1, BR);
    R(ctx, 163, 31 + s, 2, 2, LF);
    R(ctx, 169, 32 + half, 2, 1, LF);
    R(ctx, 166, 36 + half, 2, 2, LF);
    R(ctx, 173, 33, 2, 1, LF);

    streaks.forEach(function (st) {
      R(ctx, Math.round(st.x), st.y, st.len, 1, 'rgba(170,195,255,0.35)');
    });
    leaves.forEach(function (l) {
      R(ctx, Math.round(l.x), Math.round(l.y), 2, 1, l.color);
    });

    ctx.restore();

    /* travessas da janela por cima de tudo */
    R(ctx, 161, 10, 2, 30, '#3d2318');
    R(ctx, 148, 24, 28, 2, '#3d2318');
  }

  /* -------- caveira: chacoalha e bate o queixo ao toque -------- */
  function drawSkull() {
    const ativa = skullT > 0;
    const dx = ativa ? (skullT % 2 ? 1 : -1) : 0;
    const dy = ativa ? (skullT > SKULL_RATTLE - 3 ? -2 : -1) : 0;
    const jaw = ativa && skullT % 4 < 2 ? 1 : 0;
    const x = 22 + dx, y = 2 + dy;
    const olho = ativa ? '#e0457a' : INK;

    R(ctx, x + 1, y, 7, 1, '#e8e4d8');
    R(ctx, x, y + 1, 9, 6, '#e8e4d8');
    if (jaw) R(ctx, x + 2, y + 7, 5, 1, INK);
    R(ctx, x + 2, y + 7 + jaw, 5, 2, '#cfc9b8');
    R(ctx, x + 2, y + 3, 2, 2, olho);
    R(ctx, x + 6, y + 3, 2, 2, olho);
    R(ctx, x + 4, y + 6, 1, 1, INK);
    R(ctx, x + 3, y + 8 + jaw, 1, 1, INK);
    R(ctx, x + 5, y + 8 + jaw, 1, 1, INK);
  }

  /* -------- gato: de costas olhando a janela; ao toque, olha para trás -------- */
  function drawCat() {
    const virando = catT > 0 && (catT > CAT_LOOK - 2 || catT <= 2);
    const olhando = catT > 0 && !virando;
    const rabo = catT > 0 ? catT % 4 < 2 : tick % 28 < 3;

    if (rabo) {
      R(ctx, 170, 59, 6, 2, INK);
      R(ctx, 175, 56, 2, 4, INK);
    } else {
      R(ctx, 170, 59, 5, 2, INK);
      R(ctx, 174, 55, 2, 5, INK);
    }
    R(ctx, 160, 52, 10, 11, INK);
    R(ctx, 161, 53, 1, 9, '#2a2350');

    if (virando) {
      /* cabeça de perfil, no meio do giro */
      R(ctx, 160, 44, 9, 8, INK);
      R(ctx, 160, 42, 2, 2, INK);
      R(ctx, 166, 42, 2, 2, INK);
      R(ctx, 169, 48, 1, 2, INK);
      R(ctx, 166, 47, 2, 1, '#f2e04a');
      return;
    }

    R(ctx, 159, 44, 9, 8, INK);
    R(ctx, 159, 42, 2, 2, INK);
    R(ctx, 166, 42, 2, 2, INK);

    if (olhando) {
      R(ctx, 160, 43, 1, 1, '#4a3f70');
      R(ctx, 166, 43, 1, 1, '#4a3f70');
      const piscando = catT === 12 || catT === 11;
      if (!piscando) {
        R(ctx, 161, 47, 2, 1, '#f2e04a');
        R(ctx, 165, 47, 2, 1, '#f2e04a');
      }
      R(ctx, 163, 49, 2, 1, '#e08fa0');
    }
  }

  /* -------- velas: chamas dançam com o vento; ao toque, apagam e reacendem -------- */
  function drawCandles() {
    const g = gust();
    [[74, 54], [78, 51], [82, 54]].forEach(function (cd, i) {
      const cx = cd[0], ty = cd[1];

      if (candleT > 0) {
        const t = candleT;
        if (t > CANDLE_BLOW - 4) {
          /* sopro: chama deitada */
          R(ctx, cx, ty - 2, 3, 1, '#3c8ee0');
          R(ctx, cx + 2, ty - 2, 2, 1, '#5ad1ff');
        } else if (t > 4) {
          /* apagada: fiozinho de fumaça subindo */
          const sobe = CANDLE_BLOW - 4 - t;
          R(ctx, cx, ty - 1, 1, 1, '#3a2f2a');
          R(ctx, cx + (t % 2), ty - 2 - sobe, 1, 1, 'rgba(200,210,230,0.55)');
          if (sobe > 2) R(ctx, cx + ((t + 1) % 2), ty - sobe, 1, 1, 'rgba(200,210,230,0.3)');
        } else {
          /* reacendendo */
          R(ctx, cx - 1, ty - 2, 3, 2, '#3c8ee0');
          R(ctx, cx, ty - 3, 1, 2, '#e8fbff');
        }
        return;
      }

      const ft = tick >> 1; /* chamas num ritmo mais calmo que o resto */
      const tremida = (ft + i * 5) % 7 === 0 ? ((ft + i) % 2 ? 1 : -1) : 0;
      const lean = Math.max(-1, Math.min(1, Math.round(g * 1.3) + tremida));
      const h = (ft + i) % 3 === 0 ? 1 : 0;
      const pulso = (ft + i) % 4 < 2 ? 0.03 : 0;

      R(ctx, cx - 5, ty - 9, 11, 13, 'rgba(90,209,255,' + (0.05 + pulso) + ')');
      R(ctx, cx - 3, ty - 7, 7, 9, 'rgba(90,209,255,' + (0.09 + pulso) + ')');
      R(ctx, cx - 1, ty - 3, 3, 3, '#3c8ee0');
      R(ctx, cx + Math.min(0, lean), ty - 4, 1 + Math.abs(lean), 1, '#3c8ee0');
      R(ctx, cx + lean, ty - 5 - h, 1, 1 + h, '#5ad1ff');
      R(ctx, cx, ty - 2, 1, 2, '#e8fbff');
    });
  }

  /* -------- cartazes na parede: balançam com o vento. Ao toque, o grande solta
     do prego, cai planando e abre o pergaminho (ao fechar, volta num "puf");
     o pequeno só balança e abre o pergaminho na hora. -------- */
  const POSTER_FALL = 8;
  const SEALS = [
    { rows: ['rrr', 'rrr', 'rrr'], color: '#8c2f4a' },  /* selo de cera */
    { rows: ['.xx', 'x..', '.xx'], color: '#2a3580' },  /* lua */
    { rows: ['.x.', 'xxx', '.x.'], color: '#c98a1a' },  /* estrela */
    { rows: ['xxx', '.x.', 'x.x'], color: '#14102b' },  /* caveira */
    { rows: ['x.x', 'xxx', '.x.'], color: '#e0457a' }   /* coração */
  ];
  let sealIdx = 0;

  function makeSprite(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d'));
    return c;
  }

  function bigPosterSprite() {
    return makeSprite(11, 14, function (c) {
      R(c, 0, 0, 11, 14, INK);
      R(c, 1, 1, 9, 12, '#e8d9a8');
      R(c, 5, 0, 1, 2, '#8a8fa8');
      R(c, 3, 3, 5, 1, '#7a5a3a');
      R(c, 3, 5, 4, 1, '#7a5a3a');
      const seal = SEALS[sealIdx];
      seal.rows.forEach(function (row, ry) {
        for (let rx = 0; rx < 3; rx++) {
          if (row[rx] !== '.') R(c, 4 + rx, 8 + ry, 1, 1, seal.color);
        }
      });
    });
  }

  function smallPosterSprite(temPendencia) {
    return makeSprite(9, 10, function (c) {
      R(c, 0, 0, 9, 10, INK);
      R(c, 1, 1, 7, 8, '#d9c890');
      R(c, 2, 3, 5, 1, '#7a5a3a');
      R(c, 2, 5, 3, 1, '#7a5a3a');
      R(c, 2, 7, 4, 1, '#7a5a3a');
      /* alfinete vermelho quando o mês exibido tem tarefas pendentes */
      if (temPendencia) R(c, 3, 0, 3, 2, '#e0457a');
      else R(c, 4, 0, 1, 2, '#8a8fa8');
    });
  }

  const posters = {
    recipe:  { x: 68, y: 20, floorY: 104, phase: 0,   state: 'wall', t: 0, wob: 0, sprite: null },
    pending: { x: 83, y: 14, phase: 0.5, state: 'wall', t: 0, wob: 0, sprite: null }
  };

  function refreshPosterSprites() {
    posters.recipe.sprite = bigPosterSprite();
    posters.pending.sprite = smallPosterSprite(potion.statuses.indexOf('has-pending') !== -1);
  }

  /* desenha o cartaz linha a linha: as de baixo deslocam para simular a ponta levantando */
  function blitPoster(sp, x, y, lift) {
    const h = sp.height;
    for (let r = 0; r < h; r++) {
      const deBaixo = h - 1 - r;
      const sh = deBaixo < 2 ? lift : deBaixo < 4 ? Math.max(0, lift - 1) : 0;
      ctx.drawImage(sp, 0, r, sp.width, 1, x + sh, y + r, sp.width, 1);
    }
  }

  function drawPosters(caindo) {
    Object.keys(posters).forEach(function (k) {
      const p = posters[k];
      if (caindo) {
        if (p.state !== 'falling') return;
        const f = p.t / POSTER_FALL;
        const px = p.x + Math.round(Math.sin(p.t * 1.1) * 3);
        const py = Math.round(p.y + (p.floorY - p.y) * f * f);
        blitPoster(p.sprite, px, py, p.t % 2 ? 1 : 0);
      } else if (p.state === 'wall') {
        const g = gust() + Math.sin(tick * 0.05 + p.phase * 6) * 0.3;
        const lift = p.wob > 0 ? (p.wob % 2 ? 2 : 0) : g > 0.6 ? 2 : g > 0.2 ? 1 : 0;
        blitPoster(p.sprite, p.x, p.y, lift);
      }
    });
  }

  function stepPosters() {
    Object.keys(posters).forEach(function (k) {
      const p = posters[k];
      if (p.wob > 0) p.wob--;
      if (p.state === 'falling') {
        p.t++;
        if (p.t >= POSTER_FALL) {
          p.state = 'gone';
          openScroll(k);
        }
      }
    });
  }

  function dropPoster(k) {
    const p = posters[k];
    if (p.state !== 'wall' || scrollOpen) return;
    p.state = 'falling';
    p.t = 0;
  }

  function returnPoster(k) {
    const p = posters[k];
    if (p.state === 'wall') return;
    if (k === 'recipe') {
      /* a cada visita o desenho do cartaz muda */
      sealIdx = (sealIdx + 1) % SEALS.length;
      p.sprite = bigPosterSprite();
    }
    p.state = 'wall';
    p.wob = 6;
    const cores = ['#c990ff', '#ffffff', '#8fe3ff'];
    for (let i = 0; i < 14; i++) {
      sparks.push({
        x: p.x + 5, y: p.y + 6,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -0.5 - Math.random() * 1.4,
        life: 6 + Math.floor(Math.random() * 6),
        color: cores[i % cores.length]
      });
    }
  }

  /* -------- livro de conquistas em cima da mesa -------- */
  let bookT = 0;
  function drawBook() {
    const dy = bookT > 3 ? -2 : bookT > 0 ? -1 : 0;
    R(ctx, 124, 65 + dy, 14, 5, INK);
    R(ctx, 125, 66 + dy, 12, 3, '#8c2f4a');
    R(ctx, 125, 68 + dy, 12, 1, '#e8d9a8');
    R(ctx, 130, 66 + dy, 2, 1, '#f2b632');
  }

  /* -------- toque/clique nos objetos do cenário -------- */
  function hotspotAt(x, y) {
    if (x >= 19 && x <= 34 && y >= 0 && y <= 12) return 'skull';
    if (x >= 156 && x <= 178 && y >= 40 && y <= 64) return 'cat';
    if (x >= 70 && x <= 87 && y >= 43 && y <= 70) return 'candles';
    if (x >= 66 && x <= 81 && y >= 18 && y <= 36 && posters.recipe.state === 'wall') return 'recipe';
    if (x >= 81 && x <= 94 && y >= 12 && y <= 26 && posters.pending.state === 'wall') return 'pending';
    if (x >= 122 && x <= 139 && y >= 62 && y <= 71) return 'book';
    if (x >= 98 && x <= 112 && y >= 80 && y <= 95) return 'note';
    return null;
  }

  function scenePoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * SW / rect.width,
      y: (e.clientY - rect.top) * SH / rect.height
    };
  }

  canvas.addEventListener('click', function (e) {
    const p = scenePoint(e);
    const alvo = hotspotAt(p.x, p.y);
    if (alvo === 'skull') skullT = SKULL_RATTLE;
    else if (alvo === 'cat' && catT === 0) catT = CAT_LOOK;
    else if (alvo === 'candles' && candleT === 0) candleT = CANDLE_BLOW;
    else if (alvo === 'recipe') dropPoster(alvo);
    else if (alvo === 'pending') { posters.pending.wob = 8; openScroll('pending'); }
    else if (alvo === 'book') { bookT = 6; openScroll('book'); }
    else if (alvo === 'note') openScroll('note');
    if (alvo) drawFrame();
  });

  canvas.addEventListener('mousemove', function (e) {
    const p = scenePoint(e);
    canvas.style.cursor = hotspotAt(p.x, p.y) ? 'pointer' : 'default';
  });

  /* um frasquinho na estante para cada dia completo (posição = dia do mês) */
  const BOTTLE_COLORS = ['#d63b5a', '#4ed44a', '#3c8ee0', '#f2b632', '#9a4ed4', '#3cd4c0'];
  const SHELF_BOARDS = [28, 44, 60, 76];

  function drawBottle(x, b, variant, color) {
    if (variant === 0) {
      R(ctx, x + 2, b - 8, 1, 1, '#c9a46b');
      R(ctx, x + 2, b - 7, 1, 2, '#cfe8ff');
      R(ctx, x + 1, b - 5, 3, 1, color);
      R(ctx, x, b - 4, 5, 4, color);
    } else if (variant === 1) {
      R(ctx, x + 1, b - 9, 3, 1, '#c9a46b');
      R(ctx, x + 2, b - 8, 1, 2, '#cfe8ff');
      R(ctx, x + 1, b - 6, 3, 6, color);
    } else {
      R(ctx, x + 2, b - 8, 1, 1, '#c9a46b');
      R(ctx, x + 2, b - 7, 1, 3, '#cfe8ff');
      R(ctx, x + 1, b - 4, 3, 2, color);
      R(ctx, x, b - 2, 5, 2, color);
    }
    R(ctx, x + 1, b - 3, 1, 2, 'rgba(255,255,255,0.6)');
  }

  function drawShelfBottles() {
    potion.doneDays.forEach(function (d) {
      const slot = d - 1;
      drawBottle(11 + (slot % 8) * 6, SHELF_BOARDS[Math.floor(slot / 8)], d % 3, BOTTLE_COLORS[(d * 7) % BOTTLE_COLORS.length]);
    });
  }

  /* -------- o frasco grande: a poção do mês -------- */
  const FX = 106, FY = 54.5;      /* centro do bojo */
  const LIQ_BOTTOM = 68, LIQ_ROWS = 33;

  /* 0 = fora, 1 = contorno do vidro, 2 = interior */
  function flaskPart(x, y) {
    const dx = x + 0.5 - FX, dy = y + 0.5 - FY, d2 = dx * dx + dy * dy;
    if (d2 <= 169 || (x >= 103 && x <= 108 && y >= 27 && y <= 46)) return 2;
    if (d2 <= 210.25 || (x >= 102 && x <= 109 && y >= 27 && y <= 46)) return 1;
    return 0;
  }

  function liquidTop() {
    if (potion.done === 0) return LIQ_BOTTOM;
    const rows = Math.max(3, Math.round(potion.done / potion.total * LIQ_ROWS));
    return LIQ_BOTTOM - rows;
  }

  function currentColors() {
    if (potion.tier !== TIER_LENDARIO) return TIERS[potion.tier];
    /* elixir lendário: passeia pelas cores de todos os estágios */
    const t = TIERS[2 + (tick >> 2) % 5];
    return { main: t.main, light: t.light, dark: t.dark };
  }

  function drawFlask() {
    const col = currentColors();
    const top = liquidTop();

    if (potion.tier >= 3) {
      for (let y = 30; y <= 68; y++) {
        for (let x = 82; x <= 130; x++) {
          const dx = x + 0.5 - FX, dy = y + 0.5 - FY, d = Math.sqrt(dx * dx + dy * dy);
          if (d > 14.5 && (d < 18 || (d < 22 && (x + y) % 2 === 0))) R(ctx, x, y, 1, 1, hexA(col.light, 0.2));
        }
      }
    }

    for (let y = 27; y <= 69; y++) {
      for (let x = 90; x <= 122; x++) {
        const part = flaskPart(x, y);
        if (part === 1) {
          R(ctx, x, y, 1, 1, INK);
        } else if (part === 2) {
          if (y >= top) {
            R(ctx, x, y, 1, 1, y === top ? col.light : (x + 0.5 - FX > 6 ? col.dark : col.main));
          } else {
            R(ctx, x, y, 1, 1, 'rgba(190,225,255,0.16)');
          }
        }
      }
    }

    bubbles.forEach(function (b) {
      if (b.y > top && flaskPart(b.x, b.y) === 2) R(ctx, b.x, b.y, 1, 1, col.light);
    });

    /* boca e brilhos do vidro */
    R(ctx, 101, 24, 10, 3, INK);
    R(ctx, 102, 25, 8, 1, '#cfe8ff');
    R(ctx, 97, 47, 2, 5, 'rgba(255,255,255,0.55)');
    R(ctx, 99, 45, 2, 2, 'rgba(255,255,255,0.55)');
    R(ctx, 104, 30, 1, 8, 'rgba(255,255,255,0.4)');

    fumes.forEach(function (f) {
      R(ctx, Math.round(f.x), Math.round(f.y), 1, 1, hexA(col.light, Math.min(0.75, f.life / 12)));
    });
  }

  function drawSparks() {
    sparks.forEach(function (s) {
      R(ctx, Math.round(s.x), Math.round(s.y), 1, 1, s.color);
    });
  }

  function stepParticles() {
    const top = liquidTop();

    if (potion.done > 0 && Math.random() < 0.15 + potion.tier * 0.08) {
      const b = { x: 96 + Math.floor(Math.random() * 20), y: 66 };
      if (flaskPart(b.x, b.y) === 2) bubbles.push(b);
    }
    bubbles.forEach(function (b) {
      b.y -= 1;
      if (Math.random() < 0.2) b.x += Math.random() < 0.5 ? -1 : 1;
    });
    bubbles = bubbles.filter(function (b) { return b.y > top; });

    if (potion.tier >= 2 && Math.random() < 0.35) {
      fumes.push({ x: 104 + Math.random() * 4, y: 23, life: 8 + Math.random() * 8 });
    }
    fumes.forEach(function (f) {
      f.y -= 0.6;
      f.x += (Math.random() - 0.5) * 1.2;
      f.life -= 1;
    });
    fumes = fumes.filter(function (f) { return f.life > 0 && f.y > 0; });

    sparks.forEach(function (s) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.25;
      s.life -= 1;
    });
    sparks = sparks.filter(function (s) { return s.life > 0; });
  }

  function drawFrame() {
    ctx.drawImage(bg, 0, 0);
    drawWindow();
    drawPosters(false);
    drawBook();
    drawSkull();
    drawCat();
    drawCandles();
    drawShelfBottles();
    drawFlask();
    drawPosters(true);
    drawSparks();
  }

  /* ------------------------------------------------------------
     INICIALIZAÇÃO
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     APP DESKTOP — botões do cabeçalho, widget e sincronização entre janelas
     ------------------------------------------------------------ */
  function setupDesktop() {
    if (IS_WIDGET) {
      document.documentElement.classList.add('is-widget');
      const bar = el('div', 'widget-bar');
      bar.appendChild(el('span', 'widget-title', 'Poções de hoje'));
      const appBtn = el('button', 'widget-btn', 'App');
      const closeBtn = el('button', 'widget-btn', 'x');
      appBtn.type = 'button';
      closeBtn.type = 'button';
      appBtn.title = 'Abrir o app completo';
      closeBtn.setAttribute('aria-label', 'Fechar widget');
      appBtn.addEventListener('click', function () { desktop.showApp(); });
      closeBtn.addEventListener('click', function () { desktop.closeWidget(); });
      bar.appendChild(appBtn);
      bar.appendChild(closeBtn);
      document.body.insertBefore(bar, document.body.firstChild);
    } else {
      document.getElementById('appActions').hidden = false;
      document.getElementById('widgetBtn').addEventListener('click', function () { desktop.openWidget(); });
      document.getElementById('folderBtn').addEventListener('click', function () { openScroll('folder'); });

      /* aberto pelo widget já num dia específico */
      const pedido = new URLSearchParams(location.search).get('date');
      if (pedido && /^\d{4}-\d{2}-\d{2}$/.test(pedido)) {
        const d = parseDate(pedido);
        selectedDate = pedido;
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
      }
      desktop.onGoToDate(goToDate);
    }

    /* outra janela (app <-> widget) salvou: recarrega os dados do arquivo */
    desktop.onDataChanged(function () {
      data = loadData();
      renderAll();
    });
  }

  if (desktop) setupDesktop();

  drawBackground();
  renderAll();

  /* o cenário anima sempre, mesmo com "reduzir movimento" ligado no sistema:
     é um quadro pequeno e lento, e o movimento é parte da proposta */
  setInterval(function () {
    tick++;
    if (skullT > 0) skullT--;
    if (catT > 0) catT--;
    if (candleT > 0) candleT--;
    if (bookT > 0) bookT--;
    stepPosters();
    stepParticles();
    stepWind();
    drawFrame();
  }, 140);
})();
