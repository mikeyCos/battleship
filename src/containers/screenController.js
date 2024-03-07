import GameController from './gameController';

export default () => {
  const screenController = {
    game: GameController(),
    boards: { playerOne: this.game.playerOneBoard, playerTwo: this.game.playerTwoBoard },
    init() {},
    cacheDOM() {},
    bindEvents() {},
    render() {
      // Renders board
    },
    getBoardCoordinates(e) {},
  };
};
