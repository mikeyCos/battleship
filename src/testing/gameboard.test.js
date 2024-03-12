import Gameboard from '../containers/gameboard';

// const gameboard = Gameboard();
let gameboard;

beforeEach(() => {
  gameboard = Gameboard();
  gameboard.placeShip([5, 3], false);
  gameboard.placeShip([2, 8], true);

  gameboard.receiveAttack([5, 3]);
  gameboard.receiveAttack([6, 3]);

  gameboard.receiveAttack([2, 8]);
  gameboard.receiveAttack([2, 7]);
});

describe(`Tests if gameboard.board is a 10x10 grid`, () => {
  test(`Gameboard has 10 rows`, () => {
    expect(gameboard.board.length).toBe(10);
  });

  test(`Gameboard has 10 columns`, () => {
    expect(gameboard.board.every((row) => row.length === 10)).toBeTruthy();
  });
});

describe(`Tests gameboard.placeShip`, () => {
  test(`A ship of length 3 is placed at [5, 3] horizontally: gameboard.placeShip([5, 3])`, () => {
    const shipCoordinates_00 = [
      gameboard.board[7][4],
      gameboard.board[7][5],
      gameboard.board[7][6],
    ];
    expect(shipCoordinates_00.every((cell) => cell.ship !== null)).toBeTruthy();
  });

  test(`A ship of length 3 is placed at [2, 8] horizontally: gameboard.placeShip([2, 8])`, () => {
    const shipCoordinates_01 = [
      gameboard.board[2][1],
      gameboard.board[3][1],
      gameboard.board[4][1],
    ];
    expect(shipCoordinates_01.every((cell) => cell.ship !== null)).toBeTruthy();
  });

  test(`There is already a ship at [5, 3] horizontally: gameboard.placeShip([5, 3])`, () => {
    expect(() => gameboard.placeShip([5, 3], false)).toThrow(Error);
  });

  test(`There must be at least 1 empty coordinate between ships`, () => {
    expect(() => gameboard.placeShip([5, 2], false)).toThrow(Error);
  });

  test(`There must be at least 1 empty coordinate between ships`, () => {
    expect(() => gameboard.placeShip([4, 4], false)).toThrow(Error);
  });

  test(`There must be at least 1 empty coordinate between ships`, () => {
    expect(() => gameboard.placeShip([3, 2], false)).toThrow(Error);
  });
});

describe(`Tests gameboard.receiveAttack`, () => {
  test(`gameboard.receiveAttack([5, 3]) will hit a ship`, () => {
    expect(gameboard.board[gameboard.board.length - 3][5 - 1].hit).toBeTruthy();
  });

  test(`gameboard.receiveAttack([6, 3]) will hit a ship`, () => {
    expect(gameboard.board[gameboard.board.length - 3][6 - 1].hit).toBeTruthy();
  });

  test(`gameboard.receiveAttack([2, 7]) will hit a ship`, () => {
    expect(gameboard.board[gameboard.board.length - 7][2 - 1].hit).toBeTruthy();
  });

  test(`gameboard.receiveAttack([2, 8]) will hit a ship`, () => {
    expect(gameboard.board[gameboard.board.length - 8][2 - 1].hit).toBeTruthy();
  });

  test(`gameboard.receiveAttack([1, 1]) will miss a ship`, () => {
    gameboard.receiveAttack([1, 1]);
    expect(gameboard.board[gameboard.board.length - 1][1 - 1].miss).toBeTruthy();
  });

  test(`gameboard.receiveAttack([10, 3]) will miss a ship`, () => {
    gameboard.receiveAttack([10, 3]);
    expect(gameboard.board[gameboard.board.length - 3][10 - 1].miss).toBeTruthy();
  });
});

describe(`Tests ship.isSunk`, () => {
  test(`Tests if ship at [5, 3] to [8, 3] is sunk`, () => {
    expect(gameboard.board[7][4].ship.isSunk()).toBeFalsy();
  });

  test(`Tests if ship at [5, 3] to [8, 3] is sunk`, () => {
    gameboard.receiveAttack([7, 3]);
    expect(gameboard.board[7][4].ship.isSunk()).toBeTruthy();
  });

  test(`Tests if ship at [2, 8] to [2, 6] is sunk`, () => {
    expect(gameboard.board[2][1].ship.isSunk()).toBeFalsy();
  });
});

describe(`Tests gameboard.getStatus`, () => {
  test(`Not all ships on the board have been sunk, gameboard.getStatus() should return false`, () => {
    expect(gameboard.getStatus()).toBeFalsy();
  });

  test(`All ships on the board have been sunk, gameboard.getStatus() should return true`, () => {
    gameboard.receiveAttack([7, 3]);
    gameboard.receiveAttack([2, 6]);
    expect(gameboard.getStatus()).toBeTruthy();
  });
});
