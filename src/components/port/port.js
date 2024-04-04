import createElement from '../../helpers/createElement';
import portConfig from './port.config';
import pubSub from '../../containers/pubSub';
import board from '../board/board';

export default (player, game) => {
  const port = {
    // Rename to portController or shipsController?
    player,
    game,
    init() {
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.dragEndHandler = this.dragEndHandler.bind(this);
      this.dragMoveHandler = this.dragMoveHandler.bind(this);
      this.dropHandler = this.dropHandler.bind(this);
      this.rotateHandler = this.rotateHandler.bind(this);
      this.dragStartHandler = this.dragStartHandler.bind(this);
      this.resetHandler = this.resetHandler.bind(this);
      this.readyHandler = this.readyHandler.bind(this);

      this.playerBoard =
        player === 'player_one' ? this.game.playerOneBoard : this.game.playerTwoBoard;
      this.dropSubscriber = `drop${player.substring(player.indexOf('_'))}`;
      this.rotateSubscriber = `rotate${player.substring(player.indexOf('_'))}`;
    },
    cacheDOM(element) {
      this.port = element;
      this.ports = element.querySelectorAll('.port_ship');
      this.ships = element.querySelectorAll('.ship_box');
      this.resetBtn = element.querySelector('.reset_btn');
      this.readyBtn = element.querySelector('.ready_btn');
    },
    bindEvents() {
      this.ships.forEach((ship) => {
        // https://stackoverflow.com/questions/40464690/want-to-perform-different-task-on-mousedown-and-click-event
        ship.addEventListener('mousedown', this.dragStartHandler);
      });

      this.resetBtn.addEventListener('click', this.resetHandler);
      this.readyBtn.addEventListener('click', this.readyHandler);

      pubSub.subscribe(this.dropSubscriber, this.dropHandler);
      pubSub.subscribe(this.rotateSubscriber, this.rotateHandler);
    },
    render() {
      const playerPort = createElement(portConfig.element);
      playerPort.setAttributes(portConfig.attributes);
      playerPort.setChildren(portConfig.children);
      this.cacheDOM(playerPort);
      this.bindEvents();
      return playerPort;
    },
    dragStartHandler(e) {
      console.log('drag start');
      this.draggable = e.currentTarget;
      this.dragStart = e.target.parentElement;
      this.dropPlaceholder = this.draggable.cloneNode();
      this.dropPlaceholder.classList.add('ship_box_placeholder');
      this.offSetX = e.clientX;
      this.offSetY = e.clientY;

      this.dragTimer = setTimeout(() => {
        console.log(`adding mousemove and mouseup events`);
        document.addEventListener('mousemove', this.dragMoveHandler);
        document.addEventListener('mouseup', this.dragEndHandler);
        this.draggable.removeEventListener('click', this.rotateHandler);
      }, 250);

      this.draggable.addEventListener('click', this.rotateHandler, { once: true });
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

      const board = document
        .elementsFromPoint(left + offSet, top + offSet)
        .find((element) => element.classList.contains('board'));
      // // console.log(board ? board.parentElement : player);
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
        // this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, true, false, id);
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
        // this.game.playerOneBoard.placeShip([x, y], shipLength, orientation, false, false, id);
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
          console.log(`dragging ended over the drop zone`);
          cellContent.appendChild(this.draggable);
          this.dropPlaceholder.remove();
          this.draggable.style.left = `-4%`;
          this.draggable.style.top = `-4%`;
          if (this.resetBtn.classList.contains('inactive')) {
            this.resetBtn.classList.remove('inactive');
          }

          if (this.isPortsEmpty()) {
            console.log(`ALL SHIPS ARE PLACED ON BOARD`);
            this.readyBtn.classList.remove('inactive');
          }
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
        console.log(`dragging ended outside the drop zone`);
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
          // this.game.playerOneBoard.placeShip([x, y], shipLength, newOrientation, false, true, id);
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
        console.log(`rotateHandler setting styles`);
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
    resetHandler(e) {
      // Clears board
      const playerBoard = this.resetBtn.closest(
        this.resetBtn.closest('.player_one') ? '.player_one' : '.player_two',
      ).firstChild;

      this.playerBoard.clearBoard();
      this.port.replaceWith(this.render());
      playerBoard.replaceWith(board(this.playerBoard.board));
    },
    isPortsEmpty() {
      return [...this.ports].every((port) => port.firstChild === null);
    },
    readyHandler(e) {
      console.log(e.currentTarget);
      const isReady = e.currentTarget.dataset.ready === 'true';
      e.currentTarget.textContent = isReady ? 'Unready' : 'Ready';
      e.currentTarget.dataset.ready = !isReady;
      console.log(this.player);
      pubSub.publish('playerReady', this.player);
    },
  };

  port.init();
  return port.render();
};
