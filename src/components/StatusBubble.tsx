import React, { useState } from 'react';
import { Music, Heart, MapPin, Coffee, Briefcase, Smile, X, Clock } from 'lucide-react';
import { UserStatus, StatusType } from '../../types';

interface StatusBubbleProps {
  status: UserStatus;
  onDelete?: () => void;
  canDelete?: boolean;
  showTimeLeft?: boolean;
}

const StatusBubble: React.FC<StatusBubbleProps> = ({ 
  status, 
  onDelete, 
  canDelete = false,
  showTimeLeft = false 
}) => {
  const [showFullContent, setShowFullContent] = useState(false);

  const getStatusIcon = (type: StatusType) => {
    switch (type) {
      case 'music': return Music;
      case 'mood': return Heart;
      case 'activity': return Briefcase;
      case 'location': return MapPin;
      case 'food': return Coffee;
      default: return Smile;
    }
  };

  const getStatusColor = (type: StatusType) => {
    switch (type) {
      case 'music': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'mood': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'activity': return 'bg-green-100 text-green-700 border-green-200';
      case 'location': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'food': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getTimeLeft = () => {
    const now = new Date();
    const expires = new Date(status.expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) return 'Expired';
    if (diffHours > 0) return `${diffHours}j ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  const isExpired = new Date() > new Date(status.expiresAt);
  if (isExpired) return null;

  const Icon = getStatusIcon(status.type);
  const colorClass = getStatusColor(status.type);
  
  // Truncate content if too long
  const maxLength = 50;
  const truncatedContent = status.content.length > maxLength 
    ? status.content.substring(0, maxLength) + '...'
    : status.content;

  return (
    <div className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 ${colorClass} shadow-sm max-w-xs group hover:shadow-md transition-all`}>
      {/* Status Icon */}
      <Icon size={12} className="shrink-0" />
      
      {/* Emoji if exists */}
      {status.emoji && (
        <span className="text-sm shrink-0">{status.emoji}</span>
      )}
      
      {/* Content */}
      <span 
        className="text-xs font-medium cursor-pointer truncate"
        onClick={() => status.content.length > maxLength && setShowFullContent(!showFullContent)}
        title={status.content.length > maxLength ? 'Klik untuk lihat selengkapnya' : undefined}
      >
        {showFullContent ? status.content : truncatedContent}
      </span>

      {/* Time Left */}
      {showTimeLeft && (
        <div className="flex items-center gap-1 text-xs opacity-70">
          <Clock size={10} />
          <span>{getTimeLeft()}</span>
        </div>
      )}

      {/* Delete Button */}
      {canDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded-full"
          title="Hapus status"
        >
          <X size={10} />
        </button>
      )}

      {/* Full Content Tooltip */}
      {showFullContent && status.content.length > maxLength && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 max-w-xs">
          {status.content}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

export default StatusBubble;