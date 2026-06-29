export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export enum Status {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Pending = 'Pending',
  Review = 'Review',
  Done = 'Done',
}

export enum Category {
  PengembanganAplikasi = 'Pengembangan Aplikasi',
  SuratDokumen = 'Dokumen',
  AudiensiRapat = 'Audiensi/Rapat',
  PermintaanSatker = 'Permintaan Satker',
  TindakLanjut = 'Tindak Lanjut',
  Administrasi = 'Administrasi',
  Monitoring = 'Monitoring',
  Lainnya = 'Lainnya',
}

export type FeedbackCategory = 'Fitur Baru' | 'Bug' | 'Peningkatan' | 'Lainnya';

export type FeedbackStatus = 'Open' | 'Planned' | 'In Progress' | 'Done';

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  adminResponse?: string;
  upvotes: string[]; // Array of User IDs
  downvotes: string[]; // Array of User IDs
  createdBy: string; // User Name
  createdAt: string; // ISO Date
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  fileType: string; // e.g., 'docx', 'pdf', 'xlsx'
  fileSize: number; // bytes
  uploadedBy: string;
  updatedAt: string; // ISO Date
  downloadCount: number;
  filePath?: string; // Path to the uploaded file
  fileUrl?: string; // URL for downloading the file
}

export type Role = 'Super Admin' | 'Atasan' | 'Staff';
export type ViewMode = 'Board' | 'Timeline';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  initials: string;
  jabatan?: string; // e.g. "Pranata Komputer Ahli Muda"
  divisi?: string; // Satuan Kerja user, e.g. "Biro Data Dan Informasi"
  nip?: string; // Nomor Induk Pegawai
  password?: string; // For mock auth
  sakuraAnimationEnabled?: boolean; // Setting untuk animasi bunga sakura
  snowAnimationEnabled?: boolean; // Setting untuk animasi salju
  moneyAnimationEnabled?: boolean; // Setting untuk animasi uang
  flowerDecorationEnabled?: boolean; // Setting untuk dekorasi bunga (bunga.svg)
  header_color?: string; // Warna header modal task detail untuk user ini
  profilePhoto?: string; // URL foto profil dari Supabase Storage
  profilePhotoPath?: string; // Path file di bucket
}

// Christmas Decoration Settings
export interface ChristmasDecorationSettings {
  id?: string;
  santaHatEnabled: boolean;
  baubleEnabled: boolean;
  candyEnabled: boolean;
  enabledBy?: string; // Admin who enabled it
  enabledAt?: string; // When it was enabled
}

export type StatusType = 'text' | 'music' | 'mood' | 'activity' | 'location' | 'food';

export interface UserStatus {
  id: string;
  userId: string;
  type: StatusType;
  content: string; // Max 25 words
  emoji?: string; // Optional emoji for mood/activity
  createdAt: string; // ISO Date
  expiresAt: string; // ISO Date (24 hours from creation)
}

export type ProjectStatus = 'In Progress' | 'Pending' | 'Live';

export interface ProjectDefinition {
  id: string;
  name: string;
  manager: string; // The PIC/Manager of the project
  description?: string;
  icon?: string; // Icon name for the project
  color?: string; // Color theme for the project
  targetLiveDate?: string; // ISO Date string - Target go-live date
  status?: ProjectStatus; // Project status
  pinnedLinks?: string[]; // Array of link IDs that are pinned
  share_token?: string | null; // Token untuk berbagi ke publik
}

// Epic - Middle layer between Project and Task
export type EpicStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Epic {
  id: string;
  name: string;
  description?: string;
  projectId: string;          // Parent project
  pic: string[];              // Array of PIC names
  status: EpicStatus;
  startDate: string;          // ISO Date string
  targetDate: string;         // ISO Date string
  color?: string;             // Theme color
  icon?: string;              // Icon name
  createdBy: string;          // User name yang membuat
  createdAt: string;          // ISO Date string
  updatedAt?: string;         // ISO Date string
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;     // <— path file di bucket "attachment"
  url?: string;     // <— signed URL untuk download
  isLink?: boolean; // <— flag untuk menandai ini adalah link, bukan file upload
  suratId?: string; // ID surat jika attachment berasal dari tabel surats
}
export interface TaskLink {
  id: string;
  title: string;
  url: string;
}

// Standalone project links/documents (not from tasks)
export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url?: string;           // For links
  filePath?: string;      // For uploaded files (Supabase storage path)
  fileName?: string;      // Original file name
  type: 'link' | 'document';
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Checklist Item untuk Task
export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
}

export interface Task {
  id: string;
  title: string;
  category: Category; // WAJIB - Task harus memiliki kategori
  categoryId?: string; // FK to master_categories (used for writes)
  subCategory: string;
  subCategoryId?: string; // FK to master_sub_categories (used for writes)
  startDate: string; // ISO Date string - Tanggal mulai
  deadline: string; // ISO Date string - Tanggal selesai
  pic: string[]; // Array of PIC names - Multiple PIC support
  priority: Priority;
  status: Status;
  description: string;
  createdBy: string; // User Name
  projectId?: string; // OPSIONAL - Task boleh tanpa project
  epicId?: string; // OPSIONAL - Task boleh tanpa epic
  attachments: Attachment[];
  links: TaskLink[]; // Links related to the task
  comments?: Comment[]; // OPSIONAL - Comments for the task
  isMeeting?: boolean; // Flag untuk menandai task dari meeting
  meetingId?: string; // ID meeting jika task berasal dari meeting
  blockedBy?: string[]; // Task IDs yang harus selesai sebelum task ini bisa dimulai
  checklists?: ChecklistItem[]; // Daftar checklist items
  subtaskCount?: number; // Jumlah subtask (denormalized for display)
  subtaskDoneCount?: number; // Jumlah subtask yang Done (denormalized for display)
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Subtask - Mini-task di bawah Task (1 level saja, tidak bisa nested)
export interface Subtask {
  id: string;
  parentTaskId: string;        // FK ke Task - WAJIB
  title: string;               // WAJIB
  description?: string;        // Opsional
  pic: string[];               // PIC subtask - bisa berbeda dari parent
  priority: Priority;          // Default inherit dari parent, bisa diubah
  status: Status;              // To Do | In Progress | Pending | Review | Done
  startDate?: string;          // ISO Date - default parent startDate
  deadline?: string;           // ISO Date - default parent deadline
  attachments?: Attachment[];  // Opsional
  checklists?: ChecklistItem[];// Opsional
  sortOrder: number;           // Urutan tampilan
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export const MAX_SUBTASKS_PER_TASK = 20;

export interface FilterState {
  search: string;
  category: Category | 'All';
  pic: string | 'All'; // Keep as string for backward compatibility in filtering
  priority: Priority | 'All';
  status: Status | 'All';
  projectId: string | 'All';
  epicId: string | 'All';
  divisi: string | 'All'; // Filter by division
  sortBy?: 'updated' | 'priority' | 'deadline' | 'title';
}

export interface Comment {
  id: string;
  taskId?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}

export type NotificationType = 'comment' | 'deadline' | 'assignment' | 'meeting_pic' | 'meeting_invitee' | 'meeting_mention' | 'meeting_comment' | 'disposisi_assignment' | 'disposisi_updated' | 'disposisi_deadline';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId: string;
  taskTitle: string;
  meetingId?: string; // For meeting notifications
  meetingTitle?: string; // For meeting notifications
  disposisiId?: string; // For disposisi notifications
  disposisiText?: string; // For disposisi notifications
  isRead: boolean;
  isDismissed: boolean; // Kept for backward compatibility
  createdAt: string;
  expiresAt: string; // Computed: 7 days from createdAt
}

export type AnnouncementType = 'info' | 'success' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: AnnouncementType;
  emoji?: string;
  backgroundColor?: string;
  textColor?: string;
  isActive: boolean;
  createdBy: string; // Admin yang membuat
  createdAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string
  expiresAt?: string; // Optional - pengumuman bisa expired
}

// Data Inventory - untuk menyimpan informasi umum seperti link pelaporan, akun zoom, dll
export interface DataInventoryLink {
  id: string;
  title: string;
  url: string;
}

export interface DataInventoryItem {
  id: string;
  title: string;
  description: string;
  links: DataInventoryLink[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Task Activity Log
export type ActivityType = 'created' | 'status_change' | 'pic_change' | 'priority_change' | 'deadline_change' | 'category_change' | 'checklist_add' | 'checklist_remove' | 'checklist_toggle' | 'checklist_edit';

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  actionType: ActivityType;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

// Meeting/Agenda Types
export type MeetingType = 'internal' | 'external' | 'bimtek' | 'audiensi';

export interface MeetingInviter {
  id: string;
  name: string;
  organization?: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  description?: string;
  date: string; // ISO Date string (Start Date)
  endDate?: string; // ISO Date string (End Date for multi-day meetings)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  location: string;
  isOnline: boolean;
  onlineLink?: string;
  inviter: MeetingInviter; // Yang mengundang
  invitees: string[]; // Daftar undangan (nama)
  pic: string[]; // PIC dari tim kita
  projectId?: string; // Opsional - terkait project
  suratUndangan?: Attachment; // Surat undangan
  suratTugas?: Attachment; // Surat tugas
  laporan?: Attachment; // Laporan hasil rapat
  attachments: Attachment[]; // Lampiran lainnya
  links: TaskLink[]; // Link terkait
  comments?: Comment[]; // OPSIONAL - Comments for the meeting
  notes?: string; // Catatan tambahan
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;

  // Enhanced Surat linking - GUNAKAN INI untuk akses detail surat
  linkedSuratId?: string;             // ID of linked Surat
  linkedSurat?: Surat;                // Populated Surat data (join dari tabel surats)

  // Surat fields (denormalized for easier access)
  jenisSurat?: 'Masuk' | 'Keluar';
  nomorSurat?: string;
  tanggalSurat?: string; // ISO Date
  jenisNaskah?: string;
  klasifikasiSurat?: string;
  bidangTugas?: string;
  hal?: string;
  asalSurat?: string; // Untuk surat masuk
  tujuanSurat?: string; // Untuk surat keluar
  disposisi?: string; // Untuk surat masuk
  hasilTindakLanjut?: string; // Hasil tindak lanjut

  // Disposisi integration
  hasDisposisi?: boolean;             // Flag indicating if Disposisi exists
  disposisiCount?: number;            // Number of Disposisi assignments
  disposisiStatus?: 'Pending' | 'In Progress' | 'Completed' | 'Mixed';
}

export const SIDEBAR_ITEMS = [
  { name: 'Dashboard', icon: 'LayoutDashboard' },
  { name: 'Semua Task', icon: 'ListTodo' },
  { name: 'Project', icon: 'Briefcase' },
  {
    name: 'Surat & Kegiatan',
    icon: 'FolderOpen',
    submenu: [
      { name: 'Jadwal Kegiatan', icon: 'CalendarDays' },
      { name: 'Daftar Surat', icon: 'FileSpreadsheet' },
      { name: 'Daftar Disposisi', icon: 'ClipboardList' },
    ]
  },
  {
    name: 'Realisasi Anggaran',
    icon: 'FileSpreadsheet',
    submenu: [
      { name: 'Dashboard Realisasi', icon: 'LayoutDashboard' },
      { name: 'Monitoring Anggaran', icon: 'PieChart' },
      { name: 'Daftar Transaksi', icon: 'ClipboardList' },
      { name: 'Laporan Anggaran', icon: 'FileText' },
      { name: 'Master Anggaran', icon: 'Database' },
    ]
  },
  { name: 'Inventori Data', icon: 'Database' },
  { name: 'Inventori BMN', icon: 'Package' },
  { name: 'Pelayanan Zoom', icon: 'Video' },
];

// Disposisi - Disposition workflow for Surat-Kegiatan integration
export type DisposisiStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export type DisposisiAction =
  | 'created'
  | 'status_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'reassigned'
  | 'text_updated'
  | 'laporan_uploaded'
  | 'laporan_deleted'
  | 'notes_updated'
  | 'deadline_changed'
  | 'subdisposisi_created';

export interface Disposisi {
  id: string;
  suratId: string;                    // Foreign key to Surat
  kegiatanId: string;                 // Foreign key to Meeting/Kegiatan
  assignedTo: string;                 // User ID of assignee
  disposisiText: string;              // Disposition instructions
  status: DisposisiStatus;            // Current status
  deadline?: string;                  // ISO Date string
  laporan?: Attachment[];             // Report documents
  attachments?: Attachment[];         // Additional attachments
  notes?: string;                     // Additional notes
  createdBy: string;                  // User who created
  createdAt: string;                  // ISO Date string
  updatedAt?: string;                 // ISO Date string
  completedAt?: string;               // ISO Date string
  completedBy?: string;               // User who completed
  parentDisposisiId?: string;         // Parent disposisi ID for subdisposisi (disposisi berantai)
}

export interface DisposisiHistory {
  id: string;
  disposisiId: string;
  action: DisposisiAction;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: string;
}

// Surat - Separate entity from Meeting
export interface Surat {
  id: string;
  jenisSurat: 'Masuk' | 'Keluar';
  nomorSurat: string;
  tanggalSurat: string; // ISO Date
  hal?: string;
  asalSurat?: string; // Untuk surat masuk
  tujuanSurat?: string; // Untuk surat keluar (display string)
  tujuanSuratList?: Array<{ name: string, type: 'Internal' | 'Eksternal' }>; // Structured list with types
  klasifikasiSurat?: string;
  jenisNaskah?: string;
  sifatSurat?: string; // Biasa, Segera, Sangat Segera, Rahasia
  bidangTugas?: string;
  tanggalDiterima?: string; // ISO Date - untuk surat masuk
  tanggalDikirim?: string; // ISO Date - untuk surat keluar
  disposisi?: string; // Untuk surat masuk
  hasilTindakLanjut?: string;
  fileSurat?: Attachment;

  // Relasi ke meeting (opsional)
  meetingId?: string;
  tanggalKegiatan?: string; // ISO Date
  waktuMulai?: string; // HH:mm
  waktuSelesai?: string; // HH:mm

  // New fields for Disposisi integration
  hasDisposisi?: boolean;             // Flag indicating if Disposisi exists
  disposisiCount?: number;            // Number of Disposisi assignments
  disposisiStatus?: 'Pending' | 'In Progress' | 'Completed' | 'Mixed';

  // Additional Fields
  catatan?: string | null;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// Satker Visibility Control Types
// ============================================================================

/**
 * Divisi (Satuan Kerja) - Organizational unit in the system
 * Represents a work unit that can have members and related data
 * Maps to master_divisi table in database
 */
export interface Satker {
  id: string;
  name: string;
  isLocked: boolean;           // Whether visibility is restricted to admin and members
  lockedAt: Date | null;       // Timestamp when divisi was locked
  lockedBy: string | null;     // User ID of admin who locked the divisi
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Divisi with additional metadata for management UI
 */
export interface SatkerWithVisibility extends Satker {
  memberCount: number;         // Number of members in this divisi
}

/**
 * Audit log entry for divisi visibility changes
 * Records all visibility toggle operations for compliance and tracking
 */
export interface VisibilityAuditLog {
  id: string;
  satkerId: string;            // ID of the divisi that was changed (kept as satkerId for backward compatibility)
  satkerName: string;          // Name of the divisi at time of change (for historical accuracy)
  oldStatus: boolean;          // Previous visibility status (true = locked, false = unlocked)
  newStatus: boolean;          // New visibility status (true = locked, false = unlocked)
  changedBy: string;           // User ID of admin who made the change
  changedByName?: string;      // Name of admin who made the change (populated from join)
  changedAt: Date;             // Timestamp when the change was made
}

/**
 * Props for visibility toggle component
 */
export interface VisibilityToggleProps {
  satkerId: string;
  isLocked: boolean;
  onToggle: (satkerId: string, newStatus: boolean) => Promise<void>;
  disabled?: boolean;
}

/**
 * Filter options for audit trail queries
 */
export interface AuditTrailFilters {
  satkerId?: string;           // Filter by specific satker
  limit?: number;              // Number of results to return
  offset?: number;             // Offset for pagination
}

// ============================================================================
// BMN (Barang Milik Negara) Inventory Types
// ============================================================================

/**
 * Status BMN - Current status of the asset
 */
export type BMNStatus = 'Aktif' | 'Tidak Aktif' | 'Hilang' | 'Rusak';

/**
 * Kondisi BMN - Physical condition of the asset
 */
export type BMNKondisi = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

/**
 * Upload Status - Status of BMN data upload operation
 */
export type BMNUploadStatus = 'Processing' | 'Completed' | 'Failed' | 'Rolled Back';

/**
 * BMNItem - Represents a single BMN (state-owned asset) item
 */
export interface BMNItem {
  id: string;
  
  // Basic Information
  kodeBarang: string;           // Unique code for the asset (required)
  namaBarang: string;           // Name/description of the asset (required)
  jenisBMN?: string;            // Type/category of BMN
  merk?: string;                // Brand/manufacturer
  tipe?: string;                // Model/type
  
  // Status and Condition
  statusBMN: BMNStatus;         // Current status (required)
  kondisi?: BMNKondisi;         // Physical condition
  
  // Financial Information
  nilaiPerolehan?: number;      // Acquisition value in IDR
  tahunPerolehan?: number;      // Year of acquisition
  tanggalPerolehan?: string;    // ISO Date - Date of acquisition
  umurAset?: number;            // Asset age in years (from Excel, not calculated)
  
  // Physical Attributes
  jumlah?: number;              // Quantity (default: 1)
  satuan?: string;              // Unit of measurement
  luas?: number;                // Area/size (for land/buildings)
  
  // Location Information
  namaSatker?: string;          // Name of organizational unit (Satuan Kerja)
  alamat?: string;              // Address
  kota?: string;                // City
  provinsi?: string;            // Province
  
  // Document Information
  nomorRegister?: string;       // Registration number
  nup?: string;                 // Nomor Urut Pendaftaran (NUP)
  nomorSertifikat?: string;     // Certificate number
  tanggalSertifikat?: string;   // ISO Date - Certificate date
  
  // Disposal Information
  tanggalPengapusan?: string;   // ISO Date - Disposal date
  alasanPengapusan?: string;    // Reason for disposal
  
  // Additional Information
  keterangan?: string;          // Notes/remarks
  
  // Raw Data from Excel (stores all columns)
  rawData?: Record<string, any>; // Complete raw data from Excel file as JSON
  
  // Metadata
  createdBy: string;            // User who created the record
  createdAt: string;            // ISO Date - Creation timestamp
  updatedAt?: string;           // ISO Date - Last update timestamp
  uploadBatchId?: string;       // Reference to upload batch
  
  // Assignment Tracking
  heldBy?: string | null;       // UUID references profiles(id)
  holder?: {
    id: string;
    name: string;
  } | null;
}

/**
 * BMNEditor - Designates BMN edit permissions for specific Satkers
 */
export interface BMNEditor {
  id: string;
  userId: string;
  namaSatker: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}


/**
 * BMNUploadHistory - Tracks BMN data upload operations
 */
export interface BMNUploadHistory {
  id: string;
  
  // Upload Information
  filename: string;             // Original filename
  fileSize?: number;            // File size in bytes
  fileType?: string;            // File type (xlsx, xls, csv)
  
  // Upload Results
  totalRecords: number;         // Total records in file
  successfulRecords: number;    // Successfully imported records
  failedRecords: number;        // Failed records
  
  // Status
  status: BMNUploadStatus;      // Upload status
  
  // Error Information
  errorDetails?: Array<{        // Array of error details
    row: number;
    field?: string;
    message: string;
  }>;
  
  // Metadata
  uploadedBy: string;           // User who uploaded
  uploadedAt: string;           // ISO Date - Upload timestamp
  
  // Rollback Information
  rolledBackAt?: string;        // ISO Date - Rollback timestamp
  rolledBackBy?: string;        // User who performed rollback
  previousDataSnapshot?: any;   // Snapshot for rollback capability
}

/**
 * BMNFilters - Filter criteria for BMN list view
 */
export interface BMNFilters {
  // Text search
  search?: string;              // Search across multiple fields
  
  // Category filters
  jenisBMN?: string | 'All';    // Filter by BMN type
  kodeBarang?: string | 'All';   // Filter by Kode Barang
  statusBMN?: BMNStatus | 'All'; // Filter by status
  kondisi?: BMNKondisi | 'All'; // Filter by condition
  namaSatker?: string | 'All';  // Filter by organizational unit
  
  // Range filters
  nilaiPerolehanMin?: number;   // Minimum acquisition value
  nilaiPerolehanMax?: number;   // Maximum acquisition value
  umurAsetMin?: number;         // Minimum asset age (years)
  umurAsetMax?: number;         // Maximum asset age (years)
  
  // Date filters
  tahunPerolehan?: number;      // Filter by acquisition year
}

/**
 * BMNStats - Statistics for BMN dashboard
 */
export interface BMNStats {
  // Total counts
  totalItems: number;           // Total number of BMN items
  
  // Status distribution
  statusDistribution: {
    aktif: number;
    tidakAktif: number;
    hilang: number;
    rusak: number;
  };
  
  // Condition distribution
  kondisiDistribution: {
    baik: number;
    rusakRingan: number;
    rusakBerat: number;
  };
  
  // Type distribution (top 10)
  jenisBMNDistribution: Array<{
    jenisBMN: string;
    count: number;
  }>;
  
  // Value statistics
  totalNilaiPerolehan: number;  // Total acquisition value
  nilaiPerolehanBySatker: Array<{
    namaSatker: string;
    totalNilai: number;
  }>;
  
  // Age distribution
  umurAsetDistribution: Array<{
    range: string;              // e.g., "0-5 tahun", "6-10 tahun"
    count: number;
  }>;
  
  // Top items by value
  topItemsByValue: BMNItem[];   // Top 5 items by acquisition value
  
  // Last upload info
  lastUpload?: {
    date: string;               // ISO Date
    uploadedBy: string;
    recordCount: number;
  };
}

/**
 * BMNExportOptions - Options for exporting BMN data
 */
export interface BMNExportOptions {
  format: 'excel' | 'csv';      // Export format
  filters?: BMNFilters;         // Applied filters
  columns?: string[];           // Columns to include (all if not specified)
  filename?: string;            // Custom filename
}

/**
 * BMNValidationError - Validation error for BMN data
 */
export interface BMNValidationError {
  row: number;                  // Row number in file (1-indexed)
  field?: string;               // Field name that failed validation
  value?: any;                  // Invalid value
  message: string;              // Error message
  severity: 'error' | 'warning'; // Error severity
}

/**
 * BMNParseResult - Result of parsing BMN file
 */
export interface BMNParseResult {
  success: boolean;
  data: BMNItem[];              // Parsed BMN items
  errors: BMNValidationError[]; // Validation errors
  warnings: BMNValidationError[]; // Validation warnings
  totalRows: number;            // Total rows in file
  validRows: number;            // Valid rows
  invalidRows: number;          // Invalid rows
}

// ============================================================================
// Budget Realization (APBN & Hibah) Types
// ============================================================================

export interface MasterSumberDana {
  id: string;
  name: string;
  createdAt: string;
}

export interface BudgetEditor {
  id: string;
  userId: string;
  divisi: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface BudgetMaster {
  id: string;
  divisi: string;
  sumberDanaId: string;
  kegiatan: string;
  namaKegiatan: string;
  kro: string;
  namaKro: string;
  ro: string;
  namaRo: string;
  komponen: string;
  namaKomponen: string;
  subkomponen: string;
  namaSubkomponen: string;
  akun: string;
  namaAkun: string;
  detail: string;
  pagu: number;
  tahun?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  sumberDana?: MasterSumberDana;
}

export interface BudgetTransaction {
  id: string;
  masterId: string;
  tanggal: string;
  uraian: string;
  nominal: number;
  bukti?: string;
  keterangan?: string;
  status: 'Realisasi' | 'Outstanding';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  master?: BudgetMaster;
}

// ============================================================================
// Zoom Service & Module Visibility Types
// ============================================================================

export interface ZoomAccount {
  id: string;
  name: string;
  email?: string;
  password?: string;
  kapasitas: number;
  isActive: boolean;
  divisi: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZoomEditor {
  id: string;
  userId: string;
  divisi: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface ZoomRoom {
  id: string;
  name: string;
  createdAt: string;
}

export interface ZoomMeetingType {
  id: string;
  name: string;
  createdAt: string;
}

export interface ZoomMeeting {
  id: string;
  zoomAccountId: string | null;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  kegiatan: string;
  operatorId: string | null;
  lokasi: string;
  unitKerja: string;
  jenisRapat: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  zoomLink?: string;
  meetingId?: string;
  passcode?: string;
  undanganText?: string;
  createdAt: string;
  updatedAt: string;
  zoomAccount?: ZoomAccount;
  operator?: User;
  operatorIds?: string[];
}

export interface ModuleVisibility {
  id: string;
  moduleName: string;
  divisiId: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}


