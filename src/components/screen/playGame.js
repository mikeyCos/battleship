import pubSub from '../../containers/pubSub';

export default (state) => ({
  init() {},
  unbindEvents() {
    this.playerOneBoard.removeEventListener('click', this.boardHandler);
    this.playerTwoBoard.removeEventListener('click', this.boardHandler);
  },
  getButton([x, y]) {
    // Find button on this.game.activePlayer's board
    // for which it's dataset.x === x and dataset.y === y
    const board = [
      ...(this.game.activePlayer === this.game.playerOne
        ? this.playerTwoBoard
        : this.playerOneBoard
      ).children,
    ].flatMap((row) => [...row.children]);
    return board.find((btn) => btn.dataset.x == x && btn.dataset.y == y);
  },
  renderAttack(cell, coordinates) {
    console.log(coordinates);
    const isArray = coordinates.every((item) => Array.isArray(item));

    if (isArray) {
      coordinates.forEach((coordinate) => {
        const button = this.getButton(coordinate);
        console.log(button);
        button.classList.add('done');
      });
    } else {
      const button = this.getButton(coordinates);
      button.classList.add(cell.miss ? 'miss' : 'hit');
    }
    // const button = this.getButton(coordinates);
    // button.classList.add(cell.miss ? 'miss' : 'hit');
  },
  renderWait() {
    let player = 'one';
    if (this.game.activePlayer === this.game.playerOne) {
      // If game.activePlayer is NOT playerOne
      // Put 'wait' class on the player one's container
      this.playerOneHeader.textContent = `Your grid`;
      this.playerTwoHeader.textContent = `Opponent's grid`;
      this.playerOneContainer.classList.add('wait');
      this.playerTwoContainer.classList.remove('wait');
      this.playerOneBoard.removeEventListener('click', this.boardHandler);
      this.playerTwoBoard.addEventListener('click', this.boardHandler);
    } else {
      this.playerOneHeader.textContent = `Opponent's grid`;
      this.playerTwoHeader.textContent = `Your grid`;
      this.playerTwoContainer.classList.add('wait');
      this.playerOneContainer.classList.remove('wait');
      this.playerOneBoard.addEventListener('click', this.boardHandler);
      this.playerTwoBoard.removeEventListener('click', this.boardHandler);
      player = 'two';
    }

    pubSub.publish('notify', 'turn', player);

    if (!this.mode && this.game.activePlayer === this.game.playerTwo) {
      // Optional, put a setTimeout()
      this.game.playRound();
    }
  },
  endGame(player) {
    this.unbindEvents();
    pubSub.publish('notify', 'gameover', player);
  },
  boardHandler(e) {
    const btn = e.target.parentElement;
    const x = parseInt(btn.dataset.x);
    const y = parseInt(btn.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      const cell = this.game.activePlayer.opponentBoard.getBoardCell([x, y]);
      if (cell.miss === false || cell.hit === false) {
        this.game.playRound([x, y]);
      }
    }
  },
});
