import Ship from '../containers/ship';
import pubSub from './pubSub';

export default () => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.
  const Cell = (ship) => {
    return ship
      ? {
          ship,
          hit: false,
        }
      : {
          miss: false,
        };
  };
  const board = new Array(10).fill().map(() => new Array(10).fill().map(() => Cell()));
  // 10 x 10 grid
  // const board = new Array(10).fill().map(() => new Array(10).fill(undefined));
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

  const parseCoordinate = ([x, y]) => {
    // Parses coordinate inputted by user such that
    // the value pairs can be used for accessing elements
    // in the two dimensional array
    return [board.length - y, x - 1];
  };

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

  const validateCoordinate = (x, y) => {
    return x >= 0 && x < 10 && y >= 0 && y < 10;
  };

  const checkBoard = ([x, y]) => {
    // Check if there is a ship at x and y
    // Check if all surrounding coordinates are undefined
    // Return true if ship can be place
    const boolean = validateCoordinate(x, y);
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
      return validateCoordinate(a, b) ? boolean && board[a][b].ship === undefined : boolean;
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
    // const x = board.length - coordinates[1];
    // const y = coordinates[0] - 1;
    const [x, y] = parseCoordinate(coordinates);
    const newShip = Ship(3);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, newShip.length);
    if (shipCoordinates.every(checkBoard)) {
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y
      if (orientation) {
        // Vertical
        for (let i = x; i < x + newShip.length; i += 1) {
          board[i][y] = Cell(newShip);
        }
      } else {
        // Horizontal
        // board[x].fill(newShip, y, y + newShip.length);
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
        }
      }
    } else {
      throw new Error('There is a ship at or near coordinates');
    }
  };

  const shots = [];
  const validateAttack = (x, y) => {
    // Checks if coordinate is with the board size and has not been attacked
    const [a, b] = parseCoordinate([x, y]);
    return !shots.find(([a, b]) => a === x && b === y) && validateCoordinate(a, b);
  };

  const receiveAttack = ([x, y]) => {
    // Have a receiveAttack function that takes a pair of coordinates
    // Determines whether or not the attack hit a ship
    // Then sends the ‘hit’ function to the correct ship, or records the coordinates of the missed shot.
    // Can I store the missed shots directly on the board?
    // How to handle if a coordinate has already been attacked?
    //  Throw an error?

    const cell = getBoardCell([x, y]);
    const isValidAttack = validateAttack(x, y);

    // if (!isInShots) {
    if (isValidAttack) {
      // if (cell.miss !== true || cell.hit !== false) {
      if (cell.ship) {
        cell.ship.hit();
        cell.hit = true;
        // cell.attack();
      } else {
        // cell.attack();
        cell.miss = true;
      }
      shots.push([x, y]);
    }
  };

  const getStatus = () => {
    // Reports whether or not all of their ships have been sunk.
    const flatBoard = board.flat().filter((cell) => cell.ship !== undefined);
    return flatBoard.every((cell) => cell.ship.isSunk());
  };

  const getBoardCell = ([x, y]) => {
    const [a, b] = parseCoordinate([x, y]);
    return board[a][b];
  };

  return {
    receiveAttack,
    placeShip,
    getStatus,
    getBoardCell,
    get board() {
      return board;
    },
  };
};
