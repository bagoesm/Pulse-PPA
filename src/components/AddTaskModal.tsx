import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Trash2, Lock, Info, Upload, FileText, Paperclip, Download, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { Task, Category, Priority, Status, User, ProjectDefinition, Attachment, TaskLink, ChecklistItem, Epic } from '../../types';
import { aiExtractorService } from '../services/aiExtractorService';
import { supabase } from '../lib/supabaseClient';
import { useModals } from '../hooks/useModalHelpers';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAttachmentHandlers } from '../hooks/useAttachmentHandlers';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';
import MultiSelectChip from './MultiSelectChip';
import DivisionFilteredMultiSelect from './DivisionFilteredMultiSelect';
import RichTextEditor from './RichTextEditor';
import SearchableSelect from './SearchableSelect';
import TaskDependencySelector from './TaskDependencySelector';
import { translatePriority, translateStatus } from '../utils/translations';
import ChecklistEditor from './ChecklistEditor';
import { formatFileSize } from '../utils/formatters';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  onSaveMultiple?: (tasks: Omit<Task, 'id'>[]) => Promise<void>;
  onDelete: (id: string) => void;
  initialData?: Task | null;
  currentUser: User | null;
  canEdit: boolean;
  canDelete: boolean;
  projects: ProjectDefinition[];
  epics?: Epic[]; // Epics for selection
  users: User[];
  subCategories: string[];
  masterCategories: any[];
  masterSubCategories: any[];
  categorySubcategoryRelations: any[];
  onSwitchToMeeting?: () => void;
  allTasks?: Task[]; // All tasks for dependency selection
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  onDelete,
  initialData = null,
  currentUser,
  canEdit,
  canDelete,
  projects,
  epics = [],
  users,
  subCategories,
  masterCategories,
  masterSubCategories,
  categorySubcategoryRelations,
  onSwitchToMeeting,
  allTasks = []
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

  // AI Task Generation States
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [defaultAiProjectId, setDefaultAiProjectId] = useState('');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    // category tidak diset - user harus memilih kategori (undefined di Partial<Task>)
    subCategory: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 hari dari sekarang
    pic: defaultPic ? [defaultPic] : [], // Array of PIC names
    priority: Priority.Medium,
    status: Status.ToDo,
    description: '',
    projectId: '', // Opsional - boleh kosong
    epicId: '', // Opsional - boleh kosong
    attachments: [],
    links: [],
    blockedBy: [],
    checklists: [],
    createdBy: currentUser?.name ?? ''
  });

  // Track newly uploaded attachments for cleanup on cancel
  const [newlyUploadedAttachments, setNewlyUploadedAttachments] = useState<Attachment[]>([]);
  // Loading state for save button
  const [isSaving, setIsSaving] = useState(false);
  // Loading state for file upload
  const [isUploading, setIsUploading] = useState(false);
  // Loading state for cleanup on close
  const [isCleaningUp, setIsCleaningUp] = useState(false);

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
        // Jika edit, gunakan kategori yang ada (tidak perlu fallback ke string kosong)
        priority: initialData.priority || Priority.Medium,
        status: initialData.status || Status.ToDo,
        startDate: initialData.startDate || new Date().toISOString().split('T')[0],
        deadline: initialData.deadline || new Date().toISOString().split('T')[0],
        attachments: initialData.attachments || [],
        links: initialData.links || [],
        blockedBy: initialData.blockedBy || [],
        checklists: initialData.checklists || [],
        pic: Array.isArray(initialData.pic) ? initialData.pic : (initialData.pic ? [initialData.pic as any] : [])
      });
    } else {
      setFormData({
        title: '',
        // category tidak diset - user harus memilih kategori (undefined di Partial<Task>)
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
        checklists: [],
        createdBy: currentUser?.name ?? ''
      });
    }

    // Reset AI states when modal opens
    setIsAiMode(false);
    setAiInputText('');
    setIsAiProcessing(false);
    setAiTasks([]);
    setReviewMode(false);
    setDefaultAiProjectId('');

    // Reset tracking state when modal opens
    setNewlyUploadedAttachments([]);
    setIsUploading(false);
    setIsCleaningUp(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  // Cleanup newly uploaded attachments on cancel/close (must be before early return for hooks order)
  const handleCleanupAndClose = useCallback(async () => {
    // Get attachments that were uploaded during this session but not in original data
    const originalIds = new Set((initialData?.attachments || []).map(a => a.id));
    const attachmentsToClean = newlyUploadedAttachments.filter(a => !originalIds.has(a.id));

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

    setIsUploading(true);
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

    // Track newly uploaded for cleanup on cancel
    setNewlyUploadedAttachments(prev => [...prev, ...uploadedAttachments]);

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
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
      // Also remove from newly uploaded tracking
      setNewlyUploadedAttachments(prev => prev.filter(a => a.id !== id));
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

  // AI Task Generation Handlers
  const handleAiTaskChange = (tempId: string, key: string, value: any) => {
    setAiTasks(prev => prev.map(t => {
      if (t.tempId !== tempId) return t;
      
      const updated = { ...t, [key]: value };
      
      if (key === 'category') {
        const cat = masterCategories.find(c => c.name === value);
        if (cat) {
          updated.categoryId = cat.id;
          
          const relatedSubIds = categorySubcategoryRelations
            .filter(rel => rel.category_id === cat.id)
            .map(rel => rel.subcategory_id);
          const filteredSubs = masterSubCategories.filter(sub => relatedSubIds.includes(sub.id));
          
          if (updated.subCategory && !filteredSubs.some(s => s.name === updated.subCategory)) {
            updated.subCategory = '';
            updated.subCategoryId = undefined;
          }
        } else {
          updated.categoryId = undefined;
          updated.subCategory = '';
          updated.subCategoryId = undefined;
        }
      }
      
      if (key === 'subCategory') {
        const cat = masterCategories.find(c => c.name === updated.category);
        if (cat) {
          const relatedSubIds = categorySubcategoryRelations
            .filter(rel => rel.category_id === cat.id)
            .map(rel => rel.subcategory_id);
          const sub = masterSubCategories.find(s => s.name === value && relatedSubIds.includes(s.id));
          if (sub) {
            updated.subCategoryId = sub.id;
          }
        }
      }

      return updated;
    }));
  };

  const handleAddBlankAiTask = () => {
    const newTask = {
      tempId: `ai_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      priority: Priority.Medium,
      status: Status.ToDo,
      startDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pic: defaultPic ? [defaultPic] : [],
      category: masterCategories.length > 0 ? masterCategories[0].name : '',
      categoryId: masterCategories.length > 0 ? masterCategories[0].id : undefined,
      subCategory: '',
      subCategoryId: undefined,
      projectId: defaultAiProjectId || '',
      attachments: [],
      links: [],
      blockedBy: [],
      checklists: []
    };
    setAiTasks(prev => [...prev, newTask]);
  };

  const handleProcessAi = async () => {
    if (!aiInputText.trim() || isAiProcessing) return;

    setIsAiProcessing(true);
    try {
      const extracted = await aiExtractorService.extractTasksFromText(aiInputText, {
        users: users.map(u => u.name),
        categories: masterCategories.map(c => c.name),
        subCategories: masterSubCategories.map(s => s.name),
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      });

      if (!Array.isArray(extracted)) {
        throw new Error('AI tidak mengembalikan format data yang valid (harus berupa array).');
      }

      const processedTasks = extracted.map((t: any, index: number) => {
        let categoryId = undefined;
        let subCategoryId = undefined;
        
        if (t.category) {
          const cat = masterCategories.find(c => c.name.toLowerCase() === t.category.toLowerCase());
          if (cat) {
            categoryId = cat.id;
            t.category = cat.name;
            
            if (t.subCategory) {
              const relatedSubIds = categorySubcategoryRelations
                .filter(rel => rel.category_id === cat.id)
                .map(rel => rel.subcategory_id);
              const sub = masterSubCategories.find(s => s.name.toLowerCase() === t.subCategory.toLowerCase() && relatedSubIds.includes(s.id));
              if (sub) {
                subCategoryId = sub.id;
                t.subCategory = sub.name;
              } else {
                const generalSub = masterSubCategories.find(s => s.name.toLowerCase() === t.subCategory.toLowerCase());
                if (generalSub) {
                  subCategoryId = generalSub.id;
                  t.subCategory = generalSub.name;
                }
              }
            }
          }
        }
        
        if (!categoryId && masterCategories.length > 0) {
          categoryId = masterCategories[0].id;
          t.category = masterCategories[0].name;
        }

        let projectId = t.projectId || defaultAiProjectId || '';
        if (projectId && !projects.some(p => p.id === projectId)) {
          projectId = '';
        }

        const picList = Array.isArray(t.pic) 
          ? t.pic.filter((p: string) => users.some(u => u.name.toLowerCase() === p.toLowerCase()))
              .map((p: string) => {
                const matchedUser = users.find(u => u.name.toLowerCase() === p.toLowerCase());
                return matchedUser ? matchedUser.name : p;
              })
          : [];

        return {
          tempId: `ai_task_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          title: t.title || '',
          description: t.description || '',
          priority: t.priority || Priority.Medium,
          status: Status.ToDo,
          startDate: t.startDate || new Date().toISOString().split('T')[0],
          deadline: t.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pic: picList.length > 0 ? picList : (defaultPic ? [defaultPic] : []),
          category: t.category || '',
          categoryId: categoryId,
          subCategory: t.subCategory || '',
          subCategoryId: subCategoryId,
          projectId: projectId,
          attachments: [],
          links: [],
          blockedBy: [],
          checklists: []
        };
      });

      setAiTasks(processedTasks);
      setReviewMode(true);
    } catch (error: any) {
      showNotification('Gagal Memproses AI', error.message || 'Terjadi kesalahan saat memproses data dengan AI.', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSaveAiTasks = async () => {
    if (isSaving) return;
    
    for (let i = 0; i < aiTasks.length; i++) {
      const t = aiTasks[i];
      if (!t.title.trim()) {
        showNotification('Judul Kosong', `Task #${i + 1} harus memiliki judul.`, 'warning');
        return;
      }
      if (!t.category) {
        showNotification('Kategori Kosong', `Task #${i + 1} harus memiliki kategori.`, 'warning');
        return;
      }
      if (!t.pic || t.pic.length === 0) {
        showNotification('PIC Kosong', `Task #${i + 1} harus memiliki minimal 1 PIC.`, 'warning');
        return;
      }
      
      const start = new Date(t.startDate);
      const end = new Date(t.deadline);
      if (start > end) {
        showNotification('Tanggal Tidak Valid', `Task #${i + 1}: Tanggal mulai tidak boleh melebihi tanggal deadline.`, 'warning');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (onSaveMultiple) {
        const payloads = aiTasks.map(t => {
          const { tempId, ...rest } = t;
          return {
            ...rest,
            title: t.title.trim(),
            description: t.description.trim()
          };
        });
        await onSaveMultiple(payloads);
      } else {
        for (const t of aiTasks) {
          const { tempId, ...rest } = t;
          await onSave(rest);
        }
      }
    } catch (err: any) {
      showNotification('Gagal Menyimpan', `Gagal menyimpan task: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSaving) return;

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

    let categoryId = formData.categoryId;
    let subCategoryId = formData.subCategoryId;

    // Resolve IDs from master data
    if (formData.category) {
      const currentCategory = masterCategories.find(cat => cat.name === formData.category);
      if (currentCategory) {
        categoryId = currentCategory.id;

        if (formData.subCategory) {
          const relatedSubIds = categorySubcategoryRelations
            .filter(rel => rel.category_id === currentCategory.id)
            .map(rel => rel.subcategory_id);
          const subCat = masterSubCategories.find(sub => sub.name === formData.subCategory && relatedSubIds.includes(sub.id));
          if (subCat) {
            subCategoryId = subCat.id;
          }
        }
      } else {
        // Kategori tidak ditemukan di master data
        showNotification('Kategori Tidak Valid', 'Kategori yang dipilih tidak ditemukan. Silakan pilih kategori lain.', 'error');
        return;
      }
    }

    // Validasi categoryId harus ada
    if (!categoryId) {
      showNotification('Kategori Tidak Valid', 'ID kategori tidak ditemukan. Silakan pilih kategori yang valid.', 'error');
      return;
    }

    const payload: Omit<Task, 'id'> = {
      title: (formData.title || '').trim(),
      category: (formData.category as Category) || '' as any, // Kategori wajib diisi, validasi sudah dilakukan
      categoryId: categoryId || undefined,
      subCategory: (formData.subCategory as string) || '',
      subCategoryId: subCategoryId || undefined,
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      pic: Array.isArray(formData.pic) ? formData.pic : (formData.pic ? [formData.pic as any] : [defaultPic]),
      priority: (formData.priority as Priority) || Priority.Medium,
      status: (formData.status as Status) || Status.ToDo,
      description: (formData.description || '').trim(),
      createdBy: initialData?.createdBy || currentUser?.name || 'System',
      projectId: formData.projectId || undefined, // Opsional - bisa kosong
      epicId: formData.epicId || undefined, // Opsional - bisa kosong
      attachments: formData.attachments || [],
      links: formData.links || [],
      blockedBy: formData.blockedBy || [],
      checklists: formData.checklists || []
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      // Clear tracking on successful save
      setNewlyUploadedAttachments([]);
    } finally {
      setIsSaving(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[90vh]">
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
          <button onClick={handleCleanupAndClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Only for new tasks */}
        {!initialData && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 sm:px-6 shrink-0">
            <button
              type="button"
              onClick={() => { setIsAiMode(false); setReviewMode(false); }}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                !isAiMode 
                  ? 'border-gov-600 text-gov-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Input Manual
            </button>
            <button
              type="button"
              onClick={() => setIsAiMode(true)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                isAiMode 
                  ? 'border-gov-600 text-gov-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Bikin dengan AI</span>
              <span className="text-[12px] bg-gov-100 text-gov-700 px-1.5 py-0.5 rounded-full font-bold">🪄</span>
            </button>
          </div>
        )}

        {isAiMode ? (
          /* AI Mode (Input + Review) */
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col space-y-4 bg-slate-50">
            {/* Source Text Input */}
            <div className="flex flex-col space-y-2 bg-white p-4 rounded-xl border border-slate-200 shrink-0">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Catatan Rapat / Instruksi / Data Mentah
              </label>
              <textarea
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Contoh: Tolong buatkan 3 task untuk tim:&#10;1. Budi membuat desain UI/UX untuk fitur login mulai hari ini dan selesai lusa.&#10;2. Ani melakukan coding frontend dan integrasi API mulai tanggal 2 Juli selama 5 hari.&#10;3. Tono melakukan QA dan pengujian akhir selesai tanggal 10 Juli."
                className={`w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-850 placeholder-slate-400 transition-all resize-y ${
                  aiTasks.length > 0 ? 'h-24' : 'h-48'
                }`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Project Default (Opsional)
                  </label>
                  <SearchableSelect
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    value={defaultAiProjectId}
                    onChange={(val) => setDefaultAiProjectId(val)}
                    placeholder="Pilih project..."
                    emptyOption="-- Tidak terkait project --"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    disabled={isAiProcessing || !aiInputText.trim()}
                    onClick={handleProcessAi}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-gov-600 hover:bg-gov-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Menganalisis...</span>
                      </>
                    ) : (
                      <>
                        <span>{aiTasks.length > 0 ? 'Proses Ulang dengan AI' : 'Proses dengan AI'}</span>
                        <span className="text-xs">🪄</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Review Section */}
            {aiTasks.length > 0 && (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center bg-gov-50 p-3 rounded-xl border border-gov-100 shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-gov-800">Review Hasil Ekstraksi AI</h3>
                    <p className="text-[11px] text-gov-600">Periksa dan lengkapi detail tugas di bawah sebelum disimpan ke database.</p>
                  </div>
                  <span className="bg-gov-200 text-gov-800 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                    {aiTasks.length} Task
                  </span>
                </div>

                <div className="space-y-4">
                  {aiTasks.map((task, index) => {
                    return (
                      <div key={task.tempId} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-gov-200 transition-all relative space-y-3">
                        {/* Card Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Task #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAiTasks(prev => prev.filter(t => t.tempId !== task.tempId))}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                            title="Hapus task ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Judul Task *</label>
                          <input
                            type="text"
                            required
                            value={task.title}
                            onChange={(e) => handleAiTaskChange(task.tempId, 'title', e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-gov-400 outline-none transition-all"
                            placeholder="Masukkan judul task..."
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deskripsi</label>
                          <textarea
                            value={task.description}
                            onChange={(e) => handleAiTaskChange(task.tempId, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-gov-400 outline-none resize-y transition-all"
                            placeholder="Tambahkan rincian pekerjaan..."
                          />
                        </div>

                        {/* Category and Sub-category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori *</label>
                            <select
                              value={task.category || ''}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'category', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                              <option value="" disabled hidden>-- Pilih Kategori --</option>
                              {masterCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub-Kategori</label>
                            <select
                              value={task.subCategory || ''}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'subCategory', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                              <option value="">-- Pilih Sub Kategori --</option>
                              {(() => {
                                const currentCategory = masterCategories.find(cat => cat.name === task.category);
                                if (currentCategory) {
                                  const relatedSubIds = categorySubcategoryRelations
                                    .filter(rel => rel.category_id === currentCategory.id)
                                    .map(rel => rel.subcategory_id);
                                  return masterSubCategories
                                    .filter(sub => relatedSubIds.includes(sub.id))
                                    .map(sub => (
                                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                                    ));
                                }
                                return [];
                              })()}
                            </select>
                          </div>
                        </div>

                        {/* PIC Selection */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PIC *</label>
                          <DivisionFilteredMultiSelect
                            users={users}
                            currentUserDivisi={currentUser?.divisi}
                            value={task.pic}
                            onChange={(selected) => handleAiTaskChange(task.tempId, 'pic', selected)}
                            placeholder="Pilih PIC..."
                            maxVisibleChips={3}
                            className="w-full text-xs"
                          />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mulai</label>
                            <input
                              type="date"
                              value={task.startDate}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'startDate', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-750 focus:ring-2 focus:ring-gov-400 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Deadline</label>
                            <input
                              type="date"
                              value={task.deadline}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'deadline', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-755 focus:ring-2 focus:ring-gov-400 outline-none"
                            />
                          </div>
                        </div>

                        {/* Priority and Project */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prioritas</label>
                            <select
                              value={task.priority}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'priority', e.target.value as Priority)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                              {Object.values(Priority).map(p => <option key={p} value={p}>{translatePriority(p)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project (Opsional)</label>
                            <select
                              value={task.projectId || ''}
                              onChange={(e) => handleAiTaskChange(task.tempId, 'projectId', e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:ring-2 focus:ring-gov-400 outline-none"
                            >
                              <option value="">-- Tidak Terkait Project --</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add blank task button */}
                <button
                  type="button"
                  onClick={handleAddBlankAiTask}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:text-gov-600 hover:border-gov-400 hover:bg-gov-50 transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus size={14} />
                  <span>Tambah Task Manual Ke Review</span>
                </button>
              </div>
            )}

            {/* Footer actions for AI Mode */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCleanupAndClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              {aiTasks.length > 0 && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAiTasks}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gov-600 hover:bg-gov-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Semua ({aiTasks.length} Task)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Manual Mode */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
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
                    value={formData.category || ''}
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

              {/* Epic Selection - Only show if project is selected */}
              {formData.projectId && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Pilih Epic (Opsional)
                  </label>
                  {isReadOnly ? (
                    <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm">
                      {epics.find(e => e.id === formData.epicId)?.name || '-- Tidak terkait epic --'}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={epics
                        .filter(e => e.projectId === formData.projectId)
                        .map(e => ({ value: e.id, label: e.name }))}
                      value={formData.epicId || ''}
                      onChange={(val) => handleChange('epicId', val)}
                      placeholder="Cari epic..."
                      emptyOption="-- Tidak terkait epic --"
                    />
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Epic membantu mengelompokkan task-task dalam satu fitur atau milestone.
                  </p>
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
                <DivisionFilteredMultiSelect
                  users={users}
                  currentUserDivisi={currentUser?.divisi}
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
                  value={formData.startDate || ''}
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
                  value={formData.deadline || ''}
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
                  value={formData.priority || ''}
                  onChange={(e) => handleChange('priority', e.target.value as Priority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="" disabled hidden>-- Pilih Prioritas --</option>
                  {Object.values(Priority).map(p => <option key={p} value={p}>{translatePriority(p)}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</label>
                <select
                  disabled={isReadOnly}
                  value={formData.status || ''}
                  onChange={(e) => handleChange('status', e.target.value as Status)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="" disabled hidden>-- Pilih Status --</option>
                  {Object.values(Status).map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
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

            {/* Task Dependencies */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Task yang Harus Selesai Dulu
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Pilih task yang harus selesai sebelum task ini bisa dimulai
              </p>
              <TaskDependencySelector
                tasks={allTasks}
                selectedTaskIds={formData.blockedBy || []}
                onChange={(ids) => handleChange('blockedBy', ids)}
                excludeTaskId={initialData?.id}
                disabled={isReadOnly}
                placeholder="Cari task..."
              />
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Checklist
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Tambahkan daftar item yang harus diselesaikan dalam task ini
              </p>
              <ChecklistEditor
                items={(formData.checklists as ChecklistItem[]) || []}
                onChange={(items) => handleChange('checklists', items)}
                disabled={isReadOnly}
              />
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
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-gov-500" />
                        <span className="text-xs">Mengupload...</span>
                      </>
                    ) : (
                      <>
                        <Paperclip size={18} />
                        <span className="text-xs">Belum ada dokumen</span>
                      </>
                    )}
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
              <button type="button" onClick={handleCleanupAndClose} disabled={isSaving || isCleaningUp || isUploading} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isCleaningUp && <Loader2 size={14} className="animate-spin" />}
                {isReadOnly ? 'Tutup' : 'Batal'}
              </button>

              {!isReadOnly && (
                <button type="submit" disabled={isSaving || isUploading} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gov-600 hover:bg-gov-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {initialData ? 'Simpan Perubahan' : 'Buat Task'}
                </button>
              )}
            </div>
          </div>
        </form>
        )}
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
