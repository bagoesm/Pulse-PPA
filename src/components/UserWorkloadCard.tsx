// src/components/UserWorkloadCard.tsx
// Individual user card with animations for Dashboard

import React from 'react';
import { User, UserStatus as UserStatusType, ChristmasDecorationSettings } from '../../types';
import { AnalyzedUser } from '../hooks/useWorkloadAnalysis';
import StatusBubble from './StatusBubble';
import SakuraAnimation from './SakuraAnimation';
import SnowAnimation from './SnowAnimation';
import MoneyAnimation from './MoneyAnimation';
import ChristmasDecorations from './ChristmasDecorations';
import UserAvatar from './UserAvatar';
import ShareButton from './ShareButton';
import { Eye, Clock } from 'lucide-react';

interface UserWorkloadCardProps {
    data: AnalyzedUser;
    userStatus?: UserStatusType;
    isHovered: boolean;
    christmasSettings: ChristmasDecorationSettings;
    currentUser: User | null;
    onHover: (userId: string | null) => void;
    onClick: () => void;
    onDeleteStatus: (statusId: string) => void;
    onShare: () => void;
}

const UserWorkloadCard: React.FC<UserWorkloadCardProps> = ({
    data,
    userStatus,
    isHovered,
    christmasSettings,
    currentUser,
    onHover,
    onClick,
    onDeleteStatus,
    onShare
}) => {
    const VisualIcon = data.visuals.icon;
    const percentage = Math.min((data.score / 30) * 100, 100);

    const isHoveredWithSakura = isHovered && data.user.sakuraAnimationEnabled;
    const isHoveredWithSnow = isHovered && data.user.snowAnimationEnabled;
    const isHoveredWithMoney = isHovered && data.user.moneyAnimationEnabled;

    const getHoverTextColor = (defaultColor: string) => {
        if (isHoveredWithSakura) return 'text-pink-700';
        if (isHoveredWithSnow) return 'text-blue-700';
        if (isHoveredWithMoney) return 'text-green-700';
        return defaultColor;
    };

    const getHoverTextColorLight = (defaultColor: string) => {
        if (isHoveredWithSakura) return 'text-pink-600';
        if (isHoveredWithSnow) return 'text-blue-600';
        if (isHoveredWithMoney) return 'text-green-600';
        return defaultColor;
    };

    return (
        <div
            className={`rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 group cursor-pointer transform hover:scale-[1.02] relative ${isHoveredWithSakura
                ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 shadow-pink-100/50 hover:shadow-lg'
                : isHoveredWithSnow
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-blue-100/50 hover:shadow-lg'
                    : isHoveredWithMoney
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-green-100/50 hover:shadow-lg'
                        : 'bg-white border-slate-200 hover:shadow-lg hover:border-gov-300'
                }`}
            onClick={onClick}
            onMouseEnter={() => onHover(data.user.id)}
            onMouseLeave={() => onHover(null)}
            title={`Klik untuk melihat semua task ${data.userName} (${data.activeCount} aktif, ${data.completedCount} selesai)`}
        >
            {/* Christmas Decorations */}
            <ChristmasDecorations
                santaHatEnabled={christmasSettings.santaHatEnabled}
                baubleEnabled={christmasSettings.baubleEnabled}
                candyEnabled={christmasSettings.candyEnabled}
                position="card-top"
            />
            <ChristmasDecorations
                santaHatEnabled={christmasSettings.santaHatEnabled}
                baubleEnabled={christmasSettings.baubleEnabled}
                candyEnabled={christmasSettings.candyEnabled}
                position="card-bottom"
            />

            {/* Animations */}
            <SakuraAnimation isActive={isHovered && data.user.sakuraAnimationEnabled === true} petalCount={6} />
            <SnowAnimation isActive={isHovered && data.user.snowAnimationEnabled === true} flakeCount={40} />
            <MoneyAnimation isActive={isHovered && data.user.moneyAnimationEnabled === true} billCount={25} />

            {/* HEADER */}
            <div className={`p-5 border-b transition-colors ${isHoveredWithSakura ? 'border-pink-100' :
                isHoveredWithSnow ? 'border-blue-100' :
                    isHoveredWithMoney ? 'border-green-100' :
                        'border-slate-100'
                }`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 relative">
                        <div className="relative">
                            {data.user.profilePhoto ? (
                                <UserAvatar
                                    name={data.userName}
                                    profilePhoto={data.user.profilePhoto}
                                    size="lg"
                                    className={`border-2 border-white shadow-sm group-hover:scale-110 transition-all ${isHoveredWithSakura ? 'ring-2 ring-pink-400' :
                                        isHoveredWithSnow ? 'ring-2 ring-blue-400' :
                                            isHoveredWithMoney ? 'ring-2 ring-green-400' : ''
                                        }`}
                                />
                            ) : (
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm ${isHoveredWithSakura ? 'bg-pink-400' :
                                    isHoveredWithSnow ? 'bg-blue-400' :
                                        isHoveredWithMoney ? 'bg-green-400' :
                                            data.visuals.color
                                    } text-white group-hover:scale-110 transition-all`}>
                                    {data.userName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <ChristmasDecorations
                                santaHatEnabled={christmasSettings.santaHatEnabled}
                                baubleEnabled={christmasSettings.baubleEnabled}
                                candyEnabled={christmasSettings.candyEnabled}
                                position="avatar"
                            />
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-bold transition-colors ${getHoverTextColor('text-slate-800 group-hover:text-gov-700')}`}>
                                {data.userName}
                            </h4>
                            <p className={`text-xs transition-colors ${getHoverTextColorLight('text-slate-500')}`}>
                                {data.user.jabatan || 'Staff'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentUser && data.userName === currentUser.name && (
                                <ShareButton onClick={onShare} className="p-1 bg-white/90 hover:bg-white" />
                            )}
                            <Eye size={16} className={getHoverTextColorLight('text-gov-600')} />
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors ${isHoveredWithSakura
                        ? 'bg-pink-100 text-pink-700'
                        : isHoveredWithSnow
                            ? 'bg-blue-100 text-blue-700'
                            : isHoveredWithMoney
                                ? 'bg-green-100 text-green-700'
                                : `${data.visuals.bg} ${data.visuals.textColor}`
                        }`}>
                        <VisualIcon size={12} />
                        {data.visuals.label}
                    </span>
                </div>

                {/* User Status */}
                {userStatus && (
                    <div className="mb-3">
                        <StatusBubble
                            status={userStatus}
                            onDelete={() => onDeleteStatus(userStatus.id)}
                            canDelete={currentUser?.id === userStatus.userId}
                            showTimeLeft={currentUser?.id === userStatus.userId}
                        />
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                        <span className={`block text-lg font-bold transition-colors ${getHoverTextColor('text-slate-800')}`}>
                            {data.activeCount}
                        </span>
                        <span className={`text-[9px] font-medium transition-colors ${getHoverTextColorLight('text-slate-500')}`}>
                            Aktif
                        </span>
                    </div>
                    <div>
                        <span className={`block text-lg font-bold transition-colors ${getHoverTextColor('text-green-600')}`}>
                            {data.completedCount}
                        </span>
                        <span className={`text-[9px] font-medium transition-colors ${getHoverTextColorLight('text-green-600')}`}>
                            Selesai
                        </span>
                    </div>
                    <div>
                        <span className={`block text-lg font-bold transition-colors ${getHoverTextColor('text-gov-600')}`}>
                            {data.completionRate.toFixed(0)}%
                        </span>
                        <span className={`text-[9px] font-medium transition-colors ${getHoverTextColorLight('text-gov-600')}`}>
                            Rate
                        </span>
                    </div>
                    <div>
                        <span className={`block text-lg font-bold transition-colors ${getHoverTextColor('text-purple-600')}`}>
                            {data.performanceScore}
                        </span>
                        <span className={`text-[9px] font-medium transition-colors ${getHoverTextColorLight('text-purple-600')}`}>
                            Poin
                        </span>
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="p-5">
                {/* Workload Meter */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                        <span className={`font-semibold transition-colors ${getHoverTextColor('text-slate-600')}`}>
                            Beban Kerja: {data.score} poin
                        </span>
                        <span className={`transition-colors ${getHoverTextColorLight('text-slate-400')}`}>
                            {percentage.toFixed(0)}% kapasitas
                        </span>
                    </div>
                    <div className={`h-2.5 w-full rounded-full overflow-hidden transition-colors ${isHoveredWithSakura ? 'bg-pink-100' :
                        isHoveredWithSnow ? 'bg-blue-100' :
                            isHoveredWithMoney ? 'bg-green-100' :
                                'bg-slate-100'
                        }`}>
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${isHoveredWithSakura ? 'bg-pink-400' :
                                isHoveredWithSnow ? 'bg-blue-400' :
                                    isHoveredWithMoney ? 'bg-green-400' :
                                        data.visuals.color
                                }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className={`text-xs mt-2 italic transition-colors ${getHoverTextColorLight('text-slate-500')}`}>
                        "{data.visuals.message}"
                    </p>
                </div>

                {/* Upcoming Deadlines Alert */}
                {data.upcomingDeadlines > 0 && (
                    <div className={`mb-4 p-2 rounded-lg flex items-center gap-2 transition-colors ${isHoveredWithSakura
                        ? 'bg-pink-50 border border-pink-200'
                        : isHoveredWithSnow
                            ? 'bg-blue-50 border border-blue-200'
                            : isHoveredWithMoney
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-orange-50 border border-orange-200'
                        }`}>
                        <Clock size={14} className={getHoverTextColorLight('text-orange-600')} />
                        <span className={`text-xs font-medium transition-colors ${getHoverTextColor('text-orange-700')}`}>
                            {data.upcomingDeadlines} deadline dalam 3 hari
                        </span>
                    </div>
                )}

                {/* Priority Breakdown */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { count: data.urgentCount, label: 'Urgent', defaultBg: 'bg-red-50', defaultBorder: 'border-red-100', defaultText: 'text-red-600', defaultLabel: 'text-red-500' },
                        { count: data.highCount, label: 'High', defaultBg: 'bg-orange-50', defaultBorder: 'border-orange-100', defaultText: 'text-orange-600', defaultLabel: 'text-orange-500' },
                        { count: data.mediumCount, label: 'Med', defaultBg: 'bg-blue-50', defaultBorder: 'border-blue-100', defaultText: 'text-blue-600', defaultLabel: 'text-blue-500' },
                        { count: data.lowCount, label: 'Low', defaultBg: 'bg-slate-50', defaultBorder: 'border-slate-100', defaultText: 'text-slate-600', defaultLabel: 'text-slate-500' }
                    ].map((item, idx) => (
                        <div key={idx} className={`text-center p-2 rounded-lg transition-colors ${isHoveredWithSakura
                            ? 'bg-pink-50 border border-pink-100 hover:bg-pink-100'
                            : isHoveredWithSnow
                                ? 'bg-blue-50 border border-blue-100 hover:bg-blue-100'
                                : isHoveredWithMoney
                                    ? 'bg-green-50 border border-green-100 hover:bg-green-100'
                                    : `${item.defaultBg} border ${item.defaultBorder} hover:${item.defaultBg.replace('50', '100')}`
                            }`}>
                            <span className={`block text-lg font-bold transition-colors ${getHoverTextColor(item.defaultText)}`}>
                                {item.count}
                            </span>
                            <span className={`text-[9px] font-semibold uppercase transition-colors ${getHoverTextColorLight(item.defaultLabel)}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Click hint */}
                <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={`text-xs font-medium flex items-center justify-center gap-1 transition-colors ${getHoverTextColorLight('text-gov-600')}`}>
                        <Eye size={12} />
                        Klik untuk lihat task
                    </span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(UserWorkloadCard);
