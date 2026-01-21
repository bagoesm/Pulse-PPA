// src/components/SuratViewModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, FileText, Calendar, Building2, Link2, ExternalLink, Save, Upload } from 'lucide-react';
import { Surat } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { getAttachmentUrl } from '../utils/storageUtils';

interface SuratViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat | null;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  currentUserName: string;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const SuratViewModal: React.FC<SuratViewModalProps> = ({
  isOpen,
  onClose,
  surat,
  onUpdate,
  onDelete,
  currentUserName,
  showNotification
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  
  // Edit form state
  const [editData, setEditData] = useState<Partial<Surat>>({});

  useEffect(() => {
    if (surat) {
      setEditData(surat);
      
      // Refresh file URL
      if (surat.fileSurat && !surat.fileSurat.isLink) {
        getAttachmentUrl(surat.fileSurat).then(url => setFileUrl(url));
      } else if (surat.fileSurat?.isLink) {
        setFileUrl(surat.fileSurat.url || '');
      }
    }
  }, [surat]);

  if (!isOpen || !surat) return null;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(surat);
    setNewFile(null);
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewFile(file);
  };

  const handleAddLink = () => {
    if (!linkUrl || !linkTitle) {
      showNotification('Link Tidak Lengkap', 'Mohon isi judul dan URL link', 'warning');
      return;
    }

    const linkAttachment = {
      id: `link_${Date.now()}`,
      name: linkTitle,
      size: 0,
      type: 'link',
      path: '',
      url: linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`,
      isLink: true
    };

    setEditData(prev => ({ ...prev, fileSurat: linkAttachment }));
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleSave = async () => {
    if (!editData.nomorSurat || !editData.tanggalSurat || !editData.jenisSurat) {
      showNotification('Data Tidak Lengkap', 'Nomor surat, tanggal surat, dan jenis surat wajib diisi', 'warning');
      return;
    }

    setIsSaving(true);
    let uploadedFilePath: string | null = null;
    
    try {
      let fileSurat = editData.fileSurat;

      // Handle new file upload
      if (newFile) {
        setIsUploading(true);
        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        uploadedFilePath = filePath;

        const { error: uploadError } = await supabase.storage
          .from('attachment')
          .upload(filePath, newFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachment')
          .getPublicUrl(filePath);

        // Delete old file if exists and not a link
        if (surat.fileSurat && !surat.fileSurat.isLink && surat.fileSurat.path) {
          try {
            await supabase.storage.from('attachment').remove([surat.fileSurat.path]);
          } catch (error) {
            console.error('Error deleting old file:', error);
          }
        }

        fileSurat = {
          id: `file_${Date.now()}`,
          name: newFile.name,
          size: newFile.size,
          type: newFile.type,
          path: filePath,
          url: publicUrl,
          isLink: false
        };
        setIsUploading(false);
      }

      const payload = {
        jenis_surat: editData.jenisSurat,
        nomor_surat: editData.nomorSurat,
        tanggal_surat: editData.tanggalSurat,
        hal: editData.hal || null,
        asal_surat: editData.jenisSurat === 'Masuk' ? (editData.asalSurat || null) : null,
        tujuan_surat: editData.jenisSurat === 'Keluar' ? (editData.tujuanSurat || null) : null,
        klasifikasi_surat: editData.klasifikasiSurat || null,
        jenis_naskah: editData.jenisNaskah || null,
        sifat_surat: editData.sifatSurat || null,
        bidang_tugas: editData.bidangTugas || null,
        tanggal_diterima: editData.jenisSurat === 'Masuk' ? (editData.tanggalDiterima || null) : null,
        tanggal_dikirim: editData.jenisSurat === 'Keluar' ? (editData.tanggalDikirim || null) : null,
        disposisi: editData.jenisSurat === 'Masuk' ? (editData.disposisi || null) : null,
        hasil_tindak_lanjut: editData.hasilTindakLanjut || null,
        file_surat: fileSurat,
        tanggal_kegiatan: editData.tanggalKegiatan || null,
        waktu_mulai: editData.tanggalKegiatan ? editData.waktuMulai : null,
        waktu_selesai: editData.tanggalKegiatan ? editData.waktuSelesai : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('surats')
        .update(payload)
        .eq('id', surat.id);

      if (error) throw error;

      showNotification('Surat Berhasil Diupdate', `Surat ${editData.nomorSurat} berhasil diperbarui`, 'success');
      setIsEditing(false);
      setNewFile(null);
      onUpdate();
    } catch (error: any) {
      // Cleanup uploaded file if save failed
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('attachment').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      showNotification('Gagal Update Surat', error.message, 'error');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Hapus surat ${surat.nomorSurat}? Tindakan ini tidak dapat dibatalkan.`)) {
      onDelete(surat.id);
      onClose();
    }
  };

  const renderField = (label: string, value: string | undefined, field: keyof Surat, type: 'text' | 'date' | 'time' | 'textarea' = 'text') => {
    if (isEditing) {
      if (type === 'textarea') {
        return (
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</label>
            <textarea
              value={(editData[field] as string) || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
              rows={3}
            />
          </div>
        );
      }
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</label>
          <input
            type={type}
            value={(editData[field] as string) || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
          />
        </div>
      );
    }

    return value ? (
      <div className="bg-white p-3 rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</p>
        <p className="text-slate-700 whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h3 className="text-xl font-bold">{isEditing ? 'Edit Surat' : 'Detail Surat'}</h3>
                <p className="text-sm text-gov-100 mt-0.5">{surat.nomorSurat}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Jenis Surat - Editable */}
            {isEditing ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Jenis Surat</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, jenisSurat: 'Masuk' }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      editData.jenisSurat === 'Masuk'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Surat Masuk</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, jenisSurat: 'Keluar' }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      editData.jenisSurat === 'Keluar'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Surat Keluar</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center text-sm font-semibold px-4 py-2 rounded-full ${
                  surat.jenisSurat === 'Masuk' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {surat.jenisSurat}
                </span>
                {surat.jenisNaskah && (
                  <span className="text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                    {surat.jenisNaskah}
                  </span>
                )}
                {surat.sifatSurat && (
                  <span className="text-sm text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full">
                    {surat.sifatSurat}
                  </span>
                )}
              </div>
            )}

            {/* Jenis Naskah & Sifat Surat - Editable */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Jenis Naskah</label>
                  <select
                    value={editData.jenisNaskah || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, jenisNaskah: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                  >
                    <option value="">-- Pilih Jenis --</option>
                    <option value="Surat">Surat</option>
                    <option value="Nota Dinas">Nota Dinas</option>
                    <option value="Surat Edaran">Surat Edaran</option>
                    <option value="Surat Keputusan">Surat Keputusan</option>
                    <option value="Surat Perintah">Surat Perintah</option>
                    <option value="Surat Tugas">Surat Tugas</option>
                    <option value="Surat Undangan">Surat Undangan</option>
                    <option value="Disposisi">Disposisi</option>
                    <option value="Memorandum">Memorandum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Sifat Surat</label>
                  <select
                    value={editData.sifatSurat || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, sifatSurat: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                  >
                    <option value="">-- Pilih Sifat --</option>
                    <option value="Biasa">Biasa</option>
                    <option value="Segera">Segera</option>
                    <option value="Sangat Segera">Sangat Segera</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
              </div>
            )}

            {/* File Surat - Editable */}
            {isEditing ? (
              <div className="bg-gov-50 border border-gov-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gov-700 uppercase mb-3">Dokumen Surat</p>
                
                {/* Current File */}
                {editData.fileSurat && !newFile && (
                  <div className="mb-3 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      {editData.fileSurat.isLink ? <Link2 size={16} className="text-gov-600" /> : <FileText size={16} className="text-gov-600" />}
                      <span className="text-sm font-medium text-slate-700">{editData.fileSurat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditData(prev => ({ ...prev, fileSurat: undefined }))}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                {/* New File Preview */}
                {newFile && (
                  <div className="mb-3 flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-green-600" />
                      <span className="text-sm font-medium text-slate-700">{newFile.name}</span>
                      <span className="text-xs text-green-600">(Baru)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Batal
                    </button>
                  </div>
                )}

                {/* Upload Options */}
                {!editData.fileSurat && !newFile && !showLinkInput && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <div className="py-3 border-2 border-dashed border-slate-300 rounded-lg text-center text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors">
                        Upload File Baru
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(true)}
                      className="py-3 border border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors"
                    >
                      Tambah Link
                    </button>
                  </div>
                )}

                {/* Link Input */}
                {showLinkInput && (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-300">
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Judul dokumen..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="flex-1 py-2 bg-gov-600 text-white rounded-lg text-sm font-medium hover:bg-gov-700"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkInput(false);
                          setLinkUrl('');
                          setLinkTitle('');
                        }}
                        className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* View Mode File */
              surat.fileSurat && (
                <div className="bg-gov-50 border border-gov-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gov-700 uppercase mb-2">Dokumen Surat</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {surat.fileSurat.isLink ? <Link2 size={18} className="text-gov-600" /> : <FileText size={18} className="text-gov-600" />}
                      <span className="text-sm font-medium text-slate-700">{surat.fileSurat.name}</span>
                    </div>
                    <a
                      href={fileUrl || surat.fileSurat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors text-sm font-medium"
                    >
                      {surat.fileSurat.isLink ? <ExternalLink size={14} /> : <FileText size={14} />}
                      Buka
                    </a>
                  </div>
                </div>
              )
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Nomor Surat', surat.nomorSurat, 'nomorSurat')}
              {renderField('Tanggal Surat', surat.tanggalSurat, 'tanggalSurat', 'date')}
            </div>

            {renderField('Hal / Perihal', surat.hal, 'hal')}

            {/* Pengirim/Penerima */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surat.jenisSurat === 'Masuk' && renderField('Dari (Pengirim)', surat.asalSurat, 'asalSurat')}
              {surat.jenisSurat === 'Keluar' && renderField('Kepada (Penerima)', surat.tujuanSurat, 'tujuanSurat')}
              {renderField('Bidang Tugas', surat.bidangTugas, 'bidangTugas')}
            </div>

            {/* Klasifikasi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Klasifikasi Surat', surat.klasifikasiSurat, 'klasifikasiSurat')}
              {surat.jenisSurat === 'Masuk' && renderField('Tanggal Diterima', surat.tanggalDiterima, 'tanggalDiterima', 'date')}
              {surat.jenisSurat === 'Keluar' && renderField('Tanggal Dikirim', surat.tanggalDikirim, 'tanggalDikirim', 'date')}
            </div>

            {/* Disposisi (only for Surat Masuk) */}
            {surat.jenisSurat === 'Masuk' && renderField('Disposisi', surat.disposisi, 'disposisi', 'textarea')}

            {/* Hasil Tindak Lanjut */}
            {renderField('Hasil Tindak Lanjut', surat.hasilTindakLanjut, 'hasilTindakLanjut', 'textarea')}

            {/* Jadwal Kegiatan */}
            {(surat.tanggalKegiatan || isEditing) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-3">Jadwal Kegiatan</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderField('Tanggal', surat.tanggalKegiatan, 'tanggalKegiatan', 'date')}
                  {renderField('Waktu Mulai', surat.waktuMulai, 'waktuMulai', 'time')}
                  {renderField('Waktu Selesai', surat.waktuSelesai, 'waktuSelesai', 'time')}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Informasi Sistem</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Dibuat oleh:</span>
                  <span className="ml-2 font-medium text-slate-700">{surat.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal dibuat:</span>
                  <span className="ml-2 font-medium text-slate-700">
                    {new Date(surat.createdAt).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <Trash2 size={16} />
            Hapus
          </button>
          
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Simpan
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                >
                  Tutup
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuratViewModal;
