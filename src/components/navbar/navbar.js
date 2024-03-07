import createElement from '../../helpers/createElement';
import navbarConfig from './navbar.config';

export default () => {
  const navbar = {
    init() {},
    cacheDOM(element) {
      this.navbar = element;
    },
    bindEvents() {},
    render() {
      const navElement = createElement('nav');
      navElement.id = 'navbar';

      navbarConfig.forEach((item) => {
        const navChild = createElement(item.element);
        navChild.setChildren(item.children);
        navElement.appendChild(navChild);
      });

      this.cacheDOM(navElement);
      return navElement;
    },
  };

  return navbar.render();
};
