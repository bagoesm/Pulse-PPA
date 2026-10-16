// src/components/MonitoringCapaian/FormInputRoModal.tsx
import React, { useState, useEffect } from 'react';
import { CapaianRO, CapaianSatker, CapaianUnitKerja } from '../../types/monitoringCapaian';
import { X, Plus, Save, Building2, Layers, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface FormInputRoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ro: CapaianRO | null;
  satkers: CapaianSatker[];
  unitKerjas: CapaianUnitKerja[];
  onSave: (data: Partial<CapaianRO> & { kodeRo: string; namaRo: string; satkerNama: string; unitKerjaNama: string }) => void;
}

export const FormInputRoModal: React.FC<FormInputRoModalProps> = ({
  isOpen,
  onClose,
  ro,
  satkers,
  unitKerjas,
  onSave
}) => {
  if (!isOpen) return null;

  const [satkerNama, setSatkerNama] = useState<string>('Sekretariat Kementerian');
  const [unitKerjaNama, setUnitKerjaNama] = useState<string>('Biro Data dan Informasi');
  const [kodeRo, setKodeRo] = useState<string>('');
  const [namaRo, setNamaRo] = useState<string>('');
  const [pagu, setPagu] = useState<number>(0);
  const [realisasi, setRealisasi] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<string>('');

  useEffect(() => {
    if (ro) {
      setSatkerNama(ro.satkerNama || 'Sekretariat Kementerian');
      setUnitKerjaNama(ro.unitKerjaNama || 'Biro Data dan Informasi');
      setKodeRo(ro.kodeRo || '');
      setNamaRo(ro.namaRo || '');
      setPagu(ro.pagu || 0);
      setRealisasi(ro.realisasi || 0);
      setKeterangan(ro.keterangan || '');
    } else {
      setSatkerNama('Sekretariat Kementerian');
      setUnitKerjaNama('Biro Data dan Informasi');
      setKodeRo('');
      setNamaRo('');
      setPagu(0);
      setRealisasi(0);
      setKeterangan('');
    }
  }, [ro, isOpen]);

  const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;
  const sisa = Math.max(0, pagu - realisasi);

  const getStatusBadge = (pct: number) => {
    if (pct >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>Sesuai Target (≥90%)</span>
        </span>
      );
    }
    if (pct > 75) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle size={13} className="text-amber-500" />
          <span>Perlu Perhatian (75-90%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={13} className="text-rose-500" />
        <span>Perlu Intervensi (≤75%)</span>
      </span>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeRo.trim() || !namaRo.trim()) {
      alert('Kode RO dan Uraian Output wajib diisi!');
      return;
    }

    onSave({
      id: ro?.id,
      satkerNama,
      unitKerjaNama,
      kodeRo: kodeRo.trim(),
      namaRo: namaRo.trim(),
      pagu,
      realisasi,
      sisa,
      persentase,
      keterangan
    });
    onClose();
  };

  const filteredUnits = unitKerjas.filter(u => u.satkerNama === satkerNama);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gov-100 text-gov-700 flex items-center justify-center shadow-inner">
              {ro ? <Save size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {ro ? 'Edit Rincian Output (RO)' : 'Tambah Rincian Output (RO) Baru'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan rincian pagu, realisasi anggaran, dan unit pemilik.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Satker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Satuan Kerja <span className="text-rose-500">*</span>
            </label>
            <select
              value={satkerNama}
              onChange={(e) => {
                setSatkerNama(e.target.value);
                const firstUnit = unitKerjas.find(u => u.satkerNama === e.target.value);
                if (firstUnit) setUnitKerjaNama(firstUnit.nama);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 bg-white"
            >
              {satkers.map(s => (
                <option key={s.id} value={s.nama}>{s.nama}</option>
              ))}
            </select>
          </div>

          {/* Unit Kerja */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Kerja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="unit-kerja-list"
              value={unitKerjaNama}
              onChange={(e) => setUnitKerjaNama(e.target.value)}
              placeholder="Pilih atau ketik nama Unit Kerja..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500"
            />
            <datalist id="unit-kerja-list">
              {filteredUnits.map(u => (
                <option key={u.id} value={u.nama} />
              ))}
            </datalist>
          </div>

          {/* Kode RO */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Rincian Output (RO) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={kodeRo}
              onChange={(e) => setKodeRo(e.target.value)}
              placeholder="Contoh: 6380.AAG.001 atau AEC.001"
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
            />
          </div>

          {/* Nama RO */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian Rincian Output <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={namaRo}
              onChange={(e) => setNamaRo(e.target.value)}
              placeholder="Contoh: Peraturan Menteri tentang SIMFONI PPA"
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500"
            />
          </div>

          {/* Pagu & Realisasi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pagu Anggaran (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={pagu || ''}
                onChange={(e) => setPagu(parseFloat(e.target.value) || 0)}
                placeholder="0"
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Realisasi SP2D (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={realisasi || ''}
                onChange={(e) => setRealisasi(parseFloat(e.target.value) || 0)}
                placeholder="0"
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
              />
            </div>
          </div>

          {/* Computed Preview Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Persentase Capaian:</span>
              <span className="font-bold text-slate-900 text-sm">{persentase}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Kondisi:</span>
              {getStatusBadge(persentase)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Sisa Anggaran:</span>
              <span className="font-medium text-slate-800">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sisa)}
              </span>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Catatan Tambahan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Opsional: Keterangan kendala / rencana aksi"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500"
            />
          </div>

          {/* Action buttons */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{ro ? 'Simpan Perubahan' : 'Tambah Data RO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
