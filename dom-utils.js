export const QS = selector => document.querySelector(selector);

export const EL = (tagPlus, props = {}, ...children) => {
  const [tag, ...classNames] = tagPlus.split(".");
  const el = document.createElement(tag);
  el.className = classNames.join(" ");
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith("@")) {
      el.addEventListener(key.substring(1), value);
    } else {
      el[key] = value;
    }
  });
  el.append(...children);
  return el;
};
