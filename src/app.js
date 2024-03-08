import '@iconfu/svg-inject';
import createElement from './helpers/createElement';
import buildHeader from './components/header/header';
import buildMain from './components/main/main';
import './app.css';

(() => {
  const build = {
    header: buildHeader,
    main: buildMain,
  };

  const app = {
    init() {
      this.render();
    },
    render() {
      const appWrapper = createElement('div');
      appWrapper.id = 'battleship_app';

      appWrapper.appendChild(build.header());
      appWrapper.appendChild(build.main());
      document.body.appendChild(appWrapper);
    },
  };

  app.init();
})();
