// src/components/AddProjectModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Briefcase } from 'lucide-react';
import { ProjectDefinition, User } from '../../types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectDefinition) => void;
  users: User[]; // <-- daftar user dari parent (DB)
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave, users }) => {
  // default manager: first user name if available
  const defaultManager = useMemo(() => (Array.isArray(users) && users.length > 0 ? users[0].name : ''), [users]);

  const [formData, setFormData] = useState({
    name: '',
    manager: defaultManager,
    description: '',
  });

  // When users prop changes (e.g. loaded async), ensure default manager set
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, manager: defaultManager }));
  }, [defaultManager]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.manager) return;

    const newProject: ProjectDefinition = {
      id: `p${Date.now()}`,
      name: formData.name.trim(),
      manager: formData.manager,
      description: formData.description?.trim() || '',
    };

    onSave(newProject);
    setFormData({ name: '', manager: defaultManager, description: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Buat Project Baru</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nama Project</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                placeholder="Contoh: Sistem Informasi Pegawai"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Project Manager (PIC)</label>
              <select
                value={formData.manager}
                onChange={(e) => setFormData({...formData, manager: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
              >
                {Array.isArray(users) && users.length > 0 ? (
                  users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                ) : (
                  <option value="">(Belum ada pengguna)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Deskripsi Singkat</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                placeholder="Deskripsi tujuan project..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.manager}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white bg-gov-600 hover:bg-gov-700 flex items-center gap-2 ${(!formData.name.trim() || !formData.manager) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Briefcase size={16} />
              Buat Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
