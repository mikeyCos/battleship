# Readme
---
## Live preview: [Battleship](https://mikeycos.github.io/battleship/)
---
### Ideas
1. :heavy_check_mark: Implement randomize functionality for human players.
2. Create a 'pass' screen that allows players to hide their ships after the previous player attacked.
3. Implement the ability for players to continue attacking after successful attacks.
4. Implement touch screen capability.
---
### Notes
* Not mobile or tablet friendly.
---
### Questions
1. If I create a gameboard object inside my `Player` factory function, will this make the factory function tightly coupled to a gameboard object?

For example:
```js
const Player = () => {
  const playerBoard = Gameboard();
  ...other code
};
```
2. Can a function have too many parameters? It this considered a code smell? For example, the `placeShip` method in the `gameboard` module.
```js
const placeShip = (
  coordinates,
  shipLength,
  orientation,
  isDragging,
  isRotating,
  id,
  dropSubscriber,
  rotateSubscriber,
) => { ...code };
```

3. In the `compopseGame` module, why does the force parameter, `this.playersReady.length !== 2`, for the `.classList.toggle()` allow the ability to toggle `'inactive'` class name instead of `this.playersRead.length === 2`?
---
### About
Project: Battleship

Hello world,

It has been a long time coming and I am pleased with the current state of the project. From creating Jest tests, to building the game logic, to testing, to 'connecting' a user interface with the game's logic, and implementing drag-drop functionality; this project is a behemoth.

Creating/implementing tests, figuring out what to test and how much to test was very uncomfortable. I am not too fond with testing, however, I know it is important. Testing helped lessen the worry if the game's logic will work when a user interface was implemented. There were a few cases where I needed to update some tests because of adding more parameters to functions; for example, adding parameters to the gameboard's `placeship` method to accommodate the implementation for drag/drop and the ability to rotate a ship.

The most time consuming and mind boggling part of this project involves translating the logic to a user interface. I resorted to what I was familiar with and used object literals to render, cache DOM elements and bind events. Initially, I planned the `screenController` module to fully control the user interface and the module quickly grew. I somewhat separated it's responsibility based on the current game's state; if `gameReady` is false, then only certain methods can or are activated. Unfortunately, once `gameReady` is true, it will have it's initial assigned methods and variables.

One of the most challenging implementations I somehow completed, the ability to drag and drop ships on a player's respective board. I tried using the built-in HTML drag and drop API, but I was not able to figure out how to drag a ship and keep the ship on or near a user's mouse cursor. Another complication I ran into, how do I communicate with the gameboard's `placeship`
a ship is still being dragged or a drop has happened? I needed to pass in boolean values and subscriber names in order to publish their corresponding subscribers.

Furthermore, I needed to figure out how to update a ship's location. In a quick and dirty way, I recorded the row, column and ship's id in a `memo` array. If a user, drags or rotates a ship that has already been placed on the board, then it's old location is essentially erased by reassigning the cell's location with a 'blank' cell; i.e. `board[row][col] = Cell();`.

I took advantaged of a publish-subscribe pattern throughout the project. Modules that include an `init` or `bindEvents` function/method, will include a `pubSub.subscriber(subscriberName, handler)` call. Note, the `port` module will assign a subscriber name based on a player. For example, if player is `player_one`, then `this.dropSubscriber` will be `drop_one`, because the gameboard will need to know the subscriber corresponding to a player who is placing a ship and then their board can render appropriately. This method of defining a subscriber name is important for the `randomizeHandler` method communicating with the gameboard's `placeShipsRandom` method which will communicate to the port's `placeRandom` method, publishes a `pushShip_` and finally calls `this.playerBoard.placeShip`.

In order to remember a ships in-line styles during the 'place ships' phase, the `board`'s `pushShip` method will push a ship's data or updates an existing ship's data. The ship's data consists of the element's `cssText`, `id`, `length`, and `orientation`. Now the board can render and apply those attributes when the game is in a playing state. I could have saved those attributes inside the ship's object but I wanted to keep user interface-related information at a minimal in the gameboard's logic.

There are definitely a handful of things I wish I done differently or that I could stare at the screen for countless of hours and come up with a solution, for example having the `screenController` create an object with `composeGame` methods/properties and when the game goes from a 'place ships' phase to 'playing' phase, then the `screeController` will create an object with `playGame` methods/properties. I also identified a possible code smell with the `gameboard`'s `placeShip` method for having too many parameters. One idea, I could pass in an object with those parameters as properties and deconstruct them.

I used this, [Online Battleship](http://en.battleship-game.org/), for design and functionality inspiration. I attempted to reverse engineer the way the board, ships, and hits/misses styling appear and how drag-drop impacted the board or the ships themselves.

Despite the headaches and staring sessions, I am happy how the project evolved and finally came together. Sure, there are things I would like to implement, but I like to respect the idea of "enough is enough." There can or needs to be a state for which I can say that I am done with a project.

To failing forward, cheers!
---
### Instructions
1. Click on [Battleship](https://mikeycos.github.io/battleship/)
2. Pick a game mode by clicking the `human vs human` or `human vs computer` button.
  * Once a game mode button is clicked, a player or players can click on `Leave game` to be brought back to the 'homepage' to select a game mode.
3. Place ships
  * All sides of a ship must have at least one empty adjacent cell, expect for the ship's side next to the board's edge.
  * Drag and drop ships onto the player's corresponding board; (left-click and hold the ship with the mouse).
  * Click the `Randomize` button.
  * If a user wants to start over, then click the `Reset` button.
  * Clicking a ship that is on a board will rotate it, if there is space. If there is no space, the ship will shake and have a red outline for a brief moment.
4. Start game
  * Game mode - Human vs Human
    * All ships for each player must be placed on their boards.
    * Both players must click the `Ready` button; a player is ready when `Unready` is visible.
    * Click the `Play` button.
  * Game mode - Human vs Computer
    * Click the `Play` button.
5. The current player is pseudo-randomly selected and displayed in the notification's container at the top of the page.
  * The current player attacks the opponent's board.
  * The current player's board is slightly opaque while the opponent's board is clearly visible.
6. Click a cell to attack.
  * A valid cell to attack will be outlined green upon mouse hover.
  * If a cell that is not outlined green is clicked, no attack is registered; click a cell that is outlined green.
7. The game is over when all of a player's ships are sunk.
  * A game over notification will 'cover' the screen.
  * Click the `Play Again` button to choose game mode.