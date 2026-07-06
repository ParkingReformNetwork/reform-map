import Observable from "../state/Observable";

/** Whether a click landed outside all of the given elements.
 *
 * Used by popups to decide whether a `window` click should close them. */
export function isClickOutside(
  event: Event,
  elements: Array<Element | null | undefined>,
): boolean {
  const { target } = event;
  return (
    target instanceof Element &&
    elements.every((element) => !element?.contains(target))
  );
}

interface TogglePopupOptions {
  /** Used to label the Observable in dev logging. */
  id: string;
  popupSelector: string;
  iconSelector: string;
  /** An optional element within the popup that closes it when clicked. */
  closeIconSelector?: string;
  /** Called whenever the popup transitions from hidden to visible. */
  onOpen?: () => void;
}

/** Wire up a popup that toggles from its button click and closes on outside clicks.
 *
 * Returns the visibility Observable so callers can react to or drive visibility. */
export function initTogglePopup(
  options: TogglePopupOptions,
): Observable<boolean> {
  const isVisible = new Observable<boolean>(options.id, false);

  const popup = document.querySelector<HTMLElement>(options.popupSelector);
  const icon = document.querySelector(options.iconSelector);
  if (!popup || !icon) return isVisible;

  isVisible.subscribe(`toggle ${options.id} popup visibility`, (visible) => {
    popup.hidden = !visible;
    icon.ariaExpanded = visible.toString();
  });

  icon.addEventListener("click", () => {
    const nowVisible = !isVisible.getValue();
    isVisible.setValue(nowVisible);
    if (nowVisible) options.onOpen?.();
  });

  if (options.closeIconSelector) {
    const closeIcon = document.querySelector(options.closeIconSelector);
    closeIcon?.addEventListener("click", () => isVisible.setValue(false));
  }

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (isVisible.getValue() && isClickOutside(event, [icon, popup])) {
      isVisible.setValue(false);
    }
  });

  isVisible.initialize();
  return isVisible;
}
