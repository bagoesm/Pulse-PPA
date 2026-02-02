// src/components/surat/LinkedKegiatanCard.tsx
// Extracted component for displaying linked Kegiatan in SuratViewModal
import React from 'react';
import { Calendar, Building2, Eye } from 'lucide-react';
import { Meeting } from '../../../types';

interface LinkedKegiatanCardProps {
  kegiatan: Meeting;
  onClick: () => void;
}

const LinkedKegiatanCard: React.FC<LinkedKegiatanCardProps> = ({ kegiatan, onClick }) => {
  const getMeetingTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'internal': 'Internal',
      'external': 'Eksternal',
      'bimtek': 'Bimtek',
      'audiensi': 'Audiensi',
    };
    return labels[type] || type;
  };

  const getMeetingTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'internal': 'bg-blue-100 text-blue-700',
      'external': 'bg-green-100 text-green-700',
      'bimtek': 'bg-orange-100 text-orange-700',
      'audiensi': 'bg-purple-100 text-purple-700',
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Kegiatan Terkait</p>
          <h5 className="text-base font-bold text-slate-800">{kegiatan.title}</h5>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getMeetingTypeColor(kegiatan.type)}`}>
            {getMeetingTypeLabel(kegiatan.type)}
          </span>
          <Eye size={16} className="text-purple-600" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={14} className="text-purple-600" />
          <span>
            {new Date(kegiatan.date).toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Building2 size={14} className="text-purple-600" />
          <span>{kegiatan.location}</span>
        </div>
      </div>
      
      {kegiatan.pic && kegiatan.pic.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">PIC</p>
          <div className="flex flex-wrap gap-1.5">
            {kegiatan.pic.map((picName, idx) => (
              <span key={idx} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                {picName}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
          <Eye size={12} />
          Klik untuk melihat detail kegiatan
        </p>
      </div>
    </button>
  );
};

export default LinkedKegiatanCard;
