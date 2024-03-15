import createElement from '../../../helpers/createElement';
import pubSub from '../../../containers/pubSub';

export default () => {
  const notifications = {
    init() {
      this.updateNotification = this.updateNotification.bind(this);
    },
    cacheDOM(element) {
      this.notificationMessage = element.querySelector('#notification_message');
    },
    bindEvents() {
      pubSub.subscribe('notify', this.updateNotification);
    },
    render() {
      const notificationsContainer = createElement('div');
      const notificationMessage = createElement('div');

      notificationsContainer.classList.add('notifications_container');
      notificationMessage.setAttributes({
        id: 'notification_message',
        textContent: 'Pick game mode',
      });

      notificationsContainer.appendChild(notificationMessage);
      this.cacheDOM(notificationsContainer);
      this.bindEvents();

      return notificationsContainer;
    },
    updateNotification(something) {
      this.notificationMessage.textContent = something;
    },
  };

  notifications.init();
  return notifications.render();
};
