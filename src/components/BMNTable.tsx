// src/components/BMNTable.tsx
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package
} from 'lucide-react';
import { BMNItem } from '../../types';

interface BMNTableProps {
  items: BMNItem[];
  isLoading: boolean;
  onRowClick: (item: BMNItem) => void;
}

type SortColumn = 'namaBarang' | 'kodeBarang' | 'jenisBMN' | 'statusBMN' | 'kondisi' | 'nilaiPerolehan';
type SortDirection = 'asc' | 'desc';

const BMNTable: React.FC<BMNTableProps> = ({ items, isLoading, onRowClick }) => {
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Sort states
  const [sortColumn, setSortColumn] = useState<SortColumn>('namaBarang');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Format currency with Indonesian thousand separators
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aktif':
        return 'bg-green-100 text-green-700';
      case 'Tidak Aktif':
        return 'bg-slate-100 text-slate-700';
      case 'Hilang':
        return 'bg-red-100 text-red-700';
      case 'Rusak':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Get kondisi color
  const getKondisiColor = (kondisi: string | undefined) => {
    if (!kondisi) return 'bg-slate-100 text-slate-500';
    switch (kondisi) {
      case 'Baik':
        return 'bg-green-100 text-green-700';
      case 'Rusak Ringan':
        return 'bg-yellow-100 text-yellow-700';
      case 'Rusak Berat':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Handle sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-gov-600" />
      : <ArrowDown size={14} className="text-gov-600" />;
  };

  // Apply sorting
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortColumn) {
        case 'namaBarang':
          compareA = a.namaBarang.toLowerCase();
          compareB = b.namaBarang.toLowerCase();
          break;
        case 'kodeBarang':
          compareA = a.kodeBarang.toLowerCase();
          compareB = b.kodeBarang.toLowerCase();
          break;
        case 'jenisBMN':
          compareA = (a.jenisBMN || '').toLowerCase();
          compareB = (b.jenisBMN || '').toLowerCase();
          break;
        case 'statusBMN':
          compareA = a.statusBMN;
          compareB = b.statusBMN;
          break;
        case 'kondisi':
          compareA = (a.kondisi || '').toLowerCase();
          compareB = (b.kondisi || '').toLowerCase();
          break;
        case 'nilaiPerolehan':
          compareA = a.nilaiPerolehan || 0;
          compareB = b.nilaiPerolehan || 0;
          break;
        default:
          compareA = 0;
          compareB = 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Reset to page 1 when items change
  useMemo(() => {
    setCurrentPage(1);
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 text-left min-w-[80px]">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    No
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[250px]">
                  <button
                    onClick={() => handleSort('namaBarang')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Nama Barang
                    {getSortIcon('namaBarang')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[150px]">
                  <button
                    onClick={() => handleSort('kodeBarang')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Kode Barang
                    {getSortIcon('kodeBarang')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[180px]">
                  <button
                    onClick={() => handleSort('jenisBMN')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Jenis BMN
                    {getSortIcon('jenisBMN')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('statusBMN')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Status BMN
                    {getSortIcon('statusBMN')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('kondisi')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors"
                  >
                    Kondisi
                    {getSortIcon('kondisi')}
                  </button>
                </th>
                <th className="px-4 py-3.5 text-right min-w-[180px]">
                  <button
                    onClick={() => handleSort('nilaiPerolehan')}
                    className="flex items-center justify-end gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider hover:text-gov-600 transition-colors w-full"
                  >
                    Nilai Perolehan
                    {getSortIcon('nilaiPerolehan')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gov-600"></div>
                      <span className="text-sm text-slate-600">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package size={56} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-base font-medium text-slate-600 mb-1">Tidak ada data</p>
                    <p className="text-sm text-slate-400">Belum ada data BMN yang tersedia</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => onRowClick(item)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {/* No */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600 font-medium">
                        {startIndex + index + 1}
                      </span>
                    </td>

                    {/* Nama Barang */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.namaBarang}
                        </span>
                        {item.merk && (
                          <span className="text-xs text-slate-500">
                            {item.merk} {item.tipe && `- ${item.tipe}`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kode Barang */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                        {item.kodeBarang}
                      </span>
                    </td>

                    {/* Jenis BMN */}
                    <td className="px-4 py-4">
                      {item.jenisBMN ? (
                        <span className="text-sm text-slate-700">
                          {item.jenisBMN}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">-</span>
                      )}
                    </td>

                    {/* Status BMN */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusColor(item.statusBMN)}`}>
                        {item.statusBMN}
                      </span>
                    </td>

                    {/* Kondisi */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${getKondisiColor(item.kondisi)}`}>
                        {item.kondisi || '-'}
                      </span>
                    </td>

                    {/* Nilai Perolehan */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(item.nilaiPerolehan)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {sortedItems.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Items info */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                Menampilkan <span className="font-semibold">{startIndex + 1}-{Math.min(endIndex, sortedItems.length)}</span> dari <span className="font-semibold">{sortedItems.length}</span> item
              </span>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                Halaman <span className="font-semibold">{currentPage}</span> dari <span className="font-semibold">{totalPages}</span>
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
          </div>
        </div>
      )}

      {/* Mobile Card View - Hidden on desktop, shown on mobile */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gov-600"></div>
              <span className="text-sm text-slate-600">Memuat data...</span>
            </div>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <Package size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-base font-medium text-slate-600 mb-1">Tidak ada data</p>
            <p className="text-sm text-slate-400">Belum ada data BMN yang tersedia</p>
          </div>
        ) : (
          paginatedItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => onRowClick(item)}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-500">
                      #{startIndex + index + 1}
                    </span>
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {item.kodeBarang}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {item.namaBarang}
                  </h4>
                  {item.merk && (
                    <p className="text-xs text-slate-500">
                      {item.merk} {item.tipe && `- ${item.tipe}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {/* Jenis BMN */}
                {item.jenisBMN && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Jenis BMN:</span>
                    <span className="text-slate-700 font-medium">{item.jenisBMN}</span>
                  </div>
                )}

                {/* Status & Kondisi */}
                <div className="flex items-center gap-2">
                  <span className={`flex-1 text-center text-xs font-semibold px-2 py-1.5 rounded-full ${getStatusColor(item.statusBMN)}`}>
                    {item.statusBMN}
                  </span>
                  <span className={`flex-1 text-center text-xs font-semibold px-2 py-1.5 rounded-full ${getKondisiColor(item.kondisi)}`}>
                    {item.kondisi || '-'}
                  </span>
                </div>

                {/* Nilai Perolehan */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Nilai Perolehan:</span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatCurrency(item.nilaiPerolehan)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {sortedItems.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm text-slate-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Berikutnya
                </button>
              </div>
              <span className="text-xs text-slate-500">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, sortedItems.length)} dari {sortedItems.length} item
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BMNTable;
