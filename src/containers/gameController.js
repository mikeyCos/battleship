import Gameboard from './gameboard';
import Player from './player';
import pipe from './pipe';
import isHuman from './isHuman';
import isComputer from './isComputer';
// Module that controls the main game loop
// For now just populate each Gameboard with predetermined coordinates.
// You are going to implement a system for allowing players to place their ships later.
export default () => {
  // The game loop should set up a new game by creating Players and Gameboards.
  // 1. Create gameboards
  // 2. Create players and pass in their gameboard and the opponent's gameboard.
  //  Do I only need to pass the opponent's board?
  let activePlayer;
  const playerOneBoard = Gameboard();
  const playerTwoBoard = Gameboard();

  const playerOne = pipe(Player, isHuman)(playerOneBoard, playerTwoBoard);
  const playerTwo = pipe(Player, isHuman)(playerTwoBoard, playerOneBoard);
  playerOneBoard.placeShip([2, 2], false);
  playerTwoBoard.placeShip([6, 2], false);

  const switchPlayers = (player) => {
    if (player) {
      // Looking into Lodash _.isEqual()
      // Could add a turn property to player object that takes a boolean
      activePlayer = player === playerOne ? playerTwo : playerOne;
    } else {
      // Initially set a random player as the active player
      const players = [playerOne, playerTwo];
      activePlayer = players[Math.floor(Math.random() * 2)];
    }
  };

  const playRound = (coordinate) => {
    // Allow a player to attack again if the initial attack hits a ship
    activePlayer.attack(coordinate);
    // If game is not over, switch players
    if (!getGameStatus()) switchPlayers(activePlayer);
  };

  const getGameStatus = () => {
    return playerOneBoard.getStatus() || playerTwoBoard.getStatus();
  };

  switchPlayers();
  return {
    switchPlayers,
    playRound,
    getGameStatus,
    get activePlayer() {
      return activePlayer;
    },
    get playerOne() {
      return playerOne;
    },
    get playerTwo() {
      return playerTwo;
    },
    get playerOneBoard() {
      return playerOneBoard;
    },
    get playerTwoBoard() {
      return playerTwoBoard;
    },
  };
};