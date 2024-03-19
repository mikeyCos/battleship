import pubSub from '../../containers/pubSub';
import composeGame from './composeGame';

export default (state) => ({
  unbindEvents() {
    this.playerOneBoard.removeEventListener('click', this.boardHandler);
    this.playerTwoBoard.removeEventListener('click', this.boardHandler);
  },
  renderAttack(cell, coordinate) {
    // Find button on this.game.activePlayer's board
    // for which it's dataset.x === x and dataset.y === y

    console.log(cell);
    console.log(coordinate);

    if (this.game.activePlayer === this.game.playerOne) {
      console.log(this.playerTwoBoard);
      console.log(this.playerTwoBoard.children);
    } else {
      console.log(this.playerOneBoard);
      console.log(this.playerOneBoard.children);
    }
    // if (cell.miss) {
    //   // Mark as miss
    //   btn.classList.add('miss');
    // } else {
    //   // Mark as hit
    //   btn.classList.add('hit');
    // }
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
      console.log(`Player one attacks player two`);
      this.playerOneHeader.textContent = `Opponent's grid`;
      this.playerTwoHeader.textContent = `Your grid`;
      this.playerTwoContainer.classList.add('wait');
      this.playerOneContainer.classList.remove('wait');
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      notificationMessage = `Player two's turn.`;
    }

    pubSub.publish('notify', notificationMessage);
  },
  renderGameOver(message) {
    pubSub.publish('notify', message);
    console.log(`game is over`);
  },
  boardHandler(e) {
    const btn = e.target;
    const x = parseInt(btn.dataset.x);
    const y = parseInt(btn.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      const cell = this.game.activePlayer.opponentBoard.getBoardCell([x, y]);
      if (cell.miss === false || cell.hit === false) {
        this.game.playRound([x, y]);
        // this.renderAttack(btn, cell);
        const gameStatus = this.game.getGameStatus();
        if (gameStatus.status) {
          // Game is over
          this.unbindEvents();
          this.renderGameOver(gameStatus.message);
        } else {
          this.renderWait();
        }
      }
    }
  },
});
