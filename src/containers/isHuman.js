export default (player) => ({
  attack: ([x, y]) => {
    player.opponentBoard.receiveAttack([x, y]);
  },
});
