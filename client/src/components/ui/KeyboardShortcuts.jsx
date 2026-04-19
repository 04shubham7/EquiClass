/**
 * KeyboardShortcuts component - displays available shortcuts
 * Accessible via "?" key
 */
import { useState, useEffect, useCallback,useRef } from 'react';
import { gsap } from 'gsap';
import { getAnimationProfile, tuneAnimation } from '../../utils/animation';

const SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal or dialog' },
  { key: '/', description: 'Focus search (if available)' },
  { key: 't', description: 'Toggle theme' },
  { key: 'n', description: 'New request' },
  { key: 'r', description: 'Refresh data' },
  { key: 'Tab', description: 'Navigate between elements' },
  { key: 'Enter', description: 'Activate focused element' },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle "?" key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if typing in input
        if (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        ) {
          return;
        }
        setIsOpen(true);
      }

      if (e.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // Focus trap and animation
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Store previous focus
    const previousActiveElement = document.activeElement;

    // Focus first element
    const firstFocusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();

    // Animate in
    const profile = getAnimationProfile();
    if (!profile.reduced) {
      gsap.fromTo(
        modal,
        { opacity: 0, scale: 0.95 },
        tuneAnimation({ opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, profile)
      );
    }

    // Focus trap
    const handleTab = (e) => {
      const focusable = modal.querySelectorAll(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    modal.addEventListener('keydown', handleTab);

    return () => {
      modal.removeEventListener('keydown', handleTab);
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={close}
    >
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id="shortcuts-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            Keyboard shortcuts
          </h2>
          <button
            onClick={close}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <dl className="mt-4 space-y-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700"
            >
              <dt className="text-sm text-slate-600 dark:text-slate-400">
                {description}
              </dt>
              <dd>
                <kbd className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900 dark:bg-slate-700 dark:text-slate-300">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-center text-xs text-slate-500">
          Press <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-700">Esc</kbd>
          {' '}to close
        </p>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M5 15L15 5M5 5L15 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * SkipLink - allows keyboard users to skip to main content
 */
export function SkipLink({ targetId = 'main-content', children = 'Skip to content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 dark:bg-white dark:text-slate-900"
    >
      {children}
    </a>
  );
}
