import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';
import pubSub from '../../containers/pubSub';
import '../../styles/gameInit.css';

// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
export default (mode) => {
  // Builds empty board for players to place their ships
  const screenController = {
    gameReady: false,
    game: GameController(mode),
    init() {
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
      this.startBtn = element.querySelector('.game_start_btn');
    },
    bindEvents() {
      if (!this.gameReady) this.startBtn.addEventListener('click', this.start);
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    unbindEvents() {},
    render() {
      // For now, render game for human against computer
      // If this.gamemode === true, human vs human
      // If this.gamemode === false, human vs computer
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

      playerOneHeader.textContent = 'Player One';
      playerTwoHeader.textContent = 'Player Two';

      if (this.gameReady) {
        // Put 'wait' class on the opponent's container
        if (this.game.activePlayer !== this.game.playerOne) {
          playerOneContainer.classList.add('wait');
        } else {
          playerTwoContainer.classList.add('wait');
        }
      }

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
            class: `cell`,
            ['data-x']: x + 1,
            ['data-y']: row.length - y,
          });

          // Need to show only activePlayer's ships
          // Need to hide the opponent's ships when activePlayer changes
          const cellContent = createElement('div');
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
      console.log(element.firstChild);
    },
    renderAttack(btn, cell) {
      console.log(btn);
      console.log(cell);
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
      if (this.game.activePlayer !== this.game.playerOne) {
        // Put 'wait' class on the opponent's container
        console.log(`Player two attacks player one`);
        this.playerTwoBoard.addEventListener('click', this.boardHandler);
        this.playerOneContainer.classList.add('wait');
        this.playerTwoContainer.classList.remove('wait');
        this.playerOneBoard.removeEventListener('click', this.boardHandler);
      } else {
        console.log(`Player one attacks player two`);
        this.playerOneBoard.addEventListener('click', this.boardHandler);
        this.playerTwoContainer.classList.add('wait');
        this.playerOneContainer.classList.remove('wait');
        this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      }
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
    },
    isGameReady() {
      // Returns true if all player's ships are placed
    },
    boardHandler(e) {
      // e.stopImmediatePropagation();
      console.log(e.target);
      const btn = e.target;
      const x = parseInt(e.target.dataset.x);
      const y = parseInt(e.target.dataset.y);
      if (!isNaN(x) || !isNaN(y)) {
        if (this.gameReady) {
          // If this.gameReady is true
          // Play a round
          // How to prevent clicking own board?
          console.log(`Attacking coordinate [${x}, ${y}]`);
          this.game.playRound([x, y]);
          const cell = this.getBoardCell([x, y]);
          console.log(cell);
          // this.renderAttack(btn, cell);
          // Add a class to the button
          // console.log(this.game.playerOneBoard.board);
          // console.log(this.game.playerTwoBoard.board);
          this.renderWait();
        } else {
          // Place ship
          this.game.playerOneBoard.placeShip([2, 2], false);
          this.game.playerTwoBoard.placeShip([6, 2], false);
          // this.renderShip(btn);

          console.log(`Placing a ship starting at [${x}, ${y}]`);
        }
      }
    },
    getBoardCell([row, col]) {
      return this.game.activePlayer.opponentBoard.board[10 - col][row - 1];
    },
  };
  screenController.init();
  return screenController.render();
};

const something = () => {
  const somethingMore = {};
};
