// Tiny page helpers shared by the screen modules.

export const $ = selector => document.querySelector(selector);

let timer;
/** Show a short message at the bottom of the screen. */
export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { el.hidden = true; }, 3500);
}
