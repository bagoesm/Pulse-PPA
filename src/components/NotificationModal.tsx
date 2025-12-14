import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={24} />;
      case 'error': return <AlertCircle className="text-red-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-l-green-500';
      case 'warning': return 'border-l-orange-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 border-l-4 ${getBorderColor()}`}>
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between ${
          type === 'success' ? 'bg-green-50' :
          type === 'warning' ? 'bg-orange-50' :
          type === 'error' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              type === 'success' ? 'bg-green-100' :
              type === 'warning' ? 'bg-orange-100' :
              type === 'error' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {getIcon()}
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full text-slate-400 hover:text-slate-600 transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">{message}</p>
        </div>

        {/* Action Button for non-auto-close modals */}
        {!autoClose && (
          <div className="px-6 pb-6 flex justify-end">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 ${
                type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                type === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
                type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              OK
            </button>
          </div>
        )}

        {/* Auto-close progress bar */}
        {autoClose && (
          <div className="h-1.5 bg-slate-100">
            <div 
              className={`h-full transition-all ease-linear ${
                type === 'success' ? 'bg-green-500' :
                type === 'warning' ? 'bg-orange-500' :
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{
                animation: `shrink ${autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default NotificationModal;