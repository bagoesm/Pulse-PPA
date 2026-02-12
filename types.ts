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
  SuratDokumen = 'Surat & Dokumen',
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
  password?: string; // For mock auth
  sakuraAnimationEnabled?: boolean; // Setting untuk animasi bunga sakura
  snowAnimationEnabled?: boolean; // Setting untuk animasi salju
  moneyAnimationEnabled?: boolean; // Setting untuk animasi uang
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
  subCategory: string;
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
}

export interface FilterState {
  search: string;
  category: Category | 'All';
  pic: string | 'All'; // Keep as string for backward compatibility in filtering
  priority: Priority | 'All';
  status: Status | 'All';
  projectId: string | 'All';
  epicId: string | 'All';
}

export interface Comment {
  id: string;
  taskId: string;
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
export type ActivityType = 'created' | 'status_change' | 'pic_change' | 'priority_change' | 'deadline_change' | 'category_change' | 'checklist_add' | 'checklist_remove' | 'checklist_toggle';

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
  { name: 'Pengembangan Aplikasi', icon: 'Code' },
  { 
    name: 'Surat & Kegiatan', 
    icon: 'FileText',
    submenu: [
      { name: 'Jadwal Kegiatan', icon: 'CalendarDays' },
      { name: 'Daftar Surat', icon: 'FileSpreadsheet' },
      { name: 'Daftar Disposisi', icon: 'ClipboardList' },
    ]
  },
  { name: 'Surat & Dokumen', icon: 'FileText' },
  { name: 'Permintaan Satker', icon: 'Inbox' },
  { name: 'Tindak Lanjut', icon: 'Forward' },
  { name: 'Administrasi', icon: 'FolderOpen' },
  { name: 'Monitoring', icon: 'Activity' },
  { name: 'Lainnya', icon: 'MoreHorizontal' },
  { name: 'Pengumuman', icon: 'Megaphone' },
  { name: 'Inventori Data', icon: 'Database' },
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
  tujuanSuratList?: Array<{name: string, type: 'Internal' | 'Eksternal'}>; // Structured list with types
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
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}