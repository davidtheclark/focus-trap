var tabbable = require('tabbable');

var listeningFocusTrap = null;

function focusTrap(element, userOptions) {
  userOptions = userOptions || {};

  var container = (typeof element === 'string')
    ? document.querySelector(element)
    : element;

  var config = {};
  for (var key in userOptions) {
    if (userOptions.hasOwnProperty(key)) {
      config[key] = userOptions[key];
    }
  }
  applyDefault(config, 'returnFocusOnDeactivate', true);
  applyDefault(config, 'escapeDeactivates', true);

  var state = {
    firstTabbableNode: null,
    lastTabbableNode: null,
    nodeFocusedBeforeActivation: null,
    lastFocusedNode: null,
    active: false,
    paused: false,
    pointerDown: false,
  };

  var trap = {
    activate: activate,
    deactivate: deactivate,
    pause: pause,
    unpause: unpause,
  };

  return trap;

  function activate(activateOptions) {
    if (state.active) return;

    updateTabbableNodes();

    state.active = true;
    state.paused = false;
    state.nodeFocusedBeforeActivation = document.activeElement;

    var onActivate = (activateOptions && activateOptions.onActivate)
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

    var returnFocus = (deactivateOptions && deactivateOptions.returnFocus !== undefined)
        ? deactivateOptions.returnFocus
        : config.returnFocusOnDeactivate;
    var onDeactivate = (deactivateOptions && deactivateOptions.onDeactivate !== undefined)
        ? deactivateOptions.onDeactivate
        : config.onDeactivate;

    removeListeners();
    state.active = false;
    state.paused = false;

    if (onDeactivate) {
      onDeactivate();
    }

    if (returnFocus) {
      setTimeout(function () {
        tryFocus(state.nodeFocusedBeforeActivation);
      }, 0);
    }

    return this;
  }

  function pause() {
    if (state.paused || !state.active) return;
    state.paused = true;
    removeListeners();
  }

  function unpause() {
    if (!state.paused || !state.active) return;
    state.paused = false;
    addListeners();
  }

  function addListeners() {
    if (!state.active) return;

    // There can be only one listening focus trap at a time
    if (listeningFocusTrap) {
      listeningFocusTrap.pause();
    }
    listeningFocusTrap = trap;

    updateTabbableNodes();
    // setTimeout-0 ensures that the focused element doesn't capture the event
    // that caused the focus trap activation
    setTimeout(function () {
      tryFocus(getInitialFocusNode());
    }, 0);
    document.addEventListener('focusout', checkFocusout, true);
    document.addEventListener('mousedown', checkPointerDown, true);
    document.addEventListener('touchstart', checkPointerDown, true);
    document.addEventListener('click', checkClick, true);
    document.addEventListener('keydown', checkKey, true);

    return trap;
  }

  function removeListeners() {
    if (!state.active || listeningFocusTrap !== trap) return;

    document.removeEventListener('focusout', checkFocusout, true);
    document.removeEventListener('mousedown', checkPointerDown, true);
    document.removeEventListener('touchstart', checkPointerDown, true);
    document.removeEventListener('click', checkClick, true);
    document.removeEventListener('keydown', checkKey, true);

    listeningFocusTrap = null;

    return trap;
  }

  function getNodeForOption(optionName) {
    var optionValue = config[optionName];
    var node = optionValue;
    if (!optionValue) {
      return null;
    }
    if (typeof optionValue === 'string') {
      node = document.querySelector(optionValue);
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
    } else if (container.contains(document.activeElement)) {
      node = document.activeElement;
    } else {
      node = state.firstTabbableNode || getNodeForOption('fallbackFocus');
    }

    if (!node) {
      throw new Error('You can\'t have a focus-trap without at least one focusable element');
    }

    return node;
  }

  // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event
  function checkPointerDown(e) {
    // state.pointerDown allows us to ignore the focusout event that
    // is caused by a pointerDown action
    state.pointerDown = true;
    setTimeout(function () {
      state.pointerDown = false;
    }, 0);
    if (config.clickOutsideDeactivates && !container.contains(e.target)) {
      deactivate({ returnFocus: false });
    } else if (!container.contains(e.target)) {
      e.preventDefault();
    }
  }

  function checkFocusout(e) {
    if (state.pointerDown || !state.active) return;

    var node = e.relatedTarget;
    updateTabbableNodes();

    if (node === null) {
      e.preventDefault();
      if (state.lastFocusedNode === state.firstTabbableNode) {
        tryFocus(state.lastTabbableNode);
      } else {
        tryFocus(state.firstTabbableNode);
      }
      return;
    }

    if (container.contains(node)) {
      state.lastFocusedNode = node;
      return;
    }

    if (!state.lastFocusedNode) return;

    if (node.compareDocumentPosition(state.lastFocusedNode) & Node.DOCUMENT_POSITION_FOLLOWING) {
      setTimeout(function () {
        tryFocus(state.lastTabbableNode);
      }, 0);
      return;
    }
    if (node.compareDocumentPosition(state.lastFocusedNode) & Node.DOCUMENT_POSITION_PRECEDING) {
      setTimeout(function () {
        tryFocus(state.firstTabbableNode);
      }, 0);
      return;
    }
  }

  function checkKey(e) {
    if (config.escapeDeactivates !== false && isEscapeEvent(e)) {
      deactivate();
    }
  }

  function checkClick(e) {
    if (config.clickOutsideDeactivates) return;
    if (container.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function updateTabbableNodes() {
    var tabbableNodes = tabbable(container);
    state.firstTabbableNode = tabbableNodes[0];
    state.lastTabbableNode = tabbableNodes[tabbableNodes.length - 1];
  }

  function tryFocus(node) {
    if (node === document.activeElement)  return;
    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus();
    state.lastFocusedNode = node;
    if (node.tagName.toLowerCase() === 'input') {
      node.select();
    }
  }
}

function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
}

function applyDefault(obj, key, defaultValue) {
  if (obj[key] !== undefined) return;
  obj[key] = defaultValue;
}

module.exports = focusTrap;
