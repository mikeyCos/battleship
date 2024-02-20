import Ship from '../containers/ship';
// REMEMBER you only have to test your object’s public interface.
// Only methods or properties that are used outside of your ‘ship’ object need unit tests.
describe(`Checks ship object has hit and isSunk methods`, () => {
  const foo = Ship();
  test(`Ship object has hit method`, () => {
    expect(foo.hit).toBeDefined();
  });

  test(`Ship object has isSunk method`, () => {
    expect(foo.isSunk).toBeDefined();
  });
});
