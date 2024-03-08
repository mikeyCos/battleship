import { create } from '@iconfu/svg-inject';
import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';

export default (mode) => {
  // Builds empty board for players to place their ships
  const gameInit = {
    game: GameController(mode),
    init() {},
    cacheDOM() {},
    bindEvents() {},
    render() {
      const boardContainer = createElement('div');
      boardContainer.id = 'boardContainer';

      this.game.playerOne.board.board.forEach((row) => {
        row.forEach((cell) => {
          console.log('hi');
        });
      });
      return boardContainer;
    },
    leave(e) {
      // Publish something...
      // Re-render home
    },
    reset(e) {
      // Clears board
    },
    start(e) {
      // Start button
      // Publish something...
    },
  };
  return gameInit.render();
};
