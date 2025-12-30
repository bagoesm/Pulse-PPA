// src/components/AddMeetingModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  X, Trash2, Lock, Upload, FileText, Download, Plus, MapPin, Video, Clock, Calendar,
  Building2, Users, Search, Check, Link2, ExternalLink
} from 'lucide-react';
import { Meeting, MeetingType, MeetingInviter, User, ProjectDefinition, Attachment, TaskLink } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { useModals } from '../hooks/useModalHelpers';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAttachmentHandlers } from '../hooks/useAttachmentHandlers';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';
import MultiSelectChip from './MultiSelectChip';
import RichTextEditor from './RichTextEditor';
import SearchableSelect from './SearchableSelect';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => void;
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

  // Inviter search state
  const [inviterSearch, setInviterSearch] = useState('');
  const [showInviterDropdown, setShowInviterDropdown] = useState(false);
  const [isAddingNewInviter, setIsAddingNewInviter] = useState(false);
  const [newInviterName, setNewInviterName] = useState('');
  const [newInviterOrg, setNewInviterOrg] = useState('');

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

  const isReadOnly = !!initialData && !canEdit;

  // Filter inviters based on search
  const filteredInviters = existingInviters.filter(inv =>
    inv.name.toLowerCase().includes(inviterSearch.toLowerCase()) ||
    (inv.organization && inv.organization.toLowerCase().includes(inviterSearch.toLowerCase()))
  );

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
      setInviterSearch(initialData.inviter?.name || '');
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
      setInviterSearch('');
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  }, [isOpen, initialData, defaultPic, currentUser]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Meeting, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const selectInviter = (inviter: MeetingInviter) => {
    setFormData(prev => ({ ...prev, inviter }));
    setInviterSearch(inviter.name);
    setShowInviterDropdown(false);
  };

  const addNewInviter = () => {
    if (!newInviterName.trim()) return;
    const newInviter: MeetingInviter = {
      id: `inv_${Date.now()}`,
      name: newInviterName.trim(),
      organization: newInviterOrg.trim() || undefined,
    };
    setFormData(prev => ({ ...prev, inviter: newInviter }));
    setInviterSearch(newInviter.name);
    setIsAddingNewInviter(false);
    setNewInviterName('');
    setNewInviterOrg('');
    setShowInviterDropdown(false);
  };

  const triggerFileUpload = (target: typeof uploadTarget) => {
    setUploadTarget(target);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const att = await uploadFile(file, 'meetings');

    if (att) {
      if (uploadTarget === 'attachments') {
        setFormData(prev => ({ ...prev, attachments: [...(prev.attachments ?? []), att] }));
      } else {
        setFormData(prev => ({ ...prev, [uploadTarget]: att }));
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = async (target: 'suratUndangan' | 'suratTugas' | 'laporan' | string) => {
    if (isReadOnly) return;

    if (['suratUndangan', 'suratTugas', 'laporan'].includes(target)) {
      const file = formData[target as keyof Meeting] as Attachment | undefined;

      if (file) {
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

      if (att) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

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
    };

    onSave(payload);
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

  const renderFileUpload = (label: string, target: 'suratUndangan' | 'suratTugas' | 'laporan', file?: Attachment) => (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
      {file ? (
        <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-gov-600 shrink-0" />
            <span className="text-sm text-slate-700 truncate">{file.name}</span>
            <span className="text-xs text-slate-400">({formatFileSize(file.size)})</span>
          </div>
          <div className="flex items-center gap-1">
            {file.url && (
              <button type="button" onClick={() => window.open(file.url, '_blank')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                <Download size={14} />
              </button>
            )}
            {!isReadOnly && (
              <button type="button" onClick={() => removeFile(target)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => triggerFileUpload(target)}
          disabled={isReadOnly}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-gov-400 hover:text-gov-600 transition-colors disabled:opacity-50"
        >
          <Upload size={16} className="inline mr-2" />
          Upload {label}
        </button>
      )}
    </div>
  );

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
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
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
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                <Building2 size={12} className="inline mr-1" />Yang Mengundang
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={inviterSearch}
                  onChange={(e) => {
                    setInviterSearch(e.target.value);
                    setShowInviterDropdown(true);
                  }}
                  onFocus={() => setShowInviterDropdown(true)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm disabled:bg-slate-50"
                  placeholder="Cari atau tambah yang mengundang..."
                />
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {showInviterDropdown && !isReadOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredInviters.map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => selectInviter(inv)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-700">{inv.name}</div>
                        {inv.organization && <div className="text-xs text-slate-500">{inv.organization}</div>}
                      </div>
                      {formData.inviter?.id === inv.id && <Check size={16} className="text-gov-600" />}
                    </button>
                  ))}

                  {!isAddingNewInviter ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewInviter(true)}
                      className="w-full px-3 py-2 text-left hover:bg-gov-50 text-gov-600 font-medium text-sm border-t"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Tambah Baru: "{inviterSearch}"
                    </button>
                  ) : (
                    <div className="p-3 border-t space-y-2">
                      <input
                        type="text"
                        value={newInviterName}
                        onChange={(e) => setNewInviterName(e.target.value)}
                        placeholder="Nama"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={newInviterOrg}
                        onChange={(e) => setNewInviterOrg(e.target.value)}
                        placeholder="Organisasi (opsional)"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={addNewInviter} className="flex-1 py-1.5 bg-gov-600 text-white rounded text-sm font-medium">
                          Simpan
                        </button>
                        <button type="button" onClick={() => setIsAddingNewInviter(false)} className="flex-1 py-1.5 bg-slate-200 text-slate-700 rounded text-sm">
                          Batal
                        </button>
                      </div>
                    </div>
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
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Dokumen</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {renderFileUpload('Surat Undangan', 'suratUndangan', formData.suratUndangan)}
                {renderFileUpload('Surat Tugas', 'suratTugas', formData.suratTugas)}
                {renderFileUpload('Laporan', 'laporan', formData.laporan)}
              </div>
            </div>

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
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
              {isReadOnly ? 'Tutup' : 'Batal'}
            </button>
            {!isReadOnly && (
              <button onClick={handleSubmit} className="px-6 py-2 bg-gov-600 text-white rounded-lg text-sm font-bold hover:bg-gov-700 transition-colors">
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
    </div>
  );
};

export default AddMeetingModal;
