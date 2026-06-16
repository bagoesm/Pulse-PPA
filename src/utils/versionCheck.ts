/**
 * Version Check & Chunk Error Recovery Utility
 * Automatically detects new app versions and recovers from chunk loading errors.
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_KEY = 'app_version';
const BUILD_ID_KEY = 'app_build_id';

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

// New Build ID Utilities
export const getCurrentBuildId = (): string => {
  return (import.meta.env as any).VITE_BUILD_ID || 'development';
};

export const getStoredBuildId = (): string | null => {
  return localStorage.getItem(BUILD_ID_KEY);
};

export const setStoredBuildId = (buildId: string): void => {
  localStorage.setItem(BUILD_ID_KEY, buildId);
};

export const clearStoredBuildId = (): void => {
  localStorage.removeItem(BUILD_ID_KEY);
};

// Auto-initialize stored build ID on file load
const currentBuildId = getCurrentBuildId();
if (currentBuildId !== 'development') {
  setStoredBuildId(currentBuildId);
  setStoredVersion(getCurrentVersion());
}

/**
 * Check if app version has changed
 */
export const hasVersionChanged = (): boolean => {
  const currentBuild = getCurrentBuildId();
  if (currentBuild === 'development') return false;
  
  const storedBuild = getStoredBuildId();
  if (!storedBuild) {
    setStoredBuildId(currentBuild);
    return false;
  }
  
  return currentBuild !== storedBuild;
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
  
  // Update stored version & build ID
  if (currentBuildId !== 'development') {
    setStoredBuildId(currentBuildId);
    setStoredVersion(getCurrentVersion());
  }
  
  // Hard reload
  window.location.reload();
};

/**
 * Check for version updates periodically
 */
export const startVersionCheck = (onUpdateAvailable: () => void): (() => void) => {
  const currentBuild = getCurrentBuildId();
  if (currentBuild === 'development') {
    return () => {}; // No-op in development
  }

  // Initial check on load
  checkServerVersion(onUpdateAvailable);
  
  // Periodic check
  const intervalId = setInterval(() => {
    checkServerVersion(onUpdateAvailable);
  }, VERSION_CHECK_INTERVAL);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

const checkServerVersion = (onUpdateAvailable: () => void) => {
  fetch('/version.json?t=' + Date.now(), {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch version info: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const currentBuild = getCurrentBuildId();
      // Compare server's buildId with our current running buildId
      if (data.buildId && data.buildId !== 'development' && data.buildId !== currentBuild) {
        console.info(`[VersionCheck] New build detected! Server: ${data.buildId}, Client: ${currentBuild}`);
        onUpdateAvailable();
      }
    })
    .catch(err => {
      console.warn('[VersionCheck] Version check failed:', err);
    });
};

/**
 * Enhanced error handler that detects chunk loading errors
 */
export const isChunkLoadError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || (typeof error === 'string' ? error : '');
  
  const chunkFailedMessage = /Loading chunk [\d]+ failed/;
  const cssChunkFailedMessage = /Loading CSS chunk [\d]+ failed/;
  const dynamicImportError = /Failed to fetch dynamically imported module/;
  
  return (
    chunkFailedMessage.test(message) ||
    cssChunkFailedMessage.test(message) ||
    dynamicImportError.test(message)
  );
};

/**
 * Handle chunk load errors with automatic reload
 */
export const handleChunkError = (error: any): void => {
  if (isChunkLoadError(error)) {
    console.warn('[VersionCheck] Chunk load error detected, recovering...', error);
    
    // Avoid infinite reload loops
    const isRetry = sessionStorage.getItem('chunk_retry') === 'true';
    if (!isRetry) {
      sessionStorage.setItem('chunk_retry', 'true');
      forceReload();
    } else {
      console.error('[VersionCheck] Chunk load error persisted after reload. Showing notice.');
      alert('Gagal memuat beberapa komponen aplikasi. Silakan periksa koneksi internet Anda atau muat ulang halaman secara manual.');
    }
  }
};

/**
 * Setup global error handler for chunk errors
 */
export const setupChunkErrorHandler = (): void => {
  window.addEventListener('error', (event) => {
    if (event.error) {
      handleChunkError(event.error);
    }
  });
  
  // Handle unhandled promise rejections (for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason) {
      handleChunkError(event.reason);
    }
  });
};
