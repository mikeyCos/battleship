export default (player) => ({
  attack: (coordinate) => {
    player.opponentBoard.receiveAttack(coordinate);
    player.shots.push(coordinate);
  },
});
