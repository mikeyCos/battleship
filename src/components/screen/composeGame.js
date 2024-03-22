import pubSub from '../../containers/pubSub';

export default (state) => ({
  // init() {
  //   pubSub.publish('notify', 'Place ships');
  //   this.start = this.start.bind(this);
  //   this.renderShip = this.renderShip.bind(this);
  // },
  offSetX: 0,
  offSetY: 0,
  renderShip(element) {
    // This will append to the content div
    console.log(element);
  },
  dragStartHandler(e) {
    console.log('drag start');
    const draggable = e.target;
    draggable.classList.add('dragging');
    this.offSetX = e.clientX - draggable.offsetLeft;
    this.offSetY = e.clientY - draggable.offsetTop;
    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);
  },
  dragMoveHandler(e) {
    console.log('drag move');
    console.log(`x: ${e.clientX}, y: ${e.clientY}`);
    console.log(e.target);
    console.log(document.elementsFromPoint(e.clientX, e.clientY));
    const draggable = document.querySelector('.dragging');
    draggable.style.left = `${e.clientX - this.offSetX}px`;
    draggable.style.top = `${e.clientY - this.offSetY}px`;
  },
  dragEndHandler(e) {
    console.log('drag end');
    const draggable = document.querySelector('.dragging');
    draggable.style.left = `0px`;
    draggable.style.top = `0px`;
    draggable.classList.remove('dragging');
    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);
  },
  dragOverHandler(e) {
    e.preventDefault();
    // Need to check if the content container has the draggable
    // If content container does NOT have draggable element
    //  Do content.appendChild(draggable)
    // content.appendChild(draggable);
    console.log('drag over');
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
