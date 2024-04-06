import createElement from '../../helpers/createElement';
import screenController from '../screen/screenController';
import buildHome from '../home/home';
import pubSub from '../../containers/pubSub';

export default () => {
  const build = {
    home: buildHome,
    game: screenController,
  };
  const main = {
    init() {
      this.render = this.render.bind(this);
    },
    cacheDOM(element) {
      this.main = element;
      console.log(this.main);
    },
    bindEvents() {
      pubSub.subscribe('main_render', this.render);
    },
    render(mode) {
      if (mode === undefined) {
        const mainContainer = createElement('div');
        mainContainer.id = 'main_content';
        mainContainer.appendChild(build.home());
        this.cacheDOM(mainContainer);
        this.bindEvents();
        return mainContainer;
      } else {
        this.main.firstElementChild.replaceWith(build.game(mode));
        pubSub.publish('revealLeave');
      }
    },
  };

  main.init();
  return main.render();
};
