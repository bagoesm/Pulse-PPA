// src/utils/formatters.ts
// Centralized utility functions to avoid code duplication

/**
 * Format bytes to human readable size
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Ensure URL has https:// prefix
 */
export const ensureHttps = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
};

/**
 * Format ISO date string to Indonesian locale date
 */
export const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
};

/**
 * Format date to full Indonesian date with Day name (e.g., "Jumat, 31 Juli 2026")
 */
export const formatIndonesianDateWithDay = (dateString: string): string => {
    if (!dateString) return '-';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

/**
 * Calculates the Monday 09:00 AM deadline for a given WFA date (YYYY-MM-DD)
 */
export const getWfaDeadline = (tanggalWfa: string): Date => {
  if (!tanggalWfa) return new Date();
  const parts = tanggalWfa.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

  // Calculate days until Monday of next week
  const day = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  let daysUntilMonday = 0;
  if (day === 5) {
    daysUntilMonday = 3; // Friday -> Monday
  } else if (day === 6) {
    daysUntilMonday = 2; // Saturday -> Monday
  } else if (day === 0) {
    daysUntilMonday = 1; // Sunday -> Monday
  } else {
    // Mon..Thu -> next week's Monday
    daysUntilMonday = 8 - day;
  }

  const deadline = new Date(date);
  deadline.setDate(deadline.getDate() + daysUntilMonday);
  deadline.setHours(9, 0, 0, 0); // 09:00 AM

  return deadline;
};

/**
 * Gets remaining time countdown object & status for a WFA date
 */
export const getWfaDeadlineStatus = (tanggalWfa: string) => {
  if (!tanggalWfa) return null;
  const deadline = getWfaDeadline(tanggalWfa);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  const isExpired = diffMs <= 0;

  const formattedDeadline = deadline.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' pukul 09:00 WIB';

  if (isExpired) {
    return {
      isExpired: true,
      deadline,
      formattedDeadline,
      remainingText: 'Batas waktu penginputan telah berakhir',
      diffMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  // Calculate remaining days, hours, minutes, seconds
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let remainingText = '';
  if (days > 0) {
    remainingText = `${days} hari ${hours} jam ${minutes} menit`;
  } else if (hours > 0) {
    remainingText = `${hours} jam ${minutes} menit ${seconds} detik`;
  } else {
    remainingText = `${minutes} menit ${seconds} detik`;
  }

  return {
    isExpired: false,
    deadline,
    formattedDeadline,
    remainingText,
    days,
    hours,
    minutes,
    seconds,
    diffMs,
  };
};
