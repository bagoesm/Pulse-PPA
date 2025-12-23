// src/App.tsx - Entry point with proper provider hierarchy
import React from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider } from './contexts/UIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import AppContent from './AppContent';

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
 * 3. AuthProvider - Session, login/logout
 * 4. DataProvider - All data (depends on session from AuthProvider)
 * 5. AppContent - UI rendering (consumes all contexts)
 */
const App: React.FC = () => (
  <ErrorBoundary>
    <UIProvider>
      <AuthProvider>
        <AppWithData />
      </AuthProvider>
    </UIProvider>
  </ErrorBoundary>
);

export default App; 