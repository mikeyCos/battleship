import Human from '../containers/human';
import Computer from '../containers/computer';

let playerOne;
let playerTwo;

beforeEach(() => {
  playerOne = new Human();
  playerTwo = new Computer();
  playerOne.opponentBoard = playerTwo.board;
  playerTwo.opponentBoard = playerOne.board;
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
  test.skip(`Tests playerOne.attack, attacks playerTwo's board`, () => {
    // playerTwo.getPlayerBoard().placeShip([3, 3], true);
    // playerOne.attack([3, 3]);
    // expect(playerTwo.getPlayerBoard().hitShots).toContainEqual([3, 3]);
  });
});
