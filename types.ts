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
  Project = 'Project',
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
}

export interface ProjectDefinition {
  id: string;
  name: string;
  manager: string; // The PIC/Manager of the project
  description?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;     // <— path file di bucket “attachment”
  url?: string;     // <— signed URL untuk download
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  subCategory: string;
  deadline: string; // ISO Date string
  pic: string;
  priority: Priority;
  status: Status;
  description: string;
  createdBy: string; // User Name
  projectId?: string; // Optional: Only for Category.Project
  attachments: Attachment[];
}

export interface FilterState {
  search: string;
  category: Category | 'All';
  pic: string | 'All';
  priority: Priority | 'All';
  status: Status | 'All';
  projectId: string | 'All';
}

export const SIDEBAR_ITEMS = [
  { name: 'Dashboard', icon: 'LayoutDashboard' },
  { name: 'Semua Task', icon: 'ListTodo' },
  { name: 'Project', icon: 'Briefcase' },
  { name: 'Wall of Feedback', icon: 'MessageSquarePlus' },
  { name: 'Surat & Dokumen', icon: 'FileText' },
  { name: 'Audiensi/Rapat', icon: 'Users' },
  { name: 'Asistensi', icon: 'HelpingHand' },
  { name: 'Bimtek', icon: 'GraduationCap' },
  { name: 'Permintaan Satker', icon: 'Inbox' },
  { name: 'Tindak Lanjut', icon: 'Forward' },
  { name: 'Administrasi', icon: 'FolderOpen' },
  { name: 'Monitoring', icon: 'Activity' },
  { name: 'Lainnya', icon: 'MoreHorizontal' },
];