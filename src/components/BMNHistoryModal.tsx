// src/components/BMNHistoryModal.tsx
// Modal for viewing BMN upload history with rollback functionality
// Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6

import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, FileText, User, Calendar, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { BMNUploadHistory, User as UserType } from '../../types';
import { supabase } from '../lib/supabaseClient';
import ConfirmModal from './ConfirmModal';

interface BMNHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadHistory: BMNUploadHistory[];
  currentUser: UserType | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRefresh: () => Promise<void>;
}

const BMNHistoryModal: React.FC<BMNHistoryModalProps> = ({
  isOpen,
  onClose,
  uploadHistory,
  currentUser,
  showNotification,
  onRefresh
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<BMNUploadHistory | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Check if user is Super Admin
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // Fetch user names for display
  useEffect(() => {
    const fetchUserNames = async () => {
      if (!isOpen || uploadHistory.length === 0) return;

      // Filter only valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const userIds = Array.from(new Set(
        uploadHistory
          .map(h => h.uploadedBy)
          .filter(id => uuidRegex.test(id))
      ));

      const names: Record<string, string> = {};

      // Only query if we have valid UUIDs
      if (userIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);

          if (error) throw error;

          if (data) {
            data.forEach((profile: any) => {
              names[profile.id] = profile.name;
            });
          }
        } catch (error) {
          console.error('Error fetching user names:', error);
        }
      }

      setUserNames(names);
    };

    fetchUserNames();
  }, [isOpen, uploadHistory]);

  if (!isOpen) return null;

  // Format date to Indonesian format (DD/MM/YYYY HH:mm)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Get user name from ID
  const getUserName = (userId: string): string => {
    return userNames[userId] || userId;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Rolled Back':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} />;
      case 'Failed':
        return <XCircle size={16} />;
      case 'Processing':
        return <Loader size={16} className="animate-spin" />;
      case 'Rolled Back':
        return <AlertCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  // Handle rollback confirmation
  const handleRollbackClick = (history: BMNUploadHistory) => {
    if (!isSuperAdmin) {
      showNotification(
        'Akses Ditolak',
        'Hanya Super Admin yang dapat melakukan rollback data BMN.',
        'error'
      );
      return;
    }

    if (history.status === 'Rolled Back') {
      showNotification(
        'Rollback Tidak Tersedia',
        'Upload ini sudah di-rollback sebelumnya.',
        'warning'
      );
      return;
    }

    if (history.status !== 'Completed') {
      showNotification(
        'Rollback Tidak Tersedia',
        'Hanya upload dengan status "Completed" yang dapat di-rollback.',
        'warning'
      );
      return;
    }

    setSelectedHistory(history);
    setShowConfirmModal(true);
  };

  // Handle rollback execution
  const handleRollback = async () => {
    if (!selectedHistory || !currentUser) return;

    setIsRollingBack(true);
    setShowConfirmModal(false);

    try {
      // Delete all BMN items from this upload batch
      const { error: deleteError } = await supabase
        .from('bmn_items')
        .delete()
        .eq('upload_batch_id', selectedHistory.id);

      if (deleteError) throw deleteError;

      // Update upload history status
      const { error: updateError } = await supabase
        .from('bmn_upload_history')
        .update({
          status: 'Rolled Back',
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: currentUser.id
        })
        .eq('id', selectedHistory.id);

      if (updateError) throw updateError;

      showNotification(
        'Rollback Berhasil',
        `Data dari upload "${selectedHistory.filename}" berhasil di-rollback. ${selectedHistory.successfulRecords} record telah dihapus.`,
        'success'
      );

      // Refresh data
      await onRefresh();
    } catch (error: any) {
      console.error('Rollback error:', error);
      showNotification(
        'Rollback Gagal',
        `Gagal melakukan rollback: ${error.message}`,
        'error'
      );
    } finally {
      setIsRollingBack(false);
      setSelectedHistory(null);
    }
  };

  // Sort history by date (newest first)
  const sortedHistory = [...uploadHistory].sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History size={24} />
                <div>
                  <h3 className="text-xl font-bold">History Upload BMN</h3>
                  <p className="text-sm text-gov-100 mt-0.5">
                    Riwayat upload data BMN
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isRollingBack}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size={32} className="animate-spin text-gov-600" />
              </div>
            ) : sortedHistory.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <History size={48} className="text-slate-400" />
                </div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">
                  Belum Ada History Upload
                </h4>
                <p className="text-slate-500 max-w-md">
                  Belum ada data yang diupload. Upload data BMN untuk melihat history di sini.
                </p>
              </div>
            ) : (
              // History list
              <div className="space-y-4">
                {sortedHistory.map((history) => (
                  <div
                    key={history.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Upload info */}
                      <div className="flex-1 min-w-0">
                        {/* File name and status */}
                        <div className="flex items-center gap-3 mb-3">
                          <FileText size={20} className="text-gov-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-slate-800 truncate">
                              {history.filename}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                              history.status
                            )}`}
                          >
                            {getStatusIcon(history.status)}
                            {history.status}
                          </span>
                        </div>

                        {/* Upload details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="font-medium">Tanggal:</span>
                            <span>{formatDate(history.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User size={16} className="text-slate-400" />
                            <span className="font-medium">User:</span>
                            <span>{getUserName(history.uploadedBy)}</span>
                          </div>
                        </div>

                        {/* Record counts */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Total Record:</span>
                            <span className="font-semibold text-slate-800">
                              {history.totalRecords}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Berhasil:</span>
                            <span className="font-semibold text-green-600">
                              {history.successfulRecords}
                            </span>
                          </div>
                          {history.failedRecords > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600">Gagal:</span>
                              <span className="font-semibold text-red-600">
                                {history.failedRecords}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Rollback info */}
                        {history.status === 'Rolled Back' && history.rolledBackAt && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-800">
                              <span className="font-semibold">Di-rollback pada:</span>{' '}
                              {formatDate(history.rolledBackAt)}
                              {history.rolledBackBy && (
                                <>
                                  {' oleh '}
                                  <span className="font-semibold">
                                    {getUserName(history.rolledBackBy)}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Error details */}
                        {history.errorDetails && history.errorDetails.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-800 mb-2">
                              Error Details:
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {history.errorDetails.slice(0, 5).map((error, idx) => (
                                <p key={idx} className="text-xs text-red-700">
                                  Baris {error.row}: {error.message}
                                </p>
                              ))}
                              {history.errorDetails.length > 5 && (
                                <p className="text-xs text-red-600 italic">
                                  ... dan {history.errorDetails.length - 5} error lainnya
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right side - Rollback button */}
                      {isSuperAdmin && history.status === 'Completed' && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleRollbackClick(history)}
                            disabled={isRollingBack}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Rollback upload ini"
                          >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Rollback</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Total {sortedHistory.length} upload history
              </p>
              <button
                onClick={onClose}
                disabled={isRollingBack}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedHistory(null);
        }}
        onConfirm={handleRollback}
        title="Konfirmasi Rollback"
        message={
          selectedHistory
            ? `Apakah Anda yakin ingin melakukan rollback untuk upload "${selectedHistory.filename}"?\n\nTindakan ini akan menghapus ${selectedHistory.successfulRecords} record BMN yang diupload pada ${formatDate(selectedHistory.uploadedAt)}.\n\nTindakan ini tidak dapat dibatalkan.`
            : ''
        }
        type="warning"
        confirmText="Ya, Rollback"
        cancelText="Batal"
      />
    </>
  );
};

export default BMNHistoryModal;
