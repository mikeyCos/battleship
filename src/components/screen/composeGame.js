import pubSub from '../../containers/pubSub';

export default (state) => ({
  // init() {
  //   pubSub.publish('notify', 'Place ships');
  //   this.start = this.start.bind(this);
  //   this.renderShip = this.renderShip.bind(this);
  // },
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
    // When mousedown happens
    this.draggable = e.currentTarget;
    this.dragStart = e.target.parentElement;
    this.dropPlaceholder = this.draggable.cloneNode();
    this.draggable.classList.add('dragging');
    this.dragStart.classList.add('dragstart');
    this.dropPlaceholder.classList.add('ship_box_placeholder');
    this.offSetX = e.clientX;
    this.offSetY = e.clientY;
    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);
  },
  dragMoveHandler(e) {
    // console.clear();
    console.log('drag move');
    this.draggable.style.left = `${e.clientX - this.offSetX}px`;
    this.draggable.style.top = `${e.clientY - this.offSetY}px`;

    const { left, top, width } = this.draggable.getBoundingClientRect();
    const shipLength = this.draggable.dataset.length;
    const offSet = (width / shipLength) * 0.5;

    const cell = document
      .elementsFromPoint(left + offSet, top + offSet)
      .find((element) => element.classList.contains('cell'));
    if (cell) {
      // If draggable is over drop zone AND if draggable is more than 50% over it's 'last' cell
      //  Append the draggable to the cell content container
      console.log('dragging over drop zone');
      this.cell = cell;
      const cellContent = cell.firstChild;
      cellContent.appendChild(this.dropPlaceholder);
      this.draggable.classList.add('ship_box_transparent');
    } else {
      if (this.draggable.classList.contains('ship_box_transparent')) {
        this.cell.firstChild.lastChild.remove();
        this.cell = null;
        this.draggable.classList.remove('ship_box_transparent');
      }
      console.log('dragging over a non drop zone');
    }
  },
  dragEndHandler(e) {
    console.log('drag end');
    // When mouseup happens
    this.draggable.style.left = `0px`;
    this.draggable.style.top = `0px`;

    this.draggable.classList.remove('dragging');
    this.draggable.classList.remove('ship_box_transparent');
    this.dragStart.classList.remove('dragstart');

    this.dropHandler();

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
  },
  dragOverHandler(e) {
    console.log('drag over');
    console.log(e.target);
    // e.preventDefault();
    // Need to check if the content container has the draggable
    // If content container does NOT have draggable element
    //  Do content.appendChild(draggable)
  },
  dragEnterHandler(e) {
    console.log('drag enter');
  },
  dragLeaveHandler(e) {
    // If draggable has NOT been dropped then it leaves the drop zone and is dropped outside the drop zone
    //  It needs to return to it's original draggable starting location(?)
    // If draggable has been dropped in the drop zone then dragged again and dropped outside the drop zone
    //  It needs to return to where it was dropped in the drop zone(?)
    console.log('drag leave');
  },
  dropHandler() {
    console.log('drag drop');
    if (this.cell || this.dragStart.isEqualNode(this.cell)) {
      console.log('this.dragStart is a cell');
    }

    if (this.cell) {
      this.cell.firstChild.replaceChild(this.draggable, this.dropPlaceholder);
      this.draggable.style.left = `-4%`;
      this.draggable.style.top = `-4%`;
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);

      const shipLength = parseInt(this.draggable.dataset.length);

      // this.game.playerOneBoard.placeShip([x, y], shipLength, false);
      this.cell = null;
    }
  },
  reset(e) {
    // Clears board
  },
  start(e) {
    // Set this.gameReady to true
    // Publish something...?
    // Reveal player two's board
    this.gameReady = true;
    this.render();
    this.renderWait();
  },
  boardHandler(e) {
    console.log(e.target);
    console.log(e.target.parentElement);
    const btn = e.target.parentElement;
    const x = parseInt(btn.dataset.x);
    const y = parseInt(btn.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      // Place ship
      console.log(`Placing a ship starting at [${x}, ${y}]`);
      this.game.playerOneBoard.placeShip([2, 2], 3, false);
      this.game.playerTwoBoard.placeShip([6, 2], 3, false);
      this.renderShip(btn);
    }
  },
});
