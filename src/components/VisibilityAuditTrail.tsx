// src/components/VisibilityAuditTrail.tsx
// Component for displaying Satker Visibility audit trail history
import React, { useState, useEffect, useCallback } from 'react';
import { History, Filter, Clock, User, Lock, Unlock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { VisibilityAuditLog, Satker } from '../../types';
import { auditService } from '../services/AuditService';
import { satkerVisibilityService } from '../services/SatkerVisibilityService';
import { useNotificationModal } from '../hooks/useModal';
import NotificationModal from './NotificationModal';

const ITEMS_PER_PAGE = 20;

const VisibilityAuditTrail: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<VisibilityAuditLog[]>([]);
  const [satkers, setSatkers] = useState<Satker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSatkerId, setSelectedSatkerId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { modal: notificationModal, showNotification, hideNotification } = useNotificationModal();

  // Fetch satkers for dropdown filter
  useEffect(() => {
    const fetchSatkers = async () => {
      try {
        const data = await satkerVisibilityService.getAllSatkerWithVisibility();
        setSatkers(data);
      } catch (err) {
        console.error('Error fetching satkers:', err);
      }
    };
    fetchSatkers();
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const filters = {
        satkerId: selectedSatkerId || undefined,
        limit: ITEMS_PER_PAGE,
        offset,
      };

      const data = await auditService.getVisibilityAuditTrail(filters);
      setAuditLogs(data);
      
      // For pagination, we estimate total count
      // If we got full page, there might be more
      if (data.length === ITEMS_PER_PAGE) {
        setTotalCount(offset + ITEMS_PER_PAGE + 1); // Estimate, actual count would need separate query
      } else {
        setTotalCount(offset + data.length);
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      setError('Gagal memuat riwayat audit. Silakan coba lagi.');
      showNotification('Error', 'Gagal memuat riwayat audit. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedSatkerId, showNotification]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSatkerId]);

  // Format date time
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
          <History className="text-gov-600" size={20} />
          Riwayat Perubahan Visibility
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Lihat riwayat perubahan status visibility satuan kerja
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        {/* Satker Filter */}
        <div className="relative flex-1 sm:max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={selectedSatkerId}
            onChange={(e) => setSelectedSatkerId(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">Semua Satker</option>
            {satkers.map(satker => (
              <option key={satker.id} value={satker.id}>
                {satker.name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchAuditLogs}
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
              onClick={fetchAuditLogs}
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
          <span className="ml-3 text-slate-600">Memuat riwayat audit...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && auditLogs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Clock size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Belum ada riwayat perubahan visibility</p>
          <p className="text-slate-400 text-sm mt-1">
            {selectedSatkerId 
              ? 'Tidak ada riwayat untuk satker yang dipilih'
              : 'Riwayat perubahan akan muncul di sini setelah ada perubahan visibility'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && auditLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      Waktu
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Satker
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Status Lama
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    Status Baru
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      Diubah Oleh
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(log.changedAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{log.satkerName}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        log.oldStatus
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {log.oldStatus ? (
                          <>
                            <Lock size={12} />
                            Terkunci
                          </>
                        ) : (
                          <>
                            <Unlock size={12} />
                            Terbuka
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        log.newStatus
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {log.newStatus ? (
                          <>
                            <Lock size={12} />
                            Terkunci
                          </>
                        ) : (
                          <>
                            <Unlock size={12} />
                            Terbuka
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {log.changedByName || log.changedBy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-medium text-slate-800">{log.satkerName}</p>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.changedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    log.oldStatus ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {log.oldStatus ? <Lock size={12} /> : <Unlock size={12} />}
                    {log.oldStatus ? 'Terkunci' : 'Terbuka'}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    log.newStatus ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {log.newStatus ? <Lock size={12} /> : <Unlock size={12} />}
                    {log.newStatus ? 'Terkunci' : 'Terbuka'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <User size={12} />
                  <span>{log.changedByName || log.changedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && auditLogs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && auditLogs.length > 0 && (
        <div className="mt-4 text-sm text-slate-500 text-center sm:text-left">
          Menampilkan {auditLogs.length} log
          {selectedSatkerId && ` untuk ${satkers.find(s => s.id === selectedSatkerId)?.name || 'satker yang dipilih'}`}
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

export default VisibilityAuditTrail;
