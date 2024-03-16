import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';
import pubSub from '../../containers/pubSub';
import '../../styles/screenController.css';

// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
export default (mode) => {
  // Builds empty board for players to place their ships
  const screenController = {
    gameReady: false,
    game: GameController(mode),
    init() {
      pubSub.publish('notify', 'Place ships');
      this.boards = {
        playerOne: this.game.playerOneBoard.board,
        playerTwo: this.game.playerTwoBoard.board,
      };

      this.start = this.start.bind(this);
      this.boardHandler = this.boardHandler.bind(this);
      this.renderShip = this.renderShip.bind(this);
      this.renderAttack = this.renderAttack.bind(this);
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
    },
    bindEvents() {
      if (!this.gameReady) this.startBtn.addEventListener('click', this.start);
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    unbindEvents() {
      this.playerOneBoard.removeEventListener('click', this.boardHandler);
      this.playerTwoBoard.removeEventListener('click', this.boardHandler);
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

      if (!this.gameReady) playerTwoContainer.classList.add('wait');
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
      if (!this.gameReady) playerTwoContainer.appendChild(gameStartContainer);
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
    renderShip(element) {
      // This will append to the content div
      console.log(element);
    },
    renderAttack(btn, cell) {
      if (cell.miss) {
        // Mark as miss
        btn.classList.add('miss');
      } else {
        // Mark as hit
        btn.classList.add('hit');
      }
      // Adds a class to the btn, miss or hit
    },
    renderWait() {
      let notificationMessage = `Player one's turn.`;
      if (this.game.activePlayer === this.game.playerOne) {
        // If game.activePlayer is NOT playerOne
        // Put 'wait' class on the player one's container
        console.log(`Player two attacks player one`);
        this.playerOneHeader.textContent = `Your grid`;
        this.playerTwoHeader.textContent = `Opponent's grid`;
        this.playerOneContainer.classList.add('wait');
        this.playerTwoContainer.classList.remove('wait');
        this.playerOneBoard.removeEventListener('click', this.boardHandler);
        this.playerTwoBoard.addEventListener('click', this.boardHandler);
      } else {
        notificationMessage = `Player two's turn.`;
        console.log(`Player one attacks player two`);
        this.playerOneHeader.textContent = `Opponent's grid`;
        this.playerTwoHeader.textContent = `Your grid`;
        this.playerTwoContainer.classList.add('wait');
        this.playerOneContainer.classList.remove('wait');
        this.playerOneBoard.addEventListener('click', this.boardHandler);
        this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      }
      pubSub.publish('notify', notificationMessage);
    },
    renderGameOver(message) {
      pubSub.publish('notify', message);
      console.log(`game is over`);
    },
    leave(e) {
      // Publish something...
      // Re-render home
    },
    reset(e) {
      // Clears board
    },
    start(e) {
      // Set this.gameReady to true
      // Publish something...?
      // Reveal player two's board
      this.boardContainer.classList.remove('wait');
      this.gameReady = true;
      this.render();
      this.renderWait();
    },
    isGameReady() {
      // Returns true if all player's ships are placed
    },
    boardHandler(e) {
      const btn = e.target;
      const x = parseInt(e.target.dataset.x);
      const y = parseInt(e.target.dataset.y);
      if (!isNaN(x) || !isNaN(y)) {
        if (this.gameReady) {
          const cell = this.game.activePlayer.opponentBoard.getBoardCell([x, y]);

          if (cell.miss === false || cell.hit === false) {
            this.game.playRound([x, y]);
            this.renderAttack(btn, cell);
            const gameStatus = this.game.getGameStatus();

            if (gameStatus.status) {
              // Game is over
              this.unbindEvents();
              this.renderGameOver(gameStatus.message);
            } else {
              this.renderWait();
            }
          }
        } else {
          // Place ship
          console.log(`Placing a ship starting at [${x}, ${y}]`);
          this.game.playerOneBoard.placeShip([2, 2], false);
          this.game.playerTwoBoard.placeShip([6, 2], false);
          this.renderShip(btn);
        }
      }
    },
  };

  screenController.init();
  return screenController.render();
};

const setUpGame = () => {
  const somethingMore = {};
};

const playGame = () => {};
