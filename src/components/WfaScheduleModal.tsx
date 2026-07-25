// src/components/WfaScheduleModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { User, WfaSchedule } from '../../types';
import { wfaService } from '../services/WfaService';
import ConfirmModal from './ConfirmModal';

interface WfaScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User;
}

export const WfaScheduleModal: React.FC<WfaScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [schedules, setSchedules] = useState<WfaSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

  // New item form
  const [tanggal, setTanggal] = useState<string>('');
  const [isWfa, setIsWfa] = useState<boolean>(true);
  const [keterangan, setKeterangan] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
      setTanggal('');
      setIsWfa(true);
      setKeterangan('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await wfaService.getWfaSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load WFA schedules', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!tanggal) {
      setErrorMessage('Silakan pilih tanggal.');
      return;
    }

    try {
      setSaving(true);
      await wfaService.saveWfaSchedule({
        tanggal,
        isWfa,
        keterangan: keterangan.trim() || (isWfa ? 'Tanggal WFA Tambahan' : 'Hari Libur / Non-WFA'),
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
      });
      setTanggal('');
      setKeterangan('');
      setIsWfa(true);
      await loadSchedules();
      onSuccess();
    } catch (err: any) {
      console.error('Failed to save schedule', err);
      setErrorMessage(err.message || 'Gagal menyimpan aturan tanggal WFA.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScheduleRequest = (id: string) => {
    setDeleteScheduleId(id);
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleId) return;
    try {
      await wfaService.deleteWfaSchedule(deleteScheduleId);
      await loadSchedules();
      onSuccess();
    } catch (err) {
      console.error('Failed to delete schedule', err);
    } finally {
      setDeleteScheduleId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full my-8 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gov-600 to-gov-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Kelola Pengaturan Tanggal WFA</h3>
              <p className="text-xs text-gov-100 font-medium">Tambah tanggal khusus WFA atau tandai Jumat libur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Form Add New Schedule Date */}
          <form onSubmit={handleAddSchedule} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-gov-600" />
              Tambah / Ubah Aturan Tanggal WFA
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status WFA</label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="isWfa"
                      checked={isWfa}
                      onChange={() => setIsWfa(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Aktif (WFA)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="isWfa"
                      checked={!isWfa}
                      onChange={() => setIsWfa(false)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    Libur / Non-WFA
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Keterangan (Opsional)</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Hari Libur Nasional / WFA Pengganti..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-500/20 focus:border-gov-600"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-gov-600 hover:bg-gov-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} />
                {saving ? 'Menyimpan...' : 'Simpan Aturan Tanggal'}
              </button>
            </div>
          </form>

          {/* List of Custom Schedules */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Daftar Aturan Tanggal Khusus / Penyesuaian Libur
            </h4>

            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400">Memuat aturan tanggal...</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                Belum ada penyesuaian tanggal khusus. Sistem menggunakan jadwal standar hari Jumat.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {schedules.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {item.isWfa ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{item.tanggal}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              item.isWfa
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.isWfa ? 'Tanggal WFA Aktif' : 'Libur / Non-WFA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{item.keterangan || '-'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteScheduleRequest(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Hapus Pengaturan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Styled Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteScheduleId}
        onClose={() => setDeleteScheduleId(null)}
        onConfirm={confirmDeleteSchedule}
        title="Hapus Pengaturan Tanggal"
        message="Apakah Anda yakin ingin menghapus pengaturan tanggal WFA ini?"
        type="error"
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />
    </div>
  );
};
