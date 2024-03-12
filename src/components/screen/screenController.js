import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';
import '../../styles/gameInit.css';

// Trying to decide whether or not it is a good idea to create a separate module
// to control the screen after players have placed all their ships
// and after a 'start' button is clicked
export default (mode) => {
  // Builds empty board for players to place their ships
  const screenController = {
    gameReady: false,
    gamemode: mode,
    game: GameController(mode),
    init() {
      this.boards = {
        playerOne: this.game.playerOneBoard.board,
        playerTwo: this.game.playerTwoBoard.board,
      };
      console.log(this.game.playerOneBoard);
      console.log(this.game.playerTwoBoard);
      this.game.playerOneBoard.placeShip([2, 2], false);
      // this.game.playerTwoBoard.placeShip([6, 2], false);
    },
    cacheDOM(element) {
      this.boardContainer = element.querySelector('#board_container');
      this.playerOneContainer = element.querySelector('.player_one');
      this.playerTwoContainer = element.querySelector('.player_two');
      this.playerOneBoard = element.querySelector('.player_one > .board');
      this.playerTwoBoard = element.querySelector('.player_two > .board');
      this.startBtn = element.querySelector('.game_start_btn');
    },
    bindEvents() {
      this.start = this.start.bind(this);
      this.boardHandler = this.boardHandler.bind(this);
      this.startBtn.addEventListener('click', this.start);
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
      const gameStartContainer = createElement('div');
      const gameStartBtn = createElement('button');
      const gameStartBtnText = createElement('span');
      gameStartBtnText.textContent = 'Play';

      gameContainer.id = 'game_container';
      boardContainer.id = 'board_container';

      playerOneContainer.classList.add('player_one');
      playerTwoContainer.classList.add('player_two');

      if (this.game.playerOne !== this.game.activePlayer) {
        playerOneContainer.classList.add('wait');
      } else {
        playerTwoContainer.classList.add('wait');
      }

      if (!this.gameReady) {
        boardContainer.classList.add('wait');
      }
      gameStartContainer.classList.add('game_start');
      gameStartBtn.classList.add('game_start_btn');

      // Renders players' boards
      playerOneContainer.appendChild(this.renderBoard(this.boards.playerOne));
      playerTwoContainer.appendChild(this.renderBoard(this.boards.playerTwo));

      boardContainer.appendChild(playerOneContainer);
      boardContainer.appendChild(playerTwoContainer);
      gameStartBtn.appendChild(gameStartBtnText);
      gameStartContainer.appendChild(gameStartBtn);
      playerTwoContainer.appendChild(gameStartContainer);

      gameContainer.appendChild(boardContainer);
      this.cacheDOM(gameContainer);
      this.bindEvents();
      return gameContainer;
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
          console.log(cell);
          const cellSpan = createElement('span');
          cellBtn.appendChild(cellSpan);

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
      this.startBtn.removeEventListener('click', this.start);
      this.boardContainer.classList.remove('wait');
      this.gameReady = true;
      console.log(e.currentTarget);
    },
    isGameReady() {
      // Returns true if all player's ships are placed
    },
    boardHandler(e) {
      const x = parseInt(e.target.dataset.x);
      const y = parseInt(e.target.dataset.y);
      if (!isNaN(x) || !isNaN(y)) {
        if (this.gameReady) {
          // If this.gameReady is true
          // Play a round
          // How to prevent clicking own board?
          console.log(`Attacking coordinate [${x}, ${y}]`);
          this.game.playRound([x, y]);
        } else {
          // Place ship
          console.log(`Placing a ship starting at [${x}, ${y}]`);
        }
      }
    },
  };
  screenController.init();
  return screenController.render();
};
