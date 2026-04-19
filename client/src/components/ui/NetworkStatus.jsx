/**
 * NetworkStatus component - shows online/offline status
 * Appears when connection changes
 */
import { useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { prefersReducedMotion } from '../../utils/animation';

export default function NetworkStatus() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
    } else if (wasOffline) {
      // Show "back online" briefly
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Animate banner
  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    if (showBanner) {
      if (prefersReducedMotion()) {
        gsap.set(banner, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          banner,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      }
    } else {
      gsap.to(banner, {
        opacity: 0,
        y: -20,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setShowBanner(false),
      });
    }
  }, [showBanner]);

  if (!showBanner) return null;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-center text-sm font-medium text-white ${
        isOnline
          ? 'bg-emerald-500'
          : isSlowConnection
            ? 'bg-amber-500'
            : 'bg-rose-500'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <WifiIcon />
            <span>Back online</span>
          </>
        ) : (
          <>
            <OfflineIcon />
            <span>
              {isSlowConnection
                ? 'Slow connection detected'
                : "You're offline. Changes will sync when you reconnect."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function WifiIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M2.5 6C4.5 4.5 6.5 3.5 8 3.5C9.5 3.5 11.5 4.5 13.5 6M5 8.5C6 7.8 7 7.5 8 7.5C9 7.5 10 7.8 11 8.5M8 12C8.55228 12 9 11.5523 9 11C9 10.4477 8.55228 10 8 10C7.44772 10 7 10.4477 7 11C7 11.5523 7.44772 12 8 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M3 5L13 11M3 11L13 5M2 8H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
