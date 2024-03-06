# Changelog
---
### 05 MAR 2024
- Created `screenController` and `createElement` modules.
- Changed `gameController` from an object literal to a factory function; public properties/methods are subject to change.
- Renamed `index.js` and `index.css` to `app.js` and `app.css`.
- The `app.js` module will use an Immediately Invoked Function Expression (IIFE) to render the page on load.
---
### 04 MAR 2024
- Created `switchPlayers` and `playRound` methods to the `gameController` module.
- If the parameter for `switchPlayers` is undefined, `this.activePlayer` will be pseudo-randomly selected.
- Changed variable declaration from `const playerOneBoard` to `this.playerOneBoard`.
---
### 29 FEB 2024
- Created `gameController.test` module.
- The parameters for the `Player` factory function now utilizes array deconstruction into `playerBoard`, and `opponentBoard` parameters.
- Restored `value` parameter as `values` for the `pipe` function by first spreading the arguments into a `values` array; this will allow any number of values to pass into the initial function, if needed.
- Commit before creating the branch `player-board-revision`.
---
### 28 FEB 2024
- The `pipe` function now has two parameters, `initalFn` and `...fns`; the `initalFn` will dictate the state for the remaining factory functions' return values.
- The `Object.assign()` method is used inside the `pipe` function ensures the state of the accumulator is assigned to the current value.
- The `Player` factory function now initializes a `state` object in scope and returns it.
- The `isComputer` and `isHuman` modules now take a `player` parameter; in this case, the value of `player` is the `state` object returned from the `Player` factory function.
- Created `checkCoordinate` method in the `gameboard` module that checks if a given coordinate is within the gameboard's dimensions.
- Initialized `gameController` module; this will control the main game loop for battleship.
---
### 27 FEB 2024
- Created branches `factory-classes-revision` and `factory-revision`.
---
### 26 FEB 2024
- Created `checkBoard` method that returns a boolean based on a coordinate and it's neighboring coordinates; the board's element at the coordinate and it's neighboring coordinates must be `undefined` to return true.
- The `checkBoard` method currently works only for when the coordinate is the beginning of a ship.
- Added `beforeEach` in `gameboard.test` module to reinitiate the gameboard, placing and attacking ships.
- Added a `getter` to the ship and gameboard objects. 
---
### 23 FEB 2024
- Deleted `computer.test` module.
- Created `isComputer`/`isHuman`/`pipe` modules.
- The pipe function combines passed in factory functions and returns an object.
- Implemented a `beforeEach` in `player.test` module to reset each player and their board.
- Updated CHANGELOG.md.
---
### 22 FEB 2024
- Created `computer`/`computer.test`/`player`/`player.test` modules.
- In order for players to attack opponent's, player object will have `getPlayerBoard` and `setOpponentBoard` public methods.
- The `Player` factory function has a `human` parameter to determine whether or not the player is human or a computer.
---
### 21 FEB 2024
- Created `getStatus` method for a gameboard object.
- The `getStatus` method returns a boolean; true if all ships on the gameboard have been sunk, otherwise false. 
---
### 20 FEB 2024
- Created `gameboard` and `gameboard.test` modules.
- The `Gameboard` factory function currently returns an object with `board`/`receivedAttack`/`placeShip` properties/methods.
- The `placeShip` method somewhat works for horizontally/vertically orientated ships.
---
### 19 FEB 2024
- Initial commit for Battleship project.
- Created `ship` and `ship.test` modules.
- The `Ship` factory function currently returns an object with `hit` and `isSunk` methods.
---
### 15 FEB 2024
- Installed npm packages: `jest`, `babel/core`, `babel/preset-env`, and `babel-jest`.
- Added `babel.config.js` file to target current version of Node.
- Changed test script to `jest --testPathPattern=src/testing`.
- Created `containers` and `testing` sub-directories inside `src` directory.
- Starting files `sum` and `sum.test` generated for temporary testing.
- Fixed repeated text in `CHANGELOG.md`.
---
### 14 JAN 2024
- Reformatted `CHANGELOG.md`.
- Updated instructions in `README.md`.
---
### 27 OCT 2023
- Initial `module-webpack-starter` structure created.
- ESLint and Prettier enabled for the module.
- Configuration files for ESLint and Prettier created.
- `README.md` included with instructions and notes.
- Placeholder directories created in components.
- Added `.eslintrc.json` to `.prettierignore`.  
---