const { createFocusTrap } = require('../../dist/focus-trap');

const container = document.getElementById('positive-tabindex');

const focusTrap = createFocusTrap(container, {
  onActivate: () => (container.className = 'trap is-active'),
  onDeactivate: () => (container.className = 'trap')
});

document
  .getElementById('activate-positive-tabindex')
  .addEventListener('click', focusTrap.activate);
document
  .getElementById('deactivate-positive-tabindex')
  .addEventListener('click', focusTrap.deactivate);
