// src/types/monitoringCapaian.ts
// Type definitions for Monitoring Capaian Realisasi Anggaran & AJK

export type StatusCapaian = 'Sesuai Target' | 'Perlu Perhatian' | 'Perlu Intervensi';

export interface JadwalMingguan {
  okt2?: number;
  okt3?: number;
  okt4?: number;
  nov1?: number;
  nov2?: number;
  nov3?: number;
  nov4?: number;
  des1?: number;
  des2?: number;
  des3?: number;
  des4?: number;
}

export interface CapaianRO {
  id: string;
  satkerId: string;
  satkerNama: string;
  unitKerjaId: string;
  unitKerjaNama: string;
  kodeKegiatan?: string;
  namaKegiatan?: string;
  kodeKro?: string;
  namaKro?: string;
  kodeRo: string;
  namaRo: string;
  pagu: number;
  realisasi: number;
  sisa: number;
  persentase: number; // e.g. 78.5 (%)
  status: StatusCapaian;
  jadwal: JadwalMingguan;
  totalKebutuhan?: number;
  danaTidakTerserap?: number;
  keterangan?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CapaianUnitKerja {
  id: string;
  satkerId: string;
  satkerNama: string;
  kode: string;
  nama: string;
  pagu: number;
  realisasi: number;
  sisa: number;
  persentase: number;
  status: StatusCapaian;
  roCount: number;
}

export interface CapaianSatker {
  id: string;
  kode: string;
  nama: string;
  pagu: number;
  realisasi: number;
  sisa: number;
  persentase: number;
  status: StatusCapaian;
  unitKerjaCount: number;
  roCount: number;
}

export interface CapaianKementerianSummary {
  totalPagu: number;
  totalRealisasi: number;
  totalSisa: number;
  persentaseNasional: number;
  countSesuaiTarget: number;    // >= 90% (Hijau)
  countPerluPerhatian: number;  // > 75% & < 90% (Kuning)
  countPerluIntervensi: number; // <= 75% (Merah)
  totalSatker: number;
  totalUnitKerja: number;
  totalRO: number;
}
