import React from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Announcement, AnnouncementType } from '../../types';

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss?: () => void;
  canDismiss?: boolean;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  onDismiss,
  canDismiss = false
}) => {
  const getTypeStyles = (type: AnnouncementType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600'
        };
      case 'urgent':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
      default: // info
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600'
        };
    }
  };

  const typeStyles = getTypeStyles(announcement.type);
  const IconComponent = typeStyles.icon;

  // Use custom colors if provided, otherwise use type-based colors
  const customStyle = announcement.backgroundColor || announcement.textColor ? {
    backgroundColor: announcement.backgroundColor || undefined,
    color: announcement.textColor || undefined,
    borderColor: announcement.backgroundColor ? 
      `${announcement.backgroundColor}40` : undefined // Add transparency for border
  } : {};

  const containerClass = announcement.backgroundColor ? 
    'border' : 
    `${typeStyles.bg} ${typeStyles.text}`;

  return (
    <div 
      className={`rounded-xl p-4 mb-6 border-2 ${containerClass} relative overflow-hidden`}
      style={customStyle}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12"></div>
      </div>

      <div className="relative flex items-start gap-4">
        {/* Icon and Emoji */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {announcement.emoji && (
            <span className="text-2xl" role="img" aria-label="announcement emoji">
              {announcement.emoji}
            </span>
          )}
          <div className={`p-2 rounded-lg ${
            announcement.backgroundColor ? 'bg-white/20' : 'bg-white/50'
          }`}>
            <IconComponent 
              size={20} 
              className={announcement.textColor || typeStyles.iconColor} 
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-bold mb-2 ${
            announcement.textColor || typeStyles.text
          }`}>
            {announcement.title}
          </h3>
          <p className={`text-sm leading-relaxed ${
            announcement.textColor ? 
              `${announcement.textColor} opacity-90` : 
              `${typeStyles.text} opacity-80`
          }`}>
            {announcement.description}
          </p>
          
          {/* Metadata */}
          <div className={`mt-3 flex items-center gap-4 text-xs ${
            announcement.textColor ? 
              `${announcement.textColor} opacity-70` : 
              `${typeStyles.text} opacity-60`
          }`}>
            <span>Dibuat oleh: {announcement.createdBy}</span>
            <span>•</span>
            <span>{new Date(announcement.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            {announcement.expiresAt && (
              <>
                <span>•</span>
                <span>Berlaku hingga: {new Date(announcement.expiresAt).toLocaleDateString('id-ID')}</span>
              </>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        {canDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-2 rounded-lg hover:bg-white/20 transition-colors ${
              announcement.textColor || typeStyles.text
            } opacity-60 hover:opacity-100`}
            title="Tutup pengumuman"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Decorative Elements */}
      {announcement.type === 'urgent' && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-red-500 opacity-20"></div>
      )}
      
      {announcement.type === 'success' && (
        <div className="absolute bottom-0 left-0 w-16 h-1 bg-green-400 rounded-full opacity-30"></div>
      )}
    </div>
  );
};

export default AnnouncementBanner;