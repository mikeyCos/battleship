import Gameboard from './gameboard';
import Player from './player';
import pipe from './pipe';
import isHuman from './isHuman';
import isComputer from './isComputer';
import pubSub from './pubSub';
// Module that controls the main game loop
// For now just populate each Gameboard with predetermined coordinates.
// You are going to implement a system for allowing players to place their ships later.
export default (mode) => {
  // If mode is true player two will be a human, else a computer
  // The game loop should set up a new game by creating Players and Gameboards.
  // 1. Create gameboards
  // 2. Create players and pass in their gameboard and the opponent's gameboard.
  //  Do I only need to pass the opponent's board?
  let activePlayer;
  const playerOneBoard = Gameboard();
  const playerTwoBoard = Gameboard();

  const playerOne = pipe(Player, isHuman)(playerOneBoard, playerTwoBoard);
  const playerTwo = pipe(Player, mode ? isHuman : isComputer)(playerTwoBoard, playerOneBoard);

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

    // If activePlayer is a computer...
    // Do something different here?
    // Call playRound()?
  };

  const playRound = (coordinate) => {
    // Allow a player to attack again if the initial attack hits a ship
    activePlayer.attack(coordinate);
    // If game is not over, switch players
    if (!getGameStatus().status) switchPlayers(activePlayer);
  };

  const getGameStatus = () => {
    const status = { status: playerOneBoard.getStatus() || playerTwoBoard.getStatus() };
    if (status.status) {
      // Game is over
      const message = playerOneBoard.getStatus() ? 'Player two won!' : 'Player one won!';
      Object.assign(status, { message });
    }
    return status;
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
