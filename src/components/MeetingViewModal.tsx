import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, MapPin, Video, Users, Building2, Briefcase, FileText,
  Download, ExternalLink, Edit2, Trash2, GraduationCap, Link2, Send, MessageCircle
} from 'lucide-react';
import { Meeting, MeetingType, User, ProjectDefinition, Attachment, Comment } from '../../types';
import { getAttachmentUrl } from '../utils/storageUtils';
import { supabase } from '../lib/supabaseClient';

import UserAvatar from './UserAvatar';
import MentionInput, { renderMentionText, renderRichText } from './MentionInput';

interface MeetingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  projects: ProjectDefinition[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  currentUser: User | null;
  allUsers: User[];
}

const MEETING_TYPE_CONFIG: Record<MeetingType, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  internal: { label: 'Internal Kementerian', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Users },
  external: { label: 'Eksternal Kementerian', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Building2 },
  bimtek: { label: 'Bimtek', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: GraduationCap },
  audiensi: { label: 'Audiensi', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Briefcase },
};

const STATUS_CONFIG = {
  scheduled: { label: 'Terjadwal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ongoing: { label: 'Berlangsung', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Selesai', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  cancelled: { label: 'Dibatalkan', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Parse date string (YYYY-MM-DD) without timezone conversion
const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const CommentInput = ({ onAddComment, users }: { onAddComment: (content: string) => Promise<void>, users: User[] }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(content);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMentionSubmit = () => {
    handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="relative mt-4">
      <div className="relative">
        <MentionInput
          value={content}
          onChange={setContent}
          onSubmit={handleMentionSubmit}
          users={users}
          placeholder="Tulis komentar... Gunakan @ untuk mention"
          disabled={isSubmitting}
          className="pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
          dropdownPosition="top"
          rows={2}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="absolute right-2 bottom-2 p-1.5 text-gov-600 hover:bg-gov-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
};

type Tab = 'info' | 'activity' | 'comments';

const MeetingViewModal: React.FC<MeetingViewModalProps> = ({
  isOpen,
  onClose,
  meeting,
  projects,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onAddComment,
  onDeleteComment,
  currentUser,
  allUsers
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [refreshedAttachments, setRefreshedAttachments] = useState<{
    suratUndangan?: string;
    suratTugas?: string;
    laporan?: string;
  }>({});
  const [suratDetails, setSuratDetails] = useState<{
    jenisSurat?: string;
    nomorSurat?: string;
    tanggalSurat?: string;
    hal?: string;
    asalSurat?: string;
    tujuanSurat?: string;
    klasifikasiSurat?: string;
    jenisNaskah?: string;
    bidangTugas?: string;
    disposisi?: string;
    catatan?: string;
  }>({});

  // Fetch surat details if linkedSuratId exists
  useEffect(() => {
    if (!isOpen || !meeting || !meeting.linkedSuratId) return;

    const fetchSuratDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('surats')
          .select('jenis_surat, nomor_surat, tanggal_surat, hal, asal_surat, tujuan_surat, klasifikasi_surat, jenis_naskah, bidang_tugas, catatan')
          .eq('id', meeting.linkedSuratId)
          .single();

        if (error) throw error;

        if (data) {
          setSuratDetails({
            jenisSurat: data.jenis_surat,
            nomorSurat: data.nomor_surat,
            tanggalSurat: data.tanggal_surat,
            hal: data.hal,
            asalSurat: data.asal_surat,
            tujuanSurat: data.tujuan_surat,
            klasifikasiSurat: data.klasifikasi_surat,
            jenisNaskah: data.jenis_naskah,
            bidangTugas: data.bidang_tugas,
            catatan: data.catatan,
          });

          // Fetch disposisi text
          const { data: disposisiData, error: disposisiError } = await supabase
            .from('disposisi')
            .select('disposisi_text')
            .eq('kegiatan_id', meeting.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!disposisiError && disposisiData) {
            setSuratDetails(prev => ({ ...prev, disposisi: disposisiData.disposisi_text }));
          }
        }
      } catch (error) {
        console.error('Error fetching surat details:', error);
      }
    };

    fetchSuratDetails();
  }, [isOpen, meeting]);

  // Refresh signed URLs when modal opens
  useEffect(() => {
    if (!isOpen || !meeting) return;

    const refreshUrls = async () => {
      const urls: typeof refreshedAttachments = {};

      if (meeting.suratUndangan) {
        urls.suratUndangan = await getAttachmentUrl(meeting.suratUndangan);
      }
      if (meeting.suratTugas) {
        urls.suratTugas = await getAttachmentUrl(meeting.suratTugas);
      }
      if (meeting.laporan) {
        urls.laporan = await getAttachmentUrl(meeting.laporan);
      }

      setRefreshedAttachments(urls);
    };

    refreshUrls();
  }, [isOpen, meeting]);

  if (!isOpen || !meeting) return null;

  const typeConfig = MEETING_TYPE_CONFIG[meeting.type];
  const statusConfig = STATUS_CONFIG[meeting.status];
  const TypeIcon = typeConfig.icon;
  const project = projects.find(p => p.id === meeting.projectId);

  const meetingDate = parseDateLocal(meeting.date);
  const meetingEndDate = meeting.endDate ? parseDateLocal(meeting.endDate) : null;

  let formattedDate = `${DAYS[meetingDate.getDay()]}, ${meetingDate.getDate()} ${MONTHS[meetingDate.getMonth()]} ${meetingDate.getFullYear()}`;
  if (meetingEndDate && meeting.endDate !== meeting.date) {
    formattedDate = `${meetingDate.getDate()} ${MONTHS[meetingDate.getMonth()]} - ${meetingEndDate.getDate()} ${MONTHS[meetingEndDate.getMonth()]} ${meetingEndDate.getFullYear()}`;
    // If years are different
    if (meetingDate.getFullYear() !== meetingEndDate.getFullYear()) {
      formattedDate = `${meetingDate.getDate()} ${MONTHS[meetingDate.getMonth()]} ${meetingDate.getFullYear()} - ${meetingEndDate.getDate()} ${MONTHS[meetingEndDate.getMonth()]} ${meetingEndDate.getFullYear()}`;
    }
  }

  const renderAttachment = (label: string, attachment?: Attachment, refreshedUrl?: string) => {
    if (!attachment) return null;
    const isLink = attachment.isLink;
    const displayUrl = refreshedUrl || attachment.url;

    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gov-100 flex items-center justify-center">
            {isLink ? <Link2 size={20} className="text-gov-600" /> : <FileText size={20} className="text-gov-600" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{label}</p>
            <p className="text-xs text-slate-500">
              {attachment.name}
              {isLink ? ' • Link' : ` • ${formatFileSize(attachment.size)}`}
            </p>
          </div>
        </div>
        {displayUrl && (
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            {isLink ? <ExternalLink size={18} /> : <Download size={18} />}
          </a>
        )}
      </div>
    );
  };

  const getProfilePhoto = (userId: string, userName: string) => {
    const user = allUsers.find(u => u.name === userName || u.id === userId); // Fallback name check if ID not reliable from old comments
    return user?.profilePhoto;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-gov-50 to-slate-50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {/* Type & Status Badges */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                  <TypeIcon size={12} />
                  {typeConfig.label}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              {/* Title */}
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 line-clamp-2">
                {meeting.title}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'info' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Informasi
              {activeTab === 'info' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gov-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'activity' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Aktivitas
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gov-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'comments' ? 'text-gov-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Komentar
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'comments' ? 'bg-gov-100 text-gov-700' : 'bg-slate-100 text-slate-600'
                }`}>
                {meeting.comments?.length || 0}
              </span>
              {activeTab === 'comments' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gov-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Date & Time */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Tanggal</p>
                    <p className="text-sm font-medium text-slate-800">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Waktu</p>
                    <p className="text-sm font-medium text-slate-800">{meeting.startTime?.slice(0, 5)} - {meeting.endTime?.slice(0, 5)}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  {meeting.isOnline ? <Video size={20} className="text-emerald-600" /> : <MapPin size={20} className="text-emerald-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Lokasi</p>
                  {meeting.isOnline ? (
                    <div>
                      <p className="text-sm font-medium text-slate-800">Online Meeting</p>
                      {meeting.onlineLink && (
                        <a
                          href={meeting.onlineLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gov-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <ExternalLink size={14} />
                          Buka Link Meeting
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{meeting.location || '-'}</p>
                  )}
                </div>
              </div>

              {/* Inviter */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Yang Mengundang</p>
                  <p className="text-sm font-medium text-slate-800">{meeting.inviter.name}</p>
                  {meeting.inviter.organization && (
                    <p className="text-xs text-slate-500">{meeting.inviter.organization}</p>
                  )}
                </div>
              </div>

              {/* PIC */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">PIC</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {meeting.pic.map((name, i) => (
                      <span key={i} className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invitees */}
              {meeting.invitees && meeting.invitees.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Daftar Undangan</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {meeting.invitees.map((name, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Project */}
              {project && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gov-100 flex items-center justify-center shrink-0">
                    <Briefcase size={20} className="text-gov-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Project Terkait</p>
                    <p className="text-sm font-medium text-slate-800">{project.name}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {meeting.description && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Deskripsi / Agenda</p>
                  <div className="text-sm text-slate-700">
                    {renderRichText(meeting.description, allUsers)}
                  </div>
                </div>
              )}

              {/* Documents */}
              {(meeting.suratUndangan || meeting.suratTugas || meeting.laporan) && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Dokumen</p>
                  <div className="space-y-2">
                    {renderAttachment('Surat Undangan', meeting.suratUndangan, refreshedAttachments.suratUndangan)}
                    {renderAttachment('Surat Tugas', meeting.suratTugas, refreshedAttachments.suratTugas)}
                    {renderAttachment('Laporan', meeting.laporan, refreshedAttachments.laporan)}
                  </div>
                </div>
              )}

              {/* Detail Surat - Read-only display with better design */}
              {((suratDetails.nomorSurat || meeting.nomorSurat) ||
                (suratDetails.hal || meeting.hal) ||
                (suratDetails.asalSurat || meeting.asalSurat) ||
                (suratDetails.tujuanSurat || meeting.tujuanSurat) ||
                (suratDetails.klasifikasiSurat || meeting.klasifikasiSurat) ||
                (suratDetails.jenisNaskah || meeting.jenisNaskah) ||
                (suratDetails.tanggalSurat || meeting.tanggalSurat) ||
                (suratDetails.bidangTugas || meeting.bidangTugas) ||
                (suratDetails.disposisi || meeting.disposisi) ||
                suratDetails.catatan ||
                (suratDetails.jenisSurat || meeting.jenisSurat)) && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="text-blue-600" size={20} />
                      <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Detail Surat</h3>
                      <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        Read-only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Jenis Surat */}
                      {(suratDetails.jenisSurat || meeting.jenisSurat) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Jenis Surat
                          </label>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${(suratDetails.jenisSurat || meeting.jenisSurat) === 'Masuk'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}>
                              {(suratDetails.jenisSurat || meeting.jenisSurat) === 'Masuk' ? '📥 Surat Masuk' : '📤 Surat Keluar'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Nomor Surat */}
                      {(suratDetails.nomorSurat || meeting.nomorSurat) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Nomor Surat
                          </label>
                          <p className="text-sm font-semibold text-slate-800">{suratDetails.nomorSurat || meeting.nomorSurat}</p>
                        </div>
                      )}

                      {/* Tanggal Surat */}
                      {(suratDetails.tanggalSurat || meeting.tanggalSurat) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Tanggal Surat
                          </label>
                          <p className="text-sm font-semibold text-slate-800">
                            {new Date(suratDetails.tanggalSurat || meeting.tanggalSurat!).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}

                      {/* Jenis Naskah */}
                      {(suratDetails.jenisNaskah || meeting.jenisNaskah) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Jenis Naskah
                          </label>
                          <p className="text-sm font-semibold text-slate-800">{suratDetails.jenisNaskah || meeting.jenisNaskah}</p>
                        </div>
                      )}

                      {/* Klasifikasi Surat */}
                      {(suratDetails.klasifikasiSurat || meeting.klasifikasiSurat) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Klasifikasi
                          </label>
                          <p className="text-sm font-semibold text-slate-800">{suratDetails.klasifikasiSurat || meeting.klasifikasiSurat}</p>
                        </div>
                      )}

                      {/* Bidang Tugas */}
                      {(suratDetails.bidangTugas || meeting.bidangTugas) && (
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Bidang Tugas
                          </label>
                          <p className="text-sm font-semibold text-slate-800">{suratDetails.bidangTugas || meeting.bidangTugas}</p>
                        </div>
                      )}
                    </div>

                    {/* Hal/Perihal - Full width */}
                    {(suratDetails.hal || meeting.hal) && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Hal / Perihal
                        </label>
                        <p className="text-sm text-slate-800">{suratDetails.hal || meeting.hal}</p>
                      </div>
                    )}

                    {/* Catatan - Full width */}
                    {suratDetails.catatan && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 mt-2">
                        <label className="block text-xs font-semibold text-yellow-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <FileText size={14} className="text-yellow-600" />
                          Catatan Tambahan
                        </label>
                        <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed">{suratDetails.catatan}</p>
                      </div>
                    )}

                    {/* Asal/Tujuan Surat */}
                    {((suratDetails.asalSurat || meeting.asalSurat) || (suratDetails.tujuanSurat || meeting.tujuanSurat)) && (
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          {(suratDetails.jenisSurat || meeting.jenisSurat) === 'Keluar' ? '📤 Kepada (Penerima)' : '📥 Dari (Pengirim)'}
                        </label>
                        <p className="text-sm text-slate-800">
                          {(suratDetails.jenisSurat || meeting.jenisSurat) === 'Keluar'
                            ? (suratDetails.tujuanSurat || meeting.tujuanSurat)
                            : (suratDetails.asalSurat || meeting.asalSurat)}
                        </p>
                      </div>
                    )}

                    {/* Teks Disposisi - Only for Surat Masuk */}
                    {(suratDetails.jenisSurat || meeting.jenisSurat) === 'Masuk' && (suratDetails.disposisi || meeting.disposisi) && (
                      <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                        <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="text-lg">📋</span>
                          Teks Disposisi
                        </label>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {suratDetails.disposisi || meeting.disposisi}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Additional Attachments */}
              {meeting.attachments && meeting.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Lampiran Lainnya</p>
                  <div className="space-y-2">
                    {meeting.attachments.map((att, i) => (
                      <div key={att.id || i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-slate-500 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">{att.name}</span>
                          <span className="text-xs text-slate-400">({formatFileSize(att.size)})</span>
                        </div>
                        {att.url && (
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-200 rounded text-slate-500">
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {meeting.links && meeting.links.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Link Terkait</p>
                  <div className="space-y-2">
                    {meeting.links.map((link, i) => (
                      <a
                        key={link.id || i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-gov-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gov-100 flex items-center justify-center shrink-0">
                            <Link2 size={16} className="text-gov-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-gov-700">{link.title}</p>
                            <p className="text-xs text-slate-500 truncate">{link.url}</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-gov-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {meeting.notes && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                  <p className="text-xs text-yellow-700 uppercase font-semibold mb-2">Catatan</p>
                  <div className="text-sm text-yellow-800">
                    {renderRichText(meeting.notes, allUsers)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mt-1">
                    <Edit2 size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-800"><span className="font-semibold">{meeting.createdBy}</span> membuat jadwal ini.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(meeting.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {meeting.updatedAt && meeting.updatedAt !== meeting.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mt-1">
                      <Edit2 size={14} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">Terakhir diperbarui.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(meeting.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              {/* Scrollable comments area */}
              <div className="flex-1 space-y-4 overflow-y-auto min-h-0 max-h-[calc(90vh-320px)]">
                {(!meeting.comments || meeting.comments.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                    <MessageCircle size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Belum ada diskusi.</p>
                  </div>
                )}
                {meeting.comments && meeting.comments.length > 0 && meeting.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="shrink-0">
                      <UserAvatar
                        name={comment.userName}
                        profilePhoto={getProfilePhoto(comment.userId, comment.userName)}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{comment.userName}</p>
                        <span className="text-xs text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5 break-words bg-slate-50 p-2 rounded-br-xl rounded-bl-xl rounded-tr-xl">
                        {renderMentionText(comment.content, allUsers)}
                      </div>
                      {currentUser && comment.userId === currentUser.id && (
                        <div className="flex justify-end mt-1">
                          <button
                            onClick={() => onDeleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Comment Input */}
              {currentUser && (
                <div className="shrink-0 pt-4 border-t border-slate-100 bg-white">
                  <CommentInput onAddComment={onAddComment} users={allUsers} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          {canDelete ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 size={16} /> Hapus
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Tutup
            </button>
            {canEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 text-white rounded-lg text-sm font-bold hover:bg-gov-700 transition-colors"
              >
                <Edit2 size={16} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingViewModal;
