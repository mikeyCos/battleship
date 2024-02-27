# Changelog
---
### 27 FEB 2024
- Attempted to inherit private properties from `player` factory function into `isHuman` and `isHuman` modules.
- Branch `factory-classes-revision`.
- Revised factory functions for `player`/`isHuman`/`isComputer` into classes.
- Renamed `isHuman` to `human` and `isComputer` to `computer`.
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
- The `player` factory function has a `human` parameter to determine whether or not the player is human or a computer.
---
### 21 FEB 2024
- Created `getStatus` method for a gameboard object.
- The `getStatus` method returns a boolean; true if all ships on the gameboard have been sunk, otherwise false. 
---
### 20 FEB 2024
- Created `gameboard` and `gameboard.test` modules.
- The `gameboard` factory function currently returns an object with `board`/`receivedAttack`/`placeShip` properties/methods.
- The `placeShip` method somewhat works for horizontally/vertically orientated ships.
---
### 19 FEB 2024
- Initial commit for Battleship project.
- Created `ship` and `ship.test` modules.
- The `ship` factory function currently returns an object with `hit` and `isSunk` methods.
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