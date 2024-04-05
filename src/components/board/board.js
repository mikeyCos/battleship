import createElement from '../../helpers/createElement';

export default (playerBoard) => {
  const board = {
    render(board) {
      const playerBoard = createElement('div');
      playerBoard.classList.add('board');
      board.forEach((row, y) => {
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
          const blankWrapper = createElement('span');
          blankWrapper.classList.add('blank_wrapper');
          cellContent.appendChild(blankWrapper);
          if (cell.ship) {
            // Problem, allows opponents to cheat in a browser developer tools
            const cellShip = createElement('div');
            cellShip.classList.add('ship');
            cellContent.appendChild(cellShip);
          }
          cellContent.classList.add('cell_content');
          cellBtn.appendChild(cellContent);
          // Need to check for left and top edges of board
          // To create row and column labels
          if (x === 0 || y === 0) {
            const rowMarker = createElement('div');
            const colMarker = createElement('div');
            if (x === 0) {
              rowMarker.setAttributes({ class: 'row_marker', textContent: `${y + 1}` });
              cellContent.appendChild(rowMarker);
            }

            if (y === 0) {
              colMarker.setAttributes({
                class: 'col_marker',
                textContent: `${String.fromCharCode(65 + x)}`,
              });
              cellContent.appendChild(colMarker);
            }
          }
          boardRow.appendChild(cellBtn);
          // playerBoard.appendChild(cellBtn);
        });
        playerBoard.appendChild(boardRow);
      });
      return playerBoard;
    },
  };

  return board.render(playerBoard);
};
