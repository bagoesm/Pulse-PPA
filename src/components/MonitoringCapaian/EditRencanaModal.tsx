import React, { useState, useEffect } from 'react';
import { CapaianRO, JadwalMingguan } from '../../types/monitoringCapaian';
import { X, Calendar, Save, AlertCircle, DollarSign, ChevronDown, ChevronRight, Layers } from 'lucide-react';

interface EditRencanaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ro: CapaianRO | null;
  onSave: (roId: string, jadwal: JadwalMingguan, keterangan?: string, danaTidakTerserap?: number) => void;
}

export const EditRencanaModal: React.FC<EditRencanaModalProps> = ({
  isOpen,
  onClose,
  ro,
  onSave
}) => {
  if (!isOpen || !ro) return null;

  const [jadwal, setJadwal] = useState<JadwalMingguan>({});
  const [danaTidakTerserap, setDanaTidakTerserap] = useState<number>(0);
  const [keterangan, setKeterangan] = useState<string>('');
  const [showKomponenDetail, setShowKomponenDetail] = useState<boolean>(false);

  useEffect(() => {
    if (ro) {
      setJadwal(ro.jadwal ? { ...ro.jadwal } : {});
      setDanaTidakTerserap(ro.danaTidakTerserap || 0);
      setKeterangan(ro.keterangan || '');
    }
  }, [ro]);

  const handleChange = (field: keyof JadwalMingguan, val: string) => {
    const num = parseFloat(val.replace(/[^0-9]/g, '')) || 0;
    setJadwal(prev => ({
      ...prev,
      [field]: num
    }));
  };

  const formatRupiah = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const totalRencana = Object.values(jadwal).reduce((a, b) => a + (Number(b) || 0), 0);
  const selisihRencana = ro.sisa - totalRencana - (danaTidakTerserap || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(ro.id, jadwal, keterangan, danaTidakTerserap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gov-100 text-gov-700 flex items-center justify-center shadow-inner">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Rencana Pelaksanaan & Penyerapan (AJK)
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Output summary banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="block text-slate-400 uppercase text-[10px] font-semibold">Pagu</span>
              <span className="font-bold text-slate-800">{formatRupiah(ro.pagu)}</span>
            </div>
            <div>
              <span className="block text-slate-400 uppercase text-[10px] font-semibold">Realisasi</span>
              <span className="font-bold text-gov-700">{formatRupiah(ro.realisasi)}</span>
            </div>
            <div>
              <span className="block text-slate-400 uppercase text-[10px] font-semibold">Sisa Anggaran</span>
              <span className="font-bold text-slate-800">{formatRupiah(ro.sisa)}</span>
            </div>
            <div>
              <span className="block text-slate-400 uppercase text-[10px] font-semibold">Capaian Saat Ini</span>
              <span className="font-bold text-slate-800">{ro.persentase}%</span>
            </div>
          </div>

          {/* Sub-komponen Banner if present */}
          {ro.komponen && ro.komponen.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowKomponenDetail(!showKomponenDetail)}
                className="w-full px-4 py-2.5 flex items-center justify-between font-semibold text-blue-900 hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-blue-600" />
                  <span>Rincian Komponen Belanja Terdaftar ({ro.komponen.length} item)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-blue-700">
                  <span>{showKomponenDetail ? 'Tutup Rincian' : 'Lihat Rincian Komponen'}</span>
                  {showKomponenDetail ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </button>

              {showKomponenDetail && (
                <div className="p-3 bg-white border-t border-blue-100 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {ro.komponen.map((k, idx) => (
                    <div key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-900">{idx + 1}. {k.nama}</span>
                        {k.keterangan && <span className="text-[10px] text-slate-400 block">{k.keterangan}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-right font-mono text-[11px] whitespace-nowrap">
                        {k.pagu ? <span className="text-slate-600">Pagu: {formatRupiah(k.pagu)}</span> : null}
                        {k.sisa ? <span className="text-amber-800 font-semibold">Sisa: {formatRupiah(k.sisa)}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Oktober Weeks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Rencana Penyerapan Oktober 2026
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu II (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.okt2 || ''}
                  onChange={(e) => handleChange('okt2', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu III (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.okt3 || ''}
                  onChange={(e) => handleChange('okt3', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu IV (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.okt4 || ''}
                  onChange={(e) => handleChange('okt4', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* November Weeks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Rencana Penyerapan November 2026
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu I (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.nov1 || ''}
                  onChange={(e) => handleChange('nov1', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu II (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.nov2 || ''}
                  onChange={(e) => handleChange('nov2', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu III (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.nov3 || ''}
                  onChange={(e) => handleChange('nov3', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu IV (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.nov4 || ''}
                  onChange={(e) => handleChange('nov4', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Desember Weeks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Rencana Penyerapan Desember 2026
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu I (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.des1 || ''}
                  onChange={(e) => handleChange('des1', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu II (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.des2 || ''}
                  onChange={(e) => handleChange('des2', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu III (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.des3 || ''}
                  onChange={(e) => handleChange('des3', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Minggu IV (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={jadwal.des4 || ''}
                  onChange={(e) => handleChange('des4', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dana Tidak Terserap & Keterangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Perkiraan Dana Tidak Terserap (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={danaTidakTerserap || ''}
                onChange={(e) => setDanaTidakTerserap(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Estimasi sisa anggaran yang diperkirakan tidak dapat terserap hingga 31 Desember.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan / Strategi Mitigasi
              </label>
              <textarea
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Menunggu pelantikan tim, jadwal bimtek dimajukan..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-gov-500"
              />
            </div>
          </div>

          {/* Budget Matching Summary */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <span className="block font-semibold">Total Rencana Penyerapan:</span>
              <span>{formatRupiah(totalRencana)}</span>
            </div>
            <div className="text-right">
              <span className="block font-semibold">Sisa yang Belum Direncanakan:</span>
              <span className={selisihRencana < 0 ? 'text-rose-600 font-bold' : ''}>
                {formatRupiah(selisihRencana)}
              </span>
            </div>
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
              <span>Simpan Rencana Jadwal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
