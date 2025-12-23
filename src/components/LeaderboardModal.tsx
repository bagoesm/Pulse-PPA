// src/components/LeaderboardModal.tsx
// High Performer Leaderboard Modal for Dashboard

import React from 'react';
import { User } from '../../types';
import { AnalyzedUser } from '../hooks/useWorkloadAnalysis';
import UserAvatar from './UserAvatar';
import { Award } from 'lucide-react';

type LeaderboardPeriod = 'week' | 'month' | 'all';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    leaderboardData: AnalyzedUser[];
    period: LeaderboardPeriod;
    setPeriod: (period: LeaderboardPeriod) => void;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
    isOpen,
    onClose,
    leaderboardData,
    period,
    setPeriod
}) => {
    if (!isOpen) return null;

    const sortedData = [...leaderboardData].sort((a, b) => b.highPerformerScore - a.highPerformerScore);
    const highPerformersCount = leaderboardData.filter(u => u.isHighPerformer).length;
    const avgCompletionRate = leaderboardData.length > 0
        ? Math.round(leaderboardData.reduce((sum, u) => sum + u.completionRate, 0) / leaderboardData.length)
        : 0;
    const totalCompleted = leaderboardData.reduce((sum, u) => sum + u.completedCount, 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white w-full sm:rounded-xl rounded-t-2xl shadow-2xl sm:max-w-4xl max-h-[90vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Mobile handle bar */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                </div>

                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-yellow-500 text-white rounded-lg">
                                <Award size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-2xl font-bold text-slate-800">🏆 Leaderboard</h2>
                                <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                                    Ranking berdasarkan Performance Score (0-100)
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Period Filter */}
                    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-center justify-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-slate-600">Periode:</span>
                        <div className="flex bg-slate-100 rounded-lg p-1 w-full sm:w-auto">
                            {(['week', 'month', 'all'] as LeaderboardPeriod[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${period === p
                                            ? 'bg-white text-gov-600 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-800'
                                        }`}
                                >
                                    {p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Semua'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Period Stats */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-purple-50 p-2 sm:p-4 rounded-lg border border-purple-200 text-center">
                            <div className="text-lg sm:text-2xl font-bold text-purple-600">{highPerformersCount}</div>
                            <div className="text-[10px] sm:text-sm text-purple-700">High Performers</div>
                        </div>
                        <div className="bg-green-50 p-2 sm:p-4 rounded-lg border border-green-200 text-center">
                            <div className="text-lg sm:text-2xl font-bold text-green-600">{avgCompletionRate}%</div>
                            <div className="text-[10px] sm:text-sm text-green-700">Avg Rate</div>
                        </div>
                        <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200 text-center">
                            <div className="text-lg sm:text-2xl font-bold text-blue-600">{totalCompleted}</div>
                            <div className="text-[10px] sm:text-sm text-blue-700">Selesai</div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                        {sortedData.map((data, index) => {
                            const isTop3 = index < 3;
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                            return (
                                <div
                                    key={data.userName}
                                    className={`p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md ${data.isHighPerformer
                                            ? 'bg-gradient-to-r from-purple-50 to-yellow-50 border-purple-200'
                                            : 'bg-slate-50 border-slate-200'
                                        } ${isTop3 ? 'ring-2 ring-yellow-300' : ''}`}
                                >
                                    {/* Mobile Layout */}
                                    <div className="sm:hidden">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-600">#{index + 1}</span>
                                                {medal && <span className="text-base">{medal}</span>}
                                                <UserAvatar
                                                    name={data.userName}
                                                    profilePhoto={data.user.profilePhoto}
                                                    size="sm"
                                                    className="flex-shrink-0"
                                                />
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">{data.userName}</h3>
                                                    <p className="text-xs text-slate-500">{data.user.jabatan || 'Staff'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xl font-bold ${data.isHighPerformer ? 'text-purple-600' : 'text-slate-600'}`}>
                                                    {data.highPerformerScore}
                                                </div>
                                                <div className="text-[10px] text-slate-500">/ 100</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1 text-center bg-white/50 rounded-md p-1.5">
                                            <div><span className="block text-xs font-bold text-slate-800">{data.activeCount}</span><span className="text-[10px] text-slate-500">Aktif</span></div>
                                            <div><span className="block text-xs font-bold text-green-600">{data.completedCount}</span><span className="text-[10px] text-slate-500">Selesai</span></div>
                                            <div><span className="block text-xs font-bold text-gov-600">{data.completionRate.toFixed(0)}%</span><span className="text-[10px] text-slate-500">Rate</span></div>
                                            <div><span className="block text-xs font-bold text-purple-600">{data.performanceScore}</span><span className="text-[10px] text-slate-500">Poin</span></div>
                                        </div>
                                        {data.isHighPerformer && (
                                            <div className="text-xs text-purple-600 font-medium mt-1.5 text-center">🏆 High Performer</div>
                                        )}
                                    </div>

                                    {/* Desktop Layout */}
                                    <div className="hidden sm:flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-600 w-8">#{index + 1}</span>
                                                {medal && <span className="text-xl">{medal}</span>}
                                            </div>
                                            <UserAvatar name={data.userName} profilePhoto={data.user.profilePhoto} size="md" className="flex-shrink-0" />
                                            <div>
                                                <h3 className="font-bold text-slate-800">{data.userName}</h3>
                                                <p className="text-sm text-slate-600">{data.user.jabatan || 'Staff'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="grid grid-cols-4 gap-4 text-center">
                                                <div><span className="block text-sm font-bold text-slate-800">{data.activeCount}</span><span className="text-xs text-slate-500">Aktif</span></div>
                                                <div><span className="block text-sm font-bold text-green-600">{data.completedCount}</span><span className="text-xs text-slate-500">Selesai</span></div>
                                                <div><span className="block text-sm font-bold text-gov-600">{data.completionRate.toFixed(0)}%</span><span className="text-xs text-slate-500">Rate</span></div>
                                                <div><span className="block text-sm font-bold text-purple-600">{data.performanceScore}</span><span className="text-xs text-slate-500">Task Poin</span></div>
                                            </div>

                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${data.isHighPerformer ? 'text-purple-600' : 'text-slate-600'}`}>
                                                    {data.highPerformerScore}
                                                </div>
                                                <div className="text-xs text-slate-500">/ 100</div>
                                                {data.isHighPerformer && (
                                                    <div className="text-xs text-purple-600 font-medium mt-1">🏆 High Performer</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Info Perhitungan */}
                    <div className="border-t border-slate-200 pt-4 sm:pt-6">
                        <details className="sm:open">
                            <summary className="font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 cursor-pointer sm:cursor-default list-none">
                                📊 <span className="text-sm sm:text-base">Cara Perhitungan</span>
                                <span className="sm:hidden text-xs text-slate-500 ml-auto">(tap untuk lihat)</span>
                            </summary>

                            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">40</div>
                                    <div><h4 className="font-semibold text-green-800 text-xs sm:text-sm">Completion</h4><p className="text-[10px] sm:text-xs text-green-700">Rate × 0.4</p></div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">30</div>
                                    <div><h4 className="font-semibold text-blue-800 text-xs sm:text-sm">Task Points</h4><p className="text-[10px] sm:text-xs text-blue-700">Poin × 3</p></div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">20</div>
                                    <div><h4 className="font-semibold text-orange-800 text-xs sm:text-sm">Aktivitas</h4><p className="text-[10px] sm:text-xs text-orange-700">Task aktif</p></div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">10</div>
                                    <div><h4 className="font-semibold text-purple-800 text-xs sm:text-sm">Konsistensi</h4><p className="text-[10px] sm:text-xs text-purple-700">≥3 task</p></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                                <div className="bg-gradient-to-r from-purple-50 to-yellow-50 p-2 sm:p-4 rounded-lg border border-purple-200">
                                    <p className="text-xs sm:text-sm text-purple-700 text-center">
                                        <strong>High Performer:</strong> Skor ≥ 60<br />
                                        <span className="hidden sm:inline"><strong>Task Points:</strong> Urgent=4, High=3, Medium=2, Low=1</span>
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                                    <p className="text-xs sm:text-sm text-blue-700 text-center">
                                        <strong>🔄 Reset tanggal 1</strong><br />
                                        <strong>📅 {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>
                                    </p>
                                </div>
                            </div>
                        </details>
                    </div>

                    <div className="mt-4 sm:mt-6 text-center pb-safe">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-gradient-to-r from-purple-600 to-yellow-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-yellow-700 transition-all"
                        >
                            Tutup Leaderboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardModal;
