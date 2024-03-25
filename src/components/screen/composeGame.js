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
    const dragStart = e.target.parentElement;
    dragStart.classList.add('dragstart');
    draggable.classList.add('dragging');
    // this.offSetX = e.clientX - draggable.offsetLeft;
    // this.offSetY = e.clientY - draggable.offsetTop;
    // document.addEventListener('mousemove', this.dragMoveHandler);
  },
  dragMoveHandler(e) {
    console.log('drag move');
    console.log(`x: ${e.clientX}, y: ${e.clientY}`);
    console.log(e.target);
    // const draggable = document.querySelector('.dragging');
    // draggable.style.left = `${e.clientX - this.offSetX}px`;
    // draggable.style.top = `${e.clientY - this.offSetY}px`;
  },
  dragEndHandler(e) {
    console.log('drag end');
    const dragStart = document.querySelector('.dragstart');
    e.target.classList.remove('dragging');
    dragStart.appendChild(e.target);
    // draggable.style.left = `0px`;
    // draggable.style.top = `0px`;
    // document.removeEventListener('mousemove', this.dragMoveHandler);
    // document.removeEventListener('mouseup', this.dragEndHandler);
  },
  dragOverHandler(e) {
    e.preventDefault();
    // Need to check if the content container has the draggable
    // If content container does NOT have draggable element
    //  Do content.appendChild(draggable)
    // content.appendChild(draggable);
    console.log('drag over');
    // const draggable = document.querySelector('.dragging');
    // if (!e.target.contains(draggable)) {
    //   e.target.appendChild(draggable);
    // }
  },
  dragEnterHandler(e) {
    console.log('drag enter');
    console.log(e.target);
    const draggable = document.querySelector('.dragging');
    if (!e.target.contains(draggable)) {
      e.target.appendChild(draggable);
    }
  },
  dragLeaveHandler(e) {
    e.preventDefault();
    const draggable = document.querySelector('.dragging');

    // If draggable has NOT been dropped then it leaves the drop zone and is dropped outside the drop zone
    //  It needs to return to it's original draggable starting location(?)
    // If draggable has been dropped in the drop zone then dragged again and dropped outside the drop zone
    //  It needs to return to where it was dropped in the drop zone(?)
    console.log('drag leave');
  },
  dropHandler(e) {
    e.preventDefault();
    console.log('drag drop');
    const draggable = document.querySelector('.dragging');
    if (!e.target.contains(draggable)) {
      e.target.appendChild(draggable);
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
