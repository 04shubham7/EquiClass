/**
 * PageTransition component - handles smooth transitions between routes
 * Uses GSAP for exit and enter animations
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion, pageIn, pageOut } from '../../utils/animation';

export default function PageTransition({
  children,
  keyProp,
  className = '',
  onEnterComplete,
  onExitComplete,
}) {
  const containerRef = useRef(null);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isExiting, setIsExiting] = useState(false);
  const prevKeyRef = useRef(keyProp);

  useEffect(() => {
    // Key hasn't changed, just update children without animation
    if (prevKeyRef.current === keyProp) {
      setDisplayChildren(children);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Start exit animation
    setIsExiting(true);

    if (prefersReducedMotion()) {
      setDisplayChildren(children);
      setIsExiting(false);
      prevKeyRef.current = keyProp;
      return;
    }

    // Animate out
    gsap.to(container, {
      opacity: 0,
      y: -15,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setDisplayChildren(children);
        setIsExiting(false);
        if (onExitComplete) onExitComplete();
      },
    });

    prevKeyRef.current = keyProp;
  }, [children, keyProp, onExitComplete]);

  // Animate in when children change
  useEffect(() => {
    if (isExiting) return;

    const container = containerRef.current;
    if (!container) return;

    if (prefersReducedMotion()) {
      gsap.set(container, { opacity: 1 });
      if (onEnterComplete) onEnterComplete();
      return;
    }

    gsap.fromTo(
      container,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: onEnterComplete,
      }
    );
  }, [displayChildren, isExiting, onEnterComplete]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ willChange: isExiting ? 'transform, opacity' : 'auto' }}
      aria-live="polite"
      aria-atomic="true"
    >
      {displayChildren}
    </div>
  );
}

/**
 * AnimatedSection - wraps sections with scroll-triggered animations
 */
export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  y = 30,
}) {
  const sectionRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            gsap.fromTo(
              section,
              { opacity: 0, y },
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
                delay,
                ease: 'power2.out',
              }
            );

            observer.unobserve(section);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    gsap.set(section, { opacity: 0 });
    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, [delay, y]);

  return (
    <div ref={sectionRef} className={className}>
      {children}
    </div>
  );
}
