// src/components/SimpleToast.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface SimpleToastProps {
    isOpen: boolean;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    duration?: number;
}

const SimpleToast: React.FC<SimpleToastProps> = ({
    isOpen,
    message,
    type = 'success',
    onClose,
    duration = 3000
}) => {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    const icons = {
        success: <CheckCircle2 className="text-green-600" size={18} />,
        error: <AlertCircle className="text-red-600" size={18} />,
        info: <Info className="text-blue-600" size={18} />,
        warning: <AlertCircle className="text-amber-600" size={18} />,
    };

    const bgColors = {
        success: 'bg-white border-green-100 shadow-green-100/50',
        error: 'bg-white border-red-100 shadow-red-100/50',
        info: 'bg-white border-blue-100 shadow-blue-100/50',
        warning: 'bg-white border-amber-100 shadow-amber-100/50',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
                    className="fixed bottom-8 left-1/2 z-[100] w-auto max-w-[90vw] sm:max-w-md"
                >
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${bgColors[type]} bg-white/95 backdrop-blur-md`}>
                        <div className="flex-shrink-0">
                            {icons[type]}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                            {message}
                        </p>
                        <button 
                            onClick={onClose}
                            className="ml-2 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group"
                        >
                            <X size={14} className="group-hover:text-slate-600" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SimpleToast;
