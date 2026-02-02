// src/utils/suratMappers.ts
// Utility functions for mapping surat data between database and frontend

import { Surat } from '../../types';

/**
 * Maps surat data from database format (snake_case) to frontend format (camelCase)
 */
export const mapSuratFromDB = (dbSurat: any): Surat => {
  return {
    id: dbSurat.id,
    jenisSurat: dbSurat.jenis_surat,
    nomorSurat: dbSurat.nomor_surat,
    tanggalSurat: dbSurat.tanggal_surat,
    hal: dbSurat.hal,
    asalSurat: dbSurat.asal_surat,
    tujuanSurat: dbSurat.tujuan_surat,
    tujuanSuratList: dbSurat.tujuan_surat_list, // JSONB array
    klasifikasiSurat: dbSurat.klasifikasi_surat,
    jenisNaskah: dbSurat.jenis_naskah,
    sifatSurat: dbSurat.sifat_surat,
    bidangTugas: dbSurat.bidang_tugas,
    tanggalDiterima: dbSurat.tanggal_diterima,
    tanggalDikirim: dbSurat.tanggal_dikirim,
    disposisi: dbSurat.disposisi,
    hasilTindakLanjut: dbSurat.hasil_tindak_lanjut,
    fileSurat: dbSurat.file_surat,
    meetingId: dbSurat.meeting_id,
    tanggalKegiatan: dbSurat.tanggal_kegiatan,
    waktuMulai: dbSurat.waktu_mulai,
    waktuSelesai: dbSurat.waktu_selesai,
    // Disposisi information from view
    disposisiCount: dbSurat.disposisi_count,
    disposisiStatus: dbSurat.disposisi_status,
    hasDisposisi: dbSurat.has_disposisi,
    createdBy: dbSurat.created_by,
    createdAt: dbSurat.created_at,
    updatedAt: dbSurat.updated_at
  };
};

/**
 * Maps multiple surat records from database format to frontend format
 */
export const mapSuratsFromDB = (dbSurats: any[]): Surat[] => {
  return dbSurats.map(mapSuratFromDB);
};
