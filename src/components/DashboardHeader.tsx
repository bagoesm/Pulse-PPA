// src/components/DashboardHeader.tsx
// Header section for Dashboard

import React from 'react';
import { User } from '../../types';
import NotificationIcon from './NotificationIcon';
import { MessageCircle, Gift } from 'lucide-react';

interface DashboardHeaderProps {
    currentUser: User | null;
    onCreateStatus: () => void;
    onOpenChristmasSettings: () => void;
    // Notification props
    notifications?: any[];
    onMarkAllAsRead?: () => void;
    onNotificationClick?: (notification: any) => void;
    onDeleteNotification?: (notificationId: string) => void;
    onDismissAll?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    currentUser,
    onCreateStatus,
    onOpenChristmasSettings,
    notifications = [],
    onMarkAllAsRead,
    onNotificationClick,
    onDeleteNotification,
    onDismissAll
}) => {
    return (
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-1 md:mb-2">Dashboard Manajemen Tim</h1>
                <p className="text-sm text-slate-600">Pantau performa dan beban kerja tim secara real-time</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                {/* Notification Icon */}
                {onNotificationClick && onMarkAllAsRead && onDeleteNotification && onDismissAll && (
                    <NotificationIcon
                        notifications={notifications}
                        onMarkAllAsRead={onMarkAllAsRead}
                        onNotificationClick={onNotificationClick}
                        onDeleteNotification={onDeleteNotification}
                        onDismissAll={onDismissAll}
                    />
                )}

                {/* Christmas Settings Button (Admin Only) */}
                {currentUser?.role === 'Super Admin' && (
                    <button
                        onClick={onOpenChristmasSettings}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-red-600 to-green-600 text-white rounded-lg font-medium hover:from-red-700 hover:to-green-700 shadow-md hover:shadow-lg transition-all text-sm"
                    >
                        <Gift size={16} />
                        <span className="hidden sm:inline">Dekorasi Natal</span>
                    </button>
                )}

                {/* Create Status Button */}
                <button
                    onClick={onCreateStatus}
                    className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-gov-600 to-blue-600 text-white rounded-lg font-medium hover:from-gov-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all text-sm flex-1 sm:flex-none justify-center"
                >
                    <MessageCircle size={16} />
                    <span className="hidden sm:inline">Buat Status</span>
                    <span className="sm:hidden">Status</span>
                </button>
            </div>
        </div>
    );
};

export default DashboardHeader;
