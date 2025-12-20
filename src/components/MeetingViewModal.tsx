// src/components/MeetingViewModal.tsx
import React from 'react';
import {
  X, Calendar, Clock, MapPin, Video, Users, Building2, Briefcase, FileText,
  Download, ExternalLink, Edit2, Trash2, GraduationCap, Link2
} from 'lucide-react';
import { Meeting, MeetingType, User, ProjectDefinition, Attachment } from '../../types';

interface MeetingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  projects: ProjectDefinition[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
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

const MeetingViewModal: React.FC<MeetingViewModalProps> = ({
  isOpen,
  onClose,
  meeting,
  projects,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !meeting) return null;

  const typeConfig = MEETING_TYPE_CONFIG[meeting.type];
  const statusConfig = STATUS_CONFIG[meeting.status];
  const TypeIcon = typeConfig.icon;
  const project = projects.find(p => p.id === meeting.projectId);

  const meetingDate = parseDateLocal(meeting.date);
  const formattedDate = `${DAYS[meetingDate.getDay()]}, ${meetingDate.getDate()} ${MONTHS[meetingDate.getMonth()]} ${meetingDate.getFullYear()}`;

  const renderAttachment = (label: string, attachment?: Attachment) => {
    if (!attachment) return null;
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gov-100 flex items-center justify-center">
            <FileText size={20} className="text-gov-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{label}</p>
            <p className="text-xs text-slate-500">{attachment.name} • {formatFileSize(attachment.size)}</p>
          </div>
        </div>
        {attachment.url && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <Download size={18} />
          </a>
        )}
      </div>
    );
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
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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
                <p className="text-sm font-medium text-slate-800">{meeting.startTime} - {meeting.endTime}</p>
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
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {/* Documents */}
          {(meeting.suratUndangan || meeting.suratTugas || meeting.laporan) && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Dokumen</p>
              <div className="space-y-2">
                {renderAttachment('Surat Undangan', meeting.suratUndangan)}
                {renderAttachment('Surat Tugas', meeting.suratTugas)}
                {renderAttachment('Laporan', meeting.laporan)}
              </div>
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
              <p className="text-sm text-yellow-800 whitespace-pre-wrap">{meeting.notes}</p>
            </div>
          )}

          {/* Meta Info */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            <p>Dibuat oleh: {meeting.createdBy}</p>
            <p>Tanggal dibuat: {new Date(meeting.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
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
