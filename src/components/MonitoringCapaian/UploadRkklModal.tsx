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
  Files,
  ArrowRight,
  Database
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
  const [saveProgress, setSaveProgress] = useState<{ pct: number; message: string }>({ pct: 0, message: '' });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [targetSatker, setTargetSatker] = useState<string>('auto');
  const [customSatkerName, setCustomSatkerName] = useState<string>('');
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    data: CapaianRO[];
    fileSummaries: FileSummary[];
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active step in the upload flow: 1 (Upload), 2 (Preview), 3 (Syncing/Success)
  const currentStep = saving || saveSuccess ? 3 : parseResult?.success ? 2 : 1;

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
    setSaveProgress({ pct: 5, message: 'Menyiapkan dan memvalidasi struktur data...' });

    try {
      const count = await monitoringCapaianService.applyImportedROs(
        parseResult.data,
        (pct, message) => {
          setSaveProgress({ pct, message });
        }
      );

      setSaveProgress({ pct: 100, message: `Berhasil! ${count} Rincian Output tersimpan ke Supabase.` });
      setSaveSuccess(true);

      setTimeout(() => {
        onSuccess(count);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error applying imported ROs:', err);
      setSaving(false);
      setSaveProgress({ pct: 0, message: `Gagal menyimpan: ${err.message || 'Kesalahan koneksi'}` });
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
                Upload & Sinkronisasi RKKL / SAKTI
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendukung Laporan FA Detail SAKTI (GLP039) atau format matriks AJK jadwal penyerapan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep >= 1 ? 'bg-gov-700 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              1
            </span>
            <span className={`font-semibold ${currentStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>
              Pilih Berkas
            </span>
          </div>

          <ArrowRight size={14} className="text-slate-400" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep >= 2 ? 'bg-gov-700 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={`font-semibold ${currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>
              Hasil Analisis & Pratinjau
            </span>
          </div>

          <ArrowRight size={14} className="text-slate-400" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 3 ? 'bg-emerald-600 text-white animate-pulse' : 'bg-slate-300 text-slate-600'
              }`}
            >
              3
            </span>
            <span className={`font-semibold ${currentStep === 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
              Sinkronisasi Database
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Syncing Overlay / View when saving */}
          {saving || saveSuccess ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                  saveSuccess ? 'bg-emerald-100 text-emerald-600 scale-105' : 'bg-blue-50 text-gov-700'
                }`}
              >
                {saveSuccess ? (
                  <CheckCircle2 size={36} className="animate-bounce" />
                ) : (
                  <Database size={32} className="animate-pulse" />
                )}
              </div>

              <div className="space-y-1 max-w-md">
                <h4 className="text-base font-bold text-slate-800">
                  {saveSuccess ? 'Sinkronisasi Selesai!' : 'Sedang Memperbarui Data ke Database'}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {saveProgress.message || 'Mohon tunggu beberapa saat...'}
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    saveSuccess ? 'bg-emerald-600' : 'bg-gov-600'
                  }`}
                  style={{ width: `${saveProgress.pct}%` }}
                />
              </div>

              <span className="text-xs font-mono font-bold text-slate-600">
                {saveProgress.pct}%
              </span>
            </div>
          ) : (
            <>
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
                    : 'Klik untuk memilih berkas Excel, atau seret ke sini'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung multi-file: bisa langsung upload 1 berkas atau 6 berkas Satker sekaligus (.xlsx / .xls)
                </p>
              </div>

              {/* Target Satker Selection */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 size={14} className="text-gov-700" />
                    <span>Mode Pemetaan Satuan Kerja (Eselon I)</span>
                  </label>
                  {targetSatker === 'auto' && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={11} /> Auto-Detect dari Kode Satker SAKTI
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
                  Pada mode <strong>Deteksi Otomatis</strong>, sistem mengenali kode resmi 6-digit SAKTI (427944, 664941, 664958, 664962, 664979, 664983) langsung dari setiap berkas. Anda tidak perlu khawatir nama file atau tata letak berubah.
                </p>
              </div>

              {/* Upsert Strategy Info */}
              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <Layers size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">Sistem Penggabungan Data (Smart Upsert):</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Setiap data yang diimpor akan <strong>memperbarui pagu, realisasi, dan komponen</strong>. Rencana penarikan mingguan yang pernah diisi unit kerja <strong>tetap aman dan otomatis disesuaikan agar tidak melebihi sisa anggaran baru</strong>.
                  </p>
                </div>
              </div>

              {/* Loading indicator when parsing */}
              {loading && (
                <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-gov-600" size={26} />
                  <span className="text-xs font-semibold">Sedang membaca berkas Excel & memvalidasi struktur SAKTI...</span>
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
                      <h5 className="font-bold">{parseResult.success ? 'Berkas Berhasil Teranalisis' : 'Gagal Memproses'}</h5>
                      <p className="mt-0.5">{parseResult.message}</p>
                    </div>
                  </div>

                  {/* Per-File Summary Cards */}
                  {parseResult.fileSummaries && parseResult.fileSummaries.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block">
                        Ringkasan Berkas yang Diunggah ({parseResult.fileSummaries.length} Berkas):
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
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!saving && !saveSuccess && (
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
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!parseResult?.success || loading}
                onClick={handleApply}
                className="px-5 py-2 text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 disabled:opacity-40 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Konfirmasi & Simpan ke Sistem</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
