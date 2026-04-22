// src/App.tsx - Entry point with proper provider hierarchy
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { SidebarProvider } from './contexts/SidebarContext';
import AppContent from './AppContent';
import { UpdateNotification } from './components/UpdateNotification';
import { setupChunkErrorHandler } from './utils/versionCheck';

// Loading fallback
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-gov-600" size={40} />
      <span className="text-sm text-slate-500">Memuat...</span>
    </div>
  </div>
);

// Inner component that can access auth context
const AppWithData: React.FC = () => {
  const { session } = useAuth();

  return (
    <DataProvider session={session}>
      <AppContent />
    </DataProvider>
  );
};

/**
 * Main App - Provider hierarchy:
 * 1. ErrorBoundary - Catches errors
 * 2. UIProvider - Modal states, filters, notifications
 * 3. SidebarProvider - Sidebar collapse state
 * 4. AuthProvider - Session, login/logout
 * 5. DataProvider - All data (depends on session from AuthProvider)
 * 6. AppContent - UI rendering (consumes all contexts)
 */
const App: React.FC = () => {
  useEffect(() => {
    // Setup global chunk error handler
    setupChunkErrorHandler();
  }, []);

  return (
    <ErrorBoundary>
      <UIProvider>
        <SidebarProvider>
          <AuthProvider>
            <AppWithData />
            <UpdateNotification />
          </AuthProvider>
        </SidebarProvider>
      </UIProvider>
    </ErrorBoundary>
  );
};

export default App; 