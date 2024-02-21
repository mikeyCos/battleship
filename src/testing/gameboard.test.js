import Gameboard from '../containers/gameboard';

const foo = Gameboard();
describe(`Checks if gameboard object has specific public methods/properties`, () => {
  test(`Gameboard object has receiveAttack method`, () => {
    expect(foo.receiveAttack).toBeDefined();
  });

  test(`Gameboard object has board property`, () => {
    expect(foo.board).toBeDefined();
  });
});

describe(`Checks if gameboard.board is a 10x10 grid`, () => {
  test(`Gameboard has 10 rows`, () => {
    expect(foo.board.length).toBe(10);
  });

  test(`Gameboard has 10 columns`, () => {
    expect(foo.board.every((row) => row.length === 10)).toBeTruthy();
  });
});

describe(`Checks gameboard.placeShip`, () => {
  foo.placeShip([5, 3], false);
  const fooShipCoordinates = foo.board[7].slice(4, 9);
  test(`A ship of length 5 is placed at [5, 3] horizontally : foo.placeShip([5, 3])`, () => {
    expect(fooShipCoordinates.every((coordinate) => coordinate !== null)).toBeTruthy();
  });

  foo.placeShip([2, 8], true);
  const barShipCoordinates = [foo.board[2][1], foo.board[3][1], foo.board[4][1]];
  test(`A ship of length 3 is placed at [2, 8] horizontally : foo.placeShip([2, 8])`, () => {
    expect(barShipCoordinates.every((coordinate) => coordinate !== null)).toBeTruthy();
  });
});

describe(`Checks gameboard.receiveAttack`, () => {
  test(`gameboard.receiveAttack([5, 3]) will hit a ship`, () => {
    foo.receiveAttack([5, 3]);
    expect(foo.hitShots).toContainEqual([5, 3]);
  });
});
