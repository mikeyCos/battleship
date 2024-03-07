import '@iconfu/svg-inject';
import createElement from './helpers/createElement';
import buildHeader from './components/header/header';
import './app.css';

(() => {
  const build = {
    header: buildHeader,
  };

  const app = {
    init() {
      this.render();
    },
    render() {
      const appWrapper = createElement('div');
      const appContent = createElement('div');
      appWrapper.id = 'battleship_app';
      appContent.id = 'content';

      appWrapper.appendChild(build.header());
      appWrapper.appendChild(appContent);
      document.body.appendChild(appWrapper);
    },
  };

  app.init();
})();
