/**
 * AnimatedButton component - button with loading, success, and error states
 * Includes press feedback and accessibility features
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../../utils/animation';
import { LoadingSpinner } from './Skeleton';

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isSuccess = false,
  isError = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) {
  const buttonRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    if (disabled || isLoading) return;
    setIsPressed(true);

    if (prefersReducedMotion()) return;

    gsap.to(buttonRef.current, {
      scale: 0.97,
      duration: 0.1,
      ease: 'power2.out',
    });
  }, [disabled, isLoading]);

  const handlePressEnd = useCallback(() => {
    setIsPressed(false);

    if (prefersReducedMotion()) return;

    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.15,
      ease: 'back.out(1.5)',
    });
  }, []);

  // State change animations
  useEffect(() => {
    if (!buttonRef.current || prefersReducedMotion()) return;

    if (isSuccess) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 1 },
        {
          scale: 1.02,
          duration: 0.2,
          ease: 'back.out(1.5)',
          yoyo: true,
          repeat: 1,
        }
      );
    } else if (isError) {
      gsap.fromTo(
        buttonRef.current,
        { x: 0 },
        {
          x: 5,
          duration: 0.08,
          ease: 'none',
          repeat: 3,
          yoyo: true,
          onComplete: () => {
            gsap.to(buttonRef.current, { x: 0, duration: 0.1 });
          },
        }
      );
    }
  }, [isSuccess, isError]);

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const variantClasses = {
    primary:
      'border border-transparent bg-[var(--eq-text)] text-[var(--eq-bg-soft)] shadow-[0_18px_34px_rgba(24,34,32,0.14)] hover:bg-[var(--eq-accent-strong)] focus-visible:ring-[var(--eq-accent)]',
    secondary:
      'border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] text-[var(--eq-text)] hover:bg-[var(--eq-surface-muted)] focus-visible:ring-[var(--eq-accent)]',
    ghost:
      'border border-transparent bg-[var(--eq-accent-soft)] text-[var(--eq-accent-strong)] hover:bg-[rgba(47,95,90,0.18)] focus-visible:ring-[var(--eq-accent)]',
    danger:
      'border border-transparent bg-[var(--eq-danger)] text-white hover:bg-[#823844] focus-visible:ring-[var(--eq-danger)]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  const stateClasses = isLoading
    ? 'cursor-wait'
    : isSuccess
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : isError
        ? 'bg-rose-600 hover:bg-rose-700'
        : '';

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={isPressed ? handlePressEnd : undefined}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${stateClasses} ${className}`}
      aria-busy={isLoading}
      aria-live="polite"
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size={16} label={null} />
          <span>Loading...</span>
        </>
      ) : isSuccess ? (
        <>
          <SuccessIcon />
          <span>Success!</span>
        </>
      ) : isError ? (
        <>
          <ErrorIcon />
          <span>Error</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M3 8L6.5 11.5L13 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M8 5V8M8 11H8.01M3 8C3 5.23858 5.23858 3 8 3C10.7614 3 13 5.23858 13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * IconButton - compact button for icon actions
 */
export function IconButton({
  children,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const buttonRef = useRef(null);

  const handleClick = useCallback(
    (e) => {
      if (prefersReducedMotion() || !buttonRef.current) {
        onClick?.(e);
        return;
      }

      gsap.fromTo(
        buttonRef.current,
        { scale: 0.9 },
        {
          scale: 1,
          duration: 0.3,
          ease: 'back.out(1.7)',
          onStart: () => onClick?.(e),
        }
      );
    },
    [onClick]
  );

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const variantClasses = {
    ghost:
      'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800',
    filled:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
