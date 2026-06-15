// src/components/BudgetRealization/BudgetMonitoring.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService } from '../../services/BudgetService';
import { BudgetMaster, BudgetTransaction, MasterSumberDana } from '../../../types';
import { 
  FileDown, 
  Search, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import SearchableSelect from '../SearchableSelect';

interface BudgetMonitoringProps {
  selectedDivisi: string;
  sumberDanaList: MasterSumberDana[];
  currentUser: any;
  refreshTrigger: number;
  showNotification: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

const BudgetMonitoring: React.FC<BudgetMonitoringProps> = ({
  selectedDivisi,
  sumberDanaList,
  refreshTrigger,
  showNotification
}) => {
  const [masters, setMasters] = useState<BudgetMaster[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [selectedSumberDanaId, setSelectedSumberDanaId] = useState<string>('All');
  const [selectedKro, setSelectedKro] = useState<string>('All');
  const [selectedRo, setSelectedRo] = useState<string>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSumberDanaId, selectedKro, selectedRo, selectedDivisi]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mastersData = await budgetService.fetchBudgetMasters(selectedDivisi);
      const trxData = await budgetService.fetchTransactions(selectedDivisi);
      setMasters(mastersData);
      setTransactions(trxData);
    } catch (err) {
      console.error('Error fetching budget monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDivisi]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Reset dependent filters when division changes
  useEffect(() => {
    setSelectedKro('All');
    setSelectedRo('All');
  }, [selectedDivisi]);

  // Real-time computations
  const monitoringData = useMemo(() => {
    const masterRealisasiMap = new Map<string, number>();
    const masterOutstandingMap = new Map<string, number>();

    transactions.forEach(t => {
      if (t.status === 'Outstanding') {
        const current = masterOutstandingMap.get(t.masterId) || 0;
        masterOutstandingMap.set(t.masterId, current + t.nominal);
      } else {
        const current = masterRealisasiMap.get(t.masterId) || 0;
        masterRealisasiMap.set(t.masterId, current + t.nominal);
      }
    });

    return masters.map(m => {
      const realisasi = masterRealisasiMap.get(m.id) || 0;
      const outstanding = masterOutstandingMap.get(m.id) || 0;
      const sisa = m.pagu - realisasi - outstanding;
      const totalBelanja = realisasi + outstanding;
      const persen = m.pagu > 0 ? (totalBelanja / m.pagu) * 100 : 0;
      return {
        ...m,
        realisasi,
        outstanding,
        sisa,
        persen,
        status: sisa < 0 ? 'OVER BUDGET' : 'NORMAL'
      };
    });
  }, [masters, transactions]);

  // Derived filter options
  const filterOptions = useMemo(() => {
    const kros = new Map<string, string>();
    const ros = new Map<string, string>();

    // Filtered by selected sumber dana first to narrow down options
    const stepData = selectedSumberDanaId === 'All' 
      ? monitoringData 
      : monitoringData.filter(d => d.sumberDanaId === selectedSumberDanaId);

    stepData.forEach(d => {
      if (d.kro) kros.set(d.kro, d.namaKro || d.kro);
      if (d.ro) ros.set(d.ro, d.namaRo || d.ro);
    });

    return {
      kros: Array.from(kros.entries()).map(([kro, label]) => ({ value: kro, label: `${kro} - ${label}` })),
      ros: Array.from(ros.entries()).map(([ro, label]) => ({ value: ro, label: `${ro} - ${label}` }))
    };
  }, [monitoringData, selectedSumberDanaId]);

  // Apply all filter sets
  const filteredData = useMemo(() => {
    return monitoringData.filter(item => {
      const matchSearch = search.trim() === '' || 
        item.kro.toLowerCase().includes(search.toLowerCase()) ||
        item.ro.toLowerCase().includes(search.toLowerCase()) ||
        item.akun.toLowerCase().includes(search.toLowerCase()) ||
        item.detail.toLowerCase().includes(search.toLowerCase());

      const matchSumberDana = selectedSumberDanaId === 'All' || item.sumberDanaId === selectedSumberDanaId;
      const matchKro = selectedKro === 'All' || item.kro === selectedKro;
      const matchRo = selectedRo === 'All' || item.ro === selectedRo;

      return matchSearch && matchSumberDana && matchKro && matchRo;
    });
  }, [monitoringData, search, selectedSumberDanaId, selectedKro, selectedRo]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, startIndex, endIndex]);

  // Totals calculations
  const totals = useMemo(() => {
    let pagu = 0;
    let realisasi = 0;
    let outstanding = 0;
    filteredData.forEach(d => {
      pagu += d.pagu;
      realisasi += d.realisasi;
      outstanding += d.outstanding;
    });
    const sisa = pagu - realisasi - outstanding;
    const persen = pagu > 0 ? ((realisasi + outstanding) / pagu) * 100 : 0;
    return { pagu, realisasi, outstanding, sisa, persen };
  }, [filteredData]);

  // Client-side PDF Exporter
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Cover / Header block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LAPORAN MONITORING REALISASI ANGGARAN APBN & HIBAH', 14, 15);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`SATUAN KERJA : ${selectedDivisi.toUpperCase()}`, 14, 21);
      doc.text(`Tanggal Cetak : ${new Date().toLocaleString('id-ID')}`, 14, 26);

      // Map rows for autoTable
      const tableRows = filteredData.map(r => [
        r.sumberDana?.name || 'APBN',
        r.kro,
        r.ro,
        r.akun,
        r.detail,
        'Rp ' + r.pagu.toLocaleString('id-ID'),
        'Rp ' + r.realisasi.toLocaleString('id-ID'),
        'Rp ' + r.outstanding.toLocaleString('id-ID'),
        'Rp ' + r.sisa.toLocaleString('id-ID'),
        r.persen.toFixed(2) + ' %',
        r.status
      ]);

      autoTable(doc, {
        startY: 32,
        head: [['Sumber', 'KRO', 'RO', 'Akun', 'Detail Belanja', 'Pagu', 'Realisasi', 'Outstanding', 'Sisa', 'Serapan', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: '#0f766e', textColor: '#ffffff', fontSize: 8, font: 'Helvetica', fontStyle: 'bold' }, // teal-700
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          4: { cellWidth: 50 }, // Detail Belanja wider
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'right' }
        },
        didDrawPage: (data) => {
          // Footer page number
          const str = 'Halaman ' + doc.getNumberOfPages();
          doc.setFontSize(8);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
      });

      // Add summary boxes below the table
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('RINGKASAN REALISASI:', 14, finalY);
      doc.setFont('Helvetica', 'normal');
      doc.text(`- Total Alokasi Pagu     : Rp ${totals.pagu.toLocaleString('id-ID')}`, 14, finalY + 5);
      doc.text(`- Total Realisasi Belanja: Rp ${totals.realisasi.toLocaleString('id-ID')}`, 14, finalY + 10);
      doc.text(`- Total Outstanding      : Rp ${totals.outstanding.toLocaleString('id-ID')}`, 14, finalY + 15);
      doc.text(`- Sisa Pagu Tersedia    : Rp ${totals.sisa.toLocaleString('id-ID')}`, 14, finalY + 20);
      doc.text(`- Persentase Serapan    : ${totals.persen.toFixed(2)} %`, 14, finalY + 25);

      // Save PDF
      doc.save(`Monitoring_Anggaran_${selectedDivisi.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
      showNotification('PDF Berhasil Diunduh!', 'Laporan realisasi anggaran berhasil diexport ke PDF.', 'success');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showNotification('Gagal Export PDF', err.message || 'Terjadi kesalahan saat membuat file PDF.', 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Text Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari KRO, RO, Akun, atau Detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 focus:bg-white transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 self-end lg:self-auto">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
              disabled={filteredData.length === 0}
            >
              <FileDown size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Segmented selectors row */}
        <div className="flex flex-wrap gap-3 items-center text-xs font-semibold border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Filter size={14} />
            <span>Filter:</span>
          </div>

          {/* Sumber Dana */}
          <SearchableSelect
            options={sumberDanaList.map(sd => ({ value: sd.id, label: sd.name }))}
            value={selectedSumberDanaId === 'All' ? '' : selectedSumberDanaId}
            onChange={(val) => setSelectedSumberDanaId(val || 'All')}
            placeholder="Cari sumber dana..."
            emptyOption="Semua Sumber Dana"
            className="w-48"
          />

          {/* KRO Select */}
          <SearchableSelect
            options={filterOptions.kros}
            value={selectedKro === 'All' ? '' : selectedKro}
            onChange={(val) => setSelectedKro(val || 'All')}
            placeholder="Cari KRO..."
            emptyOption="Semua KRO"
            className="w-56"
          />

          {/* RO Select */}
          <SearchableSelect
            options={filterOptions.ros}
            value={selectedRo === 'All' ? '' : selectedRo}
            onChange={(val) => setSelectedRo(val || 'All')}
            placeholder="Cari RO..."
            emptyOption="Semua RO"
            className="w-56"
          />
        </div>
      </div>

      {/* Main KPI Totals Summary */}
      <div className="bg-teal-700 text-white rounded-xl p-5 border border-teal-800 shadow-md flex flex-wrap justify-between items-center gap-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider opacity-80">Total Ringkasan Terfilter</span>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-1">
            <div>
              <span className="text-slate-200 text-xs">Pagu:</span>
              <span className="font-extrabold ml-1.5">{formatCurrency(totals.pagu)}</span>
            </div>
            <div>
              <span className="text-slate-200 text-xs">Realisasi:</span>
              <span className="font-extrabold text-emerald-300 ml-1.5">{formatCurrency(totals.realisasi)}</span>
            </div>
            <div>
              <span className="text-slate-200 text-xs">Outstanding:</span>
              <span className="font-extrabold text-amber-300 ml-1.5">{formatCurrency(totals.outstanding)}</span>
            </div>
            <div>
              <span className="text-slate-200 text-xs">Sisa:</span>
              <span className={`font-extrabold ml-1.5 ${totals.sisa < 0 ? 'text-red-300' : 'text-slate-100'}`}>
                {formatCurrency(totals.sisa)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-2">
          <span className="text-xs font-semibold">Total Serapan:</span>
          <span className="text-lg font-black text-emerald-300">{totals.persen.toFixed(2)}%</span>
        </div>
      </div>

      {/* Monitoring Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Sumber</th>
                <th className="px-3.5 py-3.5">KRO</th>
                <th className="px-3.5 py-3.5">RO</th>
                <th className="px-3.5 py-3.5">Akun</th>
                <th className="px-4 py-3.5 min-w-[200px]">Detail Belanja</th>
                <th className="px-4 py-3.5 text-right">Pagu</th>
                <th className="px-4 py-3.5 text-right">Realisasi</th>
                <th className="px-4 py-3.5 text-right">Outstanding</th>
                <th className="px-4 py-3.5 text-right">Sisa</th>
                <th className="px-4 py-3.5 text-right">Serapan</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-20">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-gov-600 rounded-full animate-spin"></div>
                    </div>
                    <span className="text-slate-400">Memuat data monitoring...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-20 text-slate-400">
                    Tidak ada data anggaran belanja yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const isOver = item.sisa < 0;
                  const isZero = item.sisa === 0;
                  const isUnder = item.sisa > 0;
                  const hasBelanja = (item.realisasi + item.outstanding) > 0;
                  
                  let cellBg = '';
                  let hoverBg = 'group-hover:bg-slate-50/50';
                  let textCol = 'text-slate-700';

                  if (isOver) {
                    cellBg = 'bg-red-50/60';
                    textCol = 'text-red-900';
                    hoverBg = 'group-hover:bg-red-100/50';
                  } else if (isZero) {
                    cellBg = 'bg-emerald-50/60';
                    textCol = 'text-emerald-900';
                    hoverBg = 'group-hover:bg-emerald-100/50';
                  } else if (isUnder && hasBelanja) {
                    cellBg = 'bg-blue-50/60';
                    textCol = 'text-blue-900';
                    hoverBg = 'group-hover:bg-blue-100/50';
                  }

                  return (
                    <tr key={item.id} className="group transition-colors">
                      <td className={`px-4 py-3.5 font-bold text-slate-500 ${cellBg} ${hoverBg} transition-colors`}>
                        {item.sumberDana?.name || 'APBN'}
                      </td>
                      <td className={`px-3 py-3.5 ${textCol} ${cellBg} ${hoverBg} transition-colors`}>{item.kro}</td>
                      <td className={`px-3 py-3.5 ${textCol} ${cellBg} ${hoverBg} transition-colors`}>{item.ro}</td>
                      <td className={`px-3 py-3.5 font-semibold text-slate-600 ${cellBg} ${hoverBg} transition-colors`}>{item.akun}</td>
                      <td className={`px-4 py-3.5 max-w-[280px] break-words ${textCol} ${cellBg} ${hoverBg} transition-colors`}>{item.detail}</td>
                      <td className={`px-4 py-3.5 text-right font-semibold text-slate-900 ${cellBg} ${hoverBg} transition-colors`}>
                        {formatCurrency(item.pagu)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold ${hasBelanja ? 'text-emerald-600' : 'text-slate-400'} ${cellBg} ${hoverBg} transition-colors`}>
                        {formatCurrency(item.realisasi)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold ${hasBelanja ? 'text-amber-600' : 'text-slate-400'} ${cellBg} ${hoverBg} transition-colors`}>
                        {formatCurrency(item.outstanding)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-extrabold ${cellBg} ${hoverBg} transition-colors ${
                        isOver ? 'text-red-600' : isZero ? 'text-emerald-600' : hasBelanja ? 'text-blue-600' : 'text-slate-700'
                      }`}>
                        {formatCurrency(item.sisa)}
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold text-gov-700 ${cellBg} ${hoverBg} transition-colors`}>
                        {item.persen.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-3.5 text-center ${cellBg} ${hoverBg} transition-colors`}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block shadow-sm ${
                          isOver 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : isZero 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : hasBelanja 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isOver ? 'OVER' : isZero ? 'HABIS' : 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-600">
                Menampilkan <span className="font-semibold">{startIndex + 1}-{Math.min(endIndex, filteredData.length)}</span> dari <span className="font-semibold">{filteredData.length}</span> item
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

export default BudgetMonitoring;
