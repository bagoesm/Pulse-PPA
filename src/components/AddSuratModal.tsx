// src/components/AddSuratModal.tsx
import React, { useState } from 'react';
import { X, FileText, Calendar, Building2, Upload, Link2, Save, Check } from 'lucide-react';
import { Attachment } from '../../types';
import { supabase } from '../lib/supabaseClient';

// Unit organisasi internal
const UNIT_INTERNAL = [
  'Pimpinan',
  'Inspektorat',
  'Menteri Pemberdayaan Perempuan dan Perlindungan Anak',
  'Wakil Menteri Pemberdayaan Perempuan dan Perlindungan Anak (jika diangkat)',
  'Inspektorat',
  'Sekretariat Kementerian dan Biro',
  'Sekretariat Kementerian',
  'Biro Data dan Informasi',
  'Biro Perencanaan dan Keuangan',
  'Biro Hukum dan Kerja Sama',
  'Biro Sumber Daya Manusia dan Organisasi',
  'Biro Hubungan Masyarakat dan Umum',
  'Deputi Bidang',
  'Deputi Bidang Kesetaraan Gender',
  'Deputi Bidang Pemenuhan Hak Anak',
  'Deputi Bidang Perlindungan Hak Perempuan',
  'Deputi Bidang Perlindungan Khusus Anak',
  'Staf Ahli',
  'Staf Ahli Bidang Partisipasi dan Lingkungan Strategis',
  'Staf Ahli Bidang Hubungan Kelembagaan',
  'Staf Ahli Bidang Hukum dan Hak Asasi Manusia'
];

interface AddSuratModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentUserName: string;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AddSuratModal: React.FC<AddSuratModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUserName,
  showNotification
}) => {
  const [jenisSurat, setJenisSurat] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [hal, setHal] = useState('');
  
  // Asal surat - Internal atau Eksternal
  const [asalSuratType, setAsalSuratType] = useState<'Internal' | 'Eksternal'>('Eksternal');
  const [asalSuratInternal, setAsalSuratInternal] = useState('');
  const [asalSuratEksternal, setAsalSuratEksternal] = useState('');
  
  const [tujuanSurat, setTujuanSurat] = useState('');
  const [klasifikasiSurat, setKlasifikasiSurat] = useState('');
  const [jenisNaskah, setJenisNaskah] = useState('');
  const [bidangTugas, setBidangTugas] = useState('');
  const [disposisi, setDisposisi] = useState('');
  const [hasilTindakLanjut, setHasilTindakLanjut] = useState('');
  const [sifatSurat, setSifatSurat] = useState(''); // Biasa, Segera, Sangat Segera, Rahasia
  const [tanggalDiterima, setTanggalDiterima] = useState(''); // Untuk surat masuk
  const [tanggalDikirim, setTanggalDikirim] = useState(''); // Untuk surat keluar
  
  // Tanggal kegiatan (opsional) - jika diisi, akan muncul di jadwal
  const [tanggalKegiatan, setTanggalKegiatan] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('09:00');
  const [waktuSelesai, setWaktuSelesai] = useState('10:00');
  
  // File upload states
  const [suratFile, setSuratFile] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    let uploadedFilePath: string | null = null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      uploadedFilePath = filePath;

      // Use 'attachment' bucket (same as meetings)
      const { error: uploadError } = await supabase.storage
        .from('attachment')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachment')
        .getPublicUrl(filePath);

      setSuratFile({
        id: `file_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        url: publicUrl,
        isLink: false
      });

      showNotification('File Berhasil Diupload', file.name, 'success');
    } catch (error: any) {
      // Cleanup uploaded file if there's an error
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('attachment').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      showNotification('Gagal Upload File', error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    if (!linkUrl || !linkTitle) {
      showNotification('Link Tidak Lengkap', 'Mohon isi judul dan URL link', 'warning');
      return;
    }

    setSuratFile({
      id: `link_${Date.now()}`,
      name: linkTitle,
      size: 0,
      type: 'link',
      path: '',
      url: linkUrl,
      isLink: true
    });

    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
    showNotification('Link Ditambahkan', linkTitle, 'success');
  };

  const handleRemoveFile = async () => {
    if (suratFile && !suratFile.isLink && suratFile.path) {
      try {
        await supabase.storage.from('attachment').remove([suratFile.path]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    setSuratFile(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!jenisSurat || !nomorSurat || !tanggalSurat) {
      showNotification('Data Tidak Lengkap', 'Jenis surat, nomor surat, dan tanggal surat wajib diisi', 'warning');
      return;
    }

    if (!suratFile) {
      showNotification('File Surat Belum Diupload', 'Mohon upload file surat atau tambahkan link', 'warning');
      return;
    }

    // Determine asal surat based on type
    const finalAsalSurat = jenisSurat === 'Masuk' 
      ? (asalSuratType === 'Internal' ? asalSuratInternal : asalSuratEksternal)
      : null;

    try {
      // Save to surats table (not meetings)
      const suratPayload = {
        jenis_surat: jenisSurat,
        nomor_surat: nomorSurat,
        tanggal_surat: tanggalSurat,
        hal: hal || null,
        asal_surat: finalAsalSurat,
        tujuan_surat: jenisSurat === 'Keluar' ? (tujuanSurat || null) : null,
        klasifikasi_surat: klasifikasiSurat || null,
        jenis_naskah: jenisNaskah || null,
        sifat_surat: sifatSurat || null,
        bidang_tugas: bidangTugas || null,
        tanggal_diterima: jenisSurat === 'Masuk' ? (tanggalDiterima || null) : null,
        tanggal_dikirim: jenisSurat === 'Keluar' ? (tanggalDikirim || null) : null,
        disposisi: jenisSurat === 'Masuk' ? (disposisi || null) : null,
        hasil_tindak_lanjut: hasilTindakLanjut || null,
        file_surat: suratFile,
        meeting_id: null, // Will be set if meeting is created
        tanggal_kegiatan: tanggalKegiatan || null,
        waktu_mulai: tanggalKegiatan ? waktuMulai : null,
        waktu_selesai: tanggalKegiatan ? waktuSelesai : null,
        created_by: currentUserName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: suratData, error: suratError } = await supabase
        .from('surats')
        .insert([suratPayload])
        .select()
        .single();

      if (suratError) throw suratError;

      // Auto-create meeting if tanggal_kegiatan is filled
      if (tanggalKegiatan && suratData) {
        try {
          // Determine meeting type based on jenis surat
          const meetingType = jenisSurat === 'Masuk' ? 'external' : 'internal';
          
          // Create meeting title from surat info
          const meetingTitle = hal || `Kegiatan Surat ${nomorSurat}`;
          
          // Determine inviter based on jenis surat
          const inviter = jenisSurat === 'Masuk' 
            ? { id: `inv_${Date.now()}`, name: finalAsalSurat || 'Tidak Diketahui', organization: finalAsalSurat }
            : { id: `inv_${Date.now()}`, name: currentUserName, organization: 'Internal' };
          
          const meetingPayload = {
            title: meetingTitle,
            type: meetingType,
            description: `Kegiatan terkait surat ${nomorSurat}${hal ? `: ${hal}` : ''}`,
            date: tanggalKegiatan,
            start_time: waktuMulai,
            end_time: waktuSelesai,
            location: '',
            is_online: false,
            inviter: inviter,
            invitees: [],
            pic: [currentUserName],
            surat_undangan: jenisSurat === 'Masuk' ? suratFile : null,
            surat_tugas: jenisSurat === 'Keluar' ? suratFile : null,
            attachments: [],
            links: [],
            status: 'scheduled',
            created_by: currentUserName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Surat details
            jenis_surat: jenisSurat,
            nomor_surat: nomorSurat,
            tanggal_surat: tanggalSurat,
            hal: hal,
            asal_surat: finalAsalSurat,
            tujuan_surat: tujuanSurat,
            klasifikasi_surat: klasifikasiSurat,
            jenis_naskah: jenisNaskah,
            bidang_tugas: bidangTugas,
            disposisi: disposisi,
            hasil_tindak_lanjut: hasilTindakLanjut
          };

          const { data: meetingData, error: meetingError } = await supabase
            .from('meetings')
            .insert([meetingPayload])
            .select()
            .single();

          if (meetingError) {
            console.error('Error creating meeting:', meetingError);
            // Don't fail the whole operation, just log
          } else if (meetingData) {
            // Update surat with meeting_id
            await supabase
              .from('surats')
              .update({ meeting_id: meetingData.id, updated_at: new Date().toISOString() })
              .eq('id', suratData.id);
            
            showNotification(
              'Surat & Jadwal Berhasil Ditambahkan', 
              `Surat ${nomorSurat} dan jadwal kegiatan berhasil dibuat`, 
              'success'
            );
          }
        } catch (meetingError: any) {
          console.error('Error creating meeting:', meetingError);
          // Surat already saved, just notify about meeting creation failure
          showNotification(
            'Surat Tersimpan, Jadwal Gagal', 
            `Surat ${nomorSurat} tersimpan, tapi gagal membuat jadwal otomatis`, 
            'warning'
          );
        }
      } else {
        showNotification('Surat Berhasil Ditambahkan', `Surat ${nomorSurat} berhasil disimpan`, 'success');
      }

      onSave();
      handleClose();
    } catch (error: any) {
      showNotification('Gagal Menyimpan Surat', error.message, 'error');
    }
  };

  const handleClose = () => {
    // Reset form
    setJenisSurat('Masuk');
    setNomorSurat('');
    setTanggalSurat('');
    setHal('');
    setAsalSuratType('Eksternal');
    setAsalSuratInternal('');
    setAsalSuratEksternal('');
    setTujuanSurat('');
    setKlasifikasiSurat('');
    setJenisNaskah('');
    setBidangTugas('');
    setDisposisi('');
    setHasilTindakLanjut('');
    setSifatSurat('');
    setTanggalDiterima('');
    setTanggalDikirim('');
    setTanggalKegiatan('');
    setWaktuMulai('09:00');
    setWaktuSelesai('10:00');
    setSuratFile(null);
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <h3 className="text-xl font-bold">Tambah Surat</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Jenis Surat - Prominent */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border-2 border-slate-200">
            <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-gov-600" />
              Jenis Surat <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJenisSurat('Masuk')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  jenisSurat === 'Masuk'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-slate-300 bg-white hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    jenisSurat === 'Masuk' ? 'border-green-600 bg-green-600' : 'border-slate-300'
                  }`}>
                    {jenisSurat === 'Masuk' && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-base font-bold ${jenisSurat === 'Masuk' ? 'text-green-700' : 'text-slate-600'}`}>
                    Surat Masuk
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Surat yang diterima dari pihak eksternal</p>
              </button>
              <button
                type="button"
                onClick={() => setJenisSurat('Keluar')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  jenisSurat === 'Keluar'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-300 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    jenisSurat === 'Keluar' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {jenisSurat === 'Keluar' && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-base font-bold ${jenisSurat === 'Keluar' ? 'text-blue-700' : 'text-slate-600'}`}>
                    Surat Keluar
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Surat yang dikirim ke pihak eksternal</p>
              </button>
            </div>
          </div>

          {/* Informasi Dasar Surat */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              Informasi Dasar
            </h4>

          {/* Nomor Surat & Tanggal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nomor Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                placeholder={jenisSurat === 'Masuk' ? 'Nomor surat dari pengirim' : 'Nomor surat yang diterbitkan'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tanggal Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) => setTanggalSurat(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
              />
            </div>
          </div>

          {/* Tanggal Diterima/Dikirim */}
          <div className="grid grid-cols-2 gap-4">
            {jenisSurat === 'Masuk' ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tanggal Diterima
                </label>
                <input
                  type="date"
                  value={tanggalDiterima}
                  onChange={(e) => setTanggalDiterima(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Tanggal surat diterima oleh instansi</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tanggal Dikirim
                </label>
                <input
                  type="date"
                  value={tanggalDikirim}
                  onChange={(e) => setTanggalDikirim(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Tanggal surat dikirim ke tujuan</p>
              </div>
            )}
            
            {/* Sifat Surat */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Sifat Surat</label>
              <select
                value={sifatSurat}
                onChange={(e) => setSifatSurat(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none bg-white"
              >
                <option value="">Pilih Sifat</option>
                <option value="Biasa">Biasa</option>
                <option value="Segera">Segera</option>
                <option value="Sangat Segera">Sangat Segera</option>
                <option value="Rahasia">Rahasia</option>
              </select>
            </div>
          </div>
          </div>

          {/* Asal/Tujuan & Klasifikasi */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              {jenisSurat === 'Masuk' ? 'Informasi Pengirim' : 'Informasi Penerima'}
            </h4>

          {/* Hal/Perihal */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Hal/Perihal</label>
            <input
              type="text"
              value={hal}
              onChange={(e) => setHal(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
              placeholder="Perihal surat"
            />
          </div>

          {/* Asal/Tujuan Surat & Jenis Naskah */}
          {/* Asal/Tujuan Surat & Jenis Naskah */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {jenisSurat === 'Masuk' ? 'Dari (Pengirim)' : 'Kepada (Penerima)'}
              </label>
              {jenisSurat === 'Masuk' ? (
                <div className="space-y-3">
                  {/* Pilihan Internal/Eksternal */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAsalSuratType('Internal')}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        asalSuratType === 'Internal'
                          ? 'border-gov-500 bg-gov-50 text-gov-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      Internal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsalSuratType('Eksternal')}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        asalSuratType === 'Eksternal'
                          ? 'border-gov-500 bg-gov-50 text-gov-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      Eksternal
                    </button>
                  </div>
                  
                  {/* Input berdasarkan pilihan */}
                  {asalSuratType === 'Internal' ? (
                    <select
                      value={asalSuratInternal}
                      onChange={(e) => setAsalSuratInternal(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none bg-white"
                    >
                      <option value="">Pilih Unit Internal</option>
                      {UNIT_INTERNAL.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={asalSuratEksternal}
                      onChange={(e) => setAsalSuratEksternal(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                      placeholder="Nama K/L/Instansi/Satker pengirim"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={tujuanSurat}
                  onChange={(e) => setTujuanSurat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                  placeholder="Nama K/L/Instansi/Satker tujuan"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Naskah</label>
              <select
                value={jenisNaskah}
                onChange={(e) => setJenisNaskah(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none bg-white"
              >
                <option value="">Pilih Jenis Naskah</option>
                <option value="Surat">Surat</option>
                <option value="Nota Dinas">Nota Dinas</option>
                <option value="Surat Edaran">Surat Edaran</option>
                <option value="Surat Keputusan">Surat Keputusan</option>
                <option value="Surat Perintah">Surat Perintah</option>
                <option value="Surat Tugas">Surat Tugas</option>
                <option value="Surat Undangan">Surat Undangan</option>
                <option value="Disposisi">Disposisi</option>
                <option value="Memorandum">Memorandum</option>
              </select>
            </div>
          </div>

          {/* Klasifikasi & Bidang Tugas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Klasifikasi Surat</label>
              <input
                type="text"
                value={klasifikasiSurat}
                onChange={(e) => setKlasifikasiSurat(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                placeholder="Contoh: Umum, Kepegawaian, Keuangan"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Bidang Tugas/Kerja</label>
              <input
                type="text"
                value={bidangTugas}
                onChange={(e) => setBidangTugas(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                placeholder="Bidang tugas terkait"
              />
            </div>
          </div>
          </div>

          {/* Isi Surat */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              Isi & Tindak Lanjut
            </h4>

          {/* Disposisi - Only for Surat Masuk */}
          {jenisSurat === 'Masuk' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Disposisi/Instruksi Pimpinan
              </label>
              <textarea
                value={disposisi}
                onChange={(e) => setDisposisi(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
                placeholder="Instruksi atau arahan dari pimpinan terkait surat masuk ini..."
              />
            </div>
          )}

          {/* Hasil Tindak Lanjut */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {jenisSurat === 'Masuk' ? 'Hasil Tindak Lanjut' : 'Catatan/Keterangan'}
            </label>
            <textarea
              value={hasilTindakLanjut}
              onChange={(e) => setHasilTindakLanjut(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
              placeholder={jenisSurat === 'Masuk' 
                ? 'Progress dan hasil tindak lanjut dari disposisi...'
                : 'Catatan tambahan terkait surat keluar ini...'
              }
            />
          </div>
          </div>

          {/* Jadwal Kegiatan (Opsional) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Jadwal Kegiatan (Opsional)
              </h4>
              <span className="text-xs text-slate-500 italic">Kosongkan jika tidak ada jadwal</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Info:</strong> Jika tanggal kegiatan diisi, surat ini akan muncul di kalender jadwal kegiatan. 
                Jika dikosongkan, surat hanya akan muncul di Daftar Surat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Kegiatan</label>
                <input
                  type="date"
                  value={tanggalKegiatan}
                  onChange={(e) => setTanggalKegiatan(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                <input
                  type="time"
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  disabled={!tanggalKegiatan}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                <input
                  type="time"
                  value={waktuSelesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  disabled={!tanggalKegiatan}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              Dokumen Surat
            </h4>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              File Surat <span className="text-red-500">*</span>
            </label>
            
            {!suratFile && !showLinkInput && (
              <div className="flex gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-gov-400 hover:bg-gov-50 transition-colors cursor-pointer">
                  <Upload size={18} className="text-gov-600" />
                  <span className="text-sm font-medium text-slate-700">Upload File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Link2 size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Tambah Link</span>
                </button>
              </div>
            )}

            {showLinkInput && !suratFile && (
              <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Judul link"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                />
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLink}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Simpan Link
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkUrl('');
                      setLinkTitle('');
                    }}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {suratFile && (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {suratFile.isLink ? <Link2 size={18} className="text-blue-600" /> : <FileText size={18} className="text-gov-600" />}
                  <span className="text-sm text-slate-700 font-medium">{suratFile.name}</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="text-sm text-slate-500 mt-2">Mengupload file...</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            Simpan Surat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSuratModal;
