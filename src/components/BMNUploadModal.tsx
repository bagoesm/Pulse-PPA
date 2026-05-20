// src/components/BMNUploadModal.tsx
// Modal for uploading BMN data files (Excel/CSV)
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 12.2

import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2, File } from 'lucide-react';
import { User, BMNParseResult } from '../../types';
import { parseExcelFile, parseCSVFile } from '../utils/bmnParser';
import { useBMNHandlers } from '../hooks/useBMNHandlers';
import { supabase } from '../lib/supabaseClient';

interface BMNUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUploadSuccess: () => void;
}

const BMNUploadModal: React.FC<BMNUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  showNotification,
  onUploadSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<BMNParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // User can only upload for their own satker
  const userSatker = currentUser?.divisi || '';

  // Get upload handler from hook
  const { handleUploadFile, canUploadBMN } = useBMNHandlers({
    currentUser,
    bmnItems: [],
    setBmnItems: () => {},
    showNotification,
    fetchBMNItems: async () => {},
    fetchUploadHistory: async () => {}
  });

  // Check permission
  const hasPermission = canUploadBMN();

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      showNotification(
        'Format File Tidak Valid',
        'Hanya file Excel (.xlsx, .xls) atau CSV (.csv) yang diperbolehkan.',
        'error'
      );
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showNotification(
        'File Terlalu Besar',
        'Ukuran file maksimal adalah 10MB.',
        'error'
      );
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);

    try {
      // Parse file based on type
      let result: BMNParseResult;
      if (fileExtension === 'csv') {
        result = await parseCSVFile(file, currentUser?.id || '');
      } else {
        result = await parseExcelFile(file, currentUser?.id || '');
      }

      setParseResult(result);

      if (!result.success || result.errors.length > 0) {
        showNotification(
          'Validasi Gagal',
          `Ditemukan ${result.errors.length} error dalam file. Silakan periksa preview.`,
          'error'
        );
      } else if (result.warnings.length > 0) {
        showNotification(
          'Peringatan',
          `File valid dengan ${result.warnings.length} peringatan. Silakan review sebelum upload.`,
          'warning'
        );
      } else {
        showNotification(
          'File Valid',
          `File berhasil divalidasi. ${result.validRows} baris siap diupload.`,
          'success'
        );
      }
    } catch (error) {
      console.error('Parse error:', error);
      showNotification(
        'Kesalahan',
        `Gagal membaca file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
    }
  }, [currentUser, showNotification]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !parseResult || !parseResult.success) {
      showNotification(
        'Tidak Dapat Upload',
        'File belum valid atau belum dipilih.',
        'warning'
      );
      return;
    }

    if (!userSatker) {
      showNotification(
        'Satker Tidak Ditemukan',
        'Satker Anda tidak ditemukan. Silakan hubungi administrator.',
        'error'
      );
      return;
    }

    setIsUploading(true);

    try {
      await handleUploadFile(selectedFile, userSatker);
      
      // Success - close modal and refresh
      onUploadSuccess();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      // Error notification already handled by handleUploadFile
    } finally {
      setIsUploading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedFile(null);
    setParseResult(null);
    setIsParsing(false);
    setIsUploading(false);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (!isOpen) return null;

  // Check permission
  if (!hasPermission) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">Akses Ditolak</h3>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="text-red-600" size={24} />
            <p className="text-sm text-red-800">
              Anda tidak memiliki izin untuk mengupload data BMN. Hanya Atasan dan Super Admin yang dapat mengupload.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload size={24} />
              <h3 className="text-xl font-bold">Upload Data BMN</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Satker Info (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Satker Anda
            </label>
            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-medium">
              {userSatker || 'Satker tidak ditemukan'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Anda hanya dapat mengupload data untuk satker Anda sendiri
            </p>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Pilih File Excel atau CSV
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-gov-500 bg-gov-50'
                  : 'border-slate-300 hover:border-gov-400 hover:bg-slate-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isParsing || isUploading}
              />
              
              {!selectedFile ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-gov-100 rounded-full">
                      <FileText className="text-gov-600" size={32} />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-700 font-medium mb-1">
                      Drag & drop file di sini atau
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing || isUploading}
                      className="text-gov-600 hover:text-gov-700 font-semibold underline disabled:opacity-50"
                    >
                      pilih file
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Format: .xlsx, .xls, .csv • Maksimal 10MB • Maksimal 10,000 baris
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-green-100 rounded-full">
                      <File className="text-green-600" size={32} />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  {!isParsing && !isUploading && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setParseResult(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Hapus File
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Parsing Indicator */}
          {isParsing && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="text-blue-600 animate-spin" size={20} />
              <p className="text-sm text-blue-800">Memvalidasi file...</p>
            </div>
          )}

          {/* Parse Result Summary */}
          {parseResult && !isParsing && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Informasi File</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total Baris</p>
                    <p className="text-lg font-bold text-slate-800">{parseResult.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Baris Valid</p>
                    <p className="text-lg font-bold text-green-600">{parseResult.validRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Baris Error</p>
                    <p className="text-lg font-bold text-red-600">{parseResult.invalidRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Peringatan</p>
                    <p className="text-lg font-bold text-yellow-600">{parseResult.warnings.length}</p>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-red-600" size={20} />
                    <h4 className="text-sm font-semibold text-red-800">
                      Error Validasi ({parseResult.errors.length})
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {parseResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-white p-2 rounded">
                        <span className="font-semibold">Baris {error.row}:</span> {error.message}
                        {error.field && <span className="text-xs text-red-600"> (Field: {error.field})</span>}
                      </div>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-xs text-red-600 italic">
                        ... dan {parseResult.errors.length - 10} error lainnya
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-yellow-600" size={20} />
                    <h4 className="text-sm font-semibold text-yellow-800">
                      Peringatan ({parseResult.warnings.length})
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {parseResult.warnings.slice(0, 5).map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700 bg-white p-2 rounded">
                        <span className="font-semibold">Baris {warning.row}:</span> {warning.message}
                        {warning.field && <span className="text-xs text-yellow-600"> (Field: {warning.field})</span>}
                      </div>
                    ))}
                    {parseResult.warnings.length > 5 && (
                      <p className="text-xs text-yellow-600 italic">
                        ... dan {parseResult.warnings.length - 5} peringatan lainnya
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Data */}
              {parseResult.data.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">
                    Preview Data (10 baris pertama)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-200">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">No</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">Kode Barang</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">Nama Barang</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">Status</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">Kondisi</th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-700">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {parseResult.data.slice(0, 10).map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-2 py-1 text-slate-600">{index + 1}</td>
                            <td className="px-2 py-1 text-slate-800 font-medium">{item.kodeBarang}</td>
                            <td className="px-2 py-1 text-slate-800">{item.namaBarang}</td>
                            <td className="px-2 py-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                item.statusBMN === 'Aktif' ? 'bg-green-100 text-green-700' :
                                item.statusBMN === 'Tidak Aktif' ? 'bg-slate-100 text-slate-700' :
                                item.statusBMN === 'Hilang' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.statusBMN}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-slate-600">{item.kondisi || '-'}</td>
                            <td className="px-2 py-1 text-slate-800">
                              {item.nilaiPerolehan 
                                ? `Rp ${item.nilaiPerolehan.toLocaleString('id-ID')}`
                                : '-'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parseResult.data.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      ... dan {parseResult.data.length - 10} baris lainnya
                    </p>
                  )}
                </div>
              )}

              {/* Success Message */}
              {parseResult.success && parseResult.errors.length === 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="text-green-600" size={20} />
                  <p className="text-sm text-green-800">
                    File valid dan siap diupload. {parseResult.validRows} baris data akan diimport.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {parseResult && parseResult.success && userSatker
                ? `Data akan mengganti data BMN untuk satker: ${userSatker}`
                : 'Pilih file untuk memulai'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={!parseResult || !parseResult.success || parseResult.errors.length > 0 || isUploading || !userSatker}
                className="px-6 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Upload Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMNUploadModal;
