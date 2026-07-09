// src/utils/bmnParser.ts
// Parser utility functions for BMN Excel/CSV file import

import { BMNItem, BMNParseResult, BMNValidationError, BMNStatus, BMNKondisi } from '../../types';

/**
 * Column mapping from file headers to BMNItem fields
 * Supports multiple header variations for flexibility
 */
const COLUMN_MAPPINGS: Record<string, keyof BMNItem> = {
  // Basic Information
  'kode barang': 'kodeBarang',
  'kode_barang': 'kodeBarang',
  'kodebarang': 'kodeBarang',
  'kode': 'kodeBarang',
  'nup': 'nup', // NUP (Nomor Urut Pendaftaran) is now mapped to its own separate field
  'nomor urut pendaftaran': 'nup',
  'no urut pendaftaran': 'nup',
  'no. urut pendaftaran': 'nup',
  'nama barang': 'namaBarang',
  'nama_barang': 'namaBarang',
  'namabarang': 'namaBarang',
  'nama': 'namaBarang',
  'jenis bmn': 'jenisBMN',
  'jenis_bmn': 'jenisBMN',
  'jenisbmn': 'jenisBMN',
  'jenis': 'jenisBMN',
  'merk': 'merk',
  'merek': 'merk',
  'brand': 'merk',
  'tipe': 'tipe',
  'type': 'tipe',
  'model': 'tipe',
  
  // Status and Condition
  'status bmn': 'statusBMN',
  'status_bmn': 'statusBMN',
  'statusbmn': 'statusBMN',
  'status': 'statusBMN',
  'kondisi': 'kondisi',
  'condition': 'kondisi',
  
  // Financial Information
  'nilai perolehan': 'nilaiPerolehan',
  'nilai_perolehan': 'nilaiPerolehan',
  'nilaiperolehan': 'nilaiPerolehan',
  'nilai perolehan pertama': 'nilaiPerolehan', // Use "Nilai Perolehan Pertama" as primary value
  'nilai': 'nilaiPerolehan',
  'harga': 'nilaiPerolehan',
  'nilai buku': 'nilaiPerolehan', // Fallback to Nilai Buku if Nilai Perolehan not available
  'tahun perolehan': 'tahunPerolehan',
  'tahun_perolehan': 'tahunPerolehan',
  'tahunperolehan': 'tahunPerolehan',
  'tahun': 'tahunPerolehan',
  'thn perolehan': 'tahunPerolehan',
  'thn_perolehan': 'tahunPerolehan',
  'tanggal perolehan': 'tanggalPerolehan',
  'tanggal_perolehan': 'tanggalPerolehan',
  'tanggalperolehan': 'tanggalPerolehan',
  'tgl perolehan': 'tanggalPerolehan',
  'tanggal buku pertama': 'tanggalPerolehan', // Use "Tanggal Buku Pertama" as tanggal perolehan
  'umur aset': 'umurAset',
  'umur_aset': 'umurAset',
  'umuraset': 'umurAset',
  'umur': 'umurAset',
  'age': 'umurAset',
  'asset age': 'umurAset',
  
  // Physical Attributes
  'jumlah': 'jumlah',
  'qty': 'jumlah',
  'quantity': 'jumlah',
  'satuan': 'satuan',
  'unit': 'satuan',
  'luas': 'luas',
  'area': 'luas',
  
  // Location Information
  'nama satker': 'namaSatker',
  'nama_satker': 'namaSatker',
  'namasatker': 'namaSatker',
  'satker': 'namaSatker',
  'alamat': 'alamat',
  'address': 'alamat',
  'kota': 'kota',
  'city': 'kota',
  'provinsi': 'provinsi',
  'province': 'provinsi',
  
  // Document Information
  'nomor register': 'nomorRegister',
  'nomor_register': 'nomorRegister',
  'nomorregister': 'nomorRegister',
  'no register': 'nomorRegister',
  'kode register': 'nomorRegister', // Use "Kode Register" as nomor register
  'nomor sertifikat': 'nomorSertifikat',
  'nomor_sertifikat': 'nomorSertifikat',
  'nomorsertifikat': 'nomorSertifikat',
  'no sertifikat': 'nomorSertifikat',
  'no sertipikat': 'nomorSertifikat', // Handle typo
  'jenis sertifikat': 'nomorSertifikat', // Fallback to jenis sertifikat
  'tanggal sertifikat': 'tanggalSertifikat',
  'tanggal_sertifikat': 'tanggalSertifikat',
  'tanggalsertifikat': 'tanggalSertifikat',
  'tgl sertifikat': 'tanggalSertifikat',
  
  // Disposal Information
  'tanggal pengapusan': 'tanggalPengapusan',
  'tanggal_pengapusan': 'tanggalPengapusan',
  'tanggalpengapusan': 'tanggalPengapusan',
  'tgl pengapusan': 'tanggalPengapusan',
  'alasan pengapusan': 'alasanPengapusan',
  'alasan_pengapusan': 'alasanPengapusan',
  'alasanpengapusan': 'alasanPengapusan',
  
  // Additional Information
  'keterangan': 'keterangan',
  'notes': 'keterangan',
  'catatan': 'keterangan',
};

/**
 * Normalize column header for mapping
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
}

/**
 * Map file column to BMNItem field
 */
function mapColumnToField(columnName: string): keyof BMNItem | null {
  const normalized = normalizeHeader(columnName);
  return COLUMN_MAPPINGS[normalized] || null;
}

/**
 * Parse date value from various formats
 */
function parseDate(value: any, XLSX: any): string | null {
  if (!value) return null;
  
  try {
    // Handle Excel date serial numbers
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return new Date(date.y, date.m - 1, date.d).toISOString().split('T')[0];
      }
    }
    
    // Handle string dates
    if (typeof value === 'string') {
      // Try parsing as ISO date
      const isoDate = new Date(value);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      
      // Try parsing DD/MM/YYYY format
      const ddmmyyyyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Try parsing DD-MM-YYYY format
      const ddmmyyyyDashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (ddmmyyyyDashMatch) {
        const [, day, month, year] = ddmmyyyyDashMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Handle Date objects
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
    
    // Return original value as string if parsing fails
    return String(value);
  } catch (error) {
    console.error('Date parsing error:', error);
    return String(value);
  }
}

/**
 * Parse number value
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  // Handle string numbers with thousand separators
  if (typeof value === 'string') {
    // Remove thousand separators (comma and space, but preserve decimal point)
    // Handle both comma and dot as decimal separator
    let cleaned = value.replace(/[\s]/g, ''); // Remove spaces
    
    // If there are multiple dots or commas, assume they are thousand separators
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    
    if (dotCount > 1) {
      // Multiple dots = thousand separators, remove them
      cleaned = cleaned.replace(/\./g, '');
    } else if (commaCount > 1) {
      // Multiple commas = thousand separators, remove them
      cleaned = cleaned.replace(/,/g, '');
    } else if (dotCount === 1 && commaCount === 1) {
      // Both present: assume European format (1.000,50) or US format (1,000.50)
      // Check which comes last to determine decimal separator
      const lastDot = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');
      if (lastDot > lastComma) {
        // US format: 1,000.50
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // European format: 1.000,50
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (commaCount === 1) {
      // Single comma could be decimal separator (European) or thousand separator
      // If there are digits after comma, treat as decimal
      if (/,\d{1,2}$/.test(cleaned)) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(',', '');
      }
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  
  // Handle numeric values
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }
  
  return undefined;
}

/**
 * Parse string value with UTF-8 encoding support
 */
function parseString(value: any): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  // Convert to string and trim
  let str = String(value).trim();
  
  // Handle special characters and ensure UTF-8 encoding
  try {
    // Decode URI components if needed
    if (str.includes('%')) {
      try {
        str = decodeURIComponent(str);
      } catch {
        // Keep original if decoding fails
      }
    }
    
    // Remove null bytes and control characters
    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return str || undefined;
  } catch (error) {
    console.error('String parsing error:', error);
    return str || undefined;
  }
}

/**
 * Validate BMN status value
 */
function validateStatus(value: any): BMNStatus | null {
  if (!value) return null;
  
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
  
  return statusMap[normalized] || null;
}

/**
 * Validate BMN kondisi value
 */
function validateKondisi(value: any): BMNKondisi | undefined {
  if (!value) return undefined;
  
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
  
  return kondisiMap[normalized];
}

/**
 * Validate BMN item data
 */
function validateBMNItem(
  item: Partial<BMNItem>,
  rowNumber: number
): BMNValidationError[] {
  const errors: BMNValidationError[] = [];
  
  // Required field: Kode Barang
  if (!item.kodeBarang || item.kodeBarang.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'kodeBarang',
      value: item.kodeBarang,
      message: 'Kode Barang wajib diisi',
      severity: 'error',
    });
  }
  
  // Required field: Nama Barang
  if (!item.namaBarang || item.namaBarang.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'namaBarang',
      value: item.namaBarang,
      message: 'Nama Barang wajib diisi',
      severity: 'error',
    });
  }
  
  // Required field: Status BMN
  if (!item.statusBMN) {
    errors.push({
      row: rowNumber,
      field: 'statusBMN',
      value: item.statusBMN,
      message: 'Status BMN wajib diisi dengan nilai yang valid (Aktif, Tidak Aktif, Hilang, Rusak)',
      severity: 'error',
    });
  }
  
  // Validate numeric fields are not negative
  if (item.nilaiPerolehan !== undefined && item.nilaiPerolehan < 0) {
    errors.push({
      row: rowNumber,
      field: 'nilaiPerolehan',
      value: item.nilaiPerolehan,
      message: 'Nilai Perolehan tidak boleh negatif',
      severity: 'error',
    });
  }
  
  if (item.luas !== undefined && item.luas < 0) {
    errors.push({
      row: rowNumber,
      field: 'luas',
      value: item.luas,
      message: 'Luas tidak boleh negatif',
      severity: 'error',
    });
  }
  
  if (item.jumlah !== undefined && item.jumlah < 0) {
    errors.push({
      row: rowNumber,
      field: 'jumlah',
      value: item.jumlah,
      message: 'Jumlah tidak boleh negatif',
      severity: 'error',
    });
  }
  
  // Validate year is reasonable
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
 * Parse Excel file and return BMN items
 */
export async function parseExcelFile(
  file: File,
  userId: string
): Promise<BMNParseResult> {
  const XLSX = await import('xlsx');
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File Excel tidak memiliki sheet',
          severity: 'error',
        }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    });
    
    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File Excel tidak memiliki data',
          severity: 'error',
        }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }
    
    // Check row limit
    if (rawData.length > 10000) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File Excel melebihi batas maksimal 10,000 baris',
          severity: 'error',
        }],
        warnings: [],
        totalRows: rawData.length,
        validRows: 0,
        invalidRows: rawData.length,
      };
    }
    
    // Parse rows
    return parseRows(rawData, userId, XLSX);
  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        message: `Gagal membaca file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      }],
      warnings: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }
}

/**
 * Parse CSV file and return BMN items
 */
export async function parseCSVFile(
  file: File,
  userId: string
): Promise<BMNParseResult> {
  const XLSX = await import('xlsx');
  try {
    // Read file as text with UTF-8 encoding
    const text = await file.text();
    
    // Parse CSV using xlsx library (it supports CSV)
    const workbook = XLSX.read(text, {
      type: 'string',
      raw: false,
      cellDates: true,
    });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File CSV tidak dapat dibaca',
          severity: 'error',
        }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null,
    });
    
    if (rawData.length === 0) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File CSV tidak memiliki data',
          severity: 'error',
        }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      };
    }
    
    // Check row limit
    if (rawData.length > 10000) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: 'File CSV melebihi batas maksimal 10,000 baris',
          severity: 'error',
        }],
        warnings: [],
        totalRows: rawData.length,
        validRows: 0,
        invalidRows: rawData.length,
      };
    }
    
    // Parse rows
    return parseRows(rawData, userId, XLSX);
  } catch (error) {
    console.error('CSV parsing error:', error);
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        message: `Gagal membaca file CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      }],
      warnings: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }
}

/**
 * Parse rows of data into BMN items
 */
function parseRows(rawData: any[], userId: string, XLSX: any): BMNParseResult {
  const items: BMNItem[] = [];
  const allErrors: BMNValidationError[] = [];
  const allWarnings: BMNValidationError[] = [];
  
  // Get column mappings from first row
  const firstRow = rawData[0];
  const columnMap = new Map<string, keyof BMNItem>();
  
  for (const columnName of Object.keys(firstRow)) {
    const field = mapColumnToField(columnName);
    if (field) {
      columnMap.set(columnName, field);
    }
  }
  
  // Smart detection: If "Kode Barang" column exists, use it instead of NUP
  const hasKodeBarangColumn = Object.keys(firstRow).some(col => 
    normalizeHeader(col) === 'kode barang'
  );
  
  // If both "Kode Barang" and "NUP" exist, prioritize "Kode Barang"
  if (hasKodeBarangColumn) {
    // Remove NUP mapping if Kode Barang exists
    for (const [columnName, field] of columnMap.entries()) {
      if (normalizeHeader(columnName) === 'nup' && field === 'kodeBarang') {
        columnMap.delete(columnName);
      }
    }
  }
  
  // Check if required columns are present
  const hasKodeBarang = Array.from(columnMap.values()).includes('kodeBarang');
  const hasNamaBarang = Array.from(columnMap.values()).includes('namaBarang');
  const hasStatusBMN = Array.from(columnMap.values()).includes('statusBMN');
  
  // Debug: Log available columns
  console.log('Available columns in Excel:', Object.keys(firstRow));
  console.log('Mapped columns:', Array.from(columnMap.entries()));
  console.log('Has Kode Barang:', hasKodeBarang);
  console.log('Has Nama Barang:', hasNamaBarang);
  console.log('Has Status BMN:', hasStatusBMN);
  
  if (!hasKodeBarang && !hasNamaBarang && !hasStatusBMN) {
    // No columns mapped at all - show available columns
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        message: `Tidak ada kolom yang dikenali. Kolom yang tersedia: ${Object.keys(firstRow).slice(0, 10).join(', ')}${Object.keys(firstRow).length > 10 ? '...' : ''}`,
        severity: 'error',
      }],
      warnings: [],
      totalRows: rawData.length,
      validRows: 0,
      invalidRows: rawData.length,
    };
  }
  
  if (!hasKodeBarang || !hasNamaBarang || !hasStatusBMN) {
    const missingColumns: string[] = [];
    if (!hasKodeBarang) missingColumns.push('Kode Barang (atau NUP)');
    if (!hasNamaBarang) missingColumns.push('Nama Barang');
    if (!hasStatusBMN) missingColumns.push('Status BMN');
    
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        message: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}. Kolom yang tersedia: ${Object.keys(firstRow).slice(0, 10).join(', ')}`,
        severity: 'error',
      }],
      warnings: [],
      totalRows: rawData.length,
      validRows: 0,
      invalidRows: rawData.length,
    };
  }
  
  // Parse each row
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and first row is header
    
    // Store complete raw data from Excel
    const rawDataFromExcel: Record<string, any> = { ...row };
    
    // Create partial BMN item
    const item: Partial<BMNItem> = {
      createdBy: userId,
      createdAt: new Date().toISOString(),
      rawData: rawDataFromExcel, // Store all Excel data
    };
    
    // Map columns to fields
    for (const [columnName, field] of columnMap.entries()) {
      const value = row[columnName];
      
      // Skip empty values
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      // Parse based on field type
      switch (field) {
        // String fields
        case 'kodeBarang':
        case 'namaBarang':
        case 'jenisBMN':
        case 'merk':
        case 'tipe':
        case 'namaSatker':
        case 'alamat':
        case 'kota':
        case 'provinsi':
        case 'nomorRegister':
        case 'nup':
        case 'nomorSertifikat':
        case 'alasanPengapusan':
        case 'keterangan':
        case 'satuan':
          const parsedStr = parseString(value);
          // For kodeBarang, only set if not already set (prioritize "Kode Barang" over "NUP")
          if (field === 'kodeBarang' && !item.kodeBarang && parsedStr) {
            item[field] = parsedStr;
          } else if (field !== 'kodeBarang' && parsedStr) {
            item[field] = parsedStr;
          }
          break;
        
        // Number fields
        case 'nilaiPerolehan':
        case 'luas':
        case 'jumlah':
        case 'tahunPerolehan':
        case 'umurAset':
          const parsedNum = parseNumber(value);
          if (parsedNum !== undefined) {
            // For tahunPerolehan and umurAset, ensure they are integers
            if (field === 'tahunPerolehan' || field === 'umurAset') {
              item[field] = Math.round(parsedNum);
              // Debug log for first few rows
              if (rowNumber <= 5) {
                console.log(`Row ${rowNumber}: ${field} = ${value} -> ${item[field]}`);
              }
            }
            // For nilaiPerolehan, prioritize "Nilai Perolehan Pertama" over "Nilai Perolehan"
            else if (field === 'nilaiPerolehan' && !item.nilaiPerolehan) {
              item[field] = parsedNum;
            }
            // For other number fields
            else if (field !== 'nilaiPerolehan') {
              item[field] = parsedNum;
            }
          }
          break;
        
        // Date fields
        case 'tanggalPerolehan':
        case 'tanggalSertifikat':
        case 'tanggalPengapusan':
          const parsedDate = parseDate(value, XLSX);
          // For tanggalPerolehan, prioritize "Tanggal Buku Pertama" over "Tanggal Perolehan"
          if (parsedDate && !item[field]) {
            item[field] = parsedDate;
          }
          break;
        
        // Status field
        case 'statusBMN':
          const status = validateStatus(value);
          if (status) {
            item.statusBMN = status;
          } else {
            allErrors.push({
              row: rowNumber,
              field: 'statusBMN',
              value,
              message: `Status BMN tidak valid: "${value}". Harus salah satu dari: Aktif, Tidak Aktif, Hilang, Rusak`,
              severity: 'error',
            });
          }
          break;
        
        // Kondisi field
        case 'kondisi':
          const kondisi = validateKondisi(value);
          if (kondisi) {
            item.kondisi = kondisi;
          } else if (value) {
            allWarnings.push({
              row: rowNumber,
              field: 'kondisi',
              value,
              message: `Kondisi tidak valid: "${value}". Harus salah satu dari: Baik, Rusak Ringan, Rusak Berat`,
              severity: 'warning',
            });
          }
          break;
      }
    }
    
    // Extract tahunPerolehan from tanggalPerolehan if not already set
    if (!item.tahunPerolehan && item.tanggalPerolehan) {
      try {
        const date = new Date(item.tanggalPerolehan);
        if (!isNaN(date.getTime())) {
          item.tahunPerolehan = date.getFullYear();
          // Debug log
          if (rowNumber <= 5) {
            console.log(`Row ${rowNumber}: Extracted tahunPerolehan=${item.tahunPerolehan} from tanggalPerolehan=${item.tanggalPerolehan}`);
          }
        }
      } catch (error) {
        console.error(`Row ${rowNumber}: Failed to extract year from tanggalPerolehan=${item.tanggalPerolehan}`);
      }
    }
    
    // Validate item
    const validationErrors = validateBMNItem(item, rowNumber);
    
    // Separate errors and warnings
    const errors = validationErrors.filter(e => e.severity === 'error');
    const warnings = validationErrors.filter(e => e.severity === 'warning');
    
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    
    // Only add item if no errors (warnings are acceptable)
    if (errors.length === 0 && item.kodeBarang && item.namaBarang && item.statusBMN) {
      items.push({
        id: '', // Will be generated by database
        kodeBarang: item.kodeBarang,
        namaBarang: item.namaBarang,
        statusBMN: item.statusBMN,
        jenisBMN: item.jenisBMN,
        merk: item.merk,
        tipe: item.tipe,
        kondisi: item.kondisi,
        nilaiPerolehan: item.nilaiPerolehan,
        tahunPerolehan: item.tahunPerolehan,
        tanggalPerolehan: item.tanggalPerolehan,
        umurAset: item.umurAset, // Store umur aset from Excel
        jumlah: item.jumlah,
        satuan: item.satuan,
        luas: item.luas,
        namaSatker: item.namaSatker,
        alamat: item.alamat,
        kota: item.kota,
        provinsi: item.provinsi,
        nomorRegister: item.nomorRegister,
        nomorSertifikat: item.nomorSertifikat,
        tanggalSertifikat: item.tanggalSertifikat,
        tanggalPengapusan: item.tanggalPengapusan,
        alasanPengapusan: item.alasanPengapusan,
        keterangan: item.keterangan,
        rawData: rawDataFromExcel, // Include complete Excel data
        createdBy: userId,
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  const totalRows = rawData.length;
  const validRows = items.length;
  const invalidRows = totalRows - validRows;
  
  return {
    success: allErrors.length === 0,
    data: items,
    errors: allErrors,
    warnings: allWarnings,
    totalRows,
    validRows,
    invalidRows,
  };
}
