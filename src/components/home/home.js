import createElement from '../../helpers/createElement';
import screenController from '../screen/screenController';
import homeConfig from './home.config';
import pubSub from '../../containers/pubSub';
export default () => {
  const home = {
    init() {},
    cacheDOM(element) {
      this.home = element;
      this.header = this.home.querySelector('h2');
      this.modeBtns = this.home.querySelectorAll('.gamemode_button');
      console.log(this.home);
      console.log(this.modeBtns);
    },
    bindEvents() {
      this.setGameMode = this.setGameMode.bind(this);
      this.modeBtns.forEach((btn) => btn.addEventListener('click', this.setGameMode));
    },
    render() {
      const homeContainer = createElement('div');
      homeContainer.id = 'home';

      homeConfig.forEach((item) => {
        const homeChild = createElement(item.element);
        if (item.attributes) homeChild.setAttributes(item.attributes);
        if (item.children) homeChild.setChildren(item.children);
        homeContainer.appendChild(homeChild);
      });

      this.cacheDOM(homeContainer);
      this.bindEvents();
      return homeContainer;
    },
    setGameMode(e) {
      const gamemode = e.currentTarget.classList.value.includes('human');
      pubSub.publish('initGame', gamemode);
    },
  };

  return home.render();
};
