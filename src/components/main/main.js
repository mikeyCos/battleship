import createElement from '../../helpers/createElement';
import screenController from '../screen/screenController';
import mainConfig from './main.config';
import buildHome from '../home/home';
import pubSub from '../../containers/pubSub';
import gameInit from '../gameInit/gameInit';

export default () => {
  const build = {
    home: buildHome,
    game: gameInit,
  };
  const main = {
    init() {},
    cacheDOM(element) {
      this.main = element;
      console.log(this.main);
    },
    bindEvents() {
      this.render = this.render.bind(this);
      pubSub.subscribe('initGame', this.render);
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
      }
    },
  };

  return main.render();
};
