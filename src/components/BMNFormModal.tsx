// src/components/BMNFormModal.tsx
import React, { useState, useEffect } from 'react';
import { BMNItem, User } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { useUsers } from '../contexts/UsersContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, ShieldAlert } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface BMNFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BMNItem>, id?: string) => Promise<void>;
  item?: BMNItem | null; // If provided, we are editing
}

const BMNFormModal: React.FC<BMNFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item
}) => {
  const { allUsers } = useUsers();
  const { currentUser } = useAuth();
  
  // Satker dropdown options
  const [availableSatkers, setAvailableSatkers] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingSatkers, setLoadingSatkers] = useState(false);

  // Form fields states
  const [kodeBarang, setKodeBarang] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [jenisBMN, setJenisBMN] = useState('');
  const [merk, setMerk] = useState('');
  const [tipe, setTipe] = useState('');
  const [statusBMN, setStatusBMN] = useState<'Aktif' | 'Tidak Aktif' | 'Hilang' | 'Rusak'>('Aktif');
  const [kondisi, setKondisi] = useState<'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('Baik');
  const [nilaiPerolehan, setNilaiPerolehan] = useState('');
  const [tahunPerolehan, setTahunPerolehan] = useState('');
  const [tanggalPerolehan, setTanggalPerolehan] = useState('');
  const [umurAset, setUmurAset] = useState('');
  const [jumlah, setJumlah] = useState('1');
  const [satuan, setSatuan] = useState('Unit');
  const [luas, setLuas] = useState('');
  const [namaSatker, setNamaSatker] = useState('');
  const [heldBy, setHeldBy] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kota, setKota] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [nomorRegister, setNomorRegister] = useState('');
  const [nup, setNup] = useState('');
  const [nomorSertifikat, setNomorSertifikat] = useState('');
  const [tanggalSertifikat, setTanggalSertifikat] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch satkers on mount or open
  useEffect(() => {
    const fetchSatkers = async () => {
      if (!currentUser) return;
      setLoadingSatkers(true);
      try {
        const { data, error } = await supabase
          .from('master_divisi')
          .select('name')
          .eq('is_active', true)
          .order('name');
        
        if (!error && data) {
          const allSatkers = data.map(d => ({ value: d.name, label: d.name }));
          
          if (currentUser.role === 'Super Admin') {
            setAvailableSatkers(allSatkers);
          } else {
            // Get user's editable satkers
            const { data: editorsData } = await supabase
              .from('bmn_editors')
              .select('nama_satker')
              .eq('user_id', currentUser.id);
            
            const editableNames = new Set((editorsData || []).map(e => e.nama_satker.toLowerCase().trim()));
            const filtered = allSatkers.filter(s => editableNames.has(s.value.toLowerCase().trim()));
            setAvailableSatkers(filtered);
            
            // If creating new item and only 1 satker available, auto select it
            if (!item && filtered.length === 1) {
              setNamaSatker(filtered[0].value);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching satkers:', err);
      } finally {
        setLoadingSatkers(false);
      }
    };

    if (isOpen) {
      fetchSatkers();
    }
  }, [isOpen, currentUser, item]);

  // Populate fields if editing
  useEffect(() => {
    if (item) {
      setKodeBarang(item.kodeBarang || '');
      setNamaBarang(item.namaBarang || '');
      setJenisBMN(item.jenisBMN || '');
      setMerk(item.merk || '');
      setTipe(item.tipe || '');
      setStatusBMN(item.statusBMN || 'Aktif');
      setKondisi(item.kondisi || 'Baik');
      setNilaiPerolehan(item.nilaiPerolehan ? String(item.nilaiPerolehan) : '');
      setTahunPerolehan(item.tahunPerolehan ? String(item.tahunPerolehan) : '');
      setTanggalPerolehan(item.tanggalPerolehan ? item.tanggalPerolehan.split('T')[0] : '');
      setUmurAset(item.umurAset !== undefined && item.umurAset !== null ? String(item.umurAset) : '');
      setJumlah(item.jumlah ? String(item.jumlah) : '1');
      setSatuan(item.satuan || 'Unit');
      setLuas(item.luas ? String(item.luas) : '');
      setNamaSatker(item.namaSatker || '');
      setHeldBy(item.heldBy || '');
      setAlamat(item.alamat || '');
      setKota(item.kota || '');
      setProvinsi(item.provinsi || '');
      setNomorRegister(item.nomorRegister || '');
      setNup(item.nup || '');
      setNomorSertifikat(item.nomorSertifikat || '');
      setTanggalSertifikat(item.tanggalSertifikat ? item.tanggalSertifikat.split('T')[0] : '');
      setKeterangan(item.keterangan || '');
    } else {
      // Clear form for new item
      setKodeBarang('');
      setNamaBarang('');
      setJenisBMN('');
      setMerk('');
      setTipe('');
      setStatusBMN('Aktif');
      setKondisi('Baik');
      setNilaiPerolehan('');
      setTahunPerolehan('');
      setTanggalPerolehan('');
      setUmurAset('');
      setJumlah('1');
      setSatuan('Unit');
      setLuas('');
      setNamaSatker('');
      setHeldBy('');
      setAlamat('');
      setKota('');
      setProvinsi('');
      setNomorRegister('');
      setNup('');
      setNomorSertifikat('');
      setTanggalSertifikat('');
      setKeterangan('');
    }
    setErrors({});
  }, [item, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!kodeBarang.trim()) newErrors.kodeBarang = 'Kode barang wajib diisi';
    if (!namaBarang.trim()) newErrors.namaBarang = 'Nama barang wajib diisi';
    if (!namaSatker) newErrors.namaSatker = 'Satker wajib dipilih';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const selectedUser = allUsers.find(u => u.id === heldBy);
      const bmnData: Partial<BMNItem> = {
        kodeBarang: kodeBarang.trim(),
        namaBarang: namaBarang.trim(),
        jenisBMN: jenisBMN.trim() || undefined,
        merk: merk.trim() || undefined,
        tipe: tipe.trim() || undefined,
        statusBMN,
        kondisi: kondisi || undefined,
        nilaiPerolehan: nilaiPerolehan ? Number(nilaiPerolehan) : undefined,
        tahunPerolehan: tahunPerolehan ? Number(tahunPerolehan) : undefined,
        tanggalPerolehan: tanggalPerolehan || undefined,
        umurAset: umurAset ? Number(umurAset) : undefined,
        jumlah: jumlah ? Number(jumlah) : 1,
        satuan: satuan.trim() || undefined,
        luas: luas ? Number(luas) : undefined,
        namaSatker,
        heldBy: heldBy || null,
        holder: selectedUser ? { id: selectedUser.id, name: selectedUser.name } : null,
        alamat: alamat.trim() || undefined,
        kota: kota.trim() || undefined,
        provinsi: provinsi.trim() || undefined,
        nomorRegister: nomorRegister.trim() || undefined,
        nup: nup.trim() || undefined,
        nomorSertifikat: nomorSertifikat.trim() || undefined,
        tanggalSertifikat: tanggalSertifikat || undefined,
        keterangan: keterangan.trim() || undefined
      };

      await onSave(bmnData, item?.id);
      onClose();
    } catch (err) {
      console.error('Error saving BMN:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white">
            {item ? 'Edit Aset BMN' : 'Tambah Aset BMN Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-1.5 border-b border-slate-200 uppercase tracking-wide">
              Informasi Utama BMN
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kode Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={kodeBarang}
                  onChange={(e) => setKodeBarang(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${
                    errors.kodeBarang ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-300 focus:ring-2 focus:ring-gov-200'
                  }`}
                  placeholder="Contoh: 3.02.01.01.002"
                />
                {errors.kodeBarang && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.kodeBarang}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nama Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${
                    errors.namaBarang ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-300 focus:ring-2 focus:ring-gov-200'
                  }`}
                  placeholder="Contoh: Laptop ASUS ROG Zephyrus"
                />
                {errors.namaBarang && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.namaBarang}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Jenis BMN</label>
                <input
                  type="text"
                  value={jenisBMN}
                  onChange={(e) => setJenisBMN(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: Peralatan & Mesin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Merk</label>
                <input
                  type="text"
                  value={merk}
                  onChange={(e) => setMerk(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: ASUS"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tipe</label>
                <input
                  type="text"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: ROG Zephyrus G14"
                />
              </div>
            </div>
          </div>

          {/* Status, Kondisi, dan Penugasan */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-1.5 border-b border-slate-200 uppercase tracking-wide">
              Status, Kondisi, & Penugasan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Status BMN</label>
                <select
                  value={statusBMN}
                  onChange={(e) => setStatusBMN(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                  <option value="Hilang">Hilang</option>
                  <option value="Rusak">Rusak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Kondisi Fisik</label>
                <select
                  value={kondisi}
                  onChange={(e) => setKondisi(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                >
                  <option value="Baik">Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Satker Penanggung Jawab <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={availableSatkers}
                  value={namaSatker}
                  onChange={setNamaSatker}
                  placeholder={loadingSatkers ? "Memuat satker..." : "Pilih Satker..."}
                  emptyOption="Pilih Satker"
                  className={errors.namaSatker ? 'border-rose-400' : ''}
                />
                {errors.namaSatker && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.namaSatker}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pegawai Pemegang Barang
                </label>
                <SearchableSelect
                  options={allUsers.map(u => ({ value: u.id, label: `${u.name} (${u.jabatan || 'Pegawai'})` }))}
                  value={heldBy}
                  onChange={setHeldBy}
                  placeholder="Pilih Pegawai Pemegang..."
                  emptyOption="Tidak Ada Pemegang (Belum Ditugaskan)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">NUP</label>
                <input
                  type="text"
                  value={nup}
                  onChange={(e) => setNup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nomor Register</label>
                <input
                  type="text"
                  value={nomorRegister}
                  onChange={(e) => setNomorRegister(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: 000021"
                />
              </div>
            </div>
          </div>

          {/* Nilai dan Fisik */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-1.5 border-b border-slate-200 uppercase tracking-wide">
              Data Keuangan & Atribut Fisik
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nilai Perolehan (Rp)</label>
                <input
                  type="number"
                  value={nilaiPerolehan}
                  onChange={(e) => setNilaiPerolehan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Masukkan nominal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tahun Perolehan</label>
                <input
                  type="number"
                  value={tahunPerolehan}
                  onChange={(e) => setTahunPerolehan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: 2024"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tanggal Perolehan</label>
                <input
                  type="date"
                  value={tanggalPerolehan}
                  onChange={(e) => setTanggalPerolehan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Umur Aset (Tahun)</label>
                <input
                  type="number"
                  value={umurAset}
                  onChange={(e) => setUmurAset(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: 5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Jumlah</label>
                <input
                  type="number"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Default: 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Satuan</label>
                <input
                  type="text"
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: Unit, buah, meter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Luas (m²)</label>
                <input
                  type="number"
                  value={luas}
                  onChange={(e) => setLuas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Untuk tanah/bangunan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nomor Sertifikat</label>
                <input
                  type="text"
                  value={nomorSertifikat}
                  onChange={(e) => setNomorSertifikat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Masukkan no sertifikat"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tanggal Sertifikat</label>
                <input
                  type="date"
                  value={tanggalSertifikat}
                  onChange={(e) => setTanggalSertifikat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Lokasi dan Tambahan */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-1.5 border-b border-slate-200 uppercase tracking-wide">
              Lokasi & Keterangan Tambahan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Masukkan alamat lokasi barang"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Kota/Kabupaten</label>
                <input
                  type="text"
                  value={kota}
                  onChange={(e) => setKota(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: Jakarta Pusat"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Provinsi</label>
                <input
                  type="text"
                  value={provinsi}
                  onChange={(e) => setProvinsi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none"
                  placeholder="Contoh: DKI Jakarta"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Keterangan / Catatan</label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-200 outline-none resize-none"
                  placeholder="Tambahkan catatan khusus mengenai kondisi barang atau riwayatnya..."
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldAlert size={14} className="text-amber-500" />
            <span>Pastikan Satker terisi dengan benar untuk hak akses editing.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-bold hover:bg-slate-50 transition-all"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
              disabled={isSaving}
            >
              <Save size={16} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMNFormModal;
