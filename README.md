# Calendário de Poções

To-do com calendário e um ateliê de poções em pixel art, como app desktop (Electron).
Cada dia com todas as tarefas concluídas fortalece a poção do mês.

## Offline first

- O app funciona sem internet: fontes e código vão embutidos.
- Os dados ficam **só no seu computador**, num arquivo `calendario-de-pocoes.json`
  dentro da pasta escolhida no onboarding (como um cofre do Obsidian).
- Se a pasta escolhida já tiver esse arquivo, os dados dela são abertos.
- A pasta pode ser trocada depois pelo botão **Pasta de dados**: se a pasta nova já
  tiver dados, eles são abertos; senão, os dados atuais são copiados para lá.
- A única coisa que usa internet é o botão "Ouvir a música" do bilhete, que abre o
  vídeo no navegador do sistema.

## Rodar

```
npm install
npm start
```

No npm 11 o script de instalação do Electron pode não rodar sozinho. Se `npm start`
reclamar que o Electron não está instalado: `node node_modules/electron/install.js`.

## Ampulheta (Pomodoro)

Sob a poção fica o painel da ampulheta: **Iniciar/Pausar**, **Pular**, **Zerar** e **Ajustes**.
Na parede do ateliê, a ampulheta mostra a areia descendo (dourada no foco, verde-água na pausa);
clicar nela abre os ajustes.

- Ciclo padrão: 25 min de foco, 5 de pausa curta e, a cada 4 focos, 15 de pausa longa.
  Os tempos mudam em **Ajustes**, onde também se liga ou desliga o som e a notificação do sistema.
- Quando o foco termina, a pausa começa sozinha; o foco seguinte espera você.
- Cada foco que vai até o fim é somado ao dia, no mesmo arquivo de dados das tarefas
  (`pomodoros`). **Pular** não conta como foco.
- O fim de cada fase avisa no cenário, com um aviso do sistema, um sininho 8-bit e o botão
  piscando na barra de tarefas. O tempo restante aparece no título da janela e como
  progresso no botão da barra de tarefas.
- O relógio mora no processo principal: app e widget mostram o mesmo tempo, e ele continua
  contando com o app minimizado ou só com o widget aberto. Os ajustes ficam no perfil do app.

## Widget

O botão **Widget** abre uma janelinha sempre visível com o cenário, a ampulheta e as tarefas de hoje.
Ela fica sincronizada com o app: marcar uma tarefa num lado atualiza o outro.

## Testes

```
npm test
```

Roda o app de verdade dentro do Electron, com pastas temporárias (não toca nos seus dados):
abertura, onboarding, tarefas, edição, poção, cenário interativo, pergaminhos, ampulheta, widget,
troca de pasta e persistência ao reabrir.

## Gerar o instalador (Windows)

```
npm run dist
```

## Estrutura

```
main.js            processo principal: janelas, pasta de dados, gravação do arquivo, relógio da ampulheta
preload.js         ponte segura entre as páginas e o processo principal
src/index.html     app (o mesmo HTML serve de widget com ?widget=1)
src/app.js         calendário, tarefas, poção, ampulheta, cenário e pergaminhos
src/app.css
src/splash.*       abertura
src/onboarding.*   escolha da pasta de dados
src/fonts/         Press Start 2P e VT323 (licença OFL)
scripts/make-icon.js   gera build/icon.png
test/e2e.js        teste de aceite
```
