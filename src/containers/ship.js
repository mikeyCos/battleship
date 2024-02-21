export default (size) => {
  // Properties:
  //  length
  //  numbers of times hit
  //  sunk (true/false)
  // Methods:
  //  hit, increases the number of ‘hits’ in your ship.
  //  isSunk() calculates whether a ship is considered sunk
  //    based on its length and the number of hits it has received.
  // - Carrier	    5
  // - Battleship	  4
  // - Destroyer	  3
  // - Submarine	  3
  // - Patrol Boat	2
  const length = size;
  // how or when to initialize a ship's length
  // what determines a ships length?
  let numHits = 0;
  let sunk = false;
  const hit = () => {
    if (!sunk) numHits += 1;
  };
  const isSunk = () => {
    sunk = numHits === length;
    return sunk;
  };

  return { hit, isSunk };
};
