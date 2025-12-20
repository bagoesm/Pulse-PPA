// src/components/AddProjectModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  X, 
  Briefcase, 
  Code, 
  Database, 
  Globe, 
  Smartphone, 
  Monitor, 
  Server, 
  Cloud, 
  Shield, 
  Zap, 
  Target, 
  Rocket, 
  Star, 
  Heart, 
  Lightbulb,
  Settings,
  Users,
  FileText,
  BarChart3,
  Layers
} from 'lucide-react';
import { ProjectDefinition, ProjectStatus, User } from '../../types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ProjectDefinition) => void;
  users: User[];
  editingProject?: ProjectDefinition | null;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave, users, editingProject }) => {
  // default manager: first user name if available
  const defaultManager = useMemo(() => (Array.isArray(users) && users.length > 0 ? users[0].name : ''), [users]);

  const [formData, setFormData] = useState({
    name: editingProject?.name || '',
    manager: editingProject?.manager || defaultManager,
    description: editingProject?.description || '',
    icon: editingProject?.icon || 'Briefcase',
    color: editingProject?.color || 'blue',
    targetLiveDate: editingProject?.targetLiveDate || '',
    status: (editingProject?.status || 'In Progress') as ProjectStatus,
  });

  // Available icons for projects
  const projectIcons = [
    { name: 'Briefcase', icon: Briefcase, label: 'Bisnis' },
    { name: 'Code', icon: Code, label: 'Pengembangan' },
    { name: 'Database', icon: Database, label: 'Data' },
    { name: 'Globe', icon: Globe, label: 'Web' },
    { name: 'Smartphone', icon: Smartphone, label: 'Mobile' },
    { name: 'Monitor', icon: Monitor, label: 'Desktop' },
    { name: 'Server', icon: Server, label: 'Server' },
    { name: 'Cloud', icon: Cloud, label: 'Cloud' },
    { name: 'Shield', icon: Shield, label: 'Keamanan' },
    { name: 'Zap', icon: Zap, label: 'Performa' },
    { name: 'Target', icon: Target, label: 'Target' },
    { name: 'Rocket', icon: Rocket, label: 'Inovasi' },
    { name: 'Star', icon: Star, label: 'Premium' },
    { name: 'Heart', icon: Heart, label: 'Sosial' },
    { name: 'Lightbulb', icon: Lightbulb, label: 'Ide' },
    { name: 'Settings', icon: Settings, label: 'Konfigurasi' },
    { name: 'Users', icon: Users, label: 'Tim' },
    { name: 'FileText', icon: FileText, label: 'Dokumen' },
    { name: 'BarChart3', icon: BarChart3, label: 'Analitik' },
    { name: 'Layers', icon: Layers, label: 'Sistem' },
  ];

  // Available color themes
  const colorThemes = [
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200', label: 'Biru' },
    { name: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Hijau' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200', label: 'Ungu' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-200', label: 'Oranye' },
    { name: 'red', bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', label: 'Merah' },
    { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200', label: 'Indigo' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', ring: 'ring-pink-200', label: 'Pink' },
    { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', ring: 'ring-teal-200', label: 'Teal' },
  ];

  // Reset form when modal opens or editing project changes
  React.useEffect(() => {
    if (!isOpen) return; // Only update when modal is open
    
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        manager: editingProject.manager,
        description: editingProject.description || '',
        icon: editingProject.icon || 'Briefcase',
        color: editingProject.color || 'blue',
        targetLiveDate: editingProject.targetLiveDate || '',
        status: (editingProject.status || 'In Progress') as ProjectStatus,
      });
    } else {
      // Reset to empty form for new project
      setFormData({
        name: '',
        manager: defaultManager,
        description: '',
        icon: 'Briefcase',
        color: 'blue',
        targetLiveDate: '',
        status: 'In Progress' as ProjectStatus,
      });
    }
  }, [isOpen, editingProject, defaultManager]);

  const selectedIconData = projectIcons.find(i => i.name === formData.icon);
  const selectedColorData = colorThemes.find(c => c.name === formData.color);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.manager) return;

    const projectData: ProjectDefinition = {
      id: editingProject?.id || `p${Date.now()}`,
      name: formData.name.trim(),
      manager: formData.manager,
      description: formData.description?.trim() || '',
      icon: formData.icon,
      color: formData.color,
      targetLiveDate: formData.targetLiveDate || undefined,
      status: formData.status,
    };

    onSave(projectData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-gov-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {selectedIconData && selectedColorData && (
              <div className={`p-1.5 sm:p-2 rounded-lg ${selectedColorData.bg} ${selectedColorData.text} ring-2 ${selectedColorData.ring}`}>
                <selectedIconData.icon size={18} />
              </div>
            )}
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {editingProject ? 'Edit Project' : 'Buat Project Baru'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Nama Project</label>
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
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Project Manager (PIC)</label>
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
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                  placeholder="Deskripsi tujuan project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Target Live</label>
                  <input
                    type="date"
                    value={formData.targetLiveDate}
                    onChange={(e) => setFormData({...formData, targetLiveDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ProjectStatus})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm bg-white"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Live">Live</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column - Customization */}
            <div className="space-y-3 sm:space-y-4">
              {/* Icon Selection */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Pilih Icon Project</label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-h-32 sm:max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 sm:p-3 bg-slate-50">
                  {projectIcons.map((iconData) => {
                    const IconComponent = iconData.icon;
                    const isSelected = formData.icon === iconData.name;
                    return (
                      <button
                        key={iconData.name}
                        type="button"
                        onClick={() => setFormData({...formData, icon: iconData.name})}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? `${selectedColorData?.bg} ${selectedColorData?.text} border-current shadow-md` 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={iconData.label}
                      >
                        <IconComponent size={16} className="mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2">Pilih Warna Tema</label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {colorThemes.map((colorData) => {
                    const isSelected = formData.color === colorData.name;
                    return (
                      <button
                        key={colorData.name}
                        type="button"
                        onClick={() => setFormData({...formData, color: colorData.name})}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? `${colorData.bg} ${colorData.text} border-current shadow-md ring-2 ${colorData.ring}` 
                            : `${colorData.bg} ${colorData.text} border-transparent hover:border-current`
                        }`}
                        title={colorData.label}
                      >
                        <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-current mx-auto opacity-60"></div>
                        <span className="text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 block">{colorData.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview - Hidden on mobile to save space */}
              <div className="hidden sm:block border border-slate-200 rounded-lg p-4 bg-white">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Preview</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {selectedIconData && selectedColorData && (
                    <div className={`p-2 rounded-lg ${selectedColorData.bg} ${selectedColorData.text} ring-2 ${selectedColorData.ring}`}>
                      <selectedIconData.icon size={20} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-800">{formData.name || 'Nama Project'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500">{formData.manager || 'Manager'}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        formData.status === 'Live' 
                          ? 'bg-green-100 text-green-700'
                          : formData.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {formData.status}
                      </span>
                    </div>
                    {formData.targetLiveDate && (
                      <p className="text-xs text-slate-400 mt-1">Target: {formData.targetLiveDate}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100 safe-area-bottom">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.manager}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-sm font-bold text-white bg-gov-600 hover:bg-gov-700 flex items-center gap-1 sm:gap-2 shadow-md hover:shadow-lg transition-all ${(!formData.name.trim() || !formData.manager) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {selectedIconData && <selectedIconData.icon size={14} />}
              {editingProject ? 'Update' : 'Buat Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
