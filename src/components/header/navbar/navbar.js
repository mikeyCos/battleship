import createElement from '../../../helpers/createElement';
import navbarConfig from './navbar.config';
import pubSub from '../../../containers/pubSub';
import '../../../styles/navbar.css';

export default () => {
  const navbar = {
    init() {
      this.revealLeave = this.revealLeave.bind(this);
    },
    cacheDOM(element) {
      this.navbar = element;
      this.navLeave = element.querySelector('.nav_item.leave_game');
    },
    bindEvents() {
      pubSub.subscribe('revealLeave', this.revealLeave);
    },
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
      this.bindEvents();
      return navElement;
    },
    revealLeave(e) {
      this.navLeave.classList.remove('inactive');
    },
  };

  navbar.init();
  return navbar.render();
};
