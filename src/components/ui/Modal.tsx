import { useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function Modal({ title, onClose, children }: Props) {
  // Close on Escape from anywhere; the modal owns the key handler while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        class="bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header class="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 class="text-base font-semibold">{title}</h2>
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
