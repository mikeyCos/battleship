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
  test(`Tests playerTwo.attack`, () => {
    let i = 0;
    while (i < 100) {
      playerTwo.attack();
      i += 1;
    }

    const flatPlayerOneBoard = playerOne.board.board.flat();
    expect(flatPlayerOneBoard.every((cell) => cell.miss === true)).toBeTruthy();
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
    expect(playerTwo.board.board[playerTwo.board.board.length - 3][3 - 1].hit).toBeTruthy();
  });

  test(`Tests if player one sinks player two's ship`, () => {
    const attackCoordinates = [
      [3, 3],
      [3, 2],
      [3, 1],
    ];
    attackCoordinates.forEach(playerOne.attack);
    expect(playerTwo.board.board[7][2].ship.isSunk()).toBeTruthy();
  });
});
