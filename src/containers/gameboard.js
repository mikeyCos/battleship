import Ship from '../containers/ship';

export default () => {
  // keep track of missed attacks so they can display them properly.
  // be able to report whether or not all of their ships have been sunk.

  // 10 x 10 grid
  const board = new Array(10).fill().map(() => new Array(10).fill().map(() => null));
  // do I need this?
  /*
  [
        A     B     C     D     E     F     G     H     I     J
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
    // be able to place ships at specific coordinates by calling the ship factory function.
    // ship must fit on board based on coordinates
    //  what if ship can be rotated?
    // if ship is horizontal
    //  will involve columns
    // if ship is vertical
    //  will involve rows
    // for example, if ship is a length of 5 AND horizontal
    //  [x, y] => [5, 3] => placeShip([5, 3])
    //  ship should be on board from [5, 3] to [9, 3]
    //  based on array => board[7][4] to board[7][8]
    // what if coordinates are based on draggable ships?
    //  how to determine if the ship will fit on the board?
    const x = coordinates[0] - 1;
    const y = board.length - coordinates[1];
    if ((y <= 10 && y >= 0) || (x <= 10 && x >= 0)) {
      // check if x and y are within the board's size

      if (orientation) {
        // vertical
        const newShip = Ship(3);
        for (let i = y; i <= 4; i += 1) {
          board[i][x] = newShip;
        }
      } else {
        // horizontal
        const newShip = Ship(5);
        board[y].fill(newShip, x, x + 5);
      }
    }
  };

  const missedShots = [];
  const hitShots = [];
  const receiveAttack = (coordinates) => {
    // have a receiveAttack function that takes a pair of coordinates
    //  determines whether or not the attack hit a ship
    //  then sends the ‘hit’ function to the correct ship, or records the coordinates of the missed shot.
    const x = coordinates[0] - 1;
    const y = board.length - coordinates[1];
    const target = board[y][x];
    // if missedShots and hitShots do NOT include coordinates
    //  if target is null
    //   push coordinate into missedShots
    //  else
    //    target.hit()
    //    push coordinate into hitShots
    const isInMissedShots = missedShots.find(
      ([x, y]) => a === coordinates[0] && b === coordinates[1],
    );
    const isInHitShots = hitShots.find(([x, y]) => a === coordinates[0] && b === coordinates[1]);
    if (!isInMissedShots && !isInHitShots) {
      if (!target) {
        missedShots.push(coordinates);
      } else {
        hitShots.push(coordinates);
      }
    }
  };

  return { board, receiveAttack, placeShip, missedShots, hitShots };
};
