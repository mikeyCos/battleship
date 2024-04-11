import createElement from '../../helpers/createElement';
import portConfig from './port.config';
import pubSub from '../../containers/pubSub';
import board from '../board/board';

export default (player, game, mode, board) => {
  const port = {
    // Rename to portController or shipsController?
    player,
    game,
    mode,
    board,
    init() {
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.dragEndHandler = this.dragEndHandler.bind(this);
      this.dragMoveHandler = this.dragMoveHandler.bind(this);
      this.dropHandler = this.dropHandler.bind(this);
      this.rotateHandler = this.rotateHandler.bind(this);
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.resetHandler = this.resetHandler.bind(this);
      this.readyHandler = this.readyHandler.bind(this);
      this.randomizeHandler = this.randomizeHandler.bind(this);
      this.placeRandom = this.placeRandom.bind(this);

      this.playerBoard =
        player === 'player_one' ? this.game.playerOneBoard : this.game.playerTwoBoard;
      this.dropSubscriber = `drop${player.substring(player.indexOf('_'))}`;
      this.rotateSubscriber = `rotate${player.substring(player.indexOf('_'))}`;
      this.placeRandomSubscriber = `placeRandom${player.substring(player.indexOf('_'))}`;
    },
    cacheDOM(element) {
      this.port = element;
      this.ports = element.querySelectorAll('.port_ship');
      this.ships = element.querySelectorAll('.ship_box');
      this.resetBtn = element.querySelector('.reset_btn');
      this.readyBtn = element.querySelector('.ready_btn');
      this.randomizeBtn = element.querySelector('.randomize_btn');
    },
    bindEvents() {
      this.ships.forEach((ship) => {
        // https://stackoverflow.com/questions/40464690/want-to-perform-different-task-on-mousedown-and-click-event
        ship.addEventListener('mousedown', this.dragStartHandler);
      });

      this.resetBtn.addEventListener('click', this.resetHandler);
      this.readyBtn.addEventListener('click', this.readyHandler);
      this.randomizeBtn.addEventListener('click', this.randomizeHandler);
      pubSub.subscribe(this.dropSubscriber, this.dropHandler);
      pubSub.subscribe(this.rotateSubscriber, this.rotateHandler);
      pubSub.subscribe(this.placeRandomSubscriber, this.placeRandom);
    },
    render() {
      const playerPort = createElement(portConfig.element);
      playerPort.setAttributes(portConfig.attributes);
      playerPort.setChildren(portConfig.children);
      this.cacheDOM(playerPort);
      if (!this.mode) this.readyBtn.classList.add('inactive');

      this.bindEvents();
      return playerPort;
    },
    dragStartHandler(e) {
      this.draggable = e.currentTarget;
      this.dragStart = e.target.parentElement;
      this.dropPlaceholder = this.draggable.cloneNode();
      this.dropPlaceholder.classList.add('ship_box_placeholder');
      this.offSetX = e.clientX;
      this.offSetY = e.clientY;

      console.log(this.draggable);
      this.dragTimer = setTimeout(() => {
        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragEndHandler);
        this.draggable.removeEventListener('click', this.rotateHandler);
      }, 250);

      this.draggable.addEventListener('click', this.rotateHandler, { once: true });
    },
    dragMoveHandler(e) {
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

      const board = document
        .elementsFromPoint(left + offSet, top + offSet)
        .find((element) => element.classList.contains('board'));
      const isPlayerShip = board ? board.parentElement.contains(this.port) : false;
      if (cell && isPlayerShip) {
        // Dragging over drop zone
        // If draggable is more than 50% over it's 'last' cell
        //  Append the draggable to the cell content container
        this.cell = cell;
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);

        const id = this.draggable.dataset.id;
        const orientation = this.draggable.dataset.orientation !== 'h';

        this.playerBoard.placeShip(
          [x, y],
          shipLength,
          orientation,
          true,
          false,
          id,
          this.dropSubscriber,
          this.rotateSubscriber,
        );
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
      this.draggable.style.left = `0px`;
      this.draggable.style.top = `0px`;

      this.draggable.classList.remove('dragging');
      this.draggable.classList.remove('ship_box_transparent');
      this.dragStart.classList.remove('dragstart');

      document.removeEventListener('mousemove', this.dragMoveHandler);
      document.removeEventListener('mouseup', this.dragEndHandler);
      if (this.cell) {
        // If user has stopped dragging over the drop zone
        const x = parseInt(this.cell.dataset.x);
        const y = parseInt(this.cell.dataset.y);
        const shipLength = parseInt(this.draggable.dataset.length);
        const id = this.draggable.dataset.id;
        const orientation = this.draggable.dataset.orientation !== 'h';

        this.playerBoard.placeShip(
          [x, y],
          shipLength,
          orientation,
          false,
          false,
          id,
          this.dropSubscriber,
          this.rotateSubscriber,
        );
      }

      if (!this.dragStart.classList.contains('port_ship') && this.draggable) {
        // If dragStart is not the port_ship element
      }
    },
    dropHandler(isDragging, isValidDrop) {
      if (this.cell) {
        const cellContent = this.cell.firstChild;
        if (isDragging && isValidDrop) {
          // If user is dragging over the drop zone
          cellContent.appendChild(this.dropPlaceholder);
          this.draggable.classList.add('ship_box_transparent');
        } else if (!isDragging && isValidDrop) {
          // If user has stopped dragging over the drop zone
          cellContent.appendChild(this.draggable);
          this.dropPlaceholder.remove();
          if (this.resetBtn.classList.contains('inactive')) {
            this.resetBtn.classList.remove('inactive');
          }

          if (this.isPortsEmpty() && !this.gameReady) {
            this.gameReady = true;
            this.readyBtn.click();
            if (this.mode) this.readyBtn.classList.remove('inactive');
            [...this.port.children].forEach((child) => {
              if (!child.classList.contains('btns_container')) {
                child.style.display = 'none';
              }
            });
          }

          pubSub.publish(`pushShip_${this.player}`, {
            ...this.draggable.dataset,
            style: this.draggable.style.cssText,
          });
        } else if (isDragging && !isValidDrop) {
          // If user is dragging over an invalid drop
          if (this.dropPlaceholder) {
            this.dropPlaceholder.remove();
            this.draggable.classList.remove('ship_box_transparent');
          }
        }
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
          this.cell = this.dragStart.parentElement;
          const x = parseInt(this.cell.dataset.x);
          const y = parseInt(this.cell.dataset.y);
          const shipLength = parseInt(this.draggable.dataset.length);
          const id = this.draggable.dataset.id;
          this.playerBoard.placeShip(
            [x, y],
            shipLength,
            newOrientation,
            false,
            true,
            id,
            this.dropSubscriber,
            this.rotateSubscriber,
          );
        }
        e.stopImmediatePropagation();
      } else if (e === true && parseInt(this.draggable.dataset.length) > 1) {
        this.draggable.dataset.orientation = newOrientation ? 'v' : 'h';
        const newWidth = newOrientation ? this.draggable.style.width : this.draggable.style.height;
        const newHeight = newOrientation ? this.draggable.style.height : this.draggable.style.width;
        const newPaddingRight = newOrientation
          ? this.draggable.style.paddingRight
          : this.draggable.style.paddingBottom;
        const newPaddingBottom = newOrientation
          ? this.draggable.style.paddingBottom
          : this.draggable.style.paddingRight;
        this.draggable.style.width = newOrientation ? newHeight : newWidth;
        this.draggable.style.height = newOrientation ? newWidth : newHeight;
        this.draggable.style.paddingRight = newOrientation ? newPaddingBottom : newPaddingRight;
        this.draggable.style.paddingBottom = newOrientation ? newPaddingRight : newPaddingBottom;
        pubSub.publish(`pushShip_${this.player}`, {
          ...this.draggable.dataset,
          style: this.draggable.style.cssText,
        });
      } else if (e === false) {
        this.draggable.classList.add('rotate_error');

        setTimeout(() => {
          this.draggable.classList.remove('rotate_error');
        }, 250);
      }
    },
    resetHandler(e) {
      // Clears board
      this.gameReady = false;
      const playerBoard = this.resetBtn.closest(
        this.resetBtn.closest('.player_one') ? '.player_one' : '.player_two',
      ).firstChild;

      this.playerBoard.clearBoard();
      this.port.replaceWith(this.render());
      playerBoard.replaceWith(this.board.render());
      pubSub.publish('playerReady', this.player);
    },
    isPortsEmpty() {
      return [...this.ports].every((port) => port.firstChild === null);
    },
    readyHandler(e) {
      const isReady = e.currentTarget.dataset.ready !== 'true';
      e.currentTarget.textContent = isReady ? 'Unready' : 'Ready';
      e.currentTarget.dataset.ready = isReady;
      if (this.mode) this.hideShips(isReady);
      pubSub.publish('playerReady', this.player, isReady);
    },
    randomizeHandler(e) {
      this.resetBtn.click();
      this.playerBoard.placeShipsRandom(this.player.substring(this.player.indexOf('_') + 1));
      if (this.isPortsEmpty() && !this.gameReady) {
        this.gameReady = true;
        // this.readyBtn.click();
        if (this.mode) this.readyBtn.classList.remove('inactive');
        [...this.port.children].forEach((child) => {
          if (!child.classList.contains('btns_container')) {
            child.style.display = 'none';
          }
        });
      }
    },
    hideShips(isReady) {
      this.ships.forEach((ship) => {
        const display = isReady ? 'none' : 'block';
        ship.style.display = display;
      });
    },
    getCellContent([x, y]) {
      // Find cell with dataset.x === x && dataset.y ===y
      // return document.querySelector(`.cell[data-x='${x}'][data-y='${y}'] > .cell_content`);
      return document.querySelector(
        `.${this.player} > * > * > .cell[data-x='${x}'][data-y='${y}'] > .cell_content`,
      );
    },
    getShipBox(shipLength) {
      return document.querySelector(
        `.${this.player} > .port > * > .port_ship > .ship_box[data-length='${shipLength}']`,
      );
      // return [...this.ships].find(
      //   (ship) =>
      //     ship.dataset.length === shipLength && ship.parentElement.classList.contains('port_ship'),
      // );
    },
    placeRandom(shipData) {
      const cellContent = this.getCellContent(shipData.coordinates);
      const shipBox = this.getShipBox(shipData.length);
      const newOrientation = shipData.orientation ? 'v' : 'h';
      if (shipBox.dataset.orientation !== newOrientation) {
        shipBox.dataset.orientation = newOrientation;
        const newWidth = newOrientation ? shipBox.style.width : shipBox.style.height;
        const newHeight = newOrientation ? shipBox.style.height : shipBox.style.width;
        const newPaddingRight = newOrientation
          ? shipBox.style.paddingRight
          : shipBox.style.paddingBottom;
        const newPaddingBottom = newOrientation
          ? shipBox.style.paddingBottom
          : shipBox.style.paddingRight;
        shipBox.style.width = newOrientation ? newHeight : newWidth;
        shipBox.style.height = newOrientation ? newWidth : newHeight;
        shipBox.style.paddingRight = newOrientation ? newPaddingBottom : newPaddingRight;
        shipBox.style.paddingBottom = newOrientation ? newPaddingRight : newPaddingBottom;
      }
      pubSub.publish(`pushShip_${this.player}`, {
        ...shipBox.dataset,
        style: shipBox.style.cssText,
      });
      cellContent.appendChild(shipBox);

      this.playerBoard.placeShip(
        shipData.coordinates,
        shipData.length,
        shipData.orientation,
        false,
        false,
        shipBox.dataset.id,
      );
    },
  };

  port.init();
  return port.render();
};
