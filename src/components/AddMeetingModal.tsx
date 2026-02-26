// src/components/AddMeetingModal.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, Trash2, Lock, Upload, FileText, Download, Plus, MapPin, Video, Clock, Calendar,
  Building2, Users, Search, Check, Link2, ExternalLink, Loader2
} from 'lucide-react';
import { Meeting, MeetingType, MeetingInviter, User, ProjectDefinition, Attachment, TaskLink, Surat } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { useModals } from '../hooks/useModalHelpers';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAttachmentHandlers } from '../hooks/useAttachmentHandlers';
import { mapSuratsFromDB } from '../utils/suratMappers';
import { LinkingService } from '../services/LinkingService';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';
import MultiSelectChip from './MultiSelectChip';
import RichTextEditor from './RichTextEditor';
import SearchableSelect from './SearchableSelect';
import SearchableSelectWithActions from './SearchableSelectWithActions';
import { useMasterData } from '../contexts/MasterDataContext';
import { useMasterDataCRUD } from '../hooks/useMasterDataCRUD';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => Promise<string | undefined>;
  onDelete?: (id: string) => void;
  initialData?: Meeting | null;
  currentUser: User | null;
  canEdit: boolean;
  canDelete: boolean;
  projects: ProjectDefinition[];
  users: User[];
  existingInviters: MeetingInviter[];
  fromTaskModal?: boolean; // Apakah modal dibuka dari tambah task
  onBackToTask?: () => void; // Callback untuk kembali ke modal task
}

const MEETING_TYPES: { value: MeetingType; label: string; description: string }[] = [
  { value: 'internal', label: 'Internal Kementerian', description: 'Kegiatan dengan unit internal kementerian' },
  { value: 'external', label: 'Eksternal Kementerian', description: 'Kegiatan dengan pihak luar kementerian' },
  { value: 'audiensi', label: 'Audiensi', description: 'Pertemuan resmi dengan stakeholder' },
  { value: 'bimtek', label: 'Bimtek', description: 'Bimbingan teknis' },
];

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const AddMeetingModal: React.FC<AddMeetingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  currentUser,
  canEdit,
  canDelete,
  projects,
  users,
  existingInviters,
  fromTaskModal = false,
  onBackToTask,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'suratUndangan' | 'suratTugas' | 'laporan' | 'attachments'>('attachments');

  const {
    notificationModal, showNotification, hideNotification,
    confirmModal, showConfirm, hideConfirm,
    showError
  } = useModals();

  const { uploadFile } = useFileUpload('attachment');
  const { handleRemoveFromStorage } = useAttachmentHandlers('attachment', showError);

  // Master data for inviter
  const { unitInternalList, unitEksternalList } = useMasterData();
  const { addMasterData, editMasterData, deleteMasterData, canDeleteMasterData } = useMasterDataCRUD();

  // Inviter state
  const [inviterType, setInviterType] = useState<'Internal' | 'Eksternal'>('Internal');
  const [inviterName, setInviterName] = useState('');

  const defaultPic = currentUser?.name ?? '';

  const [formData, setFormData] = useState<Partial<Meeting>>({
    title: '',
    type: 'internal',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    isOnline: false,
    onlineLink: '',
    inviter: { id: '', name: '', organization: '' },
    invitees: [],
    pic: defaultPic ? [defaultPic] : [],
    projectId: '',
    suratUndangan: undefined,
    suratTugas: undefined,
    laporan: undefined,
    attachments: [],
    links: [],
    notes: '',
    status: 'scheduled',
    createdBy: currentUser?.name ?? '',
  });

  // Link input state
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Document link input state
  const [docLinkInputs, setDocLinkInputs] = useState<{
    suratUndangan: { title: string; url: string };
    suratTugas: { title: string; url: string };
    laporan: { title: string; url: string };
  }>({
    suratUndangan: { title: '', url: '' },
    suratTugas: { title: '', url: '' },
    laporan: { title: '', url: '' },
  });

  // Show link input state for each document
  const [showDocLinkInput, setShowDocLinkInput] = useState<{
    suratUndangan: boolean;
    suratTugas: boolean;
    laporan: boolean;
  }>({
    suratUndangan: false,
    suratTugas: false,
    laporan: false,
  });

  // Track newly uploaded attachments for cleanup on cancel
  const [newlyUploadedAttachments, setNewlyUploadedAttachments] = useState<Attachment[]>([]);
  // Loading state for save button
  const [isSaving, setIsSaving] = useState(false);
  // Loading state for file upload
  const [isUploading, setIsUploading] = useState(false);
  // Loading state for cleanup on close
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // State for selecting existing surat
  const [showSuratSelector, setShowSuratSelector] = useState<'suratUndangan' | 'suratTugas' | null>(null);
  const [suratSearchQuery, setSuratSearchQuery] = useState('');
  const [availableSurats, setAvailableSurats] = useState<Surat[]>([]);
  const [isLoadingSurats, setIsLoadingSurats] = useState(false);

  // State for Disposisi when linking Surat to Kegiatan
  const [disposisiAssignees, setDisposisiAssignees] = useState<string[]>([]);
  const [disposisiText, setDisposisiText] = useState('');
  const [disposisiDeadline, setDisposisiDeadline] = useState('');
  const [selectedSuratForLinking, setSelectedSuratForLinking] = useState<Surat | null>(null);

  const isReadOnly = !!initialData && !canEdit;

  // Fetch available surats when selector opens
  useEffect(() => {
    if (showSuratSelector) {
      const fetchSurats = async () => {
        setIsLoadingSurats(true);
        try {
          const { data, error } = await supabase
            .from('surats')
            .select('*')
            .order('tanggal_surat', { ascending: false });

          if (error) throw error;

          if (data) {
            setAvailableSurats(mapSuratsFromDB(data));
          }
        } catch (error) {
          console.error('Error fetching surats:', error);
          showNotification('Gagal Memuat Surat', 'Terjadi kesalahan saat memuat daftar surat', 'error');
        } finally {
          setIsLoadingSurats(false);
        }
      };
      fetchSurats();
    }
  }, [showSuratSelector, showNotification]);

  // Filter surats for selection
  const filteredSurats = availableSurats.filter(s => {
    const query = suratSearchQuery.toLowerCase();
    return (
      s.nomorSurat?.toLowerCase().includes(query) ||
      s.hal?.toLowerCase().includes(query)
    );
  });

  // Function to select existing surat
  const handleSelectExistingSurat = (surat: Surat, target: 'suratUndangan' | 'suratTugas') => {
    if (surat.fileSurat) {
      // Add suratId to the attachment for tracking
      const attachmentWithSuratId = {
        ...surat.fileSurat,
        suratId: surat.id // Add surat ID for later linking
      };

      handleChange(target, attachmentWithSuratId);

      // Set linked surat data
      handleChange('linkedSuratId', surat.id);
      handleChange('linkedSurat', surat);

      // Track the selected Surat for linking
      setSelectedSuratForLinking(surat);
    }
    setShowSuratSelector(null);
    setSuratSearchQuery('');
    showNotification('Surat Dipilih', `Surat ${surat.nomorSurat} berhasil ditambahkan`, 'success');
  };

  // Combine internal and external units for inviter options
  const inviterOptions = inviterType === 'Internal'
    ? unitInternalList.map(u => ({ value: u, label: u }))
    : unitEksternalList.map(u => ({ value: u, label: u }));

  // Ref to track initialized state - prevents re-initialization on tab switch
  const initializedForRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    // Reset tracking when modal closes
    if (!isOpen) {
      wasOpenRef.current = false;
      initializedForRef.current = null;
      return;
    }

    // Determine the current "session key" - either the meeting ID or 'new'
    const currentKey = initialData?.id ?? 'new';

    // Only initialize if this is a fresh open (was closed before) 
    // OR if the data context has changed (different meeting or switched to new)
    const isFirstOpen = !wasOpenRef.current;
    const isDataChanged = initializedForRef.current !== currentKey;

    if (!isFirstOpen && !isDataChanged) {
      // Modal was already open with same data, don't reset form
      return;
    }

    // Mark as initialized for this session
    wasOpenRef.current = true;
    initializedForRef.current = currentKey;

    if (initialData) {
      setFormData({ ...initialData });
      setInviterName(initialData.inviter?.name || '');
      // Determine inviter type from organization
      if (initialData.inviter?.organization) {
        const isInternal = unitInternalList.includes(initialData.inviter.name);
        setInviterType(isInternal ? 'Internal' : 'Eksternal');
      }

      // If there's a linked surat, it should already be populated in initialData.linkedSurat
      // No need to fetch separately
    } else {
      setFormData({
        title: '',
        type: 'internal',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        isOnline: false,
        onlineLink: '',
        inviter: { id: '', name: '', organization: '' },
        invitees: [],
        pic: defaultPic ? [defaultPic] : [],
        projectId: '',
        suratUndangan: undefined,
        suratTugas: undefined,
        laporan: undefined,
        attachments: [],
        links: [],
        notes: '',
        status: 'scheduled',
        createdBy: currentUser?.name ?? '',
      });
      setInviterName('');
      setInviterType('Internal');
      setNewLinkTitle('');
      setNewLinkUrl('');
      // Reset disposisi state
      setDisposisiAssignees([]);
      setDisposisiText('');
      setDisposisiDeadline('');
      setSelectedSuratForLinking(null);
    }
    // Reset tracking state when modal opens
    setNewlyUploadedAttachments([]);
    setIsUploading(false);
    setIsCleaningUp(false);
  }, [isOpen, initialData, defaultPic, currentUser]);

  // Cleanup newly uploaded attachments on cancel/close (must be before early return for hooks order)
  const handleCleanupAndClose = useCallback(async () => {
    // Get attachments that were uploaded during this session but not in original data
    const originalIds = new Set([
      initialData?.suratUndangan?.id,
      initialData?.suratTugas?.id,
      initialData?.laporan?.id,
      ...(initialData?.attachments || []).map(a => a.id)
    ].filter(Boolean));

    // Only clean up actual file uploads, not links
    const attachmentsToClean = newlyUploadedAttachments.filter(a => !originalIds.has(a.id) && !a.isLink);

    if (attachmentsToClean.length > 0) {
      setIsCleaningUp(true);
      // Remove from storage
      for (const att of attachmentsToClean) {
        await handleRemoveFromStorage(att);
      }
      setIsCleaningUp(false);
    }

    // Clear tracking and close
    setNewlyUploadedAttachments([]);
    onClose();
  }, [initialData, newlyUploadedAttachments, handleRemoveFromStorage, onClose]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Meeting, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Handle inviter name change
  const handleInviterChange = (name: string) => {
    setInviterName(name);
    if (name) {
      const inviter: MeetingInviter = {
        id: `inv_${Date.now()}`,
        name: name,
        organization: inviterType === 'Internal' ? 'Internal' : name,
      };
      setFormData(prev => ({ ...prev, inviter }));
    } else {
      setFormData(prev => ({ ...prev, inviter: { id: '', name: '', organization: '' } }));
    }
  };

  const triggerFileUpload = (target: typeof uploadTarget) => {
    setUploadTarget(target);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploading(true);
    const att = await uploadFile(file, 'meetings');

    if (att) {
      if (uploadTarget === 'attachments') {
        setFormData(prev => ({ ...prev, attachments: [...(prev.attachments ?? []), att] }));
      } else {
        setFormData(prev => ({ ...prev, [uploadTarget]: att }));
      }
      // Track newly uploaded for cleanup on cancel
      setNewlyUploadedAttachments(prev => [...prev, att]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const removeFile = async (target: 'suratUndangan' | 'suratTugas' | 'laporan' | string) => {
    if (isReadOnly) return;

    if (['suratUndangan', 'suratTugas', 'laporan'].includes(target)) {
      const file = formData[target as keyof Meeting] as Attachment | undefined;

      // Only remove from storage if it's an actual file, not a link
      if (file && !file.isLink) {
        await handleRemoveFromStorage(file);
      }

      // Update local state
      setFormData(prev => ({ ...prev, [target]: undefined }));

      // If editing existing meeting, also update database immediately
      if (initialData?.id) {
        const dbField = target === 'suratUndangan' ? 'surat_undangan'
          : target === 'suratTugas' ? 'surat_tugas'
            : 'laporan';
        const { error: dbError } = await supabase
          .from('meetings')
          .update({ [dbField]: null, updated_at: new Date().toISOString() })
          .eq('id', initialData.id);

        if (dbError) {
          console.error('Error updating database:', dbError);
          showNotification('Gagal Update Database', dbError.message, 'error');
        }
      }
    } else {
      // Remove from attachments array
      const att = formData.attachments?.find(a => a.id === target);

      // Only remove from storage if it's an actual file, not a link
      if (att && !att.isLink) {
        await handleRemoveFromStorage(att);
      }

      const newAttachments = (formData.attachments ?? []).filter(a => a.id !== target);

      // Update local state
      setFormData(prev => ({
        ...prev,
        attachments: newAttachments,
      }));

      // If editing existing meeting, also update database immediately
      if (initialData?.id) {
        const { error: dbError } = await supabase
          .from('meetings')
          .update({ attachments: newAttachments, updated_at: new Date().toISOString() })
          .eq('id', initialData.id);

        if (dbError) {
          console.error('Error updating database:', dbError);
          showNotification('Gagal Update Database', dbError.message, 'error');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSaving) return;

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      showNotification('Data Tidak Lengkap', 'Mohon isi judul, tanggal, dan waktu.', 'warning');
      return;
    }

    if (!formData.inviter?.name) {
      showNotification('Yang Mengundang Wajib', 'Mohon pilih atau tambahkan yang mengundang.', 'warning');
      return;
    }

    if (!formData.pic || formData.pic.length === 0) {
      showNotification('PIC Wajib', 'Minimal 1 PIC harus dipilih.', 'warning');
      return;
    }

    if (!formData.isOnline && !formData.location) {
      showNotification('Lokasi Wajib', 'Mohon isi lokasi untuk rapat offline.', 'warning');
      return;
    }

    // Validasi detail surat HANYA jika ada file surat yang diupload DAN user mengisi detail surat
    // Kegiatan bisa dibuat tanpa surat, jadi validasi ini opsional
    // Tidak ada validasi wajib untuk surat

    // Validate Disposisi when linking to existing Surat
    // Requirements 4.1, 4.2, 9.1, 9.2, 9.3, 9.4, 9.5
    if (selectedSuratForLinking) {
      if (!disposisiText.trim()) {
        showNotification('Disposisi Wajib', 'Mohon isi disposisi saat menghubungkan dengan surat.', 'warning');
        return;
      }
      if (disposisiAssignees.length === 0) {
        showNotification('Assignee Wajib', 'Mohon pilih minimal 1 assignee untuk disposisi.', 'warning');
        return;
      }
    }

    // Auto-add link if user typed something but forgot to click Add
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      let url = newLinkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const autoLink: TaskLink = {
        id: `link_${Date.now()}`,
        title: newLinkTitle.trim(),
        url: url,
      };
      formData.links = [...(formData.links || []), autoLink];
    }

    const payload: Omit<Meeting, 'id' | 'createdAt'> = {
      title: formData.title!.trim(),
      type: formData.type as MeetingType,
      description: formData.description?.trim(),
      date: formData.date!,
      endDate: formData.endDate,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      location: formData.location || '',
      isOnline: formData.isOnline || false,
      onlineLink: formData.onlineLink,
      inviter: formData.inviter!,
      invitees: formData.invitees || [],
      pic: formData.pic!,
      projectId: formData.projectId || undefined,
      suratUndangan: formData.suratUndangan,
      suratTugas: formData.suratTugas,
      laporan: formData.laporan,
      attachments: formData.attachments || [],
      links: formData.links || [],
      notes: formData.notes,
      status: formData.status || 'scheduled',
      createdBy: initialData?.createdBy || currentUser?.name || 'System',
      updatedAt: new Date().toISOString(),
      // Linked surat (jika ada)
      linkedSuratId: formData.linkedSuratId,
      linkedSurat: formData.linkedSurat,
    };

    setIsSaving(true);
    try {
      const createdMeetingId = await onSave(payload);

      // If linking to existing Surat, create the link and Disposisi
      if (selectedSuratForLinking && !initialData && createdMeetingId) {
        // Use LinkingService to create the link and Disposisi
        const linkingService = new LinkingService();
        try {
          await linkingService.linkSuratToKegiatan(
            selectedSuratForLinking.id,
            createdMeetingId,
            {
              assignees: disposisiAssignees,
              disposisiText: disposisiText,
              deadline: disposisiDeadline || undefined,
              createdBy: currentUser?.name || 'System'
            }
          );
          showNotification('Berhasil', 'Kegiatan berhasil dibuat dan dihubungkan dengan surat', 'success');
        } catch (linkError) {
          console.error('Error linking Surat to Kegiatan:', linkError);
          showNotification('Peringatan', 'Kegiatan berhasil dibuat, tetapi gagal menghubungkan dengan surat. Silakan hubungkan secara manual.', 'warning');
        }
      } else if (selectedSuratForLinking && !initialData && !createdMeetingId) {
        showNotification('Peringatan', 'Kegiatan berhasil dibuat, tetapi gagal menghubungkan dengan surat. Silakan hubungkan secara manual.', 'warning');
      }

      // Clear tracking on successful save
      setNewlyUploadedAttachments([]);
      setSelectedSuratForLinking(null);
      setDisposisiAssignees([]);
      setDisposisiText('');
      setDisposisiDeadline('');
    } finally {
      setIsSaving(false);
    }
  };

  // Link management functions
  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newLink: TaskLink = {
      id: `link_${Date.now()}`,
      title: newLinkTitle.trim(),
      url: url,
    };

    setFormData(prev => ({
      ...prev,
      links: [...(prev.links || []), newLink],
    }));
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLink = (linkId: string) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter(l => l.id !== linkId),
    }));
  };

  const handleDelete = () => {
    if (!initialData || !canDelete || !onDelete) return;
    showConfirm('Hapus Jadwal', 'Hapus jadwal ini? Tindakan tidak dapat dibatalkan.', () => onDelete(initialData.id), 'error', 'Hapus', 'Batal');
  };

  const handleAddDocLink = (target: 'suratUndangan' | 'suratTugas' | 'laporan') => {
    const input = docLinkInputs[target];
    if (!input.title.trim() || !input.url.trim()) {
      showNotification('Data Tidak Lengkap', 'Mohon isi judul dan URL dokumen.', 'warning');
      return;
    }

    let url = input.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const linkAttachment: Attachment = {
      id: `link_${Date.now()}`,
      name: input.title.trim(),
      size: 0,
      type: 'link',
      path: '',
      url: url,
      isLink: true,
    };

    setFormData(prev => ({ ...prev, [target]: linkAttachment }));
    setDocLinkInputs(prev => ({ ...prev, [target]: { title: '', url: '' } }));
    setShowDocLinkInput(prev => ({ ...prev, [target]: false }));
  };

  const renderFileUpload = (label: string, target: 'suratUndangan' | 'suratTugas' | 'laporan', file?: Attachment) => {
    const showLinkInput = showDocLinkInput[target];

    return (
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
        {file ? (
          <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              {file.isLink ? <Link2 size={16} className="text-gov-600 shrink-0" /> : <FileText size={16} className="text-gov-600 shrink-0" />}
              <span className="text-sm text-slate-700 truncate">{file.name}</span>
              {!file.isLink && <span className="text-xs text-slate-400">({formatFileSize(file.size)})</span>}
              {file.isLink && <span className="text-xs text-gov-500">(Link)</span>}
            </div>
            <div className="flex items-center gap-1">
              {file.url && (
                <button type="button" onClick={() => window.open(file.url, '_blank')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                  {file.isLink ? <ExternalLink size={14} /> : <Download size={14} />}
                </button>
              )}
              {!isReadOnly && (
                <button type="button" onClick={() => removeFile(target)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ) : showLinkInput ? (
          <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-300">
            <input
              type="text"
              value={docLinkInputs[target].title}
              onChange={(e) => setDocLinkInputs(prev => ({ ...prev, [target]: { ...prev[target], title: e.target.value } }))}
              placeholder="Judul dokumen..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
            />
            <input
              type="url"
              value={docLinkInputs[target].url}
              onChange={(e) => setDocLinkInputs(prev => ({ ...prev, [target]: { ...prev[target], url: e.target.value } }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAddDocLink(target)}
                className="flex-1 py-2.5 bg-gov-600 text-white rounded-lg text-sm font-medium hover:bg-gov-700 transition-colors"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDocLinkInput(prev => ({ ...prev, [target]: false }));
                  setDocLinkInputs(prev => ({ ...prev, [target]: { title: '', url: '' } }));
                }}
                className="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => triggerFileUpload(target)}
              disabled={isReadOnly}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setShowDocLinkInput(prev => ({ ...prev, [target]: true }))}
              disabled={isReadOnly}
              className="w-full py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Link2 size={16} />
              Tambah Link
            </button>
            {(target === 'suratUndangan' || target === 'suratTugas') && (
              <button
                type="button"
                onClick={() => setShowSuratSelector(target)}
                disabled={isReadOnly}
                className="w-full py-2.5 border border-blue-300 bg-blue-50 rounded-lg text-sm text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                Pilih Surat yang Ada
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {initialData ? (isReadOnly ? 'Detail Jadwal' : 'Edit Jadwal') : 'Tambah Jadwal Baru'}
            </h2>
            {isReadOnly && (
              <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} /> View Only
              </span>
            )}
          </div>
          <button onClick={handleCleanupAndClose} disabled={isSaving} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* Info banner jika dari task modal */}
        {fromTaskModal && onBackToTask && !initialData && (
          <div className="px-4 sm:px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <p className="text-sm text-blue-700">
              Anda memilih kategori <strong>Audiensi/Rapat</strong>. Silakan isi form jadwal kegiatan.
            </p>
            <button
              type="button"
              onClick={onBackToTask}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Kembali ke Task
            </button>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Judul Kegiatan</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                placeholder="Contoh: Rapat Koordinasi Tim IT..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Jenis Kegiatan</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MEETING_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleChange('type', type.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${formData.type === type.value
                      ? 'border-gov-500 bg-gov-50'
                      : 'border-slate-200 hover:border-slate-300'
                      } disabled:opacity-50`}
                  >
                    <div className="text-sm font-semibold text-slate-700">{type.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className={`grid grid-cols-1 ${formData.endDate && formData.endDate !== formData.date ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
              <div className="sm:col-span-full">
                <label className="flex items-center gap-2 cursor-pointer mb-2 w-fit">
                  <input
                    type="checkbox"
                    checked={!!formData.endDate && formData.endDate !== formData.date}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Enable multi-day: set endDate to tomorrow by default if not set
                        const nextDay = new Date(formData.date!);
                        nextDay.setDate(nextDay.getDate() + 1);
                        handleChange('endDate', nextDay.toISOString().split('T')[0]);
                      } else {
                        // Disable multi-day
                        handleChange('endDate', undefined);
                      }
                    }}
                    disabled={isReadOnly}
                    className="rounded text-gov-600 focus:ring-gov-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Kegiatan lebih dari 1 hari?</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  <Calendar size={12} className="inline mr-1" />
                  {formData.endDate && formData.endDate !== formData.date ? 'Tanggal Mulai' : 'Tanggal'}
                </label>
                <input
                  type="date"
                  required
                  disabled={isReadOnly}
                  value={formData.date || ''}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                />
              </div>

              {formData.endDate && formData.endDate !== formData.date && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    <Calendar size={12} className="inline mr-1" />Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isReadOnly}
                    min={formData.date} // End date cannot be before start date
                    value={formData.endDate || ''}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  <Clock size={12} className="inline mr-1" />Mulai
                </label>
                <input
                  type="time"
                  required
                  disabled={isReadOnly}
                  value={formData.startTime || ''}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  <Clock size={12} className="inline mr-1" />Selesai
                </label>
                <input
                  type="time"
                  required
                  disabled={isReadOnly}
                  value={formData.endTime || ''}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Lokasi</label>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isOnline}
                    onChange={() => handleChange('isOnline', false)}
                    disabled={isReadOnly}
                    className="text-gov-600"
                  />
                  <MapPin size={14} />
                  <span className="text-sm">Offline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isOnline}
                    onChange={() => handleChange('isOnline', true)}
                    disabled={isReadOnly}
                    className="text-gov-600"
                  />
                  <Video size={14} />
                  <span className="text-sm">Online</span>
                </label>
              </div>
              {formData.isOnline ? (
                <input
                  type="url"
                  disabled={isReadOnly}
                  value={formData.onlineLink || ''}
                  onChange={(e) => handleChange('onlineLink', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                  placeholder="Link meeting (Zoom, Google Meet, dll)"
                />
              ) : (
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={formData.location || ''}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                  placeholder="Contoh: Ruang Rapat Lt. 3"
                />
              )}
            </div>

            {/* Inviter - Yang Mengundang */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                <Building2 size={12} className="inline mr-1" />Yang Mengundang
              </label>

              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-sm">
                  {formData.inviter?.name || '-'}
                  {formData.inviter?.organization && (
                    <span className="text-xs text-slate-500 ml-2">({formData.inviter.organization})</span>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Pilihan Internal/Eksternal */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setInviterType('Internal');
                        setInviterName('');
                        handleInviterChange('');
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${inviterType === 'Internal'
                        ? 'border-gov-500 bg-gov-50 text-gov-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                    >
                      Internal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviterType('Eksternal');
                        setInviterName('');
                        handleInviterChange('');
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${inviterType === 'Eksternal'
                        ? 'border-gov-500 bg-gov-50 text-gov-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                    >
                      Eksternal
                    </button>
                  </div>

                  {/* Dropdown dengan CRUD */}
                  {inviterType === 'Internal' ? (
                    <SearchableSelectWithActions
                      options={inviterOptions}
                      value={inviterName}
                      onChange={handleInviterChange}
                      placeholder="Cari unit internal..."
                      emptyOption="Pilih Unit Internal"
                      tableName="Unit Internal"
                      onAdd={(name) => addMasterData('master_unit_internal', name)}
                      onEdit={(oldName, newName) => editMasterData('master_unit_internal', oldName, newName)}
                      onDelete={(name) => deleteMasterData('master_unit_internal', name)}
                      canDelete={(name) => canDeleteMasterData('master_unit_internal', name)}
                    />
                  ) : (
                    <SearchableSelectWithActions
                      options={inviterOptions}
                      value={inviterName}
                      onChange={handleInviterChange}
                      placeholder="Cari unit eksternal..."
                      emptyOption="Pilih Unit Eksternal"
                      tableName="Unit Eksternal"
                      onAdd={(name) => addMasterData('master_unit_eksternal', name)}
                      onEdit={(oldName, newName) => editMasterData('master_unit_eksternal', oldName, newName)}
                      onDelete={(name) => deleteMasterData('master_unit_eksternal', name)}
                      canDelete={(name) => canDeleteMasterData('master_unit_eksternal', name)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* PIC */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                <Users size={12} className="inline mr-1" />PIC (Person In Charge)
              </label>
              {isReadOnly ? (
                <div className="flex flex-wrap gap-1 p-2 border border-slate-300 rounded-lg bg-slate-50">
                  {(formData.pic || []).map((name, i) => (
                    <span key={i} className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full">{name}</span>
                  ))}
                </div>
              ) : (
                <MultiSelectChip
                  options={users.map(u => ({ value: u.name, label: u.name }))}
                  value={formData.pic || []}
                  onChange={(selected) => handleChange('pic', selected)}
                  placeholder="Pilih PIC..."
                  maxVisibleChips={3}
                />
              )}
            </div>

            {/* Invitees - Daftar Undangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Daftar Undangan (Opsional)</label>
              {isReadOnly ? (
                <div className="flex flex-wrap gap-1 p-2 border border-slate-300 rounded-lg bg-slate-50 min-h-[40px]">
                  {(formData.invitees || []).map((name, i) => (
                    <span key={i} className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full">{name}</span>
                  ))}
                </div>
              ) : (
                <MultiSelectChip
                  options={users.map(u => ({ value: u.name, label: u.name }))}
                  value={formData.invitees || []}
                  onChange={(selected) => handleChange('invitees', selected)}
                  placeholder="Pilih peserta undangan..."
                  maxVisibleChips={5}
                />
              )}
            </div>

            {/* Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Terkait (Opsional)</label>
              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm">
                  {projects.find(p => p.id === formData.projectId)?.name || '-- Tidak terkait project --'}
                </div>
              ) : (
                <SearchableSelect
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  value={formData.projectId || ''}
                  onChange={(val) => handleChange('projectId', val)}
                  placeholder="Cari project..."
                  emptyOption="-- Tidak terkait project --"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deskripsi / Agenda</label>
              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm min-h-[100px] whitespace-pre-wrap">
                  {formData.description || 'Tidak ada deskripsi'}
                </div>
              ) : (
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(val) => handleChange('description', val)}
                  placeholder="Agenda rapat, poin pembahasan, dll... (gunakan @nama untuk mention)"
                  disabled={isReadOnly}
                  rows={5}
                  users={users}
                />
              )}
            </div>

            {/* Document Uploads */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Dokumen (Opsional)</label>
              <p className="text-xs text-slate-500 mb-2">
                Upload dokumen terkait kegiatan. Jika ingin menghubungkan dengan surat yang sudah ada, gunakan tombol "Pilih Surat yang Ada".
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {renderFileUpload('Surat Undangan', 'suratUndangan', formData.suratUndangan)}
                {renderFileUpload('Surat Tugas', 'suratTugas', formData.suratTugas)}
                {renderFileUpload('Laporan', 'laporan', formData.laporan)}
              </div>
            </div>

            {/* Detail Surat Section - Display linked surat data if exists */}
            {formData.linkedSurat && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Detail Surat Terhubung</h3>
                  <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">
                    Dari Database Surat
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Jenis Surat */}
                  {formData.linkedSurat.jenisSurat && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Jenis Surat
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${formData.linkedSurat.jenisSurat === 'Masuk'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}>
                          {formData.linkedSurat.jenisSurat === 'Masuk' ? '📥 Surat Masuk' : '📤 Surat Keluar'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Nomor Surat */}
                  {formData.linkedSurat.nomorSurat && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Nomor Surat
                      </label>
                      <p className="text-sm font-semibold text-slate-800">{formData.linkedSurat.nomorSurat}</p>
                    </div>
                  )}

                  {/* Tanggal Surat */}
                  {formData.linkedSurat.tanggalSurat && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Tanggal Surat
                      </label>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(formData.linkedSurat.tanggalSurat).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Jenis Naskah */}
                  {formData.linkedSurat.jenisNaskah && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Jenis Naskah
                      </label>
                      <p className="text-sm font-semibold text-slate-800">{formData.linkedSurat.jenisNaskah}</p>
                    </div>
                  )}

                  {/* Klasifikasi Surat */}
                  {formData.linkedSurat.klasifikasiSurat && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Klasifikasi
                      </label>
                      <p className="text-sm font-semibold text-slate-800">{formData.linkedSurat.klasifikasiSurat}</p>
                    </div>
                  )}

                  {/* Bidang Tugas */}
                  {formData.linkedSurat.bidangTugas && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Bidang Tugas
                      </label>
                      <p className="text-sm font-semibold text-slate-800">{formData.linkedSurat.bidangTugas}</p>
                    </div>
                  )}
                </div>

                {/* Hal/Perihal - Full width */}
                {formData.linkedSurat.hal && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Hal / Perihal
                    </label>
                    <p className="text-sm text-slate-800">{formData.linkedSurat.hal}</p>
                  </div>
                )}

                {/* Asal/Tujuan Surat */}
                {(formData.linkedSurat.asalSurat || formData.linkedSurat.tujuanSurat) && (
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {formData.linkedSurat.jenisSurat === 'Keluar' ? '📤 Kepada (Penerima)' : '📥 Dari (Pengirim)'}
                    </label>
                    <p className="text-sm text-slate-800">
                      {formData.linkedSurat.jenisSurat === 'Keluar' ? formData.linkedSurat.tujuanSurat : formData.linkedSurat.asalSurat}
                    </p>
                  </div>
                )}

                {/* Teks Disposisi - Only for Surat Masuk */}
                {formData.linkedSurat.jenisSurat === 'Masuk' && formData.linkedSurat.disposisi && (
                  <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                    <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Teks Disposisi
                    </label>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {formData.linkedSurat.disposisi}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Create Disposisi Section - Only show when Surat is selected from existing records */}
            {selectedSuratForLinking && !initialData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-green-700" />
                  <h3 className="text-sm font-bold text-green-900 uppercase tracking-wider">
                    Buat Disposisi <span className="text-red-500">*</span>
                  </h3>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  Karena Anda menghubungkan kegiatan ini dengan surat yang ada, disposisi wajib dibuat untuk menugaskan PIC.
                </p>

                {/* Disposisi Assignees */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    <Users size={12} className="inline mr-1" />
                    Assignee / Ditugaskan Kepada <span className="text-red-500">*</span>
                  </label>
                  <MultiSelectChip
                    options={users.map(u => ({ value: u.name, label: u.name }))}
                    value={disposisiAssignees}
                    onChange={setDisposisiAssignees}
                    placeholder="Pilih user yang ditugaskan..."
                    maxVisibleChips={3}
                  />
                  <p className="text-xs text-slate-500 mt-1">Pilih satu atau lebih user untuk ditugaskan</p>
                </div>

                {/* Disposisi Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Instruksi Disposisi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={disposisiText}
                    onChange={(e) => setDisposisiText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                    placeholder="Instruksi atau arahan terkait surat ini..."
                    rows={3}
                  />
                </div>

                {/* Disposisi Deadline */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    <Calendar size={12} className="inline mr-1" />
                    Deadline (Opsional)
                  </label>
                  <input
                    type="date"
                    value={disposisiDeadline}
                    onChange={(e) => setDisposisiDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Additional Attachments */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Lampiran Lainnya</label>
                {!isReadOnly && (
                  <button type="button" onClick={() => triggerFileUpload('attachments')} className="text-xs text-gov-600 font-bold hover:underline">
                    <Plus size={12} className="inline" /> Tambah File
                  </button>
                )}
              </div>
              {(formData.attachments || []).length > 0 ? (
                <div className="space-y-2">
                  {(formData.attachments || []).map(att => (
                    <div key={att.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{att.name}</span>
                        <span className="text-xs text-slate-400">({formatFileSize(att.size)})</span>
                      </div>
                      {!isReadOnly && (
                        <button type="button" onClick={() => removeFile(att.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada lampiran</p>
              )}
            </div>

            {/* Links */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                <Link2 size={12} className="inline mr-1" />Link Terkait
              </label>

              {/* Existing Links */}
              {(formData.links || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {(formData.links || []).map(link => (
                    <div key={link.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link2 size={14} className="text-gov-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{link.title}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gov-600 hover:underline truncate block"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                        >
                          <ExternalLink size={14} />
                        </a>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeLink(link.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Link */}
              {!isReadOnly && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Judul link (contoh: Notulensi Rapat)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="URL (contoh: https://docs.google.com/...)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLink();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addLink}
                      disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                      className="px-3 py-2 bg-gov-600 text-white rounded-lg text-sm font-medium hover:bg-gov-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Catatan Tambahan</label>
              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm min-h-[80px] whitespace-pre-wrap">
                  {formData.notes || 'Tidak ada catatan'}
                </div>
              ) : (
                <RichTextEditor
                  value={formData.notes || ''}
                  onChange={(val) => handleChange('notes', val)}
                  placeholder="Catatan internal... (gunakan @nama untuk mention)"
                  disabled={isReadOnly}
                  rows={4}
                  users={users}
                />
              )}
            </div>

            {/* Status (for editing) */}
            {initialData && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                <select
                  disabled={isReadOnly}
                  value={formData.status || 'scheduled'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white disabled:bg-slate-50"
                >
                  <option value="scheduled">Terjadwal</option>
                  <option value="ongoing">Berlangsung</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          {initialData && canDelete && onDelete ? (
            <button type="button" onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
              <Trash2 size={16} /> Hapus
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleCleanupAndClose} disabled={isSaving || isCleaningUp || isUploading} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
              {isCleaningUp && <Loader2 size={14} className="animate-spin" />}
              {isReadOnly ? 'Tutup' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button onClick={handleSubmit} disabled={isSaving || isUploading} className="px-6 py-2 bg-gov-600 text-white rounded-lg text-sm font-bold hover:bg-gov-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {initialData ? 'Simpan Perubahan' : 'Tambah Jadwal'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        onClose={hideNotification}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={hideConfirm}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />

      {/* Surat Selector Modal */}
      {showSuratSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} />
                  <h3 className="text-xl font-bold">Pilih Surat yang Ada</h3>
                </div>
                <button
                  onClick={() => {
                    setShowSuratSelector(null);
                    setSuratSearchQuery('');
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={suratSearchQuery}
                  onChange={(e) => setSuratSearchQuery(e.target.value)}
                  placeholder="Cari nomor surat, perihal..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoadingSurats ? (
                <div className="text-center py-12">
                  <Loader2 size={48} className="mx-auto mb-3 text-gov-600 animate-spin" />
                  <p className="text-slate-600 font-medium">Memuat daftar surat...</p>
                </div>
              ) : filteredSurats.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600 font-medium">Tidak ada surat ditemukan</p>
                  <p className="text-sm text-slate-400 mt-1">Coba ubah kata kunci pencarian</p>
                </div>
              ) : (
                filteredSurats.map(surat => (
                  <button
                    key={surat.id}
                    onClick={() => handleSelectExistingSurat(surat, showSuratSelector!)}
                    className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {surat.jenisSurat && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${surat.jenisSurat === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                              {surat.jenisSurat}
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-800">{surat.nomorSurat || 'Tanpa Nomor'}</span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium mb-1">{surat.hal || '-'}</p>
                        {surat.asalSurat && (
                          <p className="text-xs text-slate-500">Dari: {surat.asalSurat}</p>
                        )}
                        {surat.tujuanSurat && (
                          <p className="text-xs text-slate-500">Kepada: {surat.tujuanSurat}</p>
                        )}
                        {surat.tanggalSurat && (
                          <p className="text-xs text-slate-500 mt-1">
                            Tanggal: {new Date(surat.tanggalSurat).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {surat.fileSurat && (
                          <div className="flex items-center gap-1 text-xs text-gov-600 bg-gov-50 px-2 py-1 rounded">
                            {surat.fileSurat.isLink ? <Link2 size={12} /> : <FileText size={12} />}
                            <span>Tersedia</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowSuratSelector(null);
                  setSuratSearchQuery('');
                }}
                className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMeetingModal;
