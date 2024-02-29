import gameController from '../containers/gameController';
import ship from '../containers/ship';
// Not sure if I need this?

const battleship = gameController;

beforeEach(() => {
  battleship.init();
  battleship.playerOne.board.placeShip([2, 2], false);
  battleship.playerTwo.board.placeShip([6, 2], false);
});

const playerOneShipCoordinates = [
  [8, 1],
  [8, 2],
  [8, 3],
];

const playerTwoShipCoordinates = [
  [8, 5],
  [8, 6],
  [8, 7],
];

describe(`Tests if gameController.playRound works`, () => {
  test(`Tests if player one can place ships`, () => {
    expect(
      playerOneShipCoordinates.every(
        ([x, y]) => battleship.playerOne.board.board[x][y] !== undefined,
      ),
    ).toBeTruthy();
  });

  test(`Tests if player two can place ships`, () => {
    expect(
      playerTwoShipCoordinates.every(
        ([x, y]) => battleship.playerTwo.board.board[x][y] !== undefined,
      ),
    ).toBeTruthy();
  });
});

describe(`Tests if players can attack one another`, () => {
  test(`Player two attacks and sinks player one's ship`, () => {
    const shipCoordinates = [
      [2, 2],
      [3, 2],
      [4, 2],
    ];
    shipCoordinates.forEach(battleship.playerTwo.attack);
    expect(battleship.playerOne.board.board[8][1].isSunk()).toBeTruthy();
  });
});
