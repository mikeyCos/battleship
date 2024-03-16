import createElement from '../../../helpers/createElement';
import navbarConfig from './navbar.config';
import '../../../styles/navbar.css';

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
        navChild.setAttributes(item.attributes);
        navChild.setChildren(item.children);
        navElement.appendChild(navChild);
      });

      this.cacheDOM(navElement);
      return navElement;
    },
  };

  return navbar.render();
};
