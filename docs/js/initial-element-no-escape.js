const { createFocusTrap } = require('../../dist/focus-trap');

const container = document.getElementById('iene');
const activateTrigger = document.getElementById('activate-iene');
const deactivateTrigger = document.getElementById('deactivate-iene');
const select = document.getElementById('select-iene');

const initialize = function ({ initialFocus = '#focused-input' }) {
  return createFocusTrap(container, {
    onActivate: () => container.classList.add('is-active'),
    onDeactivate: () => container.classList.remove('is-active'),
    initialFocus,
    escapeDeactivates: false,
  });
};

let focusTrap = initialize({ initialFocus: select.value });

activateTrigger.addEventListener('click', () => focusTrap.activate());
deactivateTrigger.addEventListener('click', () => focusTrap.deactivate());

select.addEventListener('change', function (event) {
  focusTrap = initialize({
    initialFocus: event.target.value === 'false' ? false : event.target.value,
  });
});
