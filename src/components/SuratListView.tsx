// src/components/SuratListView.tsx
import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, Building2,
  X, Search, FileDown, Link2, Eye, Plus,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, Clock, AlertCircle, Users
} from 'lucide-react';
import { Surat, User } from '../../types';
import AddSuratModal from './AddSuratModal';
import SuratViewModal from './SuratViewModal';
import SearchableSelect from './SearchableSelect';
import { useSurats } from '../contexts/SuratsContext';
import { useUsers } from '../contexts/UsersContext';
import { useMeetings } from '../contexts/MeetingsContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SuratListViewProps {
  currentUser: User | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const SuratListView: React.FC<SuratListViewProps> = ({ currentUser, showNotification }) => {
  const { surats, fetchSurats, unlinkFromKegiatan } = useSurats();
  const { allUsers } = useUsers();
  const { meetings } = useMeetings();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenisSurat, setFilterJenisSurat] = useState<'All' | 'Masuk' | 'Keluar'>('All');
  const [filterJenisNaskah, setFilterJenisNaskah] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDisposisiStatus, setFilterDisposisiStatus] = useState<'All' | 'Pending' | 'In Progress' | 'Completed' | 'Mixed'>('All');
  const [filterHasDisposisi, setFilterHasDisposisi] = useState<boolean | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddSuratModal, setShowAddSuratModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Sort states
  const [sortColumn, setSortColumn] = useState<'tanggalSurat' | 'nomorSurat' | 'jenisSurat' | 'jenisNaskah' | 'hal' | 'asalTujuan' | 'tanggalKegiatan'>('tanggalSurat');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Export modal states
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportJenisSurat, setExportJenisSurat] = useState<'All' | 'Masuk' | 'Keluar'>('All');

  // Helper function to get meeting date from linked meeting
  const getKegiatanDate = (surat: Surat): string | null => {
    if (!surat.meetingId) return null;
    const meeting = meetings.find(m => m.id === surat.meetingId);
    return meeting?.date || null;
  };

  // Helper function to get meeting title from linked meeting
  const getKegiatanTitle = (surat: Surat): string | null => {
    if (!surat.meetingId) return null;
    const meeting = meetings.find(m => m.id === surat.meetingId);
    return meeting?.title || null;
  };
  const [exportJenisNaskah, setExportJenisNaskah] = useState<string>('All');

  // Apply filters and sort
  const filteredSurats = useMemo(() => {
    const filtered = surats.filter(surat => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        surat.nomorSurat.toLowerCase().includes(searchLower) ||
        surat.hal?.toLowerCase().includes(searchLower) ||
        surat.asalSurat?.toLowerCase().includes(searchLower) ||
        surat.tujuanSurat?.toLowerCase().includes(searchLower);

      // Jenis Surat filter
      const matchesJenisSurat = filterJenisSurat === 'All' || surat.jenisSurat === filterJenisSurat;

      // Jenis Naskah filter
      const matchesJenisNaskah = filterJenisNaskah === 'All' || surat.jenisNaskah === filterJenisNaskah;

      // Date range filter (based on tanggalSurat)
      let matchesDateRange = true;
      if (filterStartDate || filterEndDate) {
        const suratDate = surat.tanggalSurat ? new Date(surat.tanggalSurat) : null;
        if (suratDate) {
          if (filterStartDate) {
            const startDate = new Date(filterStartDate);
            startDate.setHours(0, 0, 0, 0);
            if (suratDate < startDate) matchesDateRange = false;
          }
          if (filterEndDate) {
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (suratDate > endDate) matchesDateRange = false;
          }
        } else {
          matchesDateRange = false; // Exclude if no date
        }
      }

      // Disposisi status filter
      const matchesDisposisiStatus = filterDisposisiStatus === 'All' || surat.disposisiStatus === filterDisposisiStatus;

      // Has Disposisi filter
      let matchesHasDisposisi = true;
      if (filterHasDisposisi !== null) {
        matchesHasDisposisi = filterHasDisposisi ? (surat.hasDisposisi === true) : (surat.hasDisposisi !== true);
      }

      return matchesSearch && matchesJenisSurat && matchesJenisNaskah && matchesDateRange && matchesDisposisiStatus && matchesHasDisposisi;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortColumn) {
        case 'tanggalSurat':
          compareA = a.tanggalSurat ? new Date(a.tanggalSurat).getTime() : 0;
          compareB = b.tanggalSurat ? new Date(b.tanggalSurat).getTime() : 0;
          break;
        case 'nomorSurat':
          compareA = a.nomorSurat.toLowerCase();
          compareB = b.nomorSurat.toLowerCase();
          break;
        case 'jenisSurat':
          compareA = a.jenisSurat || '';
          compareB = b.jenisSurat || '';
          break;
        case 'jenisNaskah':
          compareA = a.jenisNaskah?.toLowerCase() || '';
          compareB = b.jenisNaskah?.toLowerCase() || '';
          break;
        case 'hal':
          compareA = a.hal?.toLowerCase() || '';
          compareB = b.hal?.toLowerCase() || '';
          break;
        case 'asalTujuan':
          compareA = (a.jenisSurat === 'Masuk' ? a.asalSurat : a.tujuanSurat)?.toLowerCase() || '';
          compareB = (b.jenisSurat === 'Masuk' ? b.asalSurat : b.tujuanSurat)?.toLowerCase() || '';
          break;
        case 'tanggalKegiatan':
          compareA = a.tanggalKegiatan ? new Date(a.tanggalKegiatan).getTime() : 0;
          compareB = b.tanggalKegiatan ? new Date(b.tanggalKegiatan).getTime() : 0;
          break;
        default:
          compareA = 0;
          compareB = 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [surats, searchQuery, filterJenisSurat, filterJenisNaskah, filterStartDate, filterEndDate, filterDisposisiStatus, filterHasDisposisi, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSurats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSurats = filteredSurats.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filterJenisSurat, filterJenisNaskah, filterStartDate, filterEndDate, filterDisposisiStatus, filterHasDisposisi]);

  // Prepare URLs for display - use existing URLs without refresh to avoid 404 errors
  const displayUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    
    surats.forEach(surat => {
      if (surat.fileSurat?.url) {
        urls[surat.id] = surat.fileSurat.url;
      }
    });
    
    return urls;
  }, [surats]);

  // Get unique jenis naskah for filter
  const jenisNaskahOptions = useMemo(() => {
    const options = new Set<string>();
    surats.forEach(s => {
      if (s.jenisNaskah) options.add(s.jenisNaskah);
    });
    return Array.from(options).sort();
  }, [surats]);

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Helper function to apply export filters (avoid duplication)
  const getFilteredExportData = () => {
    let dataToExport = surats;

    // Filter by jenis surat
    if (exportJenisSurat !== 'All') {
      dataToExport = dataToExport.filter(s => s.jenisSurat === exportJenisSurat);
    }

    // Filter by jenis naskah
    if (exportJenisNaskah !== 'All') {
      dataToExport = dataToExport.filter(s => s.jenisNaskah === exportJenisNaskah);
    }

    // Filter by date range
    if (exportStartDate || exportEndDate) {
      dataToExport = dataToExport.filter(surat => {
        const suratDate = surat.tanggalSurat ? new Date(surat.tanggalSurat) : null;
        if (!suratDate) return false;

        if (exportStartDate) {
          const startDate = new Date(exportStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (suratDate < startDate) return false;
        }
        if (exportEndDate) {
          const endDate = new Date(exportEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (suratDate > endDate) return false;
        }
        return true;
      });
    }

    return dataToExport;
  };

  // Helper function to prepare data for export (avoid duplication)
  const prepareExportData = (dataToExport: Surat[]) => {
    return dataToExport.map(surat => ({
      'Jenis Surat': surat.jenisSurat || '-',
      'Nomor Surat': surat.nomorSurat || '-',
      'Tanggal Surat': surat.tanggalSurat ? new Date(surat.tanggalSurat).toLocaleDateString('id-ID') : '-',
      'Jenis Naskah': surat.jenisNaskah || '-',
      'Hal/Perihal': surat.hal || '-',
      'Asal Surat': surat.jenisSurat === 'Masuk' ? (surat.asalSurat || '-') : '-',
      'Tujuan Surat': surat.jenisSurat === 'Keluar' ? (surat.tujuanSurat || '-') : '-',
      'Klasifikasi': surat.klasifikasiSurat || '-',
      'Sifat Surat': surat.sifatSurat || '-',
      'Bidang Tugas': surat.bidangTugas || '-',
      'Tanggal Diterima': surat.tanggalDiterima ? new Date(surat.tanggalDiterima).toLocaleDateString('id-ID') : '-',
      'Tanggal Dikirim': surat.tanggalDikirim ? new Date(surat.tanggalDikirim).toLocaleDateString('id-ID') : '-',
      'Tanggal Kegiatan': getKegiatanDate(surat) ? new Date(getKegiatanDate(surat)!).toLocaleDateString('id-ID') : '-',
      'Judul Kegiatan': getKegiatanTitle(surat) || '-',
      'Ada Disposisi': surat.hasDisposisi ? 'Ya' : 'Tidak',
      'Jumlah Disposisi': surat.hasDisposisi ? (surat.disposisiCount || 0).toString() : '0',
      'Status Disposisi': surat.disposisiStatus || '-',
      'File Surat': surat.fileSurat ? (surat.fileSurat.isLink ? surat.fileSurat.url : surat.fileSurat.name) : '-',
      'Dibuat Oleh': surat.createdBy,
      'Tanggal Dibuat': new Date(surat.createdAt).toLocaleDateString('id-ID')
    }));
  };

  const handleExportExcel = () => {
    const dataToExport = getFilteredExportData();
    const data = prepareExportData(dataToExport);

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Surat');

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Jenis Surat
      { wch: 25 }, // Nomor Surat
      { wch: 15 }, // Tanggal Surat
      { wch: 20 }, // Jenis Naskah
      { wch: 40 }, // Hal/Perihal
      { wch: 30 }, // Asal Surat
      { wch: 30 }, // Tujuan Surat
      { wch: 15 }, // Klasifikasi
      { wch: 15 }, // Sifat Surat
      { wch: 20 }, // Bidang Tugas
      { wch: 15 }, // Tanggal Diterima
      { wch: 15 }, // Tanggal Dikirim
      { wch: 40 }, // Disposisi
      { wch: 40 }, // Hasil Tindak Lanjut
      { wch: 15 }, // Tanggal Kegiatan
      { wch: 15 }, // Ada Disposisi
      { wch: 15 }, // Jumlah Disposisi
      { wch: 15 }, // Status Disposisi
      { wch: 40 }, // File Surat
      { wch: 20 }, // Dibuat Oleh
      { wch: 15 }  // Tanggal Dibuat
    ];
    ws['!cols'] = colWidths;

    // Download Excel file
    XLSX.writeFile(wb, `Daftar_Surat_${new Date().toISOString().split('T')[0]}.xlsx`);

    // Close modal
    setShowExportModal(false);
    showNotification('Export Berhasil', `${data.length} surat berhasil di-export ke Excel`, 'success');
  };

  const handleExportPDF = () => {
    // Use helper function to get filtered data
    const dataToExport = getFilteredExportData();

    // Create PDF
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(16);
    doc.text('Daftar Surat', 14, 15);
    
    // Add export info
    doc.setFontSize(10);
    doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    doc.text(`Total Data: ${dataToExport.length} surat`, 14, 27);

    // Prepare table data
    const tableData = dataToExport.map(surat => [
      surat.jenisSurat || '-',
      surat.nomorSurat || '-',
      surat.tanggalSurat ? new Date(surat.tanggalSurat).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
      surat.jenisNaskah || '-',
      surat.hal || '-',
      surat.jenisSurat === 'Masuk' ? (surat.asalSurat || '-') : (surat.tujuanSurat || '-'),
      getKegiatanDate(surat) ? new Date(getKegiatanDate(surat)!).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
      surat.hasDisposisi ? `${surat.disposisiCount || 0}` : '0',
      surat.disposisiStatus || '-'
    ]);

    // Add table
    autoTable(doc, {
      startY: 32,
      head: [['Jenis', 'Nomor Surat', 'Tgl Surat', 'Jenis Naskah', 'Hal/Perihal', 'Asal/Tujuan', 'Tgl Kegiatan', 'Jml Disp', 'Status Disp']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28 },
        4: { cellWidth: 50 },
        5: { cellWidth: 45 },
        6: { cellWidth: 22 },
        7: { cellWidth: 18 },
        8: { cellWidth: 25 }
      },
      margin: { left: 14, right: 14 }
    });

    // Download PDF
    doc.save(`Daftar_Surat_${new Date().toISOString().split('T')[0]}.pdf`);

    // Close modal
    setShowExportModal(false);
    showNotification('Export Berhasil', `${dataToExport.length} surat berhasil di-export ke PDF`, 'success');
  };

  const clearDateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: typeof sortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-gov-600" />
      : <ArrowDown size={14} className="text-gov-600" />;
  };

  const handleViewSurat = (surat: Surat) => {
    setSelectedSurat(surat);
    setShowViewModal(true);
  };

  const handleDeleteSurat = async (id: string) => {
    try {
      // Import cleanup utilities dynamically
      const { getDisposisiForSurat, formatDisposisiWarning, deleteSuratWithCleanup } = await import('../utils/disposisiCleanup');
      
      // Get related Disposisi to show warning
      const relatedDisposisi = await getDisposisiForSurat(id);
      const warning = formatDisposisiWarning(relatedDisposisi);
      
      // Find the surat to get its number for the confirmation message
      const surat = surats.find(s => s.id === id);
      const suratNumber = surat?.nomorSurat || 'ini';
      
      // Show confirmation dialog with Disposisi warning
      const confirmMessage = `Hapus surat ${suratNumber}? Tindakan ini tidak dapat dibatalkan.${warning}`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      // Delete with cleanup
      await deleteSuratWithCleanup(id);
      
      showNotification('Surat Dihapus', 'Surat dan disposisi terkait berhasil dihapus', 'success');
      fetchSurats();
    } catch (error: any) {
      showNotification('Gagal Hapus Surat', error.message, 'error');
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Daftar Surat</h2>
          <p className="text-sm text-slate-500 mt-1">
            Menampilkan {filteredSurats.length} dari {surats.length} surat
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddSuratModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            Tambah Surat
          </button>
          <button
            onClick={handleExportClick}
            disabled={surats.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
          >
            <FileDown size={18} />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 xl:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cari Surat</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nomor surat, perihal, asal..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Jenis Surat Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Jenis Surat</label>
            <select
              value={filterJenisSurat}
              onChange={(e) => setFilterJenisSurat(e.target.value as any)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm bg-white"
            >
              <option value="All">Semua Jenis</option>
              <option value="Masuk">Surat Masuk</option>
              <option value="Keluar">Surat Keluar</option>
            </select>
          </div>

          {/* Jenis Naskah Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Jenis Naskah</label>
            <SearchableSelect
              options={jenisNaskahOptions.map(jenis => ({ value: jenis, label: jenis }))}
              value={filterJenisNaskah === 'All' ? '' : filterJenisNaskah}
              onChange={(value) => setFilterJenisNaskah(value || 'All')}
              placeholder="Cari jenis naskah..."
              emptyOption="Semua Naskah"
            />
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dari Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={clearDateFilters}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  title="Hapus filter tanggal"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Second row for Disposisi filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200">
          {/* Disposisi Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status Disposisi</label>
            <SearchableSelect
              options={[
                { value: 'All', label: '📋 Semua Status' },
                { value: 'Pending', label: '⏳ Pending' },
                { value: 'In Progress', label: '🔄 In Progress' },
                { value: 'Completed', label: '✅ Completed' },
                { value: 'Mixed', label: '🔀 Mixed' }
              ]}
              value={filterDisposisiStatus === 'All' ? '' : filterDisposisiStatus}
              onChange={(value) => setFilterDisposisiStatus((value || 'All') as any)}
              placeholder="Cari status..."
              emptyOption="📋 Semua Status"
            />
          </div>

          {/* Has Disposisi Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Filter Disposisi</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterHasDisposisi(filterHasDisposisi === true ? null : true)}
                className={`flex-1 px-3 py-2.5 border rounded-lg transition-colors text-sm font-medium ${
                  filterHasDisposisi === true
                    ? 'bg-gov-600 text-white border-gov-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Ada Disposisi
              </button>
              <button
                onClick={() => setFilterHasDisposisi(filterHasDisposisi === false ? null : false)}
                className={`flex-1 px-3 py-2.5 border rounded-lg transition-colors text-sm font-medium ${
                  filterHasDisposisi === false
                    ? 'bg-gov-600 text-white border-gov-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Tanpa Disposisi
              </button>
            </div>
          </div>

          {/* Clear all filters button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterJenisSurat('All');
                setFilterJenisNaskah('All');
                setFilterStartDate('');
                setFilterEndDate('');
                setFilterDisposisiStatus('All');
                setFilterHasDisposisi(null);
              }}
              className="w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              Reset Semua Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 text-left min-w-[100px]">
                  <button
                    onClick={() => handleSort('jenisSurat')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Jenis
                    {getSortIcon('jenisSurat')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[150px]">
                  <button
                    onClick={() => handleSort('nomorSurat')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Nomor Surat
                    {getSortIcon('nomorSurat')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('jenisNaskah')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Jenis Naskah
                    {getSortIcon('jenisNaskah')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('tanggalSurat')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Tanggal
                    {getSortIcon('tanggalSurat')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[200px]">
                  <button
                    onClick={() => handleSort('hal')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Hal/Perihal
                    {getSortIcon('hal')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[180px]">
                  <button
                    onClick={() => handleSort('asalTujuan')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Asal/Tujuan
                    {getSortIcon('asalTujuan')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('tanggalKegiatan')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Kegiatan
                    {getSortIcon('tanggalKegiatan')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[140px]">Disposisi</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-24">Dokumen</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSurats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <FileText size={56} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-base font-medium text-slate-600 mb-1">Tidak ada surat ditemukan</p>
                    <p className="text-sm text-slate-400">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : (
                paginatedSurats.map(surat => {
                  return (
                    <tr key={surat.id} className="hover:bg-slate-50 transition-colors">
                      {/* Jenis Surat */}
                      <td className="px-4 py-4">
                          <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${
                            surat.jenisSurat === 'Masuk' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {surat.jenisSurat}
                          </span>
                        </td>

                        {/* Nomor Surat */}
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-slate-800">
                            {surat.nomorSurat}
                          </span>
                        </td>

                        {/* Jenis Naskah */}
                        <td className="px-4 py-4">
                          {surat.jenisNaskah ? (
                            <span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded inline-block">
                              {surat.jenisNaskah}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Tanggal Surat */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-700">
                              {new Date(surat.tanggalSurat).toLocaleDateString('id-ID', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Hal/Perihal */}
                        <td className="px-4 py-4">
                          <span 
                            className="text-sm text-slate-700 block truncate max-w-xs cursor-help" 
                            title={surat.hal || '-'}
                          >
                            {surat.hal || '-'}
                          </span>
                        </td>

                        {/* Asal/Tujuan Surat */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <span className="text-sm text-slate-700 line-clamp-2">
                              {surat.jenisSurat === 'Keluar' 
                                ? (surat.tujuanSurat || '-')
                                : (surat.asalSurat || '-')
                              }
                            </span>
                          </div>
                        </td>

                        {/* Kegiatan */}
                        <td className="px-4 py-4">
                          {getKegiatanDate(surat) ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-slate-700">
                                {new Date(getKegiatanDate(surat)!).toLocaleDateString('id-ID', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              {getKegiatanTitle(surat) && (
                                <span className="text-xs text-slate-500 truncate max-w-[150px]" title={getKegiatanTitle(surat)!}>
                                  {getKegiatanTitle(surat)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tidak ada</span>
                          )}
                        </td>

                        {/* Disposisi */}
                        <td className="px-4 py-4">
                          {surat.hasDisposisi ? (
                            <div className="flex items-center justify-center gap-2">
                              {/* Disposisi Count Badge */}
                              <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                                <Users size={14} />
                                <span className="text-xs font-semibold">{surat.disposisiCount || 0}</span>
                              </div>
                              
                              {/* Disposisi Status Badge */}
                              {surat.disposisiStatus && (
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  surat.disposisiStatus === 'Completed' 
                                    ? 'bg-green-100 text-green-700' 
                                    : surat.disposisiStatus === 'In Progress'
                                    ? 'bg-blue-100 text-blue-700'
                                    : surat.disposisiStatus === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {surat.disposisiStatus === 'Completed' && <CheckCircle2 size={12} />}
                                  {surat.disposisiStatus === 'In Progress' && <Clock size={12} />}
                                  {surat.disposisiStatus === 'Pending' && <AlertCircle size={12} />}
                                  {surat.disposisiStatus === 'Mixed' && <Users size={12} />}
                                  {surat.disposisiStatus}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">-</span>
                          )}
                        </td>

                        {/* Dokumen */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {surat.fileSurat && (
                              <a
                                href={displayUrls[surat.id] || surat.fileSurat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gov-50 rounded-lg text-gov-600 transition-colors"
                                title="File Surat"
                              >
                                {surat.fileSurat.isLink ? <Link2 size={16} /> : <FileText size={16} />}
                              </a>
                            )}
                            {!surat.fileSurat && (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleViewSurat(surat)}
                              className="p-2 hover:bg-gov-50 rounded-lg text-gov-600 transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
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
      {filteredSurats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 font-medium">Tampilkan:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-600">
                dari {filteredSurats.length} surat
              </span>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Halaman {currentPage} dari {totalPages}
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

            {/* Showing range */}
            <div className="text-sm text-slate-600">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredSurats.length)} surat
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileDown size={24} />
                  <h3 className="text-xl font-bold">Export Data Surat</h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Pilih filter untuk data yang ingin di-export. Kosongkan untuk export semua data.
              </p>

              {/* Date Range */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Rentang Tanggal Surat</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Dari Tanggal</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Jenis Surat */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Surat</label>
                <select
                  value={exportJenisSurat}
                  onChange={(e) => setExportJenisSurat(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm bg-white"
                >
                  <option value="All">Semua Jenis Surat</option>
                  <option value="Masuk">Surat Masuk</option>
                  <option value="Keluar">Surat Keluar</option>
                </select>
              </div>

              {/* Jenis Naskah */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Naskah</label>
                <select
                  value={exportJenisNaskah}
                  onChange={(e) => setExportJenisNaskah(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm bg-white"
                >
                  <option value="All">Semua Jenis Naskah</option>
                  {jenisNaskahOptions.map(jenis => (
                    <option key={jenis} value={jenis}>{jenis}</option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Total data yang akan di-export:</span> {
                    surats.filter(s => {
                      let matches = true;
                      if (exportJenisSurat !== 'All') matches = matches && s.jenisSurat === exportJenisSurat;
                      if (exportJenisNaskah !== 'All') matches = matches && s.jenisNaskah === exportJenisNaskah;
                      if (exportStartDate || exportEndDate) {
                        const suratDate = s.tanggalSurat ? new Date(s.tanggalSurat) : null;
                        if (!suratDate) return false;
                        if (exportStartDate && suratDate < new Date(exportStartDate)) return false;
                        if (exportEndDate && suratDate > new Date(exportEndDate)) return false;
                      }
                      return matches;
                    }).length
                  } surat
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200">
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleExportExcel}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileDown size={18} />
                  Export ke Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileText size={18} />
                  Export ke PDF
                </button>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Surat Modal */}
      {/* Add Surat Modal */}
      <AddSuratModal
        isOpen={showAddSuratModal}
        onClose={() => setShowAddSuratModal(false)}
        onSave={() => {
          fetchSurats();
          setShowAddSuratModal(false);
        }}
        currentUserName={currentUser?.name || 'Unknown'}
        currentUser={currentUser}
        showNotification={showNotification}
      />

      {/* View/Edit Surat Modal */}
      <SuratViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedSurat(null);
        }}
        surat={selectedSurat}
        onUpdate={() => {
          fetchSurats();
        }}
        onDelete={handleDeleteSurat}
        currentUserName={currentUser?.name || 'Unknown'}
        currentUser={currentUser}
        users={allUsers}
        showNotification={showNotification}
        onUnlinkFromKegiatan={unlinkFromKegiatan}
      />
    </div>
  );
};

export default SuratListView;
