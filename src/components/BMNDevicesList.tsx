// src/components/BMNDevicesList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevice, Satker, User } from '../../types';
import { BMNDevicesService } from '../services/BMNDevicesService';
import BMNDevicesFormModal from './BMNDevicesFormModal';
import { supabase } from '../lib/supabaseClient';
import { 
  Plus, Edit2, Trash2, Search, Filter, 
  Laptop, Link, Copy, Check, Download, 
  RefreshCw, ChevronDown, ChevronUp, AlertCircle
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
      showNotification('Error', 'Gagal memuat data perangkat.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch editable satkers for the user
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

  useEffect(() => {
    fetchData();
    fetchUserEditableSatkers();
  }, [currentUser]);

  // Check if user has permission to edit a device
  const hasEditPermission = (device: BMNDevice) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    const satkerName = device.satker?.name || '';
    return userEditableSatkers.some(
      s => s.toLowerCase().trim() === satkerName.toLowerCase().trim().replace(/^["']|["']$/g, '')
    );
  };

  // Copy public form link
  const handleCopyPublicLink = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}?form=device`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    showNotification('Tersalin', 'Link form publik berhasil disalin ke clipboard.', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // Search term
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        device.namaPegawai.toLowerCase().includes(searchLower) ||
        (device.penyeragamanNamaLaptop && device.penyeragamanNamaLaptop.toLowerCase().includes(searchLower)) ||
        (device.merkType && device.merkType.toLowerCase().includes(searchLower)) ||
        (device.kodeBMN && device.kodeBMN.toLowerCase().includes(searchLower));

      // Device Type
      const matchesDeviceType = filterDeviceType === 'All' || device.namaPerangkat === filterDeviceType;

      // Ownership
      const matchesOwnership = filterOwnership === 'All' || device.jenisKepemilikan === filterOwnership;

      // Performance
      const matchesPerformance = filterPerformance === 'All' || device.performaPerangkat === filterPerformance;

      // Satker
      const matchesSatker = filterSatker === 'All' || device.satkerId === filterSatker;

      return matchesSearch && matchesDeviceType && matchesOwnership && matchesPerformance && matchesSatker;
    });
  }, [devices, searchTerm, filterDeviceType, filterOwnership, filterPerformance, filterSatker]);

  // Handle Save (Add/Edit)
  const handleSaveDevice = async (payload: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingDevice) {
        await BMNDevicesService.updateDevice(editingDevice.id, payload);
        showNotification('Berhasil', `Data perangkat "${payload.namaPegawai}" berhasil diperbarui.`, 'success');
      } else {
        await BMNDevicesService.createDevice(payload);
        showNotification('Berhasil', `Data perangkat "${payload.namaPegawai}" berhasil ditambahkan.`, 'success');
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'error');
      throw err;
    }
  };

  // Handle Delete
  const handleDeleteDevice = async (device: BMNDevice) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data perangkat Pegawai "${device.namaPegawai}"?`)) {
      return;
    }

    try {
      await BMNDevicesService.deleteDevice(device.id);
      showNotification('Berhasil', 'Data perangkat berhasil dihapus.', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // Export to CSV/Excel (Client Side)
  const handleExportCSV = () => {
    if (filteredDevices.length === 0) {
      alert('Tidak ada data untuk diexport!');
      return;
    }

    const headers = [
      'No', 'Nama Pegawai', 'Nomor Telepon', 'Unit Kerja', 'Satker', 'Nama Perangkat',
      'Penyeragaman Nama Laptop', 'Jenis Kepemilikan', 'Kode BMN', 'Tahun Perolehan',
      'Merk/Type', 'Processor', 'RAM', 'VGA', 'HDD/SSD', 'Wifi MAC', 'LAN MAC',
      'Antivirus Sebelumnya', 'OS', 'Lisensi OS', 'Office', 'Lisensi Office',
      'PDF Reader', 'Lisensi PDF', 'Performa', 'Keterangan'
    ];

    const rows = filteredDevices.map((d, index) => [
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

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", encodedUri);
    linkElement.setAttribute("download", `bmn_devices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyPublicLink}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors font-semibold text-xs flex items-center gap-1.5"
            title="Bagikan form pengisian tanpa perlu login"
          >
            {copiedLink ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Form Publik'}</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors font-semibold text-xs flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        <button
          onClick={() => {
            setEditingDevice(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-lg transition-colors font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jenis Perangkat</label>
              <select
                value={filterDeviceType}
                onChange={(e) => setFilterDeviceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kepemilikan</label>
              <select
                value={filterOwnership}
                onChange={(e) => setFilterOwnership(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="All">Semua Kepemilikan</option>
                <option value="Kantor">Milik Kantor</option>
                <option value="Pribadi">Milik Pribadi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Performa</label>
              <select
                value={filterPerformance}
                onChange={(e) => setFilterPerformance(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="All">Semua Performa</option>
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
                <option value="Kurang">Kurang</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Satuan Kerja</label>
              <select
                value={filterSatker}
                onChange={(e) => setFilterSatker(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="All">Semua Satker</option>
                {satkers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          Menampilkan <span className="font-bold text-slate-700">{filteredDevices.length}</span> dari <span className="font-bold text-slate-700">{devices.length}</span> perangkat
        </div>
      </div>

      {/* Devices List Table */}
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
            <table className="w-full border-collapse text-left text-[11px] text-slate-700 min-w-[3200px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-3 py-3.5 w-12 text-center">No</th>
                  <th className="px-3 py-3.5">Nama Pegawai</th>
                  <th className="px-3 py-3.5">No. Telp</th>
                  <th className="px-3 py-3.5">Unit Kerja</th>
                  <th className="px-3 py-3.5">Satuan Kerja (Satker)</th>
                  <th className="px-3 py-3.5">Jenis Perangkat</th>
                  <th className="px-3 py-3.5">Kode Naming Laptop</th>
                  <th className="px-3 py-3.5">Kepemilikan</th>
                  <th className="px-3 py-3.5">Kode BMN</th>
                  <th className="px-3 py-3.5">Tahun Perolehan</th>
                  <th className="px-3 py-3.5">Merk / Type</th>
                  <th className="px-3 py-3.5">Processor</th>
                  <th className="px-3 py-3.5">RAM</th>
                  <th className="px-3 py-3.5">VGA</th>
                  <th className="px-3 py-3.5">HDD / SSD</th>
                  <th className="px-3 py-3.5">MAC Wifi</th>
                  <th className="px-3 py-3.5">MAC LAN</th>
                  <th className="px-3 py-3.5">Antivirus Sebelumnya</th>
                  <th className="px-3 py-3.5">OS</th>
                  <th className="px-3 py-3.5">Lisensi OS</th>
                  <th className="px-3 py-3.5">Ms. Office</th>
                  <th className="px-3 py-3.5">Lisensi Office</th>
                  <th className="px-3 py-3.5">PDF Reader</th>
                  <th className="px-3 py-3.5">Lisensi PDF</th>
                  <th className="px-3 py-3.5">Performa</th>
                  <th className="px-3 py-3.5">Keterangan</th>
                  <th className="px-3 py-3.5 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredDevices.map((device, index) => {
                  const editable = hasEditPermission(device);
                  
                  return (
                    <tr key={device.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-900">{device.namaPegawai}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{device.nomorTelepon || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.unitKerja || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 font-bold">
                          {device.satker?.name || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          device.namaPerangkat === 'Laptop' ? 'bg-indigo-100 text-indigo-700' :
                          device.namaPerangkat === 'PC' ? 'bg-sky-100 text-sky-700' :
                          device.namaPerangkat === 'Printer' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {device.namaPerangkat}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-bold text-slate-800">
                        {device.penyeragamanNamaLaptop ? (
                          <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-800 px-2 py-1 rounded border border-yellow-200/50 w-fit whitespace-nowrap">
                            <span>{device.penyeragamanNamaLaptop}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(device.penyeragamanNamaLaptop || '');
                                showNotification('Tersalin', 'Nama laptop tersalin.', 'success');
                              }}
                              className="text-slate-400 hover:text-slate-600"
                              title="Salin Nama Laptop"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{device.jenisKepemilikan}</td>
                      <td className="px-3 py-3 font-mono text-slate-600">{device.kodeBMN || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.tahunPerolehan || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.merkType || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.processor || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.ram || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.vga || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.hddSsd || '-'}</td>
                      <td className="px-3 py-3 font-mono text-slate-500">{device.macWifi || '-'}</td>
                      <td className="px-3 py-3 font-mono text-slate-500">{device.macLan || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.antivirusSebelumnya || '-'}</td>
                      <td className="px-3 py-3 text-slate-600">{device.os || '-'}</td>
                      <td className="px-3 py-3">
                        {device.osLicenseStatus ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            device.osLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            device.osLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            device.osLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {device.osLicenseStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{device.msOffice || '-'}</td>
                      <td className="px-3 py-3">
                        {device.msOfficeLicenseStatus ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            device.msOfficeLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            device.msOfficeLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            device.msOfficeLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {device.msOfficeLicenseStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{device.pdfReader || '-'}</td>
                      <td className="px-3 py-3">
                        {device.pdfReaderLicenseStatus ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            device.pdfReaderLicenseStatus === 'Original' ? 'bg-green-100 text-green-700' :
                            device.pdfReaderLicenseStatus === 'Trial' ? 'bg-yellow-100 text-yellow-700' :
                            device.pdfReaderLicenseStatus === 'Bajakan' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {device.pdfReaderLicenseStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          device.performaPerangkat === 'Baik' ? 'bg-green-100 text-green-700' :
                          device.performaPerangkat === 'Cukup' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {device.performaPerangkat}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate text-slate-500 font-medium" title={device.keterangan}>
                        {device.keterangan || '-'}
                      </td>
                      <td className="px-3 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setIsFormOpen(true);
                          }}
                          disabled={!editable}
                          className={`p-2 rounded-lg border transition-all ${
                            editable 
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-gov-600 border-slate-200' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          }`}
                          title={editable ? "Edit Perangkat" : "Akses Edit Dibatasi"}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          disabled={!editable}
                          className={`p-2 rounded-lg border transition-all ${
                            editable 
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-100' 
                              : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          }`}
                          title={editable ? "Hapus Perangkat" : "Akses Hapus Dibatasi"}
                        >
                          <Trash2 size={13} />
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
