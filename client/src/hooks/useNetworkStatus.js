/**
 * useNetworkStatus hook - tracks online/offline state
 * Provides offline-aware UI capabilities
 */
import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState(null);
  const [effectiveType, setEffectiveType] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection API for detailed info (Chrome/Edge)
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      setConnectionType(connection.type);
      setEffectiveType(connection.effectiveType);

      const handleConnectionChange = () => {
        setConnectionType(connection.type);
        setEffectiveType(connection.effectiveType);
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    effectiveType,
    // Helper to determine if user is on slow connection
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g',
  };
}

/**
 * useOfflineAware hook - provides offline-aware state and actions
 */
export function useOfflineAware() {
  const networkStatus = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState([]);

  const queueAction = useCallback((action) => {
    setPendingActions((prev) => [...prev, { id: Date.now(), ...action }]);
  }, []);

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  const removePendingAction = useCallback((id) => {
    setPendingActions((prev) => prev.filter((action) => action.id !== id));
  }, []);

  return {
    ...networkStatus,
    pendingActions,
    queueAction,
    clearPendingActions,
    removePendingAction,
    hasPendingActions: pendingActions.length > 0,
  };
}
