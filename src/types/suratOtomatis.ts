// Types untuk fitur pembuatan surat otomatis

export type SuratTemplateType = 'surat-keterangan-umum' | 'daftar-hadir' | 'simperjadin';

export interface SuratTemplate {
  id: SuratTemplateType;
  name: string;
  description: string;
  fileName: string; // Nama file template di /public
  fields: SuratTemplateField[];
  previewInstructions?: string; // Instruksi untuk preview
}

export interface SuratTemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'multi-date' | 'select' | 'number' | 'time' | 'user-select' | 'user-atasan-select';
  placeholder?: string;
  required: boolean;
  options?: string[]; // Untuk type 'select'
  defaultValue?: string;
  maxLength?: number;
  helpText?: string;
  dependsOn?: string; // Field ini muncul jika field lain memiliki value tertentu
  showWhen?: string; // Value yang harus ada di dependsOn field
  autoFillFrom?: string; // Auto-fill dari field lain (e.g., 'user.jabatan')
  readOnly?: boolean; // Field read-only (auto-filled)
}

export interface SuratFormData {
  templateId: SuratTemplateType;
  fields: Record<string, string | number>;
  generatedBy: string; // User ID
  generatedAt: string; // ISO Date
}

export const SIMPERJADIN_COMMON_FIELDS: SuratTemplateField[] = [
  // === DOKUMEN SELECTOR ===
  {
    id: 'jenis_dokumen_simperjadin',
    label: 'Pilih Jenis Dokumen SIMPERJADIN',
    type: 'select',
    options: [
      'Semua (1 File Tergabung)',
      'Semua (3 File Terpisah)',
      'Kwitansi (Tanda Pengeluaran)',
      'Rincian Biaya Perjalanan Dinas',
      'Daftar Pengeluaran Riil'
    ],
    required: true,
    defaultValue: 'Semua (1 File Tergabung)',
    helpText: 'Pilih dokumen yang ingin dihasilkan dan diunduh'
  },
  {
    id: 'format_output',
    label: 'Format Ekspor Dokumen',
    type: 'select',
    options: [
      'Word (.docx)',
      'PDF (.pdf)'
    ],
    required: true,
    defaultValue: 'Word (.docx)',
    helpText: 'Pilih format file hasil ekspor (Word .docx atau PDF .pdf)'
  },

  // === BAGIAN DOKUMEN & SPD ===
  {
    id: 'nomor_spd',
    label: 'Nomor SPD',
    type: 'text',
    placeholder: 'Contoh: SPD-223/Setmen.Birohmu/HM.01.02/10/2025',
    required: true,
    defaultValue: '',
    helpText: 'Nomor Surat Perjalanan Dinas'
  },
  {
    id: 'tanggal_spd',
    label: 'Tanggal SPD',
    type: 'date',
    required: true,
    defaultValue: '',
    helpText: 'Tanggal penerbitan SPD'
  },
  {
    id: 'maksud_perjalanan_dinas',
    label: 'Maksud Perjalanan Dinas',
    type: 'textarea',
    placeholder: 'Contoh: Menghadiri Kegiatan Rapat Koordinasi Terbatas...',
    required: true,
    defaultValue: '',
    helpText: 'Maksud/tujuan kegiatan perjalanan dinas'
  },
  {
    id: 'tanggal_mulai_perjadin',
    label: 'Tanggal Mulai Pelaksanaan Perjadin',
    type: 'date',
    required: true,
    defaultValue: '',
    helpText: 'Pilih tanggal mulai perjalanan dinas'
  },
  {
    id: 'tanggal_selesai_perjadin',
    label: 'Tanggal Selesai Pelaksanaan Perjadin',
    type: 'date',
    required: true,
    defaultValue: '',
    helpText: 'Pilih tanggal selesai perjalanan dinas'
  },
  {
    id: 'periode_perjadin',
    label: 'Periode Pelaksanaan Perjadin (Teks / Otomatis)',
    type: 'text',
    placeholder: 'Contoh: 13 Agustus 2025 s/d 15 Agustus 2025',
    required: false,
    defaultValue: '',
    helpText: 'Terisi otomatis dari Tanggal Mulai & Selesai di atas (atau bisa disesuaikan manual)'
  },
  {
    id: 'mata_anggaran',
    label: 'Mata Anggaran (MAK)',
    type: 'text',
    placeholder: 'Pilih dari Monitoring Anggaran atau ketik manual...',
    required: true,
    defaultValue: '',
    helpText: 'Pilih dari Monitoring Anggaran (POK) atau ketik/edit kode MAK manual'
  },
  {
    id: 'tanggal_dibayarkan',
    label: 'Tanggal Dibayarkan / Dibuat',
    type: 'date',
    required: true,
    defaultValue: '',
    helpText: 'Tanggal pembayaran / pembuatan kwitansi'
  },
  {
    id: 'pembukuan_no',
    label: 'Pembukuan No',
    type: 'text',
    placeholder: 'Contoh: .........',
    required: false,
    defaultValue: '',
    helpText: 'Nomor pembukuan (kosongkan jika belum ada)'
  },

  // === BAGIAN PEGAWAI DAN PEJABAT PENANDATANGANAN ===
  // 1. Pegawai (Yang Melakukan Perjadin)
  {
    id: 'pegawai_user_id',
    label: 'Pilih Pegawai (Yang Melakukan Perjadin)',
    type: 'user-select',
    placeholder: 'Cari nama pegawai...',
    required: false,
    helpText: 'Pegawai yang bertugas/menerima uang'
  },
  {
    id: 'nama_pegawai',
    label: 'Nama Pegawai',
    type: 'text',
    placeholder: 'Contoh: CHRYSTIANTO BUDI MULYONO',
    required: true,
    autoFillFrom: 'pegawai_user_id.name',
    defaultValue: ''
  },
  {
    id: 'nip_pegawai',
    label: 'NIP Pegawai',
    type: 'text',
    placeholder: 'Contoh: 198012112009021001',
    required: false,
    autoFillFrom: 'pegawai_user_id.nip',
    defaultValue: ''
  },

  // 2. Bendahara Pengeluaran
  {
    id: 'bendahara_user_id',
    label: 'Pilih Bendahara Pengeluaran',
    type: 'user-select',
    placeholder: 'Cari nama bendahara...',
    required: false,
    helpText: 'Pilih dari user untuk mengisi data bendahara'
  },
  {
    id: 'nama_bendahara',
    label: 'Nama Bendahara Pengeluaran',
    type: 'text',
    placeholder: 'Contoh: PUSPA SARI NATADIRDJA',
    required: true,
    autoFillFrom: 'bendahara_user_id.name',
    defaultValue: 'PUSPA SARI NATADIRDJA'
  },
  {
    id: 'nip_bendahara',
    label: 'NIP Bendahara Pengeluaran',
    type: 'text',
    placeholder: 'Contoh: 198808062010122001',
    required: false,
    autoFillFrom: 'bendahara_user_id.nip',
    defaultValue: '198808062010122001'
  },

  // 3. Pejabat Pembuat Komitmen (PPK)
  {
    id: 'ppk_user_id',
    label: 'Pilih Pejabat Pembuat Komitmen (PPK)',
    type: 'user-atasan-select',
    placeholder: 'Cari nama PPK...',
    required: false,
    helpText: 'Pilih dari user role Atasan'
  },
  {
    id: 'nama_ppk',
    label: 'Nama PPK',
    type: 'text',
    placeholder: 'Contoh: R. AHMAD AFFANDI RAHADIAN',
    required: true,
    autoFillFrom: 'ppk_user_id.name',
    defaultValue: 'R. AHMAD AFFANDI RAHADIAN'
  },
  {
    id: 'nip_ppk',
    label: 'NIP PPK',
    type: 'text',
    placeholder: 'Contoh: 198703292006041001',
    required: false,
    autoFillFrom: 'ppk_user_id.nip',
    defaultValue: '198703292006041001'
  },

  // === BAGIAN RINCIAN BIAYA ===
  {
    id: 'hari_harian',
    label: 'Jumlah Hari Uang Harian',
    type: 'number',
    placeholder: 'Contoh: 1',
    required: true,
    defaultValue: '',
    helpText: 'Jumlah hari uang harian'
  },
  {
    id: 'tarif_harian',
    label: 'Tarif Uang Harian (Rp)',
    type: 'number',
    placeholder: 'Contoh: 430000',
    required: true,
    defaultValue: '',
    helpText: 'Nominal per hari'
  },
  {
    id: 'hari_penginapan',
    label: 'Jumlah Hari Penginapan',
    type: 'number',
    placeholder: 'Contoh: 1',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_penginapan',
    label: 'Tarif Penginapan (Rp)',
    type: 'number',
    placeholder: 'Contoh: 750000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'asal_transport1',
    label: 'Transport 1 (Asal)',
    type: 'text',
    placeholder: 'Contoh: DKI JAKARTA',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tujuan_transport1',
    label: 'Transport 1 (Tujuan)',
    type: 'text',
    placeholder: 'Contoh: JAWA BARAT',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_transport1',
    label: 'Total Transport 1 (Rp)',
    type: 'number',
    placeholder: 'Contoh: 350000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'asal_transport2',
    label: 'Transport 2 (Asal)',
    type: 'text',
    placeholder: 'Contoh: JAWA BARAT',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tujuan_transport2',
    label: 'Transport 2 (Tujuan)',
    type: 'text',
    placeholder: 'Contoh: DKI JAKARTA',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_transport2',
    label: 'Total Transport 2 (Rp)',
    type: 'number',
    placeholder: 'Contoh: 350000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'hari_representatif',
    label: 'Jumlah Hari Uang Representatif',
    type: 'number',
    placeholder: 'Contoh: 1',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_representatif',
    label: 'Tarif Uang Representatif (Rp)',
    type: 'number',
    placeholder: 'Contoh: 150000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_airport_tax',
    label: 'Uang Airport Tax (Rp)',
    type: 'number',
    placeholder: 'Contoh: 100000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'riil_transport_taksi',
    label: 'Transport Taksi Kantor - B/S/T (Riil) (Rp)',
    type: 'number',
    placeholder: 'Contoh: 122685',
    required: false,
    defaultValue: '',
    helpText: 'Nilai transport riil taksi kantor'
  },
  {
    id: 'riil_transport_lokasi',
    label: 'Transport Taksi B/S/T - Lokasi (Riil) (Rp)',
    type: 'number',
    placeholder: 'Contoh: 150000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'riil_transport_kota',
    label: 'Transport Kota/Kab. (Riil) (Rp)',
    type: 'number',
    placeholder: 'Contoh: 200000',
    required: false,
    defaultValue: ''
  },
  {
    id: 'tarif_sewa_kendaraan',
    label: 'Sewa Kendaraan Roda 4 (Rp)',
    type: 'number',
    placeholder: 'Contoh: 600000',
    required: false,
    defaultValue: ''
  }
];

// Template definitions
export const SURAT_TEMPLATES: SuratTemplate[] = [
  {
    id: 'surat-keterangan-umum',
    name: 'Surat Keterangan Umum',
    description: 'Template surat keterangan untuk berbagai keperluan (lupa check in, sakit, dll)',
    fileName: 'surat-keterangan.docx',
    previewInstructions: 'Preview akan menampilkan surat dengan data yang Anda isi. Syntax ${nomor_naskah}, ${tanggal_naskah}, dll akan tetap dipertahankan dan tidak perlu diisi.',
    fields: [
      // === BAGIAN 1: DATA PENANDATANGAN ===
      {
        id: 'penandatangan_user_id',
        label: 'Pilih Penandatangan',
        type: 'user-atasan-select',
        placeholder: 'Cari nama penandatangan...',
        required: true,
        helpText: 'Pilih dari user dengan role Atasan'
      },
      {
        id: 'penandatangan_nama',
        label: 'Nama Penandatangan',
        type: 'text',
        required: true,
        readOnly: true,
        autoFillFrom: 'penandatangan_user_id.name',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      {
        id: 'penandatangan_nip',
        label: 'NIP Penandatangan',
        type: 'text',
        placeholder: 'NIP akan terisi otomatis',
        required: false,
        readOnly: true,
        autoFillFrom: 'penandatangan_user_id.nip',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      {
        id: 'penandatangan_jabatan',
        label: 'Jabatan Penandatangan',
        type: 'text',
        required: true,
        readOnly: true,
        autoFillFrom: 'penandatangan_user_id.jabatan',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      
      // === BAGIAN 2: DATA PEGAWAI ===
      {
        id: 'pegawai_user_id',
        label: 'Pilih Pegawai',
        type: 'user-select',
        placeholder: 'Cari nama pegawai...',
        required: true,
        helpText: 'Pilih dari semua user'
      },
      {
        id: 'nama_lengkap',
        label: 'Nama Lengkap Pegawai',
        type: 'text',
        required: true,
        readOnly: true,
        autoFillFrom: 'pegawai_user_id.name',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      {
        id: 'nip',
        label: 'NIP Pegawai',
        type: 'text',
        placeholder: 'NIP akan terisi otomatis',
        required: false,
        readOnly: true,
        autoFillFrom: 'pegawai_user_id.nip',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      {
        id: 'pangkat_golongan',
        label: 'Pangkat/Golongan',
        type: 'text',
        placeholder: 'Contoh: Penata Muda Tk.I / III/b',
        required: true,
        helpText: 'Isi pangkat dan golongan pegawai'
      },
      {
        id: 'jabatan',
        label: 'Jabatan Pegawai',
        type: 'text',
        required: true,
        readOnly: true,
        autoFillFrom: 'pegawai_user_id.jabatan',
        helpText: 'Otomatis terisi dari user yang dipilih'
      },
      
      // === BAGIAN 3: KETERANGAN ===
      {
        id: 'tanggal_kejadian',
        label: 'Tanggal Kejadian',
        type: 'date',
        required: true,
        helpText: 'Hari akan otomatis terisi dari tanggal ini'
      },
      {
        id: 'hari',
        label: 'Hari Kejadian',
        type: 'text',
        required: true,
        readOnly: true,
        autoFillFrom: 'tanggal_kejadian.day',
        helpText: 'Otomatis terisi dari tanggal kejadian'
      },
      {
        id: 'keterangan',
        label: 'Keterangan/Alasan',
        type: 'textarea',
        placeholder: 'Contoh:\n- lupa melakukan check in karena langsung menghadiri rapat pagi\n- tidak hadir di kantor megenai ijin karena alasan penting',
        required: true,
        maxLength: 500,
        helpText: 'Jelaskan keterangan/alasan dengan lengkap (maks 500 karakter)'
      },
    ],
  },
  {
    id: 'daftar-hadir',
    name: 'Daftar Hadir Kegiatan',
    description: 'Template daftar hadir/presensi peserta rapat atau kegiatan dengan format Excel-like dan dukungan logo instansi',
    fileName: 'daftar-hadir.pdf',
    previewInstructions: 'Preview menampilkan halaman pertama dari daftar hadir (10 baris pertama) dengan logo KPPPA di kiri, teks di tengah, dan logo partner di kanan.',
    fields: [
      {
        id: 'tipe_daftar_hadir',
        label: 'Tipe Daftar Hadir',
        type: 'text',
        placeholder: 'Contoh: PESERTA, NOTULEN, PANITIA',
        required: true,
        defaultValue: 'PESERTA',
        helpText: 'Menentukan judul atas, e.g., DAFTAR HADIR PESERTA'
      },
      {
        id: 'nama_kegiatan',
        label: 'Nama Kegiatan',
        type: 'text',
        placeholder: 'Contoh: PEMBAHASAN INTEGRASI APLIKASI ARSI DENGAN SIMFONI PPA V3 MANAJEMEN KASUS',
        required: true,
        helpText: 'Nama kegiatan/pertemuan'
      },
      {
        id: 'tanggal_kegiatan',
        label: 'Tanggal Kegiatan',
        type: 'multi-date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0],
        helpText: 'Pilih satu atau beberapa tanggal kegiatan'
      },
      {
        id: 'tempat_kegiatan',
        label: 'Tempat Kegiatan (Kota)',
        type: 'text',
        placeholder: 'Contoh: Jakarta',
        required: true,
        defaultValue: 'Jakarta',
        helpText: 'Kota tempat kegiatan diadakan (e.g., Jakarta, 23 Juni 2026)'
      },
      {
        id: 'perlu_rekening',
        label: 'Perlu Rekening Bank?',
        type: 'select',
        options: ['Tidak', 'Ya'],
        required: true,
        defaultValue: 'Tidak',
        helpText: 'Pilih Ya jika ingin menambahkan kolom bank/rekening pada tabel'
      },
      {
        id: 'tanda_tangan_sekaligus',
        label: 'Tanda Tangan Sekaligus?',
        type: 'select',
        options: ['Ya', 'Tidak'],
        required: false,
        defaultValue: 'Ya',
        helpText: 'Pilih Tidak jika ingin menyediakan kolom tanda tangan terpisah untuk setiap tanggal kegiatan'
      },
      {
        id: 'jumlah_baris',
        label: 'Jumlah Baris Daftar Hadir',
        type: 'number',
        placeholder: 'Contoh: 25',
        required: true,
        defaultValue: '20',
        helpText: 'Jumlah baris tanda tangan yang akan dibuat (akan dibagi 10 baris per halaman)'
      }
    ]
  },
  {
    id: 'simperjadin',
    name: 'SIMPERJADIN (Surat Perjalanan Dinas)',
    description: 'Pembuatan Dokumen Perjalanan Dinas (Kwitansi, Rincian Biaya, & Pengeluaran Riil) format Word (.docx) dengan Kop & Logo Resmi KPPPA',
    fileName: 'simperjadin-kwitansi.docx',
    previewInstructions: 'Pilih jenis dokumen SIMPERJADIN yang ingin diunduh (Kwitansi, Rincian Biaya, Pengeluaran Riil, atau Cetak 3 File Sekalisyang)',
    fields: SIMPERJADIN_COMMON_FIELDS
  }
];
