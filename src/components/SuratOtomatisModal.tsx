import React, { useState, useEffect } from 'react';
import { X, FileText, Download, AlertCircle, CheckCircle, Eye, Trash2, Upload } from 'lucide-react';
import { SURAT_TEMPLATES, SuratTemplate, SuratTemplateField, SuratTemplateType } from '../types/suratOtomatis';
import { SuratOtomatisService } from '../services/SuratOtomatisService';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../contexts/UsersContext';
import SearchableSelect from './SearchableSelect';

interface PartnerLogo {
  id: string;
  base64: string;
  aspect: number;
  format: string;
  name: string;
}

interface SuratOtomatisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuratOtomatisModal: React.FC<SuratOtomatisModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { allUsers } = useUsers();
  const [selectedTemplate, setSelectedTemplate] = useState<SuratTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [logos, setLogos] = useState<PartnerLogo[]>([]);

  // Get users by role
  const atasanUsers = allUsers.filter(u => u.role === 'Atasan');
  const allUsersForSelect = allUsers;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setFormData({});
      setErrors([]);
      setLogos([]);
      setSuccessMessage('');
      setShowPreview(false);
      setPreviewContent('');
    }
  }, [isOpen]);

  // Initialize form data with default values when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const initialData: Record<string, string | number> = {};
      selectedTemplate.fields.forEach(field => {
        if (field.defaultValue) {
          initialData[field.id] = field.defaultValue;
        }
      });
      setFormData(initialData);
    }
  }, [selectedTemplate]);

  // Auto-fill fields when dependencies change
  useEffect(() => {
    if (!selectedTemplate) return;

    selectedTemplate.fields.forEach(field => {
      if (field.autoFillFrom) {
        const [sourceField, property] = field.autoFillFrom.split('.');
        
        if (sourceField === 'tanggal_kejadian' && property === 'day') {
          // Auto-fill hari from tanggal
          const tanggal = formData.tanggal_kejadian;
          if (tanggal) {
            const date = new Date(tanggal.toString());
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const hari = days[date.getDay()];
            setFormData(prev => ({ ...prev, hari }));
          }
        } else {
          // Auto-fill from user selection
          const userId = formData[sourceField];
          if (userId) {
            const user = allUsers.find(u => u.id === userId);
            if (user) {
              let value = '';
              switch (property) {
                case 'name':
                  value = user.name;
                  break;
                case 'nip':
                  value = user.nip || '-'; // Ambil NIP dari user
                  break;
                case 'jabatan':
                  value = user.jabatan || '-';
                  break;
              }
              setFormData(prev => ({ ...prev, [field.id]: value }));
            }
          }
        }
      }
    });
  }, [formData.penandatangan_user_id, formData.pegawai_user_id, formData.tanggal_kejadian, selectedTemplate, allUsers]);

  const handleFieldChange = (fieldId: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newLogosCount = files.length;
    if (logos.length + newLogosCount > 3) {
      setErrors(['Maksimal 3 logo partner yang dapat diunggah']);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setErrors(['File harus berupa gambar']);
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors(['Ukuran file tidak boleh lebih dari 2MB']);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        
        let format = 'PNG';
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          format = 'JPEG';
        } else if (file.type === 'image/webp') {
          format = 'WEBP';
        }

        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height;
          setLogos(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              base64,
              aspect,
              format,
              name: file.name
            }
          ]);
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveLogo = (id: string) => {
    setLogos(prev => prev.filter(logo => logo.id !== id));
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    setErrors([]);
    setIsLoadingPreview(true);

    try {
      // Validate required fields first
      const requiredFields = selectedTemplate.fields
        .filter(f => f.required && !f.readOnly)
        .map(f => f.id);

      const validation = SuratOtomatisService.validateFormData(formData, requiredFields);

      if (!validation.isValid) {
        setErrors(validation.errors.map(err => {
          const field = selectedTemplate.fields.find(f => err.includes(f.id));
          return field ? `${field.label} wajib diisi` : err;
        }));
        setIsLoadingPreview(false);
        return;
      }

      if (selectedTemplate.id === 'daftar-hadir') {
        setShowPreview(true);
      } else {
        const preview = await SuratOtomatisService.generatePreview(
          selectedTemplate.id,
          formData
        );
        setPreviewContent(preview);
        setShowPreview(true);
      }
    } catch (error: any) {
      setErrors([error.message || 'Gagal membuat preview. Silakan coba lagi.']);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setErrors([]);
    setSuccessMessage('');

    // Validate required fields (exclude auto-filled fields from validation)
    const requiredFields = selectedTemplate.fields
      .filter(f => f.required && !f.readOnly)
      .map(f => f.id);

    const validation = SuratOtomatisService.validateFormData(formData, requiredFields);

    if (!validation.isValid) {
      setErrors(validation.errors.map(err => {
        const field = selectedTemplate.fields.find(f => err.includes(f.id));
        return field ? `${field.label} wajib diisi` : err;
      }));
      return;
    }

    setIsGenerating(true);

    try {
      if (selectedTemplate.id === 'daftar-hadir') {
        await SuratOtomatisService.generateDaftarHadirPDF(formData, logos);
        setSuccessMessage('Daftar hadir berhasil dibuat dan diunduh!');
      } else {
        await SuratOtomatisService.generateSurat(
          selectedTemplate.id,
          formData
        );
        setSuccessMessage('Surat berhasil dibuat dan diunduh!');
      }
      
      // Clear success message after 4 seconds (without closing the modal)
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);

    } catch (error: any) {
      setErrors([error.message || 'Gagal membuat dokumen. Silakan coba lagi.']);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderField = (field: SuratTemplateField) => {
    const value = formData[field.id] || '';

    const baseInputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${field.readOnly ? 'bg-gray-50 text-gray-600' : ''}`;

    switch (field.type) {
      case 'user-atasan-select':
        return (
          <SearchableSelect
            options={atasanUsers.map(u => ({ value: u.id, label: `${u.name} - ${u.jabatan || 'N/A'}` }))}
            value={value.toString()}
            onChange={(val) => handleFieldChange(field.id, val)}
            placeholder={field.placeholder || 'Pilih penandatangan...'}
            emptyOption="-- Pilih Penandatangan --"
          />
        );

      case 'user-select':
        return (
          <SearchableSelect
            options={allUsersForSelect.map(u => ({ value: u.id, label: `${u.name} - ${u.jabatan || 'N/A'}` }))}
            value={value.toString()}
            onChange={(val) => handleFieldChange(field.id, val)}
            placeholder={field.placeholder || 'Pilih pegawai...'}
            emptyOption="-- Pilih Pegawai --"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={4}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
        );

      case 'multi-date': {
        const dates = value ? String(value).split(',') : [new Date().toISOString().split('T')[0]];
        
        const updateDates = (newDates: string[]) => {
          handleFieldChange(field.id, newDates.filter(Boolean).join(','));
        };

        const handleDateChange = (idx: number, val: string) => {
          const updated = [...dates];
          updated[idx] = val;
          updateDates(updated);
        };

        const addDateRow = () => {
          const today = new Date().toISOString().split('T')[0];
          updateDates([...dates, today]);
        };

        const removeDateRow = (idx: number) => {
          if (dates.length <= 1) return;
          const updated = dates.filter((_, i) => i !== idx);
          updateDates(updated);
        };

        return (
          <div className="space-y-2">
            {dates.map((dateVal, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateVal}
                  onChange={(e) => handleDateChange(idx, e.target.value)}
                  readOnly={field.readOnly}
                  className={`${baseInputClass} flex-1`}
                />
                {!field.readOnly && dates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDateRow(idx)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                    title="Hapus tanggal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {!field.readOnly && (
              <button
                type="button"
                onClick={addDateRow}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-dashed border-blue-300 transition-colors mt-1 font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Tanggal
              </button>
            )}
          </div>
        );
      }

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={field.readOnly}
            className={baseInputClass}
          >
            <option value="">Pilih {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            readOnly={field.readOnly}
            className={baseInputClass}
          />
        );
    }
  };

  if (!isOpen) return null;

  // Preview Modal
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Preview Dokumen
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedTemplate?.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Preview Content - Document Style */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
            <div 
              className="mx-auto bg-white shadow-lg" 
              style={{ 
                maxWidth: selectedTemplate?.id === 'daftar-hadir' ? '297mm' : '210mm',
                minHeight: selectedTemplate?.id === 'daftar-hadir' ? '210mm' : '297mm'
              }}
            >
              {selectedTemplate?.id === 'daftar-hadir' ? (
                /* CUSTOM PREVIEW FOR DAFTAR HADIR */
                <div className="p-10" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {/* Header */}
                  <div className="relative flex justify-between items-center pb-4 mb-6" style={{ minHeight: '90px' }}>
                    {/* Left: KPPPA Logo */}
                    <div className="w-16 h-16 flex items-center justify-start">
                      <img src="/Logo.svg" alt="Logo KPPPA" className="max-w-full max-h-full object-contain" />
                    </div>

                    {/* Center: Title & Details */}
                    <div className="flex-1 text-center px-4">
                      <h1 className="font-bold text-sm leading-tight text-black m-0 mb-1">
                        DAFTAR HADIR {String(formData.tipe_daftar_hadir || 'PESERTA').toUpperCase()}
                      </h1>
                      <h2 className="font-bold text-sm leading-tight text-black m-0 mb-1 whitespace-pre-wrap">
                        {String(formData.nama_kegiatan || 'NAMA KEGIATAN').toUpperCase()}
                      </h2>
                      <p className="font-bold text-sm leading-tight text-black m-0">
                        {formData.tempat_kegiatan ? `${formData.tempat_kegiatan.toString().toUpperCase()}, ` : ''}
                        {formData.tanggal_kegiatan 
                          ? SuratOtomatisService.formatMultipleDates(formData.tanggal_kegiatan.toString()).toUpperCase()
                          : 'TANGGAL KEGIATAN'}
                      </p>
                    </div>

                    {/* Right: Partner Logos */}
                    <div className="w-40 flex justify-end items-center gap-2 h-16">
                      {logos.map((logo) => (
                        <img
                          key={logo.id}
                          src={logo.base64}
                          alt="Logo Partner"
                          className="max-h-full max-w-[35px] object-contain"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  {formData.perlu_rekening === 'Ya' ? (
                    <table className="w-full border-collapse border border-black text-[10px] text-black mb-4">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '4%' }}>No.</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '15%' }}>Nama</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '15%' }}>Instansi</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '13%' }}>Jabatan</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '11%' }}>Nomor Telepon</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '11%' }}>Nama Bank</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '11%' }}>Nomor Rekening</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '11%' }}>Nama Pemilik Rekening</th>
                          <th className="border border-black p-1.5 text-center font-bold" style={{ width: '9%' }}>Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }).map((_, index) => {
                          const rowNum = index + 1;
                          return (
                            <tr key={index} style={{ height: '42px' }}>
                              <td className="border border-black p-1 text-center font-semibold">{rowNum}</td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1.5 align-middle text-left font-bold">
                                <span>{rowNum}.</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full border-collapse border border-black text-xs text-black mb-4">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '5%' }}>No.</th>
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '22%' }}>Nama</th>
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '22%' }}>Instansi</th>
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '19%' }}>Jabatan</th>
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '17%' }}>Nomor Telepon</th>
                          <th className="border border-black p-2 text-center font-bold" style={{ width: '15%' }}>Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 10 }).map((_, index) => {
                          const rowNum = index + 1;
                          return (
                            <tr key={index} style={{ height: '42px' }}>
                              <td className="border border-black p-1 text-center font-semibold">{rowNum}</td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-1"></td>
                              <td className="border border-black p-2 align-middle text-left font-bold">
                                <span>{rowNum}.</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Footer */}
                  <div className="text-right text-[10px] text-gray-500 mt-4">
                    Halaman 1 dari {Math.ceil(Number(formData.jumlah_baris || 20) / 10)}
                  </div>
                </div>
              ) : (
                /* EXISTING PREVIEW FOR SURAT KETERANGAN */
                <div className="p-12" style={{ fontFamily: 'Times New Roman, serif' }}>
                  {/* Header Kementerian */}
                  <div className="text-center mb-8 border-b-2 border-black pb-4">
                    <div className="font-bold text-lg mb-1">KEMENTERIAN PEMBERDAYAAN PEREMPUAN</div>
                    <div className="font-bold text-lg mb-1">DAN PERLINDUNGAN ANAK</div>
                    <div className="font-bold text-lg">REPUBLIK INDONESIA</div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-6">
                    <div className="font-bold text-xl mb-2">SURAT KETERANGAN</div>
                    <div className="text-sm">Nomor: ${'{nomor_naskah}'}</div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4 text-justify leading-relaxed">
                    <p className="mb-4">Yang bertanda tangan di bawah ini:</p>
                    
                    <table className="w-full mb-4">
                      <tbody>
                        <tr>
                          <td className="py-1 align-top" style={{ width: '30%' }}>Nama</td>
                          <td className="py-1 align-top" style={{ width: '5%' }}>:</td>
                          <td className="py-1 align-top">{formData.penandatangan_nama || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 align-top">NIP</td>
                          <td className="py-1 align-top">:</td>
                          <td className="py-1 align-top">{formData.penandatangan_nip || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 align-top">Jabatan</td>
                          <td className="py-1 align-top">:</td>
                          <td className="py-1 align-top">{formData.penandatangan_jabatan || '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="mb-4">Dengan ini menerangkan bahwa:</p>

                    <table className="w-full mb-4">
                      <tbody>
                        <tr>
                          <td className="py-1 align-top" style={{ width: '30%' }}>Nama</td>
                          <td className="py-1 align-top" style={{ width: '5%' }}>:</td>
                          <td className="py-1 align-top">{formData.nama_lengkap || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 align-top">NIP</td>
                          <td className="py-1 align-top">:</td>
                          <td className="py-1 align-top">{formData.nip || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 align-top">Pangkat/Golongan</td>
                          <td className="py-1 align-top">:</td>
                          <td className="py-1 align-top">{formData.pangkat_golongan || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 align-top">Jabatan</td>
                          <td className="py-1 align-top">:</td>
                          <td className="py-1 align-top">{formData.jabatan || '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="mb-2">
                      Pada hari <strong>{formData.hari || '-'}</strong> tanggal{' '}
                      <strong>
                        {formData.tanggal_kejadian 
                          ? new Date(formData.tanggal_kejadian.toString()).toLocaleDateString('id-ID', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })
                          : '-'}
                      </strong>
                      , yang bersangkutan:
                    </p>

                    <div className="mb-4 pl-4">
                      <p className="whitespace-pre-wrap">{formData.keterangan || '-'}</p>
                    </div>

                    <p className="mb-8">
                      Demikian surat keterangan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
                    </p>

                    {/* Signature Section */}
                    <div className="mt-12">
                      <div className="float-right text-center" style={{ width: '40%' }}>
                        <p className="mb-1">Dibuat di Jakarta</p>
                        <p className="mb-12">Pada tanggal ${'{tanggal_naskah}'}</p>
                        <p className="mb-1">${'{jabatan_pengirim}'}</p>
                        <div className="my-12 text-gray-400 italic">(Tanda Tangan)</div>
                        <p className="font-bold mb-1">{formData.penandatangan_nama || '-'}</p>
                        <p>NIP. {formData.penandatangan_nip || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {selectedTemplate?.previewInstructions && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-[210mm] mx-auto">
                <p className="text-sm text-blue-700">
                  <strong>Catatan:</strong> {selectedTemplate.previewInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Kembali ke Form
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Membuat Surat...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Surat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Buat Surat Otomatis
              </h2>
              <p className="text-sm text-gray-500">
                Pilih template dan isi data untuk membuat surat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Template Selection */}
          {!selectedTemplate ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pilih Template Surat
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SURAT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <FileText className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Form Fields */
            <div className="space-y-6">
              {/* Template Info */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedTemplate.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ganti Template
                </button>
              </div>

              {/* Error Messages */}
              {errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">
                        Terdapat kesalahan:
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, idx) => (
                          <li key={idx} className="text-sm text-red-700">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">
                      {successMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              {selectedTemplate.id === 'daftar-hadir' ? (
                /* CUSTOM FORM FOR DAFTAR HADIR */
                <div className="space-y-8">
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
                      📋 Informasi Kegiatan & Daftar Hadir
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedTemplate.fields.map(field => (
                        <div
                          key={field.id}
                          className={field.id === 'nama_kegiatan' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {renderField(field)}
                          {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                      🖼️ Logo Partner / Pendukung (Maksimal 3)
                    </h4>
                    <div className="space-y-4">
                      {/* Logo Uploader */}
                      {logos.length < 3 && (
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Klik untuk unggah logo partner</span> atau seret gambar ke sini
                              </p>
                              <p className="text-xs text-gray-400">
                                PNG, JPG, JPEG, atau WEBP (Maksimal 2MB per file)
                              </p>
                            </div>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                        </div>
                      )}

                      {/* Uploaded Logos Grid */}
                      {logos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {logos.map((logo) => (
                            <div key={logo.id} className="relative border border-gray-200 rounded-lg p-3 bg-white flex flex-col items-center justify-center group">
                              <button
                                type="button"
                                onClick={() => handleRemoveLogo(logo.id)}
                                className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="w-24 h-24 flex items-center justify-center mb-2">
                                <img
                                  src={logo.base64}
                                  alt={logo.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <p className="text-xs text-gray-500 text-center truncate w-full px-2">
                                {logo.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* EXISTING THREE-SECTION FORM */
                <div className="space-y-8">
                  {/* Section 1: Data Penandatangan */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
                      📝 Data Penandatangan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedTemplate.fields.slice(0, 4).map(field => (
                        <div
                          key={field.id}
                          className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                            {field.required && !field.readOnly && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            {field.readOnly && (
                              <span className="text-gray-400 ml-1 text-xs">(otomatis)</span>
                            )}
                          </label>
                          {renderField(field)}
                          {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Data Pegawai */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-green-200">
                      👤 Data Pegawai
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedTemplate.fields.slice(4, 9).map(field => (
                        <div
                          key={field.id}
                          className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                            {field.required && !field.readOnly && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            {field.readOnly && (
                              <span className="text-gray-400 ml-1 text-xs">(otomatis)</span>
                            )}
                          </label>
                          {renderField(field)}
                          {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Keterangan */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-orange-200">
                      📋 Keterangan
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedTemplate.fields.slice(9).map(field => (
                        <div
                          key={field.id}
                          className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                        >
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                            {field.required && !field.readOnly && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            {field.readOnly && (
                              <span className="text-gray-400 ml-1 text-xs">(otomatis)</span>
                            )}
                          </label>
                          {renderField(field)}
                          {field.helpText && (
                            <p className="mt-1 text-xs text-gray-500">
                              {field.helpText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isGenerating || isLoadingPreview}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handlePreview}
              disabled={isGenerating || isLoadingPreview}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingPreview ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memuat Preview...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              )}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingPreview}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Membuat Surat...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Buat & Download
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
