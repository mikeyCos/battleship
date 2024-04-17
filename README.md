# Readme
---
## Live preview: [Battleship](https://mikeycos.github.io/battleship/)
---
### Ideas
1. :heavy_check_mark: Implement randomize functionality for human players.
2. Create a 'pass' screen that allows players to hide their ships after the previous player attacked.
3. Implement the ability for players to continue attacking after successful attacks.
---
### Notes
* Lorem ipsum
---
### Questions
1. If I create a gameboard object inside my `Player` factory function, will this make the factory function tightly coupled to a gameboard object?

For example:
```
const Player = () => {
  const playerBoard = Gameboard();
  ...other code
};
```
2. 
---
### About
Project: Battleship

Hello world,

It has been a long time coming and I am pleased with the current state of the project. From creating Jest tests, to building the game logic, to testing, to 'connecting' a user interface with the game's logic, and implementing drag-drop functionality; this project is a behemoth. 