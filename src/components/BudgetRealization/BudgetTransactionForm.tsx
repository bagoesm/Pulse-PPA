// src/components/BudgetRealization/BudgetTransactionForm.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetMaster, MasterSumberDana } from '../../../types';
import { 
  PlusCircle, 
  Search, 
  AlertTriangle, 
  Info,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';
import SearchableSelect from '../SearchableSelect';
import { aiExtractorService } from '../../services/aiExtractorService';

interface BudgetTransactionFormProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  currentUser: any;
  isEditor: boolean;
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  onTransactionAdded: () => void;
  onClose?: () => void;
  selectedTahun: number;
}

const BudgetTransactionForm: React.FC<BudgetTransactionFormProps> = ({
  selectedDivisi,
  currentUser,
  isEditor,
  showNotification,
  onTransactionAdded,
  onClose,
  selectedTahun
}) => {
  const [masters, setMasters] = useState<BudgetMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMaster, setSelectedMaster] = useState<BudgetMaster | null>(null);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [uraian, setUraian] = useState<string>('');
  const [nominal, setNominal] = useState<string>('');
  const [bukti, setBukti] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [status, setStatus] = useState<'Realisasi' | 'Outstanding'>('Realisasi');

  // Loaded realisasi tracking to calculate sisa before insert
  const [masterRealisasiMap, setMasterRealisasiMap] = useState<Map<string, number>>(new Map());

  // AI states
  const [aiInputText, setAiInputText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  const handleAiExtract = async () => {
    if (!aiInputText.trim()) {
      showNotification('Input Kosong', 'Silakan masukkan deskripsi transaksi terlebih dahulu.', 'warning');
      return;
    }
    
    setIsExtracting(true);
    try {
      const result = await aiExtractorService.extractBudgetTransaction(aiInputText, masters);
      
      if (result) {
        if (result.tanggal) setTanggal(result.tanggal);
        if (result.status) setStatus(result.status);
        if (result.nominal !== undefined && result.nominal !== null) setNominal(result.nominal.toString());
        if (result.uraian) setUraian(result.uraian);
        if (result.bukti) setBukti(result.bukti || '');
        if (result.keterangan) setKeterangan(result.keterangan || '');
        
        if (result.masterId) {
          const matched = masters.find(m => m.id === result.masterId);
          if (matched) {
            handleSelectMaster(matched);
            showNotification('Berhasil Mengisi Form', 'Data transaksi dan Master Anggaran berhasil dicocokkan otomatis oleh AI.', 'success');
          } else {
            showNotification('Berhasil Mengisi Form', 'Data transaksi berhasil diisi, namun Master Anggaran tidak ditemukan yang cocok.', 'info');
          }
        } else {
          showNotification('Berhasil Mengisi Form', 'Data transaksi berhasil diisi, silakan pilih Master Anggaran secara manual.', 'info');
        }
      } else {
        showNotification('Ekstraksi Kosong', 'AI tidak dapat mendeteksi informasi transaksi yang valid.', 'warning');
      }
    } catch (err: any) {
      console.error('AI transaction extraction failed:', err);
      showNotification('Gagal Ekstraksi AI', err.message || 'Terjadi kesalahan saat mengekstrak data dengan AI.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const loadMastersAndRealisasi = useCallback(async () => {
    setLoading(true);
    try {
      const mastersData = await budgetService.fetchBudgetMasters(selectedDivisi, undefined, selectedTahun);
      const trxData = await budgetService.fetchTransactions(selectedDivisi, selectedTahun);
      setMasters(mastersData);

      const realMap = new Map<string, number>();
      trxData.forEach(t => {
        const current = realMap.get(t.masterId) || 0;
        realMap.set(t.masterId, current + t.nominal);
      });
      setMasterRealisasiMap(realMap);
    } catch (err) {
      console.error('Error fetching autocomplete masters:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi, selectedTahun]);

  useEffect(() => {
    if (isEditor) {
      loadMastersAndRealisasi();
    }
  }, [loadMastersAndRealisasi, isEditor]);

  // Autocomplete suggestions filtering
  const autocompleteSuggestions = useMemo(() => {
    if (searchQuery.trim() === '') return [];
    return masters.filter(m => 
      m.kro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.ro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.akun.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.detail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [masters, searchQuery]);

  // Live selected master details
  const selectedMasterSummary = useMemo(() => {
    if (!selectedMaster) return null;
    const realisasi = masterRealisasiMap.get(selectedMaster.id) || 0;
    const sisa = selectedMaster.pagu - realisasi;
    return {
      pagu: selectedMaster.pagu,
      realisasi,
      sisa
    };
  }, [selectedMaster, masterRealisasiMap]);

  // Over budget warning check
  const showOverBudgetWarning = useMemo(() => {
    if (!selectedMasterSummary || !nominal) return false;
    const val = Number(nominal) || 0;
    return val > selectedMasterSummary.sisa;
  }, [selectedMasterSummary, nominal]);

  const handleSelectMaster = (m: BudgetMaster) => {
    setSelectedMaster(m);
    const codeStr = (m.kro || m.ro) ? `${m.kro || '-'}.${m.ro || '-'} ` : '';
    setSearchQuery(`${codeStr}- ${m.detail.slice(0, 45)}...`);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedMaster(null);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) return;

    if (!selectedMaster) {
      showNotification('Input Tidak Lengkap', 'Silakan pilih Master Anggaran terlebih dahulu.', 'warning');
      return;
    }
    if (!uraian.trim()) {
      showNotification('Input Tidak Lengkap', 'Uraian transaksi tidak boleh kosong.', 'warning');
      return;
    }
    if (!nominal || Number(nominal) <= 0) {
      showNotification('Input Tidak Lengkap', 'Nominal harus bernilai lebih dari 0.', 'warning');
      return;
    }
    if (bukti && !bukti.startsWith('http')) {
      showNotification('Link Bukti Tidak Valid', 'Link bukti dukung harus diawali dengan http:// atau https://', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await budgetService.createTransaction({
        masterId: selectedMaster.id,
        tanggal,
        uraian,
        nominal: Number(nominal),
        bukti,
        keterangan,
        status,
        createdBy: currentUser.name
      });

      showNotification('Transaksi Berhasil Disimpan', 'Realisasi anggaran berhasil dicatat.', 'success');
      
      // Reset form
      setUraian('');
      setNominal('');
      setBukti('');
      setKeterangan('');
      setSelectedMaster(null);
      setSearchQuery('');
      setStatus('Realisasi');
      
      // Reload values
      await loadMastersAndRealisasi();
      
      // Trigger update
      onTransactionAdded();
    } catch (err: any) {
      console.error('Error creating transaction:', err);
      showNotification('Gagal Simpan Transaksi', err.message || 'Terjadi kesalahan saat menyimpan transaksi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isEditor) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Akses Terbatas</h3>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          Hanya **Super Admin** dan **Staff yang ditunjuk (Budget Editors)** yang dapat melakukan pencatatan transaksi realisasi anggaran belanja satker.
        </p>
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-left border border-slate-200">
          <span className="font-bold block text-slate-700 mb-1">Akses Anda:</span>
          <span className="text-slate-600 block">Divisi: {selectedDivisi || '-'}</span>
          <span className="text-slate-600 block">Role: {currentUser.role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-gov-600" size={18} />
            <h3 className="font-bold text-slate-800 text-sm">Form Catat Transaksi Realisasi</h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* AI Autofill Assistant */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-4 space-y-3 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
              <Sparkles size={120} className="text-violet-600" />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-600 text-white rounded-lg shadow-sm shadow-violet-200">
                  <Sparkles size={14} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Asisten Input AI</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Tulis detail transaksi untuk mengisi form secara otomatis</p>
                </div>
              </div>
              
              {aiInputText && (
                <button
                  type="button"
                  onClick={() => setAiInputText('')}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-650 transition-colors"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="relative z-10 flex gap-2">
              <textarea
                placeholder="Contoh: Bayar konsumsi rapat koordinasi dinas Datin Rp 450.000 tanggal 1 Juli 2026, bukti link: https://gdrive.com/kwitansi1"
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                className="flex-1 min-h-[50px] max-h-[120px] bg-white border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all placeholder-slate-400 font-medium text-slate-700 resize-y"
              />
              <button
                type="button"
                disabled={isExtracting || !aiInputText.trim()}
                onClick={handleAiExtract}
                className="px-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-bold transition-all shadow-sm shadow-violet-100 flex items-center justify-center gap-1.5 self-stretch whitespace-nowrap min-w-[100px]"
              >
                {isExtracting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Isi Form</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tanggal & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar size={13} /> Tanggal Transaksi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">Status Pembayaran</label>
              <SearchableSelect
                options={[
                  { value: 'Realisasi', label: 'Realisasi (Sudah Dibayar)' },
                  { value: 'Outstanding', label: 'Outstanding (Belum Dibayar / Komitmen)' }
                ]}
                value={status}
                onChange={(val) => setStatus(val as 'Realisasi' | 'Outstanding')}
                placeholder="Pilih Status..."
                emptyOption="Pilih Status..."
                className="w-full font-semibold"
              />
            </div>
          </div>

          {/* Autocomplete Master Anggaran Selector */}
          <div className="space-y-1 relative">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Search size={13} /> Pilih Pagu Anggaran (Master)
            </label>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik KRO, RO, Akun, atau detail belanja untuk mencari..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedMaster) setSelectedMaster(null);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium"
                required
              />
              {selectedMaster && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500 hover:text-rose-700 bg-slate-200/50 hover:bg-slate-200 px-1.5 py-0.5 rounded"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && autocompleteSuggestions.length > 0 && (
              <div 
                className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 scrollbar-thin text-xs"
                style={{ top: '100%' }}
              >
                {autocompleteSuggestions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMaster(m)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>KRO: {m.kro || '-'} | RO: {m.ro || '-'} | Akun: {m.akun || '-'}</span>
                      <span className="text-gov-600">{m.sumberDana?.name || 'APBN'}</span>
                    </div>
                    <p className="text-slate-800 leading-normal font-medium">{m.detail}</p>
                    <div className="text-[10px] text-slate-400 font-semibold mt-1">
                      Pagu: Rp {m.pagu.toLocaleString('id-ID')} | Sisa: Rp {(m.pagu - (masterRealisasiMap.get(m.id) || 0)).toLocaleString('id-ID')}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showDropdown && searchQuery.trim() !== '' && autocompleteSuggestions.length === 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 p-4 bg-white border border-slate-200 rounded-lg shadow-lg text-center text-slate-400 text-xs">
                Tidak ada pagu anggaran yang cocok.
              </div>
            )}
          </div>

          {/* Selected Master Preview Card */}
          {selectedMaster && selectedMasterSummary && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col gap-2 animate-fadeIn text-xs leading-relaxed">
              <div className="flex justify-between items-center border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Info size={14} className="text-gov-600" /> Detail Pagu Terpilih
                </span>
                <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  {selectedMaster.sumberDana?.name || 'APBN'}
                </span>
              </div>
              <p className="font-bold text-slate-700 mt-1">{selectedMaster.detail}</p>
              <div className="grid grid-cols-3 gap-2 mt-1 font-semibold text-slate-500">
                <div>Pagu: <span className="text-slate-800 block font-bold mt-0.5">Rp {selectedMasterSummary.pagu.toLocaleString('id-ID')}</span></div>
                <div>Realisasi: <span className="text-slate-800 block font-bold mt-0.5 text-emerald-600">Rp {selectedMasterSummary.realisasi.toLocaleString('id-ID')}</span></div>
                <div>Sisa Pagu: <span className={`block font-bold mt-0.5 ${selectedMasterSummary.sisa < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  Rp {selectedMasterSummary.sisa.toLocaleString('id-ID')}
                </span></div>
              </div>
            </div>
          )}

          {/* Nominal */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <DollarSign size={13} /> Nominal Realisasi (Rupiah)
            </label>
            <input
              type="number"
              placeholder="Masukkan angka tanpa titik atau koma..."
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-semibold"
              required
            />
          </div>

          {/* Over Budget Alert Message */}
          {showOverBudgetWarning && selectedMasterSummary && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs leading-relaxed flex gap-2 items-start animate-shake">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-bold block">Peringatan: Over Budget!</span>
                <span>Nominal transaksi ini (Rp {(Number(nominal) || 0).toLocaleString('id-ID')}) melebihi sisa pagu tersedia (Rp {selectedMasterSummary.sisa.toLocaleString('id-ID')}).</span>
              </div>
            </div>
          )}

          {/* Uraian */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <FileText size={13} /> Uraian Penggunaan
            </label>
            <textarea
              placeholder="Deskripsikan pengeluaran belanja anggaran ini secara detail..."
              value={uraian}
              onChange={(e) => setUraian(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium min-h-[80px]"
              required
            />
          </div>

          {/* Bukti Dukung */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Link Bukti Dukung (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/... (Harus diawali http:// atau https://)"
              value={bukti}
              onChange={(e) => setBukti(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              Keterangan Tambahan (Opsional)
            </label>
            <textarea
              placeholder="Catatan pelaporan atau informasi tambahan..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium min-h-[60px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
              >
                Batal
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setUraian('');
                  setNominal('');
                  setBukti('');
                  setKeterangan('');
                  setSelectedMaster(null);
                  setSearchQuery('');
                  setStatus('Realisasi');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
              >
                Reset Form
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-200 flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>Catat Realisasi</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default BudgetTransactionForm;
