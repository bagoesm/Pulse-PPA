// src/components/BudgetRealization/BudgetRealizationPage.tsx
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useDivision } from '../../contexts/DivisionContext';
import { User, MasterSumberDana } from '../../../types';
import { budgetService } from '../../services/BudgetService';
import { 
  LayoutDashboard, 
  PieChart, 
  HelpingHand, 
  ClipboardList, 
  Activity, 
  FileText, 
  Database,
  Building2
} from 'lucide-react';
import SearchableSelect from '../SearchableSelect';

// Lazy load sub-components for bundle optimization
import BudgetDashboard from './BudgetDashboard';
import BudgetMonitoring from './BudgetMonitoring';
import BudgetTransactionForm from './BudgetTransactionForm';
import TransactionList from './TransactionList';
import BudgetLaporan from './BudgetLaporan';
import BudgetMasterEditor from './BudgetMasterEditor';

interface BudgetRealizationPageProps {
  activeTab: string;
  currentUser: User;
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const BudgetRealizationPage: React.FC<BudgetRealizationPageProps> = ({
  activeTab,
  currentUser,
  showNotification
}) => {
  const { 
    selectedDivisi, 
    setSelectedDivisi, 
    divisiList, 
    currentDivisi 
  } = useDivision();

  const [sumberDanaList, setSumberDanaList] = useState<MasterSumberDana[]>([]);
  const [isEditor, setIsEditor] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Determine if activeTab needs tabs display name override for layout title
  const getSubmenuName = () => {
    switch (activeTab) {
      case 'Dashboard Realisasi': return 'Dashboard Anggaran';
      case 'Monitoring Anggaran': return 'Monitoring Anggaran';
      case 'Daftar Transaksi': return 'Log Transaksi Belanja';
      case 'Laporan Anggaran': return 'Laporan Transaksi';
      case 'Master Anggaran': return 'Master Pagu Anggaran';
      default: return 'Realisasi Anggaran';
    }
  };

  // Fetch sources of funds
  const loadSumberDana = useCallback(async () => {
    try {
      const data = await budgetService.fetchMasterSumberDana();
      setSumberDanaList(data);
    } catch (err: any) {
      console.error('Error loading Master Sumber Dana:', err);
    }
  }, []);

  // Check if current user is budget editor for the selected division
  const checkEditorStatus = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.role === 'Super Admin') {
      setIsEditor(true);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const isUserEditor = await budgetService.checkIsBudgetEditor(currentUser.id, selectedDivisi);
      setIsEditor(isUserEditor);
    } catch (err) {
      console.error('Error checking editor status:', err);
      setIsEditor(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedDivisi]);

  useEffect(() => {
    loadSumberDana();
  }, [loadSumberDana]);

  useEffect(() => {
    checkEditorStatus();
  }, [checkEditorStatus, refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Mobile horizontal submenu tabs switcher mapping
  const mobileTabs = [
    { name: 'Dashboard Realisasi', icon: LayoutDashboard, label: 'Dashboard' },
    { name: 'Monitoring Anggaran', icon: PieChart, label: 'Monitoring' },
    { name: 'Daftar Transaksi', icon: ClipboardList, label: 'Log Trx' },
    { name: 'Laporan Anggaran', icon: FileText, label: 'Laporan' },
    { name: 'Master Anggaran', icon: Database, label: 'Master' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* Header Area */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-gov-600 font-semibold text-xs uppercase tracking-wider mb-0.5">
              <Building2 size={14} />
              <span>{selectedDivisi || 'Semua Divisi'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
              {getSubmenuName()}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Monitoring realisasi belanja APBN & Dana Hibah per Satker (Divisi)
            </p>
          </div>

          {/* Division Selector for Super Admin */}
          {currentUser.role === 'Super Admin' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Satker:</span>
              <SearchableSelect
                options={divisiList.map((div) => ({ value: div, label: div }))}
                value={selectedDivisi}
                onChange={(val) => startTransition(() => setSelectedDivisi(val))}
                placeholder="Cari Satker..."
                emptyOption="Pilih Satker"
                className="w-48 text-slate-800 text-sm font-medium shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Mobile Horizontal Switcher - swipeable menu on small screens */}
        <div className="md:hidden mt-4 overflow-x-auto no-scrollbar border-t border-slate-100 pt-3">
          <div className="flex gap-1.5 pb-1 min-w-max">
            {mobileTabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => {
                    // Set activeTab in AppContent context (since navigation is managed by AppContent)
                    const appSetActiveTab = (window as any).setActiveTab || (() => {});
                    appSetActiveTab(tab.name);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isTabActive 
                      ? 'bg-gov-600 text-white shadow-sm shadow-gov-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Render Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 relative">
        {loading && activeTab !== 'Dashboard Realisasi' && activeTab !== 'Monitoring Anggaran' ? (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-gov-200 border-t-gov-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-gov-700">Memeriksa hak akses editor...</span>
            </div>
          </div>
        ) : null}

        {activeTab === 'Dashboard Realisasi' ? (
          <BudgetDashboard
            selectedDivisi={selectedDivisi}
            sumberDanaList={sumberDanaList}
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
          />
        ) : activeTab === 'Monitoring Anggaran' ? (
          <BudgetMonitoring
            selectedDivisi={selectedDivisi}
            sumberDanaList={sumberDanaList}
            currentUser={currentUser}
            refreshTrigger={refreshTrigger}
            showNotification={showNotification}
          />
        ) : activeTab === 'Daftar Transaksi' ? (
          <TransactionList
            selectedDivisi={selectedDivisi}
            sumberDanaList={sumberDanaList}
            currentUser={currentUser}
            isEditor={isEditor}
            refreshTrigger={refreshTrigger}
            onTransactionUpdated={triggerRefresh}
            showNotification={showNotification}
          />
        ) : activeTab === 'Laporan Anggaran' ? (
          <BudgetLaporan
            selectedDivisi={selectedDivisi}
            sumberDanaList={sumberDanaList}
            refreshTrigger={refreshTrigger}
          />
        ) : activeTab === 'Master Anggaran' ? (
          <BudgetMasterEditor
            selectedDivisi={selectedDivisi}
            sumberDanaList={sumberDanaList}
            currentUser={currentUser}
            isEditor={isEditor}
            refreshTrigger={refreshTrigger}
            onMasterUpdated={triggerRefresh}
            showNotification={showNotification}
          />
        ) : (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500">
            Halaman tidak ditemukan.
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetRealizationPage;
