// src/components/AddZoomScheduleModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Check, MapPin, Briefcase, FileText, Video, Calendar, Clock, User as UserIcon } from 'lucide-react';
import { ZoomMeeting, ZoomAccount, ZoomRoom, ZoomMeetingType, User } from '../../types';
import { zoomService } from '../services/ZoomService';
import { aiExtractorService } from '../services/aiExtractorService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SearchableSelect from './SearchableSelect';

interface AddZoomScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: ZoomMeeting) => void;
  initialData?: ZoomMeeting | null;
}

const AddZoomScheduleModal: React.FC<AddZoomScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const { currentUser } = useAuth();
  
  // Form States
  const [kegiatan, setKegiatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [zoomAccountId, setZoomAccountId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [operatorIds, setOperatorIds] = useState<string[]>([]);
  const [lokasi, setLokasi] = useState('Full Online');
  const [unitKerja, setUnitKerja] = useState('');
  const [jenisRapat, setJenisRapat] = useState('Pendampingan Zoom');
  const [zoomLink, setZoomLink] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [undanganText, setUndanganText] = useState('');
  const [status, setStatus] = useState<'Scheduled' | 'Completed' | 'Cancelled'>('Scheduled');

  // Master Lists
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [rooms, setRooms] = useState<ZoomRoom[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<ZoomMeetingType[]>([]);
  const [unitInternalList, setUnitInternalList] = useState<string[]>([]);
  const [unitEksternalList, setUnitEksternalList] = useState<string[]>([]);
  const [unitKerjaType, setUnitKerjaType] = useState<'Internal' | 'Eksternal'>('Internal');

  // UI States
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Inline Add States
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showAddDivisi, setShowAddDivisi] = useState(false);
  const [newDivisiName, setNewDivisiName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      if (initialData) {
        setKegiatan(initialData.kegiatan);
        setTanggal(initialData.tanggal);
        setWaktuMulai(initialData.waktuMulai);
        setWaktuSelesai(initialData.waktuSelesai);
        setZoomAccountId(initialData.zoomAccountId || '');
        setOperatorId(initialData.operatorId || '');
        if (initialData.operatorIds) {
          setOperatorIds(initialData.operatorIds);
        } else if (initialData.operatorId) {
          setOperatorIds([initialData.operatorId]);
        } else {
          setOperatorIds([]);
        }
        setLokasi(initialData.lokasi);
        setUnitKerja(initialData.unitKerja);
        setJenisRapat(initialData.jenisRapat);
        setZoomLink(initialData.zoomLink || '');
        setMeetingId(initialData.meetingId || '');
        setPasscode(initialData.passcode || '');
        setUndanganText(initialData.undanganText || '');
        setStatus(initialData.status);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setKegiatan('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setWaktuMulai('09:00');
    setWaktuSelesai('11:00');
    setZoomAccountId('');
    setOperatorId(currentUser?.id || '');
    setOperatorIds(currentUser?.id ? [currentUser.id] : []);
    setLokasi('Full Online');
    setUnitKerja(currentUser?.divisi || '');
    setUnitKerjaType('Internal');
    setJenisRapat('Pendampingan Zoom');
    setZoomLink('');
    setMeetingId('');
    setPasscode('');
    setUndanganText('');
    setStatus('Scheduled');
    setError(null);
  };

  const fetchMasterData = async () => {
    try {
      const [accs, rms, types, { data: profilesData }, { data: internalData }, { data: eksternalData }] = await Promise.all([
        zoomService.getAccounts(),
        zoomService.getRooms(),
        zoomService.getMeetingTypes(),
        supabase.from('profiles').select('id, name, role, divisi').order('name', { ascending: true }),
        supabase.from('master_unit_internal').select('name').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('master_unit_eksternal').select('name').eq('is_active', true).order('name', { ascending: true })
      ]);

      setZoomAccounts(accs);
      setRooms(rms);
      setMeetingTypes(types);
      
      if (profilesData) {
        // Filter out super admins if desired, but here we show anyone who can be operator
        setOperators(profilesData);
      }

      const internalNames = internalData ? internalData.map((u: any) => u.name) : [];
      const eksternalNames = eksternalData ? eksternalData.map((u: any) => u.name) : [];

      setUnitInternalList(internalNames);
      setUnitEksternalList(eksternalNames);

      // If editing, determine if the unitKerja is internal or external
      if (initialData) {
        const isEksternal = eksternalNames.includes(initialData.unitKerja);
        setUnitKerjaType(isEksternal ? 'Eksternal' : 'Internal');
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  // AI/Regex Extractor
  const handleExtract = async () => {
    if (!undanganText.trim()) {
      setError('Harap tempelkan salinan undangan Zoom terlebih dahulu.');
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      
      const extracted = await aiExtractorService.extractZoomMeeting(undanganText);
      
      if (extracted) {
        if (extracted.kegiatan) setKegiatan(extracted.kegiatan);
        if (extracted.tanggal) setTanggal(extracted.tanggal);
        if (extracted.waktuMulai) setWaktuMulai(extracted.waktuMulai);
        if (extracted.waktuSelesai) setWaktuSelesai(extracted.waktuSelesai);
        if (extracted.zoomLink) setZoomLink(extracted.zoomLink);
        if (extracted.meetingId) setMeetingId(extracted.meetingId);
        if (extracted.passcode) setPasscode(extracted.passcode);
      }
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setError('Gagal mengekstrak undangan secara otomatis. Harap isi form secara manual.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Add Room Inline
  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const newRoom = await zoomService.createRoom(newRoomName.trim());
      setRooms(prev => [...prev, newRoom].sort((a, b) => a.name.localeCompare(b.name)));
      setLokasi(newRoom.name);
      setNewRoomName('');
      setShowAddRoom(false);
    } catch (err) {
      console.error('Gagal menambahkan ruangan:', err);
      setError('Nama ruangan sudah ada atau terjadi kesalahan.');
    }
  };

  // Add Unit Kerja Inline
  const handleAddUnitKerja = async () => {
    if (!newDivisiName.trim()) return;
    const targetTable = unitKerjaType === 'Internal' ? 'master_unit_internal' : 'master_unit_eksternal';
    try {
      const { error: insertErr } = await supabase
        .from(targetTable)
        .insert({ name: newDivisiName.trim(), is_active: true });

      if (insertErr) throw insertErr;

      if (unitKerjaType === 'Internal') {
        setUnitInternalList(prev => [...prev, newDivisiName.trim()].sort());
      } else {
        setUnitEksternalList(prev => [...prev, newDivisiName.trim()].sort());
      }
      setUnitKerja(newDivisiName.trim());
      setNewDivisiName('');
      setShowAddDivisi(false);
    } catch (err) {
      console.error('Gagal menambahkan unit kerja:', err);
      setError('Unit kerja sudah ada atau terjadi kesalahan.');
    }
  };

  // Delete Room Inline
  const handleDeleteRoom = async (roomName: string) => {
    if (roomName === 'Full Online') return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ruangan "${roomName}"?`)) return;

    try {
      const matchedRoom = rooms.find(r => r.name === roomName);
      if (!matchedRoom) return;

      await zoomService.deleteRoom(matchedRoom.id);
      setRooms(prev => prev.filter(r => r.id !== matchedRoom.id));
      if (lokasi === roomName) {
        setLokasi('Full Online');
      }
    } catch (err) {
      console.error('Gagal menghapus ruangan:', err);
      setError('Gagal menghapus ruangan.');
    }
  };

  // Delete Unit Kerja Inline
  const handleDeleteUnitKerja = async (unitName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus unit kerja "${unitName}"?`)) return;

    const targetTable = unitKerjaType === 'Internal' ? 'master_unit_internal' : 'master_unit_eksternal';
    try {
      const { error: deleteErr } = await supabase
        .from(targetTable)
        .delete()
        .eq('name', unitName);

      if (deleteErr) throw deleteErr;

      if (unitKerjaType === 'Internal') {
        setUnitInternalList(prev => prev.filter(u => u !== unitName));
      } else {
        setUnitEksternalList(prev => prev.filter(u => u !== unitName));
      }
      if (unitKerja === unitName) {
        setUnitKerja('');
      }
    } catch (err) {
      console.error('Gagal menghapus unit kerja:', err);
      setError('Gagal menghapus unit kerja.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kegiatan.trim() || !tanggal || !waktuMulai || !waktuSelesai || !unitKerja || !jenisRapat) {
      setError('Harap isi semua field wajib (bertanda *).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const meetingData: Omit<ZoomMeeting, 'id' | 'createdAt' | 'updatedAt'> = {
      zoomAccountId: zoomAccountId || null,
      tanggal,
      waktuMulai,
      waktuSelesai,
      kegiatan: kegiatan.trim(),
      operatorId: operatorIds.length > 0 ? operatorIds[0] : null,
      operatorIds,
      lokasi,
      unitKerja,
      jenisRapat,
      status,
      zoomLink: zoomLink.trim() || undefined,
      meetingId: meetingId.trim() || undefined,
      passcode: passcode.trim() || undefined,
      undanganText: undanganText.trim() || undefined
    };

    try {
      let savedMeeting: ZoomMeeting;
      if (initialData) {
        savedMeeting = await zoomService.updateMeeting(initialData.id, meetingData);
      } else {
        savedMeeting = await zoomService.createMeeting(meetingData);
      }
      onSave(savedMeeting);
      onClose();
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      setError(err.message || 'Gagal menyimpan jadwal. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Video className="text-gov-600" size={22} />
              {initialData ? 'Edit Pelayanan Zoom' : 'Buat Pelayanan Zoom Baru'}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Isi jadwal atau gunakan fitur ekstraksi otomatis untuk mempercepat input data.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-xl text-base flex items-start gap-2 animate-slideDown">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Paste Invitation Text Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
            <label className="block text-base font-bold text-slate-700 flex items-center gap-2">
              <Sparkles className="text-amber-500 fill-amber-500" size={18} />
              Salinan Undangan Zoom (Tempel di sini untuk mengisi form otomatis)
            </label>
            <textarea
              value={undanganText}
              onChange={(e) => setUndanganText(e.target.value)}
              placeholder="Tempel undangan Zoom Anda di sini..."
              rows={4}
              className="w-full text-sm bg-white text-slate-800 placeholder-slate-400 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500 resize-none font-mono"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || !undanganText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gov-600 to-gov-700 hover:from-gov-700 hover:to-gov-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-gov-600/10 hover:shadow-lg hover:shadow-gov-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isExtracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Mengekstrak data...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="animate-pulse" />
                    Ekstrak Otomatis (AI)
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Kegiatan */}
            <div className="space-y-1.5">
              <label className="block text-base font-semibold text-slate-700">
                Nama Kegiatan / Rapat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                placeholder="Contoh: Rapat Koordinasi Evaluasi Datin"
                className="w-full text-base bg-white text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
              />
            </div>

            {/* 2. Tanggal, Waktu Mulai, Waktu Selesai */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={16} className="text-slate-400" />
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full text-base bg-white text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  Waktu Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  className="w-full text-base bg-white text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" />
                  Waktu Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={waktuSelesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  className="w-full text-base bg-white text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                />
              </div>
            </div>

            {/* 3. Penyelenggara & Jenis Rapat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unit Kerja */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={16} className="text-slate-400" />
                    Unit Kerja <span className="text-red-500">*</span>
                  </span>
                  {!showAddDivisi && (
                    <button
                      type="button"
                      onClick={() => setShowAddDivisi(true)}
                      className="text-xs text-gov-600 hover:text-gov-800 font-semibold flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  )}
                </label>
                
                {showAddDivisi ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newDivisiName}
                      onChange={(e) => setNewDivisiName(e.target.value)}
                      placeholder={unitKerjaType === 'Internal' ? "Nama unit internal..." : "Nama unit eksternal..."}
                      className="w-full text-sm bg-white text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-gov-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddUnitKerja}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddDivisi(false)}
                      className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setUnitKerjaType('Internal');
                          setUnitKerja('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                          unitKerjaType === 'Internal'
                            ? 'bg-white text-gov-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Internal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnitKerjaType('Eksternal');
                          setUnitKerja('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                          unitKerjaType === 'Eksternal'
                            ? 'bg-white text-gov-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Eksternal
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        options={(unitKerjaType === 'Internal' ? unitInternalList : unitEksternalList).map(unit => ({ value: unit, label: unit }))}
                        value={unitKerja}
                        onChange={setUnitKerja}
                        placeholder={unitKerjaType === 'Internal' ? "Cari unit internal..." : "Cari unit eksternal..."}
                        emptyOption={unitKerjaType === 'Internal' ? "-- Pilih Unit Internal --" : "-- Pilih Unit Eksternal --"}
                        onDeleteOption={handleDeleteUnitKerja}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Jenis Rapat */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText size={16} className="text-slate-400" />
                  Jenis Rapat <span className="text-red-500">*</span>
                </label>
                <select
                  value={jenisRapat}
                  onChange={(e) => setJenisRapat(e.target.value)}
                  className="w-full text-sm bg-white text-slate-800 px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-400 focus:border-gov-400 cursor-pointer font-medium"
                >
                  <option value="Pendampingan Zoom">Pendampingan Zoom</option>
                  <option value="Peminjaman Zoom">Peminjaman Zoom</option>
                </select>
              </div>
            </div>

            {/* 4. Fasilitas & Operator */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Akun Zoom */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <Video size={16} className="text-slate-400" />
                  Akun Zoom
                </label>
                <SearchableSelect
                  options={zoomAccounts.filter(acc => acc.isActive || acc.id === zoomAccountId).map(acc => ({
                    value: acc.id,
                    label: `${acc.name} ${!acc.isActive ? '(Nonaktif)' : ''} ${acc.email ? `(${acc.email})` : ''}`
                  }))}
                  value={zoomAccountId}
                  onChange={setZoomAccountId}
                  placeholder="Cari akun Zoom..."
                  emptyOption="-- Pilih Akun Zoom --"
                />
              </div>

              {/* Tempat/Lokasi */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-slate-400" />
                    Lokasi/Ruang <span className="text-red-500">*</span>
                  </span>
                  {!showAddRoom && (
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(true)}
                      className="text-xs text-gov-600 hover:text-gov-800 font-semibold flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  )}
                </label>
                
                {showAddRoom ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Nama ruangan..."
                      className="w-full text-sm bg-white text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-gov-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddRoom}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddRoom(false)}
                      className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={[
                      { value: 'Full Online', label: 'Full Online' },
                      ...rooms.filter(r => r.name !== 'Full Online').map(room => ({
                        value: room.name,
                        label: room.name
                      }))
                    ]}
                    value={lokasi}
                    onChange={setLokasi}
                    placeholder="Cari lokasi/ruangan..."
                    emptyOption="-- Pilih Lokasi --"
                    onDeleteOption={handleDeleteRoom}
                  />
                )}
              </div>

              {/* Operator / Penanggung Jawab */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700 flex items-center gap-1.5">
                  <UserIcon size={16} className="text-slate-400" />
                  Operator / Penanggung Jawab
                </label>
                <SearchableSelect
                  options={operators.map(op => ({
                    value: op.id,
                    label: `${op.name} ${op.divisi ? `[${op.divisi}]` : ''}`
                  }))}
                  value=""
                  onChange={(val) => {
                    if (val && !operatorIds.includes(val)) {
                      setOperatorIds(prev => [...prev, val]);
                    }
                  }}
                  placeholder="Cari operator..."
                  emptyOption="-- Pilih Operator --"
                />
                
                {/* Operator Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-[80px] overflow-y-auto">
                  {operatorIds.map(id => {
                    const op = operators.find(o => o.id === id);
                    if (!op) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gov-50 border border-gov-150 text-gov-700 text-xs font-semibold transition-all hover:bg-gov-100"
                      >
                        {op.name}
                        <button
                          type="button"
                          onClick={() => setOperatorIds(prev => prev.filter(item => item !== id))}
                          className="p-0.5 hover:bg-gov-200 text-gov-600 rounded transition-colors"
                        >
                          <X size={12} className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {operatorIds.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Belum ada operator</span>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Detail Zoom (Link, ID, Passcode) */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Informasi Tautan & Detail Rapat Zoom
              </h4>
              
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700">
                  Tautan / Link Zoom Meeting
                </label>
                <input
                  type="url"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="https://us02web.zoom.us/j/..."
                  className="w-full text-base bg-white text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-700">
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    placeholder="827 3948 2910"
                    className="w-full text-base bg-white text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-700">
                    Passcode / Sandi Rapat
                  </label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="123456"
                    className="w-full text-base bg-white text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-gov-500"
                  />
                </div>
              </div>
            </div>

            {/* 6. Status (Only shown during Edit) */}
            {initialData && (
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-700">
                  Status Pelayanan
                </label>
                <div className="flex gap-4">
                  {[
                    { val: 'Scheduled', label: 'Terjadwal', color: 'border-blue-200 text-blue-700 bg-blue-50' },
                    { val: 'Completed', label: 'Selesai', color: 'border-green-200 text-green-700 bg-green-50' },
                    { val: 'Cancelled', label: 'Dibatalkan', color: 'border-red-200 text-red-700 bg-red-50' }
                  ].map((s) => (
                    <label
                      key={s.val}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-base font-medium cursor-pointer transition-all ${
                        status === s.val
                          ? `${s.color} ring-2 ring-gov-500`
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s.val}
                        checked={status === s.val}
                        onChange={() => setStatus(s.val as any)}
                        className="sr-only"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-semibold text-base border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded-xl font-semibold text-base shadow-md shadow-gov-600/10 hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Jadwal'
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AddZoomScheduleModal;
