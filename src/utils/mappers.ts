// src/utils/mappers.ts
// Centralized data mappers to avoid duplication
import { Disposisi, Meeting, Surat, Attachment } from '../../types';

/**
 * Map database row to Disposisi interface
 * Used across: DisposisiContext, DisposisiService, SuratViewModal, DisposisiListView
 */
export const mapDisposisiFromDB = (row: any): Disposisi => {
  if (!row) return null as any;
  
  return {
    id: row.id,
    suratId: row.surat_id,
    kegiatanId: row.kegiatan_id,
    assignedTo: row.assigned_to,
    disposisiText: row.disposisi_text,
    status: row.status,
    deadline: row.deadline,
    laporan: row.laporan || [],
    attachments: row.attachments || [],
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    parentDisposisiId: row.parent_disposisi_id,
  };
};

/**
 * Map database row to Meeting interface
 * Used across: MeetingsContext, SuratViewModal, AddSuratModal
 */
export const mapMeetingFromDB = (row: any): Meeting => {
  if (!row) return null as any;
  
  // Get surat data from join if available
  const linkedSurat = row.linked_surat || row.surats;
  
  return {
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
    inviter: row.inviter || { id: '', name: '', organization: '' },
    invitees: row.invitees || [],
    pic: row.pic || [],
    projectId: row.project_id,
    suratUndangan: row.surat_undangan,
    suratTugas: row.surat_tugas,
    laporan: row.laporan,
    attachments: (row.attachments || []).map((att: any, idx: number) => ({
      ...att,
      id: att.id || `att_${row.id}_${idx}`
    })),
    links: (row.links || []).map((link: any, idx: number) => ({
      ...link,
      id: link.id || `link_${row.id}_${idx}`
    })),
    notes: row.notes,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments: row.comments || [],
    // Surat metadata fields (from join with surats table)
    jenisSurat: linkedSurat?.jenis_surat,
    nomorSurat: linkedSurat?.nomor_surat,
    hal: linkedSurat?.hal,
    asalSurat: linkedSurat?.asal_surat,
    tujuanSurat: linkedSurat?.tujuan_surat,
    klasifikasiSurat: linkedSurat?.klasifikasi_surat,
    jenisNaskah: linkedSurat?.jenis_naskah,
    tanggalSurat: linkedSurat?.tanggal_surat,
    bidangTugas: linkedSurat?.bidang_tugas,
    disposisi: linkedSurat?.disposisi,
    hasilTindakLanjut: linkedSurat?.hasil_tindak_lanjut,
    // Disposisi integration fields
    linkedSuratId: row.linked_surat_id,
    linkedSurat: linkedSurat ? mapSuratFromDB(linkedSurat) : undefined,
    hasDisposisi: row.has_disposisi,
    disposisiCount: row.disposisi_count,
    disposisiStatus: row.disposisi_status,
  };
};

/**
 * Map database row to Surat interface
 * Used across: SuratsContext, SuratListView, SuratViewModal
 */
export const mapSuratFromDB = (row: any): Surat => {
  if (!row) return null as any;
  
  return {
    id: row.id,
    jenisSurat: row.jenis_surat,
    nomorSurat: row.nomor_surat,
    tanggalSurat: row.tanggal_surat,
    hal: row.hal,
    asalSurat: row.asal_surat,
    tujuanSurat: row.tujuan_surat,
    klasifikasiSurat: row.klasifikasi_surat,
    jenisNaskah: row.jenis_naskah,
    sifatSurat: row.sifat_surat,
    bidangTugas: row.bidang_tugas,
    tanggalDiterima: row.tanggal_diterima,
    tanggalDikirim: row.tanggal_dikirim,
    disposisi: row.disposisi,
    hasilTindakLanjut: row.hasil_tindak_lanjut,
    fileSurat: row.file_surat,
    tanggalKegiatan: row.tanggal_kegiatan,
    waktuMulai: row.waktu_mulai,
    waktuSelesai: row.waktu_selesai,
    meetingId: row.meeting_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Disposisi integration fields from view
    hasDisposisi: row.has_disposisi,
    disposisiCount: row.disposisi_count,
    disposisiStatus: row.disposisi_status,
  };
};

/**
 * Batch map array of rows
 */
export const mappers = {
  disposisi: mapDisposisiFromDB,
  meeting: mapMeetingFromDB,
  surat: mapSuratFromDB,
  
  // Batch mappers
  disposisiList: (rows: any[]): Disposisi[] => rows?.map(mapDisposisiFromDB) || [],
  meetingList: (rows: any[]): Meeting[] => rows?.map(mapMeetingFromDB) || [],
  suratList: (rows: any[]): Surat[] => rows?.map(mapSuratFromDB) || [],
};
