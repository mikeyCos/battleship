import GameController from '../../containers/gameController';
import createElement from '../../helpers/createElement';

export default () => {
  const screenController = {
    game: GameController(),
    boards: { playerOne: this.game.playerOneBoard, playerTwo: this.game.playerTwoBoard },
    init() {},
    cacheDOM() {},
    bindEvents() {},
    render() {
      // Renders activePlayer's board and their opponent's board
      const gameContainer = createElement('section');
      const activePlayer = game.activePlayer;
      const activePlayerBoard = createElement('div');
      activePlayer.board.forEach((row) => {
        row.forEach((cell) => {
          console.log(cell);
        });
      });

      activePlayer.opponentBoard.forEach((row) =>
        row.forEach((cell) => {
          console.log(cell);
        }),
      );
    },
    getBoardCoordinates(e) {},
  };
};
