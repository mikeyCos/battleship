import Ship from '../containers/ship';

export default () => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.

  // 10 x 10 grid
  const board = new Array(10).fill().map(() => new Array(10).fill(undefined));
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
  const generateShipCoordinates = ([x, y], orientation, shipLength) => {
    const coordinates = [[x, y]];

    if (orientation) {
      // Vertical
      // [5, 3] in 2d array terms => [7][4], [8][4], [9][4]
      for (let i = x; i < x + shipLength; i += 1) {
        coordinates.push([i, y]);
      }
    } else {
      // Horizontal
      // [5, 3] in 2d array terms => [7][4], [7][5], [7][6]
      for (let i = y; i < y + shipLength; i += 1) {
        coordinates.push([x, i]);
      }
    }

    return coordinates;
  };

  const checkCoordinate = (x, y) => {
    return x >= 0 && x < 10 && y >= 0 && y < 10;
  };

  const checkBoard = (x, y) => {
    // Check if there is a ship at x and y
    // Check if all surrounding coordinates are undefined
    // Return true if ship can be place
    const boolean = checkCoordinate(x, y);
    const check = [
      [x, y + 1],
      [x, y - 1],
      [x + 1, y],
      [x + 1, y + 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x - 1, y + 1],
      [x - 1, y - 1],
    ];
    return check.every(([a, b]) => {
      // Need to check if a and b are within the board's size
      // The value of a and b can only be between from 0 to 9.
      // It is pointless to check if there is space when a ship is placed at the border of the board
      return checkCoordinate(a, b) ? boolean && board[a][b] === undefined : boolean;
    });
  };

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
    // A ship MUST be 1 coordinate away from another ship
    const x = board.length - coordinates[1];
    const y = coordinates[0] - 1;
    const newShip = Ship(3);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, newShip.length);
    if (shipCoordinates.every(([a, b]) => checkBoard(a, b))) {
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y
      if (orientation) {
        // Vertical
        for (let i = x; i < x + newShip.length; i += 1) {
          board[i][y] = newShip;
        }
      } else {
        // Horizontal
        board[x].fill(newShip, y, y + newShip.length);
      }
    } else {
      throw new Error('There is a ship at or near coordinates');
    }
  };

  const missedShots = [];
  const hitShots = [];
  const receiveAttack = ([x, y]) => {
    //  Have a receiveAttack function that takes a pair of coordinates
    //  Determines whether or not the attack hit a ship
    //  Then sends the ‘hit’ function to the correct ship, or records the coordinates of the missed shot.
    const row = x - 1;
    const col = board.length - y;
    const target = board[col][row];
    const isInMissedShots = missedShots.find(([a, b]) => a === x && b === y);
    const isInHitShots = hitShots.find(([a, b]) => a === x && b === y);
    if (!isInMissedShots && !isInHitShots) {
      if (target) {
        target.hit();
        hitShots.push([x, y]);
      } else {
        missedShots.push([x, y]);
      }
    }
  };

  const getStatus = () => {
    // Reports whether or not all of their ships have been sunk.
    const flatBoard = board.flat().filter((item) => item);
    return flatBoard.every((ship) => ship.isSunk());
  };

  return {
    receiveAttack,
    placeShip,
    getStatus,
    get board() {
      return board;
    },
    get missedShots() {
      return missedShots;
    },
    get hitShots() {
      return hitShots;
    },
  };
};
