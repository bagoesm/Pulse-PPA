// src/components/SuratViewModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, FileText, Calendar, Building2, Link2, ExternalLink, Save, Upload, Users, Eye, Unlink, Search, Plus } from 'lucide-react';
import { Surat, Meeting, Disposisi, User } from '../../types';
import { supabase } from '../lib/supabaseClient';
import { LinkingService } from '../services/LinkingService';
import { getAttachmentUrl } from '../utils/storageUtils';
import { useLinkedKegiatanDisposisi } from '../hooks/useLinkedKegiatanDisposisi';
import { useMasterData } from '../contexts/MasterDataContext';
import { useMasterDataCRUD } from '../hooks/useMasterDataCRUD';
import SearchableSelect from './SearchableSelect';
import SearchableSelectWithActions from './SearchableSelectWithActions';
import MultiSelectChip from './MultiSelectChip';
import DisposisiModal from './DisposisiModal';
import MeetingViewModal from './MeetingViewModal';
import ConfirmModal from './ConfirmModal';

interface SuratViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  surat: Surat | null;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  currentUserName: string;
  currentUser: User | null;
  users: User[];
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUnlinkFromKegiatan?: (suratId: string, kegiatanId: string) => Promise<void>;
}

const SuratViewModal: React.FC<SuratViewModalProps> = ({
  isOpen,
  onClose,
  surat,
  onUpdate,
  onDelete,
  currentUserName,
  currentUser,
  users,
  showNotification,
  onUnlinkFromKegiatan
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Get master data from context
  const {
    unitInternalList,
    unitEksternalList,
    sifatSuratList,
    jenisNaskahList,
    klasifikasiSuratList,
    bidangTugasList
  } = useMasterData();

  const { addMasterData, editMasterData, deleteMasterData, canDeleteMasterData } = useMasterDataCRUD();

  // Edit form state - MUST BE BEFORE HOOK
  const [editData, setEditData] = useState<Partial<Surat>>({});

  // Use optimized hook for linked data - SOLVES N+1 QUERY PROBLEM
  const {
    kegiatan: linkedKegiatan,
    disposisi: disposisiList,
    isLoading: isLoadingDisposisi,
    refetch: refetchLinkedData,
  } = useLinkedKegiatanDisposisi(
    surat?.id,
    surat?.meetingId || editData.meetingId,
    isOpen && !!(surat?.meetingId || editData.meetingId)
  );

  const [selectedDisposisi, setSelectedDisposisi] = useState<Disposisi | null>(null);
  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showCreateDisposisiModal, setShowCreateDisposisiModal] = useState(false);

  // Confirm modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => { }
  });

  // Edit linking state
  const [showLinkingSection, setShowLinkingSection] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingForLink, setSelectedMeetingForLink] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [meetingSearch, setMeetingSearch] = useState('');
  // Disposisi fields for linking
  const [linkDisposisiText, setLinkDisposisiText] = useState('');
  const [linkDisposisiAssignees, setLinkDisposisiAssignees] = useState<string[]>([]);
  const [linkDisposisiDeadline, setLinkDisposisiDeadline] = useState('');

  // Fetch available meetings for linking
  const fetchAvailableMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedMeetings: Meeting[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          type: row.type,
          description: row.description,
          date: row.date,
          endDate: row.end_date,
          startTime: row.start_time,
          endTime: row.end_time,
          location: row.location,
          isOnline: row.is_online,
          onlineLink: row.online_link,
          inviter: row.inviter,
          invitees: row.invitees || [],
          pic: row.pic || [],
          projectId: row.project_id,
          suratUndangan: row.surat_undangan,
          suratTugas: row.surat_tugas,
          laporan: row.laporan,
          attachments: row.attachments || [],
          links: row.links || [],
          comments: row.comments || [],
          notes: row.notes,
          status: row.status,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setAvailableMeetings(mappedMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      showNotification('Gagal Memuat Kegiatan', 'Tidak dapat memuat daftar kegiatan', 'error');
    }
  };

  useEffect(() => {
    if (surat) {
      setEditData(surat);

      // Refresh file URL
      if (surat.fileSurat && !surat.fileSurat.isLink) {
        getAttachmentUrl(surat.fileSurat).then(url => setFileUrl(url));
      } else if (surat.fileSurat?.isLink) {
        setFileUrl(surat.fileSurat.url || '');
      }

      // Note: Linked data is now handled by useLinkedKegiatanDisposisi hook
      // No need for manual fetchLinkedKegiatanAndDisposisi call
    }
  }, [surat]);

  // Load meetings when linking section is shown
  useEffect(() => {
    if (showLinkingSection && availableMeetings.length === 0) {
      fetchAvailableMeetings();
    }
  }, [showLinkingSection, availableMeetings.length]);

  // Note: fetchLinkedKegiatanAndDisposisi removed - now using useLinkedKegiatanDisposisi hook

  // Handle linking surat to kegiatan
  const handleLinkToKegiatan = async () => {
    if (!surat || !selectedMeetingForLink) {
      showNotification('Pilih Kegiatan', 'Mohon pilih kegiatan yang akan di-link', 'warning');
      return;
    }

    // Validate disposisi fields
    if (!linkDisposisiText.trim()) {
      showNotification('Disposisi Wajib Diisi', 'Disposisi harus diisi saat menghubungkan Surat dengan Kegiatan', 'warning');
      return;
    }
    if (linkDisposisiAssignees.length === 0) {
      showNotification('Assignee Belum Dipilih', 'Pilih minimal satu assignee untuk Disposisi', 'warning');
      return;
    }

    setIsLinking(true);
    try {
      // Use LinkingService for proper validation, audit trail, and notifications
      const linkingService = new LinkingService();
      await linkingService.linkSuratToKegiatan(
        surat.id,
        selectedMeetingForLink,
        {
          assignees: linkDisposisiAssignees,
          disposisiText: linkDisposisiText,
          deadline: linkDisposisiDeadline || undefined,
          createdBy: currentUser?.id || currentUserName,
          currentUser: currentUser || undefined,
        }
      );

      showNotification('Berhasil', 'Surat berhasil di-link ke Kegiatan dengan Disposisi', 'success');
      setShowLinkingSection(false);
      setSelectedMeetingForLink('');
      setMeetingSearch('');
      setLinkDisposisiText('');
      setLinkDisposisiAssignees([]);
      setLinkDisposisiDeadline('');

      // Exit edit mode to show linked kegiatan
      setIsEditing(false);

      // Refresh parent component (this will re-fetch all surats)
      onUpdate();

      // Update editData with the new meetingId
      setEditData(prev => ({ ...prev, meetingId: selectedMeetingForLink }));

      // Refresh linked data using hook
      await refetchLinkedData();
    } catch (error: any) {
      console.error('Error linking to kegiatan:', error);
      showNotification('Gagal Link', error.message || 'Gagal menghubungkan ke Kegiatan', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen || !surat) return null;

  const handleUnlinkFromKegiatan = async () => {
    if (!surat.meetingId || !onUnlinkFromKegiatan) return;

    setConfirmModalConfig({
      title: 'Putuskan Link Surat-Kegiatan',
      message: 'Apakah Anda yakin ingin memutuskan link antara Surat dan Kegiatan? Semua Disposisi terkait akan dihapus.',
      type: 'warning',
      onConfirm: async () => {
        try {
          await onUnlinkFromKegiatan(surat.id, surat.meetingId!);
          showNotification('Link Diputus', 'Surat berhasil diputus dari Kegiatan', 'success');
          // Data will be automatically updated by the hook when meetingId changes
          onUpdate();
        } catch (error: any) {
          showNotification('Gagal Memutus Link', error.message, 'error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleViewDisposisi = (disposisi: Disposisi) => {
    setSelectedDisposisi(disposisi);
    setShowDisposisiModal(true);
  };

  const handleDisposisiModalClose = () => {
    setShowDisposisiModal(false);
    setSelectedDisposisi(null);
  };

  const handleCreateDisposisiModalClose = () => {
    setShowCreateDisposisiModal(false);
  };

  const handleDisposisiSave = async (disposisiData: Omit<Disposisi, 'id' | 'createdAt'>) => {
    try {
      if (selectedDisposisi) {
        // Update existing disposisi
        const updateData: any = {
          disposisi_text: disposisiData.disposisiText,
          status: disposisiData.status,
          deadline: disposisiData.deadline,
          laporan: disposisiData.laporan,
          attachments: disposisiData.attachments,
          notes: disposisiData.notes,
          updated_at: new Date().toISOString(),
          completed_at: disposisiData.completedAt,
          completed_by: disposisiData.completedBy,
        };

        const { error } = await supabase
          .from('disposisi')
          .update(updateData)
          .eq('id', selectedDisposisi.id);

        if (error) throw error;

        // Refresh disposisi list using hook
        if (surat.meetingId) {
          await refetchLinkedData();
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleCreateDisposisiSave = async (disposisiData: Omit<Disposisi, 'id' | 'createdAt'>) => {
    try {
      // Create new disposisi
      const insertData: any = {
        surat_id: disposisiData.suratId,
        kegiatan_id: disposisiData.kegiatanId,
        assigned_to: disposisiData.assignedTo,
        disposisi_text: disposisiData.disposisiText,
        status: disposisiData.status || 'Pending',
        deadline: disposisiData.deadline,
        laporan: disposisiData.laporan || [],
        attachments: disposisiData.attachments || [],
        notes: disposisiData.notes,
        created_by: disposisiData.createdBy,
        created_by_id: currentUser?.id || null,
      };

      const { error } = await supabase
        .from('disposisi')
        .insert(insertData);

      if (error) throw error;

      showNotification('Disposisi Dibuat', 'Disposisi berhasil dibuat', 'success');

      // Refresh disposisi list using hook
      if (surat.meetingId) {
        await refetchLinkedData();
      }

      // Trigger update to refresh parent components
      onUpdate();
    } catch (error: any) {
      throw error;
    }
  };

  const handleRemoveAssignee = async (disposisi: Disposisi) => {
    const assigneeName = getUserName(disposisi.assignedTo);

    setConfirmModalConfig({
      title: 'Hapus Disposisi',
      message: `Apakah Anda yakin ingin menghapus disposisi untuk ${assigneeName}?\n\nDisposisi untuk assignee lain akan tetap dipertahankan.\n\nTindakan ini tidak dapat dibatalkan.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          // Check authorization
          if (!currentUser) {
            throw new Error('You must be logged in to remove assignee');
          }

          const canDelete =
            currentUser.role === 'Super Admin' ||
            currentUser.id === disposisi.createdBy ||
            currentUser.name === disposisi.createdBy;

          if (!canDelete) {
            throw new Error('You do not have permission to remove this assignee. Only the creator or Super Admin can remove assignees.');
          }

          // Delete the specific disposisi record
          const { error } = await supabase
            .from('disposisi')
            .delete()
            .eq('id', disposisi.id);

          if (error) throw error;

          // Create audit trail for removal
          await supabase
            .from('disposisi_history')
            .insert({
              disposisi_id: disposisi.id,
              action: 'assignee_removed',
              old_value: assigneeName,
              new_value: 'Disposisi deleted',
              performed_by: currentUser.id || currentUser.name,
              performed_by_id: currentUser.id || null,
              performed_at: new Date().toISOString(),
            });

          showNotification(
            'Assignee Dihapus',
            `Disposisi untuk ${assigneeName} berhasil dihapus`,
            'success'
          );

          // Refresh disposisi list using hook
          if (surat.meetingId) {
            await refetchLinkedData();
          }

          // Trigger update to refresh parent components
          onUpdate();
        } catch (error: any) {
          console.error('Error removing assignee:', error);
          showNotification('Gagal Menghapus Assignee', error.message, 'error');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId;
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(surat);
    setNewFile(null);
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewFile(file);
  };

  const handleAddLink = () => {
    if (!linkUrl || !linkTitle) {
      showNotification('Link Tidak Lengkap', 'Mohon isi judul dan URL link', 'warning');
      return;
    }

    const linkAttachment = {
      id: `link_${Date.now()}`,
      name: linkTitle,
      size: 0,
      type: 'link',
      path: '',
      url: linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`,
      isLink: true
    };

    setEditData(prev => ({ ...prev, fileSurat: linkAttachment }));
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkTitle('');
  };

  const handleSave = async () => {
    if (!editData.nomorSurat || !editData.tanggalSurat || !editData.jenisSurat) {
      showNotification('Data Tidak Lengkap', 'Nomor surat, tanggal surat, dan jenis surat wajib diisi', 'warning');
      return;
    }

    setIsSaving(true);
    let uploadedFilePath: string | null = null;

    try {
      let fileSurat = editData.fileSurat;

      // Handle new file upload
      if (newFile) {
        setIsUploading(true);
        const fileExt = newFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        uploadedFilePath = filePath;

        const { error: uploadError } = await supabase.storage
          .from('attachment')
          .upload(filePath, newFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachment')
          .getPublicUrl(filePath);

        // Delete old file if exists and not a link
        if (surat.fileSurat && !surat.fileSurat.isLink && surat.fileSurat.path) {
          try {
            await supabase.storage.from('attachment').remove([surat.fileSurat.path]);
          } catch (error) {
            console.error('Error deleting old file:', error);
          }
        }

        fileSurat = {
          id: `file_${Date.now()}`,
          name: newFile.name,
          size: newFile.size,
          type: newFile.type,
          path: filePath,
          url: publicUrl,
          isLink: false
        };
        setIsUploading(false);
      }

      const payload = {
        jenis_surat: editData.jenisSurat,
        nomor_surat: editData.nomorSurat,
        tanggal_surat: editData.tanggalSurat,
        hal: editData.hal || null,
        asal_surat: editData.jenisSurat === 'Masuk' ? (editData.asalSurat || null) : null,
        tujuan_surat: editData.jenisSurat === 'Keluar' ? (editData.tujuanSurat || null) : null,
        klasifikasi_surat: editData.klasifikasiSurat || null,
        jenis_naskah: editData.jenisNaskah || null,
        sifat_surat: editData.sifatSurat || null,
        bidang_tugas: editData.bidangTugas || null,
        tanggal_diterima: editData.jenisSurat === 'Masuk' ? (editData.tanggalDiterima || null) : null,
        tanggal_dikirim: editData.jenisSurat === 'Keluar' ? (editData.tanggalDikirim || null) : null,
        disposisi: editData.jenisSurat === 'Masuk' ? (editData.disposisi || null) : null,
        catatan: editData.catatan || null,
        hasil_tindak_lanjut: editData.hasilTindakLanjut || null,
        file_surat: fileSurat,
        tanggal_kegiatan: editData.tanggalKegiatan || null,
        waktu_mulai: editData.tanggalKegiatan ? editData.waktuMulai : null,
        waktu_selesai: editData.tanggalKegiatan ? editData.waktuSelesai : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('surats')
        .update(payload)
        .eq('id', surat.id);

      if (error) throw error;

      // Sync to linked meeting if exists
      if (surat.meetingId || editData.meetingId) {
        try {
          const meetingId = editData.meetingId || surat.meetingId;

          // Prepare meeting update payload with surat details
          const meetingPayload: any = {
            jenis_surat: editData.jenisSurat,
            nomor_surat: editData.nomorSurat,
            tanggal_surat: editData.tanggalSurat,
            hal: editData.hal || null,
            asal_surat: editData.asalSurat || null,
            tujuan_surat: editData.tujuanSurat || null,
            klasifikasi_surat: editData.klasifikasiSurat || null,
            jenis_naskah: editData.jenisNaskah || null,
            bidang_tugas: editData.bidangTugas || null,
            catatan: editData.catatan || null,
            updated_at: new Date().toISOString()
          };

          // Update surat file attachment in meeting
          if (fileSurat) {
            if (editData.jenisSurat === 'Masuk') {
              meetingPayload.surat_undangan = fileSurat;
            } else if (editData.jenisSurat === 'Keluar') {
              meetingPayload.surat_tugas = fileSurat;
            }
          }

          const { error: meetingError } = await supabase
            .from('meetings')
            .update(meetingPayload)
            .eq('id', meetingId);

          if (meetingError) {
            console.error('Error syncing to meeting:', meetingError);
            showNotification(
              'Surat Diupdate, Meeting Gagal Sync',
              'Surat berhasil diupdate, tapi gagal sync ke kegiatan terhubung',
              'warning'
            );
          } else {
            showNotification(
              'Surat & Kegiatan Berhasil Diupdate',
              `Surat ${editData.nomorSurat} dan kegiatan terhubung berhasil diperbarui`,
              'success'
            );
          }
        } catch (syncError) {
          console.error('Error syncing to meeting:', syncError);
          showNotification(
            'Surat Diupdate, Meeting Gagal Sync',
            'Surat berhasil diupdate, tapi gagal sync ke kegiatan terhubung',
            'warning'
          );
        }
      } else {
        showNotification('Surat Berhasil Diupdate', `Surat ${editData.nomorSurat} berhasil diperbarui`, 'success');
      }

      setIsEditing(false);
      setNewFile(null);
      onUpdate();
    } catch (error: any) {
      // Cleanup uploaded file if save failed
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('attachment').remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      showNotification('Gagal Update Surat', error.message, 'error');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Import cleanup utilities dynamically
      const { getDisposisiForSurat, formatDisposisiWarning, deleteSuratWithCleanup } = await import('../utils/disposisiCleanup');

      // Get related Disposisi to show warning
      const relatedDisposisi = await getDisposisiForSurat(surat.id);
      const warning = formatDisposisiWarning(relatedDisposisi);

      // Show confirmation dialog with Disposisi warning
      const confirmMessage = `Hapus surat ${surat.nomorSurat}? Tindakan ini tidak dapat dibatalkan.${warning}`;

      setConfirmModalConfig({
        title: 'Hapus Surat',
        message: confirmMessage,
        type: 'error',
        onConfirm: async () => {
          try {
            // Delete with cleanup
            await deleteSuratWithCleanup(surat.id);

            onDelete(surat.id);
            onClose();
          } catch (error: any) {
            console.error('Error deleting surat:', error);
            showNotification('Gagal Menghapus', `Gagal menghapus surat: ${error.message}`, 'error');
          }
        }
      });
      setShowConfirmModal(true);
    } catch (error: any) {
      console.error('Error preparing delete:', error);
      showNotification('Gagal Menghapus', `Gagal menghapus surat: ${error.message}`, 'error');
    }
  };

  const renderField = (label: string, value: string | undefined, field: keyof Surat, type: 'text' | 'date' | 'time' | 'textarea' = 'text') => {
    if (isEditing) {
      if (type === 'textarea') {
        return (
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</label>
            <textarea
              value={(editData[field] as string) || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
              rows={3}
            />
          </div>
        );
      }
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</label>
          <input
            type={type}
            value={(editData[field] as string) || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
          />
        </div>
      );
    }

    return value ? (
      <div className="bg-white p-3 rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">{label}</p>
        <p className="text-slate-700 whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h3 className="text-xl font-bold">{isEditing ? 'Edit Surat' : 'Detail Surat'}</h3>
                <p className="text-sm text-gov-100 mt-0.5">{surat.nomorSurat}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Jenis Surat - Editable */}
            {isEditing ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Jenis Surat</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, jenisSurat: 'Masuk' }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${editData.jenisSurat === 'Masuk'
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Surat Masuk</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditData(prev => ({ ...prev, jenisSurat: 'Keluar' }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${editData.jenisSurat === 'Keluar'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="text-sm font-semibold text-slate-700">Surat Keluar</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center text-sm font-semibold px-4 py-2 rounded-full ${surat.jenisSurat === 'Masuk'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
                  }`}>
                  {surat.jenisSurat}
                </span>
                {surat.jenisNaskah && (
                  <span className="text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                    {surat.jenisNaskah}
                  </span>
                )}
                {surat.sifatSurat && (
                  <span className="text-sm text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full">
                    {surat.sifatSurat}
                  </span>
                )}
              </div>
            )}

            {/* Jenis Naskah & Sifat Surat - Editable */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Jenis Naskah</label>
                  <SearchableSelect
                    options={jenisNaskahList.map(j => ({ value: j, label: j }))}
                    value={editData.jenisNaskah || ''}
                    onChange={(value) => setEditData(prev => ({ ...prev, jenisNaskah: value }))}
                    placeholder="Cari jenis naskah..."
                    emptyOption="-- Pilih Jenis --"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Sifat Surat</label>
                  <SearchableSelect
                    options={sifatSuratList.map(s => ({ value: s, label: s }))}
                    value={editData.sifatSurat || ''}
                    onChange={(value) => setEditData(prev => ({ ...prev, sifatSurat: value }))}
                    placeholder="Cari sifat surat..."
                    emptyOption="-- Pilih Sifat --"
                  />
                </div>
              </div>
            )}

            {/* File Surat - Editable */}
            {isEditing ? (
              <div className="bg-gov-50 border border-gov-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gov-700 uppercase mb-3">Dokumen Surat</p>

                {/* Current File */}
                {editData.fileSurat && !newFile && (
                  <div className="mb-3 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      {editData.fileSurat.isLink ? <Link2 size={16} className="text-gov-600" /> : <FileText size={16} className="text-gov-600" />}
                      <span className="text-sm font-medium text-slate-700">{editData.fileSurat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditData(prev => ({ ...prev, fileSurat: undefined }))}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                {/* New File Preview */}
                {newFile && (
                  <div className="mb-3 flex items-center justify-between bg-white p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-green-600" />
                      <span className="text-sm font-medium text-slate-700">{newFile.name}</span>
                      <span className="text-xs text-green-600">(Baru)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Batal
                    </button>
                  </div>
                )}

                {/* Upload Options */}
                {!editData.fileSurat && !newFile && !showLinkInput && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <div className="py-3 border-2 border-dashed border-slate-300 rounded-lg text-center text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors">
                        Upload File Baru
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(true)}
                      className="py-3 border border-slate-300 rounded-lg text-sm text-slate-600 hover:border-gov-400 hover:text-gov-600 hover:bg-white transition-colors"
                    >
                      Tambah Link
                    </button>
                  </div>
                )}

                {/* Link Input */}
                {showLinkInput && (
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-300">
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Judul dokumen..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="flex-1 py-2 bg-gov-600 text-white rounded-lg text-sm font-medium hover:bg-gov-700"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkInput(false);
                          setLinkUrl('');
                          setLinkTitle('');
                        }}
                        className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* View Mode File */
              surat.fileSurat && (
                <div className="bg-gov-50 border border-gov-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gov-700 uppercase mb-2">Dokumen Surat</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {surat.fileSurat.isLink ? <Link2 size={18} className="text-gov-600" /> : <FileText size={18} className="text-gov-600" />}
                      <span className="text-sm font-medium text-slate-700">{surat.fileSurat.name}</span>
                    </div>
                    <a
                      href={fileUrl || surat.fileSurat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors text-sm font-medium"
                    >
                      {surat.fileSurat.isLink ? <ExternalLink size={14} /> : <FileText size={14} />}
                      Buka
                    </a>
                  </div>
                </div>
              )
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Nomor Surat', surat.nomorSurat, 'nomorSurat')}
              {renderField('Tanggal Surat', surat.tanggalSurat, 'tanggalSurat', 'date')}
            </div>

            {renderField('Hal / Perihal', surat.hal, 'hal')}

            {/* Catatan Tambahan (View & Edit Mode) */}
            <div className="col-span-1 md:col-span-2 mt-2">
              {isEditing ? (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Catatan
                  </label>
                  <textarea
                    value={editData.catatan || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, catatan: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-y min-h-[80px]"
                    placeholder="Tambahkan catatan khusus untuk surat ini..."
                    rows={3}
                  />
                </div>
              ) : surat.catatan ? (
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-800 uppercase mb-2 flex items-center gap-1.5">
                    <FileText size={14} />
                    Catatan
                  </p>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {surat.catatan}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Pengirim/Penerima */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surat.jenisSurat === 'Masuk' && (
                isEditing ? (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Dari (Pengirim)</label>
                    <SearchableSelectWithActions
                      options={[...unitInternalList.map(u => ({ value: u, label: `${u} (Internal)` })), ...unitEksternalList.map(u => ({ value: u, label: `${u} (Eksternal)` }))]}
                      value={editData.asalSurat || ''}
                      onChange={(value) => setEditData(prev => ({ ...prev, asalSurat: value }))}
                      placeholder="Cari unit..."
                      emptyOption="-- Pilih Unit --"
                      tableName="Unit"
                    />
                  </div>
                ) : (
                  renderField('Dari (Pengirim)', surat.asalSurat, 'asalSurat')
                )
              )}
              {surat.jenisSurat === 'Keluar' && (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Kepada (Penerima)
                  </label>
                  {surat.tujuanSuratList && surat.tujuanSuratList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {surat.tujuanSuratList.map((recipient, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${recipient.type === 'Internal'
                            ? 'bg-gov-100 text-gov-700 border border-gov-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                        >
                          <span className="opacity-60 text-[10px]">{recipient.type}:</span>
                          {recipient.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700">{surat.tujuanSurat || '-'}</p>
                  )}
                </div>
              )}
              {isEditing ? (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Bidang Tugas</label>
                  <SearchableSelectWithActions
                    options={bidangTugasList.map(b => ({ value: b, label: b }))}
                    value={editData.bidangTugas || ''}
                    onChange={(value) => setEditData(prev => ({ ...prev, bidangTugas: value }))}
                    placeholder="Cari bidang tugas..."
                    emptyOption="-- Pilih Bidang Tugas --"
                    onAdd={async (value) => await addMasterData('bidang_tugas', value)}
                    onEdit={async (oldValue, newValue) => await editMasterData('bidang_tugas', oldValue, newValue)}
                    onDelete={async (value) => await deleteMasterData('bidang_tugas', value)}
                    canDelete={async (value) => await canDeleteMasterData('bidang_tugas', value)}
                    tableName="Bidang Tugas"
                  />
                </div>
              ) : (
                renderField('Bidang Tugas', surat.bidangTugas, 'bidangTugas')
              )}
            </div>

            {/* Klasifikasi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditing ? (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Klasifikasi Surat</label>
                  <SearchableSelectWithActions
                    options={klasifikasiSuratList.map(k => ({ value: k, label: k }))}
                    value={editData.klasifikasiSurat || ''}
                    onChange={(value) => setEditData(prev => ({ ...prev, klasifikasiSurat: value }))}
                    placeholder="Cari klasifikasi..."
                    emptyOption="-- Pilih Klasifikasi --"
                    onAdd={async (value) => await addMasterData('klasifikasi_surat', value)}
                    onEdit={async (oldValue, newValue) => await editMasterData('klasifikasi_surat', oldValue, newValue)}
                    onDelete={async (value) => await deleteMasterData('klasifikasi_surat', value)}
                    canDelete={async (value) => await canDeleteMasterData('klasifikasi_surat', value)}
                    tableName="Klasifikasi Surat"
                  />
                </div>
              ) : (
                renderField('Klasifikasi Surat', surat.klasifikasiSurat, 'klasifikasiSurat')
              )}
              {surat.jenisSurat === 'Masuk' && renderField('Tanggal Diterima', surat.tanggalDiterima, 'tanggalDiterima', 'date')}
              {surat.jenisSurat === 'Keluar' && renderField('Tanggal Dikirim', surat.tanggalDikirim, 'tanggalDikirim', 'date')}
            </div>

            {/* Link to Kegiatan Section - Only in Edit Mode and if not already linked */}
            {isEditing && !editData.meetingId && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 size={20} className="text-blue-600" />
                    <h4 className="text-base font-bold text-blue-900">Link ke Kegiatan (Opsional)</h4>
                  </div>
                  {!showLinkingSection && (
                    <button
                      type="button"
                      onClick={() => setShowLinkingSection(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Tambah Link
                    </button>
                  )}
                </div>

                {showLinkingSection && (
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

                      {/* Filtered Meetings List */}
                      <div className="max-h-60 overflow-y-auto border border-slate-300 rounded-lg">
                        {availableMeetings
                          .filter(meeting =>
                            meeting.title.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                            meeting.location.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                            new Date(meeting.date).toLocaleDateString('id-ID').includes(meetingSearch)
                          )
                          .map(meeting => (
                            <button
                              key={meeting.id}
                              type="button"
                              onClick={() => setSelectedMeetingForLink(meeting.id)}
                              className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-200 last:border-b-0 ${selectedMeetingForLink === meeting.id ? 'bg-blue-100' : ''
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 truncate">{meeting.title}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} />
                                      {new Date(meeting.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Building2 size={12} />
                                      {meeting.location}
                                    </span>
                                  </div>
                                </div>
                                {selectedMeetingForLink === meeting.id && (
                                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        {availableMeetings.filter(meeting =>
                          meeting.title.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                          meeting.location.toLowerCase().includes(meetingSearch.toLowerCase()) ||
                          new Date(meeting.date).toLocaleDateString('id-ID').includes(meetingSearch)
                        ).length === 0 && (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                              Tidak ada kegiatan ditemukan
                            </div>
                          )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1.5">
                        Pilih kegiatan yang terkait dengan surat ini
                      </p>
                    </div>

                    {/* Disposisi Fields (mandatory when linking) */}
                    {selectedMeetingForLink && (
                      <div className="space-y-3 border-t border-blue-200 pt-3">
                        <p className="text-sm font-semibold text-blue-800">Disposisi (Wajib)</p>

                        {/* Disposisi Text */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Isi Disposisi <span className="text-red-500">*</span></label>
                          <textarea
                            value={linkDisposisiText}
                            onChange={(e) => setLinkDisposisiText(e.target.value)}
                            placeholder="Isi disposisi..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Assignees */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Assignee <span className="text-red-500">*</span></label>
                          <MultiSelectChip
                            options={users.map(u => ({ value: u.id, label: u.name }))}
                            value={linkDisposisiAssignees}
                            onChange={setLinkDisposisiAssignees}
                            placeholder="Pilih assignee..."
                          />
                        </div>

                        {/* Deadline */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline (Opsional)</label>
                          <input
                            type="date"
                            value={linkDisposisiDeadline}
                            onChange={(e) => setLinkDisposisiDeadline(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkingSection(false);
                          setSelectedMeetingForLink('');
                          setMeetingSearch('');
                        }}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleLinkToKegiatan}
                        disabled={isLinking || !selectedMeetingForLink}
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
                )}

                {!showLinkingSection && (
                  <p className="text-sm text-blue-700">
                    Hubungkan surat ini ke kegiatan untuk membuat disposisi dan tracking
                  </p>
                )}
              </div>
            )}

            {/* Linked Kegiatan and Disposisi Section */}
            {surat.meetingId && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 size={20} className="text-purple-600" />
                    <h4 className="text-base font-bold text-purple-900">Linked Kegiatan & Disposisi</h4>
                  </div>
                  {onUnlinkFromKegiatan && isEditing && (
                    <button
                      onClick={handleUnlinkFromKegiatan}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      <Unlink size={14} />
                      Unlink
                    </button>
                  )}
                </div>

                {/* Linked Kegiatan Info */}
                {isLoadingDisposisi ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
                  </div>
                ) : linkedKegiatan ? (
                  <button
                    type="button"
                    onClick={() => setShowMeetingModal(true)}
                    className="w-full bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Kegiatan Terkait</p>
                        <h5 className="text-base font-bold text-slate-800">{linkedKegiatan.title}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${linkedKegiatan.type === 'internal' ? 'bg-blue-100 text-blue-700' :
                          linkedKegiatan.type === 'external' ? 'bg-green-100 text-green-700' :
                            linkedKegiatan.type === 'bimtek' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                          }`}>
                          {linkedKegiatan.type === 'internal' ? 'Internal' :
                            linkedKegiatan.type === 'external' ? 'Eksternal' :
                              linkedKegiatan.type === 'bimtek' ? 'Bimtek' :
                                linkedKegiatan.type === 'audiensi' ? 'Audiensi' :
                                  linkedKegiatan.type}
                        </span>
                        <Eye size={16} className="text-purple-600" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="text-purple-600" />
                        <span>{new Date(linkedKegiatan.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 size={14} className="text-purple-600" />
                        <span>{linkedKegiatan.location}</span>
                      </div>
                    </div>
                    {linkedKegiatan.pic && linkedKegiatan.pic.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">PIC</p>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedKegiatan.pic.map((picName, idx) => (
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
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-purple-200 text-center text-sm text-slate-500">
                    Kegiatan tidak ditemukan
                  </div>
                )}

                {/* Disposisi List */}
                {disposisiList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-purple-600" />
                        <h5 className="text-sm font-bold text-purple-900">
                          Disposisi Assignments ({disposisiList.length})
                        </h5>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setShowCreateDisposisiModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium"
                        >
                          <Plus size={14} />
                          Tambah Disposisi
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {disposisiList.map((disposisi) => (
                        <div
                          key={disposisi.id}
                          className="bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-800">
                                  {getUserName(disposisi.assignedTo)}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(disposisi.status)}`}>
                                  {disposisi.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">
                                {disposisi.disposisiText}
                              </p>
                            </div>
                            <div className="ml-3 flex gap-2 shrink-0">
                              <button
                                onClick={() => handleViewDisposisi(disposisi)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                                title="View Disposisi"
                              >
                                <Eye size={14} />
                                View
                              </button>
                              {!isEditing && (
                                <button
                                  onClick={() => handleRemoveAssignee(disposisi)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                                  title="Remove Assignee"
                                >
                                  <Trash2 size={14} />
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          {disposisi.deadline && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                              <Calendar size={12} />
                              <span>Deadline: {new Date(disposisi.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                          )}

                          {disposisi.laporan && disposisi.laporan.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                              <FileText size={12} />
                              <span>{disposisi.laporan.length} laporan uploaded</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {disposisiList.length === 0 && !isLoadingDisposisi && (
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-slate-500 text-center mb-3">Belum ada disposisi untuk link ini</p>
                    {isEditing && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowCreateDisposisiModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Plus size={16} />
                          Tambah Disposisi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Informasi Sistem</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Dibuat oleh:</span>
                  <span className="ml-2 font-medium text-slate-700">{surat.createdBy}</span>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal dibuat:</span>
                  <span className="ml-2 font-medium text-slate-700">
                    {new Date(surat.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <Trash2 size={16} />
            Hapus
          </button>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Simpan
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                >
                  Tutup
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Disposisi Modal */}
      {showDisposisiModal && selectedDisposisi && (
        <DisposisiModal
          isOpen={showDisposisiModal}
          onClose={handleDisposisiModalClose}
          onSave={handleDisposisiSave}
          initialData={selectedDisposisi}
          currentUser={currentUser}
          users={users}
          suratId={surat.id}
          kegiatanId={surat.meetingId}
          showNotification={showNotification}
        />
      )}

      {/* Meeting View Modal */}
      {showMeetingModal && linkedKegiatan && (
        <MeetingViewModal
          isOpen={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          meeting={linkedKegiatan}
          projects={[]} // Empty array since we don't need project context here
          canEdit={false} // View only from surat modal
          canDelete={false} // Cannot delete from surat modal
          onEdit={() => { }} // No-op
          onDelete={() => { }} // No-op
          onAddComment={async () => { }} // No-op
          onDeleteComment={async () => { }} // No-op
          currentUser={currentUser}
          allUsers={users}
        />
      )}

      {/* Create Disposisi Modal */}
      {showCreateDisposisiModal && surat.meetingId && (
        <DisposisiModal
          isOpen={showCreateDisposisiModal}
          onClose={handleCreateDisposisiModalClose}
          onSave={handleCreateDisposisiSave}
          initialData={null}
          currentUser={currentUser}
          users={users}
          suratId={surat.id}
          kegiatanId={surat.meetingId}
          showNotification={showNotification}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        type={confirmModalConfig.type}
        confirmText="Ya, Lanjutkan"
        cancelText="Batal"
      />
    </div>
  );
};

export default SuratViewModal;
