// https://medium.com/dailyjs/building-and-composing-factory-functions-50fe90141374
export default (...fns) =>
  (value) => {
    return fns.reduce((obj, fn) => {
      return fn(obj);
    }, {});
  };
