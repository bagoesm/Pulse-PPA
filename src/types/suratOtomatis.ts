// Types untuk fitur pembuatan surat otomatis

export type SuratTemplateType = 'surat-keterangan-umum';

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
  type: 'text' | 'textarea' | 'date' | 'select' | 'number' | 'time' | 'user-select' | 'user-atasan-select';
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
        required: true,
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
        required: true,
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
        placeholder: 'Contoh:\n- lupa melakukan check in karena langsung menghadiri rapat pagi\n- tidak hadir di kantor karena sakit demam\n- diberikan ijin karena alasan penting',
        required: true,
        maxLength: 500,
        helpText: 'Jelaskan keterangan/alasan dengan lengkap (maks 500 karakter)'
      },
    ],
  },
];
