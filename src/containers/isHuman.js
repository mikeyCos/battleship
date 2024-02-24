export default (player) => {
  const attack = (coordinate) => {
    // opponent.receiveAttack(coordinate);
    player.getOpponentBoard().receiveAttack(coordinate);
    // console.log(player.getOpponentBoard().board);
  };
  return { attack, ...player };
};
