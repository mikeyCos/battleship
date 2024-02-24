import Gameboard from './gameboard';

// Players can take turns playing the game by attacking the enemy Gameboard.
// The game is played against the computer,

// Does each player have their own gameboard?
// Does each player have access to the opponent's gameboard?
// How to decide if game is player vs player and player vs computer?
export default () => {
  const playerBoard = Gameboard();
  let opponentBoard;
  const setOpponentBoard = (board) => {
    opponentBoard = board;
  };
  const getOpponentBoard = () => opponentBoard;
  const getPlayerBoard = () => playerBoard;

  return { getPlayerBoard, setOpponentBoard, getOpponentBoard };
};
