// src/components/BMNDevicesFormModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevice, Satker } from '../../types';
import { BMNDevicesService } from '../services/BMNDevicesService';
import { supabase } from '../lib/supabaseClient';
import { 
  X, Save, Sparkles, Laptop, Monitor, Printer, Copy, FileText,
  Search, Check, RefreshCw, User as UserIcon, AlertCircle 
} from 'lucide-react';

interface BMNDevicesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  item: BMNDevice | null;
}

const BMNDevicesFormModal: React.FC<BMNDevicesFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item
}) => {
  const [satkers, setSatkers] = useState<Satker[]>([]);
  const [isLoadingSatkers, setIsLoadingSatkers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [satkerId, setSatkerId] = useState('');
  const [namaPerangkat, setNamaPerangkat] = useState('Laptop');
  const [jenisKepemilikan, setJenisKepemilikan] = useState<'Kantor' | 'Pribadi'>('Kantor');
  const [kodeBMN, setKodeBMN] = useState('');
  const [tahunPerolehan, setTahunPerolehan] = useState<string>(new Date().getFullYear().toString());
  const [performaPerangkat, setPerformaPerangkat] = useState<'Baik' | 'Cukup' | 'Kurang'>('Baik');
  const [keterangan, setKeterangan] = useState('');

  // Specs
  const [merkType, setMerkType] = useState('');
  const [processor, setProcessor] = useState('');
  const [ram, setRam] = useState('');
  const [vga, setVga] = useState('');
  const [hddSsd, setHddSsd] = useState('');
  const [macWifi, setMacWifi] = useState('');
  const [macLan, setMacLan] = useState('');
  const [antivirusSebelumnya, setAntivirusSebelumnya] = useState('');

  // Software & License
  const [os, setOs] = useState('');
  const [osLicenseStatus, setOsLicenseStatus] = useState('Original');
  const [msOffice, setMsOffice] = useState('');
  const [msOfficeLicenseStatus, setMsOfficeLicenseStatus] = useState('Original');
  const [pdfReader, setPdfReader] = useState('');
  const [pdfReaderLicenseStatus, setPdfReaderLicenseStatus] = useState('Original');
  
  const [copiedName, setCopiedName] = useState(false);

  // Cascading Satker selector states
  const [parentSatkerId, setParentSatkerId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

  const [childSearch, setChildSearch] = useState('');
  const [isChildDropdownOpen, setIsChildDropdownOpen] = useState(false);

  // Searchable combobox employee name states
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Load Satkers
  useEffect(() => {
    const fetchSatkers = async () => {
      setIsLoadingSatkers(true);
      try {
        const list = await BMNDevicesService.getAllSatkers();
        setSatkers(list.filter(s => s.code));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingSatkers(false);
      }
    };
    if (isOpen) {
      fetchSatkers();
    }
  }, [isOpen]);

  // Load editing item details & auto-populate cascading selectors
  useEffect(() => {
    if (item && satkers.length > 0) {
      setNamaPegawai(item.namaPegawai || '');
      setNomorTelepon(item.nomorTelepon || '');
      setUnitKerja(item.unitKerja || '');
      setSatkerId(item.satkerId || '');
      setNamaPerangkat(item.namaPerangkat || 'Laptop');
      setJenisKepemilikan(item.jenisKepemilikan || 'Kantor');
      setKodeBMN(item.kodeBMN || '');
      setTahunPerolehan(item.tahunPerolehan ? item.tahunPerolehan.toString() : '');
      setPerformaPerangkat(item.performaPerangkat || 'Baik');
      setKeterangan(item.keterangan || '');
      setMerkType(item.merkType || '');
      setProcessor(item.processor || '');
      setRam(item.ram || '');
      setVga(item.vga || '');
      setHddSsd(item.hddSsd || '');
      setMacWifi(item.macWifi || '');
      setMacLan(item.macLan || '');
      setAntivirusSebelumnya(item.antivirusSebelumnya || '');
      setOs(item.os || '');
      setOsLicenseStatus(item.osLicenseStatus || 'Original');
      setMsOffice(item.msOffice || '');
      setMsOfficeLicenseStatus(item.msOfficeLicenseStatus || 'Original');
      setPdfReader(item.pdfReader || '');
      setPdfReaderLicenseStatus(item.pdfReaderLicenseStatus || 'Original');

      // Populate parent-child cascading Satkers
      const activeSatker = satkers.find(s => s.id === item.satkerId);
      if (activeSatker) {
        if (activeSatker.parentId) {
          setParentSatkerId(activeSatker.parentId);
          const parent = satkers.find(s => s.id === activeSatker.parentId);
          setParentSearch(parent ? parent.name : '');
          setChildSearch(activeSatker.name);
        } else {
          setParentSatkerId(activeSatker.id);
          setParentSearch(activeSatker.name);
          setChildSearch(activeSatker.name);
        }
      }
    } else if (!item) {
      // Clear form for Add mode
      setNamaPegawai('');
      setNomorTelepon('');
      setUnitKerja('');
      setSatkerId('');
      setParentSatkerId('');
      setParentSearch('');
      setChildSearch('');
      setNamaPerangkat('Laptop');
      setJenisKepemilikan('Kantor');
      setKodeBMN('');
      setTahunPerolehan(new Date().getFullYear().toString());
      setPerformaPerangkat('Baik');
      setKeterangan('');
      setMerkType('');
      setProcessor('');
      setRam('');
      setVga('');
      setHddSsd('');
      setMacWifi('');
      setMacLan('');
      setAntivirusSebelumnya('');
      setOs('');
      setOsLicenseStatus('Original');
      setMsOffice('');
      setMsOfficeLicenseStatus('Original');
      setPdfReader('');
      setPdfReaderLicenseStatus('Original');
    }
  }, [item, isOpen, satkers]);

  // Parent filter computations
  const parentSatkers = useMemo(() => {
    return satkers.filter(s => !s.parentId);
  }, [satkers]);

  const filteredParentSatkers = useMemo(() => {
    if (!parentSearch.trim()) return parentSatkers;
    const searchLower = parentSearch.toLowerCase();
    return parentSatkers.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [parentSatkers, parentSearch]);

  const selectedParentSatker = useMemo(() => {
    return satkers.find(s => s.id === parentSatkerId);
  }, [satkers, parentSatkerId]);

  // Child units filter computations
  const childSatkers = useMemo(() => {
    if (!parentSatkerId) return [];
    return satkers.filter(s => s.parentId === parentSatkerId);
  }, [satkers, parentSatkerId]);

  const filteredChildSatkers = useMemo(() => {
    if (!childSearch.trim()) return childSatkers;
    const searchLower = childSearch.toLowerCase();
    return childSatkers.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [childSatkers, childSearch]);

  const selectedChildSatker = useMemo(() => {
    return satkers.find(s => s.id === satkerId);
  }, [satkers, satkerId]);

  // Auto-fetch employees from unit kerja profiles
  useEffect(() => {
    if (!satkerId) {
      setEmployees([]);
      return;
    }

    const fetchEmployees = async () => {
      const child = satkers.find(s => s.id === satkerId);
      if (!child) return;

      try {
        setIsLoadingEmployees(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('divisi', child.name)
          .order('name', { ascending: true });

        if (!error && data) {
          setEmployees(data);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [satkerId, satkers]);

  const filteredEmployees = useMemo(() => {
    if (!namaPegawai.trim()) return employees;
    const searchLower = namaPegawai.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(searchLower));
  }, [employees, namaPegawai]);

  // Compiled Laptop Name
  const compiledLaptopName = useMemo(() => {
    if (!namaPegawai.trim() || !satkerId) return '';
    const satker = selectedChildSatker;
    if (!satker) return '';

    let indukCode = '00';
    let anakCode = '00';
    let floorCode = satker.floor || '01';

    if (satker.parentId) {
      const parent = satkers.find(s => s.id === satker.parentId);
      indukCode = parent?.code || '00';
      anakCode = satker.code || '00';
    } else {
      indukCode = satker.code || '00';
      anakCode = '00';
    }

    const cleanName = namaPegawai.trim().split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    return `${indukCode}-${anakCode}-${floorCode}-${formattedName}`;
  }, [namaPegawai, satkerId, selectedChildSatker, satkers]);

  const handleCopyCompiledName = () => {
    if (!compiledLaptopName) return;
    navigator.clipboard.writeText(compiledLaptopName);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPegawai.trim()) {
      alert('Nama Pegawai harus diisi!');
      return;
    }
    if (!satkerId) {
      alert('Unit Kerja harus dipilih!');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'> = {
        namaPegawai: namaPegawai.trim(),
        nomorTelepon: nomorTelepon.trim(),
        unitKerja: unitKerja.trim() || (selectedChildSatker ? selectedChildSatker.name : ''),
        satkerId,
        namaPerangkat,
        jenisKepemilikan,
        kodeBMN: jenisKepemilikan === 'Kantor' ? kodeBMN.trim() : '',
        tahunPerolehan: tahunPerolehan ? parseInt(tahunPerolehan) : undefined,
        merkType: merkType.trim(),
        
        // Specs
        processor: ['Laptop', 'PC'].includes(namaPerangkat) ? processor.trim() : '',
        ram: ['Laptop', 'PC'].includes(namaPerangkat) ? ram.trim() : '',
        vga: ['Laptop', 'PC'].includes(namaPerangkat) ? vga.trim() : '',
        hddSsd: ['Laptop', 'PC'].includes(namaPerangkat) ? hddSsd.trim() : '',
        macWifi: ['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) ? macWifi.trim() : '',
        macLan: ['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) ? macLan.trim() : '',
        antivirusSebelumnya: ['Laptop', 'PC'].includes(namaPerangkat) ? antivirusSebelumnya.trim() : '',
        
        // Software
        os: ['Laptop', 'PC'].includes(namaPerangkat) ? os.trim() : '',
        osLicenseStatus: ['Laptop', 'PC'].includes(namaPerangkat) ? osLicenseStatus : '',
        msOffice: ['Laptop', 'PC'].includes(namaPerangkat) ? msOffice.trim() : '',
        msOfficeLicenseStatus: ['Laptop', 'PC'].includes(namaPerangkat) ? msOfficeLicenseStatus : '',
        pdfReader: ['Laptop', 'PC'].includes(namaPerangkat) ? pdfReader.trim() : '',
        pdfReaderLicenseStatus: ['Laptop', 'PC'].includes(namaPerangkat) ? pdfReaderLicenseStatus : '',
        
        performaPerangkat,
        keterangan: keterangan.trim(),
        penyeragamanNamaLaptop: ['Laptop', 'PC'].includes(namaPerangkat) ? compiledLaptopName : '',
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="bg-gov-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Laptop size={20} />
            {item ? 'Edit Perangkat BMN' : 'Tambah Perangkat Baru'}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Section 1: Pegawai & Satker (aligned with public form) */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-5">
            <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              1. Lokasi Kerja & Identitas
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Satker Dropdown Search */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pilih Satker (Induk) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={parentSearch}
                    onChange={(e) => {
                      setParentSearch(e.target.value);
                      setIsParentDropdownOpen(true);
                    }}
                    onFocus={() => setIsParentDropdownOpen(true)}
                    placeholder={isLoadingSatkers ? "Memuat satker..." : "Ketik untuk mencari Satker..."}
                    disabled={isLoadingSatkers}
                    className="w-full bg-white border border-slate-350 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 transition-all text-xs font-medium"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  {selectedParentSatker && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-150">
                      <Check size={10} /> Terpilih
                    </div>
                  )}
                </div>

                {isParentDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-lg z-50">
                    {filteredParentSatkers.length > 0 ? (
                      filteredParentSatkers.map((s) => {
                        const isSelected = s.id === parentSatkerId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setParentSatkerId(s.id);
                              setParentSearch(s.name);
                              setIsParentDropdownOpen(false);
                              setSatkerId('');
                              setChildSearch('');
                              setNamaPegawai('');
                              setUnitKerja('');
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-xs transition-all border-b border-slate-100 flex items-center justify-between ${
                              isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-805 text-slate-800">{s.name}</div>
                              {s.code && <span className="text-[9px] text-slate-400 font-mono">Kode: {s.code}</span>}
                            </div>
                            {isSelected && <Check size={12} className="text-indigo-600" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-xs text-slate-400">Satker tidak ditemukan</div>
                    )}
                  </div>
                )}
                {isParentDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsParentDropdownOpen(false)} />
                )}
              </div>

              {/* Child Unit Kerja Dropdown Search */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pilih Unit Kerja (Anak Satker) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={childSearch}
                    onChange={(e) => {
                      setChildSearch(e.target.value);
                      setIsChildDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (parentSatkerId) setIsChildDropdownOpen(true);
                    }}
                    placeholder={!parentSatkerId ? "Pilih Satker (Induk) dahulu" : "Cari Unit Kerja..."}
                    disabled={!parentSatkerId}
                    className="w-full bg-white disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-350 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 transition-all text-xs font-medium"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  {selectedChildSatker && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-150">
                      <Check size={10} /> Terpilih
                    </div>
                  )}
                </div>

                {isChildDropdownOpen && parentSatkerId && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-lg z-50">
                    {filteredChildSatkers.length > 0 ? (
                      filteredChildSatkers.map((s) => {
                        const isSelected = s.id === satkerId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSatkerId(s.id);
                              setChildSearch(s.name);
                              setUnitKerja(s.name);
                              setIsChildDropdownOpen(false);
                              setNamaPegawai('');
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 text-xs transition-all border-b border-slate-100 flex items-center justify-between ${
                              isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{s.name}</div>
                              <span className="text-[9px] text-slate-400 font-mono">Kode: {s.code} • Lt: {s.floor || '01'}</span>
                            </div>
                            {isSelected && <Check size={12} className="text-indigo-600" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-xs text-slate-400">Unit kerja tidak ditemukan</div>
                    )}
                  </div>
                )}
                {isChildDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsChildDropdownOpen(false)} />
                )}
              </div>

              {/* Employee Autocomplete Combobox */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nama Lengkap Pegawai <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={namaPegawai}
                    onChange={(e) => {
                      setNamaPegawai(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => {
                      if (satkerId) setIsEmployeeDropdownOpen(true);
                    }}
                    placeholder={!satkerId ? "Pilih Unit Kerja dahulu" : "Ketik nama pegawai..."}
                    disabled={!satkerId}
                    className="w-full bg-white disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-350 rounded-xl pl-9 pr-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 transition-all text-xs font-medium"
                  />
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  {isLoadingEmployees && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={12} />
                  )}
                </div>

                {isEmployeeDropdownOpen && satkerId && !isLoadingEmployees && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto shadow-lg z-50">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => {
                        const isSelected = emp.name === namaPegawai;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setNamaPegawai(emp.name);
                              setIsEmployeeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs transition-all border-b border-slate-100 flex items-center justify-between ${
                              isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 font-medium'
                            }`}
                          >
                            <span>{emp.name}</span>
                            {isSelected && <Check size={12} className="text-indigo-600" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-2.5 text-slate-500 text-[10px] leading-tight">
                        Nama tidak ditemukan. Anda dapat meneruskan mengetik secara manual untuk mendaftarkan nama baru.
                      </div>
                    )}
                  </div>
                )}
                {isEmployeeDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setIsEmployeeDropdownOpen(false)} />
                )}
              </div>

              {/* Nomor Telepon */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={nomorTelepon}
                  onChange={(e) => setNomorTelepon(e.target.value)}
                  placeholder="Contoh: 0812xxxxxxxx"
                  className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 transition-all text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Informasi Perangkat */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-5">
            <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              2. Informasi Perangkat
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Jenis Perangkat
                </label>
                <select
                  value={namaPerangkat}
                  onChange={(e) => setNamaPerangkat(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-350 rounded-xl focus:outline-none focus:border-indigo-500 text-xs font-medium bg-white"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="PC">PC / Desktop</option>
                  <option value="Printer">Printer</option>
                  <option value="Scanner">Scanner</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Jenis Kepemilikan
                </label>
                <div className="flex bg-slate-100 border border-slate-250/50 rounded-xl p-0.5">
                  {(['Kantor', 'Pribadi'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setJenisKepemilikan(opt)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        jenisKepemilikan === opt
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Kode BMN
                </label>
                <input
                  type="text"
                  disabled={jenisKepemilikan === 'Pribadi'}
                  value={kodeBMN}
                  onChange={(e) => setKodeBMN(e.target.value)}
                  placeholder={jenisKepemilikan === 'Pribadi' ? 'Akses Terkunci (Pribadi)' : '3.05.02.01...'}
                  className="w-full bg-white disabled:bg-slate-100 border border-slate-355 border-slate-300 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-mono font-medium disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Tahun Perolehan
                </label>
                <input
                  type="number"
                  value={tahunPerolehan}
                  onChange={(e) => setTahunPerolehan(e.target.value)}
                  className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Merk / Type Perangkat
                </label>
                <input
                  type="text"
                  value={merkType}
                  onChange={(e) => setMerkType(e.target.value)}
                  placeholder="Contoh: Asus ExpertBook / Lenovo ThinkPad L13"
                  className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Specs (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-5 animate-fade-in">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                3. Spesifikasi Hardware
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Processor
                  </label>
                  <input
                    type="text"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    placeholder="Contoh: Intel i5 / Apple M2"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['Intel i5', 'Intel i7', 'Ryzen 5', 'Ryzen 7', 'Apple M1', 'Apple M2'].map(p => {
                      const isSelected = processor === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProcessor(p)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kapasitas RAM
                  </label>
                  <input
                    type="text"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="Contoh: 8 GB / 16 GB"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['4 GB', '8 GB', '16 GB', '32 GB'].map(r => {
                      const isSelected = ram === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRam(r)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    VGA / Kartu Grafis
                  </label>
                  <input
                    type="text"
                    value={vga}
                    onChange={(e) => setVga(e.target.value)}
                    placeholder="Contoh: Intel Iris Xe / NVIDIA MX450"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                    Harddisk / SSD (Penyimpanan)
                  </label>
                  <input
                    type="text"
                    value={hddSsd}
                    onChange={(e) => setHddSsd(e.target.value)}
                    placeholder="Contoh: SSD 512 GB"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['SSD 256 GB', 'SSD 512 GB', 'SSD 1 TB', 'HDD 1 TB'].map(s => {
                      const isSelected = hddSsd === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setHddSsd(s)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Mac Address (WIFI / LAN) */}
          {['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) && (
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4 animate-fade-in">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                {['Laptop', 'PC'].includes(namaPerangkat) ? '4.' : '3.'} Mac Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mac Address (WIFI)
                  </label>
                  <input
                    type="text"
                    value={macWifi}
                    onChange={(e) => setMacWifi(e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mac Address (LAN Cable)
                  </label>
                  <input
                    type="text"
                    value={macLan}
                    onChange={(e) => setMacLan(e.target.value)}
                    placeholder="11:22:33:44:55:66"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Software & Licenses */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-6 animate-fade-in">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                5. Aplikasi & Lisensi
              </h4>

              {/* OS */}
              <div className="border-b border-slate-200/70 pb-5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                      Operating System (OS)
                    </label>
                    <input
                      type="text"
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      placeholder="Contoh: Windows 11 Pro"
                      className="w-full bg-white border border-slate-355 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2.5"
                    />
                    <div className="flex gap-1.5">
                      {['Windows 11', 'Windows 10', 'macOS'].map(item => {
                        const isSelected = os === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setOs(item)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Status Lisensi OS
                    </label>
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-0.5">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setOsLicenseStatus(opt)}
                          className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
                            osLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-650 text-white shadow-sm font-semibold bg-red-600'
                                : 'bg-white text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Office */}
              <div className="border-b border-slate-200/70 pb-5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                      Microsoft Office Version
                    </label>
                    <input
                      type="text"
                      value={msOffice}
                      onChange={(e) => setMsOffice(e.target.value)}
                      placeholder="Contoh: Office Home & Business 2021"
                      className="w-full bg-white border border-slate-355 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2.5"
                    />
                    <div className="flex gap-1.5">
                      {['Office 365', 'Office 2021', 'Office 2019'].map(item => {
                        const isSelected = msOffice === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setMsOffice(item)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-655'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Status Lisensi Office
                    </label>
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-0.5">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMsOfficeLicenseStatus(opt)}
                          className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
                            msOfficeLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-650 text-white shadow-sm font-semibold bg-red-600'
                                : 'bg-white text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Reader */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      PDF Reader
                    </label>
                    <input
                      type="text"
                      value={pdfReader}
                      onChange={(e) => setPdfReader(e.target.value)}
                      placeholder="Contoh: Adobe Acrobat Reader"
                      className="w-full bg-white border border-slate-355 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2.5"
                    />
                    <div className="flex gap-1.5">
                      {['Acrobat Reader', 'Foxit Reader', 'Nitro PDF'].map(item => {
                        const isSelected = pdfReader === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPdfReader(item)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm font-semibold'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Status Lisensi PDF
                    </label>
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-0.5">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPdfReaderLicenseStatus(opt)}
                          className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
                            pdfReaderLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-650 text-white shadow-sm font-semibold bg-red-600'
                                : 'bg-white text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Antivirus */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Antivirus yang Digunakan
                  </label>
                  <input
                    type="text"
                    value={antivirusSebelumnya}
                    onChange={(e) => setAntivirusSebelumnya(e.target.value)}
                    placeholder="Contoh: Kaspersky / Avast / Windows Defender"
                    className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Performa & Keterangan */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-5">
            <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              {['Laptop', 'PC'].includes(namaPerangkat) ? '6.' : '4.'} Performa & Keterangan
            </h4>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Kondisi / Performa Perangkat
              </label>
              <div className="flex bg-slate-100 border border-slate-250/50 rounded-xl p-0.5">
                {(['Baik', 'Cukup', 'Kurang'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPerformaPerangkat(opt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      performaPerangkat === opt
                        ? opt === 'Baik' ? 'bg-green-600 text-white shadow-sm font-semibold' : 
                          opt === 'Cukup' ? 'bg-yellow-500 text-slate-900 shadow-sm' : 'bg-red-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505 mb-1.5">
                Keterangan Tambahan
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keluhan atau catatan mengenai perangkat..."
                rows={3}
                className="w-full bg-white border border-slate-350 rounded-xl px-4 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-medium"
              />
            </div>
          </div>

          {/* Naming code layout */}
          {['Laptop', 'PC'].includes(namaPerangkat) && compiledLaptopName && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-indigo-900 animate-slide-up">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 block mb-0.5">
                  Kode Penyeragaman Nama Laptop:
                </span>
                <span className="font-mono text-base font-semibold text-indigo-850 tracking-wide break-all">
                  {compiledLaptopName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCompiledName}
                className="bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 text-xs px-4 py-2 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                <Copy size={13} />
                <span>{copiedName ? 'Tersalin' : 'Salin Kode'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-semibold text-xs"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gov-600 text-white rounded-xl hover:bg-gov-700 transition-all font-semibold text-xs flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perangkat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BMNDevicesFormModal;
