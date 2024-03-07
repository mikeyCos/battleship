import createElement from '../../helpers/createElement';
import headerConfig from './header.config';
import navbar from '../navbar/navbar';

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
      this.cacheDOM(headerElement);

      return headerElement;
    },
  };

  return header.render();
};
