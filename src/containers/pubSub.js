export default {
  subscribers: {},
  subscribe(subscriber, fn) {
    this.subscribers[subscriber] = this.subscribers[subscriber] || [];
    this.subscribers[subscriber].push(fn);
  },
  unsubscribe(subscriber, fn) {
    if (this.subscribers[subscriber]) {
    }
  },
  publish(subscriber, value) {
    if (this.subscribers[subscriber]) {
      this.subscribers[subscriber].forEach((fn) => fn(value));
    }
  },
};

const foo = () => 'hello world';
const bar = () => 'ello world';
