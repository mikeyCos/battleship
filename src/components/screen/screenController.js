import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';
import pubSub from '../../containers/pubSub';
import composeGame from './composeGame';
import playGame from './playGame';
import port from '../port/port';
import board from '../board/board';
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
        // playerOne: this.game.playerOneBoard.board,
        // playerTwo: this.game.playerTwoBoard.board,
        playerOne: board('player_one', this.game.playerOneBoard.board),
        playerTwo: board('player_two', this.game.playerTwoBoard.board),
      };
      pubSub.publish('notify', 'place');
      this.updateGameState(composeGame);
      this.play = this.play.bind(this);
      this.isGameReady = this.isGameReady.bind(this);
    },
    updateGameState(callback) {
      Object.assign(this, callback());
    },
    cacheDOM(element) {
      this.gameContainer = element;
      this.boardContainer = element.querySelector('#boards_container');
      this.playerOneContainer = element.querySelector('.player_one');
      this.playerTwoContainer = element.querySelector('.player_two');
      this.playerOneBoard = element.querySelector('.player_one > .board');
      this.playerTwoBoard = element.querySelector('.player_two > .board');
      this.playerOneHeader = element.querySelector('.player_one > h4');
      this.playerTwoHeader = element.querySelector('.player_two > h4');
      this.playBtn = element.querySelector('.play_btn');
    },
    bindEvents() {
      if (!this.gameReady) {
        // if (!this.mode) {
        this.playBtn.addEventListener('click', this.play);
        pubSub.subscribe('playerReady', this.isGameReady);
        // }
      }

      if (this.gameReady) {
        this.updateGameState(playGame);
        this.renderAttack = this.renderAttack.bind(this);
        this.endGame = this.endGame.bind(this);
        this.renderWait = this.renderWait.bind(this);
        pubSub.subscribe('renderAttack', this.renderAttack);
        pubSub.subscribe('endgame', this.endGame);
        pubSub.subscribe('renderWait', this.renderWait);
        this.boardHandler = this.boardHandler.bind(this);
      }
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    },
    render() {
      const gameContainer = createElement('section');
      const boardsContainer = createElement('div');
      const playerOneContainer = createElement('div');
      const playerTwoContainer = createElement('div');
      const playerOneHeader = createElement('h4');
      const playerTwoHeader = createElement('h4');
      const gamePlayContainer = createElement('div');
      const gamePlayBtn = createElement('button');
      const gamePlayBtnText = createElement('span');
      gamePlayBtnText.textContent = 'Play';
      gameContainer.id = 'game_container';
      boardsContainer.id = 'boards_container';
      playerOneContainer.classList.add('player_one');
      playerTwoContainer.classList.add('player_two');
      playerOneHeader.textContent = `Player one's grid`;
      playerTwoHeader.textContent = `Player two's grid`;
      gamePlayContainer.classList.add('game_play');
      gamePlayBtn.classList.add('play_btn');
      // Renders players' boards
      // playerOneContainer.appendChild(board('player_one', this.boards.playerOne));
      // playerTwoContainer.appendChild(board('player_two', this.boards.playerTwo));
      playerOneContainer.appendChild(this.boards.playerOne.render());
      playerTwoContainer.appendChild(this.boards.playerTwo.render());
      playerOneContainer.appendChild(playerOneHeader);
      playerTwoContainer.appendChild(playerTwoHeader);
      boardsContainer.appendChild(playerOneContainer);
      boardsContainer.appendChild(playerTwoContainer);
      gamePlayBtn.appendChild(gamePlayBtnText);
      gamePlayContainer.appendChild(gamePlayBtn);
      if (!this.gameReady) {
        playerOneContainer.appendChild(
          port('player_one', this.game, this.mode, this.boards.playerOne),
        );
        playerTwoContainer.appendChild(
          port('player_two', this.game, this.mode, this.boards.playerTwo),
        );
        gamePlayBtn.classList.add('inactive');
        if (this.mode) {
        } else {
          playerTwoContainer.classList.add('inactive');
          playerTwoContainer.classList.add('wait');
        }
        playerTwoContainer.appendChild(gamePlayContainer);
      }

      gameContainer.appendChild(boardsContainer);
      if (this.gameReady) {
        this.gameContainer.replaceWith(gameContainer);
        boardsContainer.classList.add('busy');
      }
      this.cacheDOM(gameContainer);
      this.bindEvents();
      if (!this.gameReady) return gameContainer;
    },
  };
  screenController.init();
  return screenController.render();
};
