# Changelog
---
### 25 MAR 2024
- Attempted to mimic the HTML Drag and Drop API with vanilla JavaScript.
- Draggable elements currently jump around and an offset keeps adding to the current dragging element; space between the cursor and dragging element keeps increasing.
---
### 22 MAR 2024
- Added row containers to each player's board.
- Attempted to create custom drag and drop behavior.
- Applied a font-size of 16px to the all selector in the `app` stylesheet.
- Created `setStyle` method for the `createElement` helper; this will be called if a style property of attributes exists and sets an element's `.style.cssText` property to a given text. For example:
```js
attributes: {
              class: 'box',
              style: 'width: 2px; height: 2px;',
            }
```
- Commit before creating `drag_drop` branch.
---
### 21 MAR 2024
- Created `port.config` file.
---
### 19 MAR 2024
- The `renderWait` gets subscribed and published when `switchPlayers` is called from the `gameController`.
- Renamed `renderGameOver` to `endGame` and is subscribed and published when a game is over.
- If player two is a computer, the board will be marked when they attack.
- Initialized a port for player one and started experimenting with the HTML Drag and Drop API.
- The drop over event currently fires near and inside the drop zone.
- Created `header`/`home`/`notification`/`port` CSS files.
- Applied basic CSS properties.
---
### 18 MAR 2024
- Created `attack` method for `Cell` objects; this will set `hit`/`miss` properties to true.
- Attempted to create different 'states' of a `screenController` object to have specific methods or properties during specific 'states'.
- The `receiveAttack` method for a `Gameboard` object will publish to a subscriber `renderAttack`.
---
### 16 MAR 2024
- Created the `updateGameState` method to assign the `screenController` object properties from `composeGame` or `playGame` returned objects.
- Created `composeGame` and `playGame` modules; `composeGame` returns an object with the following methods `renderShip`/`reset`/`start`/`boardHandler` and `playGame` returns an object with the following methods `unbindEvents`/`renderAttack`/`renderWait`/`renderGameOver`/`boardHandler`.
---
### 15 MAR 2024
- Created `parseCoordinate` and `validateAttack` methods for the `Gameboard` object; `parseCoordinate` returns a new array with values representing indexes for the two dimensional array, and `validateAttack` parses and validates whether or not the coordinate to be attacked has already been attacked or is within the game board size.
- The `boardHandler` method in `screenController` now checks if a cell has ever been clicked by calling the active players' gameboard's `getBoardCell` to check if the cell properties,`.hit`/`.miss`,  are false; if either property's value is true, then nothing will happen.
- Added another navbar item with the intent to go to the home page.
- Commit before merging `screenController` branch to `main`.
---
### 14 MAR 2024
- A player's own ship can be seen when it is their turn.
- Miss shots and hits are now shown on each board.
- Removed shots array from `Player` factory function.
- Fixed test for `Player` object by flattening player one's board and checking if the miss property of every array element is `true`.
---
### 13 MAR 2024
- New branch, `screenController`, created.
- A game starts when the `game_start_btn` is clicked; player two's board becomes the opponent's grid when it is player one's turn, and player one's board becomes the opponent's grid when it is player two's turn.
---
### 12 MAR 2024
- Only unique function/handlers can be subscribed to it's subscribers' array.
- Created `renderShip`/`renderAttack`/`renderWait`/`getBoardCell` in the `screenController` module.
- The `getBoardCell` method returns the active player's opponents' board cell based on where a user attacks.
- The `renderWait` method adds/removes a class and adds/removes an event listener, so each player can only click their opponent's board.
---
### 11 MAR 2024
- Created `Cell` factory function in the `gameboard` module to return a `Cell` object that is initialized with `ship`/`hit`/`miss` properties; this object will help accommodate when gameboards are rendered.
- The `placeShip` method for a `Gameboard` object reassigns the property value for `ship`.
- Updated test modules that depend on the `gameboard` module to accommodate the changes in the `gameboard` module.
---
### 07 MAR 2024
- Created the `gameInit` module that temporarily renders the initial game state(?); the module is planned to allow user(s) to place their ships and then start game.
- Moved `screenController` into the `components` subdirectory; the module is planned to control the visual representation of the board.
- Subscribers subscribe with `pubSub` can now be unsubscribed; finds the index of a subscriber's function and slices it from the array.
- Buttons that are rendered by the `home` module will publish the render method in the `main` module and `gameInit` is called.
---
### 06 MAR 2024
- Created `footer`/`header`/`main` directories and modules.
- Added a `setChildren` method to the `createElement` module; it takes an array and appends children to the parent element and if calls itself if a children element has children.
- Closures are planned to be used for component modules; object literal is declared inside the default function exported.
- Installed `@iconfu/svg-inject` version 1.2.3 to `devDependencies` in `package.json`.
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