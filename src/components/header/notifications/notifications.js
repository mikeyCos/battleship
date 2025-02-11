import createElement from '../../../helpers/createElement';
import pubSub from '../../../containers/pubSub';
import notificationsConfig, { container } from './notifications.config';
import '../../../styles/notifications.css';

export default () => {
  const notifications = {
    init() {
      this.render = this.render.bind(this);
    },
    cacheDOM(element) {
      this.notificationContainer = element;
    },
    bindEvents() {
      pubSub.subscribe('notify', this.render);
    },
    render(type, player) {
      const messageType = type ? type : 'default';
      const notificationContainer = createElement(container.element);
      notificationContainer.setAttributes(container.attributes);
      notificationContainer.setChildren(container.children);
      const notificationWrapper = notificationContainer.firstChild;

      const message = notificationsConfig.options.find((message) => message.type === messageType);
      if (player) {
        message.createAttributes(player);
      }
      const notificationMessage = createElement(notificationsConfig.element);
      notificationMessage.setAttributes({
        ...notificationsConfig.attributes,
        ...message.attributes,
      });
      notificationContainer.classList.add(message.type);
      notificationWrapper.appendChild(notificationMessage);

      if (type) {
        this.notificationContainer.replaceWith(notificationContainer);
        if (message.sibling) notificationWrapper.setChildren(message.sibling);
      }

      this.cacheDOM(notificationContainer);
      this.bindEvents();
      if (!player) return notificationContainer;
    },
  };

  notifications.init();
  return notifications.render();
};
