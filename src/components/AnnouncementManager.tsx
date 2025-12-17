import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, User } from 'lucide-react';
import { Announcement } from '../../types';
import AnnouncementBanner from './AnnouncementBanner';

interface AnnouncementManagerProps {
  announcements: Announcement[];
  onCreateAnnouncement: () => void;
  onEditAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  currentUser: { name: string; role: string } | null;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({
  announcements,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onToggleActive,
  currentUser
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  const now = useMemo(() => new Date(), []);
  
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(announcement => {
      const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < now;
      
      switch (filter) {
        case 'active':
          return announcement.isActive && !isExpired;
        case 'inactive':
          return !announcement.isActive;
        case 'expired':
          return isExpired;
        default:
          return true;
      }
    });
  }, [announcements, filter, now]);

  const getStatusBadge = useMemo(() => (announcement: Announcement) => {
    const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < now;
    
    if (isExpired) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Kedaluwarsa</span>;
    }
    
    if (announcement.isActive) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Aktif</span>;
    }
    
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">Nonaktif</span>;
  }, [now]);

  const canEdit = useMemo(() => (announcement: Announcement) => {
    return currentUser?.role === 'Super Admin' || announcement.createdBy === currentUser?.name;
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kelola Pengumuman</h2>
          <p className="text-slate-600">Buat dan kelola pengumuman untuk semua pengguna</p>
        </div>
        
        {/* Tombol Buat Pengumuman - Hanya untuk Super Admin */}
        {currentUser?.role === 'Super Admin' && (
          <button
            onClick={onCreateAnnouncement}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            Buat Pengumuman
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Semua', count: announcements.length },
          { key: 'active', label: 'Aktif', count: announcements.filter(a => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > now)).length },
          { key: 'inactive', label: 'Nonaktif', count: announcements.filter(a => !a.isActive).length },
          { key: 'expired', label: 'Kedaluwarsa', count: announcements.filter(a => a.expiresAt && new Date(a.expiresAt) < now).length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === key
                ? 'bg-gov-100 text-gov-700 border border-gov-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              filter === key ? 'bg-gov-200 text-gov-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="text-slate-400 mb-4">
              <Calendar size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              {filter === 'all' ? 'Belum ada pengumuman' : `Tidak ada pengumuman ${
                filter === 'active' ? 'aktif' : 
                filter === 'inactive' ? 'nonaktif' : 'kedaluwarsa'
              }`}
            </h3>
            <p className="text-slate-500 mb-4">
              {filter === 'all' ? 'Buat pengumuman pertama untuk tim Anda' : 'Coba ubah filter untuk melihat pengumuman lain'}
            </p>
            {filter === 'all' && currentUser?.role === 'Super Admin' && (
              <button
                onClick={onCreateAnnouncement}
                className="px-6 py-2.5 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors"
              >
                Buat Pengumuman Pertama
              </button>
            )}
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < now;
            
            return (
              <div key={announcement.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Management Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(announcement)}
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                          {announcement.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{announcement.createdBy}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(announcement.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                        {announcement.expiresAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Berlaku hingga: {new Date(announcement.expiresAt).toLocaleDateString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Toggle Active */}
                      {!isExpired && (
                        <button
                          onClick={() => onToggleActive(announcement.id, !announcement.isActive)}
                          className={`p-2 rounded-lg transition-colors ${
                            announcement.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={announcement.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {announcement.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      )}

                      {/* Edit */}
                      {canEdit(announcement) && (
                        <button
                          onClick={() => onEditAnnouncement(announcement)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit pengumuman"
                        >
                          <Edit size={18} />
                        </button>
                      )}

                      {/* Delete */}
                      {canEdit(announcement) && (
                        <button
                          onClick={() => {
                            if (confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) {
                              onDeleteAnnouncement(announcement.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus pengumuman"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-6">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Preview:</h4>
                  </div>
                  <AnnouncementBanner
                    announcement={announcement}
                    canDismiss={false}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AnnouncementManager;