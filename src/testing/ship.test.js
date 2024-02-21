import Ship from '../containers/ship';
// REMEMBER you only have to test your object’s public interface.
// Only methods or properties that are used outside of your ‘ship’ object need unit tests.

const foo = Ship(5);
describe(`Checks ship object has specific public methods/properties`, () => {
  test(`Ship object has hit method`, () => {
    expect(foo.hit).toBeDefined();
  });

  test(`Ship object has isSunk method`, () => {
    expect(foo.isSunk).toBeDefined();
  });
});

describe(`Checks ship.hit and ship.isSunk`, () => {
  test(`Ship object is hit it's length times`, () => {
    while (!foo.isSunk()) {
      foo.hit();
    }
    expect(foo.isSunk()).toBeTruthy();
  });
});
