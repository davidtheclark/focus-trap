const { createFocusTrap } = require('../../dist/focus-trap');

const container = document.getElementById('animated-trigger');
const trigger = document.getElementById('activate-animated-trigger');

const focusTrap = createFocusTrap('#animated-trigger', {
  // Called before focus is sent
  onActivate: () => {
    container.classList.add('is-active');
    trigger.classList.add('is-triggered');
  },
  onDeactivate: () => {
    container.classList.remove('is-active');
    trigger.classList.remove('is-triggered');
  },
  // There is a delay between when the class is removed
  // and when the trigger is focusable
  checkCanReturnFocus: (triggerButton) => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (getComputedStyle(triggerButton).visibility !== 'hidden') {
          resolve();
          clearInterval(interval);
        }
      }, 5);
    });
  },
  // Called after focus is sent to the trigger button
  onPostDeactivate: () => {
    // eslint-disable-next-line no-console
    console.log(
      'Focus has been sent to the animated focus trap trigger button'
    );
  },
});

document
  .getElementById('activate-animated-trigger')
  .addEventListener('click', focusTrap.activate);

document
  .getElementById('deactivate-animated-trigger')
  .addEventListener('click', focusTrap.deactivate);
