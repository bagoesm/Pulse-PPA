// src/components/AddTaskModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Lock, Info, Upload, FileText, Paperclip } from 'lucide-react';
import { Task, Category, Priority, Status, User, ProjectDefinition, Attachment } from '../../types';
import { supabase } from '../lib/supabaseClient';


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
  users: User[];             // list users from DB
  subCategories: string[];   // list sub categories from DB
}

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

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
  subCategories
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // default manager/pic name from currentUser or first user in list
  const defaultPic = currentUser?.name ?? (users && users.length > 0 ? users[0].name : '');

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    category: Category.Project,
    subCategory: subCategories && subCategories.length > 0 ? subCategories[0] : '',
    deadline: new Date().toISOString().split('T')[0],
    pic: defaultPic,
    priority: Priority.Medium,
    status: Status.ToDo,
    description: '',
    projectId: '',
    attachments: [],
    createdBy: currentUser?.name ?? ''
  });

  // Readonly when editing but user cannot edit
  const isReadOnly = !!initialData && !canEdit;

  // Keep default pic/subCategory in sync when users/subCategories load
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      pic: prev.pic || defaultPic,
      subCategory: prev.subCategory || (subCategories && subCategories[0]) || ''
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users.length, subCategories.length, currentUser?.id]);

  // When modal opens, populate with initialData or reset
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      // Ensure attachments array exists
      setFormData({
        ...initialData,
        attachments: initialData.attachments || []
      });
    } else {
      setFormData({
        title: '',
        category: Category.Project,
        subCategory: subCategories && subCategories.length > 0 ? subCategories[0] : '',
        deadline: new Date().toISOString().split('T')[0],
        pic: defaultPic,
        priority: Priority.Medium,
        status: Status.ToDo,
        description: '',
        projectId: '',
        attachments: [],
        createdBy: currentUser?.name ?? ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (key: keyof Task, value: any) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  

  // di dalam AddTaskModal.tsx (ganti fungsi handleFileChange lama)
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files || e.target.files.length === 0) return;

  const files = Array.from(e.target.files);
  const uploadedAttachments: Attachment[] = [];

  for (const file of files) {
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `files/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      // Upload ke Supabase Storage (bucket: attachment)
      const { error: uploadError } = await supabase.storage
        .from('attachment')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Upload gagal:', uploadError);
        // optionally notify user
        continue;
      }

      // Buat signed URL (opsional, untuk preview/download langsung)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('attachment')
        .createSignedUrl(storagePath, 60 * 60);

      if (signedError) {
        console.warn('Signed URL gagal:', signedError);
      }

      const att: Attachment = {
        id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: storagePath,           // <= sangat penting
        url: signedData?.signedUrl || null
      };

      uploadedAttachments.push(att);
    } catch (err) {
      console.error('Error upload file:', err);
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


  const handleRemoveAttachment = (id: string) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // basic validation
    if (!formData.title || !formData.category || !formData.priority || !formData.status) {
      alert('Mohon isi semua field wajib.');
      return;
    }

    if (formData.category === Category.Project && !formData.projectId) {
      alert('Mohon pilih Project untuk kategori Project.');
      return;
    }

    const payload: Omit<Task, 'id'> = {
      title: (formData.title || '').trim(),
      category: (formData.category as Category) || Category.Project,
      subCategory: (formData.subCategory as string) || '',
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      pic: formData.pic || defaultPic,
      priority: (formData.priority as Priority) || Priority.Medium,
      status: (formData.status as Status) || Status.ToDo,
      description: (formData.description || '').trim(),
      createdBy: initialData?.createdBy || currentUser?.name || 'System',
      projectId: formData.projectId || undefined,
      attachments: formData.attachments || []
    };

    onSave(payload);
  };

  const handleDelete = () => {
    if (!initialData) return;
    if (!canDelete) return;
    if (!window.confirm('Hapus task ini? Tindakan tidak dapat dibatalkan.')) return;
    onDelete(initialData.id);
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Kategori</label>
                <select
                  disabled={isReadOnly}
                  value={formData.category || Category.Project}
                  onChange={(e) => handleChange('category', e.target.value as Category)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sub Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {formData.category === Category.Project ? 'Jenis Task' : 'Sub-Kategori'}
                </label>

                {formData.category === Category.Project ? (
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={formData.subCategory || ''}
                    onChange={(e) => handleChange('subCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="Contoh: Backend, Design"
                  />
                ) : (
                  <select
                    disabled={isReadOnly}
                    value={formData.subCategory || (subCategories[0] || '')}
                    onChange={(e) => handleChange('subCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    {subCategories && subCategories.length > 0 ? (
                      subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)
                    ) : (
                      <option value="">(Belum ada sub-kategori)</option>
                    )}
                  </select>
                )}
              </div>
            </div>

            {/* Project selection */}
            {formData.category === Category.Project && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Pilih Project</label>
                <select
                  disabled={isReadOnly}
                  value={formData.projectId || ''}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">-- Pilih Project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

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
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* PIC */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">PIC Task</label>
                <select
                  disabled={isReadOnly}
                  value={formData.pic || defaultPic}
                  onChange={(e) => handleChange('pic', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-700 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {users && users.length > 0 ? (
                    users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                  ) : (
                    <option value="">{currentUser?.name ?? '(Tidak ada pengguna)'}</option>
                  )}
                </select>
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

            <div className="grid grid-cols-2 gap-4">
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
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm text-slate-800 placeholder-slate-400 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Tambahkan detail pekerjaan..."
              />
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
                      {!isReadOnly && (
                        <button type="button" onClick={() => handleRemoveAttachment(file.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                          <X size={14} />
                        </button>
                      )}
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
    </div>
  );
};

export default AddTaskModal;
