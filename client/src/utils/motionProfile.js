export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  const saveData = Boolean(connection?.saveData);
  const slowNetwork = ['slow-2g', '2g'].includes(String(connection?.effectiveType || ''));
  const lowCpu =
    typeof nav.hardwareConcurrency === 'number' &&
    nav.hardwareConcurrency > 0 &&
    nav.hardwareConcurrency <= 4;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4;

  return saveData || slowNetwork || lowCpu || lowMemory;
};

export const getAnimationProfile = () => {
  const reduced = prefersReducedMotion();
  const lowEnd = !reduced && isLowEndDevice();

  if (reduced) {
    return {
      reduced,
      lowEnd,
      durationScale: 0,
      delayScale: 0,
      staggerScale: 0,
      distanceScale: 0,
    };
  }

  if (lowEnd) {
    return {
      reduced,
      lowEnd,
      durationScale: 0.7,
      delayScale: 0.6,
      staggerScale: 0.55,
      distanceScale: 0.6,
    };
  }

  return {
    reduced,
    lowEnd,
    durationScale: 1,
    delayScale: 1,
    staggerScale: 1,
    distanceScale: 1,
  };
};

export const tuneAnimation = (config = {}, profile = getAnimationProfile()) => {
  if (profile.reduced) {
    return { ...config, duration: 0, delay: 0, stagger: 0, x: 0, y: 0 };
  }

  const next = { ...config };

  if (typeof next.duration === 'number') {
    next.duration = Number((next.duration * profile.durationScale).toFixed(3));
  }
  if (typeof next.delay === 'number') {
    next.delay = Number((next.delay * profile.delayScale).toFixed(3));
  }
  if (typeof next.stagger === 'number') {
    next.stagger = Number((next.stagger * profile.staggerScale).toFixed(3));
  }
  if (typeof next.x === 'number') {
    next.x = Number((next.x * profile.distanceScale).toFixed(2));
  }
  if (typeof next.y === 'number') {
    next.y = Number((next.y * profile.distanceScale).toFixed(2));
  }

  return next;
};

export const setDocumentMotionMode = () => {
  if (typeof document === 'undefined') return;

  const profile = getAnimationProfile();
  const mode = profile.reduced ? 'reduced' : profile.lowEnd ? 'lite' : 'full';
  document.documentElement.setAttribute('data-motion-mode', mode);
};
