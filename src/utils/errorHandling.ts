// src/utils/errorHandling.ts
// Centralized error handling utilities for the Surat-Kegiatan Integration system

/**
 * Custom error classes for different error types
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class FileUploadError extends Error {
  constructor(message: string, public fileName?: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class NotificationError extends Error {
  constructor(message: string, public userId?: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public requiredRole?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ForeignKeyError extends Error {
  constructor(message: string, public entityType?: string, public entityId?: string) {
    super(message);
    this.name = 'ForeignKeyError';
  }
}

/**
 * Error messages for user-friendly display
 */
export const ERROR_MESSAGES = {
  // Validation errors
  REQUIRED_FIELD: (fieldName: string) => `Field ${fieldName} wajib diisi`,
  INVALID_EMAIL: 'Format email tidak valid',
  INVALID_DATE: 'Format tanggal tidak valid',
  INVALID_STATUS: 'Status tidak valid',
  EMPTY_DISPOSISI_TEXT: 'Teks disposisi tidak boleh kosong',
  NO_ASSIGNEES: 'Minimal 1 assignee harus dipilih',
  DISPOSISI_REQUIRED: 'Disposisi wajib diisi ketika menghubungkan Surat dengan Kegiatan',
  
  // Foreign key errors
  SURAT_NOT_FOUND: (id: string) => `Surat dengan ID ${id} tidak ditemukan`,
  KEGIATAN_NOT_FOUND: (id: string) => `Kegiatan dengan ID ${id} tidak ditemukan`,
  USER_NOT_FOUND: (id: string) => `User dengan ID ${id} tidak ditemukan`,
  INVALID_REFERENCE: (entityType: string, id: string) => 
    `${entityType} dengan ID ${id} tidak ditemukan`,
  
  // Authorization errors
  UNAUTHORIZED: 'Anda tidak memiliki izin untuk melakukan aksi ini',
  LOGIN_REQUIRED: 'Anda harus login untuk melakukan aksi ini',
  INSUFFICIENT_PERMISSIONS: (action: string) => 
    `Anda tidak memiliki izin untuk ${action}`,
  ROLE_REQUIRED: (role: string) => 
    `Hanya ${role} yang dapat melakukan aksi ini`,
  
  // Database errors
  DATABASE_CONNECTION_FAILED: 'Koneksi ke database gagal. Silakan coba lagi.',
  DATABASE_TIMEOUT: 'Koneksi database timeout. Silakan coba lagi.',
  CONSTRAINT_VIOLATION: 'Operasi gagal karena ketergantungan data',
  UNIQUE_CONSTRAINT: 'Data dengan identifier ini sudah ada',
  FOREIGN_KEY_CONSTRAINT: 'Tidak dapat menyelesaikan operasi karena ketergantungan data',
  
  // File upload errors
  FILE_TOO_LARGE: (maxSize: number) => 
    `Ukuran file melebihi batas maksimal ${maxSize}MB`,
  INVALID_FILE_TYPE: (allowedTypes: string[]) => 
    `Tipe file tidak diizinkan. Hanya ${allowedTypes.join(', ')} yang diperbolehkan`,
  STORAGE_QUOTA_EXCEEDED: 'Kuota penyimpanan penuh. Silakan hapus file lama atau hubungi administrator.',
  FILE_UPLOAD_FAILED: 'Upload file gagal. Silakan coba lagi.',
  FILE_DELETE_FAILED: 'Hapus file gagal. Silakan coba lagi.',
  
  // Notification errors
  NOTIFICATION_FAILED: 'Gagal membuat notifikasi',
  NOTIFICATION_DELIVERY_FAILED: 'Gagal mengirim notifikasi',
  
  // Generic errors
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui',
  OPERATION_FAILED: 'Operasi gagal. Silakan coba lagi.',
  NETWORK_ERROR: 'Kesalahan jaringan. Periksa koneksi internet Anda.',
};

/**
 * HTTP status codes for error responses
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
  INSUFFICIENT_STORAGE: 507,
};

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    field?: string;
    statusCode?: number;
    details?: any;
  };
}

/**
 * Success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: any): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  
  if (error instanceof ForeignKeyError) {
    return error.message;
  }
  
  if (error instanceof FileUploadError) {
    return error.message;
  }
  
  if (error instanceof DatabaseError) {
    // Don't expose internal database errors to users
    return ERROR_MESSAGES.DATABASE_CONNECTION_FAILED;
  }
  
  if (error instanceof NotificationError) {
    // Notification errors shouldn't block main operations
    return ERROR_MESSAGES.NOTIFICATION_FAILED;
  }
  
  // Handle Supabase errors
  if (error?.code) {
    switch (error.code) {
      case '23503': // Foreign key violation
        return ERROR_MESSAGES.FOREIGN_KEY_CONSTRAINT;
      case '23505': // Unique violation
        return ERROR_MESSAGES.UNIQUE_CONSTRAINT;
      case '23514': // Check constraint violation
        return ERROR_MESSAGES.CONSTRAINT_VIOLATION;
      case 'PGRST116': // Not found
        return 'Data tidak ditemukan';
      case '42P01': // Undefined table
        return ERROR_MESSAGES.DATABASE_CONNECTION_FAILED;
      default:
        return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }
  
  // Handle network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // Default error message
  return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Create error response object
 */
export function createErrorResponse(
  error: any,
  statusCode?: number
): ErrorResponse {
  const errorType = error?.name || 'Error';
  const errorMessage = formatErrorForUser(error);
  
  return {
    success: false,
    error: {
      type: errorType,
      message: errorMessage,
      field: error?.field,
      statusCode: statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    },
  };
}

/**
 * Create success response object
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry validation or authorization errors
      if (
        error instanceof ValidationError ||
        error instanceof AuthorizationError ||
        error instanceof ForeignKeyError
      ) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new ValidationError(ERROR_MESSAGES.REQUIRED_FIELD(field), field);
    }
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Validate disposisi status
 */
export function validateDisposisiStatus(status: string): boolean {
  const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
  return validStatuses.includes(status);
}

/**
 * Handle database errors with retry logic
 */
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await retryOperation(operation, 3, 1000);
  } catch (error: any) {
    console.error(`Database error in ${errorContext}:`, error);
    
    // Check for specific database errors
    if (error?.code === '23503') {
      throw new ForeignKeyError(ERROR_MESSAGES.FOREIGN_KEY_CONSTRAINT);
    }
    
    if (error?.code === '23505') {
      throw new DatabaseError(ERROR_MESSAGES.UNIQUE_CONSTRAINT, error);
    }
    
    if (error?.message?.includes('timeout')) {
      throw new DatabaseError(ERROR_MESSAGES.DATABASE_TIMEOUT, error);
    }
    
    throw new DatabaseError(ERROR_MESSAGES.DATABASE_CONNECTION_FAILED, error);
  }
}

/**
 * Handle file upload errors with cleanup
 */
export async function handleFileUploadError(
  error: any,
  uploadedFilePath: string | null,
  cleanupFn: (path: string) => Promise<void>
): Promise<never> {
  // Cleanup uploaded file if exists
  if (uploadedFilePath) {
    try {
      await cleanupFn(uploadedFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }
  }
  
  throw new FileUploadError(
    error?.message || ERROR_MESSAGES.FILE_UPLOAD_FAILED,
    uploadedFilePath || undefined
  );
}

/**
 * Handle notification errors (non-blocking)
 */
export function handleNotificationError(error: any, context: string): void {
  console.error(`Notification error in ${context}:`, error);
  
  // Notification errors should not block main operations
  // Just log them for monitoring
  
  // In production, you might want to:
  // - Send to error tracking service (e.g., Sentry)
  // - Queue for retry
  // - Alert administrators
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
  allowedExtensions: string[] = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']
): void {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new FileUploadError(ERROR_MESSAGES.FILE_TOO_LARGE(maxSizeMB), file.name);
  }
  
  // Check file type
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
    throw new FileUploadError(
      ERROR_MESSAGES.INVALID_FILE_TYPE(allowedExtensions),
      file.name
    );
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Wrap async operation with error boundary
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: any) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Error in operation:', error);
    }
    return null;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Don't retry validation or authorization errors
  if (
    error instanceof ValidationError ||
    error instanceof AuthorizationError ||
    error instanceof ForeignKeyError
  ) {
    return false;
  }
  
  // Retry network and timeout errors
  if (
    error?.message?.includes('timeout') ||
    error?.message?.includes('network') ||
    error?.message?.includes('fetch')
  ) {
    return true;
  }
  
  // Retry database connection errors
  if (error instanceof DatabaseError) {
    return true;
  }
  
  return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Transaction wrapper with rollback on error
 */
export async function withTransaction<T>(
  operations: Array<() => Promise<any>>,
  rollbackOperations: Array<() => Promise<any>>
): Promise<T> {
  const completedOperations: number[] = [];
  
  try {
    // Execute all operations
    for (let i = 0; i < operations.length; i++) {
      await operations[i]();
      completedOperations.push(i);
    }
    
    return completedOperations as any;
  } catch (error) {
    // Rollback completed operations in reverse order
    for (let i = completedOperations.length - 1; i >= 0; i--) {
      const rollbackIndex = completedOperations[i];
      if (rollbackOperations[rollbackIndex]) {
        try {
          await rollbackOperations[rollbackIndex]();
        } catch (rollbackError) {
          console.error(`Rollback failed for operation ${rollbackIndex}:`, rollbackError);
        }
      }
    }
    
    throw error;
  }
}
