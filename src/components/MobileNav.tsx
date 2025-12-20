import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Briefcase,
  LogOut,
  MessageSquarePlus,
  User as UserIcon,
  MoreHorizontal,
  Megaphone,
  Database,
  X,
  Settings,
} from 'lucide-react';
import { User } from '../../types';
import UserAvatar from './UserAvatar';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenProfile: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenProfile,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Main tabs for bottom nav
  const bottomTabs = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Semua Task', icon: ListTodo },
    { name: 'Project', icon: Briefcase },
    { name: 'Lainnya', icon: MoreHorizontal, isMore: true },
    { name: 'Profile', icon: UserIcon, isProfile: true },
  ];

  // Sub-menu items for "Lainnya"
  const moreMenuItems = [
    { name: 'Saran Masukan', icon: MessageSquarePlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Pengumuman', icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Inventori Data', icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
    // Master Data only for Super Admin
    ...(currentUser.role === 'Super Admin' ? [
      { name: 'Master Data', icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50' },
    ] : []),
  ];

  const isMoreActive = moreMenuItems.some((item) => activeTab === item.name);

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gov-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">
                Manajemen Kerja
              </h1>
              <p className="text-[10px] text-slate-500">KemenPPPA</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-600"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* More Menu Bottom Sheet */}
      {isMoreMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-safe animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Menu Lainnya</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.name);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? `${item.bg} ${item.color}`
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon size={20} className={item.color} />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {bottomTabs.map((item) => {
            const Icon = item.icon;
            const isActive = item.isProfile
              ? false
              : item.isMore
                ? isMoreActive
                : activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.isProfile) {
                    onOpenProfile();
                  } else if (item.isMore) {
                    setIsMoreMenuOpen(true);
                  } else {
                    setActiveTab(item.name);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors min-w-[56px] ${
                  isActive ? 'text-gov-600' : 'text-slate-400'
                }`}
              >
                {item.isProfile ? (
                  <UserAvatar
                    name={currentUser.name}
                    profilePhoto={currentUser.profilePhoto}
                    size="sm"
                    className="w-6 h-6"
                  />
                ) : (
                  <Icon size={20} />
                )}
                <span className="text-[9px] font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
