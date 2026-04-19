import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { fadeIn, prefersReducedMotion } from '../../utils/animation';

/**
 * FadeIn component - wraps children with a fade-in animation
 * Respects prefers-reduced-motion
 */
export default function FadeIn({
  children,
  delay = 0,
  duration,
  y = 10,
  className = '',
  as: Component = 'div',
  onComplete,
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    fadeIn(element, {
      delay,
      duration,
      y,
      onComplete,
    });

    return () => {
      gsap.killTweensOf(element);
    };
  }, [delay, duration, y, onComplete]);

  return (
    <Component ref={elementRef} className={className}>
      {children}
    </Component>
  );
}

/**
 * StaggerContainer - automatically animates children with staggered timing
 */
export function StaggerContainer({
  children,
  stagger = 0.08,
  delay = 0,
  y = 20,
  className = '',
  as: Component = 'div',
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return;

    const children = container.children;
    if (children.length === 0) return;

    gsap.fromTo(
      children,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger,
        delay,
        ease: 'power2.out',
      }
    );

    return () => {
      gsap.killTweensOf(children);
    };
  }, [stagger, delay, y]);

  return (
    <Component ref={containerRef} className={className}>
      {children}
    </Component>
  );
}

/**
 * ScaleIn - scales element from smaller to full size
 */
export function ScaleIn({
  children,
  delay = 0,
  duration,
  scale = 0.95,
  className = '',
  as: Component = 'div',
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (prefersReducedMotion()) {
      gsap.set(element, { opacity: 1, scale: 1 });
      return;
    }

    gsap.fromTo(
      element,
      { opacity: 0, scale },
      {
        opacity: 1,
        scale: 1,
        duration: duration ?? 0.35,
        delay,
        ease: 'back.out(1.2)',
      }
    );

    return () => {
      gsap.killTweensOf(element);
    };
  }, [delay, duration, scale]);

  return (
    <Component ref={elementRef} className={className}>
      {children}
    </Component>
  );
}

/**
 * SlideIn - slides element from a direction
 */
export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  distance = 30,
  className = '',
  as: Component = 'div',
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (prefersReducedMotion()) {
      gsap.set(element, { opacity: 1, x: 0, y: 0 });
      return;
    }

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

    gsap.fromTo(
      element,
      fromVars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.4,
        delay,
        ease: 'power2.out',
      }
    );

    return () => {
      gsap.killTweensOf(element);
    };
  }, [direction, delay, distance]);

  return (
    <Component ref={elementRef} className={className}>
      {children}
    </Component>
  );
}
