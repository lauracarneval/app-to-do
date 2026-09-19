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

## Widget

O botão **Widget** abre uma janelinha sempre visível com o cenário e as tarefas de hoje.
Ela fica sincronizada com o app: marcar uma tarefa num lado atualiza o outro.

## Testes

```
npm test
```

Roda o app de verdade dentro do Electron, com pastas temporárias (não toca nos seus dados):
abertura, onboarding, tarefas, edição, poção, cenário interativo, pergaminhos, widget,
troca de pasta e persistência ao reabrir.

## Gerar o instalador (Windows)

```
npm run dist
```

## Estrutura

```
main.js            processo principal: janelas, pasta de dados, gravação do arquivo
preload.js         ponte segura entre as páginas e o processo principal
src/index.html     app (o mesmo HTML serve de widget com ?widget=1)
src/app.js         calendário, tarefas, poção, cenário e pergaminhos
src/app.css
src/splash.*       abertura
src/onboarding.*   escolha da pasta de dados
src/fonts/         Press Start 2P e VT323 (licença OFL)
scripts/make-icon.js   gera build/icon.png
test/e2e.js        teste de aceite
```
