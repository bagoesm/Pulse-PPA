// src/components/ShareProjectModal.tsx
import React, { useState } from 'react';
import { X, Globe, Copy, Check, RefreshCw, Trash2, Link2, Loader2 } from 'lucide-react';
import { ProjectDefinition } from '../../types';
import { supabase } from '../lib/supabaseClient';

interface ShareProjectModalProps {
  project: ProjectDefinition;
  onClose: () => void;
  onShareStateChanged: (updatedProject: ProjectDefinition) => void;
  showNotification: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  project,
  onClose,
  onShareStateChanged,
  showNotification
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Helper to format project name into a clean, URL-safe slug
  const formatSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove non-word chars (except spaces and hyphens)
      .replace(/[\s_]+/g, '-')   // replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '');  // trim leading/trailing hyphens
  };

  const [customSlug, setCustomSlug] = useState(() => {
    if (project.share_token) return project.share_token;
    return formatSlug(project.name);
  });

  const shareUrl = project.share_token
    ? `${window.location.origin}/${project.share_token}`
    : '';

  const handleSlugChange = (val: string) => {
    // Keep it alphanumeric, hyphens, and underscores only
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setCustomSlug(sanitized);
  };

  const handleEnableSharing = async () => {
    const slug = customSlug.trim();
    if (!slug) {
      showNotification('Input Tidak Valid', 'Slug tautan tidak boleh kosong.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ share_token: slug })
        .eq('id', project.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Tautan kustom ini sudah digunakan oleh project lain. Silakan gunakan nama lain.');
        }
        throw error;
      }

      if (data) {
        onShareStateChanged(data as ProjectDefinition);
        showNotification('Berbagi Aktif', 'Project sekarang dapat diakses oleh publik.', 'success');
      }
    } catch (error: any) {
      console.error('Error enabling share:', error);
      showNotification('Gagal Mengaktifkan', error.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ share_token: null })
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onShareStateChanged(data as ProjectDefinition);
        showNotification('Berbagi Dinonaktifkan', 'Akses publik ke project ini telah ditutup.', 'info');
      }
    } catch (error: any) {
      console.error('Error disabling share:', error);
      showNotification('Gagal Menonaktifkan', error.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSlug = async () => {
    const slug = customSlug.trim();
    if (!slug) {
      showNotification('Input Tidak Valid', 'Slug tautan tidak boleh kosong.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ share_token: slug })
        .eq('id', project.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Tautan kustom ini sudah digunakan oleh project lain. Silakan gunakan nama lain.');
        }
        throw error;
      }

      if (data) {
        onShareStateChanged(data as ProjectDefinition);
        showNotification('Tautan Diperbarui', 'Tautan berbagi project berhasil diperbarui.', 'success');
        setCopied(false);
      }
    } catch (error: any) {
      console.error('Error updating share token:', error);
      showNotification('Gagal Memperbarui', error.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Globe className="text-gov-600" size={20} />
            <h3 className="font-bold text-slate-800 text-lg">Bagikan Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Project</p>
            <p className="font-bold text-slate-800 text-base">{project.name}</p>
          </div>

          {project.share_token ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                  <Globe size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-900 text-sm">Tautan Publik Aktif</h4>
                  <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                    Siapa saja yang memiliki tautan ini dapat melihat project, Kanban board, dan detail tugas tanpa perlu login.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Tautan Berbagi Kustom
                </label>
                <div className="flex gap-1.5 items-center text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-2 py-2">
                  <span className="text-slate-400 select-none">{window.location.origin}/</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-mono text-slate-700 w-full"
                    placeholder="nama-project"
                  />
                  <Link2 className="text-slate-400 ml-1" size={14} />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {customSlug !== project.share_token ? (
                  <button
                    onClick={handleUpdateSlug}
                    disabled={isLoading || !customSlug.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg font-semibold text-xs hover:bg-gov-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <RefreshCw size={14} className="text-white" />
                    )}
                    <span>Simpan Perubahan Tautan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg font-semibold text-xs hover:bg-gov-700 transition-colors shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Tersalin ke Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Salin Tautan</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleDisableSharing}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 hover:border-red-300 text-red-700 rounded-lg font-semibold text-xs hover:bg-red-50/50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin text-red-500" />
                  ) : (
                    <Trash2 size={14} className="text-red-500" />
                  )}
                  <span>Nonaktifkan Akses Publik</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-slate-400 text-white rounded-lg">
                  <Globe size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Belum Dibagikan</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Project ini saat ini bersifat privat. Aktifkan fitur berbagi untuk mendapatkan tautan publik unik.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Tautan Berbagi Kustom
                </label>
                <div className="flex gap-1.5 items-center text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-2 py-2">
                  <span className="text-slate-400 select-none">{window.location.origin}/</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-mono text-slate-700 w-full"
                    placeholder="nama-project"
                  />
                  <Link2 className="text-slate-400 ml-1" size={14} />
                </div>
              </div>

              <button
                onClick={handleEnableSharing}
                disabled={isLoading || !customSlug.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Globe size={16} />
                )}
                <span>Aktifkan Tautan Berbagi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
