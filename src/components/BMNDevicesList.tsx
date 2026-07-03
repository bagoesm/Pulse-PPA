// src/components/BMNDevicesList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevice, Satker, User } from '../../types';
import { BMNDevicesService } from '../services/BMNDevicesService';
import BMNDevicesFormModal from './BMNDevicesFormModal';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Plus, Edit2, Trash2, Search, Filter, 
  Laptop, Link, Copy, Check, Download, 
  RefreshCw, ChevronDown, ChevronUp, AlertCircle, X,
  Monitor, Printer
} from 'lucide-react';

interface BMNDevicesListProps {
  currentUser: User | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const BMNDevicesList: React.FC<BMNDevicesListProps> = ({ 
  currentUser, 
  showNotification 
}) => {
  const [devices, setDevices] = useState<BMNDevice[]>([]);
  const [satkers, setSatkers] = useState<Satker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEditableSatkers, setUserEditableSatkers] = useState<string[]>([]);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeviceType, setFilterDeviceType] = useState('All');
  const [filterOwnership, setFilterOwnership] = useState('All');
  const [filterPerformance, setFilterPerformance] = useState('All');
  const [filterSatker, setFilterSatker] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BMNDevice | null>(null);
  const [selectedDeviceDetails, setSelectedDeviceDetails] = useState<BMNDevice | null>(null);

  // Share link state
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch all devices & satkers
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [devicesList, satkersList] = await Promise.all([
        BMNDevicesService.getAllDevices(),
        BMNDevicesService.getAllSatkers()
      ]);
      setDevices(devicesList);
      setSatkers(satkersList);
    } catch (err) {
      console.error(err);
      showNotification('Gagal Memuat', 'Terjadi kesalahan saat memuat data perangkat BMN.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch current user's edit permission scope (bmn_editors table)
  useEffect(() => {
    if (!currentUser) return;
    
    const checkPermissions = async () => {
      if (currentUser.role === 'Super Admin') return; // Super admin bypassed
      try {
        const { data, error } = await supabase
          .from('bmn_editors')
          .select('satker_id')
          .eq('user_id', currentUser.id);

        if (!error && data) {
          setUserEditableSatkers(data.map(item => item.satker_id));
        }
      } catch (err) {
        console.error('Failed to load user permissions:', err);
      }
    };
    checkPermissions();
  }, [currentUser]);

  // Check if current user has edit permission for a device
  const hasEditPermission = (device: BMNDevice) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    return userEditableSatkers.includes(device.satkerId);
  };

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      // Search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        d.namaPegawai.toLowerCase().includes(searchLower) ||
        (d.penyeragamanNamaLaptop && d.penyeragamanNamaLaptop.toLowerCase().includes(searchLower)) ||
        (d.merkType && d.merkType.toLowerCase().includes(searchLower)) ||
        (d.kodeBMN && d.kodeBMN.toLowerCase().includes(searchLower));

      // Filter Device Type
      const matchesDeviceType = filterDeviceType === 'All' || d.namaPerangkat === filterDeviceType;

      // Filter Ownership
      const matchesOwnership = filterOwnership === 'All' || d.jenisKepemilikan === filterOwnership;

      // Filter Performance
      const matchesPerformance = filterPerformance === 'All' || d.performaPerangkat === filterPerformance;

      // Filter Satker
      const matchesSatker = filterSatker === 'All' || d.satkerId === filterSatker;

      return matchesSearch && matchesDeviceType && matchesOwnership && matchesPerformance && matchesSatker;
    });
  }, [devices, searchTerm, filterDeviceType, filterOwnership, filterPerformance, filterSatker]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = devices.length;
    const office = devices.filter(d => d.jenisKepemilikan === 'Kantor').length;
    const personal = devices.filter(d => d.jenisKepemilikan === 'Pribadi').length;
    
    const laptops = devices.filter(d => d.namaPerangkat === 'Laptop').length;
    const pcs = devices.filter(d => d.namaPerangkat === 'PC').length;
    const computers = laptops + pcs;

    const printers = devices.filter(d => d.namaPerangkat === 'Printer').length;
    const scanners = devices.filter(d => d.namaPerangkat === 'Scanner').length;
    const others = devices.filter(d => d.namaPerangkat === 'Lainnya').length;
    const supporting = printers + scanners + others;

    const baik = devices.filter(d => d.performaPerangkat === 'Baik').length;
    const cukup = devices.filter(d => d.performaPerangkat === 'Cukup').length;
    const kurang = devices.filter(d => d.performaPerangkat === 'Kurang').length;

    return {
      total,
      office,
      personal,
      computers,
      laptops,
      pcs,
      supporting,
      printers,
      scanners,
      others,
      baik,
      cukup,
      kurang
    };
  }, [devices]);

  // Handle Save Device
  const handleSaveDevice = async (deviceData: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingDevice) {
        // Edit mode
        await BMNDevicesService.updateDevice(editingDevice.id, deviceData);
        showNotification('Berhasil', 'Data perangkat berhasil diperbarui.', 'success');
      } else {
        // Add mode
        await BMNDevicesService.createDevice(deviceData);
        showNotification('Berhasil', 'Data perangkat baru berhasil ditambahkan.', 'success');
      }
      setIsFormOpen(false);
      setEditingDevice(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
    }
  };

  // Handle Delete Device
  const handleDeleteDevice = async (device: BMNDevice) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data perangkat milik "${device.namaPegawai}"?`)) {
      return;
    }

    try {
      await BMNDevicesService.deleteDevice(device.id);
      showNotification('Berhasil', 'Data perangkat berhasil dihapus.', 'success');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // Copy public entry form link to clipboard
  const handleCopyPublicLink = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}?form=device`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    showNotification('Tersalin', 'Link form pendaftaran publik berhasil disalin.', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Export all detailed fields directly to genuine Excel (.xlsx) file
  const handleExportExcel = () => {
    const headers = [
      'No', 'Nama Pegawai', 'Nomor Telepon', 'Unit Kerja', 'Satuan Kerja (Satker)', 
      'Nama Perangkat', 'Penyeragaman Nama Laptop', 'Jenis Kepemilikan', 'Kode BMN', 
      'Tahun Perolehan', 'Merk/Type', 'Processor', 'RAM', 'VGA', 'HDD/SSD', 
      'MAC Address (WIFI)', 'MAC Address (LAN)', 'Antivirus Sebelumnya', 'OS', 'Lisensi OS', 
      'Ms. Office', 'Lisensi Office', 'PDF Reader', 'Lisensi PDF', 'Performa', 'Keterangan'
    ];

    const dataRows = filteredDevices.map((d, index) => [
      index + 1,
      d.namaPegawai,
      d.nomorTelepon || '',
      d.unitKerja || '',
      d.satker?.name || '',
      d.namaPerangkat,
      d.penyeragamanNamaLaptop || '',
      d.jenisKepemilikan,
      d.kodeBMN || '',
      d.tahunPerolehan || '',
      d.merkType || '',
      d.processor || '',
      d.ram || '',
      d.vga || '',
      d.hddSsd || '',
      d.macWifi || '',
      d.macLan || '',
      d.antivirusSebelumnya || '',
      d.os || '',
      d.osLicenseStatus || '',
      d.msOffice || '',
      d.msOfficeLicenseStatus || '',
      d.pdfReader || '',
      d.pdfReaderLicenseStatus || '',
      d.performaPerangkat || '',
      d.keterangan || ''
    ]);

    // Build worksheet with header and rows
    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BMN Devices Summary");
    
    // Auto-fit column widths
    const maxCols = headers.length;
    const wscols = [];
    for (let i = 0; i < maxCols; i++) {
      let maxLen = headers[i].length;
      for (let r = 0; r < dataRows.length; r++) {
        const cellVal = String(dataRows[r][i] || '');
        if (cellVal.length > maxLen) {
          maxLen = cellVal.length;
        }
      }
      wscols.push({ wch: maxLen + 3 });
    }
    ws['!cols'] = wscols;

    // Generate binary spreadsheet buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    // Download trigger
    const url = window.URL.createObjectURL(fileData);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bmn_devices_inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Sukses Export', 'Data berhasil diexport ke Excel (.xlsx)', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in text-slate-700">
        {/* Card 1: Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Perangkat</span>
            <span className="text-3xl font-bold text-slate-800 block">{stats.total}</span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Kantor: <span className="font-semibold text-slate-700">{stats.office}</span> • Pribadi: <span className="font-semibold text-slate-700">{stats.personal}</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
            <Laptop size={22} />
          </div>
        </div>

        {/* Card 2: Computers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Laptop & PC</span>
            <span className="text-3xl font-bold text-slate-800 block">{stats.computers}</span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Laptop: <span className="font-semibold text-slate-700">{stats.laptops}</span> • PC: <span className="font-semibold text-slate-700">{stats.pcs}</span>
            </span>
          </div>
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-600 shrink-0">
            <Monitor size={22} />
          </div>
        </div>

        {/* Card 3: Supporting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Alat Pendukung</span>
            <span className="text-3xl font-bold text-slate-800 block">{stats.supporting}</span>
            <span className="text-[10px] text-slate-500 font-medium block flex flex-wrap gap-x-2">
              <span>Print: <span className="font-semibold text-slate-700">{stats.printers}</span></span>
              <span>Scan: <span className="font-semibold text-slate-700">{stats.scanners}</span></span>
              <span>Lain: <span className="font-semibold text-slate-700">{stats.others}</span></span>
            </span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
            <Printer size={22} />
          </div>
        </div>

        {/* Card 4: Health / Condition */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Kondisi Perangkat</span>
            <span className="text-3xl font-bold text-slate-800 block">
              {stats.total > 0 ? ((stats.baik / stats.total) * 100).toFixed(0) + '%' : '0%'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block flex flex-wrap gap-x-1.5">
              <span className="text-green-600 font-semibold">Baik: {stats.baik}</span>
              <span className="text-yellow-600 font-semibold">Cukup: {stats.cukup}</span>
              <span className="text-red-600 font-semibold">Kurang: {stats.kurang}</span>
            </span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 shrink-0">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyPublicLink}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors font-semibold text-xs flex items-center gap-1.5 animate-none"
            title="Bagikan form pengisian tanpa perlu login"
          >
            {copiedLink ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Form Publik'}</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors font-semibold text-xs flex items-center gap-1.5"
            title="Export data lengkap ke format Excel (.xlsx)"
          >
            <Download size={14} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditingDevice(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-lg transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>Tambah Perangkat</span>
        </button>
      </div>

      {/* Search & Filters Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama pegawai, nama laptop, merk, atau kode BMN..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border rounded-lg flex items-center justify-center gap-2 font-semibold text-xs transition-all whitespace-nowrap outline-none ${
              showFilters || filterDeviceType !== 'All' || filterOwnership !== 'All' || filterPerformance !== 'All' || filterSatker !== 'All'
                ? 'bg-gov-50 border-gov-300 text-gov-700 ring-1 ring-gov-300'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            <span>Filter Detail</span>
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 animate-slide-down">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Jenis Perangkat</label>
              <select
                value={filterDeviceType}
                onChange={(e) => setFilterDeviceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="All">Semua Perangkat</option>
                <option value="Laptop">Laptop</option>
                <option value="PC">PC</option>
                <option value="Printer">Printer</option>
                <option value="Scanner">Scanner</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Jenis Kepemilikan</label>
              <select
                value={filterOwnership}
                onChange={(e) => setFilterOwnership(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="All">Semua Kepemilikan</option>
                <option value="Kantor">Kantor</option>
                <option value="Pribadi">Pribadi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Kondisi / Performa</label>
              <select
                value={filterPerformance}
                onChange={(e) => setFilterPerformance(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="All">Semua Performa</option>
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
                <option value="Kurang">Kurang</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satker</label>
              <select
                value={filterSatker}
                onChange={(e) => setFilterSatker(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="All">Semua Satker</option>
                {satkers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Compact Summary Devices List Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gov-600"></div>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <AlertCircle className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="font-semibold text-sm">Tidak ditemukan data perangkat.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">Nama Pegawai</th>
                  <th className="px-4 py-3">Satuan Kerja (Satker)</th>
                  <th className="px-4 py-3">Jenis Perangkat</th>
                  <th className="px-4 py-3">Merk / Type</th>
                  <th className="px-4 py-3">Kode Naming Laptop</th>
                  <th className="px-4 py-3">Performa</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredDevices.map((device, index) => {
                  const editable = hasEditPermission(device);
                  
                  return (
                    <tr 
                      key={device.id} 
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors text-slate-600 text-xs"
                      onClick={() => setSelectedDeviceDetails(device)}
                      title="Klik untuk melihat detail lengkap spesifikasi perangkat"
                    >
                      <td className="px-4 py-3 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {device.namaPegawai}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {device.satker?.name || device.unitKerja || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          device.namaPerangkat === 'Laptop' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                          device.namaPerangkat === 'PC' ? 'bg-sky-50 border-sky-100 text-sky-700' :
                          device.namaPerangkat === 'Printer' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-slate-50 border-slate-200 text-slate-650'
                        }`}>
                          {device.namaPerangkat}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {device.merkType || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {device.penyeragamanNamaLaptop ? (
                          <div 
                            className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-800 px-2 py-0.5 rounded border border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{device.penyeragamanNamaLaptop}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(device.penyeragamanNamaLaptop || '');
                                showNotification('Tersalin', 'Nama laptop tersalin.', 'success');
                              }}
                              className="text-slate-400 hover:text-slate-605 transition-colors text-slate-450 hover:text-slate-600"
                              title="Salin Nama Laptop"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            device.performaPerangkat === 'Baik' ? 'bg-green-500' :
                            device.performaPerangkat === 'Cukup' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-slate-600 text-xs">{device.performaPerangkat}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-500 font-normal" title={device.keterangan}>
                        {device.keterangan || '-'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setIsFormOpen(true);
                          }}
                          disabled={!editable}
                          className={`p-1.5 rounded-lg border transition-all ${
                            editable 
                              ? 'bg-white hover:bg-slate-50 text-slate-500 hover:text-gov-600 border-slate-200 shadow-sm' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          }`}
                          title={editable ? "Edit Perangkat" : "Akses Edit Dibatasi"}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          disabled={!editable}
                          className={`p-1.5 rounded-lg border transition-all ${
                            editable 
                              ? 'bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200 hover:border-red-100 shadow-sm' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          }`}
                          title={editable ? "Hapus Perangkat" : "Akses Hapus Dibatasi"}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDeviceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full rounded-2xl shadow-xl sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Detail Perangkat {selectedDeviceDetails.jenisKepemilikan === 'Kantor' ? 'BMN' : 'Pribadi'}
                </h3>
                <p className="text-xs text-slate-550 text-slate-500">Milik Pegawai: {selectedDeviceDetails.namaPegawai}</p>
              </div>
              <button
                onClick={() => setSelectedDeviceDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Naming Banner */}
              {selectedDeviceDetails.penyeragamanNamaLaptop && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3 text-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 block mb-0.5">
                      Nama Naming Laptop (Keseragaman):
                    </span>
                    <span className="font-mono text-sm font-semibold text-indigo-900 tracking-wide break-all">
                      {selectedDeviceDetails.penyeragamanNamaLaptop}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDeviceDetails.penyeragamanNamaLaptop || '');
                      showNotification('Tersalin', 'Nama laptop disalin ke clipboard.', 'success');
                    }}
                    className="bg-white hover:bg-slate-100 border border-indigo-250 text-indigo-750 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Copy size={13} />
                    <span>Salin</span>
                  </button>
                </div>
              )}

              {/* Grid sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: Identitas & Lokasi */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-600">1. Identitas & Lokasi</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Nama Pegawai</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.namaPegawai}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">No. Telepon</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.nomorTelepon || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Unit Kerja</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.unitKerja || '-'}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-550 text-slate-500">Satker (Induk/Anak)</span>
                      <span className="font-semibold text-slate-800 text-right">{selectedDeviceDetails.satker?.name || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Informasi Perangkat */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-600">2. Info Perangkat</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Jenis Perangkat</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.namaPerangkat}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Merk / Type</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.merkType || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">Kepemilikan</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.jenisKepemilikan}</span>
                    </div>
                    {selectedDeviceDetails.jenisKepemilikan === 'Kantor' && (
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-500">Kode BMN</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedDeviceDetails.kodeBMN || '-'}</span>
                      </div>
                    )}
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-500">Tahun Perolehan</span>
                      <span className="font-semibold text-slate-800">{selectedDeviceDetails.tahunPerolehan || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Spesifikasi Hardware */}
                {['Laptop', 'PC'].includes(selectedDeviceDetails.namaPerangkat) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-600">3. Spesifikasi Hardware</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-500">Processor</span>
                        <span className="font-semibold text-slate-800">{selectedDeviceDetails.processor || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-500">RAM</span>
                        <span className="font-semibold text-slate-800">{selectedDeviceDetails.ram || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-500">VGA</span>
                        <span className="font-semibold text-slate-800">{selectedDeviceDetails.vga || '-'}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-slate-500">HDD / SSD</span>
                        <span className="font-semibold text-slate-800">{selectedDeviceDetails.hddSsd || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 4: Konektivitas */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-600">4. Alamat Fisik (MAC)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-500">MAC Wifi</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedDeviceDetails.macWifi || '-'}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-500">MAC LAN</span>
                      <span className="font-mono font-semibold text-slate-850 text-slate-800">{selectedDeviceDetails.macLan || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 5: Aplikasi & Lisensi */}
                {['Laptop', 'PC'].includes(selectedDeviceDetails.namaPerangkat) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 md:col-span-2">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-indigo-600">5. Aplikasi & Lisensi</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      {/* OS */}
                      <div className="border border-slate-200 bg-white rounded-lg p-2.5 space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[9px]">Sistem Operasi</span>
                        <div className="font-semibold text-slate-800 truncate">{selectedDeviceDetails.os || '-'}</div>
                        {selectedDeviceDetails.osLicenseStatus && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            selectedDeviceDetails.osLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            selectedDeviceDetails.osLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            selectedDeviceDetails.osLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-655 text-slate-600'
                          }`}>
                            OS: {selectedDeviceDetails.osLicenseStatus}
                          </span>
                        )}
                      </div>

                      {/* Office */}
                      <div className="border border-slate-200 bg-white rounded-lg p-2.5 space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[9px]">Ms. Office</span>
                        <div className="font-semibold text-slate-800 truncate">{selectedDeviceDetails.msOffice || '-'}</div>
                        {selectedDeviceDetails.msOfficeLicenseStatus && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            selectedDeviceDetails.msOfficeLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            selectedDeviceDetails.msOfficeLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            selectedDeviceDetails.msOfficeLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            Office: {selectedDeviceDetails.msOfficeLicenseStatus}
                          </span>
                        )}
                      </div>

                      {/* PDF */}
                      <div className="border border-slate-200 bg-white rounded-lg p-2.5 space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[9px]">PDF Reader</span>
                        <div className="font-semibold text-slate-800 truncate">{selectedDeviceDetails.pdfReader || '-'}</div>
                        {selectedDeviceDetails.pdfReaderLicenseStatus && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            selectedDeviceDetails.pdfReaderLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            selectedDeviceDetails.pdfReaderLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            selectedDeviceDetails.pdfReaderLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            PDF: {selectedDeviceDetails.pdfReaderLicenseStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50 flex gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Antivirus: </span>
                        <span className="font-semibold text-slate-800">{selectedDeviceDetails.antivirusSebelumnya || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance & Notes */}
              <div className="border-t border-slate-150 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Kondisi / Performa: </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    selectedDeviceDetails.performaPerangkat === 'Baik' ? 'bg-green-100 text-green-700' :
                    selectedDeviceDetails.performaPerangkat === 'Cukup' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedDeviceDetails.performaPerangkat}
                  </span>
                </div>
                <div className="md:max-w-md">
                  <span className="text-slate-500 block md:inline font-semibold">Keterangan: </span>
                  <span className="text-slate-800 italic">{selectedDeviceDetails.keterangan || '-'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400">Diinput oleh: {selectedDeviceDetails.createdBy || 'Public User'}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDeviceDetails(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                >
                  Tutup
                </button>
                {hasEditPermission(selectedDeviceDetails) && (
                  <button
                    onClick={() => {
                      const dev = selectedDeviceDetails;
                      setSelectedDeviceDetails(null);
                      setEditingDevice(dev);
                      setIsFormOpen(true);
                    }}
                    className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                  >
                    Edit Perangkat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <BMNDevicesFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDevice(null);
          }}
          onSave={handleSaveDevice}
          item={editingDevice}
        />
      )}
    </div>
  );
};

export default BMNDevicesList;
