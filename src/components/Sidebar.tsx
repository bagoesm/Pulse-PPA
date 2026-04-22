import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Briefcase,
  FileText,
  Users,
  HelpingHand,
  GraduationCap,
  Inbox,
  Forward,
  FolderOpen,
  Activity,
  MoreHorizontal,
  Database,
  LogOut,
  MessageSquarePlus,
  Code,
  Settings,
  Megaphone,
  CalendarDays,
  FileSpreadsheet,
  ClipboardCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Shield,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { SIDEBAR_ITEMS, User } from '../../types';
import { useSidebar } from '../contexts/SidebarContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  users: User[]; // Pass full list to dropdown
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
}

const IconMap: Record<string, React.ElementType> = {
  'LayoutDashboard': LayoutDashboard,
  'ListTodo': ListTodo,
  'Briefcase': Briefcase,
  'FileText': FileText,
  'Users': Users,
  'HelpingHand': HelpingHand,
  'GraduationCap': GraduationCap,
  'Inbox': Inbox,
  'Forward': Forward,
  'FolderOpen': FolderOpen,
  'Activity': Activity,
  'MoreHorizontal': MoreHorizontal,
  'MessageSquarePlus': MessageSquarePlus,
  'Code': Code,
  'Megaphone': Megaphone,
  'Database': Database,
  'CalendarDays': CalendarDays,
  'FileSpreadsheet': FileSpreadsheet,
  'ClipboardCheck': ClipboardCheck,
  'ClipboardList': ClipboardList,
  'Settings': Settings,
  'Shield': Shield
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, users, onSwitchUser, onLogout }) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('Surat & Kegiatan'); // Default open
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number } | null>(null);
  
  const toggleSubmenu = (menuName: string) => {
    if (isCollapsed) {
      toggleCollapse();
    }
    setOpenSubmenu(openSubmenu === menuName ? null : menuName);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ top: rect.top + rect.height / 2 });
  };

  return (
    <>
      {/* Sidebar Container */}
      <aside 
        className={`bg-white/95 backdrop-blur-md border-r border-slate-200/80 h-screen fixed left-0 top-0 hidden md:flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        style={{ 
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.06)',
          zIndex: 40
        }}
      >
        {/* Header with Logo */}
        <div className={`p-6 border-b border-slate-200/80 transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <img 
              src="/Logo.svg" 
              alt="Logo" 
              className="w-8 h-8 transition-transform hover:scale-110"
            />
            {!isCollapsed && (
              <div className="animate-fadeIn">
                <h1 className="font-bold text-slate-800 leading-tight">Pulse</h1>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">Manajemen Kerja Kemen PPPA</p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-visible scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {SIDEBAR_ITEMS.filter((item: any) => {
          // Filter out admin-only items for non-admin users
          if (item.adminOnly && currentUser.role !== 'Super Admin') {
            return false;
          }
          return true;
        }).map((item: any) => {
          const Icon = IconMap[item.icon];
          const isActive = activeTab === item.name;
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isSubmenuOpen = openSubmenu === item.name;
          const isSubmenuItemActive = hasSubmenu && item.submenu.some((sub: any) => sub.name === activeTab);

          if (hasSubmenu) {
            return (
              <div key={item.name} className="relative group">
                {/* Parent menu with submenu */}
                <button
                  onMouseEnter={handleMouseEnter}
                  onClick={() => toggleSubmenu(item.name)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                    isSubmenuItemActive
                      ? 'bg-gradient-to-r from-gov-50 to-gov-100/50 text-gov-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isSubmenuItemActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gov-500 to-gov-600 rounded-r-full" />
                  )}
                  <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                    <Icon 
                      size={18} 
                      className={`transition-all duration-200 flex-shrink-0 ${
                        isSubmenuItemActive ? 'text-gov-600' : 'text-slate-400 group-hover:text-slate-600'
                      } ${isCollapsed ? '' : ''}`}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className={`transition-transform duration-200 ${isSubmenuOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown size={16} className="text-slate-400" />
                    </div>
                  )}
                </button>

                {/* Tooltip for collapsed state */}
                {isCollapsed && tooltipPosition && (
                  <div 
                    className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                    style={{ 
                      zIndex: 9999,
                      left: '92px',
                      top: `${tooltipPosition.top}px`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                  </div>
                )}

                {/* Submenu items */}
                {isSubmenuOpen && !isCollapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-2 animate-slideDown">
                    {item.submenu.map((subItem: any) => {
                      const SubIcon = IconMap[subItem.icon];
                      const isSubActive = activeTab === subItem.name;
                      return (
                        <button
                          key={subItem.name}
                          onClick={() => setActiveTab(subItem.name)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group/sub ${
                            isSubActive
                              ? 'bg-gradient-to-r from-gov-50 to-transparent text-gov-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                          }`}
                        >
                          {isSubActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gov-600 rounded-full" />
                          )}
                          <SubIcon 
                            size={16} 
                            className={`transition-all duration-200 flex-shrink-0 ${
                              isSubActive ? 'text-gov-600' : 'text-slate-400 group-hover/sub:text-slate-600'
                            }`}
                          />
                          <span className="truncate">{subItem.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular menu item without submenu
          return (
            <div key={item.name} className="relative group">
              <button
                onMouseEnter={handleMouseEnter}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-gov-50 to-gov-100/50 text-gov-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gov-500 to-gov-600 rounded-r-full" />
                )}
                <Icon 
                  size={18} 
                  className={`transition-all duration-200 flex-shrink-0 ${
                    isActive ? 'text-gov-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>

              {/* Tooltip for collapsed state */}
              {isCollapsed && tooltipPosition && (
                <div 
                  className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                  style={{ 
                    zIndex: 9999,
                    left: '92px',
                    top: `${tooltipPosition.top}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                </div>
              )}
            </div>
          );
        })}

        {/* Lainnya Section */}
        {!isCollapsed && (
          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lainnya</p>
          </div>
        )}
        
        {/* Lainnya Menu */}
        <div className="relative group">
          <button
            onMouseEnter={handleMouseEnter}
            onClick={() => setActiveTab('Lainnya')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${activeTab === 'Lainnya'
                ? 'bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            {activeTab === 'Lainnya' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-500 to-slate-600 rounded-r-full" />
            )}
            <MoreHorizontal 
              size={18} 
              className={`transition-all duration-200 flex-shrink-0 ${
                activeTab === 'Lainnya' ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            {!isCollapsed && <span className="truncate">Lainnya</span>}
          </button>

          {isCollapsed && tooltipPosition && (
            <div 
              className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
              style={{ 
                zIndex: 9999,
                left: '92px',
                top: `${tooltipPosition.top}px`,
                transform: 'translateY(-50%)'
              }}
            >
              Lainnya
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
            </div>
          )}
        </div>

        {/* Pengumuman Menu */}
        <div className="relative group">
          <button
            onMouseEnter={handleMouseEnter}
            onClick={() => setActiveTab('Pengumuman')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${activeTab === 'Pengumuman'
                ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 shadow-sm'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
          >
            {activeTab === 'Pengumuman' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full" />
            )}
            <Megaphone 
              size={18} 
              className={`transition-all duration-200 flex-shrink-0 ${
                activeTab === 'Pengumuman' ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
              }`}
            />
            {!isCollapsed && <span className="truncate">Pengumuman</span>}
          </button>

          {isCollapsed && tooltipPosition && (
            <div 
              className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
              style={{ 
                zIndex: 9999,
                left: '92px',
                top: `${tooltipPosition.top}px`,
                transform: 'translateY(-50%)'
              }}
            >
              Pengumuman
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
            </div>
          )}
        </div>

        {/* Saran Masukan Menu */}
        <div className="relative group">
          <button
            onMouseEnter={handleMouseEnter}
            onClick={() => setActiveTab('Saran Masukan')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${activeTab === 'Saran Masukan'
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
          >
            {activeTab === 'Saran Masukan' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-r-full" />
            )}
            <MessageSquarePlus 
              size={18} 
              className={`transition-all duration-200 flex-shrink-0 ${
                activeTab === 'Saran Masukan' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'
              }`}
            />
            {!isCollapsed && <span className="truncate">Saran Masukan</span>}
          </button>

          {isCollapsed && tooltipPosition && (
            <div 
              className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
              style={{ 
                zIndex: 9999,
                left: '92px',
                top: `${tooltipPosition.top}px`,
                transform: 'translateY(-50%)'
              }}
            >
              Saran Masukan
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
            </div>
          )}
        </div>

        {/* Super Admin Menu */}
        {(currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') && (
          <>
            {!isCollapsed && (
              <div className="pt-4 pb-2 px-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator</p>
              </div>
            )}

            {/* Activity Log - Admin & Atasan */}
            <div className="relative group">
              <button
                onMouseEnter={handleMouseEnter}
                onClick={() => setActiveTab('Activity Log')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${activeTab === 'Activity Log'
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 shadow-sm'
                    : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                  }`}
              >
                {activeTab === 'Activity Log' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-orange-600 rounded-r-full" />
                )}
                <Activity 
                  size={18} 
                  className={`transition-all duration-200 flex-shrink-0 ${
                    activeTab === 'Activity Log' ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Activity Log</span>}
              </button>

              {isCollapsed && tooltipPosition && (
                <div 
                  className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                  style={{ 
                    zIndex: 9999,
                    left: '92px',
                    top: `${tooltipPosition.top}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  Activity Log
                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                </div>
              )}
            </div>

            {/* Master Data - Super Admin only */}
            {currentUser.role === 'Super Admin' && (
              <>
                <div className="relative group">
                  <button
                    onMouseEnter={handleMouseEnter}
                    onClick={() => setActiveTab('Master Data')}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${activeTab === 'Master Data'
                        ? 'bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 shadow-sm'
                        : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                  >
                    {activeTab === 'Master Data' && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-purple-600 rounded-r-full" />
                    )}
                    <Database 
                      size={18} 
                      className={`transition-all duration-200 flex-shrink-0 ${
                        activeTab === 'Master Data' ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Master Data User</span>}
                  </button>

                  {isCollapsed && tooltipPosition && (
                    <div 
                      className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                      style={{ 
                        zIndex: 9999,
                        left: '92px',
                        top: `${tooltipPosition.top}px`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      Master Data User
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                    </div>
                  )}
                </div>

                {/* Kontrol Satker Submenu */}
                <div className="relative group">
                  <button
                    onMouseEnter={handleMouseEnter}
                    onClick={() => toggleSubmenu('Kontrol Satker')}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                      (activeTab === 'Manajemen Visibility' || activeTab === 'Riwayat Perubahan')
                        ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {(activeTab === 'Manajemen Visibility' || activeTab === 'Riwayat Perubahan') && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-r-full" />
                    )}
                    <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                      <Settings 
                        size={18} 
                        className={`transition-all duration-200 flex-shrink-0 ${
                          (activeTab === 'Manajemen Visibility' || activeTab === 'Riwayat Perubahan') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Kontrol Satker</span>}
                    </div>
                    {!isCollapsed && (
                      <div className={`transition-transform duration-200 ${openSubmenu === 'Kontrol Satker' ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown size={16} className="text-slate-400" />
                      </div>
                    )}
                  </button>

                  {isCollapsed && tooltipPosition && (
                    <div 
                      className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                      style={{ 
                        zIndex: 9999,
                        left: '92px',
                        top: `${tooltipPosition.top}px`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      Kontrol Satker
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                    </div>
                  )}

                  {/* Kontrol Satker Submenu Items */}
                  {openSubmenu === 'Kontrol Satker' && !isCollapsed && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-2 animate-slideDown">
                      <button
                        onClick={() => setActiveTab('Manajemen Visibility')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group/sub ${
                          activeTab === 'Manajemen Visibility'
                            ? 'bg-gradient-to-r from-indigo-50 to-transparent text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                        }`}
                      >
                        {activeTab === 'Manajemen Visibility' && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        )}
                        <Settings 
                          size={16} 
                          className={`transition-all duration-200 flex-shrink-0 ${
                            activeTab === 'Manajemen Visibility' ? 'text-indigo-600' : 'text-slate-400 group-hover/sub:text-slate-600'
                          }`}
                        />
                        <span className="truncate">Manajemen Visibility</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('Riwayat Perubahan')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group/sub ${
                          activeTab === 'Riwayat Perubahan'
                            ? 'bg-gradient-to-r from-indigo-50 to-transparent text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                        }`}
                      >
                        {activeTab === 'Riwayat Perubahan' && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        )}
                        <Activity 
                          size={16} 
                          className={`transition-all duration-200 flex-shrink-0 ${
                            activeTab === 'Riwayat Perubahan' ? 'text-indigo-600' : 'text-slate-400 group-hover/sub:text-slate-600'
                          }`}
                        />
                        <span className="truncate">Riwayat Perubahan</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

          </>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className={`p-4 border-t border-slate-100 bg-gradient-to-br from-slate-50/50 to-white transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <div className="flex flex-col gap-3">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gov-500 to-gov-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-lg transition-transform hover:scale-110">
                  {currentUser.initials}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{currentUser.jabatan || currentUser.role}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
              >
                <LogOut size={14} className="group-hover:scale-110 transition-transform" /> 
                Keluar Aplikasi
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gov-500 to-gov-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-lg transition-transform hover:scale-110 cursor-pointer">
                  {currentUser.initials}
                </div>
                
                {/* Tooltip for user info */}
                <div 
                  className="fixed px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl"
                  style={{ 
                    zIndex: 9999,
                    left: '92px',
                    bottom: '20px'
                  }}
                >
                  <p className="font-semibold">{currentUser.name}</p>
                  <p className="text-slate-300 text-[10px]">{currentUser.jabatan || currentUser.role}</p>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 border-[6px] border-transparent border-r-slate-900" />
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
                title="Keluar Aplikasi"
              >
                <LogOut size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>

    {/* Floating Toggle Button - Outside sidebar, always visible */}
    <button
      onClick={toggleCollapse}
      className="fixed top-20 w-8 h-8 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-600 hover:text-gov-600 hover:border-gov-400 hover:bg-gov-50 transition-all shadow-lg hover:shadow-xl hidden md:flex group"
      style={{
        left: isCollapsed ? '68px' : '248px',
        transition: 'left 300ms ease-in-out',
        zIndex: 50
      }}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? (
        <ChevronsRight size={16} className="group-hover:scale-110 transition-transform" />
      ) : (
        <ChevronsLeft size={16} className="group-hover:scale-110 transition-transform" />
      )}
    </button>
  </>
  );
};

export default Sidebar;