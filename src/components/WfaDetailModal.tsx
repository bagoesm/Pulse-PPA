// src/components/WfaDetailModal.tsx
import React from 'react';
import {
  X,
  Calendar,
  User as UserIcon,
  Building2,
  FileText,
  Sparkles,
  CheckCircle,
  Link as LinkIcon,
  ExternalLink,
  ThumbsUp,
  Edit2,
  Trash2,
  Clock,
} from 'lucide-react';
import { User, WfaLaporan } from '../../types';
import { formatIndonesianDateWithDay, ensureHttps } from '../utils/formatters';

interface WfaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  laporan: WfaLaporan | null;
  currentUser: User;
  onEdit: (laporan: WfaLaporan) => void;
  onDelete: (id: string) => void;
  onTogglePenilaian: (laporan: WfaLaporan) => void;
}

export const WfaDetailModal: React.FC<WfaDetailModalProps> = ({
  isOpen,
  onClose,
  laporan,
  currentUser,
  onEdit,
  onDelete,
  onTogglePenilaian,
}) => {
  if (!isOpen || !laporan) return null;

  const isOwner = laporan.userId === currentUser.id;
  const canEdit = isOwner || currentUser.role === 'Super Admin';
  const canDelete = isOwner || currentUser.role === 'Super Admin';
  const canEvaluate = currentUser.role === 'Atasan' || currentUser.role === 'Super Admin';
  const hasThumbsUp = laporan.penilaian && laporan.penilaian.includes('👍');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full my-8 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gov-600 to-gov-700 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Detail Laporan WFA</h3>
              <p className="text-xs text-gov-100 font-medium flex items-center gap-1.5 mt-0.5">
                <Calendar size={13} />
                {formatIndonesianDateWithDay(laporan.tanggalWfa)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadata Pegawai */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Nama Pegawai</span>
              <span className="font-bold text-slate-800 text-sm">{laporan.nama}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Unit Kerja</span>
              <span className="font-semibold text-gov-700">{laporan.unitKerja || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Jabatan</span>
              <span className="font-semibold text-slate-700">{laporan.jabatan || 'Pegawai'}</span>
            </div>
          </div>

          {/* Activities List */}
          {laporan.subItems && laporan.subItems.length > 1 ? (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Daftar Kegiatan ({laporan.subItems.length})
              </h4>
              {laporan.subItems.map((sub, idx) => (
                <div key={sub.id || idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <span className="w-5 h-5 rounded-md bg-gov-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">Kegiatan #{idx + 1}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rencana Hasil Kinerja</span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">{sub.rencanaHasilKinerja}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rencana Kinerja</span>
                    <p className="text-xs text-slate-800 leading-relaxed">{sub.rencanaKinerja}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Output Kinerja</span>
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold">{sub.outputKinerja}</p>
                  </div>

                  {sub.linkDataDukung && (
                    <div className="pt-1">
                      <a
                        href={ensureHttps(sub.linkDataDukung)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gov-700 bg-white hover:bg-gov-50 rounded-lg border border-slate-200 transition-all"
                      >
                        <ExternalLink size={12} />
                        Link Data Dukung Kegiatan #{idx + 1}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Single Activity Render */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-gov-600" />
                  Rencana Hasil Kinerja
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                  {laporan.rencanaHasilKinerja}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-gov-600" />
                  Rencana Kinerja
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                  {laporan.rencanaKinerja}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-gov-600" />
                  Output Kinerja
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                  {laporan.outputKinerja}
                </div>
              </div>
            </>
          )}

          {/* Grid Info: Data Dukung, Status, Penilaian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {/* Link Data Dukung */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Link Data Dukung
              </span>
              {laporan.linkDataDukung ? (
                <a
                  href={ensureHttps(laporan.linkDataDukung)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gov-700 bg-gov-50 hover:bg-gov-100 rounded-lg transition-all border border-gov-200"
                >
                  <ExternalLink size={13} />
                  Buka Link Dukung
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">Tidak ada link</span>
              )}
            </div>

            {/* Status Pelaksanaan */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Status Pelaksanaan
              </span>
              <span
                className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                  laporan.statusPelaksanaan === 'Selesai'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : laporan.statusPelaksanaan === 'Dalam Proses'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {laporan.statusPelaksanaan || 'Selesai'}
              </span>
            </div>

            {/* Penilaian Atasan */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Penilaian Atasan
              </span>
              <div className="flex items-center gap-2">
                {canEvaluate ? (
                  <button
                    type="button"
                    onClick={() => onTogglePenilaian(laporan)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      hasThumbsUp
                        ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <ThumbsUp size={14} className={hasThumbsUp ? 'fill-current' : ''} />
                    {hasThumbsUp ? 'Disetujui 👍' : 'Beri 👍'}
                  </button>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                      hasThumbsUp
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {hasThumbsUp ? 'Disetujui 👍' : 'Belum Dinilai'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(laporan.id);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Hapus
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
            >
              Tutup
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(laporan);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-gov-600 hover:bg-gov-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Edit2 size={14} />
                Edit Laporan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
