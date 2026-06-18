import { useEffect, useId, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    const focusables = (): HTMLElement[] =>
      dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null,
          )
        : [];

    // Move focus into the dialog (the first field, else the dialog itself).
    (focusables()[0] ?? dialog)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      // Trap Tab focus within the dialog.
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        return;
      }
      const first = els[0]!;
      const last = els[els.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        class="bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header class="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 id={titleId} class="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            class="text-faint hover:text-ink transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div class="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
