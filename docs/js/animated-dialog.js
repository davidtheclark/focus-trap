const { createFocusTrap } = require('../../dist/focus-trap');

const container = document.getElementById('animated-dialog');

const focusTrap = createFocusTrap('#animated-dialog', {
  // Called before focus is sent
  onActivate: () => container.classList.add('is-active'),
  // There is a delay between when the class is applied
  // and when the element is focusable
  checkCanFocusTrap: (trapContainers) => {
    const results = trapContainers.map((trapContainer) => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (getComputedStyle(trapContainer).visibility !== 'hidden') {
            resolve();
            clearInterval(interval);
          }
        }, 5);
      });
    });
    // Return a promise that resolves when all the trap containers are able to receive focus
    return Promise.all(results);
  },
  // Called after focus is sent to the focus trap
  onPostActivate: () => {
    // eslint-disable-next-line no-console
    console.log('Focus has been sent to the animated focus trap');
  },
  onDeactivate: () => container.classList.remove('is-active'),
});

document
  .getElementById('activate-animated-dialog')
  .addEventListener('click', focusTrap.activate);

document
  .getElementById('deactivate-animated-dialog')
  .addEventListener('click', focusTrap.deactivate);
