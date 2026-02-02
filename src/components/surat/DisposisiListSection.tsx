// src/components/surat/DisposisiListSection.tsx
// Extracted component for displaying Disposisi list in SuratViewModal
import React from 'react';
import { Users, Eye, Trash2, Calendar, FileText, Plus } from 'lucide-react';
import { Disposisi, User } from '../../../types';

interface DisposisiListSectionProps {
  disposisi: Disposisi[];
  users: User[];
  isEditing: boolean;
  onView: (disposisi: Disposisi) => void;
  onRemove: (disposisi: Disposisi) => void;
  onAddNew: () => void;
}

const DisposisiListSection: React.FC<DisposisiListSectionProps> = ({
  disposisi,
  users,
  isEditing,
  onView,
  onRemove,
  onAddNew,
}) => {
  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'Completed': 'bg-green-100 text-green-800 border-green-300',
      'Cancelled': 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-300';
  };

  if (disposisi.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 border border-purple-200">
        <p className="text-sm text-slate-500 text-center mb-3">Belum ada disposisi untuk link ini</p>
        {isEditing && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Tambah Disposisi
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-600" />
          <h5 className="text-sm font-bold text-purple-900">
            Disposisi Assignments ({disposisi.length})
          </h5>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
          >
            <Plus size={14} />
            Tambah Disposisi
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {disposisi.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {getUserName(d.assignedTo)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(d.status)}`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {d.disposisiText}
                </p>
              </div>
              <div className="ml-3 flex gap-2 shrink-0">
                <button
                  onClick={() => onView(d)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                  title="View Disposisi"
                >
                  <Eye size={14} />
                  View
                </button>
                {!isEditing && (
                  <button
                    onClick={() => onRemove(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                    title="Remove Assignee"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>
            
            {d.deadline && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Calendar size={12} />
                <span>
                  Deadline: {new Date(d.deadline).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            )}
            
            {d.laporan && d.laporan.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                <FileText size={12} />
                <span>{d.laporan.length} laporan uploaded</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisposisiListSection;
