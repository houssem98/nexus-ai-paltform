import { useEffect, useRef, type KeyboardEvent } from 'react';

// A clickable card or row that the keyboard can reach and press like a button.
export const pressable = (onPress: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: onPress,
  onKeyDown: (e: KeyboardEvent) => {
    // A key pressed on a control inside the card belongs to that control.
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    onPress();
  },
});

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A modal dialog: focus moves to it when it opens, Tab stays inside, Escape closes it,
// and focus goes back to whatever opened it. The panel itself takes focus, not its first
// control, which may be disabled a moment later (the verifier disables Re-run as it runs).
export function useDialog<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const items = focusable();
      const i = items.indexOf(document.activeElement as HTMLElement);
      // From the panel, from outside, or past either end, Tab wraps around inside the dialog.
      if (i !== -1 && i !== (e.shiftKey ? 0 : items.length - 1)) return;
      e.preventDefault();
      items[e.shiftKey ? items.length - 1 : 0]?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open]);
  return ref;
}
