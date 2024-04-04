export default (state) => ({
  playersReady: [],
  init() {
    console.log('init running from composeGame');
  },
  foo(playerReady) {
    const isPlayerReady = this.playersReady.some((player) => player === playerReady);
    if (!isPlayerReady) {
      this.playersReady.push(playerReady);
    } else {
      const index = this.playersReady.indexOf(isPlayerReady);
      this.playersReady.splice(index, 1);
    }
    console.log(this.playersReady);
    if (this.playersReady.length === 2 && this.startBtn.classList.contains('inactive')) {
      this.startBtn.classList.remove('inactive');
    } else {
      this.startBtn.classList.add('inactive');
    }
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
    if (!this.mode) {
      this.game.playerTwo.board.placeShipsRandom();
    }
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
});
