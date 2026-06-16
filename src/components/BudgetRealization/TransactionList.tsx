// src/components/BudgetRealization/TransactionList.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetTransaction, MasterSumberDana } from '../../../types';
import { 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink,
  Calendar,
  DollarSign,
  FileText,
  X,
  FileCheck,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import BudgetTransactionForm from './BudgetTransactionForm';
import SearchableSelect from '../SearchableSelect';

interface TransactionListProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  currentUser: any;
  isEditor: boolean;
  refreshTrigger: number;
  onTransactionUpdated: () => void;
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  selectedTahun: number;
}

const TransactionList: React.FC<TransactionListProps> = ({
  selectedDivisi,
  sumberDanaList,
  currentUser,
  isEditor,
  refreshTrigger,
  onTransactionUpdated,
  showNotification,
  selectedTahun
}) => {
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDivisi]);

  // Editing state
  const [editingTrx, setEditingTrx] = useState<BudgetTransaction | null>(null);
  const [editTanggal, setEditTanggal] = useState<string>('');
  const [editNominal, setEditNominal] = useState<string>('');
  const [editUraian, setEditUraian] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [editBukti, setEditBukti] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Realisasi' | 'Outstanding'>('Realisasi');
  const [updating, setUpdating] = useState<boolean>(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await budgetService.fetchTransactions(selectedDivisi, selectedTahun);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions list:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi, selectedTahun]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  // Filter lists in memory
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = search.trim() === '' || 
        t.uraian.toLowerCase().includes(search.toLowerCase()) ||
        t.createdBy.toLowerCase().includes(search.toLowerCase()) ||
        (t.master && (
          t.master.detail.toLowerCase().includes(search.toLowerCase()) ||
          t.master.kro.toLowerCase().includes(search.toLowerCase()) ||
          t.master.ro.toLowerCase().includes(search.toLowerCase()) ||
          t.master.akun.toLowerCase().includes(search.toLowerCase())
        ));
      
      return matchSearch;
    });
  }, [transactions, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, startIndex, endIndex]);

  const handleDelete = async (id: string, description: string) => {
    if (!isEditor) return;

    // Direct confirm modal mimicking existing style
    const confirmMessage = `Apakah Anda yakin ingin menghapus catatan transaksi "${description}"? Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await budgetService.deleteTransaction(id);
      showNotification('Transaksi Berhasil Dihapus', 'Catatan realisasi pengeluaran telah dihapus.', 'success');
      loadTransactions();
      onTransactionUpdated();
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      showNotification('Gagal Hapus Transaksi', err.message || 'Terjadi kesalahan saat menghapus.', 'error');
    }
  };

  const handleOpenEdit = (t: BudgetTransaction) => {
    setEditingTrx(t);
    setEditTanggal(t.tanggal);
    setEditNominal(String(t.nominal));
    setEditUraian(t.uraian);
    setEditKeterangan(t.keterangan || '');
    setEditBukti(t.bukti || '');
    setEditStatus(t.status || 'Realisasi');
  };

  const handleCloseEdit = () => {
    setEditingTrx(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditor || !editingTrx) return;

    if (!editUraian.trim()) {
      showNotification('Input Tidak Lengkap', 'Uraian tidak boleh kosong.', 'warning');
      return;
    }
    if (!editNominal || Number(editNominal) <= 0) {
      showNotification('Input Tidak Lengkap', 'Nominal harus bernilai lebih dari 0.', 'warning');
      return;
    }
    if (editBukti && !editBukti.startsWith('http')) {
      showNotification('Link Bukti Tidak Valid', 'Link bukti dukung harus diawali dengan http:// atau https://', 'warning');
      return;
    }

    setUpdating(true);
    try {
      await budgetService.updateTransaction(editingTrx.id, {
        tanggal: editTanggal,
        uraian: editUraian,
        nominal: Number(editNominal),
        keterangan: editKeterangan,
        bukti: editBukti,
        status: editStatus
      });

      showNotification('Perubahan Disimpan', 'Data transaksi berhasil diperbarui.', 'success');
      handleCloseEdit();
      loadTransactions();
      onTransactionUpdated();
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      showNotification('Gagal Memperbarui', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari uraian, KRO, Akun, atau PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all"
          />
        </div>
        {isEditor ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-100 self-end md:self-auto"
          >
            <Plus size={14} />
            <span>Tambah Transaksi</span>
          </button>
        ) : (
          <span className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-lg px-3 py-2">
            Akses: Read Only
          </span>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-3 py-3">KRO / RO</th>
                <th className="px-3 py-3">Akun</th>
                <th className="px-4 py-3 min-w-[200px]">Uraian Penggunaan</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3 text-center">Bukti</th>
                <th className="px-4 py-3 text-center">Petugas (PIC)</th>
                <th className="px-3 py-3 text-center">Status</th>
                {isEditor && <th className="px-4 py-3 text-center" style={{ width: '120px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={isEditor ? 10 : 9} className="text-center py-20">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-gov-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="text-slate-400 text-sm">Memuat log transaksi...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isEditor ? 10 : 9} className="text-center py-20 text-slate-400 text-sm">
                    Tidak ditemukan log transaksi belanja satker.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600">
                      {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3.5">
                      {t.master ? (
                        <div>
                          <span className="block font-bold text-slate-700 text-sm">{t.master.kro}</span>
                          <span className="block text-xs text-slate-400 font-medium mt-0.5">{t.master.ro}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-slate-600 text-sm">{t.master?.akun || '-'}</td>
                    <td className="px-4 py-3.5 break-words max-w-[260px]">
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">
                          {t.master?.detail || '-'}
                        </span>
                        <span className="block text-xs text-slate-500 font-medium mt-0.5" title={t.uraian}>
                          {t.uraian}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatCurrency(t.nominal)}
                    </td>
                    <td className="px-4 py-3.5 max-w-[150px] break-words text-slate-500 text-sm font-normal">
                      {t.keterangan || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {t.bukti ? (
                        <a
                          href={t.bukti}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-gov-600 hover:text-gov-800 font-bold hover:underline"
                        >
                          <span>Unduh</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-xs text-slate-500">
                      {t.createdBy}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Outstanding' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {t.status || 'Realisasi'}
                      </span>
                    </td>
                    {isEditor && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1 hover:bg-slate-100 text-amber-500 hover:text-amber-700 rounded transition-colors"
                            title="Edit Transaksi"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.uraian)}
                            className="p-1 hover:bg-slate-100 text-rose-500 hover:text-rose-700 rounded transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-600">
                Menampilkan <span className="font-semibold">{startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)}</span> dari <span className="font-semibold">{filteredTransactions.length}</span> item
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

      {/* Edit Modal Popup */}
      {editingTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <FileCheck className="text-amber-500" size={18} />
                <span>Edit Transaksi Realisasi</span>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              
              {/* Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar size={13} /> Tanggal
                  </label>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    Status Pembayaran
                  </label>
                  <SearchableSelect
                    options={[
                      { value: 'Realisasi', label: 'Realisasi (Sudah Dibayar)' },
                      { value: 'Outstanding', label: 'Outstanding (Belum Dibayar / Komitmen)' }
                    ]}
                    value={editStatus}
                    onChange={(val) => setEditStatus(val as 'Realisasi' | 'Outstanding')}
                    placeholder="Pilih Status..."
                    emptyOption="Pilih Status..."
                    className="w-full font-semibold"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <DollarSign size={13} /> Nominal (Rupiah)
                </label>
                <input
                  type="number"
                  value={editNominal}
                  onChange={(e) => setEditNominal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-semibold"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <FileText size={13} /> Uraian Penggunaan
                </label>
                <textarea
                  value={editUraian}
                  onChange={(e) => setEditUraian(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium min-h-[70px]"
                  required
                />
              </div>

              {/* Link Bukti */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Link Bukti Dukung
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={editBukti}
                  onChange={(e) => setEditBukti(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">
                  Keterangan Tambahan
                </label>
                <textarea
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all font-medium min-h-[60px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-gov-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add Modal Popup */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative bg-white">
            <BudgetTransactionForm
              selectedDivisi={selectedDivisi}
              sumberDanaList={sumberDanaList}
              currentUser={currentUser}
              isEditor={isEditor}
              showNotification={showNotification}
              onTransactionAdded={() => {
                setIsAddModalOpen(false);
                onTransactionUpdated();
              }}
              onClose={() => setIsAddModalOpen(false)}
              selectedTahun={selectedTahun}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default TransactionList;
