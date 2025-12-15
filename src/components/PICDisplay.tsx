// src/components/PICDisplay.tsx
import React from 'react';

interface PICDisplayProps {
  pic: string | string[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
  className?: string;
}

const PICDisplay: React.FC<PICDisplayProps> = ({ 
  pic, 
  maxVisible = 3, 
  size = 'sm',
  showNames = false,
  className = ''
}) => {
  const picArray = Array.isArray(pic) ? pic : (pic ? [pic] : []);
  
  if (picArray.length === 0) {
    return (
      <span className={`text-slate-400 text-xs ${className}`}>
        No PIC
      </span>
    );
  }

  const sizeClasses = {
    sm: 'w-5 h-5 text-[9px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm'
  };

  const visiblePics = picArray.slice(0, maxVisible);
  const hiddenCount = picArray.length - visiblePics.length;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Avatar circles */}
      <div className="flex items-center -space-x-1">
        {visiblePics.map((picName, index) => (
          <div 
            key={index} 
            className={`${sizeClasses[size]} rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold ring-2 ring-white z-${10 - index}`}
            title={picName}
          >
            {picName && typeof picName === 'string' ? picName.charAt(0).toUpperCase() : '?'}
          </div>
        ))}
        {hiddenCount > 0 && (
          <div 
            className={`${sizeClasses[size]} rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold ring-2 ring-white`}
            title={`+${hiddenCount} more: ${picArray.slice(maxVisible).join(', ')}`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* Names */}
      {showNames && (
        <span className="text-xs text-slate-600 font-medium ml-1">
          {picArray.length === 1 
            ? picArray[0].split(' ')[0] 
            : `${picArray.length} PIC${picArray.length > 1 ? 's' : ''}`
          }
        </span>
      )}
    </div>
  );
};

export default PICDisplay;