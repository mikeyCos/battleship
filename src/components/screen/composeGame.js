import pubSub from '../../containers/pubSub';

export default (state) => ({
  // init() {
  //   pubSub.publish('notify', 'Place ships');
  //   this.start = this.start.bind(this);
  //   this.renderShip = this.renderShip.bind(this);
  // },
  renderShip(element) {
    // This will append to the content div
    console.log(element);
  },
  dragStartHandler(e) {
    console.log('drag start');
    // e.target.style.display = 'none';
    // e.dataTransfer.setData('text/plain', e.target.className);
    e.dataTransfer.dropEffect = 'move';
  },
  dragOverHandler(e) {
    // e.preventDefault();
    // e.dataTransfer.dropEffect = 'move';
    console.log('drag over');
  },
  dropHandler(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    // e.target.appendChild(document.getElementsByClassName(data));
    console.log('drop');
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
    const btn = e.target;
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    if (!isNaN(x) || !isNaN(y)) {
      // Place ship
      console.log(`Placing a ship starting at [${x}, ${y}]`);
      this.game.playerOneBoard.placeShip([2, 2], 3, false);
      this.game.playerTwoBoard.placeShip([6, 2], 3, false);
      this.renderShip(btn);
    }
  },
});
