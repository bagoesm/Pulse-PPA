// src/utils/bmnValidator.ts
// Validation utility functions for BMN data

import { BMNItem, BMNValidationError, BMNStatus, BMNKondisi } from '../../types';

/**
 * Validate required fields for BMN item
 * Requirements: 5.1, 5.2, 5.3
 */
export function validateRequiredFields(
  item: Partial<BMNItem>,
  rowNumber: number
): BMNValidationError[] {
  const errors: BMNValidationError[] = [];
  
  // Required field: Kode Barang (Requirement 5.1)
  if (!item.kodeBarang || item.kodeBarang.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'kodeBarang',
      value: item.kodeBarang,
      message: 'Kode Barang wajib diisi',
      severity: 'error',
    });
  }
  
  // Required field: Nama Barang (Requirement 5.2)
  if (!item.namaBarang || item.namaBarang.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'namaBarang',
      value: item.namaBarang,
      message: 'Nama Barang wajib diisi',
      severity: 'error',
    });
  }
  
  // Required field: Status BMN (Requirement 5.3)
  if (!item.statusBMN) {
    errors.push({
      row: rowNumber,
      field: 'statusBMN',
      value: item.statusBMN,
      message: 'Status BMN wajib diisi dengan nilai yang valid (Aktif, Tidak Aktif, Hilang, Rusak)',
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Validate Status BMN enum value
 * Requirement: 5.3
 */
export function validateStatusBMN(
  value: any,
  rowNumber: number
): { valid: boolean; status: BMNStatus | null; error?: BMNValidationError } {
  if (!value) {
    return {
      valid: false,
      status: null,
      error: {
        row: rowNumber,
        field: 'statusBMN',
        value,
        message: 'Status BMN wajib diisi',
        severity: 'error',
      },
    };
  }
  
  const normalized = String(value).toLowerCase().trim();
  const statusMap: Record<string, BMNStatus> = {
    'aktif': 'Aktif',
    'active': 'Aktif',
    'tidak aktif': 'Tidak Aktif',
    'tidakaktif': 'Tidak Aktif',
    'inactive': 'Tidak Aktif',
    'hilang': 'Hilang',
    'lost': 'Hilang',
    'missing': 'Hilang',
    'rusak': 'Rusak',
    'damaged': 'Rusak',
    'broken': 'Rusak',
  };
  
  const status = statusMap[normalized];
  
  if (!status) {
    return {
      valid: false,
      status: null,
      error: {
        row: rowNumber,
        field: 'statusBMN',
        value,
        message: `Status BMN tidak valid: "${value}". Harus salah satu dari: Aktif, Tidak Aktif, Hilang, Rusak`,
        severity: 'error',
      },
    };
  }
  
  return {
    valid: true,
    status,
  };
}

/**
 * Validate Kondisi enum value
 * Requirement: 5.4
 */
export function validateKondisi(
  value: any,
  rowNumber: number
): { valid: boolean; kondisi: BMNKondisi | undefined; error?: BMNValidationError } {
  // Kondisi is optional, so empty value is valid
  if (!value) {
    return {
      valid: true,
      kondisi: undefined,
    };
  }
  
  const normalized = String(value).toLowerCase().trim();
  const kondisiMap: Record<string, BMNKondisi> = {
    'baik': 'Baik',
    'good': 'Baik',
    'rusak ringan': 'Rusak Ringan',
    'rusakringan': 'Rusak Ringan',
    'slightly damaged': 'Rusak Ringan',
    'minor damage': 'Rusak Ringan',
    'rusak berat': 'Rusak Berat',
    'rusakberat': 'Rusak Berat',
    'heavily damaged': 'Rusak Berat',
    'major damage': 'Rusak Berat',
  };
  
  const kondisi = kondisiMap[normalized];
  
  if (!kondisi) {
    return {
      valid: false,
      kondisi: undefined,
      error: {
        row: rowNumber,
        field: 'kondisi',
        value,
        message: `Kondisi tidak valid: "${value}". Harus salah satu dari: Baik, Rusak Ringan, Rusak Berat`,
        severity: 'warning',
      },
    };
  }
  
  return {
    valid: true,
    kondisi,
  };
}

/**
 * Validate numeric values are non-negative
 * Requirement: 5.5
 */
export function validateNumericValues(
  item: Partial<BMNItem>,
  rowNumber: number
): BMNValidationError[] {
  const errors: BMNValidationError[] = [];
  
  // Validate nilaiPerolehan is not negative
  if (item.nilaiPerolehan !== undefined && item.nilaiPerolehan < 0) {
    errors.push({
      row: rowNumber,
      field: 'nilaiPerolehan',
      value: item.nilaiPerolehan,
      message: 'Nilai Perolehan tidak boleh negatif',
      severity: 'error',
    });
  }
  
  // Validate luas is not negative
  if (item.luas !== undefined && item.luas < 0) {
    errors.push({
      row: rowNumber,
      field: 'luas',
      value: item.luas,
      message: 'Luas tidak boleh negatif',
      severity: 'error',
    });
  }
  
  // Validate jumlah is not negative
  if (item.jumlah !== undefined && item.jumlah < 0) {
    errors.push({
      row: rowNumber,
      field: 'jumlah',
      value: item.jumlah,
      message: 'Jumlah tidak boleh negatif',
      severity: 'error',
    });
  }
  
  // Validate tahunPerolehan is reasonable
  if (item.tahunPerolehan !== undefined) {
    const currentYear = new Date().getFullYear();
    if (item.tahunPerolehan < 1900 || item.tahunPerolehan > currentYear + 1) {
      errors.push({
        row: rowNumber,
        field: 'tahunPerolehan',
        value: item.tahunPerolehan,
        message: `Tahun Perolehan harus antara 1900 dan ${currentYear + 1}`,
        severity: 'warning',
      });
    }
  }
  
  return errors;
}

/**
 * Validate email format
 * Requirement: 5.6
 */
export function validateEmail(
  email: string | undefined,
  rowNumber: number,
  fieldName: string = 'email'
): BMNValidationError | null {
  if (!email) {
    return null; // Email is optional
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      row: rowNumber,
      field: fieldName,
      value: email,
      message: `Format email tidak valid: "${email}"`,
      severity: 'error',
    };
  }
  
  return null;
}

/**
 * Validate phone format
 * Requirement: 5.7
 */
export function validatePhone(
  phone: string | undefined,
  rowNumber: number,
  fieldName: string = 'phone'
): BMNValidationError | null {
  if (!phone) {
    return null; // Phone is optional
  }
  
  // Remove common separators for validation
  const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Indonesian phone number patterns:
  // - Mobile: 08xx-xxxx-xxxx (10-13 digits starting with 08)
  // - Mobile with country code: +628xx or 628xx
  // - Landline: 021-xxxx-xxxx (area code + 7-8 digits)
  // - International format: +62xxx
  
  const phoneRegex = /^(\+?62|0)[0-9]{8,12}$/;
  
  if (!phoneRegex.test(cleanedPhone)) {
    return {
      row: rowNumber,
      field: fieldName,
      value: phone,
      message: `Format nomor telepon tidak valid: "${phone}". Harus berupa nomor Indonesia yang valid`,
      severity: 'error',
    };
  }
  
  return null;
}

/**
 * Comprehensive validation for BMN item
 * Combines all validation rules
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
export function validateBMNItem(
  item: Partial<BMNItem>,
  rowNumber: number
): BMNValidationError[] {
  const errors: BMNValidationError[] = [];
  
  // Validate required fields (5.1, 5.2, 5.3)
  errors.push(...validateRequiredFields(item, rowNumber));
  
  // Validate Status BMN enum (5.3)
  if (item.statusBMN) {
    const statusValidation = validateStatusBMN(item.statusBMN, rowNumber);
    if (!statusValidation.valid && statusValidation.error) {
      errors.push(statusValidation.error);
    }
  }
  
  // Validate Kondisi enum (5.4)
  if (item.kondisi) {
    const kondisiValidation = validateKondisi(item.kondisi, rowNumber);
    if (!kondisiValidation.valid && kondisiValidation.error) {
      errors.push(kondisiValidation.error);
    }
  }
  
  // Validate numeric values (5.5)
  errors.push(...validateNumericValues(item, rowNumber));
  
  // Note: Email and phone validation (5.6, 5.7) would be applied if BMNItem
  // had email/phone fields. Currently BMNItem doesn't have these fields,
  // but the validation functions are available for future use or extension.
  
  return errors;
}

/**
 * Validate a batch of BMN items
 * Returns detailed error messages with row numbers
 * Requirement: 5.8
 */
export function validateBMNBatch(
  items: Partial<BMNItem>[],
  startRowNumber: number = 2 // Default to 2 (assuming row 1 is header)
): {
  valid: boolean;
  errors: BMNValidationError[];
  warnings: BMNValidationError[];
  validItems: number;
  invalidItems: number;
} {
  const allErrors: BMNValidationError[] = [];
  const allWarnings: BMNValidationError[] = [];
  let validItems = 0;
  let invalidItems = 0;
  
  items.forEach((item, index) => {
    const rowNumber = startRowNumber + index;
    const validationErrors = validateBMNItem(item, rowNumber);
    
    // Separate errors and warnings
    const errors = validationErrors.filter(e => e.severity === 'error');
    const warnings = validationErrors.filter(e => e.severity === 'warning');
    
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    
    if (errors.length === 0) {
      validItems++;
    } else {
      invalidItems++;
    }
  });
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    validItems,
    invalidItems,
  };
}

/**
 * Format validation errors into user-friendly messages
 * Requirement: 5.8
 */
export function formatValidationErrors(
  errors: BMNValidationError[],
  maxErrors: number = 10
): string {
  if (errors.length === 0) {
    return 'Tidak ada error';
  }
  
  const displayErrors = errors.slice(0, maxErrors);
  const remainingCount = errors.length - maxErrors;
  
  let message = `Ditemukan ${errors.length} error validasi:\n\n`;
  
  displayErrors.forEach((error, index) => {
    message += `${index + 1}. Baris ${error.row}`;
    if (error.field) {
      message += ` - Field: ${error.field}`;
    }
    if (error.value !== undefined && error.value !== null) {
      message += ` - Nilai: "${error.value}"`;
    }
    message += `\n   ${error.message}\n\n`;
  });
  
  if (remainingCount > 0) {
    message += `... dan ${remainingCount} error lainnya`;
  }
  
  return message;
}

/**
 * Format validation warnings into user-friendly messages
 * Requirement: 5.8
 */
export function formatValidationWarnings(
  warnings: BMNValidationError[],
  maxWarnings: number = 10
): string {
  if (warnings.length === 0) {
    return 'Tidak ada warning';
  }
  
  const displayWarnings = warnings.slice(0, maxWarnings);
  const remainingCount = warnings.length - maxWarnings;
  
  let message = `Ditemukan ${warnings.length} warning:\n\n`;
  
  displayWarnings.forEach((warning, index) => {
    message += `${index + 1}. Baris ${warning.row}`;
    if (warning.field) {
      message += ` - Field: ${warning.field}`;
    }
    if (warning.value !== undefined && warning.value !== null) {
      message += ` - Nilai: "${warning.value}"`;
    }
    message += `\n   ${warning.message}\n\n`;
  });
  
  if (remainingCount > 0) {
    message += `... dan ${remainingCount} warning lainnya`;
  }
  
  return message;
}
