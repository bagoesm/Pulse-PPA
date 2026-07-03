// src/components/InventoriBMNPage.tsx
// Main page container for BMN (Barang Milik Negara) Inventory Management
// Validates: Requirements 1.2, 2.1, 6.1, 15.7

import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, List, AlertCircle, Plus, Users, Filter, ChevronDown, ChevronUp, Laptop, Settings } from 'lucide-react';
import { BMNProvider, useBMN } from '../contexts/BMNContext';
import { useAuth } from '../contexts/AuthContext';
import BMNDashboard from './BMNDashboard';
import BMNTable from './BMNTable';
import BMNFilterPanel from './BMNFilterPanel';
import BMNUploadModal from './BMNUploadModal';
import BMNHistoryModal from './BMNHistoryModal';
import BMNFormModal from './BMNFormModal';
import BMNEditorManager from './BMNEditorManager';
import BMNDevicesList from './BMNDevicesList';
import ErrorBoundary from './ErrorBoundary';
import { useBMNFilters } from '../hooks/useBMNFilters';
import { useBMNSearch } from '../hooks/useBMNSearch';
import { useBMNHandlers } from '../hooks/useBMNHandlers';
import { supabase } from '../lib/supabaseClient';
import { BMNItem } from '../../types';

type TabView = 'Dashboard' | 'List' | 'Devices' | 'Editors';

/**
 * BMN Detail Modal - Shows complete information for a single BMN item
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
interface BMNDetailModalProps {
  item: BMNItem;
  onClose: () => void;
  onEdit: () => void;
  isEditor: boolean;
}

const BMNDetailModal: React.FC<BMNDetailModalProps> = ({ item, onClose, onEdit, isEditor }) => {
  // Format currency with Indonesian thousand separators
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Format date in Indonesian format (DD/MM/YYYY)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format umur aset - HANYA dari Excel, tidak dihitung
  const formatUmurAset = (item: BMNItem): string => {
    // Hanya gunakan umurAset dari Excel
    if (item.umurAset !== undefined && item.umurAset !== null) {
      return `${item.umurAset} tahun`;
    }
    // Jika tidak ada di Excel, tampilkan "-"
    return '-';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Detail BMN</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Informasi Umum */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                Informasi Umum
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Barang</label>
                  <p className="text-sm font-mono text-slate-800 bg-slate-100 px-3 py-2 rounded mt-1">{item.kodeBarang}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Barang</label>
                  <p className="text-sm text-slate-800 font-semibold mt-1">{item.namaBarang}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis BMN</label>
                  <p className="text-sm text-slate-800 mt-1">{item.jenisBMN || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Merk</label>
                  <p className="text-sm text-slate-800 mt-1">{item.merk || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe</label>
                  <p className="text-sm text-slate-800 mt-1">{item.tipe || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah</label>
                  <p className="text-sm text-slate-800 mt-1">{item.jumlah || '-'} {item.satuan || ''}</p>
                </div>
              </div>
            </div>

            {/* Status dan Kondisi */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                Status dan Kondisi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status BMN</label>
                  <p className="text-sm text-slate-800 mt-1">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                      item.statusBMN === 'Aktif' ? 'bg-green-100 text-green-700' :
                      item.statusBMN === 'Tidak Aktif' ? 'bg-slate-100 text-slate-700' :
                      item.statusBMN === 'Hilang' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {item.statusBMN}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kondisi</label>
                  <p className="text-sm text-slate-800 mt-1">
                    {item.kondisi ? (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        item.kondisi === 'Baik' ? 'bg-green-100 text-green-700' :
                        item.kondisi === 'Rusak Ringan' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.kondisi}
                      </span>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pemegang Barang</label>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {item.holder?.name ? (
                      <span className="text-gov-600 font-bold">{item.holder.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Belum Ditugaskan</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Nilai dan Keuangan */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                Nilai dan Keuangan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Perolehan</label>
                  <p className="text-sm text-slate-800 font-bold mt-1">{formatCurrency(item.nilaiPerolehan)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun Perolehan</label>
                  <p className="text-sm text-slate-800 mt-1">{item.tahunPerolehan || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Perolehan</label>
                  <p className="text-sm text-slate-800 mt-1">{formatDate(item.tanggalPerolehan)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Umur Aset</label>
                  <p className="text-sm text-slate-800 mt-1">{formatUmurAset(item)}</p>
                </div>
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                Lokasi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Satker</label>
                  <p className="text-sm text-slate-800 mt-1">{item.namaSatker || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alamat</label>
                  <p className="text-sm text-slate-800 mt-1">{item.alamat || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kota</label>
                  <p className="text-sm text-slate-800 mt-1">{item.kota || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provinsi</label>
                  <p className="text-sm text-slate-800 mt-1">{item.provinsi || '-'}</p>
                </div>
                {item.luas && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Luas</label>
                    <p className="text-sm text-slate-800 mt-1">{item.luas} m²</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dokumen */}
            {(item.nup || item.nomorRegister || item.nomorSertifikat || item.tanggalSertifikat) && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                  Dokumen / Registrasi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.nup && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NUP (Nomor Urut Pendaftaran)</label>
                      <p className="text-sm text-slate-800 mt-1">{item.nup}</p>
                    </div>
                  )}
                  {item.nomorRegister && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nomor Register</label>
                      <p className="text-sm text-slate-800 mt-1">{item.nomorRegister}</p>
                    </div>
                  )}
                  {item.nomorSertifikat && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nomor Sertifikat</label>
                      <p className="text-sm text-slate-800 mt-1">{item.nomorSertifikat}</p>
                    </div>
                  )}
                  {item.tanggalSertifikat && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Sertifikat</label>
                      <p className="text-sm text-slate-800 mt-1">{formatDate(item.tanggalSertifikat)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pengapusan */}
            {(item.tanggalPengapusan || item.alasanPengapusan) && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                  Pengapusan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {item.tanggalPengapusan && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Pengapusan</label>
                      <p className="text-sm text-slate-800 mt-1">{formatDate(item.tanggalPengapusan)}</p>
                    </div>
                  )}
                  {item.alasanPengapusan && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alasan Pengapusan</label>
                      <p className="text-sm text-slate-800 mt-1">{item.alasanPengapusan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Keterangan */}
            {item.keterangan && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                  Keterangan
                </h3>
                <p className="text-sm text-slate-800 bg-slate-50 p-4 rounded-lg">{item.keterangan}</p>
              </div>
            )}

            {/* Raw Data - All Excel Columns */}
            {item.rawData && Object.keys(item.rawData).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-gov-200">
                  Data Lengkap dari Excel
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(item.rawData).map(([key, value]) => (
                      <div key={key} className="border-b border-slate-200 pb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          {key}
                        </label>
                        <p className="text-sm text-slate-800 break-words">
                          {value !== null && value !== undefined && value !== '' 
                            ? String(value) 
                            : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  * Menampilkan semua kolom dari file Excel yang diupload
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-slate-500 font-semibold italic">
            {isEditor ? 'Anda memiliki akses editor untuk Satker ini.' : 'Akses Baca-Saja. Edit dibatasi oleh hak akses Satker.'}
          </div>
          <div className="flex gap-2">
            {isEditor && (
              <button
                onClick={onEdit}
                className="px-6 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-bold"
              >
                Edit Aset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * BMN List View - Table view with filters and search
 * Validates: Requirements 6.1, 7.1-7.10, 8.1-8.8
 */
interface BMNListViewProps {
  onItemClick: (item: BMNItem) => void;
}

const BMNListView: React.FC<BMNListViewProps> = ({ onItemClick }) => {
  const { bmnItems, isLoading } = useBMN();
  
  // Initialize filter hook
  const filterHook = useBMNFilters();
  
  // Initialize search hook
  const { searchQuery, setSearchQuery, debouncedSearchQuery } = useBMNSearch();
  const [searchBy, setSearchBy] = useState<'all' | 'nup' | 'nomorRegister' | 'namaBarang' | 'kodeBarang' | 'merk' | 'alamat'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get placeholder text based on searchBy
  const getSearchPlaceholder = () => {
    switch (searchBy) {
      case 'nup':
        return 'Cari berdasarkan NUP (Nomor Urut Pendaftaran)...';
      case 'nomorRegister':
        return 'Cari berdasarkan Nomor Register...';
      case 'namaBarang':
        return 'Cari berdasarkan Nama Barang...';
      case 'kodeBarang':
        return 'Cari berdasarkan Kode Barang...';
      case 'merk':
        return 'Cari berdasarkan Merk atau Tipe...';
      case 'alamat':
        return 'Cari berdasarkan Alamat atau Lokasi...';
      case 'all':
      default:
        return 'Cari berdasarkan nama barang, kode barang, NUP, nomor register, merk, tipe, atau alamat...';
    }
  };

  // Apply filters and search using the hook's applyFilters function
  const filteredItems = useMemo(() => {
    let filtered = [...bmnItems];

    // Apply search first (Requirement 8.1-8.8)
    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        if (searchBy === 'all') {
          return (
            item.namaBarang.toLowerCase().includes(searchLower) ||
            item.kodeBarang.toLowerCase().includes(searchLower) ||
            item.merk?.toLowerCase().includes(searchLower) ||
            item.tipe?.toLowerCase().includes(searchLower) ||
            item.alamat?.toLowerCase().includes(searchLower) ||
            item.nup?.toLowerCase().includes(searchLower) ||
            item.nomorRegister?.toLowerCase().includes(searchLower)
          );
        }
        
        if (searchBy === 'nup') {
          return item.nup?.toLowerCase().includes(searchLower);
        }
        
        if (searchBy === 'nomorRegister') {
          return item.nomorRegister?.toLowerCase().includes(searchLower);
        }
        
        if (searchBy === 'namaBarang') {
          return item.namaBarang.toLowerCase().includes(searchLower);
        }
        
        if (searchBy === 'kodeBarang') {
          return item.kodeBarang.toLowerCase().includes(searchLower);
        }
        
        if (searchBy === 'merk') {
          return (
            item.merk?.toLowerCase().includes(searchLower) ||
            item.tipe?.toLowerCase().includes(searchLower)
          );
        }
        
        if (searchBy === 'alamat') {
          return item.alamat?.toLowerCase().includes(searchLower);
        }
        
        return false;
      });
    }

    // Apply all filters using the hook's applyFilters function (Requirement 7.1-7.10)
    // This ensures consistent filtering logic across the application
    filtered = filterHook.applyFilters(filtered);

    return filtered;
  }, [bmnItems, debouncedSearchQuery, filterHook, searchBy]);

  return (
    <div className="space-y-6">
      {/* Search Bar (Requirement 8.1) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-64">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm bg-white text-slate-700 font-medium"
            >
              <option value="all">Semua Kolom</option>
              <option value="namaBarang">Nama Barang</option>
              <option value="nup">NUP (No Urut Pendaftaran)</option>
              <option value="nomorRegister">Nomor Register</option>
              <option value="kodeBarang">Kode Barang</option>
              <option value="merk">Merk / Tipe</option>
              <option value="alamat">Alamat / Lokasi</option>
            </select>
          </div>
          <div className="flex-1 flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-all whitespace-nowrap outline-none ${
                showFilters || filterHook.activeFilterCount > 0
                  ? 'bg-gov-50 border-gov-300 text-gov-700 ring-1 ring-gov-300'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} className={showFilters || filterHook.activeFilterCount > 0 ? 'text-gov-600' : 'text-slate-500'} />
              <span>Filter</span>
              {filterHook.activeFilterCount > 0 && (
                <span className="bg-gov-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {filterHook.activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        {/* Result count (Requirement 8.6) */}
        <div className="mt-3 text-sm text-slate-600">
          Menampilkan <span className="font-semibold">{filteredItems.length}</span> dari <span className="font-semibold">{bmnItems.length}</span> item
        </div>
      </div>

      {/* Filter Panel (Requirement 7.1-7.10) */}
      {showFilters && (
        <BMNFilterPanel bmnItems={bmnItems} filterHook={filterHook} />
      )}

      {/* Table (Requirement 6.1-6.8) */}
      <BMNTable
        items={filteredItems}
        isLoading={isLoading}
        onRowClick={onItemClick}
      />
    </div>
  );
};

/**
 * Main BMN Page Content - Handles tab switching and modals
 * Validates: Requirements 1.2, 2.1, 6.1, 15.7
 */
const InventoriBMNPageContent: React.FC = () => {
  const { bmnItems, setBmnItems, uploadHistory, isLoading, error, fetchBMNItems, fetchUploadHistory } = useBMN();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>('Dashboard');
  const [selectedItem, setSelectedItem] = useState<BMNItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BMNItem | null>(null);
  const [userEditableSatkers, setUserEditableSatkers] = useState<string[]>([]);

  // Notification handler
  const showNotification = (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`[${type?.toUpperCase()}] ${title}: ${message}`);
  };

  // Initialize handlers for CRUD operations
  const { handleSaveBMN } = useBMNHandlers({
    currentUser,
    bmnItems,
    setBmnItems,
    showNotification,
    fetchBMNItems,
    fetchUploadHistory
  });

  // Fetch editable satkers for the logged-in user
  useEffect(() => {
    const fetchUserEditableSatkers = async () => {
      if (!currentUser) return;
      if (currentUser.role === 'Super Admin') return;
      try {
        const { data, error } = await supabase
          .from('bmn_editors')
          .select('nama_satker')
          .eq('user_id', currentUser.id);
        
        if (!error && data) {
          setUserEditableSatkers(data.map(row => row.nama_satker));
        }
      } catch (err) {
        console.error('Error fetching editable satkers:', err);
      }
    };
    
    fetchUserEditableSatkers();
  }, [currentUser]);

  // Handle upload success
  const handleUploadSuccess = async () => {
    await fetchBMNItems();
    await fetchUploadHistory();
  };

  // Handle history refresh
  const handleHistoryRefresh = async () => {
    await fetchUploadHistory();
    await fetchBMNItems();
  };

  // Handle item click from table
  const handleItemClick = (item: BMNItem) => {
    setSelectedItem(item);
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setSelectedItem(null);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Page Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventori BMN</h1>
            <p className="text-sm text-slate-600 mt-1">
              Sistem Manajemen Barang Milik Negara
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {(currentUser?.role === 'Super Admin' || userEditableSatkers.length > 0) && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium text-sm flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>Tambah BMN</span>
              </button>
            )}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
            >
              Riwayat Upload
            </button>
          </div>
        </div>

        {/* Tab Navigation (Requirement 1.2) */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('Dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'Dashboard'
                ? 'bg-gov-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('List')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'List'
                ? 'bg-gov-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <List size={18} />
            Daftar BMN
          </button>
          <button
            onClick={() => setActiveTab('Devices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'Devices'
                ? 'bg-gov-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Laptop size={18} />
            Daftar Perangkat
          </button>

          {currentUser?.role === 'Super Admin' && (
            <button
              onClick={() => setActiveTab('Editors')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'Editors'
                  ? 'bg-gov-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users size={18} />
              <span>Editor BMN</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Display (Requirement 15.7) */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-1">
                    Terjadi Kesalahan
                  </h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State (Requirement 15.3) */}
        {isLoading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gov-600"></div>
              <span className="text-sm text-slate-600">Memuat data BMN...</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <div className="p-4 sm:p-6">
            {activeTab === 'Dashboard' ? (
              <BMNDashboard onOpenUploadModal={() => setShowUploadModal(true)} />
            ) : activeTab === 'List' ? (
              <BMNListView onItemClick={handleItemClick} />
            ) : activeTab === 'Devices' ? (
              <BMNDevicesList currentUser={currentUser} showNotification={showNotification} />
            ) : (
              <BMNEditorManager showNotification={showNotification} />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploadModal && (
        <BMNUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          currentUser={currentUser}
          showNotification={showNotification}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {showHistoryModal && (
        <BMNHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          uploadHistory={uploadHistory}
          currentUser={currentUser}
          showNotification={showNotification}
          onRefresh={handleHistoryRefresh}
        />
      )}

      {selectedItem && (
        <BMNDetailModal
          item={selectedItem}
          onClose={handleCloseDetail}
          onEdit={() => {
            setEditingItem(selectedItem);
            setSelectedItem(null);
          }}
          isEditor={currentUser?.role === 'Super Admin' || userEditableSatkers.some(s => s.toLowerCase().trim() === selectedItem.namaSatker?.toLowerCase().trim().replace(/^["']|["']$/g, ''))}
        />
      )}

      {/* Manual Add/Edit Form Modal */}
      {(showAddModal || editingItem) && (
        <BMNFormModal
          isOpen={showAddModal || !!editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveBMN}
          item={editingItem}
        />
      )}
    </div>
  );
};

/**
 * Main InventoriBMNPage Component with Context Provider and Error Boundary
 * Validates: Requirements 1.2, 2.1, 6.1, 15.7
 */
const InventoriBMNPage: React.FC = () => {
  const { session } = useAuth();

  return (
    <ErrorBoundary>
      <BMNProvider session={session}>
        <InventoriBMNPageContent />
      </BMNProvider>
    </ErrorBoundary>
  );
};

export default InventoriBMNPage;
