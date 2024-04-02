import pubSub from '../../containers/pubSub';

export default (state) => ({
  offSetX: 0,
  offSetY: 0,
  init() {
    console.log('init running from composeGame');
  },
  renderShip(element) {
    // This will append to the content div
    console.log(element);
  },
  dragStartHandler(e) {
    console.log('drag start');
    this.draggable = e.currentTarget;
    this.dragStart = e.target.parentElement;
    this.dropPlaceholder = this.draggable.cloneNode();
    this.dropPlaceholder.classList.add('ship_box_placeholder');
    this.offSetX = e.clientX;
    this.offSetY = e.clientY;

    // document.addEventListener('mouseup', this.dragEndHandler);
    this.dragTimer = setTimeout(() => {
      console.log(`adding mousemove and mouseup events`);
      document.addEventListener('mousemove', this.dragMoveHandler);
      document.addEventListener('mouseup', this.dragEndHandler);
      this.draggable.removeEventListener('click', this.rotateHandler);
    }, 250);

    // if (parseInt(this.draggable.dataset.length) > 1) {
    this.draggable.addEventListener('click', this.rotateHandler, { once: true });
    // }
  },
  dragMoveHandler(e) {
    // console.clear();
    console.log('drag move');
    this.draggable.classList.add('dragging');
    this.dragStart.classList.add('dragstart');

    this.draggable.style.left = `${e.clientX - this.offSetX}px`;
    this.draggable.style.top = `${e.clientY - this.offSetY}px`;

    const { left, top, width } = this.draggable.getBoundingClientRect();
    const shipLength = parseInt(this.draggable.dataset.length);
    const offSet = (width / shipLength) * 0.5;
    const cell = document
      .elementsFromPoint(left + offSet, top + offSet)
      .find((element) => element.classList.contains('cell'));
    if (cell) {
      // Dragging over drop zone
      // If draggable is more than 50% over it's 'last' cell
      //  Append the draggable to the cell content container
      this.cell = cell;
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);

      const id = this.draggable.dataset.id;
      const orientation = this.draggable.dataset.orientation !== 'h';
      this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, true, false, id);
    } else {
      // Dragging over a non drop zone
      if (
        this.draggable.classList.contains('ship_box_transparent') &&
        this.cell.firstChild.lastChild
      ) {
        this.cell.firstChild.lastChild.remove();
        this.cell = null;
        this.draggable.classList.remove('ship_box_transparent');
      }
    }
  },
  dragEndHandler(e) {
    console.log('drag end');
    this.draggable.style.left = `0px`;
    this.draggable.style.top = `0px`;

    this.draggable.classList.remove('dragging');
    this.draggable.classList.remove('ship_box_transparent');
    this.dragStart.classList.remove('dragstart');

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
    // console.log(this.game.playerOneBoard.board);
    if (this.cell) {
      // If user has stopped dragging over the drop zone
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);
      const shipLength = parseInt(this.draggable.dataset.length);
      const id = this.draggable.dataset.id;
      const orientation = this.draggable.dataset.orientation !== 'h';
      this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, false, false, id);
    }

    if (!this.dragStart.classList.contains('port_ship') && this.draggable) {
      // If dragStart is not the port_ship element
      this.draggable.style.left = `-4%`;
      this.draggable.style.top = `-4%`;
    }
  },
  dropHandler(isDragging, isValidDrop) {
    // console.log('drag drop');
    if (this.cell) {
      const cellContent = this.cell.firstChild;
      if (isDragging && isValidDrop) {
        // If user is dragging over the drop zone
        cellContent.appendChild(this.dropPlaceholder);
        this.draggable.classList.add('ship_box_transparent');
      } else if (!isDragging && isValidDrop) {
        // If user has stopped dragging over the drop zone
        console.log(`dragging stopped over the drop zone`);
        cellContent.appendChild(this.draggable);
        this.dropPlaceholder.remove();
        this.draggable.style.left = `-4%`;
        this.draggable.style.top = `-4%`;
      } else if (isDragging && !isValidDrop) {
        // If user is dragging over an invalid drop
        if (this.dropPlaceholder) {
          this.dropPlaceholder.remove();
          this.draggable.classList.remove('ship_box_transparent');
        }
      }
    } else if (!this.cell && isDragging === false) {
      // If user has stopped dragging outside the drop zone
      // Draggable needs to append back to this.dragStart
      console.log(`dragging stopped outside the drop zone`);
    }
  },
  rotateHandler(e) {
    const newOrientation = this.draggable.dataset.orientation === 'h';
    if (e instanceof MouseEvent) {
      clearTimeout(this.dragTimer);
      if (
        !this.draggable.classList.contains('dragging') &&
        !this.dragStart.classList.contains('port_ship')
      ) {
        // If ship is not being dragged and it is not in port
        e.preventDefault();
        console.log(`rotateHandler being called`);
        this.cell = this.dragStart.parentElement;
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);
        const shipLength = parseInt(this.draggable.dataset.length);
        const id = this.draggable.dataset.id;
        this.game.playerOneBoard.placeShip([x, y], shipLength, newOrientation, false, true, id);
        console.log(this.boards.playerOne);
      }
      e.stopImmediatePropagation();
    } else if (e === true && parseInt(this.draggable.dataset.length) > 1) {
      this.draggable.dataset.orientation = newOrientation ? 'v' : 'h';
      const newWidth = newOrientation ? this.draggable.style.width : this.draggable.style.height;
      const newHeight = newOrientation ? this.draggable.style.height : this.draggable.style.width;
      this.draggable.style.width = newOrientation ? newHeight : newWidth;
      this.draggable.style.height = newOrientation ? newWidth : newHeight;
    } else if (e === false) {
      this.draggable.classList.add('rotate_error');
      setTimeout(() => {
        this.draggable.classList.remove('rotate_error');
      }, 250);
    }
  },
  reset(e) {
    // Clears board
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
    if (!this.mode) {
      // this.boards.playerTwo.placeShipsRandom();
      this.game.playerTwo.board.placeShipsRandom();
      console.log(this.game.playerTwo.board.board);
    }
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
});
