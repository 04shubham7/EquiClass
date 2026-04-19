/**
 * useKeyboardNavigation hook - provides keyboard navigation utilities
 * For accessibility and power-user features
 */
import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store current focus
    previousActiveElement.current = document.activeElement;

    // Get focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Keyboard shortcut handler
 */
export function useKeyboardShortcut(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      shortcuts.forEach(({ key, ctrl, meta, alt, shift, action }) => {
        const matchesKey = e.key.toLowerCase() === key.toLowerCase();
        const matchesCtrl = ctrl ? e.ctrlKey || e.metaKey : true;
        const matchesAlt = alt ? e.altKey : true;
        const matchesShift = shift ? e.shiftKey : true;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift) {
          e.preventDefault();
          action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Escape key handler
 */
export function useEscape(handler, isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, isActive]);
}

/**
 * Enter key handler for specific elements
 */
export function useEnter(handler, ref) {
  const handleEnter = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handler();
      }
    },
    [handler]
  );

  useEffect(() => {
    const element = ref?.current;
    if (!element) return;

    element.addEventListener('keydown', handleEnter);
    return () => element.removeEventListener('keydown', handleEnter);
  }, [ref, handleEnter]);
}

/**
 * Arrow key navigation for lists
 */
export function useArrowNavigation(itemCount, onSelect) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < itemCount - 1 ? prev + 1 : 0;
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : itemCount - 1;
            return next;
          });
          break;
        case 'Enter':
          if (focusedIndex >= 0) {
            onSelect?.(focusedIndex);
          }
          break;
      }
    },
    [itemCount, focusedIndex, onSelect]
  );

  // Focus element when index changes
  useEffect(() => {
    if (focusedIndex < 0 || !containerRef.current) return;

    const elements = containerRef.current.children;
    elements[focusedIndex]?.focus();
  }, [focusedIndex]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}
