import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, MessageCircle, Clock, X, Eye } from 'lucide-react';
import { Notification } from '../../types';

interface NotificationIconProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  onDeleteNotification: (notificationId: string) => void;
  onDismissAll: () => void;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({
  notifications,
  onMarkAllAsRead,
  onNotificationClick,
  onDeleteNotification,
  onDismissAll
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle dropdown open - dismiss all notifications when user opens dropdown
  const handleDropdownToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // When opening dropdown, mark all notifications as dismissed (seen)
    if (newIsOpen && notifications.length > 0) {
      onDismissAll();
    }
  };

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  // Close dropdown when clicking outside (only for desktop dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if it's the desktop dropdown (not mobile modal)
        const isMobile = window.innerWidth < 640;
        if (!isMobile) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getNotificationIcon = useMemo(() => ({
    comment: <MessageCircle size={16} className="text-blue-500" />,
    deadline: <Clock size={16} className="text-orange-500" />,
    default: <Bell size={16} className="text-slate-500" />
  }), []);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  const handleNotificationClick = (notification: Notification) => {
    // onNotificationClick sudah handle mark as read di useNotifications
    onNotificationClick(notification);
    setIsOpen(false);
  };

  const NotificationContent = () => (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Notifikasi</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-gov-600 hover:text-gov-700 font-medium flex items-center gap-1"
              >
                <Eye size={12} />
                <span className="hidden sm:inline">Tandai Semua Dibaca</span>
                <span className="sm:hidden">Dibaca</span>
              </button>
            )}
            {/* Close button for mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="sm:hidden p-1 hover:bg-slate-200 rounded-full text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            <Bell size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors group ${
                !notification.isRead ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon[notification.type as keyof typeof getNotificationIcon] || getNotificationIcon.default}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-medium ${
                      !notification.isRead ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {notification.title}
                    </h4>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notification.id);
                      }}
                      className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-all"
                      title="Hapus notifikasi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex-shrink-0 safe-area-bottom">
          <p className="text-xs text-slate-500 text-center">
            Notifikasi otomatis terhapus setelah 1 minggu
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={handleDropdownToggle}
        className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
        title={`${unreadCount} notifikasi belum dibaca`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Dropdown */}
      {isOpen && (
        <div className="hidden sm:flex sm:flex-col absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[70vh] overflow-hidden">
          <NotificationContent />
        </div>
      )}

      {/* Mobile Bottom Sheet Modal */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle bar */}
            <div className="flex justify-center py-2 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            
            <NotificationContent />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;