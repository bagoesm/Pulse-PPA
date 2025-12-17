import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Megaphone, Palette, Calendar, Type, MessageSquare } from 'lucide-react';
import { Announcement, AnnouncementType } from '../../types';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingAnnouncement?: Announcement | null;
  currentUser: { name: string } | null;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAnnouncement,
  currentUser
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'info' as AnnouncementType,
    emoji: '',
    backgroundColor: '',
    textColor: '',
    isActive: true,
    expiresAt: ''
  });



  // Predefined color schemes
  const colorSchemes = [
    { name: 'Default Info', bg: '', text: '', type: 'info' },
    { name: 'Ocean Blue', bg: '#1e40af', text: '#ffffff', type: 'info' },
    { name: 'Forest Green', bg: '#059669', text: '#ffffff', type: 'success' },
    { name: 'Sunset Orange', bg: '#ea580c', text: '#ffffff', type: 'warning' },
    { name: 'Royal Purple', bg: '#7c3aed', text: '#ffffff', type: 'info' },
    { name: 'Rose Pink', bg: '#e11d48', text: '#ffffff', type: 'urgent' },
    { name: 'Emerald', bg: '#10b981', text: '#ffffff', type: 'success' },
    { name: 'Amber', bg: '#f59e0b', text: '#000000', type: 'warning' },
    { name: 'Slate Dark', bg: '#334155', text: '#ffffff', type: 'info' },
  ];

  // Popular emojis for announcements
  const popularEmojis = useMemo(() => [
    '📢', '🎉', '🚀', '⚠️', '✅', '🔥', '💡', '📝', 
    '🎯', '⭐', '🏆', '🎊', '📊', '🔔', '💼', '🌟'
  ], []);

  useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title,
        description: editingAnnouncement.description,
        type: editingAnnouncement.type,
        emoji: editingAnnouncement.emoji || '',
        backgroundColor: editingAnnouncement.backgroundColor || '',
        textColor: editingAnnouncement.textColor || '',
        isActive: editingAnnouncement.isActive,
        expiresAt: editingAnnouncement.expiresAt ? 
          new Date(editingAnnouncement.expiresAt).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'info',
        emoji: '📢',
        backgroundColor: '',
        textColor: '',
        isActive: true,
        expiresAt: ''
      });
    }
  }, [editingAnnouncement, isOpen]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Judul dan deskripsi wajib diisi!');
      return;
    }

    const announcementData = {
      ...formData,
      createdBy: currentUser?.name || 'Admin',
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined
    };

    onSave(announcementData);
    onClose();
  }, [formData, currentUser, onSave, onClose]);

  const applyColorScheme = useCallback((scheme: typeof colorSchemes[0]) => {
    setFormData(prev => ({
      ...prev,
      backgroundColor: scheme.bg,
      textColor: scheme.text,
      type: scheme.type as AnnouncementType
    }));
  }, []);

  const previewStyle = useMemo(() => {
    if (formData.backgroundColor || formData.textColor) {
      return {
        backgroundColor: formData.backgroundColor || '#f8fafc',
        color: formData.textColor || '#1e293b',
        borderColor: formData.backgroundColor ? `${formData.backgroundColor}40` : '#e2e8f0'
      };
    }
    
    const typeColors = {
      info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
      success: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
      warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
      urgent: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
    };
    
    const colors = typeColors[formData.type];
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border
    };
  }, [formData.backgroundColor, formData.textColor, formData.type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-gov-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gov-100 text-gov-600 rounded-lg">
                <Megaphone size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingAnnouncement ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                </h2>
                <p className="text-sm text-slate-600">
                  Pengumuman akan muncul di bagian atas dashboard untuk semua pengguna
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex max-h-[calc(90vh-80px)]">
          {/* Form Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Type size={16} />
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none"
                  placeholder="Masukkan judul pengumuman..."
                  maxLength={100}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.title.length}/100 karakter</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none resize-none"
                  rows={4}
                  placeholder="Masukkan deskripsi pengumuman..."
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.description.length}/500 karakter</p>
              </div>

              {/* Type and Emoji */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipe Pengumuman
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AnnouncementType }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="success">Sukses</option>
                    <option value="warning">Peringatan</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emoji (Opsional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.emoji}
                      onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none text-center"
                      placeholder="😊"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {popularEmojis.slice(0, 8).map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                        className="p-2 hover:bg-slate-100 rounded text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Customization */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Palette size={16} />
                  Kustomisasi Warna
                </label>
                
                {/* Predefined Color Schemes */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {colorSchemes.map((scheme, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applyColorScheme(scheme)}
                      className="p-3 rounded-lg border-2 hover:border-gov-300 transition-colors text-xs font-medium"
                      style={{
                        backgroundColor: scheme.bg || '#f8fafc',
                        color: scheme.text || '#1e293b',
                        borderColor: formData.backgroundColor === scheme.bg && formData.textColor === scheme.text ? 
                          '#3b82f6' : '#e2e8f0'
                      }}
                    >
                      {scheme.name}
                    </button>
                  ))}
                </div>

                {/* Custom Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Warna Latar Belakang
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.backgroundColor || '#ffffff'}
                        onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-12 h-10 border border-slate-200 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Warna Teks
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.textColor || '#000000'}
                        onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                        className="w-12 h-10 border border-slate-200 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.textColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Tanggal Kedaluwarsa (Opsional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Kosongkan jika pengumuman tidak memiliki batas waktu
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-gov-600 border-slate-300 rounded focus:ring-gov-400"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Aktifkan pengumuman sekarang
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gov-600 text-white rounded-lg hover:bg-gov-700 font-medium transition-colors"
                >
                  {editingAnnouncement ? 'Update Pengumuman' : 'Buat Pengumuman'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="w-80 bg-slate-50 p-6 border-l border-slate-200 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Megaphone size={16} />
              Preview
            </h3>
            
            {/* Preview Banner */}
            <div 
              className="rounded-xl p-4 border-2 relative overflow-hidden"
              style={previewStyle}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center gap-2">
                  {formData.emoji && (
                    <span className="text-xl">{formData.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold mb-2">
                    {formData.title || 'Judul Pengumuman'}
                  </h4>
                  <p className="text-sm opacity-90 leading-relaxed">
                    {formData.description || 'Deskripsi pengumuman akan muncul di sini...'}
                  </p>
                  <div className="mt-2 text-xs opacity-70">
                    <span>Dibuat oleh: {currentUser?.name || 'Admin'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p>• Pengumuman akan muncul di bagian atas dashboard</p>
              <p>• Semua pengguna dapat melihat pengumuman aktif</p>
              <p>• Admin dapat mengedit atau menonaktifkan kapan saja</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;