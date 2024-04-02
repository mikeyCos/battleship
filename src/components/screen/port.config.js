export default [
  {
    element: 'div',
    attributes: {
      class: 'port',
    },
    children: [
      {
        element: 'p',
        attributes: {
          textContent: 'Drag the ships to the grid, and then click to rotate:',
        },
      },
      {
        element: 'div',
        attributes: {
          class: 'port_lines',
        },
        children: [
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 8em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  ['data-id']: '',
                  ['data-length']: '4',
                  ['data-orientation']: 'h',
                  style: 'width: 8em; height: 2em;',
                },
              },
            ],
          },
        ],
      },
      {
        element: 'div',
        attributes: {
          class: 'port_lines',
        },
        children: [
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 6em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '3',
                  ['data-orientation']: 'h',
                  style: 'width: 6em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 6em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '3',
                  ['data-orientation']: 'h',
                  style: 'width: 6em; height: 2em;',
                },
              },
            ],
          },
        ],
      },
      {
        element: 'div',
        attributes: {
          class: 'port_lines',
        },
        children: [
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 4em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '2',
                  ['data-orientation']: 'h',
                  style: 'width: 4em; height: 2em;',
                },
              },
            ],
          },
        ],
      },
      {
        element: 'div',
        attributes: {
          class: 'port_lines',
        },
        children: [
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 2em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '1',
                  ['data-orientation']: 'h',
                  style: 'width: 2em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 2em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '1',
                  ['data-orientation']: 'h',
                  style: 'width: 2em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 2em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '1',
                  ['data-orientation']: 'h',
                  style: 'width: 2em; height: 2em;',
                },
              },
            ],
          },
          {
            element: 'div',
            attributes: {
              class: 'port_ship',
              style: 'width: 2em; height: 2em;',
            },
            children: [
              {
                element: 'div',
                attributes: {
                  class: 'ship_box',
                  // draggable: 'true',
                  ['data-id']: '',
                  ['data-length']: '1',
                  ['data-orientation']: 'h',
                  style: 'width: 2em; height: 2em;',
                },
              },
            ],
          },
        ],
      },
      {
        element: 'div',
        attributes: {
          class: 'btns_container',
        },
        children: [
          {
            element: 'div',
            attributes: {
              class: 'reset',
            },
            children: [
              {
                element: 'button',
                attributes: {
                  class: 'reset_btn',
                },
                children: [
                  {
                    element: 'span',
                    attributes: {
                      textContent: 'Reset',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
