import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Search, Filter, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { SatkerWithVisibility, User } from '../../types';
import { satkerVisibilityService } from '../services/SatkerVisibilityService';
import { useNotificationModal } from '../hooks/useModal';
import NotificationModal from './NotificationModal';
import { useAuth } from '../contexts/AuthContext';

type VisibilityFilter = 'all' | 'locked' | 'unlocked';

interface SatkerVisibilityManagementProps {
  onToggleVisibility?: (satkerId: string, newStatus: boolean) => Promise<void>;
}

const SatkerVisibilityManagement: React.FC<SatkerVisibilityManagementProps> = ({
  onToggleVisibility
}) => {
  const { currentUser } = useAuth();
  const [satkers, setSatkers] = useState<SatkerWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { modal: notificationModal, showNotification, hideNotification } = useNotificationModal();

  // Fetch satkers on mount
  useEffect(() => {
    fetchSatkers();
  }, []);

  const fetchSatkers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await satkerVisibilityService.getAllSatkerWithVisibility();
      setSatkers(data);
    } catch (err) {
      console.error('Error fetching satkers:', err);
      setError('Gagal memuat data satker. Silakan coba lagi.');
      showNotification('Error', 'Gagal memuat data satker. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter satkers based on search and visibility filter
  const filteredSatkers = satkers.filter(satker => {
    // Search filter
    const matchesSearch = satker.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Visibility filter
    const matchesVisibility = 
      visibilityFilter === 'all' ||
      (visibilityFilter === 'locked' && satker.isLocked) ||
      (visibilityFilter === 'unlocked' && !satker.isLocked);
    
    return matchesSearch && matchesVisibility;
  });

  // Handle visibility toggle
  const handleToggleVisibility = async (satker: SatkerWithVisibility) => {
    if (!currentUser) {
      showNotification('Error', 'User tidak terautentikasi', 'error');
      return;
    }

    const newStatus = !satker.isLocked;
    const actionText = newStatus ? 'mengunci' : 'membuka kunci';
    
    if (!window.confirm(`Apakah Anda yakin ingin ${actionText} satker "${satker.name}"?`)) {
      return;
    }

    try {
      setTogglingId(satker.id);
      
      if (onToggleVisibility) {
        await onToggleVisibility(satker.id, newStatus);
      } else {
        // Default behavior - use service directly with current user ID
        await satkerVisibilityService.updateVisibility(satker.id, newStatus, currentUser.id);
      }

      // Update local state
      setSatkers(prev => prev.map(s => 
        s.id === satker.id 
          ? { ...s, isLocked: newStatus }
          : s
      ));

      showNotification(
        'Berhasil',
        `Satker "${satker.name}" berhasil di${newStatus ? 'kunci' : 'buka kunci'}.`,
        'success'
      );
    } catch (err) {
      console.error('Error toggling visibility:', err);
      showNotification(
        'Error',
        `Gagal ${actionText} satker. Silakan coba lagi.`,
        'error'
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Stats
  const stats = {
    total: satkers.length,
    locked: satkers.filter(s => s.isLocked).length,
    unlocked: satkers.filter(s => !s.isLocked).length,
    totalMembers: satkers.reduce((sum, s) => sum + s.memberCount, 0)
  };

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
          <Lock className="text-gov-600" size={20} />
          Manajemen Visibility Satker
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Kelola visibility satuan kerja. Satker yang dikunci hanya dapat dilihat oleh admin dan anggotanya.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1">
            <Users size={14} />
            Total Satker
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs sm:text-sm mb-1">
            <Lock size={14} />
            Terkunci
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.locked}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-green-500 text-xs sm:text-sm mb-1">
            <Unlock size={14} />
            Tidak Terkunci
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.unlocked}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1">
            <Users size={14} />
            Total Anggota
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalMembers}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama satker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="w-full sm:w-48 pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="locked">Terkunci</option>
            <option value="unlocked">Tidak Terkunci</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchSatkers}
          disabled={loading}
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2 sm:py-2.5 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm transition-all text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <button
              onClick={fetchSatkers}
              className="text-red-600 text-sm underline mt-1 hover:text-red-800"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-gov-600" size={24} />
          <span className="ml-3 text-slate-600">Memuat data satker...</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Desktop Table */}
          <table className="hidden sm:table w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nama Satker
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status Visibility
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Jumlah Anggota
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSatkers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    {searchTerm || visibilityFilter !== 'all'
                      ? 'Tidak ada satker yang sesuai dengan filter'
                      : 'Belum ada data satker'}
                  </td>
                </tr>
              ) : (
                filteredSatkers.map(satker => (
                  <tr key={satker.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{satker.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        satker.isLocked
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {satker.isLocked ? (
                          <>
                            <Lock size={12} />
                            Terkunci
                          </>
                        ) : (
                          <>
                            <Unlock size={12} />
                            Tidak Terkunci
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <Users size={14} />
                        {satker.memberCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleVisibility(satker)}
                        disabled={togglingId === satker.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          satker.isLocked
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {togglingId === satker.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : satker.isLocked ? (
                          <Unlock size={14} />
                        ) : (
                          <Lock size={14} />
                        )}
                        {satker.isLocked ? 'Buka Kunci' : 'Kunci'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredSatkers.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-500">
                {searchTerm || visibilityFilter !== 'all'
                  ? 'Tidak ada satker yang sesuai dengan filter'
                  : 'Belum ada data satker'}
              </div>
            ) : (
              filteredSatkers.map(satker => (
                <div key={satker.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{satker.name}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          satker.isLocked ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {satker.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          {satker.isLocked ? 'Terkunci' : 'Tidak Terkunci'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Users size={12} />
                          {satker.memberCount} anggota
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleVisibility(satker)}
                      disabled={togglingId === satker.id}
                      className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                        satker.isLocked
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      } disabled:opacity-50`}
                    >
                      {togglingId === satker.id ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : satker.isLocked ? (
                        <Unlock size={16} />
                      ) : (
                        <Lock size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && filteredSatkers.length > 0 && (
        <div className="mt-4 text-sm text-slate-500 text-center sm:text-left">
          Menampilkan {filteredSatkers.length} dari {satkers.length} satker
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={hideNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
      />
    </div>
  );
};

export default SatkerVisibilityManagement;
