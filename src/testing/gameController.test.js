import gameController from '../containers/gameController';
import ship from '../containers/ship';
// Not sure if I need this?

const battleship = gameController;

beforeEach(() => {
  battleship.init();
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
    const playerOne = battleship.playerOne;
    const playerTwo = battleship.playerTwo;
    if (playerOne.attack.toString() === playerTwo.attack.toString()) {
      // playerOne and playerTwo are humans
      const shipCoordinates = [
        [2, 2],
        [3, 2],
        [4, 2],
      ];
      shipCoordinates.forEach((coordinate) => {
        battleship.playerTwo.attack(coordinate);
      });
    } else {
      let i = 0;
      while (i < 100) {
        battleship.playerTwo.attack();
        i += 1;
      }
    }

    expect(battleship.playerOneBoard.board[8][1].isSunk()).toBeTruthy();
  });
});

describe(`Tests if a round can be played`, () => {
  test(`The active player should be different after the round is done`, () => {
    const initalActivePlayer = battleship.activePlayer;
    battleship.playRound([2, 2]);
    expect(battleship.activePlayer === initalActivePlayer).toBeFalsy();
  });
});
