import Gameboard from './gameboard';
import Player from './player';
import pipe from './pipe';
import isHuman from './isHuman';
import isComputer from './isComputer';
// Module that controls the main game loop
// For now just populate each Gameboard with predetermined coordinates.
// You are going to implement a system for allowing players to place their ships later.
export default {
  init() {
    // The game loop should set up a new game by creating Players and Gameboards.
    // 1. Create gameboards
    // 2. Create players and pass in their gameboard and the opponent's gameboard.
    //  Do I only need to pass the opponent's board?
    this.playerOneBoard = Gameboard();
    this.playerTwoBoard = Gameboard();
    this.playerOne = pipe(Player, isHuman)(this.playerOneBoard, this.playerTwoBoard);
    this.playerTwo = pipe(Player, isHuman)(this.playerTwoBoard, this.playerOneBoard);

    this.playerOneBoard.placeShip([2, 2], false);
    this.playerTwoBoard.placeShip([6, 2], false);
    this.switchPlayers();
    console.table(this.playerTwo.board.board);
  },
  switchPlayers(player) {
    if (player) {
      // Looking into Lodash _.isEqual()
      // Could add a turn property to player object that takes a boolean
      this.activePlayer = player === this.playerOne ? this.playerTwo : this.playerOne;
    } else {
      // Initially set a random player as the active player
      const players = [this.playerOne, this.playerTwo];
      this.activePlayer = players[Math.floor(Math.random() * 2)];
    }
  },
  playRound(coordinate) {
    this.activePlayer.attack(coordinate);
    this.switchPlayers(this.activePlayer);
    this.activePlayer.attack(coordinate);
  },
};
