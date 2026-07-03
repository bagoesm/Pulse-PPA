// src/components/BMNDevicesFormModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevice, Satker } from '../../types';
import { BMNDevicesService } from '../services/BMNDevicesService';
import { X, Save, Sparkles, Laptop, Monitor, Printer, Copy, FileText } from 'lucide-react';

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

  // Load editing item details
  useEffect(() => {
    if (item) {
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
    } else {
      // Clear Form for Add mode
      setNamaPegawai('');
      setNomorTelepon('');
      setUnitKerja('');
      setSatkerId('');
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
  }, [item, isOpen]);

  // Selected Satker
  const selectedSatker = useMemo(() => {
    return satkers.find(s => s.id === satkerId);
  }, [satkers, satkerId]);

  // Compiled Laptop Name
  const compiledLaptopName = useMemo(() => {
    if (!namaPegawai.trim() || !satkerId) return '';
    const satker = selectedSatker;
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
  }, [namaPegawai, satkerId, selectedSatker, satkers]);

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
      alert('Satuan Kerja harus dipilih!');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'> = {
        namaPegawai: namaPegawai.trim(),
        nomorTelepon: nomorTelepon.trim(),
        unitKerja: unitKerja.trim() || (selectedSatker ? selectedSatker.name : ''),
        satkerId,
        namaPerangkat,
        jenisKepemilikan,
        kodeBMN: jenisKepemilikan === 'Kantor' ? kodeBMN.trim() : '',
        tahunPerolehan: tahunPerolehan ? parseInt(tahunPerolehan) : undefined,
        merkType: merkType.trim(),
        processor: ['Laptop', 'PC'].includes(namaPerangkat) ? processor.trim() : '',
        ram: ['Laptop', 'PC'].includes(namaPerangkat) ? ram.trim() : '',
        vga: ['Laptop', 'PC'].includes(namaPerangkat) ? vga.trim() : '',
        hddSsd: ['Laptop', 'PC'].includes(namaPerangkat) ? hddSsd.trim() : '',
        macWifi: ['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) ? macWifi.trim() : '',
        macLan: ['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) ? macLan.trim() : '',
        antivirusSebelumnya: ['Laptop', 'PC'].includes(namaPerangkat) ? antivirusSebelumnya.trim() : '',
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Pegawai & Satker */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
              Pegawai & Satuan Kerja
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nama Pegawai <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaPegawai}
                  onChange={(e) => setNamaPegawai(e.target.value)}
                  placeholder="cth: Bagoes Mulya"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  value={nomorTelepon}
                  onChange={(e) => setNomorTelepon(e.target.value)}
                  placeholder="cth: 08123xxx"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Satuan Kerja (Satker) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={satkerId}
                  onChange={(e) => setSatkerId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium bg-white"
                >
                  <option value="">-- Pilih Satker --</option>
                  {satkers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Kode: {s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Unit Kerja
                </label>
                <input
                  type="text"
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  placeholder="cth: Tim Database"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Informasi Perangkat */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
              Informasi Perangkat
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Jenis Perangkat
                </label>
                <select
                  value={namaPerangkat}
                  onChange={(e) => setNamaPerangkat(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium bg-white"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="PC">PC / Desktop</option>
                  <option value="Printer">Printer</option>
                  <option value="Scanner">Scanner</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Jenis Kepemilikan
                </label>
                <select
                  value={jenisKepemilikan}
                  onChange={(e) => setJenisKepemilikan(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium bg-white"
                >
                  <option value="Kantor">Kantor</option>
                  <option value="Pribadi">Pribadi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Kode BMN (Milik Kantor)
                </label>
                <input
                  type="text"
                  disabled={jenisKepemilikan === 'Pribadi'}
                  value={kodeBMN}
                  onChange={(e) => setKodeBMN(e.target.value)}
                  placeholder="3.05.02.01.003..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-mono font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tahun Perolehan
                </label>
                <input
                  type="number"
                  value={tahunPerolehan}
                  onChange={(e) => setTahunPerolehan(e.target.value)}
                  placeholder="cth: 2024"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Merk / Type
                </label>
                <input
                  type="text"
                  value={merkType}
                  onChange={(e) => setMerkType(e.target.value)}
                  placeholder="cth: ThinkPad L13 Gen 4"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Specifications (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
                Spesifikasi Hardware
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Processor
                  </label>
                  <input
                    type="text"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    placeholder="cth: Intel i5 / Ryzen 5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    RAM
                  </label>
                  <input
                    type="text"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="cth: 16 GB"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    VGA
                  </label>
                  <input
                    type="text"
                    value={vga}
                    onChange={(e) => setVga(e.target.value)}
                    placeholder="cth: Intel Iris Xe"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    HDD / SSD
                  </label>
                  <input
                    type="text"
                    value={hddSsd}
                    onChange={(e) => setHddSsd(e.target.value)}
                    placeholder="cth: SSD 512 GB"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: LAN & WIFI MAC (Laptop/PC/Printer/Scanner) */}
          {['Laptop', 'PC', 'Printer', 'Scanner'].includes(namaPerangkat) && (
            <div className="animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
                Mac Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Mac Address (WIFI)
                  </label>
                  <input
                    type="text"
                    value={macWifi}
                    onChange={(e) => setMacWifi(e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Mac Address (LAN)
                  </label>
                  <input
                    type="text"
                    value={macLan}
                    onChange={(e) => setMacLan(e.target.value)}
                    placeholder="11:22:33:44:55:66"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Software & Licenses (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && (
            <div className="animate-fade-in space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-200">
                Aplikasi & Status Lisensi
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* OS */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-600 uppercase">Operating System</div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Nama OS</label>
                    <input
                      type="text"
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      placeholder="cth: Windows 11 Pro"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Lisensi OS</label>
                    <select
                      value={osLicenseStatus}
                      onChange={(e) => setOsLicenseStatus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    >
                      <option value="Original">Original</option>
                      <option value="Trial">Trial</option>
                      <option value="Bajakan">Bajakan</option>
                      <option value="Tidak Ada">Tidak Ada</option>
                    </select>
                  </div>
                </div>

                {/* Microsoft Office */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-600 uppercase">Microsoft Office</div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Versi Office</label>
                    <input
                      type="text"
                      value={msOffice}
                      onChange={(e) => setMsOffice(e.target.value)}
                      placeholder="cth: Office LTSC 2021"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Lisensi Office</label>
                    <select
                      value={msOfficeLicenseStatus}
                      onChange={(e) => setMsOfficeLicenseStatus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    >
                      <option value="Original">Original</option>
                      <option value="Trial">Trial</option>
                      <option value="Bajakan">Bajakan</option>
                      <option value="Tidak Ada">Tidak Ada</option>
                    </select>
                  </div>
                </div>

                {/* PDF Reader */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-600 uppercase">PDF Reader</div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Aplikasi PDF</label>
                    <input
                      type="text"
                      value={pdfReader}
                      onChange={(e) => setPdfReader(e.target.value)}
                      placeholder="cth: Adobe Acrobat DC"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Lisensi PDF</label>
                    <select
                      value={pdfReaderLicenseStatus}
                      onChange={(e) => setPdfReaderLicenseStatus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 text-xs bg-white"
                    >
                      <option value="Original">Original</option>
                      <option value="Trial">Trial</option>
                      <option value="Bajakan">Bajakan</option>
                      <option value="Tidak Ada">Tidak Ada</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Antivirus Sebelumnya
                  </label>
                  <input
                    type="text"
                    value={antivirusSebelumnya}
                    onChange={(e) => setAntivirusSebelumnya(e.target.value)}
                    placeholder="cth: Kaspersky / ESET"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Performa & Keterangan */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 pb-1.5 border-b border-slate-200">
              Performa & Keterangan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Performa Perangkat
                </label>
                <select
                  value={performaPerangkat}
                  onChange={(e) => setPerformaPerangkat(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium bg-white"
                >
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang">Kurang</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Keterangan
                </label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Keterangan tambahan..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Live Compiled Uniform Name (Laptop/PC only) */}
          {['Laptop', 'PC'].includes(namaPerangkat) && compiledLaptopName && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-indigo-900 animate-slide-up">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">
                  Live Penyeragaman Nama Laptop:
                </span>
                <span className="font-mono text-base font-extrabold text-indigo-700 tracking-wide break-all">
                  {compiledLaptopName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCompiledName}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 self-start sm:self-center"
              >
                <Copy size={12} />
                <span>{copiedName ? 'Tersalin!' : 'Salin Nama'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <Save size={16} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perangkat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BMNDevicesFormModal;
