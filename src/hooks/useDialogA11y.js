import { useEffect, useRef } from "react";

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Shared modal/sheet accessibility behavior: body scroll lock, Escape,
 * keyboard focus containment, initial focus, and focus restoration.
 */
export function useDialogA11y(open, onClose) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const focusInitial = () => {
      const dialog = dialogRef.current;
      const preferred = dialog?.querySelector("[data-dialog-autofocus]");
      const first = preferred || dialog?.querySelector(FOCUSABLE) || dialog;
      first?.focus?.({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(focusInitial);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return dialogRef;
}
