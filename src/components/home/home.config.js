export default [
  {
    element: 'h2',
    attributes: {
      textContent: 'Battleship',
    },
  },
  {
    element: 'section',
    attributes: {
      class: 'gamemode_buttons',
    },
    children: [
      {
        element: 'button',
        attributes: {
          class: 'gamemode_button human_human',
        },
        children: [
          {
            element: 'span',
            attributes: {
              textContent: 'human vs human',
            },
          },
        ],
      },
      {
        element: 'button',
        attributes: {
          class: 'gamemode_button human_computer',
        },
        children: [
          {
            element: 'span',
            attributes: {
              textContent: 'human vs computer',
            },
          },
        ],
      },
    ],
  },
];
