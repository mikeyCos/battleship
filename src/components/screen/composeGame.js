export default (state) => ({
  playersReady: [],
  init() {
    console.log('init running from composeGame');
  },
  isGameReady(player, isReady) {
    if (this.mode) {
      //   // If human vs human
      //   const index = this.playersReady.indexOf(player);
      //   if (player && isReady !== undefined) {
      //     if (isReady) {
      //       this.playersReady.push(player);
      //     } else {
      //       this.playersReady.splice(index, 1);
      //     }
      //   } else if (index > -1) {
      //     this.playersReady.splice(index, 1);
      //   }
      //   if (this.playersReady.length === 2 && this.playBtn.classList.contains('inactive')) {
      //     this.playBtn.classList.remove('inactive');
      //   } else {
      //     this.playBtn.classList.add('inactive');
      //   }
      const index = this.playersReady.indexOf(player);
      if (isReady) {
        if (index === -1) this.playersReady.push(player);
      } else if (index !== -1) {
        console.log(this.playersReady);
        this.playersReady.splice(index, 1);
      }

      if (this.playersReady.length === 2) {
        this.playBtn.classList.remove('inactive');
      } else {
        this.playBtn.classList.add('inactive');
      }
      console.log(player);
      console.log(isReady);
      console.log(this.playersReady);
    } else {
      //   // If human vs computer
      if (isReady === undefined) {
        if (this.playerTwoContainer.classList.contains('inactive')) {
          console.log(this.playerTwoContainer);
          this.playerTwoContainer.classList.remove('inactive');
        }
      } else {
        console.log(this.playerTwoContainer);
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
