import pipe from '../containers/pipe';
import Player from '../containers/player';
import isHuman from '../containers/isHuman';
import isComputer from '../containers/isComputer';
import GameBoard from '../containers/gameboard';

let playerOne;
let playerTwo;

beforeEach(() => {
  const playerOneBoard = GameBoard();
  const playerTwoBoard = GameBoard();
  playerOne = pipe(Player, isHuman)(playerOneBoard, playerTwoBoard);
  playerTwo = pipe(Player, isComputer)(playerTwoBoard, playerOneBoard);
  playerTwo.board.placeShip([3, 3], true);
});

describe(`Tests computer can attack any coordinate on a 10x10 grid`, () => {
  const allCoordinates = [];
  for (let i = 1; i <= 10; i += 1) {
    for (let j = 1; j <= 10; j += 1) {
      allCoordinates.push([i, j]);
    }
  }

  test(`Tests playerTwo.attack`, () => {
    const computerGeneratedCoordinates = [];
    let i = 0;
    while (i < 100) {
      const coordinate = playerTwo.attack();
      expect(allCoordinates).toContainEqual(coordinate);
      computerGeneratedCoordinates.push(coordinate);
      i += 1;
    }
  });
});

describe(`Tests human can attack computer`, () => {
  const playerTwoShipCoordinates = [
    [7, 2],
    [8, 2],
    [9, 2],
  ];
  test(`Tests playerOne.attack, hits a ship on computer's board`, () => {
    playerOne.attack([3, 3]);
    expect(playerTwo.board.hitShots).toContainEqual([3, 3]);
  });

  test(`Tests if player one sinks player two's ship`, () => {
    const attackCoordinates = [
      [3, 3],
      [3, 2],
      [3, 1],
    ];
    attackCoordinates.forEach(playerOne.attack);
    expect(playerTwo.board.board[7][2].isSunk()).toBeTruthy();
  });
});
