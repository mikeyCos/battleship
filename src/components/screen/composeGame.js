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
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);
      const shipLength = parseInt(this.draggable.dataset.length);
      const id = this.draggable.dataset.id;
      this.game.playerOneBoard.placeShip([x, y], shipLength, false, id);
      // this.dropHandler(false);
    } else {
      console.log('dragging over a non drop zone');
      if (this.draggable.classList.contains('ship_box_transparent')) {
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
    this.dropHandler(true);
    console.log(this.game.playerOneBoard.board);
  },
  dropHandler(dragStop) {
    console.log('drag drop');
    if (this.dragStart.isEqualNode(this.cell)) {
      console.log('this.dragStart is a cell');
    }

    if (dragStop && this.cell) {
      this.cell.firstChild.replaceChild(this.draggable, this.dropPlaceholder);
      this.draggable.style.left = `-4%`;
      this.draggable.style.top = `-4%`;
      const x = parseInt(this.cell.dataset.x);
      const y = parseInt(this.cell.dataset.y);
      const shipLength = parseInt(this.draggable.dataset.length);
      // this.game.playerOneBoard.placeShip([x, y], shipLength, false);
      this.cell = null;
    } else if (!dragStop && this.cell) {
      console.log('else block of dropHandler');
      const cellContent = this.cell.firstChild;
      cellContent.appendChild(this.dropPlaceholder);
      this.draggable.classList.add('ship_box_transparent');
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
});
