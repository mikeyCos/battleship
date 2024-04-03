import pubSub from '../../containers/pubSub';
import board from '../board/board';
import port from '../port/port';

export default (state) => ({
  offSetX: 0,
  offSetY: 0,
  init() {
    console.log('init running from composeGame');
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
    if (!this.mode) {
      // this.boards.playerTwo.placeShipsRandom();
      this.game.playerTwo.board.placeShipsRandom();
      console.log(this.game.playerTwo.board.board);
    }
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
});
