import Ship from '../containers/ship';

export default () => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.

  // 10 x 10 grid
  const board = new Array(10).fill().map(() => new Array(10).fill().map(() => null));
  /*
  [
        1     2     3     4     5     6     7     8     9     10
  10  [null, null, null, null, null, null, null, null, null, null], 0
  09  [null, null, null, null, null, null, null, null, null, null], 1
  08  [null, null, null, null, null, null, null, null, null, null], 2
  07  [null, null, null, null, null, null, null, null, null, null], 3
  06  [null, null, null, null, null, null, null, null, null, null], 4
  05  [null, null, null, null, null, null, null, null, null, null], 5
  04  [null, null, null, null, null, null, null, null, null, null], 6
  03  [null, null, null, null, null, null, null, null, null, null], 7
  02  [null, null, null, null, null, null, null, null, null, null], 8
  01  [null, null, null, null, null, null, null, null, null, null], 9
        0     1      2    3     4     5     6     7     8     9
  ]
  */
  const placeShip = (coordinates, orientation) => {
    // Be able to place ships at specific coordinates by calling the ship factory function.
    // Ship must fit on board based on coordinates
    //  What if ship can be rotated?
    // If ship is horizontal
    //  Involves columns
    // If ship is vertical
    //  Involves rows
    // For example, if ship is a length of 5 AND horizontal
    //  [x, y] => [5, 3] => placeShip([5, 3])
    //  Ship should be on board from [5, 3] to [9, 3]
    //  Based on array => board[7][4] to board[7][8]
    // What if coordinates are based on draggable ships?
    //  How to determine if the ship will fit on the board?
    //  How to handle if the ship does not fit on the board?
    // What if there is a ship already at given coordinates?
    const x = coordinates[0] - 1;
    const y = board.length - coordinates[1];
    if ((y <= 10 && y >= 0) || (x <= 10 && x >= 0)) {
      // Check if x and y are within the board's size
      if (orientation) {
        // Vertical
        const newShip = Ship(3);
        for (let i = y; i <= y + 2; i += 1) {
          board[i][x] = newShip;
        }
      } else {
        // Horizontal
        const newShip = Ship(5);
        board[y].fill(newShip, x, x + 5);
      }
    }
  };

  const missedShots = [];
  const hitShots = [];
  const receiveAttack = (coordinates) => {
    //  Have a receiveAttack function that takes a pair of coordinates
    //  Determines whether or not the attack hit a ship
    //  Then sends the ‘hit’ function to the correct ship, or records the coordinates of the missed shot.
    const x = coordinates[0] - 1;
    const y = board.length - coordinates[1];
    const target = board[y][x];
    const isInMissedShots = missedShots.find(
      ([a, b]) => a === coordinates[0] && b === coordinates[1],
    );
    const isInHitShots = hitShots.find(([a, b]) => a === coordinates[0] && b === coordinates[1]);
    if (!isInMissedShots && !isInHitShots) {
      if (target) {
        target.hit();
        hitShots.push(coordinates);
      } else {
        missedShots.push(coordinates);
      }
    }
  };

  const getStatus = () => {
    // Reports whether or not all of their ships have been sunk.
    const flatBoard = board.flat().filter((item) => item !== null);
    return flatBoard.every((ship) => ship.isSunk());
  };

  return { board, receiveAttack, placeShip, missedShots, hitShots, getStatus };
};
