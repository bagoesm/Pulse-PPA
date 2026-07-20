import { Status, Priority } from '../../types';

export const translateStatus = (status: string | Status): string => {
  switch (status) {
    case 'To Do':
    case Status.ToDo:
      return 'Belum Mulai';
    case 'In Progress':
    case Status.InProgress:
      return 'Sedang Dikerjakan';
    case 'Pending':
    case Status.Pending:
      return 'Tertunda';
    case 'Review':
    case Status.Review:
      return 'Dalam Peninjauan';
    case 'Done':
    case Status.Done:
      return 'Selesai';
    default:
      return status;
  }
};

export const translatePriority = (priority: string | Priority): string => {
  switch (priority) {
    case 'Low':
    case Priority.Low:
      return 'Rendah';
    case 'Medium':
    case Priority.Medium:
      return 'Sedang';
    case 'High':
    case Priority.High:
      return 'Tinggi';
    case 'Urgent':
    case Priority.Urgent:
      return 'Mendesak';
    default:
      return priority;
  }
};

export const translateProjectStatus = (status: string): string => {
  switch (status) {
    case 'In Progress':
      return 'Sedang Berjalan';
    case 'Pending':
      return 'Tertunda';
    case 'Live':
      return 'Aktif';
    default:
      return status;
  }
};

export const translateEpicStatus = (status: string): string => {
  switch (status) {
    case 'Not Started':
      return 'Belum Mulai';
    case 'In Progress':
      return 'Sedang Dikerjakan';
    case 'Completed':
      return 'Selesai';
    default:
      return status;
  }
};

export const translateDisposisiStatus = (status: string): string => {
  switch (status) {
    case 'Pending':
      return 'Tertunda';
    case 'In Progress':
      return 'Sedang Dikerjakan';
    case 'Completed':
      return 'Selesai';
    case 'Cancelled':
      return 'Dibatalkan';
    case 'Mixed':
      return 'Campuran';
    default:
      return status;
  }
};

export const translateFeedbackStatus = (status: string): string => {
  switch (status) {
    case 'Open':
      return 'Terbuka';
    case 'Planned':
      return 'Direncanakan';
    case 'In Progress':
      return 'Sedang Dikerjakan';
    case 'Done':
      return 'Selesai';
    default:
      return status;
  }
};

export const translateTabName = (tabName: string): string => {
  switch (tabName) {
    case 'Semua Task':
      return 'Semua Tugas';
    case 'Project':
      return 'Proyek';
    case 'Diskusi & Chat':
      return 'Diskusi & Obrolan';
    case 'Dashboard Statistik':
      return 'Dashboard Statistik';
    case 'Profile':
      return 'Profil';
    case 'Master Data':
      return 'Data Master';
    case 'Manajemen Visibility':
      return 'Manajemen Visibilitas';
    default:
      return tabName;
  }
};
