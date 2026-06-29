// Lightweight event emitter for cross-component toast notifications.
// No context provider needed — just import and call showToast() from anywhere.

const emitter = new EventTarget();

/**
 * @param {string} message  - Body text
 * @param {'info'|'success'|'warning'|'error'} type
 * @param {string} [title]  - Optional bold title line
 */
export const showToast = (message, type = 'info', title = '') => {
  emitter.dispatchEvent(
    new CustomEvent('toast', { detail: { message, type, title, id: Date.now() } })
  );
};

export { emitter as toastEmitter };
