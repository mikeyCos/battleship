import Gameboard from './gameboard';

// Players can take turns playing the game by attacking the enemy Gameboard.
// The game is played against the computer,

// Does each player have their own gameboard?
// Does each player have access to the opponent's gameboard?
// How to decide if game is player vs player and player vs computer?
export default class {
  #playerBoard = Gameboard();
  #opponentBoard;
  get board() {
    return this.#playerBoard;
  }

  get opponentBoard() {
    return this.#opponentBoard;
  }

  set opponentBoard(board) {
    this.#opponentBoard = board;
  }
}

// class Human {
//   height;
// }

// class Baby extends Human {
//   speak() {
//     return `I am ${this.height} inches tall.`;
//   }
// }
