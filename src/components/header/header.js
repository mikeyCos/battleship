import createElement from '../../helpers/createElement';
import headerConfig from './header.config';
import navbar from './navbar/navbar';
import notifications from './notifications/notifications';

export default () => {
  const header = {
    init() {},
    cacheDOM(element) {
      this.header = element;
    },
    bindEvents() {},
    render() {
      const headerElement = createElement('header');
      headerElement.id = 'header';
      headerElement.appendChild(navbar());
      headerElement.appendChild(notifications());
      this.cacheDOM(headerElement);

      return headerElement;
    },
  };

  return header.render();
};
