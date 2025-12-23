import React, { useMemo, useState } from 'react';
import { Task, User, Status, Priority } from '../../types';
import UserAvatar from './UserAvatar';
import {
  Flame,
  Trophy,
  Zap,
  Clock,
  Target,
  Layers,
  Coffee
} from 'lucide-react';

interface SiPalingSectionProps {
  tasks: Task[];
  users: User[];
}

interface SiPalingCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  emoji: string;
}

const SI_PALING_CATEGORIES: SiPalingCategory[] = [
  { id: 'sibuk', title: 'Paling Sibuk', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100', emoji: '🔥' },
  { id: 'produktif', title: 'Paling Produktif', icon: Trophy, color: 'text-yellow-600', bgColor: 'bg-yellow-100', emoji: '🏆' },
  { id: 'cepat', title: 'Paling Kilat', icon: Zap, color: 'text-blue-600', bgColor: 'bg-blue-100', emoji: '⚡' },
  { id: 'urgent', title: 'Paling Tangguh', icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-100', emoji: '💪' },
  { id: 'ontime', title: 'Paling On-Time', icon: Clock, color: 'text-green-600', bgColor: 'bg-green-100', emoji: '⏰' },
  { id: 'multitasker', title: 'Paling Multitasking', icon: Layers, color: 'text-pink-600', bgColor: 'bg-pink-100', emoji: '🎯' },
  { id: 'santai', title: 'Paling Santai', icon: Coffee, color: 'text-slate-600', bgColor: 'bg-slate-100', emoji: '☕' }
];

const SiPalingSection: React.FC<SiPalingSectionProps> = ({ tasks, users }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const getDateRange = (p: 'week' | 'month') => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (p === 'week') {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    } else {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
    }
  };

  const getFilteredTasks = (userTasks: Task[], p: 'week' | 'month') => {
    const dateRange = getDateRange(p);
    return userTasks.filter(task => {
      const taskDate = task.status === Status.Done
        ? new Date(task.deadline)
        : new Date(task.startDate);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });
  };

  const calculateWinners = (p: 'week' | 'month') => {
    const usedUserIds = new Set<string>();
    const winners: { category: SiPalingCategory; user: User; stat: string }[] = [];

    const userStats = users.map(user => {
      const userTasks = tasks.filter(t =>
        Array.isArray(t.pic) ? t.pic.includes(user.name) : t.pic === user.name
      );
      const filteredTasks = getFilteredTasks(userTasks, p);
      const activeTasks = filteredTasks.filter(t => t.status !== Status.Done);
      const completedTasks = filteredTasks.filter(t => t.status === Status.Done);

      let workloadScore = 0;
      activeTasks.forEach(t => {
        if (t.priority === Priority.Urgent) workloadScore += 4;
        else if (t.priority === Priority.High) workloadScore += 3;
        else if (t.priority === Priority.Medium) workloadScore += 2;
        else workloadScore += 1;
      });

      const urgentCompleted = completedTasks.filter(t =>
        t.priority === Priority.Urgent || t.priority === Priority.High
      ).length;

      let avgCompletionDays = Infinity;
      if (completedTasks.length > 0) {
        const totalDays = completedTasks.reduce((sum, task) => {
          const start = new Date(task.startDate);
          const end = new Date(task.deadline);
          return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);
        avgCompletionDays = totalDays / completedTasks.length;
      }

      const onTimeRate = completedTasks.length > 0 ? 100 : 0;
      const uniqueCategories = new Set(filteredTasks.map(t => t.category)).size;

      return {
        user,
        activeCount: activeTasks.length,
        completedCount: completedTasks.length,
        workloadScore,
        urgentCompleted,
        avgCompletionDays,
        onTimeRate,
        uniqueCategories
      };
    });

    const sibuk = userStats.filter(s => !usedUserIds.has(s.user.id) && s.activeCount > 0).sort((a, b) => b.workloadScore - a.workloadScore)[0];
    if (sibuk) { usedUserIds.add(sibuk.user.id); winners.push({ category: SI_PALING_CATEGORIES[0], user: sibuk.user, stat: `${sibuk.activeCount} task` }); }

    const produktif = userStats.filter(s => !usedUserIds.has(s.user.id) && s.completedCount > 0).sort((a, b) => b.completedCount - a.completedCount)[0];
    if (produktif) { usedUserIds.add(produktif.user.id); winners.push({ category: SI_PALING_CATEGORIES[1], user: produktif.user, stat: `${produktif.completedCount} selesai` }); }

    const cepat = userStats.filter(s => !usedUserIds.has(s.user.id) && s.completedCount >= 1 && s.avgCompletionDays < Infinity).sort((a, b) => a.avgCompletionDays - b.avgCompletionDays)[0];
    if (cepat) { usedUserIds.add(cepat.user.id); winners.push({ category: SI_PALING_CATEGORIES[2], user: cepat.user, stat: `${cepat.avgCompletionDays.toFixed(0)} hari` }); }

    const urgent = userStats.filter(s => !usedUserIds.has(s.user.id) && s.urgentCompleted > 0).sort((a, b) => b.urgentCompleted - a.urgentCompleted)[0];
    if (urgent) { usedUserIds.add(urgent.user.id); winners.push({ category: SI_PALING_CATEGORIES[3], user: urgent.user, stat: `${urgent.urgentCompleted} urgent` }); }

    const ontime = userStats.filter(s => !usedUserIds.has(s.user.id) && s.completedCount >= 1).sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    if (ontime) { usedUserIds.add(ontime.user.id); winners.push({ category: SI_PALING_CATEGORIES[4], user: ontime.user, stat: `${ontime.onTimeRate}%` }); }

    const multi = userStats.filter(s => !usedUserIds.has(s.user.id) && s.uniqueCategories > 0).sort((a, b) => b.uniqueCategories - a.uniqueCategories)[0];
    if (multi) { usedUserIds.add(multi.user.id); winners.push({ category: SI_PALING_CATEGORIES[5], user: multi.user, stat: `${multi.uniqueCategories} kategori` }); }

    const santai = userStats.filter(s => !usedUserIds.has(s.user.id)).sort((a, b) => a.workloadScore - b.workloadScore)[0];
    if (santai) { usedUserIds.add(santai.user.id); winners.push({ category: SI_PALING_CATEGORIES[6], user: santai.user, stat: santai.activeCount === 0 ? 'Bebas!' : `${santai.activeCount} task` }); }

    return winners;
  };

  const siPalingWinners = useMemo(() => calculateWinners(period), [tasks, users, period]);

  if (siPalingWinners.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">🌟 Si Paling</h3>
        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 text-sm">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-md transition-all ${period === 'week' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500'
              }`}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-md transition-all ${period === 'month' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500'
              }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {siPalingWinners.map(({ category, user, stat }) => (
          <div key={category.id} className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className={`relative mb-2 p-1 rounded-full ${category.bgColor}`}>
              {user.profilePhoto ? (
                <UserAvatar name={user.name} profilePhoto={user.profilePhoto} size="lg" />
              ) : (
                <div className={`w-12 h-12 rounded-full ${category.bgColor} ${category.color} flex items-center justify-center text-lg font-bold`}>
                  {user.name.charAt(0)}
                </div>
              )}
              <span className="absolute -top-1 -right-1 text-sm">{category.emoji}</span>
            </div>
            <span className={`text-[10px] font-semibold ${category.color} ${category.bgColor} px-2 py-0.5 rounded-full mb-1`}>
              {category.title}
            </span>
            <p className="text-xs font-medium text-slate-700 truncate w-full">{user.name.split(' ')[0]}</p>
            <p className="text-[10px] text-slate-500">{stat}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SiPalingSection);
