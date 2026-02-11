// src/components/DisposisiModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Download, Trash2, Calendar, Users, AlertCircle, Save, Link2, ExternalLink, ArrowRight, Plus } from 'lucide-react';
import { Disposisi, DisposisiStatus, Attachment, User } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { formatErrorForUser, validateFile as validateFileUtil } from '../utils/errorHandling';
import AuditTrailDisplay from './AuditTrailDisplay';
import { useDisposisi } from '../contexts/DisposisiContext';

interface DisposisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (disposisi: Omit<Disposisi, 'id' | 'createdAt'>) => void;
  initialData?: Disposisi | null;
  currentUser: User | null;
  users: User[];
  suratId?: string;
  kegiatanId?: string;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const DISPOSISI_STATUSES: { value: DisposisiStatus; label: string; color: string }[] = [
  { value: 'Pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
];

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const validateFile = (file: File): { valid: boolean; error?: string } => {
  try {
    validateFileUtil(file, 10); // 10MB max
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: formatErrorForUser(error),
    };
  }
};

const DisposisiModal: React.FC<DisposisiModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  currentUser,
  users,
  suratId,
  kegiatanId,
  showNotification,
}) => {
  const { createSubdisposisi } = useDisposisi();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // View/Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Tab state for view mode
  const [activeTab, setActiveTab] = useState<'detail' | 'context' | 'history' | 'subdisposisi'>('detail');
  
  // Subdisposisi form state
  const [showSubdisposisiForm, setShowSubdisposisiForm] = useState(false);
  const [isCreatingSubdisposisi, setIsCreatingSubdisposisi] = useState(false);
  
  // Subdisposisi form state
  const [subSelectedUsers, setSubSelectedUsers] = useState<string[]>([]);
  const [subDisposisiText, setSubDisposisiText] = useState('');
  const [subDeadline, setSubDeadline] = useState('');
  const [subNotes, setSubNotes] = useState('');
  
  // Subdisposisi user search state
  const [subUserSearch, setSubUserSearch] = useState('');
  const [showSubUserDropdown, setShowSubUserDropdown] = useState(false);
  const subUserDropdownRef = useRef<HTMLDivElement>(null);
  
  // Context data (Surat & Kegiatan)
  const [suratData, setSuratData] = useState<any>(null);
  const [kegiatanData, setKegiatanData] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Form state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [disposisiText, setDisposisiText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<DisposisiStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [laporan, setLaporan] = useState<Attachment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Link input state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // User search state
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (subUserDropdownRef.current && !subUserDropdownRef.current.contains(event.target as Node)) {
        setShowSubUserDropdown(false);
      }
    };

    if (showUserDropdown || showSubUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showSubUserDropdown]);

  // Initialize form when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      // Reset to view mode when opening
      setIsEditMode(!initialData); // Edit mode only if creating new
      setActiveTab('detail');
      
      if (initialData) {
        setSelectedUsers([initialData.assignedTo]);
        setDisposisiText(initialData.disposisiText);
        setDeadline(initialData.deadline || '');
        setStatus(initialData.status);
        setNotes(initialData.notes || '');
        setLaporan(initialData.laporan || []);
        setAttachments(initialData.attachments || []);
      } else {
        // Reset form for new disposisi
        setSelectedUsers([]);
        setDisposisiText('');
        setDeadline('');
        setStatus('Pending');
        setNotes('');
        setLaporan([]);
        setAttachments([]);
      }
      setUserSearch('');
      setShowUserDropdown(false);
      setShowLinkInput(false);
      setLinkTitle('');
      setLinkUrl('');
      setShowSubdisposisiForm(false);
      setSubUserSearch('');
      setShowSubUserDropdown(false);
    }
  }, [isOpen, initialData]);

  // Fetch context data (Surat & Kegiatan) when context tab is opened
  useEffect(() => {
    if (isOpen && initialData && activeTab === 'context') {
      loadContextData();
    }
  }, [isOpen, initialData, activeTab]);

  const loadContextData = async () => {
    if (!initialData) return;
    
    setIsLoadingContext(true);
    try {
      // Fetch Surat data
      const { data: suratRow, error: suratError } = await supabase
        .from('surats')
        .select('*')
        .eq('id', initialData.suratId)
        .single();
      
      if (suratError) throw suratError;
      setSuratData(suratRow);
      
      // Fetch Kegiatan data
      const { data: kegiatanRow, error: kegiatanError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', initialData.kegiatanId)
        .single();
      
      if (kegiatanError) throw kegiatanError;
      setKegiatanData(kegiatanRow);
    } catch (error) {
      console.error('Error loading context data:', error);
      showNotification('Gagal Memuat', 'Gagal memuat data surat dan kegiatan', 'error');
    } finally {
      setIsLoadingContext(false);
    }
  };

  if (!isOpen) return null;

  const isViewMode = initialData && !isEditMode;
  const isCreateMode = !initialData;
  
  // Check if current user can edit this disposisi
  const canEdit = currentUser && initialData && (
    currentUser.role === 'Super Admin' ||
    currentUser.id === initialData.createdBy ||
    currentUser.name === initialData.createdBy ||
    currentUser.id === initialData.assignedTo
  );

  // Check if submit should be disabled (Completed status requires laporan)
  const isSubmitDisabled = isSaving || isUploading || (status === 'Completed' && laporan.length === 0);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    if (isEditMode) return; // Can't change assignee in edit mode
    
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Toggle subdisposisi user selection
  const toggleSubUserSelection = (userId: string) => {
    setSubSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      showNotification('File Tidak Valid', validation.error || 'File tidak valid', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    let uploadedFilePath: string | null = null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `laporan/${fileName}`;
      uploadedFilePath = filePath;

      const { error: uploadError } = await supabase.storage
        .from('attachment')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachment')
        .getPublicUrl(filePath);

      const attachment: Attachment = {
        id: `file_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        url: publicUrl,
        isLink: false,
      };

      setLaporan(prev => [...prev, attachment]);
      showNotification('File Berhasil Diupload', file.name, 'success');
    } catch (error: any) {
      // Cleanup uploaded file if there's an error
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('attachment').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      showNotification('Gagal Upload File', formatErrorForUser(error), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle add link
  const handleAddLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      showNotification('Link Tidak Lengkap', 'Mohon isi judul dan URL link', 'warning');
      return;
    }

    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const linkAttachment: Attachment = {
      id: `link_${Date.now()}`,
      name: linkTitle.trim(),
      size: 0,
      type: 'link',
      path: '',
      url: url,
      isLink: true,
    };

    setLaporan(prev => [...prev, linkAttachment]);
    setLinkTitle('');
    setLinkUrl('');
    setShowLinkInput(false);
    showNotification('Link Ditambahkan', linkTitle.trim(), 'success');
  };

  // Handle remove file
  const handleRemoveFile = async (attachmentId: string) => {
    const attachment = laporan.find(a => a.id === attachmentId);
    
    if (attachment && !attachment.isLink && attachment.path) {
      try {
        await supabase.storage.from('attachment').remove([attachment.path]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    setLaporan(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validation
    if (!isEditMode && selectedUsers.length === 0) {
      showNotification('Pilih Assignee', 'Minimal 1 user harus dipilih sebagai assignee', 'warning');
      return;
    }

    if (!disposisiText.trim()) {
      showNotification('Disposisi Wajib Diisi', 'Mohon isi teks disposisi', 'warning');
      return;
    }

    if (!suratId || !kegiatanId) {
      showNotification('Data Tidak Lengkap', 'Surat ID dan Kegiatan ID harus tersedia', 'error');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditMode) {
        // Update existing disposisi
        const payload: Omit<Disposisi, 'id' | 'createdAt'> = {
          suratId: initialData.suratId,
          kegiatanId: initialData.kegiatanId,
          assignedTo: initialData.assignedTo,
          disposisiText: disposisiText.trim(),
          status,
          deadline: deadline || undefined,
          laporan,
          attachments,
          notes: notes.trim() || undefined,
          createdBy: initialData.createdBy,
          updatedAt: new Date().toISOString(),
          completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
          completedBy: status === 'Completed' ? currentUser?.name : undefined,
        };

        await onSave(payload);
        showNotification('Disposisi Diperbarui', 'Disposisi berhasil diperbarui', 'success');
      } else {
        // Create new disposisi for each selected user
        for (const userId of selectedUsers) {
          const payload: Omit<Disposisi, 'id' | 'createdAt'> = {
            suratId: suratId!,
            kegiatanId: kegiatanId!,
            assignedTo: userId,
            disposisiText: disposisiText.trim(),
            status: 'Pending',
            deadline: deadline || undefined,
            laporan,
            attachments,
            notes: notes.trim() || undefined,
            createdBy: currentUser?.name || 'System',
          };

          await onSave(payload);
        }

        showNotification(
          'Disposisi Dibuat',
          `Disposisi berhasil dibuat untuk ${selectedUsers.length} user`,
          'success'
        );
      }

      handleClose();
    } catch (error: any) {
      showNotification('Gagal Menyimpan', formatErrorForUser(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedUsers([]);
    setDisposisiText('');
    setDeadline('');
    setStatus('Pending');
    setNotes('');
    setLaporan([]);
    setAttachments([]);
    setUserSearch('');
    setShowUserDropdown(false);
    setShowLinkInput(false);
    setLinkTitle('');
    setLinkUrl('');
    onClose();
  };

  // Handle subdisposisi creation
  const handleCreateSubdisposisi = async () => {
    if (!initialData || !currentUser) return;
    
    // Validation
    if (subSelectedUsers.length === 0) {
      showNotification('Validasi Gagal', 'Pilih minimal satu user untuk ditugaskan', 'warning');
      return;
    }
    
    if (subSelectedUsers.length > 1) {
      showNotification('Validasi Gagal', 'Disposisi lanjutan hanya dapat dibuat untuk satu user', 'warning');
      return;
    }
    
    if (!subDisposisiText.trim()) {
      showNotification('Validasi Gagal', 'Teks disposisi harus diisi', 'warning');
      return;
    }

    setIsCreatingSubdisposisi(true);
    
    try {
      // Create subdisposisi - this will UPDATE the existing disposisi
      await createSubdisposisi(initialData.id, {
        suratId: initialData.suratId,
        kegiatanId: initialData.kegiatanId,
        assignedTo: subSelectedUsers[0],
        disposisiText: subDisposisiText,
        status: 'Pending',
        deadline: subDeadline || undefined,
        notes: subNotes || undefined,
        createdBy: currentUser.id || currentUser.name,
        laporan: [],
        attachments: [],
      });

      showNotification(
        'Berhasil',
        'Disposisi berhasil dilanjutkan. Disposisi sebelumnya tercatat dalam riwayat perubahan.',
        'success'
      );

      // Close modal and refresh
      handleClose();
    } catch (error: any) {
      console.error('Error creating subdisposisi:', error);
      showNotification('Gagal', error.message || 'Gagal membuat disposisi lanjutan', 'error');
    } finally {
      setIsCreatingSubdisposisi(false);
    }
  };

  // Helper to get user name
  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <h3 className="text-xl font-bold">
                {isCreateMode ? 'Buat Disposisi Baru' : isViewMode ? 'Detail Disposisi' : 'Edit Disposisi'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Edit Button - Only show in view mode if user has permission */}
              {isViewMode && canEdit && activeTab === 'detail' && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              {/* Cancel Edit Button - Show when in edit mode */}
              {isEditMode && initialData && (
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    // Reset form to initial data
                    setSelectedUsers([initialData.assignedTo]);
                    setDisposisiText(initialData.disposisiText);
                    setDeadline(initialData.deadline || '');
                    setStatus(initialData.status);
                    setNotes(initialData.notes || '');
                    setLaporan(initialData.laporan || []);
                    setAttachments(initialData.attachments || []);
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                >
                  Batal Edit
                </button>
              )}
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Dari-Ke Info */}
          {initialData && (
            <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg px-3 py-2 mt-2">
              <span className="font-medium">Dari:</span>
              <span>{users.find(u => u.id === initialData.createdBy || u.name === initialData.createdBy)?.name || initialData.createdBy}</span>
              <ArrowRight size={16} className="mx-1" />
              <span className="font-medium">Ke:</span>
              <span>{users.find(u => u.id === initialData.assignedTo)?.name || 'Unknown'}</span>
            </div>
          )}
        </div>

        {/* Tabs for View Mode */}
        {initialData && (
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex gap-1 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('detail')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'detail'
                    ? 'border-gov-600 text-gov-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Detail Disposisi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('context')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'context'
                    ? 'border-gov-600 text-gov-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                📄 Surat & Kegiatan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'history'
                    ? 'border-gov-600 text-gov-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Riwayat Perubahan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subdisposisi')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'subdisposisi'
                    ? 'border-gov-600 text-gov-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Disposisi Lanjutan
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        {activeTab === 'detail' && (
          <>
            {/* View Mode - Read Only Display */}
            {isViewMode && initialData && (
              <div className="p-6 space-y-6">
                {/* Disposisi Text */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Teks Disposisi
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-slate-800 whitespace-pre-wrap">{initialData.disposisiText}</p>
                  </div>
                </div>

                {/* Status and Deadline */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Status
                    </label>
                    <div className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                      DISPOSISI_STATUSES.find(s => s.value === initialData.status)?.color || 'bg-slate-100 text-slate-800'
                    }`}>
                      {initialData.status}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-gov-600" />
                      Deadline
                    </label>
                    {initialData.deadline ? (
                      <p className="text-slate-800">
                        {new Date(initialData.deadline).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    ) : (
                      <p className="text-slate-500 italic">Tidak ada deadline</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {initialData.notes && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Catatan
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-slate-800 whitespace-pre-wrap">{initialData.notes}</p>
                    </div>
                  </div>
                )}

                {/* Laporan Files */}
                {initialData.laporan && initialData.laporan.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Laporan ({initialData.laporan.length})
                    </label>
                    <div className="space-y-2">
                      {initialData.laporan.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText size={20} className="text-gov-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gov-50 rounded-lg text-gov-600 transition-colors flex-shrink-0"
                            title="Download"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Info */}
                {initialData.completedAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Disposisi Selesai</p>
                        <p className="text-sm text-green-700 mt-1">
                          Diselesaikan oleh {initialData.completedBy} pada{' '}
                          {new Date(initialData.completedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Created Info */}
                <div className="text-sm text-slate-500 pt-4 border-t border-slate-200">
                  <p>
                    Dibuat pada {new Date(initialData.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {initialData.updatedAt && initialData.updatedAt !== initialData.createdAt && (
                    <p className="mt-1">
                      Terakhir diupdate {new Date(initialData.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Edit/Create Mode - Form */}
            {(isEditMode || isCreateMode) && (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
          />

          {/* Multi-User Selection */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Users size={16} className="text-gov-600" />
                Assignee <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {/* Search input */}
                <div className="relative" ref={userDropdownRef}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Cari user..."
                      className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                    />
                    {showUserDropdown && (
                      <button
                        type="button"
                        onClick={() => setShowUserDropdown(false)}
                        className="px-3 py-2 text-sm text-gov-600 hover:text-gov-700 font-medium"
                      >
                        Done
                      </button>
                    )}
                  </div>
                  
                  {/* User dropdown */}
                  {showUserDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                      {filteredUsers.length > 0 ? (
                        <>
                          {filteredUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleUserSelection(user.id)}
                              className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                selectedUsers.includes(user.id) ? 'bg-gov-50' : ''
                              }`}
                            >
                              <div>
                                <div className="font-medium text-slate-800">{user.name}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <div className="w-5 h-5 bg-gov-600 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-2">
                            <button
                              type="button"
                              onClick={() => setShowUserDropdown(false)}
                              className="w-full py-1.5 text-sm font-medium text-gov-600 hover:text-gov-700"
                            >
                              Done ({selectedUsers.length} selected)
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          Tidak ada user ditemukan
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected users chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {selectedUsers.map(userId => {
                      const user = users.find(u => u.id === userId);
                      if (!user) return null;
                      return (
                        <div
                          key={userId}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gov-100 text-gov-800 rounded-full text-sm"
                        >
                          <span>{user.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(userId)}
                            className="hover:bg-gov-200 rounded-full p-0.5 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disposisi Text */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Teks Disposisi <span className="text-red-500">*</span>
            </label>
            <textarea
              value={disposisiText}
              onChange={(e) => setDisposisiText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
              placeholder="Instruksi atau arahan disposisi..."
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Jelaskan instruksi atau arahan yang harus dilakukan
            </p>
          </div>

          {/* Deadline and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-gov-600" />
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DisposisiStatus)}
                disabled={!isEditMode}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none bg-white disabled:bg-slate-100"
              >
                {DISPOSISI_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {!isEditMode ? (
                <p className="text-xs text-slate-500 mt-1">
                  Status awal akan diset ke "Pending"
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  {status === 'Completed' && laporan.length === 0 ? (
                    <span className="text-amber-600 font-medium">⚠️ Upload laporan diperlukan untuk status Completed</span>
                  ) : status === 'Completed' ? (
                    <span className="text-green-600">✓ Laporan tersedia</span>
                  ) : (
                    'Ubah status sesuai progress disposisi'
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Laporan Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Laporan {isEditMode && status === 'Completed' && <span className="text-red-500">*</span>}
            </label>
            
            {/* Upload buttons */}
            {!showLinkInput && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-gov-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(true)}
                  className="py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-gov-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 size={16} />
                  Tambah Link
                </button>
              </div>
            )}

            {/* Link input */}
            {showLinkInput && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-300 mb-3">
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
                    className="flex-1 py-2 bg-gov-600 text-white rounded-lg text-sm font-medium hover:bg-gov-700 transition-colors"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkTitle('');
                      setLinkUrl('');
                    }}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Uploaded files list */}
            {laporan.length > 0 && (
              <div className="space-y-2">
                {laporan.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {file.isLink ? (
                        <Link2 size={16} className="text-blue-600 shrink-0" />
                      ) : (
                        <FileText size={16} className="text-gov-600 shrink-0" />
                      )}
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      {!file.isLink && (
                        <span className="text-xs text-slate-400">({formatFileSize(file.size)})</span>
                      )}
                      {file.isLink && (
                        <span className="text-xs text-blue-500">(Link)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {file.url && (
                        <button
                          type="button"
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                        >
                          {file.isLink ? <ExternalLink size={14} /> : <Download size={14} />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1.5 hover:bg-red-100 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isUploading && (
              <div className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gov-600 border-t-transparent"></div>
                Mengupload file...
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Catatan Tambahan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
              placeholder="Catatan atau informasi tambahan..."
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <strong>Info:</strong> {isEditMode 
                ? 'Anda dapat mengubah status, deadline, laporan, dan catatan disposisi.'
                : 'Disposisi akan dibuat untuk setiap user yang dipilih. Setiap user akan mendapatkan disposisi terpisah dengan status awal "Pending".'}
            </div>
          </div>
        </form>
        )}
          </>
        )}

        {/* Context Tab - Surat & Kegiatan Details */}
        {activeTab === 'context' && (
          <div className="p-6 space-y-6">
            {isLoadingContext ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gov-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Memuat data...</p>
              </div>
            ) : (
              <>
                {/* Surat Details Section */}
                {suratData && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Detail Surat</h4>
                        <p className="text-sm text-blue-700">Surat yang terhubung dengan disposisi ini</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Jenis Surat */}
                      <div className="bg-white border border-blue-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Jenis Surat
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full ${
                            suratData.jenis_surat === 'Masuk' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {suratData.jenis_surat === 'Masuk' ? '📥' : '📤'} {suratData.jenis_surat}
                          </span>
                        </div>
                      </div>

                      {/* Nomor Surat */}
                      <div className="bg-white border border-blue-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Nomor Surat
                        </label>
                        <p className="text-slate-800 font-semibold">{suratData.nomor_surat}</p>
                      </div>

                      {/* Tanggal Surat */}
                      <div className="bg-white border border-blue-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Tanggal Surat
                        </label>
                        <p className="text-slate-800">
                          {suratData.tanggal_surat ? new Date(suratData.tanggal_surat).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>

                      {/* Jenis Naskah */}
                      {suratData.jenis_naskah && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Jenis Naskah
                          </label>
                          <p className="text-slate-800">{suratData.jenis_naskah}</p>
                        </div>
                      )}

                      {/* Hal/Perihal - Full Width */}
                      <div className="bg-white border border-blue-100 rounded-lg p-4 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Hal/Perihal
                        </label>
                        <p className="text-slate-800">{suratData.hal || '-'}</p>
                      </div>

                      {/* Asal Surat (for Surat Masuk) */}
                      {suratData.jenis_surat === 'Masuk' && suratData.asal_surat && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Asal Surat
                          </label>
                          <p className="text-slate-800">{suratData.asal_surat}</p>
                        </div>
                      )}

                      {/* Tujuan Surat (for Surat Keluar) */}
                      {suratData.jenis_surat === 'Keluar' && suratData.tujuan_surat && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Tujuan Surat
                          </label>
                          <p className="text-slate-800">{suratData.tujuan_surat}</p>
                        </div>
                      )}

                      {/* Klasifikasi */}
                      {suratData.klasifikasi_surat && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Klasifikasi
                          </label>
                          <p className="text-slate-800">{suratData.klasifikasi_surat}</p>
                        </div>
                      )}

                      {/* Sifat Surat */}
                      {suratData.sifat_surat && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Sifat Surat
                          </label>
                          <p className="text-slate-800">{suratData.sifat_surat}</p>
                        </div>
                      )}

                      {/* Bidang Tugas */}
                      {suratData.bidang_tugas && (
                        <div className="bg-white border border-blue-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Bidang Tugas/Kerja
                          </label>
                          <p className="text-slate-800">{suratData.bidang_tugas}</p>
                        </div>
                      )}
                    </div>

                    {/* File Surat */}
                    {suratData.file_surat && (
                      <div className="mt-4 bg-white border border-blue-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                          File Surat
                        </label>
                        <a
                          href={suratData.file_surat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText size={16} />
                          Lihat File Surat
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Kegiatan Details Section */}
                {kegiatanData && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Calendar size={24} className="text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-purple-900">Detail Kegiatan</h4>
                        <p className="text-sm text-purple-700">Kegiatan yang terhubung dengan disposisi ini</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Judul Kegiatan - Full Width */}
                      <div className="bg-white border border-purple-100 rounded-lg p-4 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Judul Kegiatan
                        </label>
                        <p className="text-slate-800 font-semibold text-lg">{kegiatanData.title}</p>
                      </div>

                      {/* Tanggal */}
                      <div className="bg-white border border-purple-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Tanggal
                        </label>
                        <p className="text-slate-800">
                          {kegiatanData.date ? new Date(kegiatanData.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>

                      {/* Waktu */}
                      <div className="bg-white border border-purple-100 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Waktu
                        </label>
                        <p className="text-slate-800">
                          {kegiatanData.start_time && kegiatanData.end_time 
                            ? `${kegiatanData.start_time} - ${kegiatanData.end_time}`
                            : '-'}
                        </p>
                      </div>

                      {/* Tipe Kegiatan */}
                      {kegiatanData.type && (
                        <div className="bg-white border border-purple-100 rounded-lg p-4">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Tipe Kegiatan
                          </label>
                          <span className="inline-flex items-center text-sm font-semibold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
                            {kegiatanData.type}
                          </span>
                        </div>
                      )}

                      {/* Lokasi */}
                      {kegiatanData.location && (
                        <div className="bg-white border border-purple-100 rounded-lg p-4">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Lokasi
                          </label>
                          <p className="text-slate-800">{kegiatanData.location}</p>
                        </div>
                      )}

                      {/* Online Link */}
                      {kegiatanData.is_online && kegiatanData.online_link && (
                        <div className="bg-white border border-purple-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                            Link Online
                          </label>
                          <a
                            href={kegiatanData.online_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                          >
                            <Link2 size={16} />
                            {kegiatanData.online_link}
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      )}

                      {/* Deskripsi - Full Width */}
                      {kegiatanData.description && (
                        <div className="bg-white border border-purple-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Deskripsi
                          </label>
                          <p className="text-slate-800 whitespace-pre-wrap">{kegiatanData.description}</p>
                        </div>
                      )}

                      {/* PIC */}
                      {kegiatanData.pic && kegiatanData.pic.length > 0 && (
                        <div className="bg-white border border-purple-100 rounded-lg p-4 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                            Penanggung Jawab (PIC)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {kegiatanData.pic.map((picName: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                <Users size={14} />
                                {picName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Data Message */}
                {!suratData && !kegiatanData && !isLoadingContext && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                    <FileText size={56} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-base font-medium text-slate-600 mb-1">Data Tidak Tersedia</p>
                    <p className="text-sm text-slate-400">Tidak dapat memuat data surat dan kegiatan</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-6">
            {initialData ? (
              <AuditTrailDisplay disposisiId={initialData.id} />
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Riwayat Belum Tersedia</h3>
                <p className="text-sm text-slate-500">
                  Riwayat perubahan akan tersedia setelah disposisi dibuat
                </p>
              </div>
            )}
          </div>
        )}

        {/* Subdisposisi Tab */}
        {activeTab === 'subdisposisi' && (
          <div className="p-6">
            {initialData ? (
              <>
                {/* Check if current user is the assignee */}
                {currentUser && (currentUser.id === initialData.assignedTo || currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') ? (
              <div className="space-y-6">
                {/* Info Box */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <AlertCircle size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Tentang Disposisi Lanjutan</h4>
                      <p className="text-sm text-blue-800">
                        Disposisi lanjutan akan <strong>mengupdate disposisi ini</strong> dengan assignee baru. 
                        Disposisi sebelumnya akan tetap tercatat dalam <strong>Riwayat Perubahan</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subdisposisi Form */}
                {!showSubdisposisiForm ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                    <FileText size={56} className="mx-auto mb-4 text-slate-300" />
                    <h4 className="text-lg font-semibold text-slate-700 mb-2">Lanjutkan Disposisi</h4>
                    <p className="text-sm text-slate-500 mb-6">
                      Delegasikan disposisi ini ke user lain. Perubahan akan tercatat dalam riwayat.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSubdisposisiForm(true)}
                      className="px-6 py-3 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={20} />
                      Buat Disposisi Lanjutan
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-semibold text-slate-800">Form Disposisi Lanjutan</h5>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSubdisposisiForm(false);
                          setSubSelectedUsers([]);
                          setSubDisposisiText('');
                          setSubDeadline('');
                          setSubNotes('');
                          setSubUserSearch('');
                          setShowSubUserDropdown(false);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Current Assignment Info */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                          Disposisi Saat Ini
                        </label>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600">Ditugaskan ke:</span>
                          <span className="font-semibold text-slate-800">{getUserName(initialData.assignedTo)}</span>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Instruksi:</span> {initialData.disposisiText}
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Info:</strong> Disposisi lanjutan akan mengupdate disposisi ini. Riwayat akan tersimpan di tab "Riwayat Perubahan".
                        </p>
                      </div>

                      {/* User Selection - Single Select */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                          <Users size={16} className="text-gov-600" />
                          Lanjutkan Ke <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {/* Search input */}
                          <div className="relative" ref={subUserDropdownRef}>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={subUserSearch}
                                onChange={(e) => setSubUserSearch(e.target.value)}
                                onFocus={() => setShowSubUserDropdown(true)}
                                placeholder="Cari user..."
                                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                              />
                              {showSubUserDropdown && (
                                <button
                                  type="button"
                                  onClick={() => setShowSubUserDropdown(false)}
                                  className="px-3 py-2 text-sm text-gov-600 hover:text-gov-700 font-medium"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                            
                            {/* User dropdown */}
                            {showSubUserDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                                {users.filter(u => 
                                  u.id !== initialData.assignedTo && 
                                  (u.name.toLowerCase().includes(subUserSearch.toLowerCase()) ||
                                   u.email.toLowerCase().includes(subUserSearch.toLowerCase()))
                                ).length > 0 ? (
                                  <>
                                    {users.filter(u => 
                                      u.id !== initialData.assignedTo && 
                                      (u.name.toLowerCase().includes(subUserSearch.toLowerCase()) ||
                                       u.email.toLowerCase().includes(subUserSearch.toLowerCase()))
                                    ).map(user => (
                                      <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                          setSubSelectedUsers([user.id]);
                                          setShowSubUserDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                          subSelectedUsers.includes(user.id) ? 'bg-gov-50' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800">{user.name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                          </div>
                                        </div>
                                        {subSelectedUsers.includes(user.id) && (
                                          <div className="w-5 h-5 bg-gov-600 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Tidak ada user ditemukan
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Selected user chip */}
                          {subSelectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              {subSelectedUsers.map(userId => {
                                const user = users.find(u => u.id === userId);
                                if (!user) return null;
                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gov-100 text-gov-800 rounded-full text-sm"
                                  >
                                    <span>{user.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setSubSelectedUsers([])}
                                      className="hover:bg-gov-200 rounded-full p-0.5 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Disposisi Text */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Instruksi Baru <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={subDisposisiText}
                          onChange={(e) => setSubDisposisiText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
                          placeholder="Instruksi disposisi lanjutan..."
                        />
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Deadline (Opsional)
                        </label>
                        <input
                          type="date"
                          value={subDeadline}
                          onChange={(e) => setSubDeadline(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Catatan (Opsional)
                        </label>
                        <textarea
                          value={subNotes}
                          onChange={(e) => setSubNotes(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
                          placeholder="Catatan tambahan..."
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSubdisposisiForm(false);
                            setSubSelectedUsers([]);
                            setSubDisposisiText('');
                            setSubDeadline('');
                            setSubNotes('');
                            setSubUserSearch('');
                            setShowSubUserDropdown(false);
                          }}
                          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateSubdisposisi}
                          disabled={isCreatingSubdisposisi}
                          className="flex-1 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isCreatingSubdisposisi ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Memproses...
                            </>
                          ) : (
                            <>
                              <ArrowRight size={18} />
                              Lanjutkan Disposisi
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertCircle size={48} className="mx-auto mb-3 text-yellow-600" />
                <p className="text-yellow-800 font-medium">Akses Terbatas</p>
                <p className="text-sm text-yellow-700 mt-2">
                  Hanya penerima disposisi, Atasan, atau Super Admin yang dapat membuat disposisi lanjutan
                </p>
              </div>
            )}
              </>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Disposisi Lanjutan Belum Tersedia</h3>
                <p className="text-sm text-slate-500">
                  Disposisi lanjutan dapat dibuat setelah disposisi ini tersimpan
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions - Only show in edit/create mode on detail tab */}
        {activeTab === 'detail' && (isEditMode || isCreateMode) && (
          <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200">
            {/* Warning message if trying to complete without laporan */}
            {status === 'Completed' && laporan.length === 0 && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Laporan diperlukan:</strong> Upload laporan atau tambahkan link laporan untuk menyelesaikan disposisi
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={status === 'Completed' && laporan.length === 0 ? 'Upload laporan terlebih dahulu untuk menyelesaikan disposisi' : ''}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isCreateMode ? 'Buat Disposisi' : 'Update Disposisi'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Close button for view mode and other tabs */}
        {(activeTab !== 'detail' || isViewMode) && (
          <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisposisiModal;
