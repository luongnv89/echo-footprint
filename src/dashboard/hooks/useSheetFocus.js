import { useEffect, useRef } from 'react';

/**
 * Shared focus management for modal sheets (Settings / Help / Screenshot).
 *
 * Behavior:
 *  - On open: save the previously focused element and move focus into the
 *    dialog (first focusable element, or the container itself).
 *  - Tab / Shift+Tab are trapped inside the dialog while it is open.
 *  - Escape closes the dialog via `onClose`.
 *  - On close/unmount: restore focus to the previously focused element.
 */
export function useSheetFocus({ isOpen, onClose, dialogRef }) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;

    const container = dialogRef?.current;
    const focusables = container
      ? container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      : [];
    const first = focusables.length ? focusables[0] : container;
    if (first) first.focus();

    return () => {
      if (
        previouslyFocused.current &&
        typeof previouslyFocused.current.focus === 'function'
      ) {
        previouslyFocused.current.focus();
      }
      previouslyFocused.current = null;
    };
  }, [isOpen, dialogRef]);

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const container = dialogRef?.current;
    if (!container) return;

    const focusables = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      el =>
        !el.disabled &&
        !el.hidden &&
        el.getAttribute('aria-hidden') !== 'true' &&
        (typeof el.checkVisibility === 'function' ? el.checkVisibility() : true)
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !container.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  return handleKeyDown;
}
