// src/components/AddSuratModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Upload, Link2, Save, Check, Search, Users, Plus } from 'lucide-react';
import { Attachment, Meeting, User } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { disposisiService } from '../services/DisposisiService';
import { useMeetings } from '../contexts/MeetingsContext';
import { useUsers } from '../contexts/UsersContext';
import { useMasterData } from '../contexts/MasterDataContext';
import SearchableSelect from './SearchableSelect';
import SearchableSelectWithActions from './SearchableSelectWithActions';
import MultiSelectChip from './MultiSelectChip';
import MasterDataModal from './MasterDataModal';
import { useMasterDataCRUD } from '../hooks/useMasterDataCRUD';

interface AddSuratModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  currentUserName: string;
  currentUser: User | null;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AddSuratModal: React.FC<AddSuratModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUserName,
  currentUser,
  showNotification
}) => {
  const { meetings } = useMeetings();
  const { allUsers } = useUsers();
  const {
    unitInternalList,
    unitEksternalList,
    sifatSuratList,
    jenisNaskahList,
    klasifikasiSuratList,
    bidangTugasList
  } = useMasterData();

  const { addMasterData, editMasterData, deleteMasterData, canDeleteMasterData } = useMasterDataCRUD();

  // Master data modal states
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);
  const [masterDataModalMode, setMasterDataModalMode] = useState<'add' | 'edit'>('add');
  const [masterDataModalType, setMasterDataModalType] = useState<'internal' | 'eksternal'>('internal');
  const [masterDataModalValue, setMasterDataModalValue] = useState('');
  const [masterDataModalOldValue, setMasterDataModalOldValue] = useState('');
  const [editableItems, setEditableItems] = useState<Set<string>>(new Set());
  const [dropdownKey, setDropdownKey] = useState(0); // Force re-render dropdown

  const [jenisSurat, setJenisSurat] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [hal, setHal] = useState('');

  // Asal surat - Internal atau Eksternal
  const [asalSuratType, setAsalSuratType] = useState<'Internal' | 'Eksternal'>('Eksternal');
  const [asalSuratInternal, setAsalSuratInternal] = useState('');
  const [asalSuratEksternal, setAsalSuratEksternal] = useState('');
  const [catatan, setCatatan] = useState('');

  // Tujuan surat (Surat Keluar) - Support mix Internal & Eksternal
  const [tujuanSuratList, setTujuanSuratList] = useState<Array<{ name: string, type: 'Internal' | 'Eksternal' }>>([]);

  const [klasifikasiSurat, setKlasifikasiSurat] = useState('');
  const [jenisNaskah, setJenisNaskah] = useState('');
  const [bidangTugas, setBidangTugas] = useState('');
  const [sifatSurat, setSifatSurat] = useState(''); // Biasa, Segera, Sangat Segera, Rahasia
  const [tanggalDiterima, setTanggalDiterima] = useState(''); // Untuk surat masuk
  const [tanggalDikirim, setTanggalDikirim] = useState(''); // Untuk surat keluar

  // File upload states
  const [suratFile, setSuratFile] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Kegiatan linking states
  const [linkToKegiatan, setLinkToKegiatan] = useState(false);
  const [kegiatanMode, setKegiatanMode] = useState<'existing' | 'new'>('existing'); // Mode: link existing or create new
  const [kegiatanSearch, setKegiatanSearch] = useState('');
  const [selectedKegiatan, setSelectedKegiatan] = useState<Meeting | null>(null);
  const [showKegiatanDropdown, setShowKegiatanDropdown] = useState(false);

  // New Kegiatan form states
  const [newKegiatanTitle, setNewKegiatanTitle] = useState('');
  const [newKegiatanDate, setNewKegiatanDate] = useState('');
  const [newKegiatanStartTime, setNewKegiatanStartTime] = useState('09:00');
  const [newKegiatanEndTime, setNewKegiatanEndTime] = useState('10:00');
  const [newKegiatanLocation, setNewKegiatanLocation] = useState('');
  const [newKegiatanIsOnline, setNewKegiatanIsOnline] = useState(false);
  const [newKegiatanOnlineLink, setNewKegiatanOnlineLink] = useState('');
  const [newKegiatanType, setNewKegiatanType] = useState<'internal' | 'external' | 'bimtek' | 'audiensi'>('internal');

  // Disposisi states (required when linking)
  const [disposisiText, setDisposisiText] = useState('');
  const [disposisiDeadline, setDisposisiDeadline] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Filter Kegiatan based on search
  const filteredKegiatan = meetings.filter(meeting => {
    const searchLower = kegiatanSearch.toLowerCase();
    return (
      meeting.title.toLowerCase().includes(searchLower) ||
      (meeting.nomorSurat && meeting.nomorSurat.toLowerCase().includes(searchLower)) ||
      (meeting.hal && meeting.hal.toLowerCase().includes(searchLower))
    );
  });

  // Refs for click outside detection
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Filter users for assignee selection
  const filteredAssignees = allUsers.filter(user => {
    const searchLower = assigneeSearch.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    };

    if (showAssigneeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown]);

  // Toggle assignee selection
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle Kegiatan selection
  const handleSelectKegiatan = (meeting: Meeting) => {
    setSelectedKegiatan(meeting);
    setKegiatanSearch(meeting.title);
    setShowKegiatanDropdown(false);
  };

  // Handle clear Kegiatan selection
  const handleClearKegiatan = () => {
    setSelectedKegiatan(null);
    setKegiatanSearch('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    let uploadedFilePath: string | null = null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      uploadedFilePath = filePath;

      // Use 'attachment' bucket (same as meetings)
      const { error: uploadError } = await supabase.storage
        .from('attachment')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachment')
        .getPublicUrl(filePath);

      setSuratFile({
        id: `file_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        url: publicUrl,
        isLink: false
      });

      showNotification('File Berhasil Diupload', file.name, 'success');
    } catch (error: any) {
      // Cleanup uploaded file if there's an error
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('attachment').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      showNotification('Gagal Upload File', error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = () => {
    if (!linkUrl || !linkTitle) {
      showNotification('Link Tidak Lengkap', 'Mohon isi judul dan URL link', 'warning');
      return;
    }

    setSuratFile({
      id: `link_${Date.now()}`,
      name: linkTitle,
      size: 0,
      type: 'link',
      path: '',
      url: linkUrl,
      isLink: true
    });

    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
    showNotification('Link Ditambahkan', linkTitle, 'success');
  };

  const handleRemoveFile = async () => {
    if (suratFile && !suratFile.isLink && suratFile.path) {
      try {
        await supabase.storage.from('attachment').remove([suratFile.path]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    setSuratFile(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!jenisSurat || !nomorSurat || !tanggalSurat) {
      showNotification('Data Tidak Lengkap', 'Jenis surat, nomor surat, dan tanggal surat wajib diisi', 'warning');
      return;
    }

    if (!suratFile) {
      showNotification('File Surat Belum Diupload', 'Mohon upload file surat atau tambahkan link', 'warning');
      return;
    }

    // Validate Disposisi when linking to Kegiatan (existing)
    if (linkToKegiatan && kegiatanMode === 'existing' && selectedKegiatan) {
      if (!disposisiText.trim()) {
        showNotification('Disposisi Wajib Diisi', 'Disposisi harus diisi saat menghubungkan Surat dengan Kegiatan', 'warning');
        return;
      }
      if (selectedAssignees.length === 0) {
        showNotification('Assignee Belum Dipilih', 'Pilih minimal satu assignee untuk Disposisi', 'warning');
        return;
      }
    }

    // Validate New Kegiatan form
    if (linkToKegiatan && kegiatanMode === 'new') {
      if (!newKegiatanTitle.trim()) {
        showNotification('Judul Kegiatan Wajib Diisi', 'Mohon isi judul kegiatan', 'warning');
        return;
      }
      if (!newKegiatanDate) {
        showNotification('Tanggal Kegiatan Wajib Diisi', 'Mohon isi tanggal kegiatan', 'warning');
        return;
      }
      if (newKegiatanIsOnline) {
        if (!newKegiatanOnlineLink.trim()) {
          showNotification('Link Online Wajib Diisi', 'Mohon isi link meeting untuk kegiatan online', 'warning');
          return;
        }
      } else {
        if (!newKegiatanLocation.trim()) {
          showNotification('Lokasi Kegiatan Wajib Diisi', 'Mohon isi lokasi kegiatan offline', 'warning');
          return;
        }
      }
      if (!disposisiText.trim()) {
        showNotification('Disposisi Wajib Diisi', 'Disposisi harus diisi saat membuat Kegiatan baru', 'warning');
        return;
      }
      if (selectedAssignees.length === 0) {
        showNotification('Assignee Belum Dipilih', 'Pilih minimal satu assignee untuk Disposisi (akan menjadi PIC)', 'warning');
        return;
      }
    }

    // Determine asal surat based on type
    const finalAsalSurat = jenisSurat === 'Masuk'
      ? (asalSuratType === 'Internal' ? asalSuratInternal : asalSuratEksternal)
      : null;

    // Determine tujuan surat - save both list (JSONB) and string (text) for compatibility
    const finalTujuanSuratList = jenisSurat === 'Keluar' && tujuanSuratList.length > 0
      ? tujuanSuratList
      : null;

    const finalTujuanSurat = jenisSurat === 'Keluar' && tujuanSuratList.length > 0
      ? tujuanSuratList.map(t => `${t.name} (${t.type})`).join(', ')
      : null;

    try {
      // Save to surats table (not meetings)
      const suratPayload = {
        jenis_surat: jenisSurat,
        nomor_surat: nomorSurat,
        tanggal_surat: tanggalSurat,
        hal: hal || null,
        asal_surat: finalAsalSurat,
        tujuan_surat: finalTujuanSurat, // String for display
        tujuan_surat_list: finalTujuanSuratList, // JSONB for structured data
        klasifikasi_surat: klasifikasiSurat || null,
        jenis_naskah: jenisNaskah || null,
        sifat_surat: sifatSurat || null,
        bidang_tugas: bidangTugas || null,
        catatan: catatan || null,
        tanggal_diterima: jenisSurat === 'Masuk' ? (tanggalDiterima || null) : null,
        tanggal_dikirim: jenisSurat === 'Keluar' ? (tanggalDikirim || null) : null,
        file_surat: suratFile,
        meeting_id: linkToKegiatan && selectedKegiatan ? selectedKegiatan.id : null,
        created_by: currentUserName,
        created_by_id: currentUser?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: suratData, error: suratError } = await supabase
        .from('surats')
        .insert([suratPayload])
        .select()
        .single();

      if (suratError) throw suratError;

      // If linking to existing Kegiatan, update the meeting and create Disposisi
      if (linkToKegiatan && kegiatanMode === 'existing' && selectedKegiatan && suratData) {
        try {
          // Update meeting with linked_surat_id
          const { error: updateError } = await supabase
            .from('meetings')
            .update({
              linked_surat_id: suratData.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedKegiatan.id);

          if (updateError) throw updateError;

          // Create Disposisi via service (ensures validation, audit trail, and notifications)
          await disposisiService.createMultiUserDisposisi(
            suratData.id,
            selectedKegiatan.id,
            selectedAssignees,
            disposisiText,
            currentUser?.id || currentUserName,
            currentUser,
            disposisiDeadline || undefined,
            currentUser?.name || currentUserName,
            nomorSurat,
            selectedKegiatan.title
          );

          showNotification(
            'Surat & Link Berhasil Dibuat',
            `Surat ${nomorSurat} berhasil dibuat dan dihubungkan dengan Kegiatan "${selectedKegiatan.title}"`,
            'success'
          );
        } catch (linkError: any) {
          console.error('Error linking to Kegiatan:', linkError);
          showNotification(
            'Surat Tersimpan, Link Gagal',
            `Surat ${nomorSurat} tersimpan, tapi gagal menghubungkan dengan Kegiatan`,
            'warning'
          );
        }
      }
      // If creating new Kegiatan, create meeting and disposisi
      else if (linkToKegiatan && kegiatanMode === 'new' && suratData) {
        try {
          // Determine inviter based on jenis surat
          const inviter = jenisSurat === 'Masuk'
            ? { id: `inv_${Date.now()}`, name: finalAsalSurat || 'Tidak Diketahui', organization: finalAsalSurat }
            : { id: `inv_${Date.now()}`, name: currentUserName, organization: 'Internal' };

          // Get assignee names for PIC
          const picNames = selectedAssignees.map(assigneeId => {
            const user = allUsers.find(u => u.id === assigneeId);
            return user?.name || assigneeId;
          });

          // Create new meeting
          const meetingPayload = {
            title: newKegiatanTitle,
            type: newKegiatanType,
            description: `Kegiatan terkait surat ${nomorSurat}${hal ? `: ${hal}` : ''}`,
            date: newKegiatanDate,
            start_time: newKegiatanStartTime,
            end_time: newKegiatanEndTime,
            location: newKegiatanIsOnline ? '' : newKegiatanLocation,
            is_online: newKegiatanIsOnline,
            online_link: newKegiatanIsOnline ? newKegiatanOnlineLink : null,
            inviter: inviter,
            invitees: [],
            pic: picNames, // Assignees become PIC
            surat_undangan: jenisSurat === 'Masuk' ? suratFile : null,
            surat_tugas: jenisSurat === 'Keluar' ? suratFile : null,
            attachments: [],
            links: [],
            status: 'scheduled',
            linked_surat_id: suratData.id,
            created_by: currentUserName,
            created_by_id: currentUser?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: meetingData, error: meetingError } = await supabase
            .from('meetings')
            .insert([meetingPayload])
            .select()
            .single();

          if (meetingError) throw meetingError;

          // Update surat with meeting_id
          await supabase
            .from('surats')
            .update({ meeting_id: meetingData.id, updated_at: new Date().toISOString() })
            .eq('id', suratData.id);

          // Create Disposisi via service (ensures validation, audit trail, and notifications)
          await disposisiService.createMultiUserDisposisi(
            suratData.id,
            meetingData.id,
            selectedAssignees,
            disposisiText,
            currentUser?.id || currentUserName,
            currentUser,
            disposisiDeadline || undefined,
            currentUser?.name || currentUserName,
            nomorSurat,
            newKegiatanTitle
          );

          showNotification(
            'Surat & Kegiatan Berhasil Dibuat',
            `Surat ${nomorSurat} dan Kegiatan "${newKegiatanTitle}" berhasil dibuat dengan ${selectedAssignees.length} disposisi`,
            'success'
          );
        } catch (createError: any) {
          console.error('Error creating new Kegiatan:', createError);
          const errorMessage = createError?.message || createError?.error_description || JSON.stringify(createError);
          showNotification(
            'Surat Tersimpan, Kegiatan Gagal',
            `Surat ${nomorSurat} tersimpan, tapi gagal membuat Kegiatan baru: ${errorMessage}`,
            'warning'
          );
        }
      } else {
        showNotification('Surat Berhasil Ditambahkan', `Surat ${nomorSurat} berhasil disimpan`, 'success');
      }

      onSave();
      handleClose();
    } catch (error: any) {
      showNotification('Gagal Menyimpan Surat', error.message, 'error');
    }
  };

  const handleClose = () => {
    // Reset form
    setJenisSurat('Masuk');
    setNomorSurat('');
    setTanggalSurat('');
    setHal('');
    setAsalSuratType('Eksternal');
    setAsalSuratInternal('');
    setAsalSuratEksternal('');
    setTujuanSuratList([]);
    setKlasifikasiSurat('');
    setJenisNaskah('');
    setBidangTugas('');
    setCatatan('');
    setSifatSurat('');
    setTanggalDiterima('');
    setTanggalDikirim('');
    setSuratFile(null);
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');

    // Reset linking states
    setLinkToKegiatan(false);
    setKegiatanMode('existing');
    setKegiatanSearch('');
    setSelectedKegiatan(null);
    setShowKegiatanDropdown(false);
    setNewKegiatanTitle('');
    setNewKegiatanDate('');
    setNewKegiatanStartTime('09:00');
    setNewKegiatanEndTime('10:00');
    setNewKegiatanLocation('');
    setNewKegiatanIsOnline(false);
    setNewKegiatanOnlineLink('');
    setNewKegiatanType('internal');
    setDisposisiText('');
    setDisposisiDeadline('');
    setSelectedAssignees([]);
    setShowAssigneeDropdown(false);
    setAssigneeSearch('');

    onClose();
  };

  const handleOpenAddModal = (type: 'internal' | 'eksternal') => {
    setMasterDataModalMode('add');
    setMasterDataModalType(type);
    setMasterDataModalValue('');
    setShowMasterDataModal(true);
  };

  const handleOpenEditModal = (type: 'internal' | 'eksternal', oldValue: string) => {
    setMasterDataModalMode('edit');
    setMasterDataModalType(type);
    setMasterDataModalValue(oldValue);
    setMasterDataModalOldValue(oldValue);
    setShowMasterDataModal(true);
  };

  const handleSaveMasterData = async (name: string) => {
    const tableName = masterDataModalType === 'internal' ? 'master_unit_internal' : 'master_unit_eksternal';

    try {
      if (masterDataModalMode === 'add') {
        await addMasterData(tableName, name);
        showNotification('Berhasil', `Unit ${masterDataModalType === 'internal' ? 'Internal' : 'Eksternal'} berhasil ditambahkan`, 'success');
      } else {
        await editMasterData(tableName, masterDataModalOldValue, name);

        // Update tujuanSuratList if the edited item is selected
        if (jenisSurat === 'Keluar') {
          setTujuanSuratList(prev => prev.map(item => {
            if (item.name === masterDataModalOldValue &&
              item.type === (masterDataModalType === 'internal' ? 'Internal' : 'Eksternal')) {
              return { ...item, name };
            }
            return item;
          }));

          // Update editableItems set
          const oldKey = `${masterDataModalType}:${masterDataModalOldValue}`;
          const newKey = `${masterDataModalType}:${name}`;
          setEditableItems(prev => {
            const updated = new Set(prev);
            if (updated.has(oldKey)) {
              updated.delete(oldKey);
              updated.add(newKey);
            }
            return updated;
          });
        }

        showNotification('Berhasil', `Unit ${masterDataModalType === 'internal' ? 'Internal' : 'Eksternal'} berhasil diubah`, 'success');
      }
    } catch (error: any) {
      showNotification('Gagal', error.message || 'Terjadi kesalahan', 'error');
    }
  };

  // Check which items can be edited (async check on mount/update)
  useEffect(() => {
    const checkEditableItems = async () => {
      const editable = new Set<string>();

      for (const unit of unitInternalList) {
        const canEdit = await canDeleteMasterData('master_unit_internal', unit);
        if (canEdit) editable.add(`internal:${unit}`);
      }

      for (const unit of unitEksternalList) {
        const canEdit = await canDeleteMasterData('master_unit_eksternal', unit);
        if (canEdit) editable.add(`eksternal:${unit}`);
      }

      setEditableItems(editable);
    };

    if (jenisSurat === 'Keluar' && isOpen) {
      checkEditableItems();
    }
  }, [unitInternalList, unitEksternalList, jenisSurat, isOpen]); // Removed canDeleteMasterData from deps

  // Force dropdown re-render when unit lists change (after edit/add)
  useEffect(() => {
    if (jenisSurat === 'Keluar' && isOpen) {
      setDropdownKey(prev => prev + 1);
    }
  }, [unitInternalList, unitEksternalList, jenisSurat, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <h3 className="text-xl font-bold">Tambah Surat</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Jenis Surat - Prominent */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border-2 border-slate-200">
            <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-gov-600" />
              Jenis Surat <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJenisSurat('Masuk')}
                className={`p-4 rounded-lg border-2 transition-all ${jenisSurat === 'Masuk'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-slate-300 bg-white hover:border-green-300'
                  }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${jenisSurat === 'Masuk' ? 'border-green-600 bg-green-600' : 'border-slate-300'
                    }`}>
                    {jenisSurat === 'Masuk' && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-base font-bold ${jenisSurat === 'Masuk' ? 'text-green-700' : 'text-slate-600'}`}>
                    Surat Masuk
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Surat yang diterima dari pihak eksternal</p>
              </button>
              <button
                type="button"
                onClick={() => setJenisSurat('Keluar')}
                className={`p-4 rounded-lg border-2 transition-all ${jenisSurat === 'Keluar'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-300 bg-white hover:border-blue-300'
                  }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${jenisSurat === 'Keluar' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                    {jenisSurat === 'Keluar' && <Check size={14} className="text-white" />}
                  </div>
                  <span className={`text-base font-bold ${jenisSurat === 'Keluar' ? 'text-blue-700' : 'text-slate-600'}`}>
                    Surat Keluar
                  </span>
                </div>
                <p className="text-xs text-slate-500 text-center">Surat yang dikirim ke pihak eksternal</p>
              </button>
            </div>
          </div>

          {/* Informasi Dasar Surat */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              Informasi Dasar
            </h4>

            {/* Nomor Surat & Tanggal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nomor Surat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                  placeholder={jenisSurat === 'Masuk' ? 'Nomor surat dari pengirim' : 'Nomor surat yang diterbitkan'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tanggal Surat <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                />
              </div>
            </div>

            {/* Tanggal Diterima/Dikirim */}
            <div className="grid grid-cols-2 gap-4">
              {jenisSurat === 'Masuk' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tanggal Diterima
                  </label>
                  <input
                    type="date"
                    value={tanggalDiterima}
                    onChange={(e) => setTanggalDiterima(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Tanggal surat diterima oleh instansi</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tanggal Dikirim
                  </label>
                  <input
                    type="date"
                    value={tanggalDikirim}
                    onChange={(e) => setTanggalDikirim(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Tanggal surat dikirim ke tujuan</p>
                </div>
              )}

              {/* Sifat Surat */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Sifat Surat</label>
                <SearchableSelect
                  options={sifatSuratList.map(s => ({ value: s, label: s }))}
                  value={sifatSurat}
                  onChange={setSifatSurat}
                  placeholder="Cari sifat surat..."
                  emptyOption="Pilih Sifat"
                />
              </div>
            </div>
          </div>

          {/* Asal/Tujuan & Klasifikasi */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              {jenisSurat === 'Masuk' ? 'Informasi Pengirim' : 'Informasi Penerima'}
            </h4>

            {/* Hal/Perihal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Hal/Perihal</label>
              <input
                type="text"
                value={hal}
                onChange={(e) => setHal(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                placeholder="Perihal surat"
              />
            </div>

            {/* Asal/Tujuan Surat & Jenis Naskah */}
            {/* Asal/Tujuan Surat & Jenis Naskah */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {jenisSurat === 'Masuk' ? 'Dari (Pengirim)' : 'Kepada (Penerima)'}
                </label>
                {jenisSurat === 'Masuk' ? (
                  <div className="space-y-3">
                    {/* Pilihan Internal/Eksternal */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setAsalSuratType('Internal')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${asalSuratType === 'Internal'
                          ? 'border-gov-500 bg-gov-50 text-gov-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                      >
                        Internal
                      </button>
                      <button
                        type="button"
                        onClick={() => setAsalSuratType('Eksternal')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${asalSuratType === 'Eksternal'
                          ? 'border-gov-500 bg-gov-50 text-gov-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                      >
                        Eksternal
                      </button>
                    </div>

                    {/* Input berdasarkan pilihan */}
                    {asalSuratType === 'Internal' ? (
                      <SearchableSelectWithActions
                        options={unitInternalList.map(u => ({ value: u, label: u }))}
                        value={asalSuratInternal}
                        onChange={setAsalSuratInternal}
                        placeholder="Cari unit internal..."
                        emptyOption="Pilih Unit Internal"
                        tableName="Unit Internal"
                        onAdd={(name) => addMasterData('master_unit_internal', name)}
                        onEdit={(oldName, newName) => editMasterData('master_unit_internal', oldName, newName)}
                        onDelete={(name) => deleteMasterData('master_unit_internal', name)}
                        canDelete={(name) => canDeleteMasterData('master_unit_internal', name)}
                      />
                    ) : (
                      <SearchableSelectWithActions
                        options={unitEksternalList.map(u => ({ value: u, label: u }))}
                        value={asalSuratEksternal}
                        onChange={setAsalSuratEksternal}
                        placeholder="Cari unit eksternal..."
                        emptyOption="Pilih Unit Eksternal"
                        tableName="Unit Eksternal"
                        onAdd={(name) => addMasterData('master_unit_eksternal', name)}
                        onEdit={(oldName, newName) => editMasterData('master_unit_eksternal', oldName, newName)}
                        onDelete={(name) => deleteMasterData('master_unit_eksternal', name)}
                        canDelete={(name) => canDeleteMasterData('master_unit_eksternal', name)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Pilih dari Internal atau Eksternal</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal('internal')}
                          className="text-xs text-gov-600 hover:text-gov-700 font-medium flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Internal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal('eksternal')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Eksternal
                        </button>
                      </div>
                    </div>

                    <MultiSelectChip
                      key={dropdownKey}
                      options={[
                        ...unitInternalList.map(u => ({ value: `internal:${u}`, label: `${u} (Internal)` })),
                        ...unitEksternalList.map(u => ({ value: `eksternal:${u}`, label: `${u} (Eksternal)` }))
                      ]}
                      value={tujuanSuratList.map(t => `${t.type.toLowerCase()}:${t.name}`)}
                      onChange={(selected) => {
                        const parsed = selected.map(val => {
                          const [type, ...nameParts] = val.split(':');
                          return {
                            name: nameParts.join(':'),
                            type: (type === 'internal' ? 'Internal' : 'Eksternal') as 'Internal' | 'Eksternal'
                          };
                        });
                        setTujuanSuratList(parsed);
                      }}
                      placeholder="Pilih penerima (Internal/Eksternal)..."
                      maxVisibleChips={0}
                      onEdit={(value, label) => {
                        const [type, ...nameParts] = value.split(':');
                        const oldName = nameParts.join(':');
                        handleOpenEditModal(type as 'internal' | 'eksternal', oldName);
                      }}
                      canEdit={(value) => editableItems.has(value)}
                    />

                    {/* Selected recipients in one line */}
                    {tujuanSuratList.length > 0 && (
                      <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                        <span className="font-semibold">Terpilih: </span>
                        {tujuanSuratList.map((r, i) => (
                          <span key={i}>
                            {r.name} ({r.type}){i < tujuanSuratList.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Naskah</label>
                <SearchableSelect
                  options={jenisNaskahList.map(j => ({ value: j, label: j }))}
                  value={jenisNaskah}
                  onChange={setJenisNaskah}
                  placeholder="Cari jenis naskah..."
                  emptyOption="Pilih Jenis Naskah"
                />
              </div>
            </div>

            {/* Klasifikasi & Bidang Tugas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Klasifikasi Surat</label>
                <SearchableSelectWithActions
                  options={klasifikasiSuratList.map(k => ({ value: k, label: k }))}
                  value={klasifikasiSurat}
                  onChange={setKlasifikasiSurat}
                  placeholder="Cari klasifikasi..."
                  emptyOption="Pilih Klasifikasi"
                  tableName="Klasifikasi Surat"
                  onAdd={(name) => addMasterData('master_klasifikasi_surat', name)}
                  onEdit={(oldName, newName) => editMasterData('master_klasifikasi_surat', oldName, newName)}
                  onDelete={(name) => deleteMasterData('master_klasifikasi_surat', name)}
                  canDelete={(name) => canDeleteMasterData('master_klasifikasi_surat', name)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bidang Tugas/Kerja</label>
                <SearchableSelectWithActions
                  options={bidangTugasList.map(b => ({ value: b, label: b }))}
                  value={bidangTugas}
                  onChange={setBidangTugas}
                  placeholder="Cari bidang tugas..."
                  emptyOption="Pilih Bidang Tugas"
                  tableName="Bidang Tugas"
                  onAdd={(name) => addMasterData('master_bidang_tugas', name)}
                  onEdit={(oldName, newName) => editMasterData('master_bidang_tugas', oldName, newName)}
                  onDelete={(name) => deleteMasterData('master_bidang_tugas', name)}
                  canDelete={(name) => canDeleteMasterData('master_bidang_tugas', name)}
                />
              </div>
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Catatan (Opsional)
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-y min-h-[80px]"
                placeholder="Tambahkan catatan khusus untuk surat ini..."
                rows={3}
              />
            </div>
          </div>

          {/* Link to Kegiatan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Link ke Kegiatan (Opsional)
              </h4>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Info:</strong> Hubungkan surat dengan Kegiatan (existing atau buat baru).
                Jika dihubungkan, Anda wajib mengisi Disposisi. User yang didisposisi akan otomatis menjadi PIC.
              </p>
            </div>

            {/* Toggle Link to Kegiatan */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="linkToKegiatan"
                checked={linkToKegiatan}
                onChange={(e) => {
                  setLinkToKegiatan(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedKegiatan(null);
                    setKegiatanSearch('');
                    setKegiatanMode('existing');
                    setNewKegiatanTitle('');
                    setNewKegiatanDate('');
                    setNewKegiatanStartTime('09:00');
                    setNewKegiatanEndTime('10:00');
                    setNewKegiatanLocation('');
                    setNewKegiatanIsOnline(false);
                    setNewKegiatanOnlineLink('');
                    setNewKegiatanType('internal');
                    setDisposisiText('');
                    setDisposisiDeadline('');
                    setSelectedAssignees([]);
                  }
                }}
                className="w-4 h-4 text-gov-600 border-slate-300 rounded focus:ring-gov-500"
              />
              <label htmlFor="linkToKegiatan" className="text-sm font-medium text-slate-700 cursor-pointer">
                Hubungkan dengan Kegiatan
              </label>
            </div>

            {/* Mode Selection: Existing or New */}
            {linkToKegiatan && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setKegiatanMode('existing');
                      setNewKegiatanTitle('');
                      setNewKegiatanDate('');
                      setNewKegiatanLocation('');
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${kegiatanMode === 'existing'
                      ? 'border-gov-500 bg-gov-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Link ke Kegiatan Existing</div>
                    <div className="text-xs text-slate-500 mt-1">Pilih dari kegiatan yang sudah ada</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKegiatanMode('new');
                      setSelectedKegiatan(null);
                      setKegiatanSearch('');
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${kegiatanMode === 'new'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Buat Kegiatan Baru</div>
                    <div className="text-xs text-slate-500 mt-1">Buat kegiatan baru sekaligus</div>
                  </button>
                </div>

                {/* Existing Kegiatan Mode */}
                {kegiatanMode === 'existing' && (
                  <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="relative">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Cari Kegiatan <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={kegiatanSearch}
                          onChange={(e) => {
                            setKegiatanSearch(e.target.value);
                            setShowKegiatanDropdown(true);
                          }}
                          onFocus={() => setShowKegiatanDropdown(true)}
                          placeholder="Cari berdasarkan judul, nomor surat, atau perihal..."
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                        {selectedKegiatan && (
                          <button
                            onClick={handleClearKegiatan}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      {/* Kegiatan Dropdown */}
                      {showKegiatanDropdown && !selectedKegiatan && filteredKegiatan.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredKegiatan.slice(0, 10).map((meeting) => (
                            <button
                              key={meeting.id}
                              onClick={() => handleSelectKegiatan(meeting)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-slate-800">{meeting.title}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                {meeting.date} • {meeting.type}
                                {meeting.nomorSurat && ` • ${meeting.nomorSurat}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Kegiatan Display */}
                    {selectedKegiatan && (
                      <div className="p-3 bg-white border border-gov-300 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{selectedKegiatan.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {selectedKegiatan.date} • {selectedKegiatan.startTime} - {selectedKegiatan.endTime}
                            </div>
                            {selectedKegiatan.nomorSurat && (
                              <div className="text-xs text-slate-500 mt-1">
                                Nomor: {selectedKegiatan.nomorSurat}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleClearKegiatan}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disposisi Form (Required when linking) */}
                    {selectedKegiatan && (
                      <div className="space-y-4 pt-4 border-t border-slate-300">
                        <h5 className="text-sm font-bold text-slate-700">
                          Disposisi <span className="text-red-500">*</span>
                        </h5>

                        {/* Disposisi Text */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Isi Disposisi <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={disposisiText}
                            onChange={(e) => setDisposisiText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
                            placeholder="Instruksi atau arahan terkait surat dan kegiatan ini..."
                          />
                        </div>

                        {/* Assignees Selection */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Ditugaskan Kepada <span className="text-red-500">*</span>
                          </label>
                          <div className="relative" ref={assigneeDropdownRef}>
                            <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-white">
                              <Users size={18} className="text-slate-400" />
                              <input
                                type="text"
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                onFocus={() => setShowAssigneeDropdown(true)}
                                placeholder="Cari dan pilih assignee..."
                                className="flex-1 outline-none text-sm"
                              />
                              {showAssigneeDropdown && (
                                <button
                                  type="button"
                                  onClick={() => setShowAssigneeDropdown(false)}
                                  className="text-xs text-gov-600 hover:text-gov-700 font-medium"
                                >
                                  Done
                                </button>
                              )}
                            </div>

                            {/* Assignee Dropdown */}
                            {showAssigneeDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredAssignees.length > 0 ? (
                                  <>
                                    {filteredAssignees.map((user) => (
                                      <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                          toggleAssignee(user.id);
                                          setAssigneeSearch('');
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                      >
                                        <div>
                                          <div className="font-medium text-slate-800 text-sm">{user.name}</div>
                                          <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                        {selectedAssignees.includes(user.id) && (
                                          <Check size={16} className="text-gov-600" />
                                        )}
                                      </button>
                                    ))}
                                    <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowAssigneeDropdown(false)}
                                        className="w-full py-1.5 text-sm font-medium text-gov-600 hover:text-gov-700"
                                      >
                                        Done ({selectedAssignees.length} selected)
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Tidak ada user ditemukan
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Selected Assignees */}
                          {selectedAssignees.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedAssignees.map((userId) => {
                                const user = allUsers.find(u => u.id === userId);
                                if (!user) return null;
                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gov-100 text-gov-800 rounded-full text-sm"
                                  >
                                    <span>{user.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleAssignee(userId)}
                                      className="hover:bg-gov-200 rounded-full p-0.5"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Deadline */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Deadline (Opsional)
                          </label>
                          <input
                            type="date"
                            value={disposisiDeadline}
                            onChange={(e) => setDisposisiDeadline(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* New Kegiatan Mode */}
                {kegiatanMode === 'new' && (
                  <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <h5 className="text-sm font-bold text-slate-700">
                      Informasi Kegiatan Baru <span className="text-red-500">*</span>
                    </h5>

                    {/* Kegiatan Title */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Judul Kegiatan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newKegiatanTitle}
                        onChange={(e) => setNewKegiatanTitle(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        placeholder="Judul kegiatan..."
                      />
                    </div>

                    {/* Kegiatan Type */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Jenis Kegiatan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newKegiatanType}
                        onChange={(e) => setNewKegiatanType(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none bg-white"
                      >
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                        <option value="bimtek">Bimtek</option>
                        <option value="audiensi">Audiensi</option>
                      </select>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Tanggal <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={newKegiatanDate}
                          onChange={(e) => setNewKegiatanDate(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Waktu Mulai <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={newKegiatanStartTime}
                          onChange={(e) => setNewKegiatanStartTime(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Waktu Selesai <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={newKegiatanEndTime}
                          onChange={(e) => setNewKegiatanEndTime(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Lokasi <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!newKegiatanIsOnline}
                            onChange={() => setNewKegiatanIsOnline(false)}
                            className="text-gov-600"
                          />
                          <span className="text-sm">Offline</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={newKegiatanIsOnline}
                            onChange={() => setNewKegiatanIsOnline(true)}
                            className="text-gov-600"
                          />
                          <span className="text-sm">Online</span>
                        </label>
                      </div>
                      {newKegiatanIsOnline ? (
                        <input
                          type="url"
                          value={newKegiatanOnlineLink}
                          onChange={(e) => setNewKegiatanOnlineLink(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                          placeholder="Link meeting (Zoom, Google Meet, dll)"
                        />
                      ) : (
                        <input
                          type="text"
                          value={newKegiatanLocation}
                          onChange={(e) => setNewKegiatanLocation(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                          placeholder="Contoh: Ruang Rapat Lt. 3"
                        />
                      )}
                    </div>

                    {/* Disposisi Form for New Kegiatan */}
                    <div className="space-y-4 pt-4 border-t border-slate-300">
                      <h5 className="text-sm font-bold text-slate-700">
                        Disposisi <span className="text-red-500">*</span>
                      </h5>

                      {/* Disposisi Text */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Isi Disposisi <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={disposisiText}
                          onChange={(e) => setDisposisiText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none resize-none"
                          placeholder="Instruksi atau arahan terkait surat dan kegiatan ini..."
                        />
                      </div>

                      {/* Assignees Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Ditugaskan Kepada (akan menjadi PIC) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" ref={assigneeDropdownRef}>
                          <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-white">
                            <Users size={18} className="text-slate-400" />
                            <input
                              type="text"
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                              onFocus={() => setShowAssigneeDropdown(true)}
                              placeholder="Cari dan pilih assignee..."
                              className="flex-1 outline-none text-sm"
                            />
                            {showAssigneeDropdown && (
                              <button
                                type="button"
                                onClick={() => setShowAssigneeDropdown(false)}
                                className="text-xs text-gov-600 hover:text-gov-700 font-medium"
                              >
                                Done
                              </button>
                            )}
                          </div>

                          {/* Assignee Dropdown */}
                          {showAssigneeDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredAssignees.length > 0 ? (
                                <>
                                  {filteredAssignees.map((user) => (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => {
                                        toggleAssignee(user.id);
                                        setAssigneeSearch('');
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-medium text-slate-800 text-sm">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.email}</div>
                                      </div>
                                      {selectedAssignees.includes(user.id) && (
                                        <Check size={16} className="text-gov-600" />
                                      )}
                                    </button>
                                  ))}
                                  <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAssigneeDropdown(false)}
                                      className="w-full py-1.5 text-sm font-medium text-gov-600 hover:text-gov-700"
                                    >
                                      Done ({selectedAssignees.length} selected)
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                  Tidak ada user ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Assignees */}
                        {selectedAssignees.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedAssignees.map((userId) => {
                              const user = allUsers.find(u => u.id === userId);
                              if (!user) return null;
                              return (
                                <div
                                  key={userId}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-gov-100 text-gov-800 rounded-full text-sm"
                                >
                                  <span>{user.name}</span>
                                  <button
                                    onClick={() => toggleAssignee(userId)}
                                    className="hover:bg-gov-200 rounded-full p-0.5"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Deadline (Opsional)
                        </label>
                        <input
                          type="date"
                          value={disposisiDeadline}
                          onChange={(e) => setDisposisiDeadline(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
              Dokumen Surat
            </h4>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              File Surat <span className="text-red-500">*</span>
            </label>

            {!suratFile && !showLinkInput && (
              <div className="flex gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-gov-400 hover:bg-gov-50 transition-colors cursor-pointer">
                  <Upload size={18} className="text-gov-600" />
                  <span className="text-sm font-medium text-slate-700">Upload File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Link2 size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Tambah Link</span>
                </button>
              </div>
            )}

            {showLinkInput && !suratFile && (
              <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Judul link"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                />
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLink}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Simpan Link
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkUrl('');
                      setLinkTitle('');
                    }}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {suratFile && (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {suratFile.isLink ? <Link2 size={18} className="text-blue-600" /> : <FileText size={18} className="text-gov-600" />}
                  <span className="text-sm text-slate-700 font-medium">{suratFile.name}</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="text-sm text-slate-500 mt-2">Mengupload file...</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-xl border-t border-slate-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            Simpan Surat
          </button>
        </div>
      </div>

      {/* Master Data Modal */}
      <MasterDataModal
        isOpen={showMasterDataModal}
        onClose={() => setShowMasterDataModal(false)}
        onSave={handleSaveMasterData}
        title={`${masterDataModalMode === 'add' ? 'Tambah' : 'Edit'} Unit ${masterDataModalType === 'internal' ? 'Internal' : 'Eksternal'}`}
        label={`Nama Unit ${masterDataModalType === 'internal' ? 'Internal' : 'Eksternal'}`}
        initialValue={masterDataModalValue}
        mode={masterDataModalMode}
      />
    </div>
  );
};

export default AddSuratModal;
