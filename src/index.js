import './index.css';
import Gameboard from './containers/gameboard';

const foo = Gameboard();
foo.placeShip([2, 8], true);
foo.placeShip([5, 3], false);
console.log(foo.board);
