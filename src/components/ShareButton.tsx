import React from 'react';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  onClick: () => void;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // Prevent card click
        onClick();
      }}
      className={`p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 hover:border-gov-300 shadow-sm hover:shadow-md transition-all group/share ${className}`}
      title="Share task summary"
    >
      <Share2 size={14} className="text-slate-600 group-hover/share:text-gov-600 transition-colors" />
    </button>
  );
};

export default ShareButton;