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
    const playerOneBoard = Gameboard();
    const playerTwoBoard = Gameboard();
    this.playerOne = pipe(Player, isHuman)(playerOneBoard, playerTwoBoard);
    this.playerTwo = pipe(Player, isHuman)(playerTwoBoard, playerOneBoard);
  },
  playRound() {},
};
