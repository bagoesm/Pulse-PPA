import React from 'react';

interface UserAvatarProps {
  name: string;
  profilePhoto?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showEditHint?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  profilePhoto,
  size = 'md',
  className = '',
  onClick,
  showEditHint = false,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center font-bold overflow-hidden ${
    onClick ? 'cursor-pointer hover:ring-2 hover:ring-gov-400 transition-all' : ''
  } ${className}`;

  if (profilePhoto) {
    return (
      <div className={`relative group ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        <img
          src={profilePhoto}
          alt={name}
          className={`${baseClasses} object-cover`}
        />
        {showEditHint && onClick && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-[10px] font-medium">Edit</span>
          </div>
        )}
      </div>
    );
  }

  // Generate consistent color based on name
  const colors = [
    'bg-gov-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className={`relative group ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className={`${baseClasses} ${bgColor} text-white`}>
        {initials}
      </div>
      {showEditHint && onClick && (
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-medium">Edit</span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
