// src/components/MonitoringCapaian/KelolaKomponenModal.tsx
import React, { useState, useEffect } from 'react';
import { CapaianRO, KomponenRO, JadwalMingguan } from '../../types/monitoringCapaian';
import { X, Layers, Save, AlertCircle, Calendar } from 'lucide-react';

interface KelolaKomponenModalProps {
  isOpen: boolean;
  onClose: () => void;
  ro: CapaianRO | null;
  komponenToEdit: KomponenRO | null;
  editIndex: number | null;
  onSave: (roId: string, item: KomponenRO, editIndex?: number) => void;
}

export const KelolaKomponenModal: React.FC<KelolaKomponenModalProps> = ({
  isOpen,
  onClose,
  ro,
  komponenToEdit,
  editIndex,
  onSave
}) => {
  if (!isOpen || !ro) return null;

  const [nama, setNama] = useState<string>('');
  const [pagu, setPagu] = useState<number>(0);
  const [sisa, setSisa] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<string>('');
  const [jadwal, setJadwal] = useState<JadwalMingguan>({});
  const [errors, setErrors] = useState<{ nama?: string }>({});

  useEffect(() => {
    if (komponenToEdit) {
      setNama(komponenToEdit.nama || '');
      setPagu(komponenToEdit.pagu || 0);
      setSisa(komponenToEdit.sisa || 0);
      setKeterangan(komponenToEdit.keterangan || '');
      setJadwal(komponenToEdit.jadwal ? { ...komponenToEdit.jadwal } : {});
    } else {
      setNama('');
      setPagu(0);
      setSisa(0);
      setKeterangan('');
      setJadwal({});
    }
    setErrors({});
  }, [komponenToEdit, isOpen]);

  const handleJadwalChange = (field: keyof JadwalMingguan, val: string) => {
    const num = parseFloat(val.replace(/[^0-9]/g, '')) || 0;
    setJadwal(prev => ({ ...prev, [field]: num }));
  };

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalJadwalKomponen = Object.values(jadwal).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrors({ nama: 'Nama komponen / rincian belanja wajib diisi' });
      return;
    }

    const payload: KomponenRO = {
      ...(komponenToEdit || {}),
      id: komponenToEdit?.id || `komp-${Date.now()}`,
      nama: nama.trim(),
      pagu: pagu || 0,
      sisa: sisa || 0,
      jadwal,
      keterangan: keterangan.trim()
    };

    onSave(ro.id, payload, editIndex !== null && editIndex !== undefined ? editIndex : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {komponenToEdit ? 'Edit Rincian Komponen' : 'Tambah Rincian Komponen'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {ro.kodeRo} — {ro.unitKerjaNama}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Nama Komponen */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian Komponen / Sub-Kegiatan Belanja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (errors.nama) setErrors({});
              }}
              placeholder="Contoh: Lisensi Gemini AI, Jasa Pemeliharaan Server, Konsumsi Rapat..."
              className={`w-full px-3.5 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                errors.nama ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500'
              }`}
            />
            {errors.nama && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{errors.nama}</span>
              </p>
            )}
          </div>

          {/* Pagu & Sisa Anggaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pagu Komponen (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={pagu || ''}
                onChange={(e) => setPagu(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {formatRupiah(pagu)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sisa Anggaran (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={sisa || ''}
                onChange={(e) => setSisa(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {formatRupiah(sisa)}
              </span>
            </div>
          </div>

          {/* Jadwal Penarikan Mingguan */}
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-600" />
                <span>Rencana Penarikan Mingguan (AJK)</span>
              </h4>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                Total: {formatRupiah(totalJadwalKomponen)}
              </span>
            </div>

            {/* Oktober */}
            <div className="bg-sky-50/40 p-3 rounded-xl border border-sky-100">
              <span className="block text-[11px] font-bold text-sky-900 mb-2">Oktober 2026</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu II</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.okt2 || ''}
                    onChange={(e) => handleJadwalChange('okt2', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu III</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.okt3 || ''}
                    onChange={(e) => handleJadwalChange('okt3', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu IV</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.okt4 || ''}
                    onChange={(e) => handleJadwalChange('okt4', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* November */}
            <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
              <span className="block text-[11px] font-bold text-indigo-900 mb-2">November 2026</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu I</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.nov1 || ''}
                    onChange={(e) => handleJadwalChange('nov1', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu II</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.nov2 || ''}
                    onChange={(e) => handleJadwalChange('nov2', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu III</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.nov3 || ''}
                    onChange={(e) => handleJadwalChange('nov3', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu IV</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.nov4 || ''}
                    onChange={(e) => handleJadwalChange('nov4', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Desember */}
            <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
              <span className="block text-[11px] font-bold text-emerald-900 mb-2">Desember 2026</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu I</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.des1 || ''}
                    onChange={(e) => handleJadwalChange('des1', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu II</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.des2 || ''}
                    onChange={(e) => handleJadwalChange('des2', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu III</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.des3 || ''}
                    onChange={(e) => handleJadwalChange('des3', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Minggu IV</label>
                  <input
                    type="number"
                    min="0"
                    value={jadwal.des4 || ''}
                    onChange={(e) => handleJadwalChange('des4', e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Rincian Belanja
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Pembelian lisensi perpanjangan 1 tahun, PIC: Mas Bagoes"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{komponenToEdit ? 'Simpan Perubahan' : 'Tambah Komponen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
