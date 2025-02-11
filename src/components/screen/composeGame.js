export default (state) => ({
  playersReady: [],
  init() {
    console.log('init running from composeGame');
  },
  isGameReady(player, isReady) {
    if (this.mode) {
      // If human vs human
      const index = this.playersReady.indexOf(player);
      if (isReady) {
        if (index === -1) this.playersReady.push(player);
      } else if (index !== -1) {
        this.playersReady.splice(index, 1);
      }

      this.playBtn.classList.toggle('inactive', this.playersReady.length !== 2);
    } else {
      // If human vs computer
      if (isReady === undefined) {
        if (this.playerTwoContainer.classList.contains('inactive')) {
          this.playerTwoContainer.classList.remove('inactive');
        }
      } else {
        this.playerTwoContainer.classList.add('inactive');
      }
    }
  },
  play(e) {
    if (!this.mode) {
      this.game.playerTwo.board.placeShipsRandom('two');
    }
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
});
