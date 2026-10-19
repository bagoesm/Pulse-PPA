import React, { useState, useRef } from 'react';
import { CapaianRO } from '../../types/monitoringCapaian';
import { monitoringCapaianService } from '../../services/MonitoringCapaianService';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Layers,
  Building2,
  Check,
  Files
} from 'lucide-react';

interface UploadRkklModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface FileSummary {
  fileName: string;
  satker: string;
  count: number;
  pagu: number;
  realisasi: number;
  success: boolean;
  error?: string;
}

export const UploadRkklModal: React.FC<UploadRkklModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [targetSatker, setTargetSatker] = useState<string>('auto');
  const [customSatkerName, setCustomSatkerName] = useState<string>('');
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    data: CapaianRO[];
    fileSummaries: FileSummary[];
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEffectiveSatker = (satkerMode: string, customName: string) => {
    if (satkerMode === 'auto') return undefined;
    if (satkerMode === 'custom') return customName.trim() || undefined;
    return satkerMode;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      processFiles(filesArray, getEffectiveSatker(targetSatker, customSatkerName));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      processFiles(filesArray, getEffectiveSatker(targetSatker, customSatkerName));
    }
  };

  const processFiles = async (files: File[], overrideSatker?: string) => {
    setSelectedFiles(files);
    setLoading(true);
    setParseResult(null);

    try {
      const result = await monitoringCapaianService.parseMultipleExcelFiles(files, overrideSatker);
      setParseResult(result);
    } catch (err: any) {
      setParseResult({
        success: false,
        data: [],
        fileSummaries: [],
        message: `Terjadi kesalahan saat memproses berkas: ${err.message || 'Format tidak valid'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSatkerChange = (newSatker: string) => {
    setTargetSatker(newSatker);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles, getEffectiveSatker(newSatker, customSatkerName));
    }
  };

  const handleCustomSatkerChange = (newName: string) => {
    setCustomSatkerName(newName);
    if (selectedFiles.length > 0 && newName.trim()) {
      processFiles(selectedFiles, newName.trim());
    }
  };

  const handleApply = async () => {
    if (!parseResult?.success || parseResult.data.length === 0) return;
    setSaving(true);
    try {
      const count = await monitoringCapaianService.applyImportedROs(parseResult.data);
      onSuccess(count);
      onClose();
    } catch (err) {
      console.error('Error applying imported ROs:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gov-100 text-gov-700 flex items-center justify-center shadow-inner">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Upload Data RKKL & SAKTI (Excel)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendukung Laporan FA Detail SAKTI (GLP039) atau format matriks AJK jadwal penyerapan.
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-gov-500 bg-gov-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-full bg-gov-50 text-gov-700 flex items-center justify-center mb-3">
              <Files size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} berkas dipilih: ${selectedFiles.map(f => f.name).join(', ')}`
                : 'Klik untuk memilih satu atau beberapa berkas Excel, atau seret ke sini'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Bisa upload satu berkas Satker atau langsung semua berkas 6 Satker sekaligus (.xlsx / .xls)
            </p>
          </div>

          {/* Target Satker Selection */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 size={14} className="text-gov-700" />
                <span>Metode Penentuan Satker (Eselon I)</span>
              </label>
              {targetSatker === 'auto' && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={11} /> Auto-Detect dari Header Berkas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={targetSatker}
                onChange={(e) => handleSatkerChange(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-500 shadow-2xs"
              >
                <option value="auto">⚡ Deteksi Otomatis dari Berkas / SAKTI (Direkomendasikan)</option>
                <option value="Sekretariat Kementerian">Sekretariat Kementerian</option>
                <option value="Deputi Bidang Kesetaraan Gender">Deputi Bidang Kesetaraan Gender (Deputi I)</option>
                <option value="Deputi Bidang Pemenuhan Hak Anak">Deputi Bidang Pemenuhan Hak Anak (Deputi II)</option>
                <option value="Deputi Bidang Perlindungan Hak Perempuan">Deputi Bidang Perlindungan Hak Perempuan (Deputi III)</option>
                <option value="Deputi Bidang Perlindungan Khusus Anak">Deputi Bidang Perlindungan Khusus Anak (Deputi IV)</option>
                <option value="Komisi Perlindungan Anak Indonesia (KPAI)">Komisi Perlindungan Anak Indonesia (KPAI)</option>
                <option value="custom">+ Ketik Nama Satker Lainnya...</option>
              </select>

              {targetSatker === 'custom' && (
                <input
                  type="text"
                  placeholder="Ketik nama Satker baru..."
                  value={customSatkerName}
                  onChange={(e) => handleCustomSatkerChange(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-500 shadow-2xs"
                />
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dengan mode <strong>Deteksi Otomatis</strong>, sistem akan membaca kode satker (427944, 664941, 664958, 664962, 664979, 664983) langsung dari setiap berkas SAKTI, sehingga Anda dapat mengunggah semua file sekaligus tanpa tertukar.
            </p>
          </div>

          {/* Upsert Strategy Info */}
          <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <Layers size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Sistem Penggabungan Data (Smart Upsert):</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                RO yang sudah ada akan diperbarui angka pagu dan realisasinya. Komponen dan jadwal mingguan yang pernah diisi pengguna akan <strong>tetap dipertahankan</strong>, dan data Satker lain tidak akan hilang.
              </p>
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-gov-600" size={24} />
              <span className="text-xs font-semibold">Sedang menganalisis struktur Excel & memetakan Satker...</span>
            </div>
          )}

          {/* Result Alert / File Breakdown */}
          {parseResult && !loading && (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  parseResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {parseResult.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h5 className="font-bold">{parseResult.success ? 'Berkas Siap Diimpor' : 'Gagal Memproses'}</h5>
                  <p className="mt-0.5">{parseResult.message}</p>
                </div>
              </div>

              {/* Per-File Summary Cards */}
              {parseResult.fileSummaries && parseResult.fileSummaries.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Ringkasan Berkas Teranalisis ({parseResult.fileSummaries.length} Berkas):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parseResult.fileSummaries.map((f, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                          f.success ? 'bg-white border-slate-200 shadow-2xs' : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 text-[11px] block truncate" title={f.fileName}>
                              {f.fileName}
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700 mt-0.5 block truncate">
                              {f.satker}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                            {f.count} RO
                          </span>
                        </div>
                        {f.success ? (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Pagu: <strong>{formatRupiah(f.pagu)}</strong></span>
                            <span>Real: <strong className="text-gov-700">{formatRupiah(f.realisasi)}</strong></span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-600 mt-1">{f.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              {parseResult.success && parseResult.data.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Pratinjau Data ({parseResult.data.length} Total Rincian Output)</span>
                    <span className="text-[11px] font-normal text-slate-500">Menampilkan 6 baris pertama</span>
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Kode RO</th>
                          <th className="py-2 px-3">Satker</th>
                          <th className="py-2 px-3">Uraian</th>
                          <th className="py-2 px-3 text-right">Pagu</th>
                          <th className="py-2 px-3 text-right">Realisasi</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.data.slice(0, 6).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-700">{row.kodeRo}</td>
                            <td className="py-2 px-3 text-blue-700 font-semibold whitespace-nowrap text-[11px]">{row.satkerNama}</td>
                            <td className="py-2 px-3 text-slate-800 line-clamp-1">{row.namaRo}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-600">{formatRupiah(row.pagu)}</td>
                            <td className="py-2 px-3 text-right font-bold text-gov-700">{formatRupiah(row.realisasi)}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  row.status === 'Sesuai Target'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.status === 'Perlu Perhatian'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => monitoringCapaianService.downloadTemplate()}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span>Unduh Format Template AJK</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!parseResult?.success || loading || saving}
              onClick={handleApply}
              className="px-5 py-2 text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 disabled:opacity-40 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Konfirmasi & Simpan ke Sistem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
