// src/components/BMNDashboard.tsx
// Main dashboard view for BMN (Barang Milik Negara) inventory management
// Validates: Requirements 2.1, 2.9, 2.10, 2.11, 3.1, 12.2, 14.1

import React, { useMemo, useState, useEffect } from 'react';
import { Upload, Calendar, User as UserIcon, AlertCircle, Building2 } from 'lucide-react';
import BMNStatsCards from './BMNStatsCards';
import BMNCharts from './BMNCharts';
import { useBMN } from '../contexts/BMNContext';
import { useAuth } from '../contexts/AuthContext';
import { useBMNHandlers } from '../hooks/useBMNHandlers';
import SearchableSelect from './SearchableSelect';
import { supabase } from '../lib/supabaseClient';

interface BMNDashboardProps {
  onOpenUploadModal?: () => void;
}

/**
 * Format date in Indonesian format (DD/MM/YYYY HH:mm)
 * Validates: Requirements 2.10
 */
const formatIndonesianDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const BMNDashboard: React.FC<BMNDashboardProps> = ({ onOpenUploadModal }) => {
  const { bmnItems, uploadHistory, isLoading, error } = useBMN();
  const { currentUser } = useAuth();

  // Satker filter state - initialize directly with user's satker
  const [selectedSatker, setSelectedSatker] = useState<string>(() => {
    return currentUser?.divisi || 'All';
  });

  const [hasUploadPermission, setHasUploadPermission] = useState(false);

  // Satker list from master_divisi table
  const [availableSatkers, setAvailableSatkers] = useState<Array<{ value: string; label: string }>>([]);

  // Fetch satker list from master_divisi on mount
  useEffect(() => {
    const fetchSatkers = async () => {
      try {
        const { data, error } = await supabase
          .from('master_divisi')
          .select('name')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching satkers:', error);
          return;
        }

        if (data) {
          const satkerOptions = data.map(item => ({
            value: item.name,
            label: item.name
          }));
          setAvailableSatkers(satkerOptions);
        }
      } catch (err) {
        console.error('Error fetching satkers:', err);
      }
    };

    fetchSatkers();
  }, []);

  // Filter BMN items by selected satker (case-insensitive, strip quotes)
  const filteredBmnItems = useMemo(() => {
    if (selectedSatker === 'All') {
      return bmnItems;
    }
    
    // Normalize satker name: strip quotes and convert to lowercase
    const normalizeSatkerName = (name: string | undefined): string => {
      if (!name) return '';
      // Remove leading/trailing quotes and whitespace, then lowercase
      return name.replace(/^["']|["']$/g, '').trim().toLowerCase();
    };
    
    const selectedSatkerNormalized = normalizeSatkerName(selectedSatker);
    return bmnItems.filter(item => 
      normalizeSatkerName(item.namaSatker) === selectedSatkerNormalized
    );
  }, [bmnItems, selectedSatker]);

  // Check if viewing single satker (for different chart display)
  const isSingleSatkerView = selectedSatker !== 'All';

  // Simple notification handler (can be replaced with actual notification system)
  const showNotification = (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`[${type?.toUpperCase()}] ${title}: ${message}`);
    // TODO: Integrate with actual notification system
  };

  // Get handlers
  const { canUploadBMN, handleUploadFile } = useBMNHandlers({
    currentUser,
    bmnItems,
    setBmnItems: () => {}, // Not needed for dashboard
    showNotification,
    fetchBMNItems: async () => {},
    fetchUploadHistory: async () => {}
  });

  useEffect(() => {
    const checkPermission = async () => {
      const allowed = await canUploadBMN(selectedSatker);
      setHasUploadPermission(allowed);
    };
    checkPermission();
  }, [selectedSatker, currentUser, canUploadBMN]);

  // Get last upload info
  const lastUpload = useMemo(() => {
    if (!uploadHistory || uploadHistory.length === 0) return null;
    
    // Sort by uploadedAt descending and get the first one
    const sorted = [...uploadHistory].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    return sorted[0];
  }, [uploadHistory]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
              Dashboard Inventori BMN
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              Monitoring dan analisis data Barang Milik Negara
            </p>
          </div>

          {/* Upload Button - Only for logged-in users */}
          {hasUploadPermission && onOpenUploadModal && (
            <div>
              <button
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors shadow-sm"
              >
                <Upload size={18} />
                <span>Upload Data BMN</span>
              </button>
            </div>
          )}
        </div>

        {/* Satker Filter */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 size={18} className="text-slate-500" />
              <span className="font-medium text-sm">Filter Satker:</span>
            </div>
            <div className="flex-1 max-w-md">
              <SearchableSelect
                options={availableSatkers}
                value={selectedSatker === 'All' ? '' : selectedSatker}
                onChange={(value) => setSelectedSatker(value || 'All')}
                placeholder="Pilih satker..."
                emptyOption="Semua Satker"
              />
            </div>
            {selectedSatker !== 'All' && (
              <div className="text-sm text-slate-600">
                Menampilkan data untuk: <span className="font-semibold text-gov-600">{selectedSatker}</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Upload Info */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          {lastUpload ? (
            <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={16} className="text-slate-400" />
                <span className="font-medium">Terakhir diupload:</span>
                <span className="text-slate-800 font-semibold">
                  {formatIndonesianDate(lastUpload.uploadedAt)}
                </span>
              </div>
              
              <div className="hidden md:block w-px h-4 bg-slate-300"></div>
              
              <div className="flex items-center gap-2 text-slate-600">
                <UserIcon size={16} className="text-slate-400" />
                <span className="font-medium">Oleh:</span>
                <span className="text-slate-800 font-semibold">
                  {lastUpload.uploadedBy}
                </span>
              </div>

              <div className="hidden md:block w-px h-4 bg-slate-300"></div>

              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-medium">File:</span>
                <span className="text-slate-800 font-semibold">
                  {lastUpload.filename}
                </span>
              </div>

              <div className="hidden md:block w-px h-4 bg-slate-300"></div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {lastUpload.successfulRecords} berhasil
                </span>
                {lastUpload.failedRecords > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                    {lastUpload.failedRecords} gagal
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <AlertCircle size={16} className="text-slate-400" />
              <span>Belum ada data yang diupload</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">
                Terjadi Kesalahan
              </h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards - Pass filtered data */}
      <BMNStatsCards bmnItems={filteredBmnItems} isLoading={isLoading} />

      {/* Charts and Visualizations - Pass filtered data and view mode */}
      <BMNCharts 
        bmnItems={filteredBmnItems} 
        isLoading={isLoading}
        isSingleSatkerView={isSingleSatkerView}
        satkerName={selectedSatker !== 'All' ? selectedSatker : undefined}
      />
    </div>
  );
};

export default BMNDashboard;
