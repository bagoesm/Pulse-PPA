// src/components/AddTaskModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Lock, Info, Upload, FileText, Paperclip, Download, ExternalLink, Plus } from 'lucide-react';
import { Task, Category, Priority, Status, User, ProjectDefinition, Attachment, TaskLink } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { useModals } from '../hooks/useModalHelpers';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAttachmentHandlers } from '../hooks/useAttachmentHandlers';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';
import MultiSelectChip from './MultiSelectChip';
import RichTextEditor from './RichTextEditor';
import SearchableSelect from './SearchableSelect';
import { formatFileSize } from '../utils/formatters';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  onDelete: (id: string) => void;
  initialData?: Task | null;
  currentUser: User | null;
  canEdit: boolean;
  canDelete: boolean;
  projects: ProjectDefinition[];
  users: User[];
  subCategories: string[];
  masterCategories: any[];
  masterSubCategories: any[];
  categorySubcategoryRelations: any[];
  onSwitchToMeeting?: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
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
  subCategories,
  masterCategories,
  masterSubCategories,
  categorySubcategoryRelations,
  onSwitchToMeeting
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal hooks
  const {
    notificationModal, showNotification, hideNotification,
    confirmModal, showConfirm, hideConfirm,
    showError
  } = useModals();

  // File handling hooks
  const { uploadFile } = useFileUpload('attachment');
  const { handleDownload, handleRemoveFromStorage } = useAttachmentHandlers('attachment', showError);

  // default manager/pic name from currentUser or first user in list
  const defaultPic = currentUser?.name ?? (users && users.length > 0 ? users[0].name : '');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    category: Category.PengembanganAplikasi, // Default ke kategori pertama
    subCategory: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 hari dari sekarang
    pic: defaultPic ? [defaultPic] : [], // Array of PIC names
    priority: Priority.Medium,
    status: Status.ToDo,
    description: '',
    projectId: '', // Opsional - boleh kosong
    attachments: [],
    links: [],
    createdBy: currentUser?.name ?? ''
  });

  // Readonly when editing but user cannot edit
  const isReadOnly = !!initialData && !canEdit;

  // Keep default pic/subCategory in sync when users/subCategories load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pic: (prev.pic && Array.isArray(prev.pic) && prev.pic.length > 0) ? prev.pic : (defaultPic ? [defaultPic] : [])
      // Don't auto-set subCategory - let user choose
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.length, subCategories.length, currentUser?.id]);

  // Update subCategory when category changes
  useEffect(() => {
    // Reset subcategory when category changes
    const currentCategory = masterCategories.find(cat => cat.name === formData.category);
    if (currentCategory) {
      // Get subcategories connected to this category through relations
      const relatedSubIds = categorySubcategoryRelations
        .filter(rel => rel.category_id === currentCategory.id)
        .map(rel => rel.subcategory_id);
      const filteredSubCategories = masterSubCategories.filter(sub => relatedSubIds.includes(sub.id));

      // Don't auto-set subCategory when category changes - let user choose
      // Only check if current subcategory is valid for this category (when editing)
      if (formData.subCategory && filteredSubCategories.length > 0) {
        const isValidSubCategory = filteredSubCategories.some(sub => sub.name === formData.subCategory);
        if (!isValidSubCategory) {
          setFormData(prev => ({ ...prev, subCategory: '' }));
        }
      }
    } else {
      // Fallback to legacy system - just validate, don't auto-set
      if (formData.category === Category.PengembanganAplikasi) {
        const validLegacySubs = ['UI/UX Design', 'Fitur Baru', 'Backend', 'Frontend', 'QA & Pengujian', 'Dokumentasi'];
        if (formData.subCategory && !validLegacySubs.includes(formData.subCategory)) {
          setFormData(prev => ({ ...prev, subCategory: '' }));
        }
      }
    }
  }, [formData.category, masterCategories, masterSubCategories, categorySubcategoryRelations, subCategories]);

  // When modal opens, populate with initialData or reset
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      // Ensure attachments array exists and handle backward compatibility for pic
      setFormData({
        ...initialData,
        attachments: initialData.attachments || [],
        links: initialData.links || [],
        pic: Array.isArray(initialData.pic) ? initialData.pic : (initialData.pic ? [initialData.pic as any] : [])
      });
    } else {
      setFormData({
        title: '',
        category: Category.PengembanganAplikasi, // Default ke kategori pertama
        subCategory: '',
        startDate: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 hari dari sekarang
        pic: defaultPic ? [defaultPic] : [], // Array of PIC names
        priority: Priority.Medium,
        status: Status.ToDo,
        description: '',
        projectId: '', // Opsional - boleh kosong
        attachments: [],
        links: [],
        createdBy: currentUser?.name ?? ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Task, value: any) => {
    if (isReadOnly) return;

    // Jika user memilih kategori "Audiensi/Rapat" dan ini bukan edit mode, switch ke meeting modal
    // Cek berdasarkan nama string karena kategori bisa dari database
    if (key === 'category' && value === 'Audiensi/Rapat' && !initialData && onSwitchToMeeting) {
      onSwitchToMeeting();
      return;
    }

    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const uploadedAttachments: Attachment[] = [];

    for (const file of files) {
      const attachment = await uploadFile(file, 'files');
      if (attachment) {
        uploadedAttachments.push(attachment);
      }
    }

    // gabungkan ke formData.attachments (pastikan bentuk array)
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments ?? []), ...uploadedAttachments]
    }));

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleRemoveAttachment = async (id: string) => {
    if (isReadOnly) return;

    // Find the attachment to get the file path
    const attachmentToRemove = (formData.attachments || []).find(a => a.id === id);

    // Remove from UI immediately for better UX
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));

    // Delete from Supabase Storage using hook via helper logic
    if (attachmentToRemove) {
      await handleRemoveFromStorage(attachmentToRemove);
    }
  };

  // Use handleDownload directly from hook in render


  // Link management functions
  const handleAddLink = () => {
    if (isReadOnly) return;

    const newLink: TaskLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      url: ''
    };

    setFormData(prev => ({
      ...prev,
      links: [...(prev.links || []), newLink]
    }));
  };

  const handleUpdateLink = (id: string, field: 'title' | 'url', value: string) => {
    if (isReadOnly) return;

    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).map(link =>
        link.id === id ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleUrlBlur = (id: string, value: string) => {
    if (isReadOnly) return;

    // Auto-add https:// if URL doesn't have protocol and is not empty
    let processedValue = value.trim();
    if (processedValue && !processedValue.match(/^https?:\/\//i)) {
      processedValue = `https://${processedValue}`;

      // Update the form data with the processed URL
      setFormData(prev => ({
        ...prev,
        links: (prev.links || []).map(link =>
          link.id === id ? { ...link, url: processedValue } : link
        )
      }));
    }
  };

  const ensureHttps = (url: string) => {
    if (!url) return url;
    const trimmedUrl = url.trim();
    if (trimmedUrl && !trimmedUrl.match(/^https?:\/\//i)) {
      return `https://${trimmedUrl}`;
    }
    return trimmedUrl;
  };

  const handleRemoveLink = (id: string) => {
    if (isReadOnly) return;

    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter(link => link.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // basic validation
    if (!formData.title || !formData.category || !formData.priority || !formData.status || !formData.startDate || !formData.deadline) {
      showNotification('Data Tidak Lengkap', 'Mohon isi semua field wajib (Judul, Kategori, Tanggal Mulai, Deadline, Prioritas, Status).', 'warning');
      return;
    }

    // Validate PIC - must have at least one
    if (!Array.isArray(formData.pic) || formData.pic.length === 0) {
      showNotification('PIC Wajib', 'Minimal 1 PIC harus dipilih untuk task ini.', 'warning');
      return;
    }

    // Kategori wajib diisi, project opsional
    if (!formData.category) {
      showNotification('Kategori Wajib', 'Kategori wajib dipilih untuk setiap task.', 'warning');
      return;
    }

    // Validasi tanggal
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.deadline);

    if (startDate > endDate) {
      showNotification('Tanggal Tidak Valid', 'Tanggal mulai tidak boleh lebih besar dari tanggal deadline.', 'warning');
      return;
    }

    const payload: Omit<Task, 'id'> = {
      title: (formData.title || '').trim(),
      category: (formData.category as Category) || Category.PengembanganAplikasi, // Default ke kategori pertama
      subCategory: (formData.subCategory as string) || '',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      pic: Array.isArray(formData.pic) ? formData.pic : (formData.pic ? [formData.pic as any] : [defaultPic]),
      priority: (formData.priority as Priority) || Priority.Medium,
      status: (formData.status as Status) || Status.ToDo,
      description: (formData.description || '').trim(),
      createdBy: initialData?.createdBy || currentUser?.name || 'System',
      projectId: formData.projectId || undefined, // Opsional - bisa kosong
      attachments: formData.attachments || [],
      links: formData.links || []
    };

    onSave(payload);
  };

  const handleDelete = () => {
    if (!initialData) return;
    if (!canDelete) return;

    showConfirm(
      'Hapus Task',
      'Hapus task ini? Tindakan tidak dapat dibatalkan.',
      () => onDelete(initialData.id),
      'error',
      'Hapus',
      'Batal'
    );
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {initialData ? (isReadOnly ? 'Detail Task' : 'Edit Task') : 'Tambah Task Baru'}
            </h2>
            {isReadOnly && (
              <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} /> View Only
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-3 sm:space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Judul Task</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-800 placeholder-slate-400 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Contoh: Rapat Koordinasi..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kategori</label>
                {isReadOnly ? (
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm">
                    {formData.category || '-'}
                  </div>
                ) : (
                  <SearchableSelect
                    options={(
                      masterCategories.length > 0
                        ? masterCategories.map(cat => ({ value: cat.name, label: cat.name }))
                        : Object.values(Category).map(cat => ({ value: cat, label: cat }))
                    )}
                    value={formData.category || (masterCategories.length > 0 ? masterCategories[0].name : Category.PengembanganAplikasi)}
                    onChange={(val) => handleChange('category', val as Category)}
                    placeholder="Cari kategori..."
                    emptyOption="-- Pilih Kategori --"
                  />
                )}
              </div>

              {/* Sub Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Sub-Kategori
                </label>

                {isReadOnly ? (
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm">
                    {formData.subCategory || '-'}
                  </div>
                ) : (
                  <SearchableSelect
                    options={(() => {
                      // Get current category ID
                      const currentCategory = masterCategories.find(cat => cat.name === formData.category);
                      if (currentCategory) {
                        // Filter subcategories by current category through relations
                        const relatedSubIds = categorySubcategoryRelations
                          .filter(rel => rel.category_id === currentCategory.id)
                          .map(rel => rel.subcategory_id);
                        const filteredSubCategories = masterSubCategories.filter(sub => relatedSubIds.includes(sub.id));
                        return filteredSubCategories.map(sub => ({ value: sub.name, label: sub.name }));
                      }

                      // Fallback to legacy system
                      if (formData.category === Category.PengembanganAplikasi) {
                        return [
                          { value: 'UI/UX Design', label: 'UI/UX Design' },
                          { value: 'Fitur Baru', label: 'Fitur Baru' },
                          { value: 'Backend', label: 'Backend' },
                          { value: 'Frontend', label: 'Frontend' },
                          { value: 'QA & Pengujian', label: 'QA & Pengujian' },
                          { value: 'Dokumentasi', label: 'Dokumentasi' },
                        ];
                      } else {
                        return subCategories && subCategories.length > 0
                          ? subCategories.map(sc => ({ value: sc, label: sc }))
                          : [];
                      }
                    })()}
                    value={formData.subCategory || ''}
                    onChange={(val) => handleChange('subCategory', val)}
                    placeholder="Cari sub-kategori..."
                    emptyOption="-- Pilih Sub Kategori --"
                  />
                )}
              </div>
            </div>

            {/* Project selection - Opsional untuk semua task */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Pilih Project (Opsional)
              </label>
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

              {selectedProject && (
                <div className="mt-2 text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 flex gap-2">
                  <Info size={14} className="text-gov-500" />
                  <div>
                    <div className="font-semibold text-slate-700">{selectedProject.name}</div>
                    <div className="text-[12px] italic">{selectedProject.description}</div>
                    <div className="text-[12px] mt-1"><span className="font-medium">PIC:</span> {selectedProject.manager}</div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 mt-2 italic">
                Task dapat dikaitkan dengan project atau berdiri sendiri sesuai kategori yang dipilih.
              </p>
            </div>

            {/* PIC - Multiple Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                PIC Task (Person In Charge)
              </label>
              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm min-h-[40px] flex items-center">
                  {Array.isArray(formData.pic) && formData.pic.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {formData.pic.map((picName, index) => (
                        <span key={index} className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full">
                          {picName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">Tidak ada PIC</span>
                  )}
                </div>
              ) : (
                <MultiSelectChip
                  options={users && users.length > 0 ? users.map(u => ({ value: u.name, label: u.name })) : []}
                  value={Array.isArray(formData.pic) ? formData.pic : (formData.pic ? [formData.pic as any] : [])}
                  onChange={(selected) => handleChange('pic', selected)}
                  placeholder="Pilih PIC untuk task ini..."
                  maxVisibleChips={3}
                  className="w-full"
                />
              )}
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Anda dapat memilih beberapa PIC untuk task ini. Minimal 1 PIC harus dipilih.
              </p>
            </div>

            {/* Tanggal Mulai dan Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Tanggal Mulai */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  disabled={isReadOnly}
                  value={formData.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deadline</label>
                <input
                  type="date"
                  required
                  disabled={isReadOnly}
                  value={formData.deadline || new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Prioritas</label>
                <select
                  disabled={isReadOnly}
                  value={formData.priority || Priority.Medium}
                  onChange={(e) => handleChange('priority', e.target.value as Priority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                <select
                  disabled={isReadOnly}
                  value={formData.status || Status.ToDo}
                  onChange={(e) => handleChange('status', e.target.value as Status)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deskripsi</label>
              {isReadOnly ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm min-h-[80px] whitespace-pre-wrap">
                  {formData.description || 'Tidak ada deskripsi'}
                </div>
              ) : (
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(val) => handleChange('description', val)}
                  placeholder="Tambahkan detail pekerjaan... (gunakan @nama untuk mention)"
                  disabled={isReadOnly}
                  rows={4}
                  users={users}
                />
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Link Terkait</label>
                {!isReadOnly && (
                  <button type="button" onClick={handleAddLink} className="text-xs flex items-center gap-1 text-gov-600 font-bold hover:underline">
                    <Plus size={12} /> Tambah Link
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(formData.links && formData.links.length > 0) ? (
                  (formData.links || []).map(link => (
                    <div key={link.id} className="bg-slate-50 border border-slate-200 rounded-lg group hover:border-gov-200 transition-colors overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded bg-white border border-slate-100 flex items-center justify-center text-gov-600 shrink-0">
                            <ExternalLink size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {isReadOnly ? (
                              <div className="text-sm font-medium text-slate-700 truncate">
                                {link.title || 'Untitled Link'}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={link.title}
                                onChange={(e) => handleUpdateLink(link.id, 'title', e.target.value)}
                                placeholder="Judul link..."
                                className="w-full text-sm font-medium text-slate-700 bg-transparent border-none outline-none placeholder-slate-400"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Open Link Button - Always visible if URL exists */}
                          {link.url && (
                            <button
                              type="button"
                              onClick={() => window.open(ensureHttps(link.url), '_blank')}
                              className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded-full transition-colors"
                              title={`Buka ${link.title || 'link'}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}

                          {/* Remove Button - Only when not readonly */}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(link.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Hapus link"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* URL Input/Display - Separate row for better responsiveness */}
                      <div className="px-3 pb-3">
                        {isReadOnly ? (
                          link.url && (
                            <div className="text-xs text-slate-500 bg-white rounded px-2 py-1 border border-slate-100 font-mono break-all">
                              {link.url}
                            </div>
                          )
                        ) : (
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => handleUpdateLink(link.id, 'url', e.target.value)}
                            onBlur={(e) => handleUrlBlur(link.id, e.target.value)}
                            placeholder="https://..."
                            className="w-full text-xs text-slate-500 bg-white rounded px-2 py-1 border border-slate-200 outline-none placeholder-slate-400 font-mono focus:border-gov-300 focus:ring-1 focus:ring-gov-300"
                          />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50/50">
                    <ExternalLink size={18} />
                    <span className="text-xs">Belum ada link</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Dokumen Pendukung</label>
                {!isReadOnly && (
                  <button type="button" onClick={triggerFileUpload} className="text-xs flex items-center gap-1 text-gov-600 font-bold hover:underline">
                    <Upload size={12} /> Upload File
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
              </div>

              <div className="space-y-2">
                {(formData.attachments && formData.attachments.length > 0) ? (
                  (formData.attachments || []).map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg group hover:border-gov-200 transition-colors">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center text-gov-600 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Download Button - Always visible */}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded-full transition-colors"
                          title={`Download ${file.name}`}
                        >
                          <Download size={14} />
                        </button>

                        {/* Remove Button - Only when not readonly */}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title={`Hapus ${file.name}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50/50">
                    <Paperclip size={18} />
                    <span className="text-xs">Belum ada dokumen</span>
                  </div>
                )}
              </div>
            </div>

            {/* Created By Info */}
            {initialData && (
              <div className="text-[10px] text-slate-400 text-right pt-2">
                Dibuat oleh: <span className="font-medium text-slate-600">{initialData.createdBy}</span>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between gap-3">
            <div>
              {initialData && canDelete && (
                <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2">
                  <Trash2 size={16} /> Hapus
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                {isReadOnly ? 'Tutup' : 'Batal'}
              </button>

              {!isReadOnly && (
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gov-600 hover:bg-gov-700 shadow-md hover:shadow-lg transition-all">
                  {initialData ? 'Simpan Perubahan' : 'Buat Task'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Custom Modals */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={hideNotification}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
        autoClose={notificationModal.type === 'success'}
        autoCloseDelay={3000}
      />

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
        onClose={hideConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default AddTaskModal;
