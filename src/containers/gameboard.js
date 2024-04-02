import Ship from '../containers/ship';
import pubSub from './pubSub';
import generateUUID from '../helpers/generateUUID';

export default () => {
  // Keep track of missed attacks so they can display them properly.
  // Be able to report whether or not all of their ships have been sunk.
  const memo = [];
  const Cell = (ship) => {
    return ship
      ? {
          ship,
          hit: false,
          attack() {
            this.hit = true;
            this.ship.hit();
          },
        }
      : {
          miss: false,
          attack() {
            this.miss = true;
          },
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
  const clearBoard = () => {
    for (let i = 0; i < memo.length; i += 1) {
      const { row, col } = memo[i];
      console.log(`row: ${row} | col: ${col}`);
      board[row][col] = Cell();
      memo.splice(i, 1);
      i -= 1;
    }
  };

  const parseCoordinate = ([x, y]) => {
    // Parses coordinate inputted by user such that
    // the value pairs can be used for accessing elements
    // in the two dimensional array
    return [board.length - y, x - 1];
  };

  const generateRandomCoordinate = () => {
    // Returns random coordinate with values between 1 and 10
    const coordinate = [];
    for (let i = 0; i < 2; i += 1) {
      coordinate.push(Math.floor(Math.random() * 10 + 1));
    }
    return coordinate;
  };

  // const generateRandomCoordinates = (ships) => {
  //   const coordinates = [];
  //   // Generate an array of unique coordinates
  //   // The array must equal to the amount of ships
  //   let i = 0;
  //   while (i < ships.length) {
  //     const [x, y] = generateRandomCoordinate();
  //     const orientation = Math.floor(Math.random() * 2) === 1;
  //     const shipCoordinates = generateShipCoordinates([x, y])
  //     const isValidCoordinate = shipCoordinates(checkBoard);
  //     if (!coordinates.find(([a, b]) => a === x && b === y)) {
  //       coordinates.push([x, y]);
  //       console.log(ships[i]);
  //       i += 1;
  //     } else {
  //       continue;
  //     }
  //   }
  //   return coordinates;
  // };

  const generateShipCoordinates = ([x, y], orientation, shipLength) => {
    const coordinates = [];

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

  const checkBoard = ([x, y], id) => {
    // Check if there is a ship at x and y
    // Check if all surrounding coordinates are undefined
    // Return true if ship can be place
    const boolean = validateCoordinate(x, y);
    const check = [
      [x, y],
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
      return validateCoordinate(a, b)
        ? boolean && (board[a][b].ship === undefined || board[a][b].ship.id === id)
        : boolean;
    });
  };

  const placeShip = (coordinates, shipLength, orientation, isDragging, isRotating, id) => {
    // How many parameters is too much?

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

    // If id exists on board
    //  Find the cells with ship.id === id
    //  Replace cells with Cell()
    // memo = memo.filter((cell) => {
    //   if (cell.id === id) {
    //     const { row, col } = cell;
    //     board[row][col] = Cell();
    //     return false;
    //   } else {
    //     return true;
    //   }
    // });

    // const isShipOnBoard = memo.some((cell) => cell.id === id);
    // if (isShipOnBoard) {
    //   for (let i = 0; i < memo.length; i += 1) {
    //     if (memo[i].id === id) {
    //       console.log(`memo[i].id: ${memo[i].id}`);
    //       console.log(`id: ${id}`);
    //       const { row, col } = memo[i];
    //       board[row][col] = Cell();
    //       memo.splice(i, 1);
    //     }
    //   }
    // }

    const [x, y] = parseCoordinate(coordinates);
    const shipCoordinates = generateShipCoordinates([x, y], orientation, shipLength);
    const isValidCoordinates = shipCoordinates.every((coordinate) => {
      return checkBoard(coordinate, id);
    });

    console.log(...shipCoordinates);
    console.log(isValidCoordinates);
    if (isValidCoordinates && !isDragging) {
      const newShip = Ship(shipLength, id);
      // Check if x and y are within the board's size
      // Check if there is a ship at x and y

      const isShipOnBoard = memo.some((cell) => cell.id === id && id !== undefined);
      if (isShipOnBoard) {
        for (let i = 0; i < memo.length; i += 1) {
          if (memo[i].id === id) {
            const { row, col } = memo[i];
            console.log(`row: ${row} | col: ${col}`);
            board[row][col] = Cell();
            memo.splice(i, 1);
            i -= 1;
          }
        }
      }

      if (orientation) {
        // Vertical
        for (let i = x; i < x + newShip.length; i += 1) {
          board[i][y] = Cell(newShip);
          memo.push({ row: i, col: y, id });
        }
      } else {
        // Horizontal
        // board[x].fill(newShip, y, y + newShip.length);
        for (let i = y; i < y + newShip.length; i += 1) {
          board[x][i] = Cell(newShip);
          memo.push({ row: x, col: i, id });
        }
      }

      if (isRotating) {
        pubSub.publish('rotate', true);
      } else {
        pubSub.publish('drop', false, true);
      }
    } else if (isValidCoordinates && isDragging && !isRotating) {
      console.log('dragging');
      pubSub.publish('drop', true, true);
    } else if (!isValidCoordinates && isDragging && !isRotating) {
      console.log(`there is a ship on or near coordinates`);
      pubSub.publish('drop', true, false);
    } else if (!isValidCoordinates && !isDragging && isRotating) {
      console.log(`cannot rotate`);
      pubSub.publish('rotate', false);
    }
  };

  const placeShipsRandom = () => {
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    const coordinates = [];
    let i = 0;
    while (i < ships.length) {
      // generateRandomCoordinate()
      const [x, y] = generateRandomCoordinate();
      const shipCoordinates = generateShipCoordinates([x, y]);
      const isValidCoordinate = shipCoordinates.every(checkBoard);
      if (!coordinates.find(([a, b]) => a === x && b === y) && isValidCoordinate) {
        const orientation = Math.floor(Math.random() * 2) === 1;
        placeShip([x, y], ships[i], orientation, false, false, generateUUID());
        coordinates.push([x, y]);
        console.log(ships[i]);
        i += 1;
      } else {
        continue;
      }
    }
    console.log(coordinates);
    console.log(board);
    // placeShip(coordinates, shipLength, orientation, isDragging, isRotate, id)
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

    if (isValidAttack) {
      cell.attack();
      shots.push([x, y]);
      // Publish to the screenController.renderAttack method?
      pubSub.publish('renderAttack', cell, [x, y]);
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
    placeShipsRandom,
    getStatus,
    getBoardCell,
    clearBoard,
    get board() {
      return board;
    },
  };
};

const numbers = [
  [
    {
      num: {
        value: 1,
      },
    },
    {
      num: {
        value: 2,
      },
    },
    {
      num: {
        value: 3,
      },
    },
    {
      num: {
        value: 1,
      },
    },
  ],
  [
    {
      num: {
        value: 8,
      },
    },
    {
      num: {
        value: 1,
      },
    },
  ],
];

const nar = { num: { value: 1987398789273 } };
const memo = [];
// numbers[0][4] = nar;
// const ref = numbers[0][4];
// memo.push(ref);
// memo[0] = {};
memo.push({ y: 0, x: 4 });
