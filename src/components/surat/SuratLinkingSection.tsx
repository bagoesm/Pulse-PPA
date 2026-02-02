// src/components/surat/SuratLinkingSection.tsx
// Extracted component for linking Surat to Kegiatan
import React, { useState, useEffect } from 'react';
import { Link2, Search, Calendar, Building2 } from 'lucide-react';
import { Meeting } from '../../../types';
import { supabase } from '../../lib/supabaseClient';
import { mappers } from '../../utils/mappers';

interface SuratLinkingSectionProps {
  suratId: string;
  onLink: (kegiatanId: string) => Promise<void>;
  onCancel: () => void;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const SuratLinkingSection: React.FC<SuratLinkingSectionProps> = ({
  suratId,
  onLink,
  onCancel,
  showNotification,
}) => {
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [meetingSearch, setMeetingSearch] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableMeetings();
  }, []);

  const fetchAvailableMeetings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedMeetings = mappers.meetingList(data);
        setAvailableMeetings(mappedMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      showNotification('Gagal Memuat Kegiatan', 'Tidak dapat memuat daftar kegiatan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedMeetingId) {
      showNotification('Pilih Kegiatan', 'Mohon pilih kegiatan yang akan di-link', 'warning');
      return;
    }

    setIsLinking(true);
    try {
      await onLink(selectedMeetingId);
    } finally {
      setIsLinking(false);
    }
  };

  const filteredMeetings = availableMeetings.filter(meeting => 
    meeting.title.toLowerCase().includes(meetingSearch.toLowerCase()) ||
    meeting.location.toLowerCase().includes(meetingSearch.toLowerCase()) ||
    new Date(meeting.date).toLocaleDateString('id-ID').includes(meetingSearch)
  );

  return (
    <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Pilih Kegiatan
        </label>
        
        {/* Search Input */}
        <div className="relative mb-2">
          <input
            type="text"
            value={meetingSearch}
            onChange={(e) => setMeetingSearch(e.target.value)}
            placeholder="Cari kegiatan..."
            className="w-full px-3 py-2.5 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Meetings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-slate-300 rounded-lg">
            {filteredMeetings.map(meeting => (
              <button
                key={meeting.id}
                type="button"
                onClick={() => setSelectedMeetingId(meeting.id)}
                className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-200 last:border-b-0 ${
                  selectedMeetingId === meeting.id ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{meeting.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(meeting.date).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {meeting.location}
                      </span>
                    </div>
                  </div>
                  {selectedMeetingId === meeting.id && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
            {filteredMeetings.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                Tidak ada kegiatan ditemukan
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-slate-500 mt-1.5">
          Pilih kegiatan yang terkait dengan surat ini
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleLink}
          disabled={isLinking || !selectedMeetingId}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLinking ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Menghubungkan...
            </>
          ) : (
            <>
              <Link2 size={16} />
              Link ke Kegiatan
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SuratLinkingSection;
