// src/components/common/LoadingIndicator.tsx
// Unified loading indicator component
import React from 'react';
import { LoadingOperation, getLoadingMessage } from '../../hooks/useLoadingState';

interface LoadingIndicatorProps {
  operation: LoadingOperation;
  message?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  operation,
  message,
  progress,
  size = 'md',
  inline = false,
}) => {
  if (operation === 'idle') return null;

  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
  };

  const displayMessage = message || getLoadingMessage(operation);

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`animate-spin rounded-full border-gov-600 border-t-transparent ${sizeClasses[size]}`} />
        {displayMessage && <span className="text-sm text-slate-600">{displayMessage}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className={`animate-spin rounded-full border-gov-600 border-t-transparent ${sizeClasses[size]}`} />
      {displayMessage && (
        <p className="text-sm text-slate-600 font-medium">{displayMessage}</p>
      )}
      {progress !== undefined && (
        <div className="w-48 bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gov-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default LoadingIndicator;

/**
 * Skeleton loader for content
 */
export const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3,
  className = '' 
}) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className="h-4 bg-slate-200 rounded"
          style={{ width: `${100 - (i * 10)}%` }}
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton loader
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
