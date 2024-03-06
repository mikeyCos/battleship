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
});

export default (tag) => {
  const htmlElement = document.createElement(tag);

  return Object.assign(htmlElement, BuildElement(htmlElement));
};
