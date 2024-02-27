import Player from './player';
export default class extends Player {
  // Make the ‘computer’ capable of making random plays.
  // The AI does not have to be smart,
  // But it should know whether or not a given move is legal
  // (i.e. it shouldn’t shoot the same coordinate twice).
  shots = [];
  generateRandomCoordinate = () => {
    // Returns random coordinate with values between 1 and 10
    const coordinate = [];
    for (let i = 0; i < 2; i += 1) {
      coordinate.push(Math.floor(Math.random() * 10 + 1));
    }
    return coordinate;
  };

  attack = () => {
    // Returns a random unique coordinate that is in-bounds of the board
    // Note, if shots.length is 100, game will be over
    // There are only 100 coordinates to attack
    while (this.shots.length < 100) {
      let [x, y] = this.generateRandomCoordinate();
      if (!this.shots.find(([a, b]) => a === x && b === y)) {
        this.shots.push([x, y]);
        console.log(this.opponentBoard);
        this.opponentBoard.receiveAttack([x, y]);
        return [x, y];
      }
    }
  };
}
