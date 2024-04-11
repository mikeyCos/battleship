import pubSub from '../../containers/pubSub';
import createElement from '../../helpers/createElement';

export default (player, playerBoard) => {
  const board = {
    board: playerBoard,
    ships: [],
    player,
    init() {
      this.bindEvents();
    },
    bindEvents() {
      this.pushShip = this.pushShip.bind(this);
      console.log(this.player);
      pubSub.subscribe(`pushShip_${this.player}`, this.pushShip);
    },
    render() {
      const playerBoard = createElement('div');
      playerBoard.classList.add('board');
      this.board.forEach((row, y) => {
        const boardRow = createElement('div');
        boardRow.classList.add('board_row');
        row.forEach((cell, x) => {
          const cellBtn = createElement('button');
          cellBtn.setAttributes({
            class: 'cell',
            ['data-x']: x + 1,
            ['data-y']: row.length - y,
          });
          // Need to show only activePlayer's ships
          // Need to hide the opponent's ships when activePlayer changes
          const cellContent = createElement('div');
          const cellContentSpace = document.createTextNode('\u00A0');
          const blankWrapper = createElement('span');
          blankWrapper.classList.add('blank_wrapper');
          cellContent.appendChild(blankWrapper);
          cellContent.appendChild(cellContentSpace);

          if (cell.ship) {
            cellBtn.classList.add('busy');
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = createElement('div');
            const findShip = this.ships.find((ship) => ship.id === cell.ship.id);
            if (findShip) {
              cellShip.style.cssText = findShip.style;
              this.ships.splice(this.ships.indexOf(findShip), 1);
              cellShip.classList.add('ship_box');
              cellContent.appendChild(cellShip);
            }
          }

          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = createElement('div');
            const colMarker = createElement('div');
            if (x === 0) {
              rowMarker.setAttributes({ class: 'marker marker_row', textContent: `${y + 1}` });
              cellContent.appendChild(rowMarker);
            }

            if (y === 0) {
              colMarker.setAttributes({
                class: 'marker marker_col',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellContent.appendChild(colMarker);
            }
          }
          boardRow.appendChild(cellBtn);
        });
        playerBoard.appendChild(boardRow);
      });
      return playerBoard;
    },
    pushShip(shipData) {
      // Need to save ship info; CSS and ID
      const findShip = this.ships.find((ship) => ship.id === shipData.id);

      if (!findShip) {
        this.ships.push(shipData);
      } else {
        const index = this.ships.indexOf(findShip);
        this.ships[index] = shipData;
      }
    },
  };

  board.init();
  // return board.render(playerBoard);
  return board;
};
