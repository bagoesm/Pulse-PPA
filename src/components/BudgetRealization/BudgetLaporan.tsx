// src/components/BudgetRealization/BudgetLaporan.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetTransaction, MasterSumberDana } from '../../../types';
import { Calendar, Filter, FileSpreadsheet, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import SearchableSelect from '../SearchableSelect';

interface BudgetLaporanProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  refreshTrigger: number;
  selectedTahun: number;
}

const BudgetLaporan: React.FC<BudgetLaporanProps> = ({
  selectedDivisi,
  sumberDanaList,
  refreshTrigger,
  selectedTahun
}) => {
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter parameters
  const [tglAwal, setTglAwal] = useState<string>(`${selectedTahun}-01-01`);
  const [tglAkhir, setTglAkhir] = useState<string>(() => {
    const yr = new Date().getFullYear();
    if (selectedTahun === yr) {
      return new Date().toISOString().slice(0, 10);
    }
    return `${selectedTahun}-12-31`;
  });
  const [selectedSumberDanaId, setSelectedSumberDanaId] = useState<string>('All');
  const [selectedKro, setSelectedKro] = useState<string>('All');

  // Sync date ranges when selectedTahun changes
  useEffect(() => {
    setTglAwal(`${selectedTahun}-01-01`);
    const currentYear = new Date().getFullYear();
    if (selectedTahun === currentYear) {
      setTglAkhir(new Date().toISOString().slice(0, 10));
    } else {
      setTglAkhir(`${selectedTahun}-12-31`);
    }
  }, [selectedTahun]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tglAwal, tglAkhir, selectedSumberDanaId, selectedKro, selectedDivisi]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await budgetService.fetchTransactions(selectedDivisi, selectedTahun);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions for report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi, selectedTahun]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  // Reset filter selections when division context switches
  useEffect(() => {
    setSelectedKro('All');
  }, [selectedDivisi]);

  // Derived filter options for KRO
  const kroOptions = useMemo(() => {
    const kros = new Map<string, string>();
    transactions.forEach(t => {
      if (t.master) {
        kros.set(t.master.kro, t.master.namaKro || t.master.kro);
      }
    });
    return Array.from(kros.entries()).map(([kro, label]) => ({
      value: kro,
      label: `${kro} - ${label}`
    }));
  }, [transactions]);

  // Filter report lists in memory
  const reportData = useMemo(() => {
    return transactions.filter(t => {
      const matchSumberDana = selectedSumberDanaId === 'All' || t.master?.sumberDanaId === selectedSumberDanaId;
      const matchKro = selectedKro === 'All' || t.master?.kro === selectedKro;
      
      const tglStr = t.tanggal; // e.g. "2026-06-15"
      const matchStart = !tglAwal || tglStr >= tglAwal;
      const matchEnd = !tglAkhir || tglStr <= tglAkhir;

      return matchSumberDana && matchKro && matchStart && matchEnd;
    });
  }, [transactions, selectedSumberDanaId, selectedKro, tglAwal, tglAkhir]);

  // Pagination calculations
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReportData = useMemo(() => {
    return reportData.slice(startIndex, endIndex);
  }, [reportData, startIndex, endIndex]);

  const reportTotals = useMemo(() => {
    let realisasi = 0;
    let outstanding = 0;
    reportData.forEach(t => {
      if (t.status === 'Outstanding') {
        outstanding += t.nominal;
      } else {
        realisasi += t.nominal;
      }
    });
    return {
      realisasi,
      outstanding,
      total: realisasi + outstanding
    };
  }, [reportData]);

  // Export to Excel local generator (replaces GAS Drive trigger)
  const exportToExcel = () => {
    try {
      const excelRows = reportData.map((t, idx) => ({
        'No': idx + 1,
        'Tanggal': new Date(t.tanggal).toLocaleDateString('id-ID'),
        'Sumber Dana': t.master?.sumberDana?.name || 'APBN',
        'KRO': t.master?.kro || '',
        'Nama KRO': t.master?.namaKro || '',
        'RO': t.master?.ro || '',
        'Nama RO': t.master?.namaRo || '',
        'Akun': t.master?.akun || '',
        'Nama Akun': t.master?.namaAkun || '',
        'Detail Pagu/Item': t.master?.detail || '',
        'Uraian Rincian': t.uraian,
        'Nominal Belanja': t.nominal,
        'Status Pembayaran': t.status || 'Realisasi',
        'Petugas': t.createdBy,
        'Keterangan': t.keterangan || '-'
      }));

      // Append summaries at the bottom of spreadsheet
      const ws = XLSX.utils.json_to_sheet(excelRows);
      
      // Auto width calculations
      const wscols = [
        { wch: 5 },  // No
        { wch: 12 }, // Tanggal
        { wch: 15 }, // Sumber Dana
        { wch: 8 },  // KRO
        { wch: 25 }, // Nama KRO
        { wch: 8 },  // RO
        { wch: 25 }, // Nama RO
        { wch: 10 }, // Akun
        { wch: 25 }, // Nama Akun
        { wch: 30 }, // Detail Pagu/Item
        { wch: 40 }, // Uraian Rincian
        { wch: 20 }, // Nominal
        { wch: 15 }, // Status
        { wch: 15 }, // Petugas
        { wch: 25 }  // Keterangan
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Realisasi Anggaran');
      
      const fileName = `Laporan_Realisasi_${selectedDivisi.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err: any) {
      console.error('Error exporting report to Excel:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      
      {/* Filters Form Block */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filter Laporan</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" /> Tanggal Awal
            </label>
            <input
              type="date"
              value={tglAwal}
              onChange={(e) => setTglAwal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" /> Tanggal Akhir
            </label>
            <input
              type="date"
              value={tglAkhir}
              onChange={(e) => setTglAkhir(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white"
            />
          </div>

          {/* Sumber Dana */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter size={13} className="text-slate-400" /> Sumber Dana
            </label>
            <SearchableSelect
              options={sumberDanaList.map(sd => ({ value: sd.id, label: sd.name }))}
              value={selectedSumberDanaId === 'All' ? '' : selectedSumberDanaId}
              onChange={(val) => setSelectedSumberDanaId(val || 'All')}
              placeholder="Cari sumber dana..."
              emptyOption="Semua Sumber Dana"
              className="w-full font-semibold"
            />
          </div>

          {/* KRO */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter size={13} className="text-slate-400" /> KRO
            </label>
            <SearchableSelect
              options={kroOptions}
              value={selectedKro === 'All' ? '' : selectedKro}
              onChange={(val) => setSelectedKro(val || 'All')}
              placeholder="Cari KRO..."
              emptyOption="Semua KRO"
              className="w-full font-semibold"
            />
          </div>

        </div>

        {/* Buttons Row */}
        <div className="flex justify-end gap-2 border-t border-slate-100 mt-4 pt-3">
          <button
            onClick={loadTransactions}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-100"
            disabled={reportData.length === 0}
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Reports Listing Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-3 py-3">Sumber Dana</th>
                <th className="px-3 py-3">KRO</th>
                <th className="px-3 py-3">RO</th>
                <th className="px-4 py-3 min-w-[220px]">Detail Uraian Penggunaan</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 text-sm">
                    Memproses laporan...
                  </td>
                </tr>
              ) : paginatedReportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 text-sm">
                    Tidak ditemukan data realisasi yang cocok dengan filter tanggal/KRO.
                  </td>
                </tr>
              ) : (
                paginatedReportData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 font-bold text-sm">
                      {item.master?.sumberDana?.name || 'APBN'}
                    </td>
                    <td className="px-3 py-3.5 text-sm">{item.master?.kro}</td>
                    <td className="px-3 py-3.5 text-sm">{item.master?.ro}</td>
                    <td className="px-4 py-3.5 font-medium break-words">
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">
                          {item.master?.detail || '-'}
                        </span>
                        <span className="block text-xs text-slate-500 font-medium mt-0.5" title={item.uraian}>
                          {item.uraian}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Outstanding' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {item.status || 'Realisasi'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatCurrency(item.nominal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-extrabold text-slate-800">
              <tr>
                <td colSpan={6} className="px-4 py-2 uppercase text-left">Total Realisasi (Terbayar)</td>
                <td className="px-4 py-2 text-right text-emerald-600 font-black text-sm">
                  {formatCurrency(reportTotals.realisasi)}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="px-4 py-2 uppercase text-left">Total Outstanding (Belum Terbayar)</td>
                <td className="px-4 py-2 text-right text-amber-600 font-black text-sm">
                  {formatCurrency(reportTotals.outstanding)}
                </td>
              </tr>
              <tr className="border-t border-slate-200 bg-slate-100">
                <td colSpan={6} className="px-4 py-3.5 uppercase text-left">Total Akumulasi Belanja</td>
                <td className="px-4 py-3.5 text-right text-slate-900 font-black text-sm">
                  {formatCurrency(reportTotals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && reportData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-600">
                Menampilkan <span className="font-semibold">{startIndex + 1}-{Math.min(endIndex, reportData.length)}</span> dari <span className="font-semibold">{reportData.length}</span> item
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
  );
};

export default BudgetLaporan;
