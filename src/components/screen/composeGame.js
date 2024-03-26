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
    this.draggable = e.target;
    this.dragStart = e.target.parentElement;
    this.draggable.classList.add('dragging');
    this.dragStart.classList.add('dragstart');
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
    // If draggable is over drop zone AND if draggable is more than 50% over it's 'last' cell
    //  Append the draggable to the cell content container
    const draggableRect = this.draggable.getBoundingClientRect();
    const draggableLeft = draggableRect.left;
    const draggableTop = draggableRect.top;
    const draggableWidth = draggableRect.width;
    const shipLength = this.draggable.dataset.length;
    let offSet = (draggableWidth / shipLength) * 0.5;
    let newCell;
    const cell = document
      .elementsFromPoint(draggableLeft + offSet, draggableTop + offSet)
      .find((element) => element.classList.contains('cell'));
    if (newCell !== cell && cell) {
      newCell = cell;
      console.log(typeof cell);
      console.log(cell.firstChild);
      cell.firstChild.appendChild(this.draggable);
      this.draggable.classList.add('ship_box_transparent');
      this.offSetX = e.clientX;
      this.offSetY = e.clientY;
    }
  },
  dragEndHandler(e) {
    console.log('drag end');
    // When mouseup happens
    this.draggable.style.left = `0px`;
    this.draggable.style.top = `0px`;

    // this.dragStart.appendChild(this.draggable);

    this.draggable.classList.remove('dragging');
    this.draggable.classList.remove('ship_box_transparent');
    this.dragStart.classList.remove('dragstart');

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
  },
  dragOverHandler(e) {
    console.log('drag over');
    // e.preventDefault();
    // Need to check if the content container has the draggable
    // If content container does NOT have draggable element
    //  Do content.appendChild(draggable)
    // content.appendChild(draggable);
    // console.log(e.target);
    // console.log(e.currentTarget);
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
  dropHandler(e) {
    e.preventDefault();
    console.log('drag drop');
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
