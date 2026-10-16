// src/components/MonitoringCapaian/MonitoringCapaianPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../../../types';
import {
  CapaianRO,
  CapaianSatker,
  CapaianUnitKerja,
  CapaianKementerianSummary,
  JadwalMingguan
} from '../../types/monitoringCapaian';
import { monitoringCapaianService } from '../../services/MonitoringCapaianService';

import { RingkasanSatkerView } from './RingkasanSatkerView';
import { RankingCapaianView } from './RankingCapaianView';
import { MonitoringRoView } from './MonitoringRoView';
import { JadwalPenyerapanAjView } from './JadwalPenyerapanAjView';
import { FormInputRoModal } from './FormInputRoModal';
import { EditRencanaModal } from './EditRencanaModal';
import { UploadRkklModal } from './UploadRkklModal';

import {
  Target,
  Building2,
  Trophy,
  CalendarDays,
  UploadCloud,
  Plus,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  PieChart
} from 'lucide-react';

interface MonitoringCapaianPageProps {
  currentUser: User;
  showNotification?: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export const MonitoringCapaianPage: React.FC<MonitoringCapaianPageProps> = ({
  currentUser,
  showNotification
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'satker' | 'ranking' | 'ro' | 'jadwal'>('satker');
  const [ros, setRos] = useState<CapaianRO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedRoForEdit, setSelectedRoForEdit] = useState<CapaianRO | null>(null);
  const [selectedRoForSchedule, setSelectedRoForSchedule] = useState<CapaianRO | null>(null);
  const [focusedUnitFilter, setFocusedUnitFilter] = useState<string>('All');

  const loadData = useCallback(async () => {
    // 1. Instant load from cached localStorage/INITIAL_RO_DATA
    const cached = monitoringCapaianService.getROs();
    setRos(cached);
    setLoading(false);

    // 2. Fetch from Supabase in background if table exists
    try {
      const remote = await monitoringCapaianService.fetchROsAsync();
      if (remote && remote.length > 0) {
        setRos(remote);
      }
    } catch (err) {
      // Graceful fallback to cached
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived summaries & aggregates
  const summary: CapaianKementerianSummary = useMemo(() => {
    return monitoringCapaianService.getSummary(ros);
  }, [ros]);

  const satkers: CapaianSatker[] = useMemo(() => {
    return monitoringCapaianService.getSatkerAggregates(ros);
  }, [ros]);

  const unitKerjas: CapaianUnitKerja[] = useMemo(() => {
    return monitoringCapaianService.getUnitKerjaAggregates(undefined, ros);
  }, [ros]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Handlers
  const handleSaveRO = (data: Partial<CapaianRO> & { kodeRo: string; namaRo: string; satkerNama: string; unitKerjaNama: string }) => {
    monitoringCapaianService.upsertRO(data);
    loadData();
    if (showNotification) {
      showNotification('Berhasil', 'Data Rincian Output berhasil disimpan', 'success');
    }
  };

  const handleSaveJadwal = (roId: string, jadwal: JadwalMingguan, keterangan?: string, danaTidakTerserap?: number) => {
    monitoringCapaianService.updateJadwalRO(roId, jadwal, keterangan, danaTidakTerserap, currentUser?.name);
    loadData();
    if (showNotification) {
      showNotification('Berhasil', 'Rencana penyerapan mingguan berhasil diperbarui', 'success');
    }
  };

  const handleDeleteRO = (roId: string) => {
    monitoringCapaianService.deleteRO(roId);
    loadData();
    if (showNotification) {
      showNotification('Dihapus', 'Data Rincian Output telah dihapus', 'info');
    }
  };

  const handleUploadSuccess = (count: number) => {
    loadData();
    if (showNotification) {
      showNotification('Impor Berhasil', `${count} data RO berhasil diimpor ke sistem`, 'success');
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan data ke baseline awal folder RKKL? Perubahan manual akan direset.')) {
      monitoringCapaianService.resetToDefault();
      loadData();
      if (showNotification) {
        showNotification('Reset Berhasil', 'Data dikembalikan ke baseline awal', 'info');
      }
    }
  };

  const handleSelectUnitFromHierarchy = (unitName: string) => {
    setFocusedUnitFilter(unitName);
    setActiveSubTab('ro');
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-50/70">
      {/* Executive Header Bar (Fixed / Pinned) */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3.5 flex-shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Monitoring Capaian Anggaran & Target Rincian Output
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pemantauan penyerapan anggaran SP2D seluruh Satuan Kerja dan Unit Kerja, evaluasi target RO, serta manajemen jadwal rencana penarikan dana (AJK).
            </p>
          </div>

          {/* Executive Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedRoForEdit(null);
                setIsInputModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gov-700 hover:bg-gov-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={15} />
              <span>Input Data RO</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadCloud size={15} className="text-slate-500" />
              <span>Upload Excel</span>
            </button>
            <button
              onClick={() => monitoringCapaianService.exportToExcel(ros)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Unduh seluruh data ke file Excel (.xlsx)"
            >
              <Download size={15} className="text-slate-500" />
              <span>Export</span>
            </button>
            <button
              onClick={handleResetToDefault}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
              title="Kembalikan data ke baseline folder RKKL"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable View Area - Fluid Full Width */}
      <div className="flex-1 overflow-y-auto w-full min-h-0 px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pagu */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Pagu Anggaran</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
              {formatRupiah(summary.totalPagu)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100/60">{summary.totalSatker} Satuan Kerja</span>
              <span>•</span>
              <span className="font-medium text-slate-700">{summary.totalUnitKerja} Unit Kerja</span>
            </div>
          </div>

          {/* Card 2: Realisasi SP2D */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Total Realisasi SP2D</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
              {formatRupiah(summary.totalRealisasi)}
            </div>
            <div className="text-xs text-slate-600 mt-2 flex items-center justify-between">
              <span>Sisa:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {formatRupiah(summary.totalSisa)}
              </span>
            </div>
          </div>

          {/* Card 3: % Capaian Nasional */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>% Penyerapan Nasional</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <PieChart size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
                {summary.persentaseNasional}%
              </span>
              <span className="text-xs text-slate-500 font-medium">terhadap pagu</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2.5 border border-slate-200/60">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary.persentaseNasional))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Distribusi Status Capaian RO */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span>Status ({summary.totalRO} RO)</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                <Target size={16} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="block text-sm font-bold font-mono tabular-nums text-emerald-800">{summary.countSesuaiTarget}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">≥90%</span>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-amber-50 border border-amber-200/80">
                <span className="block text-sm font-bold font-mono tabular-nums text-amber-800">{summary.countPerluPerhatian}</span>
                <span className="text-[10px] text-amber-700 font-semibold">75-90%</span>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-rose-50 border border-rose-200/80">
                <span className="block text-sm font-bold font-mono tabular-nums text-rose-800">{summary.countPerluIntervensi}</span>
                <span className="text-[10px] text-rose-700 font-semibold">≤75%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="border-b border-slate-200/80 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pt-1">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Tab 1: Satker & Unit */}
            <button
              onClick={() => setActiveSubTab('satker')}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
                activeSubTab === 'satker'
                  ? 'border-blue-600 text-blue-800 bg-blue-50/50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Building2 size={16} className={activeSubTab === 'satker' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Satuan & Unit Kerja</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeSubTab === 'satker' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-600'
              }`}>
                {satkers.length}
              </span>
            </button>

            {/* Tab 2: Ranking */}
            <button
              onClick={() => setActiveSubTab('ranking')}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
                activeSubTab === 'ranking'
                  ? 'border-amber-500 text-amber-800 bg-amber-50/50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Trophy size={16} className={activeSubTab === 'ranking' ? 'text-amber-500' : 'text-slate-400'} />
              <span>Peringkat Realisasi</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeSubTab === 'ranking' ? 'bg-amber-500 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-600'
              }`}>
                Rank
              </span>
            </button>

            {/* Tab 3: RO */}
            <button
              onClick={() => {
                setActiveSubTab('ro');
                setFocusedUnitFilter('All');
              }}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
                activeSubTab === 'ro'
                  ? 'border-purple-600 text-purple-800 bg-purple-50/50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Target size={16} className={activeSubTab === 'ro' ? 'text-purple-600' : 'text-slate-400'} />
              <span>Rincian Output & Target</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeSubTab === 'ro' ? 'bg-purple-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-600'
              }`}>
                {ros.length} RO
              </span>
            </button>

            {/* Tab 4: Jadwal AJK */}
            <button
              onClick={() => setActiveSubTab('jadwal')}
              className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap rounded-t-lg ${
                activeSubTab === 'jadwal'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <CalendarDays size={16} className={activeSubTab === 'jadwal' ? 'text-teal-600' : 'text-slate-400'} />
              <span>Matriks Rencana Jadwal (AJK)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                activeSubTab === 'jadwal' ? 'bg-teal-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-600'
              }`}>
                Mingguan
              </span>
            </button>
          </div>
        </div>

      {/* Tab Contents */}
      <div>
        {activeSubTab === 'satker' && (
          <RingkasanSatkerView
            satkers={satkers}
            unitKerjas={unitKerjas}
            ros={ros}
            onSelectUnitKerja={handleSelectUnitFromHierarchy}
            onSelectRO={(ro) => {
              setSelectedRoForSchedule(ro);
              setIsScheduleModalOpen(true);
            }}
          />
        )}

        {activeSubTab === 'ranking' && (
          <RankingCapaianView
            satkers={satkers}
            unitKerjas={unitKerjas}
          />
        )}

        {activeSubTab === 'ro' && (
          <MonitoringRoView
            ros={ros}
            initialUnitFilter={focusedUnitFilter}
            onEditRO={(ro) => {
              setSelectedRoForEdit(ro);
              setIsInputModalOpen(true);
            }}
            onEditJadwal={(ro) => {
              setSelectedRoForSchedule(ro);
              setIsScheduleModalOpen(true);
            }}
            onDeleteRO={handleDeleteRO}
          />
        )}

        {activeSubTab === 'jadwal' && (
          <JadwalPenyerapanAjView
            ros={ros}
            onEditJadwal={(ro) => {
              setSelectedRoForSchedule(ro);
              setIsScheduleModalOpen(true);
            }}
            onDownloadTemplate={() => monitoringCapaianService.downloadTemplate()}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <FormInputRoModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        ro={selectedRoForEdit}
        satkers={satkers}
        unitKerjas={unitKerjas}
        onSave={handleSaveRO}
      />

      <EditRencanaModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        ro={selectedRoForSchedule}
        onSave={handleSaveJadwal}
      />

      <UploadRkklModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
      </div>
    </div>
  );
};

export default MonitoringCapaianPage;
