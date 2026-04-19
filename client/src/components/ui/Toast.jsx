/**
 * Toast notification system
 * Displays non-intrusive feedback to users
 */
import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../../utils/animation';

export function Toast({
  message,
  type = 'info',
  duration = 4000,
  onClose,
  action,
}) {
  const toastRef = useRef(null);
  const progressRef = useRef(null);

  const dismiss = useCallback(() => {
    const toast = toastRef.current;
    if (!toast || prefersReducedMotion()) {
      onClose?.();
      return;
    }

    gsap.to(toast, {
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: onClose,
    });
  }, [onClose]);

  useEffect(() => {
    const toast = toastRef.current;
    const progress = progressRef.current;

    if (!toast) return;

    // Animate in
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        toast,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'back.out(1.2)',
        }
      );
    }

    // Progress bar animation
    if (progress && !prefersReducedMotion()) {
      gsap.fromTo(
        progress,
        { scaleX: 1 },
        {
          scaleX: 0,
          duration: duration / 1000,
          ease: 'none',
          transformOrigin: 'left',
        }
      );
    }

    // Auto dismiss
    const timer = setTimeout(dismiss, duration);

    return () => {
      clearTimeout(timer);
      gsap.killTweensOf(toast);
      gsap.killTweensOf(progress);
    };
  }, [duration, dismiss]);

  const typeStyles = {
    info: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
  };

  const typeIcons = {
    info: InfoIcon,
    success: SuccessIcon,
    error: ErrorIcon,
    warning: WarningIcon,
  };

  const Icon = typeIcons[type];

  return (
    <div
      ref={toastRef}
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-xl shadow-2xl sm:bottom-6 ${typeStyles[type]}`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-1 text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 -mr-1 -mt-1 rounded p-1 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Dismiss notification"
        >
          <CloseIcon />
        </button>
      </div>
      <div
        ref={progressRef}
        className={`h-1 opacity-30 ${
          type === 'info'
            ? 'bg-white dark:bg-slate-900'
            : 'bg-white'
        }`}
      />
    </div>
  );
}

function InfoIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M9 5V9M9 13H9.01M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SuccessIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M5 9L8 12L13 5M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M6 6L12 12M12 6L6 12M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon({ className }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={className}
    >
      <path
        d="M9 6V9M9 12H9.01M2.343 14.657L7.758 4.343C8.145 3.553 9.855 3.553 10.242 4.343L15.657 14.657C16.029 15.418 15.483 16.316 14.629 16.316H3.371C2.517 16.316 1.971 15.418 2.343 14.657Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 12L12 4M4 4L12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ToastContainer - manages multiple toasts
 */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}
