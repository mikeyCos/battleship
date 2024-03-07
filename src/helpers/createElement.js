const BuildElement = (state) => ({
  setAttributes: (attributes) => {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'textContent') {
        state.setAttribute(key, value);
      } else {
        state.setTextContent(value);
      }
    });
  },
  setTextContent: (text) => {
    state.textContent = text;
  },
  setChildren: (children) => {
    children.forEach((child) => {
      const childElement = createElement(child.element);
      if (child.attributes) childElement.setAttributes(child.attributes);
      if (child.children) {
        // What if child of child.children has children?
        childElement.setChildren(child.children);
      }
      state.appendChild(childElement);
    });
  },
});

export default function createElement(tag) {
  const htmlElement = document.createElement(tag);

  return Object.assign(htmlElement, BuildElement(htmlElement));
}
