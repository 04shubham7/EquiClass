/**
 * Skeleton loading components for async data states
 * Provides visual feedback while content loads
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../../utils/animation';

/**
 * Skeleton base with shimmer animation
 */
export function Skeleton({
  className = '',
  width,
  height,
  circle = false,
  animated = true,
}) {
  const shimmerRef = useRef(null);

  useEffect(() => {
    if (!animated || prefersReducedMotion()) return;

    const shimmer = shimmerRef.current;
    if (!shimmer) return;

    gsap.to(shimmer, {
      x: '100%',
      duration: 1.5,
      ease: 'none',
      repeat: -1,
      repeatDelay: 0.5,
    });

    return () => {
      gsap.killTweensOf(shimmer);
    };
  }, [animated]);

  const baseClasses = 'relative overflow-hidden bg-slate-200/70';
  const shapeClass = circle ? 'rounded-full' : 'rounded-md';
  const darkClasses = 'dark:bg-slate-700/70';

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${baseClasses} ${shapeClass} ${darkClasses} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {animated && (
        <div
          ref={shimmerRef}
          className="absolute inset-0 -translate-x-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
        />
      )}
    </div>
  );
}

/**
 * Text skeleton - multiple lines
 */
export function SkeletonText({
  lines = 3,
  className = '',
  lastLineWidth = '70%',
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1em"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton - placeholder for card components
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-4">
        <Skeleton width={48} height={48} circle />
        <div className="flex-1">
          <Skeleton height="1.25em" className="w-3/4" />
          <Skeleton height="0.875em" className="mt-2 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-4" lastLineWidth="60%" />
    </div>
  );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({ size = 48, className = '' }) {
  return (
    <Skeleton
      width={size}
      height={size}
      circle
      className={className}
    />
  );
}

/**
 * Dashboard stats skeleton
 */
export function SkeletonStats({ count = 3, className = '' }) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${count} ${className}`}
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
          aria-hidden="true"
        >
          <Skeleton height="0.875em" width="40%" />
          <Skeleton height="2em" width="60%" className="mt-2" />
          <Skeleton height="0.75em" width="30%" className="mt-2" />
        </div>
      ))}
    </div>
  );
}

/**
 * List skeleton - for request lists, etc.
 */
export function SkeletonList({ items = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          aria-hidden="true"
        >
          <Skeleton width={40} height={40} circle />
          <div className="flex-1">
            <Skeleton height="1em" width="60%" />
            <Skeleton height="0.75em" width="40%" className="mt-1" />
          </div>
          <Skeleton width={24} height={24} />
        </div>
      ))}
    </div>
  );
}

/**
 * Loading spinner for async operations
 */
export function LoadingSpinner({
  size = 24,
  className = '',
  label = 'Loading...',
}) {
  const spinnerRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const spinner = spinnerRef.current;
    if (!spinner) return;

    gsap.to(spinner, {
      rotation: 360,
      duration: 1,
      ease: 'none',
      repeat: -1,
    });

    return () => {
      gsap.killTweensOf(spinner);
    };
  }, []);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        ref={spinnerRef}
        className="text-slate-400"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="60 20"
          opacity="0.5"
        />
      </svg>
      {label && (
        <span className="text-sm text-slate-500">{label}</span>
      )}
    </span>
  );
}

/**
 * Full page loading state
 */
export function FullPageLoader({ message = 'Loading...' }) {
  return (
    <div
      className="grid min-h-screen place-items-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <LoadingSpinner size={40} label={null} className="mx-auto" />
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}
