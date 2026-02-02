// src/components/DisposisiListView.tsx
import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, User as UserIcon, Search, X,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, Trash2
} from 'lucide-react';
import { Disposisi, User } from '../../types';
import { useDisposisi } from '../contexts/DisposisiContext';
import { useUsers } from '../contexts/UsersContext';
import { useSurats } from '../contexts/SuratsContext';
import { useMeetings } from '../contexts/MeetingsContext';
import DisposisiModal from './DisposisiModal';
import SearchableSelect from './SearchableSelect';

interface DisposisiListViewProps {
  currentUser: User | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const DisposisiListView: React.FC<DisposisiListViewProps> = ({ currentUser, showNotification }) => {
  const { disposisi, isLoading, deleteDisposisi, updateDisposisi, fetchDisposisi } = useDisposisi();
  const { allUsers } = useUsers();
  const { surats } = useSurats();
  const { meetings } = useMeetings();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'>('All');
  const [filterAssignedUser, setFilterAssignedUser] = useState<string>('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sort states
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'status' | 'deadline' | 'assignedTo'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedDisposisi, setSelectedDisposisi] = useState<Disposisi | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Helper function to get user name by ID
  const getUserName = (userId: string): string => {
    const user = allUsers.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  // Helper function to get surat number by ID
  const getSuratNumber = (suratId: string): string => {
    const surat = surats.find(s => s.id === suratId);
    return surat?.nomorSurat || '-';
  };

  // Helper function to get kegiatan title by ID
  const getKegiatanTitle = (kegiatanId: string): string => {
    const kegiatan = meetings.find(m => m.id === kegiatanId);
    return kegiatan?.title || '-';
  };

  // Apply filters and search
  const filteredDisposisi = useMemo(() => {
    const filtered = disposisi.filter(d => {
      // Search filter - multi-field search
      const searchLower = searchQuery.toLowerCase();
      const suratNumber = getSuratNumber(d.suratId).toLowerCase();
      const kegiatanTitle = getKegiatanTitle(d.kegiatanId).toLowerCase();
      const disposisiText = d.disposisiText.toLowerCase();
      
      const matchesSearch = !searchQuery || 
        suratNumber.includes(searchLower) ||
        kegiatanTitle.includes(searchLower) ||
        disposisiText.includes(searchLower);

      // Status filter
      const matchesStatus = filterStatus === 'All' || d.status === filterStatus;

      // Assigned user filter
      const matchesAssignedUser = filterAssignedUser === 'All' || d.assignedTo === filterAssignedUser;

      // Date range filter (based on createdAt)
      let matchesDateRange = true;
      if (filterStartDate || filterEndDate) {
        const disposisiDate = new Date(d.createdAt);
        if (filterStartDate) {
          const startDate = new Date(filterStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (disposisiDate < startDate) matchesDateRange = false;
        }
        if (filterEndDate) {
          const endDate = new Date(filterEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (disposisiDate > endDate) matchesDateRange = false;
        }
      }

      return matchesSearch && matchesStatus && matchesAssignedUser && matchesDateRange;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortColumn) {
        case 'createdAt':
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        case 'status':
          compareA = a.status;
          compareB = b.status;
          break;
        case 'deadline':
          compareA = a.deadline ? new Date(a.deadline).getTime() : 0;
          compareB = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case 'assignedTo':
          compareA = getUserName(a.assignedTo).toLowerCase();
          compareB = getUserName(b.assignedTo).toLowerCase();
          break;
        default:
          compareA = 0;
          compareB = 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [disposisi, searchQuery, filterStatus, filterAssignedUser, filterStartDate, filterEndDate, sortColumn, sortDirection, surats, meetings, allUsers]);

  // Pagination logic
  const totalPages = Math.ceil(filteredDisposisi.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDisposisi = filteredDisposisi.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterAssignedUser, filterStartDate, filterEndDate]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: typeof sortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-gov-600" />
      : <ArrowDown size={14} className="text-gov-600" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const clearDateFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleRemoveAssignee = async (disposisi: Disposisi) => {
    const assigneeName = getUserName(disposisi.assignedTo);
    
    if (!window.confirm(
      `Apakah Anda yakin ingin menghapus disposisi untuk ${assigneeName}?\n\n` +
      `Disposisi untuk assignee lain akan tetap dipertahankan.\n\n` +
      `Tindakan ini tidak dapat dibatalkan.`
    )) {
      return;
    }

    try {
      await deleteDisposisi(disposisi.id);
      showNotification(
        'Assignee Dihapus',
        `Disposisi untuk ${assigneeName} berhasil dihapus`,
        'success'
      );
    } catch (error: any) {
      showNotification('Gagal Menghapus Assignee', error.message, 'error');
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Daftar Disposisi</h2>
          <p className="text-sm text-slate-500 mt-1">
            Menampilkan {filteredDisposisi.length} dari {disposisi.length} disposisi
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Disposisi dibuat dari Surat yang di-link ke Kegiatan
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 xl:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cari Disposisi</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nomor surat, judul kegiatan, disposisi..."
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
            <SearchableSelect
              options={[
                { value: 'All', label: '📋 Semua Status' },
                { value: 'Pending', label: '⏳ Pending' },
                { value: 'In Progress', label: '🔄 In Progress' },
                { value: 'Completed', label: '✅ Completed' },
                { value: 'Cancelled', label: '❌ Cancelled' }
              ]}
              value={filterStatus === 'All' ? '' : filterStatus}
              onChange={(value) => setFilterStatus((value || 'All') as any)}
              placeholder="Cari status..."
              emptyOption="📋 Semua Status"
            />
          </div>

          {/* Assigned User Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Ditugaskan Ke</label>
            <SearchableSelect
              options={allUsers.map(user => ({ value: user.id, label: user.name }))}
              value={filterAssignedUser === 'All' ? '' : filterAssignedUser}
              onChange={(value) => setFilterAssignedUser(value || 'All')}
              placeholder="Cari user..."
              emptyOption="Semua User"
            />
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Dari Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={clearDateFilters}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  title="Hapus filter tanggal"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 text-left min-w-[150px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nomor Surat
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[200px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Judul Kegiatan
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Dari
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ke
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[250px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Disposisi
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Status
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('deadline')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Deadline
                    {getSortIcon('deadline')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Dibuat
                    {getSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gov-600"></div>
                      <span className="text-sm text-slate-600">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedDisposisi.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <FileText size={56} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-base font-medium text-slate-600 mb-1">Tidak ada disposisi ditemukan</p>
                    <p className="text-sm text-slate-400">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : (
                paginatedDisposisi.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-slate-800">
                        {getSuratNumber(d.suratId)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">
                        {getKegiatanTitle(d.kegiatanId)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">
                        {getUserName(d.createdBy)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">
                        {getUserName(d.assignedTo)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span 
                        className="text-sm text-slate-700 block truncate max-w-xs cursor-help" 
                        title={d.disposisiText}
                      >
                        {d.disposisiText}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {d.deadline ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {new Date(d.deadline).toLocaleDateString('id-ID', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-700">
                        {new Date(d.createdAt).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDisposisi(d);
                            setShowViewModal(true);
                          }}
                          className="p-2 hover:bg-gov-50 rounded-lg text-gov-600 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveAssignee(d)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          title="Hapus Assignee"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredDisposisi.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 font-medium">Tampilkan:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-600">
                dari {filteredDisposisi.length} disposisi
              </span>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Showing range */}
            <div className="text-sm text-slate-600">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredDisposisi.length)} disposisi
            </div>
          </div>
        </div>
      )}

      {/* View Disposisi Modal */}
      {showViewModal && selectedDisposisi && (
        <DisposisiModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedDisposisi(null);
          }}
          onSave={async (data) => {
            try {
              // Update disposisi using context
              await updateDisposisi(selectedDisposisi.id, data);
              
              // Refresh disposisi list
              await fetchDisposisi();
              
              showNotification('Disposisi Diperbarui', 'Disposisi berhasil diperbarui', 'success');
              setShowViewModal(false);
              setSelectedDisposisi(null);
            } catch (error: any) {
              showNotification('Gagal Memperbarui', error.message || 'Terjadi kesalahan saat memperbarui disposisi', 'error');
            }
          }}
          initialData={selectedDisposisi}
          suratId={selectedDisposisi.suratId}
          kegiatanId={selectedDisposisi.kegiatanId}
          currentUser={currentUser}
          users={allUsers}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

export default DisposisiListView;
