export default (player) => ({
  attack: ([x, y]) => {
    if (!player.shots.find(([a, b]) => a === x && b === y)) {
      player.opponentBoard.receiveAttack([x, y]);
      player.shots.push([x, y]);
    }
  },
});
