import React, { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { Meeting, User, MeetingType } from '../../types';
import SearchableSelect from './SearchableSelect';
import { exportMeetingsToExcel } from '../utils/exportKegiatanExcel';

interface ExportKegiatanModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: Meeting[];
  users: User[];
  defaultFilters?: {
    type?: MeetingType | 'all';
    status?: string | 'all';
    pic?: string | 'all';
    disposisi?: 'all' | 'with' | 'without';
  };
}

const ExportKegiatanModal: React.FC<ExportKegiatanModalProps> = ({
  isOpen,
  onClose,
  meetings,
  users,
  defaultFilters
}) => {
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Other filters
  const [filterType, setFilterType] = useState<MeetingType | 'all'>(defaultFilters?.type || 'all');
  const [filterStatus, setFilterStatus] = useState<string | 'all'>(defaultFilters?.status || 'all');
  const [filterPic, setFilterPic] = useState<string>(defaultFilters?.pic || 'all');
  const [filterDisposisi, setFilterDisposisi] = useState<'all' | 'with' | 'without'>(defaultFilters?.disposisi || 'all');

  const uniquePics = useMemo(() => {
    const picSet = new Set<string>();
    meetings.forEach(m => {
      (m.pic || []).forEach(p => picSet.add(p));
    });
    return Array.from(picSet)
      .map(picId => ({
        value: picId,
        label: users.find(u => u.id === picId)?.name ?? picId,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [meetings, users]);

  // Filter meetings logic
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      // Filter by Date Range
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) {
         // if it's a multi-day meeting, we check if start date is after end date limit
         // If m.date > endDate, it started after our end limit.
         return false;
      }

      // Filter by Type
      if (filterType !== 'all' && m.type !== filterType) return false;

      // Filter by Status
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;

      // Filter by PIC
      if (filterPic !== 'all' && !(m.pic || []).includes(filterPic)) return false;

      // Filter by Disposisi
      if (filterDisposisi === 'with' && !m.hasDisposisi) return false;
      if (filterDisposisi === 'without' && m.hasDisposisi) return false;

      return true;
    });
  }, [meetings, startDate, endDate, filterType, filterStatus, filterPic, filterDisposisi]);

  const handleExport = () => {
    exportMeetingsToExcel(filteredMeetings, users);
    onClose();
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterPic('all');
    setFilterDisposisi('all');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Export Jadwal Kegiatan</h2>
              <p className="text-sm text-slate-500">Download data kegiatan ke format Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Date Range Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              Rentang Tanggal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-gov-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                Filter Tambahan
              </h3>
              <button 
                onClick={handleReset}
                className="text-xs text-gov-600 hover:text-gov-700 font-medium"
              >
                Reset Filter
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Jenis Kegiatan</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Semua Jenis' },
                    { value: 'internal', label: 'Internal' },
                    { value: 'external', label: 'Eksternal' },
                    { value: 'audiensi', label: 'Audiensi' },
                    { value: 'bimtek', label: 'Bimtek' }
                  ]}
                  value={filterType}
                  onChange={(value) => setFilterType(value as MeetingType | 'all')}
                  placeholder="Pilih jenis..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'scheduled', label: 'Terjadwal' },
                    { value: 'ongoing', label: 'Berlangsung' },
                    { value: 'completed', label: 'Selesai' },
                    { value: 'cancelled', label: 'Dibatalkan' }
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  placeholder="Pilih status..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">PIC Kegiatan</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Semua PIC' },
                    ...uniquePics
                  ]}
                  value={filterPic}
                  onChange={setFilterPic}
                  placeholder="Cari PIC..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status Disposisi</label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Semua Disposisi' },
                    { value: 'with', label: 'Dengan Disposisi' },
                    { value: 'without', label: 'Tanpa Disposisi' }
                  ]}
                  value={filterDisposisi}
                  onChange={(val) => setFilterDisposisi(val as any)}
                  placeholder="Filter disposisi..."
                />
              </div>
            </div>
          </div>

          {/* Preview Note */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center">
            <span className="text-3xl font-bold text-gov-600">{filteredMeetings.length}</span>
            <p className="text-sm text-slate-500 mt-1">kegiatan akan diekspor berdasarkan filter saat ini</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={filteredMeetings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download size={16} />
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportKegiatanModal;
