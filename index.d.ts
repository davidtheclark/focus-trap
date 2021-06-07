declare module 'focus-trap' {
  /**
   * A DOM node, a selector string (which will be passed to
   * `document.querySelector()` to find the DOM node), or a function that
   * returns a DOM node.
   */
  export type FocusTarget = HTMLElement | SVGElement | string | { (): HTMLElement | SVGElement };

  type MouseEventToBoolean = (event: MouseEvent | TouchEvent) => boolean

  export interface Options {
    /**
     * A function that will be called **before** sending focus to the
     * target element upon activation.
     */
    onActivate?: () => void;

    /**
     * A function that will be called **after** focus has been sent to the
     * target element upon activation.
     */
    onPostActivate?: () => void

    /**
     * A function for determining if it is safe to send focus to the focus trap
     * or not.
     *
     * It should return a promise that only resolves once all the listed `containers`
     * are able to receive focus.
     *
     * The purpose of this is to prevent early focus-trap activation on animated
     * dialogs that fade in and out. When a dialog fades in, there is a brief delay
     * between the activation of the trap and the trap element being focusable.
     */
    checkCanFocusTrap?: (containers: Array<HTMLElement | SVGElement>) => Promise<void>

    /**
     * A function that will be called **before** sending focus to the
     * trigger element upon deactivation.
     */
    onDeactivate?: () => void;

    /**
     * A function that will be called **after** focus has been sent to the
     * trigger element upon deactivation.
     */
    onPostDeactivate?: () => void
    /**
     * A function for determining if it is safe to send focus back to the `trigger` element.
     *
     * It should return a promise that only resolves once `trigger` is focusable.
     *
     * The purpose of this is to prevent the focus being sent to an animated trigger element too early.
     * If a trigger element fades in upon trap deactivation, there is a brief delay between the deactivation
     * of the trap and when the trigger element is focusable.
     *
     * `trigger` will be either the node that had focus prior to the trap being activated,
     * or the result of the `setReturnFocus` option, if configured.
     *
     * This handler is **not** called if the `returnFocusOnDeactivate` configuration option
     * (or the `returnFocus` deactivation option) is falsy.
     */
    checkCanReturnFocus?: (trigger: HTMLElement | SVGElement) => Promise<void>

    /**
     * By default, when a focus trap is activated the first element in the
     * focus trap's tab order will receive focus. With this option you can
     * specify a different element to receive that initial focus.
     */
    initialFocus?: FocusTarget;
    /**
     * By default, an error will be thrown if the focus trap contains no
     * elements in its tab order. With this option you can specify a
     * fallback element to programmatically receive focus if no other
     * tabbable elements are found. For example, you may want a popover's
     * `<div>` to receive focus if the popover's content includes no
     * tabbable elements. *Make sure the fallback element has a negative
     * `tabindex` so it can be programmatically focused.*
     */
    fallbackFocus?: FocusTarget;
    /**
     * Default: `true`. If `false`, when the trap is deactivated,
     * focus will *not* return to the element that had focus before activation.
     */
    returnFocusOnDeactivate?: boolean;
    /**
     * By default, focus trap on deactivation will return to the element
     * that was focused before activation.
     */
    setReturnFocus?: FocusTarget;
    /**
     * Default: `true`. If `false`, the `Escape` key will not trigger
     * deactivation of the focus trap. This can be useful if you want
     * to force the user to make a decision instead of allowing an easy
     * way out.
     */
    escapeDeactivates?: boolean;
    /**
     * If `true` or returns `true`, a click outside the focus trap will
     * deactivate the focus trap and allow the click event to do its thing (i.e.
     * to pass-through to the element that was clicked). This option **takes
     * precedence** over `allowOutsideClick` when it's set to `true`, causing
     * that option to be ignored. Default: `false`.
     */
    clickOutsideDeactivates?: boolean | MouseEventToBoolean;
    /**
     * If set and is or returns `true`, a click outside the focus trap will not
     * be prevented, even when `clickOutsideDeactivates` is `false`. When
     * `clickOutsideDeactivates` is `true`, this option is **ignored** (i.e.
     * if it's a function, it will not be called). Use this option to control
     * if (and even which) clicks are allowed outside the trap in conjunction
     * with `clickOutsideDeactivates: false`. Default: `false`.
     */
    allowOutsideClick?: boolean | MouseEventToBoolean;
    /**
     * By default, focus() will scroll to the element if not in viewport.
     * It can produce unintended effects like scrolling back to the top of a modal.
     * If set to `true`, no scroll will happen.
     */
    preventScroll?: boolean;
    /**
     * Default: `true`. Delays the autofocus when the focus trap is activated.
     * This prevents elements within the focusable element from capturing
     * the event that triggered the focus trap activation.
     */
    delayInitialFocus?: boolean;
  }

  type ActivateOptions = Pick<Options, 'onActivate' | 'onPostActivate' | 'checkCanFocusTrap'>;

  interface DeactivateOptions extends Pick<Options, 'onDeactivate' | 'onPostDeactivate' | 'checkCanReturnFocus'> {
    returnFocus?: boolean;
  }

  export interface FocusTrap {
    activate(activateOptions?: ActivateOptions): FocusTrap;
    deactivate(deactivateOptions?: DeactivateOptions): FocusTrap;
    pause(): FocusTrap;
    unpause(): FocusTrap;
    updateContainerElements(containerElements: HTMLElement | SVGElement | string | Array<HTMLElement | SVGElement | string>): FocusTrap;
  }

  /**
   * Returns a new focus trap on `element`.
   *
   * @param element
   *  The element to be the focus trap, or a selector that will be used to
   *  find the element.
   */
  export function createFocusTrap(
    element: HTMLElement | SVGElement | string | Array<HTMLElement | SVGElement | string>,
    userOptions?: Options
  ): FocusTrap;
}
