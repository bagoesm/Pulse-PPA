// src/components/PublicDeviceForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevicesService } from '../services/BMNDevicesService';
import { supabase } from '../lib/supabaseClient';
import { Satker, BMNDevice } from '../../types';
import { 
  Laptop, Monitor, Printer, Search, Check, 
  CheckCircle, Copy, Sparkles, AlertCircle, 
  RefreshCw, ChevronRight, FileText, Plus, User as UserIcon
} from 'lucide-react';

const PublicDeviceForm: React.FC = () => {
  const [satkers, setSatkers] = useState<Satker[]>([]);
  const [isLoadingSatkers, setIsLoadingSatkers] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  // Form State
  const [namaPegawai, setNamaPegawai] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [satkerId, setSatkerId] = useState(''); // Stores the child satker ID
  const [namaPerangkat, setNamaPerangkat] = useState('Laptop'); // Laptop, PC, Printer, Scanner, Lainnya
  const [jenisKepemilikan, setJenisKepemilikan] = useState<'Kantor' | 'Pribadi'>('Kantor');
  
  // Nomor Barang and NUP instead of Kode BMN
  const [nomorBarang, setNomorBarang] = useState('');
  const [nomorNup, setNomorNup] = useState('');
  const [selectedBmnItem, setSelectedBmnItem] = useState<any | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<{
    registeredName: string;
    registeredProfileId: string | null;
    itemId: string;
  } | null>(null);
  const [syncNameToBmn, setSyncNameToBmn] = useState(false);

  const [tahunPerolehan, setTahunPerolehan] = useState<string>(new Date().getFullYear().toString());
  const [performaPerangkat, setPerformaPerangkat] = useState<'Baik' | 'Cukup' | 'Kurang'>('Baik');
  const [keterangan, setKeterangan] = useState('');
  
  // Specifications (Adaptive)
  const [merkType, setMerkType] = useState('');
  const [processor, setProcessor] = useState('');
  const [ram, setRam] = useState('');
  const [vga, setVga] = useState('');
  const [hddSsd, setHddSsd] = useState('');
  const [macWifi, setMacWifi] = useState('');
  const [macLan, setMacLan] = useState('');
  const [antivirusSebelumnya, setAntivirusSebelumnya] = useState('');
  
  // Apps (Adaptive)
  const [os, setOs] = useState('');
  const [osLicenseStatus, setOsLicenseStatus] = useState('Original');
  const [msOffice, setMsOffice] = useState('');
  const [msOfficeLicenseStatus, setMsOfficeLicenseStatus] = useState('Original');
  const [pdfReader, setPdfReader] = useState('');
  const [pdfReaderLicenseStatus, setPdfReaderLicenseStatus] = useState('Original');

  // Multi-step Satker Selection State
  const [parentSatkerId, setParentSatkerId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);

  const [childSearch, setChildSearch] = useState('');
  const [isChildDropdownOpen, setIsChildDropdownOpen] = useState(false);

  // Auto-fetched Employees State
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedName, setCopiedName] = useState(false);

  // Fetch Satkers on load
  useEffect(() => {
    const loadSatkers = async () => {
      try {
        setIsLoadingSatkers(true);
        const list = await BMNDevicesService.getAllSatkers();
        // Filter only active Satkers that have codes
        setSatkers(list.filter(s => s.code));
      } catch (err) {
        console.error('Failed to load satkers:', err);
        setErrorMessage('Gagal memuat daftar Satuan Kerja. Silakan muat ulang halaman.');
      } finally {
        setIsLoadingSatkers(false);
      }
    };
    loadSatkers();
  }, []);

  // Look up BMN item by owner name
  const lookupBmnByOwner = async (ownerName: string) => {
    if (!ownerName.trim()) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', ownerName.trim())
        .limit(1);

      const profileId = profileData?.[0]?.id;
      if (!profileId) return;

      const { data: items } = await supabase
        .from('bmn_items')
        .select('id, kode_barang, nup, merk, tipe')
        .eq('held_by', profileId)
        .limit(1);

      if (items && items.length > 0) {
        setNomorBarang(items[0].kode_barang || '');
        setNomorNup(items[0].nup || '');
        setSelectedBmnItem(items[0]);
        setMismatchWarning(null);

        // Auto-fill Brand/Type
        const brandType = [items[0].merk, items[0].tipe].filter(Boolean).join(' ');
        if (brandType) {
          setMerkType(brandType);
        }
      }
    } catch (err) {
      console.error('Error looking up BMN by owner:', err);
    }
  };

  // Look up BMN item by asset code and NUP
  const lookupBmnByAsset = async (barangCode: string, nupCode: string) => {
    if (!barangCode.trim() || !nupCode.trim()) return;
    try {
      const { data: items } = await supabase
        .from('bmn_items')
        .select('*, profiles:held_by(id, name)')
        .eq('kode_barang', barangCode.trim())
        .eq('nup', nupCode.trim())
        .limit(1);

      if (items && items.length > 0) {
        const item = items[0];
        setSelectedBmnItem(item);
        
        // Auto-fill Brand/Type
        const brandType = [item.merk, item.tipe].filter(Boolean).join(' ');
        if (brandType) {
          setMerkType(brandType);
        }
        
        const registeredName = item.profiles?.name || '';
        
        if (registeredName && registeredName.toLowerCase() !== namaPegawai.trim().toLowerCase()) {
          setMismatchWarning({
            registeredName,
            registeredProfileId: item.profiles?.id || null,
            itemId: item.id
          });
        } else {
          setMismatchWarning(null);
        }
      } else {
        setSelectedBmnItem(null);
        setMismatchWarning(null);
      }
    } catch (err) {
      console.error('Error looking up BMN by asset:', err);
    }
  };

  // Sync BMN registry owner name
  const syncBmnRegistryName = async (profileId: string | null, ownerName: string, bmnItemId: string) => {
    try {
      let targetProfileId = profileId;
      if (!targetProfileId) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id')
          .eq('name', ownerName.trim())
          .limit(1);
        if (profs && profs.length > 0) {
          targetProfileId = profs[0].id;
        }
      }
      
      if (targetProfileId) {
        await supabase
          .from('bmn_items')
          .update({ held_by: targetProfileId })
          .eq('id', bmnItemId);
      }
    } catch (err) {
      console.error('Error updating BMN registry owner:', err);
    }
  };

  // Auto check mismatch when assets are typed
  useEffect(() => {
    if (nomorBarang.trim() && nomorNup.trim()) {
      lookupBmnByAsset(nomorBarang, nomorNup);
    } else {
      setMismatchWarning(null);
    }
  }, [nomorBarang, nomorNup, namaPegawai]);

  // Debounced search when owner name is entered
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (namaPegawai.trim() && !isEmployeeDropdownOpen) {
        lookupBmnByOwner(namaPegawai);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [namaPegawai, isEmployeeDropdownOpen]);

  // Filter Parent Satkers (parentId is null or empty)
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

  // Filter Child Satkers based on selected parent
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

  // Auto-fetch employees when child Satker is selected
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
        console.error('Failed to load employees for division:', err);
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [satkerId, satkers]);

  // Filter employees based on name input
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

  // Copy compiled name to clipboard
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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newDevice: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'> = {
        namaPegawai: namaPegawai.trim(),
        nomorTelepon: nomorTelepon.trim(),
        unitKerja: childSearch.trim() || (selectedChildSatker ? selectedChildSatker.name : ''),
        satkerId: parentSatkerId,
        namaPerangkat,
        jenisKepemilikan,
        kodeBMN: jenisKepemilikan === 'Kantor' ? `${nomorBarang.trim()} - ${nomorNup.trim()}` : '',
        tahunPerolehan: tahunPerolehan ? parseInt(tahunPerolehan) : undefined,
        
        // Specs
        merkType: merkType.trim(),
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
        
        // Perform & Keterangan
        performaPerangkat,
        keterangan: keterangan.trim(),
        penyeragamanNamaLaptop: ['Laptop', 'PC'].includes(namaPerangkat) ? compiledLaptopName : '',
        createdBy: undefined
      };

      await BMNDevicesService.createDevice(newDevice);

      // Sync name back to master BMN registry if approved by user
      if (syncNameToBmn && mismatchWarning && mismatchWarning.itemId) {
        const matchedEmp = employees.find(emp => emp.name === namaPegawai.trim());
        await syncBmnRegistryName(matchedEmp?.id || null, namaPegawai, mismatchWarning.itemId);
      }
      
      setSubmittedName(compiledLaptopName);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan saat mengirim data. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to add another device
  const handleResetForm = () => {
    setIsSubmitted(false);
    setNamaPegawai('');
    setNomorTelepon('');
    setUnitKerja('');
    setSatkerId('');
    setParentSatkerId('');
    setParentSearch('');
    setChildSearch('');
    setEmployees([]);
    setNamaPerangkat('Laptop');
    setJenisKepemilikan('Kantor');
    setNomorBarang('');
    setNomorNup('');
    setSelectedBmnItem(null);
    setMismatchWarning(null);
    setSyncNameToBmn(false);
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
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 sm:p-8">
        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl w-full max-w-lg text-center shadow-lg animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-semibold mb-2 tracking-tight text-slate-900">Data Terkirim</h2>
          <p className="text-slate-500 mb-6 text-sm">Terima kasih atas partisipasi Anda dalam pengisian inventori perangkat.</p>
          
          {submittedName && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                KODE LAPTOP SERAGAM ANDA:
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg text-indigo-750 font-semibold tracking-wide break-all">
                  {submittedName}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(submittedName);
                    setCopiedName(true);
                    setTimeout(() => setCopiedName(false), 2000);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-350 text-slate-700 text-xs px-3.5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Copy size={13} />
                  <span>{copiedName ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic">
                * Gunakan kode di atas sebagai nama komputer Anda untuk standarisasi.
              </p>
            </div>
          )}

          <button
            onClick={handleResetForm}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Input Perangkat Lain</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Minimalist Header */}
      <div className="bg-white border-b border-slate-200 py-6 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-650 border border-indigo-100 shrink-0">
              <Laptop size={26} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 leading-tight">Formulir Inventori Perangkat</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Pendataan laptop, PC, dan perangkat pendukung kerja</p>
            </div>
          </div>
          <span className="text-xs bg-slate-100 text-slate-650 font-semibold px-4 py-2 rounded-full border border-slate-200 w-fit self-start sm:self-center">
            Akses Publik
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* CARD 1: Identitas User & Unit */}
          <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-6 shadow-sm">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>1.</span> Lokasi Kerja & Identitas
            </h3>

            {/* Cascading Selector: 1. Satker (Parent) */}
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" size={16} />
                {selectedParentSatker && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded border border-indigo-150">
                    <Check size={12} /> Terpilih
                  </div>
                )}
              </div>

              {/* Parent Dropdown */}
              {isParentDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-56 overflow-y-auto shadow-lg z-50">
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
                            
                            // Reset child selection
                            setSatkerId('');
                            setChildSearch('');
                            setNamaPegawai('');
                            setUnitKerja('');
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 text-xs transition-all border-b border-slate-100 flex items-center justify-between ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                            {s.code && <span className="text-[10px] text-slate-450 font-mono mt-0.5 block">Kode: {s.code}</span>}
                          </div>
                          {isSelected && <Check size={14} className="text-indigo-600" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400">
                      Satker tidak ditemukan
                    </div>
                  )}
                </div>
              )}

              {/* Backdrop */}
              {isParentDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsParentDropdownOpen(false)} />
              )}
            </div>

            {/* Cascading Selector: 2. Unit Kerja (Anak Satker) */}
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
                  placeholder={
                    !parentSatkerId 
                      ? "Pilih Satker (Induk) terlebih dahulu" 
                      : "Ketik untuk mencari Unit Kerja..."
                  }
                  disabled={!parentSatkerId}
                  className="w-full bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" size={16} />
                {selectedChildSatker && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded border border-indigo-150">
                    <Check size={12} /> Terpilih
                  </div>
                )}
              </div>

              {/* Child Dropdown */}
              {isChildDropdownOpen && parentSatkerId && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-56 overflow-y-auto shadow-lg z-50">
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
                            
                            // Reset employee search
                            setNamaPegawai('');
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 text-xs transition-all border-b border-slate-100 flex items-center justify-between ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                            <span className="text-[10px] text-slate-450 font-mono mt-0.5 block">Kode: {s.code} • Lantai: {s.floor || '01'}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-indigo-600" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3.5 text-center text-xs text-slate-400">
                      Unit kerja tidak ditemukan
                    </div>
                  )}
                </div>
              )}

              {/* Backdrop */}
              {isChildDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsChildDropdownOpen(false)} />
              )}
            </div>

            {/* Searchable Combobox: Nama Pegawai */}
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
                  placeholder={
                    !satkerId 
                      ? "Pilih Unit Kerja terlebih dahulu" 
                      : "Ketik nama Anda (klik dari daftar atau input baru jika tidak ada)"
                  }
                  disabled={!satkerId}
                  className="w-full bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                />
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" size={16} />
                {isLoadingEmployees && (
                  <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-450" size={14} />
                )}
              </div>

              {/* Employee Autocomplete Dropdown */}
              {isEmployeeDropdownOpen && satkerId && !isLoadingEmployees && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl max-h-56 overflow-y-auto shadow-lg z-50">
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
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 text-sm transition-all border-b border-slate-100 flex items-center justify-between ${
                            isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 font-medium'
                          }`}
                        >
                          <span>{emp.name}</span>
                          {isSelected && <Check size={14} className="text-indigo-600" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-slate-500 text-xs leading-relaxed border-b border-slate-150">
                      Nama tidak ditemukan di Unit Kerja ini. Anda dapat meneruskan mengetik secara manual untuk **mendaftarkan nama baru**.
                    </div>
                  )}
                </div>
              )}

              {/* Backdrop */}
              {isEmployeeDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsEmployeeDropdownOpen(false)} />
              )}
            </div>

            {/* Nomor Telepon */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1.5">
                Nomor HP / WhatsApp
              </label>
              <input
                type="tel"
                value={nomorTelepon}
                onChange={(e) => setNomorTelepon(e.target.value)}
                placeholder="Contoh: 0812xxxxxxxx"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* CARD 2: Info Perangkat */}
          <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-6 shadow-sm">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>2.</span> Informasi Perangkat
            </h3>

            {/* Segmented controls for Perangkat */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Jenis Perangkat
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {['Laptop', 'PC', 'Printer', 'Scanner', 'Lainnya'].map((type) => {
                  const isActive = namaPerangkat === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNamaPerangkat(type)}
                      className={`py-3.5 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-1.5 ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'
                      }`}
                    >
                      {type === 'Laptop' && <Laptop size={16} />}
                      {type === 'PC' && <Monitor size={16} />}
                      {type === 'Printer' && <Printer size={16} />}
                      {type === 'Scanner' && <FileText size={16} />}
                      {type === 'Lainnya' && <Sparkles size={16} />}
                      <span className="text-[11px] uppercase tracking-wide">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Segmented control for Kepemilikan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Jenis Kepemilikan
                </label>
                <div className="flex bg-slate-100 border border-slate-250/50 rounded-xl p-1">
                  {(['Kantor', 'Pribadi'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setJenisKepemilikan(opt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        jenisKepemilikan === opt
                          ? 'bg-white text-indigo-750 text-indigo-700 shadow-sm border border-slate-200/50 font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-550 mb-2">
                  Tahun Perolehan
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2030"
                  value={tahunPerolehan}
                  onChange={(e) => setTahunPerolehan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium"
                />
              </div>
            </div>

            {/* Nomor Barang & Nomor NUP (Kantor Only) */}
            {jenisKepemilikan === 'Kantor' && (
              <div className="space-y-4 animate-slide-down">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nomor Barang <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomorBarang}
                      onChange={(e) => setNomorBarang(e.target.value)}
                      placeholder="Contoh: 3.05.02.01.003"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Nomor NUP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomorNup}
                      onChange={(e) => setNomorNup(e.target.value)}
                      placeholder="Contoh: 0023"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Warning Nama Pemilik vs BMN */}
                {mismatchWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3 animate-fade-in text-xs">
                    <div className="flex gap-2.5 items-start text-amber-800">
                      <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={16} />
                      <div>
                        <h5 className="font-semibold text-sm">Perbedaan Nama Pemilik dengan Daftar BMN</h5>
                        <p className="mt-1 leading-normal text-amber-700 text-[11px]">
                          Aset ini terdaftar di master BMN atas nama: 
                          <strong className="block text-amber-900 mt-0.5 text-xs">{mismatchWarning.registeredName}</strong>
                        </p>
                        <p className="mt-1.5 leading-normal text-amber-700 text-[11px]">
                          Sedangkan nama pengguna di form ini adalah:
                          <strong className="block text-slate-900 mt-0.5 text-xs">{namaPegawai}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNamaPegawai(mismatchWarning.registeredName);
                          setMismatchWarning(null);
                          setSyncNameToBmn(false);
                        }}
                        className="bg-white hover:bg-slate-50 border border-amber-300 text-amber-700 px-3 py-1.5 rounded-xl font-semibold transition-all text-[10px] shadow-sm"
                      >
                        Gunakan Nama Daftar BMN di Form
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSyncNameToBmn(true);
                        }}
                        className={`border px-3 py-1.5 rounded-xl font-semibold transition-all text-[10px] shadow-sm ${
                          syncNameToBmn
                            ? 'bg-amber-600 border-amber-600 text-white font-semibold'
                            : 'bg-white hover:bg-slate-50 border-amber-300 text-amber-700'
                        }`}
                      >
                        {syncNameToBmn ? '✓ Nama di BMN Akan Diupdate' : 'Ubah Nama di Daftar BMN'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMismatchWarning(null);
                          setSyncNameToBmn(false);
                        }}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-xl font-medium transition-all text-[10px] shadow-sm"
                      >
                        Biarkan Berbeda
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Brand/Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Merk / Type Perangkat
              </label>
              <input
                type="text"
                value={merkType}
                onChange={(e) => setMerkType(e.target.value)}
                placeholder="Contoh: Asus ExpertBook / Lenovo ThinkPad L13"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* CARD 3: Specs (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-6 shadow-sm animate-fade-in">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>3.</span> Spesifikasi Hardware
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Processor
                  </label>
                  <input
                    type="text"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    placeholder="Contoh: Intel Core i5 / Apple M2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                  />
                  {/* Clean modern presets */}
                  <div className="flex flex-wrap gap-2">
                    {['Intel i5', 'Intel i7', 'Ryzen 5', 'Ryzen 7', 'Apple M1', 'Apple M2'].map(p => {
                      const isSelected = processor === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProcessor(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-750 text-indigo-700 font-semibold shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['4 GB', '8 GB', '16 GB', '32 GB'].map(r => {
                      const isSelected = ram === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRam(r)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-750 text-indigo-700 font-semibold shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium"
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
                    placeholder="Contoh: SSD 512 GB / HDD 1 TB"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['SSD 256 GB', 'SSD 512 GB', 'SSD 1 TB', 'HDD 1 TB'].map(s => {
                      const isSelected = hddSsd === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setHddSsd(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-750 text-indigo-700 font-semibold shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
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

          {/* CARD 4: Mac Address (WIFI / LAN) */}
          {['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) && (
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-6 shadow-sm animate-fade-in">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>{['Laptop', 'PC'].includes(namaPerangkat) ? '4.' : '3.'}</span> Mac Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Mac Address (WIFI)
                  </label>
                  <input
                    type="text"
                    value={macWifi}
                    onChange={(e) => setMacWifi(e.target.value)}
                    placeholder="Format: AA:BB:CC:DD:EE:FF"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-mono font-medium"
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
                    placeholder="Format: 11:22:33:44:55:66"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CARD 5: Apps & Licenses (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-8 shadow-sm animate-fade-in">
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>5.</span> Aplikasi & Lisensi
              </h3>

              {/* OS */}
              <div className="border-b border-slate-100 pb-5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Operating System (OS)
                    </label>
                    <input
                      type="text"
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      placeholder="Contoh: Windows 11 Pro"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                    />
                    <div className="flex gap-2">
                      {['Windows 11', 'Windows 10', 'macOS'].map(item => {
                        const isSelected = os === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setOs(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-900 shadow-sm'
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
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-1">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setOsLicenseStatus(opt)}
                          className={`flex-1 min-w-[65px] py-2 rounded-lg text-[10px] font-semibold transition-all ${
                            osLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-600 text-white shadow-sm font-semibold'
                                : 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 font-semibold'
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
              <div className="border-b border-slate-100 pb-5 space-y-3.5">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                    />
                    <div className="flex gap-2">
                      {['Office 365', 'Office 2021', 'Office 2019'].map(item => {
                        const isSelected = msOffice === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setMsOffice(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-655 hover:text-slate-900 shadow-sm'
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
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-1">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setMsOfficeLicenseStatus(opt)}
                          className={`flex-1 min-w-[65px] py-2 rounded-lg text-[10px] font-semibold transition-all ${
                            msOfficeLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-600 text-white shadow-sm font-semibold'
                                : 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 font-semibold'
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium mb-2.5"
                    />
                    <div className="flex gap-2">
                      {['Acrobat Reader', 'Foxit Reader', 'Nitro PDF'].map(item => {
                        const isSelected = pdfReader === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPdfReader(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-sm'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
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
                    <div className="flex flex-wrap bg-slate-100 border border-slate-200/55 rounded-xl p-1">
                      {['Original', 'Trial', 'Bajakan', 'Tidak Ada'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPdfReaderLicenseStatus(opt)}
                          className={`flex-1 min-w-[65px] py-2 rounded-lg text-[10px] font-semibold transition-all ${
                            pdfReaderLicenseStatus === opt
                              ? opt === 'Bajakan'
                                ? 'bg-red-600 text-white shadow-sm font-semibold'
                                : 'bg-white text-indigo-700 shadow-sm border border-slate-200/50 font-semibold'
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

              {/* Extra specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-505 mb-1.5">
                    Antivirus yang Digunakan
                  </label>
                  <input
                    type="text"
                    value={antivirusSebelumnya}
                    onChange={(e) => setAntivirusSebelumnya(e.target.value)}
                    placeholder="Contoh: Kaspersky / Avast / Windows Defender"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CARD 6: Performance */}
          <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl space-y-6 shadow-sm">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>{['Laptop', 'PC'].includes(namaPerangkat) ? '6.' : '4.'}</span> Performa & Keterangan
            </h3>

            {/* Segmented control for Performa */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Kondisi / Performa Perangkat
              </label>
              <div className="flex bg-slate-100 border border-slate-250/50 rounded-xl p-1">
                {(['Baik', 'Cukup', 'Kurang'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPerformaPerangkat(opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      performaPerangkat === opt
                        ? opt === 'Baik' ? 'bg-green-600 text-white shadow-sm font-semibold' : 
                          opt === 'Cukup' ? 'bg-yellow-500 text-slate-900 shadow-sm border border-slate-300/40 font-semibold' : 'bg-red-650 text-white shadow-sm font-semibold bg-red-600'
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
                Keterangan Tambahan
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tuliskan keluhan atau catatan tambahan mengenai perangkat kerja Anda..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 focus:bg-white text-sm font-medium"
              />
            </div>
          </div>

          {/* Sticky compilation panel for Laptops/PC */}
          {['Laptop', 'PC'].includes(namaPerangkat) && compiledLaptopName && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 shadow-md sticky bottom-6 z-30 text-indigo-900 animate-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                className="bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 text-xs px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                <Copy size={13} />
                <span>{copiedName ? 'Tersalin' : 'Salin Kode'}</span>
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-base font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <span>Kirim Pendataan Perangkat</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicDeviceForm;
