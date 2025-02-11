export default {
  element: 'div',
  attributes: {
    class: 'notification_message',
  },
  options: [
    {
      type: 'default',
      attributes: {
        textContent: 'Pick game mode',
      },
    },
    {
      type: 'place',
      attributes: {
        textContent: 'Place ships',
      },
    },
    {
      type: 'turn',
      createAttributes(text) {
        const player = text;
        this.attributes = { textContent: `Player ${player}'s turn.` };
      },
    },
    {
      type: 'gameover',
      createAttributes(text) {
        const player = text;
        this.attributes = { textContent: `Game over. Congratulations, player ${player} won!` };
      },
      sibling: [
        {
          element: 'a',
          attributes: {
            href: 'index.html',
            target: '_self',
            class: 'play_again',
            textContent: 'Play Again',
          },
        },
      ],
    },
  ],
};

export const container = {
  element: 'div',
  attributes: {
    id: 'notifications_container',
  },
  children: [
    {
      element: 'div',
      attributes: {
        class: 'notification_wrapper',
      },
    },
  ],
};
