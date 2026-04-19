/**
 * Animation utilities and GSAP presets for EquiClass
 * Centralized animation configuration for consistency
 */

import { gsap } from 'gsap';

// Default easing curves
export const EASING = {
  smooth: 'power2.out',
  bounce: 'back.out(1.2)',
  snappy: 'power3.out',
  elastic: 'elastic.out(1, 0.5)',
  custom: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

// Duration presets (in seconds)
export const DURATION = {
  micro: 0.15,
  fast: 0.25,
  normal: 0.4,
  slow: 0.6,
  page: 0.5,
};

// Stagger presets
export const STAGGER = {
  tight: 0.05,
  normal: 0.08,
  relaxed: 0.12,
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation config respecting reduced motion preference
 */
export const getSafeAnimation = (config) => {
  if (prefersReducedMotion()) {
    return { ...config, duration: 0 };
  }
  return config;
};

/**
 * Fade in animation preset
 */
export const fadeIn = (element, options = {}) => {
  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1 });
    return;
  }

  gsap.fromTo(
    element,
    { opacity: 0, y: options.y ?? 10 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? DURATION.normal,
      ease: options.ease ?? EASING.smooth,
      delay: options.delay ?? 0,
      onComplete: options.onComplete,
    }
  );
};

/**
 * Staggered children animation
 */
export const staggerChildren = (container, options = {}) => {
  if (prefersReducedMotion()) {
    gsap.set(container.children, { opacity: 1, y: 0 });
    return;
  }

  gsap.fromTo(
    container.children,
    { opacity: 0, y: options.y ?? 20 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? DURATION.normal,
      ease: options.ease ?? EASING.smooth,
      stagger: options.stagger ?? STAGGER.normal,
      delay: options.delay ?? 0,
    }
  );
};

/**
 * Scale in animation (for modals/cards)
 */
export const scaleIn = (element, options = {}) => {
  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1, scale: 1 });
    return;
  }

  gsap.fromTo(
    element,
    { opacity: 0, scale: options.scale ?? 0.95 },
    {
      opacity: 1,
      scale: 1,
      duration: options.duration ?? DURATION.fast,
      ease: options.ease ?? EASING.bounce,
      delay: options.delay ?? 0,
    }
  );
};

/**
 * Slide animation
 */
export const slideIn = (element, options = {}) => {
  const direction = options.direction ?? 'up';
  const distance = options.distance ?? 30;

  const fromVars = { opacity: 0 };

  switch (direction) {
    case 'up':
      fromVars.y = distance;
      break;
    case 'down':
      fromVars.y = -distance;
      break;
    case 'left':
      fromVars.x = distance;
      break;
    case 'right':
      fromVars.x = -distance;
      break;
  }

  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1, x: 0, y: 0 });
    return;
  }

  gsap.fromTo(
    element,
    fromVars,
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: options.duration ?? DURATION.normal,
      ease: options.ease ?? EASING.smooth,
      delay: options.delay ?? 0,
    }
  );
};

/**
 * Page transition out
 */
export const pageOut = (element, callback) => {
  if (prefersReducedMotion()) {
    if (callback) callback();
    return;
  }

  gsap.to(element, {
    opacity: 0,
    y: -20,
    duration: DURATION.fast,
    ease: EASING.snappy,
    onComplete: callback,
  });
};

/**
 * Page transition in
 */
export const pageIn = (element, options = {}) => {
  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1, y: 0 });
    if (options.onComplete) options.onComplete();
    return;
  }

  gsap.fromTo(
    element,
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? DURATION.page,
      ease: options.ease ?? EASING.smooth,
      delay: options.delay ?? 0.1,
      onComplete: options.onComplete,
    }
  );
};

/**
 * Pulse animation for notifications
 */
export const pulse = (element, options = {}) => {
  if (prefersReducedMotion()) return;

  gsap.fromTo(
    element,
    { scale: 1 },
    {
      scale: options.scale ?? 1.05,
      duration: options.duration ?? 0.3,
      ease: EASING.elastic,
      yoyo: true,
      repeat: options.repeat ?? 1,
    }
  );
};

/**
 * Shake animation for errors
 */
export const shake = (element) => {
  if (prefersReducedMotion()) {
    gsap.fromTo(
      element,
      { x: -5 },
      { x: 0, duration: 0.2, ease: EASING.smooth }
    );
    return;
  }

  gsap.fromTo(
    element,
    { x: -8 },
    {
      x: 8,
      duration: 0.08,
      ease: 'none',
      repeat: 5,
      yoyo: true,
      onComplete: () => {
        gsap.to(element, { x: 0, duration: 0.15, ease: EASING.smooth });
      },
    }
  );
};
