import { tabbable, isFocusable } from 'tabbable';

var activeFocusDelay;

var activeFocusTraps = (function () {
  var trapQueue = [];
  return {
    activateTrap: function (trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];
        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);
      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },

    deactivateTrap: function (trap) {
      var trapIndex = trapQueue.indexOf(trap);
      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    },
  };
})();

function createFocusTrap(elements, userOptions) {
  var doc = document;

  var config = {
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true,
    ...userOptions,
  };

  var state = {
    containers: [],
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
  };

  var trap = {
    activate: activate,
    deactivate: deactivate,
    pause: pause,
    unpause: unpause,
    updateContainerElements: updateContainerElements,
  };

  updateContainerElements(elements);

  return trap;

  function updateContainerElements(elements) {
    var elementsAsArray = [].concat(elements).filter(Boolean);

    state.containers = elementsAsArray.map((element) =>
      typeof element === 'string' ? doc.querySelector(element) : element
    );

    if (state.active) {
      updateTabbableNodes();
    }
  }

  function activate(activateOptions) {
    if (state.active) return;

    updateTabbableNodes();

    state.active = true;
    state.paused = false;
    state.nodeFocusedBeforeActivation = doc.activeElement;

    var onActivate =
      activateOptions && activateOptions.onActivate
        ? activateOptions.onActivate
        : config.onActivate;
    if (onActivate) {
      onActivate();
    }

    addListeners();
    return trap;
  }

  function deactivate(deactivateOptions) {
    if (!state.active) return;

    clearTimeout(activeFocusDelay);

    removeListeners();
    state.active = false;
    state.paused = false;

    activeFocusTraps.deactivateTrap(trap);

    var onDeactivate =
      deactivateOptions && deactivateOptions.onDeactivate !== undefined
        ? deactivateOptions.onDeactivate
        : config.onDeactivate;
    if (onDeactivate) {
      onDeactivate();
    }

    var returnFocus =
      deactivateOptions && deactivateOptions.returnFocus !== undefined
        ? deactivateOptions.returnFocus
        : config.returnFocusOnDeactivate;
    if (returnFocus) {
      delay(function () {
        tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
      });
    }

    return trap;
  }

  function pause() {
    if (state.paused || !state.active) return;
    state.paused = true;
    removeListeners();
  }

  function unpause() {
    if (!state.paused || !state.active) return;
    state.paused = false;
    updateTabbableNodes();
    addListeners();
  }

  function addListeners() {
    if (!state.active) return;

    // There can be only one listening focus trap at a time
    activeFocusTraps.activateTrap(trap);

    // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.
    activeFocusDelay = config.delayInitialFocus
      ? delay(function () {
          tryFocus(getInitialFocusNode());
        })
      : tryFocus(getInitialFocusNode());

    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false,
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false,
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false,
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false,
    });

    return trap;
  }

  function removeListeners() {
    if (!state.active) return;

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);

    return trap;
  }

  function getNodeForOption(optionName) {
    var optionValue = config[optionName];
    var node = optionValue;
    if (!optionValue) {
      return null;
    }
    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue);
      if (!node) {
        throw new Error('`' + optionName + '` refers to no known node');
      }
    }
    if (typeof optionValue === 'function') {
      node = optionValue();
      if (!node) {
        throw new Error('`' + optionName + '` did not return a node');
      }
    }
    return node;
  }

  function getInitialFocusNode() {
    var node;
    if (getNodeForOption('initialFocus') !== null) {
      node = getNodeForOption('initialFocus');
    } else if (containersContain(doc.activeElement)) {
      node = doc.activeElement;
    } else {
      var firstTabbableGroup = state.tabbableGroups[0];
      var firstTabbableNode =
        firstTabbableGroup && firstTabbableGroup.firstTabbableNode;
      node = firstTabbableNode || getNodeForOption('fallbackFocus');
    }

    if (!node) {
      throw new Error(
        'Your focus-trap needs to have at least one focusable element'
      );
    }

    return node;
  }

  function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus');
    return node ? node : previousActiveElement;
  }

  // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.
  function checkPointerDown(e) {
    if (containersContain(e.target)) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (config.clickOutsideDeactivates) {
      // immediately deactivate the trap
      deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable(e.target),
      });
      return;
    }

    // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)
    if (
      config.allowOutsideClick &&
      (typeof config.allowOutsideClick === 'boolean'
        ? config.allowOutsideClick
        : config.allowOutsideClick(e))
    ) {
      // allow the click outside the trap to take place
      return;
    }

    // otherwise, prevent the click
    e.preventDefault();
  }

  // In case focus escapes the trap for some strange reason, pull it back in.
  function checkFocusIn(e) {
    // In Firefox when you Tab out of an iframe the Document is briefly focused.
    if (containersContain(e.target) || e.target instanceof Document) {
      return;
    }
    e.stopImmediatePropagation();
    tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
  }

  function checkKey(e) {
    if (config.escapeDeactivates !== false && isEscapeEvent(e)) {
      e.preventDefault();
      deactivate();
      return;
    }
    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  }

  // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.
  function checkTab(e) {
    updateTabbableNodes();
    const isShift = e.shiftKey;

    if (isShift) {
      const startOfGroupIndex = state.tabbableGroups.findIndex(
        ({ firstTabbableNode }) => e.target === firstTabbableNode
      );

      const isStartOfAGroup = startOfGroupIndex !== -1;
      if (isStartOfAGroup) {
        e.preventDefault();

        const isFirstGroup = startOfGroupIndex === 0;
        const lastGroupIndex = state.tabbableGroups.length - 1;
        const previousGroupIndex = startOfGroupIndex - 1;
        const destinationGroupIndex = isFirstGroup
          ? lastGroupIndex
          : previousGroupIndex;

        const destinationGroup = state.tabbableGroups[destinationGroupIndex];
        const destinationNode =
          destinationGroup && destinationGroup.lastTabbableNode;

        tryFocus(destinationNode);

        return;
      }
    }
    if (!isShift) {
      const lastOfGroupIndex = state.tabbableGroups.findIndex(
        ({ lastTabbableNode }) => e.target === lastTabbableNode
      );

      const isLastOfAGroup = lastOfGroupIndex !== -1;
      if (isLastOfAGroup) {
        e.preventDefault();

        const isLastGroup =
          lastOfGroupIndex === state.tabbableGroups.length - 1;
        const firstGroupIndex = 0;
        const nextGroupIndex = lastOfGroupIndex + 1;
        const destinationGroupIndex = isLastGroup
          ? firstGroupIndex
          : nextGroupIndex;

        const destinationGroup = state.tabbableGroups[destinationGroupIndex];
        const destinationNode =
          destinationGroup && destinationGroup.firstTabbableNode;

        tryFocus(destinationNode);

        return;
      }
    }
  }

  function checkClick(e) {
    if (config.clickOutsideDeactivates) return;
    if (containersContain(e.target)) return;
    if (
      config.allowOutsideClick &&
      (typeof config.allowOutsideClick === 'boolean'
        ? config.allowOutsideClick
        : config.allowOutsideClick(e))
    ) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function updateTabbableNodes() {
    state.tabbableGroups = state.containers.map((container) => {
      var tabbableNodes = tabbable(container);

      return {
        firstTabbableNode: tabbableNodes[0],
        lastTabbableNode: tabbableNodes[tabbableNodes.length - 1],
      };
    });
  }

  function tryFocus(node) {
    if (node === doc.activeElement) return;
    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }
    node.focus({ preventScroll: !!config.preventScroll });
    state.mostRecentlyFocusedNode = node;
    if (isSelectableInput(node)) {
      node.select();
    }
  }

  function containersContain(element) {
    return state.containers.some((container) => container.contains(element));
  }
}

function isSelectableInput(node) {
  return (
    node.tagName &&
    node.tagName.toLowerCase() === 'input' &&
    typeof node.select === 'function'
  );
}

function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
}

function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
}

function delay(fn) {
  return setTimeout(fn, 0);
}

export { createFocusTrap };
