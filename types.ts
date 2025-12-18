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
  Asistensi = 'Asistensi',
  Bimtek = 'Bimtek',
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
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;     // <— path file di bucket “attachment”
  url?: string;     // <— signed URL untuk download
}

export interface TaskLink {
  id: string;
  title: string;
  url: string;
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
  attachments: Attachment[];
  links: TaskLink[]; // Links related to the task
  comments?: Comment[]; // OPSIONAL - Comments for the task
}

export interface FilterState {
  search: string;
  category: Category | 'All';
  pic: string | 'All'; // Keep as string for backward compatibility in filtering
  priority: Priority | 'All';
  status: Status | 'All';
  projectId: string | 'All';
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

export type NotificationType = 'comment' | 'deadline';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId: string;
  taskTitle: string;
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

export const SIDEBAR_ITEMS = [
  { name: 'Dashboard', icon: 'LayoutDashboard' },
  { name: 'Semua Task', icon: 'ListTodo' },
  { name: 'Project', icon: 'Briefcase' },
  { name: 'Pengembangan Aplikasi', icon: 'Code' },
  { name: 'Surat & Dokumen', icon: 'FileText' },
  { name: 'Audiensi/Rapat', icon: 'Users' },
  { name: 'Asistensi', icon: 'HelpingHand' },
  { name: 'Bimtek', icon: 'GraduationCap' },
  { name: 'Permintaan Satker', icon: 'Inbox' },
  { name: 'Tindak Lanjut', icon: 'Forward' },
  { name: 'Administrasi', icon: 'FolderOpen' },
  { name: 'Monitoring', icon: 'Activity' },
  { name: 'Lainnya', icon: 'MoreHorizontal' },
  { name: 'Pengumuman', icon: 'Megaphone' },
];