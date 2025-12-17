import React from 'react';
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
  Megaphone
} from 'lucide-react';
import { SIDEBAR_ITEMS, User } from '../../types';

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
  'Megaphone': Megaphone
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, users, onSwitchUser, onLogout }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 overflow-y-auto hidden md:flex flex-col z-10">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gov-600 flex items-center justify-center shadow-md shadow-gov-200">
                <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
                <h1 className="font-bold text-slate-800 leading-tight">Manajemen Kerja</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide">KemenPPPA</p>
            </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = IconMap[item.icon];
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-gov-50 text-gov-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-gov-600' : 'text-slate-400'} />
              {item.name}
            </button>
          );
        })}

        {/* Feedback Section */}
        <div className="pt-4 pb-2 px-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feedback</p>
        </div>
        <button
          onClick={() => setActiveTab('Saran Masukan')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
            activeTab === 'Saran Masukan' 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <MessageSquarePlus size={18} className={activeTab === 'Saran Masukan' ? 'text-emerald-600' : 'text-slate-400'} />
          Saran Masukan
        </button>

        {/* Super Admin Menu */}
        {currentUser.role === 'Super Admin' && (
             <>
                <div className="pt-4 pb-2 px-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator</p>
                </div>
                <button
                onClick={() => setActiveTab('Master Data')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    activeTab === 'Master Data' 
                    ? 'bg-purple-50 text-purple-700' 
                    : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                }`}
                >
                    <Database size={18} className={activeTab === 'Master Data' ? 'text-purple-600' : 'text-slate-400'} />
                    Master Data User
                </button>

            </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-gov-100 text-gov-700 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                    {currentUser.initials}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{currentUser.jabatan || currentUser.role}</p>
                </div>
            </div>

            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
            >
                <LogOut size={14} /> Keluar Aplikasi
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;