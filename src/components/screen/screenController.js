import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';
import pubSub from '../../containers/pubSub';
import composeGame from './composeGame';
import playGame from './playGame';
import '../../styles/screenController.css';
import '../../styles/port.css';

// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
export default (mode) => {
  // Builds empty board for players to place their ships
  // mode === true => human vs human
  // mode === false => human vs computer

  const screenController = {
    mode,
    gameReady: false,
    game: GameController(mode),
    init() {
      this.boards = {
        playerOne: this.game.playerOneBoard.board,
        playerTwo: this.game.playerTwoBoard.board,
      };
      pubSub.publish('notify', 'Place ships');
      this.updateGameState(composeGame);
      this.start = this.start.bind(this);
      this.renderShip = this.renderShip.bind(this);
    },
    updateGameState(callback) {
      Object.assign(this, callback());
    },
    cacheDOM(element) {
      this.gameContainer = element;
      this.boardContainer = element.querySelector('#board_container');
      this.playerOneContainer = element.querySelector('.player_one');
      this.playerTwoContainer = element.querySelector('.player_two');
      this.playerOneBoard = element.querySelector('.player_one > .board');
      this.playerTwoBoard = element.querySelector('.player_two > .board');
      this.playerOneHeader = element.querySelector('.player_one > h4');
      this.playerTwoHeader = element.querySelector('.player_two > h4');
      this.startBtn = element.querySelector('.game_start_btn');
      this.playerOneCells = element.querySelectorAll('.player_one > .board > .cell');
      this.playerTwoCells = element.querySelectorAll('.player_two > .board > .cell');

      this.shipBox = element.querySelector('.ship_box');
    },
    bindEvents() {
      if (!this.gameReady) {
        this.dragStartHandler = this.dragStartHandler.bind(this);
        this.dragOverHandler = this.dragOverHandler.bind(this);
        this.dropHandler = this.dropHandler.bind(this);
        this.startBtn.addEventListener('click', this.start);

        console.log(this.playerOneBoard);
        this.shipBox.addEventListener('dragstart', this.dragStartHandler);
        this.playerOneBoard.addEventListener('drop', this.dropHandler);
        this.playerOneBoard.addEventListener('dragover', this.dragOverHandler);
      }
      if (this.gameReady) {
        this.updateGameState(playGame);
        this.renderAttack = this.renderAttack.bind(this);
        this.endGame = this.endGame.bind(this);
        this.renderWait = this.renderWait.bind(this);
        pubSub.subscribe('renderAttack', this.renderAttack);
        pubSub.subscribe('endGame', this.endGame);
        pubSub.subscribe('renderWait', this.renderWait);
      }
      this.boardHandler = this.boardHandler.bind(this);
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    render() {
      const gameContainer = createElement('section');
      const boardContainer = createElement('div');
      const playerOneContainer = createElement('div');
      const playerTwoContainer = createElement('div');
      const playerOneHeader = createElement('h4');
      const playerTwoHeader = createElement('h4');
      const gameStartContainer = createElement('div');
      const gameStartBtn = createElement('button');
      const gameStartBtnText = createElement('span');
      gameStartBtnText.textContent = 'Play';
      gameContainer.id = 'game_container';
      boardContainer.id = 'board_container';
      playerOneContainer.classList.add('player_one');
      playerTwoContainer.classList.add('player_two');
      playerOneHeader.textContent = 'Your grid';
      playerTwoHeader.textContent = `Opponent's grid`;
      gameStartContainer.classList.add('game_start');
      gameStartBtn.classList.add('game_start_btn');
      // Renders players' boards
      playerOneContainer.appendChild(this.renderBoard(this.boards.playerOne));
      playerTwoContainer.appendChild(this.renderBoard(this.boards.playerTwo));
      playerOneContainer.appendChild(playerOneHeader);
      playerTwoContainer.appendChild(playerTwoHeader);
      boardContainer.appendChild(playerOneContainer);
      boardContainer.appendChild(playerTwoContainer);
      gameStartBtn.appendChild(gameStartBtnText);
      gameStartContainer.appendChild(gameStartBtn);
      if (!this.gameReady) {
        playerTwoContainer.classList.add('wait');
        playerTwoContainer.appendChild(gameStartContainer);

        // Player's ports
        const playerOnePort = createElement('div');
        const playerTwoPort = createElement('div');

        playerOnePort.classList.add('port');
        playerTwoPort.classList.add('port');

        const portInstructions = createElement('div');
        portInstructions.textContent = 'Drag the ships to the grid, and then click to rotate:';

        const portLines = createElement('div');
        portLines.classList.add('port_lines');

        const portShip = createElement('div');
        portShip.classList.add('port_ship');
        const ship = createElement('div');

        portShip.style.cssText = 'width: 6em; height: 1.5em;';
        ship.style.cssText = 'width: 6em; height: 1.5em; padding-right: 3px; padding-bottom: 0px;';
        ship.setAttributes({
          class: 'ship_box',
          draggable: 'true',
          ['data-length']: 4,
          ['data-orientation']: 'h',
        });

        playerOnePort.appendChild(portInstructions);
        playerOnePort.appendChild(portLines);
        portShip.appendChild(ship);
        portLines.appendChild(portShip);
        playerOneContainer.appendChild(playerOnePort);

        // playerOneContainer
        // playerTwoContainer
      }
      gameContainer.appendChild(boardContainer);
      if (this.gameReady) this.gameContainer.replaceWith(gameContainer);
      this.cacheDOM(gameContainer);
      this.bindEvents();
      if (!this.gameReady) return gameContainer;
      // Does having this if statement matter?
    },
    renderBoard(board) {
      const playerBoard = createElement('div');
      playerBoard.classList.add('board');
      board.forEach((row, y) => {
        row.forEach((cell, x) => {
          const cellBtn = createElement('button');
          cellBtn.setAttributes({
            class: 'cell',
            ['data-x']: x + 1,
            ['data-y']: row.length - y,
          });
          // Need to show only activePlayer's ships
          // Need to hide the opponent's ships when activePlayer changes
          const cellContent = createElement('div');
          if (cell.ship) {
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = createElement('div');
            cellShip.classList.add('ship');
            cellContent.appendChild(cellShip);
          }
          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = createElement('div');
            const colMarker = createElement('div');
            if (x === 0) {
              rowMarker.setAttributes({ class: 'row_marker', textContent: `${y + 1}` });
              cellBtn.appendChild(rowMarker);
            }
            if (y === 0) {
              colMarker.setAttributes({
                class: 'col_marker',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellBtn.appendChild(colMarker);
            }
          }
          playerBoard.appendChild(cellBtn);
        });
      });
      return playerBoard;
    },
  };
  screenController.init();
  return screenController.render();
};
