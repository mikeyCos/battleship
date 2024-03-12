import GameController from '../containers/gameController';

let battleship;

beforeEach(() => {
  battleship = GameController();
  battleship.playerOneBoard.placeShip([2, 2], false);
  battleship.playerTwoBoard.placeShip([6, 2], false);
});

const playerOneShipCoordinates = [
  [8, 1],
  [8, 2],
  [8, 3],
];
//
const playerTwoShipCoordinates = [
  [8, 5],
  [8, 6],
  [8, 7],
];

describe(`Tests if gameController.playRound works`, () => {
  test(`Tests if player one can place ships`, () => {
    expect(
      playerOneShipCoordinates.every(
        ([x, y]) => battleship.playerOne.board.board[x][y].ship !== null,
      ),
    ).toBeTruthy();
  });

  test(`Tests if player two can place ships`, () => {
    expect(
      playerTwoShipCoordinates.every(
        ([x, y]) => battleship.playerTwo.board.board[x][y].ship !== null,
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
      shipCoordinates.forEach(battleship.playerTwo.attack);
    } else {
      let i = 0;
      while (i < 100) {
        battleship.playerTwo.attack();
        i += 1;
      }
    }

    expect(battleship.playerOne.board.board[8][1].ship.isSunk()).toBeTruthy();
  });
});

describe(`Tests if a round can be played`, () => {
  test(`The active player should be different after the round is done`, () => {
    const initalActivePlayer = battleship.activePlayer;
    battleship.playRound([2, 2]);
    // Is this a good way to compare objects?
    expect(battleship.activePlayer === initalActivePlayer).toBeFalsy();
  });
});

describe(`Tests if a game is over or not`, () => {
  test(`Player one attacks once, game is not over`, () => {
    battleship.playRound([2, 2]);
    expect(battleship.getGameStatus()).toBeFalsy();
  });

  test(`All of player two ships are sunk, game over`, () => {
    const playerOne = battleship.playerOne;
    const shipCoordinates = [
      [6, 2],
      [7, 2],
      [8, 2],
    ];
    const dummyCoordinates = [
      [2, 1],
      [2, 1],
      [2, 1],
    ];

    while (!battleship.getGameStatus()) {
      if (battleship.activePlayer === playerOne) {
        battleship.playRound(shipCoordinates.shift());
      } else {
        battleship.playRound(dummyCoordinates.shift());
      }
    }
    // shipCoordinates.forEach(battleship.playerOne.attack);
    expect(battleship.getGameStatus()).toBeTruthy();
  });
});
