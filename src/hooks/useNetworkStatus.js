import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    let timeoutId;

    const handleOnline = () => {
      clearTimeout(timeoutId);
      setIsOnline(true);
    };

    const handleOffline = () => {
      // Smooth out the connection layer
      timeoutId = setTimeout(() => {
        setIsOnline(false);
      }, 1500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
