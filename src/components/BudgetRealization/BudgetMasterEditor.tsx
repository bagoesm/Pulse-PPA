// src/components/BudgetRealization/BudgetMasterEditor.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetMaster, BudgetTransaction, BudgetEditor, MasterSumberDana, User } from '../../../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Users, 
  Database,
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import SearchableSelect from '../SearchableSelect';
import * as XLSX from 'xlsx';

interface BudgetMasterEditorProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  currentUser: User;
  isEditor: boolean;
  refreshTrigger: number;
  onMasterUpdated: () => void;
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  selectedTahun: number;
}

const BudgetMasterEditor: React.FC<BudgetMasterEditorProps> = ({
  selectedDivisi,
  sumberDanaList,
  currentUser,
  isEditor,
  refreshTrigger,
  onMasterUpdated,
  showNotification,
  selectedTahun
}) => {
  // Navigation sections
  const [activeSection, setActiveSection] = useState<'pagu' | 'editors' | 'sumber_dana'>('pagu');

  // Core lists
  const [masters, setMasters] = useState<BudgetMaster[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [editors, setEditors] = useState<BudgetEditor[]>([]);
  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search filter
  const [search, setSearch] = useState<string>('');

  // Master editor modal states
  const [editingMaster, setEditingMaster] = useState<BudgetMaster | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [kegiatan, setKegiatan] = useState<string>('');
  const [namaKegiatan, setNamaKegiatan] = useState<string>('');
  const [kro, setKro] = useState<string>('');
  const [namaKro, setNamaKro] = useState<string>('');
  const [ro, setRo] = useState<string>('');
  const [namaRo, setNamaRo] = useState<string>('');
  const [komponen, setKomponen] = useState<string>('');
  const [namaKomponen, setNamaKomponen] = useState<string>('');
  const [subkomponen, setSubkomponen] = useState<string>('');
  const [namaSubkomponen, setNamaSubkomponen] = useState<string>('');
  const [akun, setAkun] = useState<string>('');
  const [namaAkun, setNamaAkun] = useState<string>('');
  const [detail, setDetail] = useState<string>('');
  const [pagu, setPagu] = useState<string>('');
  const [sumberDanaId, setSumberDanaId] = useState<string>('');
  const [tahun, setTahun] = useState<number>(selectedTahun);
  const [saving, setSaving] = useState<boolean>(false);

  // Editor configuration states
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Dynamic Sumber Dana settings state
  const [editingSdId, setEditingSdId] = useState<string | null>(null);
  const [newSdName, setNewSdName] = useState<string>('');

  // Excel importer state
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const selectedSumberDana = useMemo(() => {
    return sumberDanaList.find(s => s.id === sumberDanaId);
  }, [sumberDanaList, sumberDanaId]);

  const isAPBN = useMemo(() => {
    return selectedSumberDana ? selectedSumberDana.name.toUpperCase() === 'APBN' : true;
  }, [selectedSumberDana]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDivisi, activeSection]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const mastersData = await budgetService.fetchBudgetMasters(selectedDivisi, undefined, selectedTahun);
      const trxData = await budgetService.fetchTransactions(selectedDivisi, selectedTahun);
      setMasters(mastersData);
      setTransactions(trxData);

      if (currentUser.role === 'Super Admin') {
        const editorsData = await budgetService.fetchBudgetEditors(selectedDivisi);
        setEditors(editorsData);

        // Fetch profiles to select staff
        const { data: profiles, error: pError } = await (budgetService as any).supabase
          .from('profiles')
          .select('id, name, email, role, divisi')
          .order('name', { ascending: true });

        if (!pError && profiles) {
          setAllProfiles(profiles);
        }
      }
    } catch (err) {
      console.error('Error loading config data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi, currentUser, selectedTahun]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, refreshTrigger]);

  // Reset states when division change
  useEffect(() => {
    setSelectedStaffId('');
    setIsModalOpen(false);
    setEditingMaster(null);
  }, [selectedDivisi]);

  // Auto set first Sumber Dana on modal open
  useEffect(() => {
    if (sumberDanaList.length > 0 && !sumberDanaId) {
      setSumberDanaId(sumberDanaList[0].id);
    }
  }, [sumberDanaList, sumberDanaId]);

  // Master editor actions
  const handleOpenAdd = () => {
    setEditingMaster(null);
    setKegiatan('');
    setNamaKegiatan('');
    setKro('');
    setNamaKro('');
    setRo('');
    setNamaRo('');
    setKomponen('');
    setNamaKomponen('');
    setSubkomponen('');
    setNamaSubkomponen('');
    setAkun('');
    setNamaAkun('');
    setDetail('');
    setPagu('');
    setTahun(selectedTahun);
    if (sumberDanaList.length > 0) {
      setSumberDanaId(sumberDanaList[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: BudgetMaster) => {
    setEditingMaster(m);
    setKegiatan(m.kegiatan || '');
    setNamaKegiatan(m.namaKegiatan || '');
    setKro(m.kro);
    setNamaKro(m.namaKro || '');
    setRo(m.ro);
    setNamaRo(m.namaRo || '');
    setKomponen(m.komponen);
    setNamaKomponen(m.namaKomponen || '');
    setSubkomponen(m.subkomponen || '');
    setNamaSubkomponen(m.namaSubkomponen || '');
    setAkun(m.akun);
    setNamaAkun(m.namaAkun || '');
    setDetail(m.detail || '');
    setPagu(String(m.pagu));
    setSumberDanaId(m.sumberDanaId);
    setTahun(m.tahun || selectedTahun);
    setIsModalOpen(true);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor) return;

    if (isAPBN) {
      if (!kro.trim() || !ro.trim() || !komponen.trim() || !akun.trim() || !detail.trim() || !pagu || !tahun) {
        showNotification('Input Tidak Lengkap', 'Silakan isi kolom KRO, RO, Komponen, Akun, Detail Belanja, Pagu, dan Tahun.', 'warning');
        return;
      }
    } else {
      if (!detail.trim() || !pagu || !tahun) {
        showNotification('Input Tidak Lengkap', 'Silakan isi kolom Detail Belanja, Pagu, dan Tahun.', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        divisi: selectedDivisi,
        sumberDanaId,
        tahun: Number(tahun),
        kegiatan: kegiatan.trim(),
        namaKegiatan: namaKegiatan.trim(),
        kro: kro.trim(),
        namaKro: namaKro.trim(),
        ro: ro.trim(),
        namaRo: namaRo.trim(),
        komponen: komponen.trim(),
        namaKomponen: namaKomponen.trim(),
        subkomponen: subkomponen.trim(),
        namaSubkomponen: namaSubkomponen.trim(),
        akun: akun.trim(),
        namaAkun: namaAkun.trim(),
        detail: detail.trim(),
        pagu: Number(pagu),
        createdBy: currentUser.name
      };

      if (editingMaster) {
        await budgetService.updateBudgetMaster(editingMaster.id, payload);
        showNotification('Master Anggaran Diupdate', 'Data berhasil diperbarui.', 'success');
      } else {
        await budgetService.createBudgetMaster(payload);
        showNotification('Master Anggaran Disimpan', 'Data berhasil ditambahkan.', 'success');
      }

      setIsModalOpen(false);
      loadAllData();
      onMasterUpdated();
    } catch (err: any) {
      console.error('Error saving master:', err);
      showNotification('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaster = async (id: string, detailText: string) => {
    if (!isEditor) return;

    // Boundary check: cannot delete if referenced in transactions
    const countUse = transactions.filter(t => t.masterId === id).length;
    if (countUse > 0) {
      showNotification(
        'Tidak Dapat Dihapus',
        `Master anggaran ini sudah digunakan pada ${countUse} transaksi. Hapus atau pindahkan transaksi terlebih dahulu.`,
        'warning'
      );
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus master anggaran "${detailText}"?`)) return;

    try {
      await budgetService.deleteBudgetMaster(id);
      showNotification('Data Dihapus', 'Master anggaran berhasil dihapus.', 'success');
      loadAllData();
      onMasterUpdated();
    } catch (err: any) {
      console.error('Error deleting master:', err);
      showNotification('Gagal Hapus', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // Editor permissions modifiers (Super Admin Only)
  const handleAddEditor = async () => {
    if (currentUser.role !== 'Super Admin' || !selectedStaffId) return;

    // Check duplicate
    if (editors.some(e => e.userId === selectedStaffId)) {
      showNotification('Sudah Terdaftar', 'Pegawai tersebut sudah menjadi editor di divisi ini.', 'warning');
      return;
    }

    try {
      await budgetService.addBudgetEditor(selectedStaffId, selectedDivisi);
      showNotification('Editor Ditambahkan', 'Akses edit berhasil diberikan.', 'success');
      setSelectedStaffId('');
      loadAllData();
    } catch (err: any) {
      console.error('Error adding editor:', err);
      showNotification('Gagal Tambah Editor', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handleRemoveEditor = async (id: string, name: string) => {
    if (currentUser.role !== 'Super Admin') return;

    if (!window.confirm(`Cabut hak akses edit anggaran untuk "${name}"?`)) return;

    try {
      await budgetService.removeBudgetEditor(id);
      showNotification('Akses Dicabut', 'Akses edit anggaran berhasil dicabut.', 'success');
      loadAllData();
    } catch (err: any) {
      console.error('Error removing editor:', err);
      showNotification('Gagal Cabut Akses', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // Dynamic sources of funds settings operations
  const handleSaveSumberDana = async () => {
    if (!newSdName.trim()) return;
    try {
      if (editingSdId) {
        await budgetService.updateMasterSumberDana(editingSdId, newSdName);
        showNotification('Sumber Dana Terupdate', 'Perubahan berhasil disimpan.', 'success');
      } else {
        await budgetService.createMasterSumberDana(newSdName);
        showNotification('Sumber Dana Ditambahkan', 'Sumber dana baru berhasil dibuat.', 'success');
      }
      setNewSdName('');
      setEditingSdId(null);
      // Force reload parent wrapper
      window.location.reload();
    } catch (err: any) {
      console.error('Error saving sources of funds:', err);
      showNotification('Gagal Simpan', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handleDeleteSumberDana = async (id: string, name: string) => {
    if (!window.confirm(`Hapus Sumber Dana "${name}"? Pagu yang merujuk ke sumber ini akan memblokir penghapusan.`)) return;
    try {
      await budgetService.deleteMasterSumberDana(id);
      showNotification('Sumber Dana Dihapus', 'Data berhasil dihapus.', 'success');
      window.location.reload();
    } catch (err: any) {
      console.error('Error deleting sources of funds:', err);
      showNotification('Gagal Hapus', 'Sumber dana ini sudah digunakan di master anggaran dan tidak dapat dihapus.', 'error');
    }
  };

  // Batch Excel Importer
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isEditor) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        if (rows.length === 0) {
          showNotification('File Kosong', 'Tidak ada baris data terdeteksi.', 'warning');
          setIsImporting(false);
          return;
        }

        // Validate headers map
        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
          // Columns matching: KRO, RO, Komponen, Akun, Detail, Pagu, Sumber Dana, Tahun
          const excelKro = String(row['KRO'] || '').trim();
          const excelRo = String(row['RO'] || '').trim();
          const excelKomponen = String(row['Komponen'] || '').trim();
          const excelAkun = String(row['Akun'] || '').trim();
          const excelDetail = String(row['Detail Belanja'] || row['Detail'] || '').trim();
          const excelPagu = Number(row['Pagu'] || 0);
          const excelSdName = String(row['Sumber Dana'] || 'APBN').trim();
          const excelTahun = Number(row['Tahun'] || selectedTahun);

          // Lookup Sumber Dana ID by name
          let sd = sumberDanaList.find(s => s.name.toLowerCase() === excelSdName.toLowerCase());
          if (!sd && sumberDanaList.length > 0) {
            sd = sumberDanaList[0]; // Fallback to first
          }

          if (!sd) {
            failCount++;
            continue;
          }

          const excelIsAPBN = sd.name.toUpperCase() === 'APBN';

          if (excelIsAPBN) {
            if (!excelKro || !excelRo || !excelKomponen || !excelAkun || !excelDetail) {
              failCount++;
              continue;
            }
          } else {
            if (!excelDetail) {
              failCount++;
              continue;
            }
          }

          await budgetService.createBudgetMaster({
            divisi: selectedDivisi,
            sumberDanaId: sd.id,
            tahun: excelTahun,
            kegiatan: String(row['Kegiatan'] || '').trim(),
            namaKegiatan: String(row['Nama Kegiatan'] || '').trim(),
            kro: excelKro,
            namaKro: String(row['Nama KRO'] || '').trim(),
            ro: excelRo,
            namaRo: String(row['Nama RO'] || '').trim(),
            komponen: excelKomponen,
            namaKomponen: String(row['Nama Komponen'] || '').trim(),
            subkomponen: String(row['Subkomponen'] || '').trim(),
            namaSubkomponen: String(row['Nama Subkomponen'] || '').trim(),
            akun: excelAkun,
            namaAkun: String(row['Nama Akun'] || '').trim(),
            detail: excelDetail,
            pagu: excelPagu,
            createdBy: currentUser.name
          });
          successCount++;
        }

        showNotification('Import Selesai', `${successCount} data pagu diimport, ${failCount} gagal.`, 'success');
        loadAllData();
        onMasterUpdated();
      } catch (err: any) {
        console.error('Error importing Excel:', err);
        showNotification('Gagal Import', err.message || 'Format file salah.', 'error');
      } finally {
        setIsImporting(false);
        // Clear input value
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter master lists in memory
  const filteredMasters = useMemo(() => {
    return masters.filter(m => {
      const kodeComplete = `${m.kro}.${m.ro}.${m.komponen}.${m.akun}`;
      return search.trim() === '' || 
        m.detail.toLowerCase().includes(search.toLowerCase()) ||
        kodeComplete.toLowerCase().includes(search.toLowerCase());
    });
  }, [masters, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMasters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMasters = useMemo(() => {
    return filteredMasters.slice(startIndex, endIndex);
  }, [filteredMasters, startIndex, endIndex]);

  // List staff profiles eligible to be assigned as editors (Exclude Super Admins, Atasans can be selected, Staff can be selected)
  const staffOptions = useMemo(() => {
    return allProfiles.filter(p => 
      p.role !== 'Super Admin' && 
      p.divisi === selectedDivisi &&
      !editors.some(e => e.userId === p.id)
    );
  }, [allProfiles, editors, selectedDivisi]);

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration Navigation Tab Headers */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-xl border shadow-sm">
        <button
          onClick={() => setActiveSection('pagu')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeSection === 'pagu' 
              ? 'border-gov-600 text-gov-700 font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database size={14} />
          <span>Daftar Pagu Anggaran</span>
        </button>

        {currentUser.role === 'Super Admin' && (
          <button
            onClick={() => setActiveSection('editors')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSection === 'editors' 
                ? 'border-gov-600 text-gov-700 font-extrabold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={14} />
            <span>Kelola Editor Anggaran</span>
          </button>
        )}

        {isEditor && (
          <button
            onClick={() => setActiveSection('sumber_dana')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeSection === 'sumber_dana' 
                ? 'border-gov-600 text-gov-700 font-extrabold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings size={14} />
            <span>Pengaturan Sumber Dana</span>
          </button>
        )}
      </div>

      {/* RENDER TAB SECTION 1: MASTER PAGU LIST */}
      {activeSection === 'pagu' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari kode lengkap atau detail belanja..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all"
              />
            </div>

            {/* Editor Actions */}
            {isEditor && (
              <div className="flex gap-2 self-end md:self-auto">
                
                {/* Excel Importer */}
                <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all border border-slate-200 shadow-sm">
                  <Upload size={14} />
                  <span>{isImporting ? 'Mengimport...' : 'Import Excel'}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelImport}
                    className="hidden"
                    disabled={isImporting}
                  />
                </label>

                {/* Add Button */}
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-100"
                >
                  <Plus size={14} />
                  <span>Tambah Pagu</span>
                </button>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-bold text-xs">
                  <tr>
                    <th className="px-4 py-3" style={{ width: '70px' }}>ID</th>
                    <th className="px-3 py-3">Sumber Dana</th>
                    <th className="px-3 py-3">Kode Lengkap</th>
                    <th className="px-4 py-3 min-w-[280px]">Detail Belanja</th>
                    <th className="px-4 py-3 text-right">Alokasi Pagu</th>
                    {isEditor && <th className="px-4 py-3 text-center" style={{ width: '120px' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={isEditor ? 6 : 5} className="text-center py-20 text-slate-400">
                        Memuat data pagu...
                      </td>
                    </tr>
                  ) : paginatedMasters.length === 0 ? (
                    <tr>
                      <td colSpan={isEditor ? 6 : 5} className="text-center py-20 text-slate-400">
                        Belum ada data pagu terdaftar di divisi ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedMasters.map((m, index) => {
                      const isItemAPBN = m.sumberDana ? m.sumberDana.name.toUpperCase() === 'APBN' : true;
                      const hasCodes = m.kro || m.ro || m.komponen || m.akun;
                      const kodeLengkap = isItemAPBN
                        ? `${m.kro}.${m.ro.toString().padStart(3, '0')}.${m.komponen.toString().padStart(3, '0')}.${m.subkomponen || '0'}.${m.akun}`
                        : hasCodes
                          ? `${m.kro || '-'}.${m.ro || '-'}.${m.komponen || '-'}.${m.subkomponen || '0'}.${m.akun || '-'}`
                          : '-';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-slate-400 font-bold">{startIndex + index + 1}</td>
                          <td className="px-3 py-3.5 font-bold text-slate-500">
                            {m.sumberDana?.name || 'APBN'}
                          </td>
                          <td className="px-3 py-3.5 font-mono text-slate-600 font-bold">{kodeLengkap}</td>
                          <td className="px-4 py-3.5 break-words max-w-[320px]">
                            <div>
                              <span className="block font-semibold text-slate-800">{m.detail}</span>
                              <span className="block text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                Kegiatan: {m.kegiatan || '-'} ({m.namaKegiatan || '-'})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                            {formatCurrency(m.pagu)}
                          </td>
                          {isEditor && (
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(m)}
                                  className="p-1 hover:bg-slate-100 text-amber-500 hover:text-amber-700 rounded transition-colors"
                                  title="Edit Pagu"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMaster(m.id, m.detail)}
                                  className="p-1 hover:bg-slate-100 text-rose-500 hover:text-rose-700 rounded transition-colors"
                                  title="Hapus Pagu"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredMasters.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-slate-600">
                    Menampilkan <span className="font-semibold">{startIndex + 1}-{Math.min(endIndex, filteredMasters.length)}</span> dari <span className="font-semibold">{filteredMasters.length}</span> item
                  </span>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <span>Tampilkan:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-semibold focus:outline-none focus:bg-white text-slate-700"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    Halaman <span className="font-semibold">{currentPage}</span> dari <span className="font-semibold">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB SECTION 2: EDITORS PERMISSIONS CONTROL (SUPER ADMIN ONLY) */}
      {activeSection === 'editors' && currentUser.role === 'Super Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add Editor Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-[180px]">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tunjuk Editor Anggaran</h4>
              <p className="text-[10px] text-slate-400 leading-normal mb-3 font-medium">
                Pilih Staff atau pegawai di divisi ini untuk diberikan hak akses penuh untuk mengelola master pagu dan transaksi realisasi.
              </p>
            </div>
            <div className="flex gap-2 items-center flex-1">
              <SearchableSelect
                options={staffOptions.map(s => ({ value: s.id, label: `${s.name} (${s.email.split('@')[0]})` }))}
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                placeholder="Cari pegawai..."
                emptyOption="Pilih Pegawai..."
                className="flex-1"
              />
              <button
                onClick={handleAddEditor}
                className="px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-100 flex items-center gap-1 disabled:opacity-50"
                disabled={!selectedStaffId}
              >
                <UserCheck size={14} />
                <span>Tunjuk</span>
              </button>
            </div>
          </div>

          {/* Editors List */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden md:col-span-2 flex flex-col min-h-[220px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-1.5">
              <Users size={16} className="text-gov-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Editor Anggaran Divisi</h4>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Nama Pegawai</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5 text-center" style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-400">
                        Memuat editor...
                      </td>
                    </tr>
                  ) : editors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-slate-400">
                        Belum ada editor ditunjuk untuk divisi ini. Semua Staff berstatus Read Only.
                      </td>
                    </tr>
                  ) : (
                    editors.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{e.userName}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-normal">{e.userEmail}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveEditor(e.id, e.userName || 'Pegawai')}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold hover:underline"
                          >
                            Cabut Akses
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* RENDER TAB SECTION 3: DYNAMIC SUMBER DANA SETTINGS */}
      {activeSection === 'sumber_dana' && isEditor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add / Edit Form Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-[180px]">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {editingSdId ? 'Edit Sumber Dana' : 'Tambah Sumber Dana'}
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal mb-3 font-medium">
                Kelola nama sumber alokasi belanja untuk master anggaran satker (misal: APBN, Dana Hibah, APBD, dsb.).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nama sumber dana (e.g. APBD Provinsi)"
                value={newSdName}
                onChange={(e) => setNewSdName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white"
              />
              <div className="flex justify-end gap-1.5 mt-1">
                {editingSdId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewSdName('');
                      setEditingSdId(null);
                    }}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200"
                  >
                    Batal
                  </button>
                )}
                <button
                  onClick={handleSaveSumberDana}
                  className="px-3 py-1 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow shadow-gov-100 disabled:opacity-50"
                  disabled={!newSdName.trim()}
                >
                  {editingSdId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>

          {/* Sumber Dana List */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden md:col-span-2 flex flex-col min-h-[220px]">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-1.5">
              <Settings size={16} className="text-gov-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Sumber Dana Terdaftar</h4>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Nama Sumber Dana</th>
                    <th className="px-4 py-2.5 text-center" style={{ width: '140px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {sumberDanaList.map((sd) => (
                    <tr key={sd.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{sd.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => {
                              setEditingSdId(sd.id);
                              setNewSdName(sd.name);
                            }}
                            className="text-amber-500 hover:text-amber-700 text-xs font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSumberDana(sd.id, sd.name)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MASTER PAGU INSERT/EDIT POPUP MODAL */}
      {isModalOpen && isEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingMaster ? 'Edit Alokasi Pagu Anggaran' : 'Tambah Alokasi Pagu Anggaran'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveMaster} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-medium">
              
              {/* Row 1: Sumber Dana & Tahun */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-500 font-bold block">Sumber Dana</label>
                  <SearchableSelect
                    options={sumberDanaList.map((sd) => ({ value: sd.id, label: sd.name }))}
                    value={sumberDanaId}
                    onChange={setSumberDanaId}
                    placeholder="Cari sumber dana..."
                    emptyOption="Pilih Sumber Dana"
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Tahun Anggaran *</label>
                  <input
                    type="number"
                    placeholder="e.g. 2026"
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Kegiatan & Nama Kegiatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode Kegiatan</label>
                  <input
                    type="text"
                    placeholder="e.g. 5212"
                    value={kegiatan}
                    onChange={(e) => setKegiatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama Kegiatan</label>
                  <input
                    type="text"
                    placeholder="e.g. Dukungan Manajemen Satker"
                    value={namaKegiatan}
                    onChange={(e) => setNamaKegiatan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 3: KRO & Nama KRO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode KRO (Klasifikasi Rincian Output) {isAPBN && '*'}</label>
                  <input
                    type="text"
                    placeholder="e.g. EBA"
                    value={kro}
                    onChange={(e) => setKro(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                    required={isAPBN}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama KRO</label>
                  <input
                    type="text"
                    placeholder="e.g. Layanan Umum Kepegawaian"
                    value={namaKro}
                    onChange={(e) => setNamaKro(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 4: RO & Nama RO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode RO (Rincian Output) {isAPBN && '*'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 994"
                    value={ro}
                    onChange={(e) => setRo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                    required={isAPBN}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama RO</label>
                  <input
                    type="text"
                    placeholder="e.g. Dokumen Administrasi Kepegawaian"
                    value={namaRo}
                    onChange={(e) => setNamaRo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 5: Komponen & Nama Komponen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode Komponen {isAPBN && '*'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 001"
                    value={komponen}
                    onChange={(e) => setKomponen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                    required={isAPBN}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama Komponen</label>
                  <input
                    type="text"
                    placeholder="e.g. Gaji dan Tunjangan Pegawai"
                    value={namaKomponen}
                    onChange={(e) => setNamaKomponen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Subkomponen & Nama Subkomponen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode Subkomponen</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={subkomponen}
                    onChange={(e) => setSubkomponen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama Subkomponen</label>
                  <input
                    type="text"
                    placeholder="e.g. Administrasi Kepegawaian Dalam Negeri"
                    value={namaSubkomponen}
                    onChange={(e) => setNamaSubkomponen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 7: Akun & Nama Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Kode Akun {isAPBN && '*'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 521211"
                    value={akun}
                    onChange={(e) => setAkun(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                    required={isAPBN}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Nama Akun</label>
                  <input
                    type="text"
                    placeholder="e.g. Belanja Bahan Penunjang"
                    value={namaAkun}
                    onChange={(e) => setNamaAkun(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 8: Detail Belanja & Pagu */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-500 font-bold">Detail Uraian Belanja *</label>
                  <input
                    type="text"
                    placeholder="e.g. Pembelian konsumsi rapat koordinasi satker..."
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold">Pagu Alokasi (Rupiah) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000000"
                    value={pagu}
                    onChange={(e) => setPagu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Master</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BudgetMasterEditor;
