import './index.css';
import Gameboard from './containers/gameboard';

const foo = Gameboard();
// foo.placeShip([5, 3], false);
foo.placeShip([2, 8], true);
console.log(foo.board);
