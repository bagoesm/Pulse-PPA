/**
 * Version Check Utility
 * Automatically detects new app versions and prompts user to reload
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_KEY = 'app_version';

export const getCurrentVersion = (): string => {
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
};

export const getStoredVersion = (): string | null => {
  return localStorage.getItem(VERSION_KEY);
};

export const setStoredVersion = (version: string): void => {
  localStorage.setItem(VERSION_KEY, version);
};

export const clearStoredVersion = (): void => {
  localStorage.removeItem(VERSION_KEY);
};

/**
 * Check if app version has changed
 */
export const hasVersionChanged = (): boolean => {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  
  if (!storedVersion) {
    setStoredVersion(currentVersion);
    return false;
  }
  
  return currentVersion !== storedVersion;
};

/**
 * Force reload the app with cache bypass
 */
export const forceReload = (): void => {
  // Clear service worker cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
  
  // Update stored version
  setStoredVersion(getCurrentVersion());
  
  // Hard reload
  window.location.reload();
};

/**
 * Check for version updates periodically
 */
export const startVersionCheck = (onUpdateAvailable: () => void): (() => void) => {
  // Initial check
  if (hasVersionChanged()) {
    onUpdateAvailable();
  }
  
  // Periodic check
  const intervalId = setInterval(() => {
    // Fetch version.json to check for updates
    fetch('/version.json?t=' + Date.now(), {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        const currentVersion = getCurrentVersion();
        if (data.version && data.version !== currentVersion) {
          onUpdateAvailable();
        }
      })
      .catch(err => {
        console.warn('Version check failed:', err);
      });
  }, VERSION_CHECK_INTERVAL);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

/**
 * Enhanced error handler that detects chunk loading errors
 */
export const isChunkLoadError = (error: Error): boolean => {
  const chunkFailedMessage = /Loading chunk [\d]+ failed/;
  const cssChunkFailedMessage = /Loading CSS chunk [\d]+ failed/;
  const dynamicImportError = /Failed to fetch dynamically imported module/;
  
  return (
    chunkFailedMessage.test(error.message) ||
    cssChunkFailedMessage.test(error.message) ||
    dynamicImportError.test(error.message)
  );
};

/**
 * Handle chunk load errors with automatic reload
 */
export const handleChunkError = (error: Error): void => {
  if (isChunkLoadError(error)) {
    console.warn('Chunk load error detected, forcing reload...', error);
    
    // Show user-friendly message
    const shouldReload = window.confirm(
      'Aplikasi telah diperbarui. Halaman akan dimuat ulang untuk menerapkan pembaruan.\n\n' +
      'Klik OK untuk melanjutkan.'
    );
    
    if (shouldReload) {
      forceReload();
    }
  }
};

/**
 * Setup global error handler for chunk errors
 */
export const setupChunkErrorHandler = (): void => {
  window.addEventListener('error', (event) => {
    if (event.error && isChunkLoadError(event.error)) {
      event.preventDefault();
      handleChunkError(event.error);
    }
  });
  
  // Handle unhandled promise rejections (for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason instanceof Error && isChunkLoadError(event.reason)) {
      event.preventDefault();
      handleChunkError(event.reason);
    }
  });
};
