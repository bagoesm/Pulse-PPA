// src/services/MonitoringCapaianService.ts
// Service for Monitoring Capaian Realisasi Anggaran & Jadwal AJK

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabaseClient';
import {
  CapaianRO,
  CapaianSatker,
  CapaianUnitKerja,
  CapaianKementerianSummary,
  StatusCapaian,
  JadwalMingguan,
  KomponenRO
} from '../types/monitoringCapaian';
import { INITIAL_RO_DATA, INITIAL_SATKERS } from '../data/rkklInitialData';

const STORAGE_KEY = 'pulse_rkkl_monitoring_capaian_v6';
const DUMMY_IDS = new Set(['ro-39', 'ro-40', 'ro-41', 'ro-42', 'ro-43', 'ro-44']);

export const SATKER_ORDER: string[] = [
  'Sekretariat Kementerian',
  'Deputi Bidang Kesetaraan Gender',
  'Deputi Bidang Pemenuhan Hak Anak',
  'Deputi Bidang Perlindungan Hak Perempuan',
  'Deputi Bidang Perlindungan Khusus Anak',
  'Komisi Perlindungan Anak Indonesia (KPAI)'
];

export function getSatkerOrderIndex(nama: string): number {
  const idx = SATKER_ORDER.findIndex(s => s.toLowerCase() === (nama || '').trim().toLowerCase());
  return idx === -1 ? 999 : idx;
}

export const SAKTI_SATKER_MAP: Record<string, { id: string; kode: string; nama: string }> = {
  '427944': { id: 'satker-427944', kode: '01', nama: 'Sekretariat Kementerian' },
  '664941': { id: 'satker-664941', kode: '02', nama: 'Deputi Bidang Kesetaraan Gender' },
  '664979': { id: 'satker-664979', kode: '03', nama: 'Deputi Bidang Pemenuhan Hak Anak' },
  '664958': { id: 'satker-664958', kode: '04', nama: 'Deputi Bidang Perlindungan Hak Perempuan' },
  '664962': { id: 'satker-664962', kode: '05', nama: 'Deputi Bidang Perlindungan Khusus Anak' },
  '664983': { id: 'satker-664983', kode: '06', nama: 'Komisi Perlindungan Anak Indonesia (KPAI)' }
};

export const SAKTI_KEGIATAN_UNIT_MAP: Record<string, string> = {
  // 01 - Sekretariat Kementerian (427944)
  'WA.2783': 'Biro Hukum dan Kerja Sama',
  'WA.2784': 'Biro Perencanaan dan Keuangan',
  'WA.2785': 'Biro Hubungan Masyarakat dan Umum',
  'WA.2786': 'Inspektorat',
  'WA.2788': 'Staf Ahli',
  'WA.6380': 'Biro Data dan Informasi',
  'WA.8089': 'Biro Sumber Daya Manusia dan Organisasi',

  // 02 - Deputi Bidang Kesetaraan Gender (664941)
  'DE.2790': 'Asdep PUG Bidang Polhukam & Pemda Wilayah II',
  'DE.2794': 'Asdep PUG Bidang PMK & Pemda Wilayah III',
  'DE.2795': 'Asdep PUG Bidang Ekonomi, Infrastruktur & Pemda Wilayah I',
  'DE.6372': 'Perumusan Kebijakan Kesetaraan Gender',
  'DE.8087': 'Partisipasi Masyarakat Bidang PUG',
  'WA.6367': 'Sekretariat Deputi Kesetaraan Gender',

  // 03 - Deputi Bidang Pemenuhan Hak Anak (664979)
  'DE.2809': 'Pemenuhan Hak Anak Atas Pengasuhan dan Lingkungan',
  'DE.2811': 'Pemenuhan Hak Sipil, Informasi dan Partisipasi Anak',
  'DE.2812': 'Pemenuhan Hak Anak Atas Kesehatan dan Pendidikan',
  'DE.6373': 'Perumusan Kebijakan Pemenuhan Hak Anak',
  'WA.6368': 'Sekretariat Deputi Pemenuhan Hak Anak',

  // 04 - Deputi Bidang Perlindungan Hak Perempuan (664958)
  'DE.2797': 'Perlindungan Hak Perempuan Dalam RT & Kondisi Khusus',
  'DE.2800': 'Perlindungan Hak Perempuan Pekerja & TPPO',
  'DE.6375': 'Layanan Perempuan Korban Kekerasan (SAPA 129)',
  'DE.6376': 'Perumusan Kebijakan Perlindungan Hak Perempuan',
  'DE.8088': 'Tata Kelola Layanan Terpadu Perlindungan Perempuan',
  'WA.6370': 'Sekretariat Deputi Perlindungan Hak Perempuan',

  // 05 - Deputi Bidang Perlindungan Khusus Anak (664962)
  'DE.2805': 'Perlindungan Anak Kondisi Khusus',
  'DE.2810': 'Perlindungan Khusus Anak dari Kekerasan',
  'DE.6377': 'Perumusan Kebijakan Perlindungan Khusus Anak',
  'DE.6378': 'Layanan Anak Memerlukan Perlindungan Khusus',
  'WA.6371': 'Sekretariat Deputi Perlindungan Khusus Anak',

  // 06 - Komisi Perlindungan Anak Indonesia / KPAI (664983)
  'DE.2787': 'Pengawasan Perlindungan Anak (KPAI)',
  'WA.6379': 'Sekretariat KPAI'
};

export class MonitoringCapaianService {
  private static instance: MonitoringCapaianService;
  private hasSupabaseTable: boolean | null = null;

  public static getInstance(): MonitoringCapaianService {
    if (!MonitoringCapaianService.instance) {
      MonitoringCapaianService.instance = new MonitoringCapaianService();
    }
    return MonitoringCapaianService.instance;
  }

  // Helper key to uniquely identify an RO across Satkers and Kegiatans
  private getROKey(satkerNama: string, kodeKegiatan: string | undefined, kodeRo: string): string {
    const kegNum = kodeKegiatan && kodeKegiatan.includes('.') ? kodeKegiatan.split('.')[1] : (kodeKegiatan || '');
    const normalizedRo = kegNum && kodeRo && !kodeRo.startsWith(`${kegNum}.`)
      ? `${kegNum}.${kodeRo}`
      : (kodeRo || '');
    return `${satkerNama}_${kodeKegiatan || ''}_${normalizedRo}`;
  }

  // Determine status based on realization percentage
  public calculateStatus(persentase: number): StatusCapaian {
    if (persentase >= 90) return 'Sesuai Target';
    if (persentase > 75) return 'Perlu Perhatian';
    return 'Perlu Intervensi';
  }

  // Transform Supabase snake_case row to CapaianRO
  private mapRowToRO(row: any): CapaianRO {
    const pagu = Number(row.pagu || 0);
    const realisasi = Number(row.realisasi || 0);
    const sisa = Number(row.sisa !== undefined ? row.sisa : Math.max(0, pagu - realisasi));
    const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;

    let komponen = Array.isArray(row.komponen) && row.komponen.length > 0 ? row.komponen : [];
    if (komponen.length === 0) {
      const init = INITIAL_RO_DATA.find(i => 
        i.kodeRo === (row.kode_ro || '') && 
        (!row.satker_nama || i.satkerNama === row.satker_nama)
      );
      if (init && init.komponen && init.komponen.length > 0) {
        komponen = init.komponen;
      }
    }

    return {
      id: row.id,
      satkerId: row.satker_id || '',
      satkerNama: row.satker_nama || '',
      unitKerjaId: row.unit_kerja_id || '',
      unitKerjaNama: row.unit_kerja_nama || '',
      kodeKegiatan: row.kode_kegiatan || '',
      namaKegiatan: row.nama_kegiatan || '',
      kodeKro: row.kode_kro || '',
      namaKro: row.nama_kro || '',
      kodeRo: row.kode_ro || '',
      namaRo: row.nama_ro || '',
      pagu,
      realisasi,
      sisa,
      persentase,
      status: (row.status as StatusCapaian) || this.calculateStatus(persentase),
      jadwal: typeof row.jadwal === 'object' && row.jadwal !== null ? row.jadwal : {},
      totalKebutuhan: Number(row.total_kebutuhan || 0) > 0 ? Math.min(sisa, Number(row.total_kebutuhan)) : sisa,
      danaTidakTerserap: Number(row.dana_tidak_terserap || 0),
      keterangan: row.keterangan || '',
      komponen,
      updatedAt: row.updated_at || row.created_at || '',
      updatedBy: row.updated_by || ''
    };
  }

  // Transform CapaianRO to Supabase snake_case row
  private mapROToRow(ro: CapaianRO): any {
    return {
      id: ro.id,
      satker_id: ro.satkerId || null,
      satker_nama: ro.satkerNama,
      unit_kerja_id: ro.unitKerjaId || null,
      unit_kerja_nama: ro.unitKerjaNama,
      kode_kegiatan: ro.kodeKegiatan || null,
      nama_kegiatan: ro.namaKegiatan || null,
      kode_kro: ro.kodeKro || null,
      nama_kro: ro.namaKro || null,
      kode_ro: ro.kodeRo,
      nama_ro: ro.namaRo,
      pagu: ro.pagu,
      realisasi: ro.realisasi,
      sisa: ro.sisa,
      persentase: ro.persentase,
      status: ro.status,
      jadwal: ro.jadwal || {},
      komponen: ro.komponen || [],
      total_kebutuhan: ro.totalKebutuhan || 0,
      dana_tidak_terserap: ro.danaTidakTerserap || 0,
      keterangan: ro.keterangan || null,
      updated_at: new Date().toISOString(),
      updated_by: ro.updatedBy || null
    };
  }

  // Async load with automatic Supabase sync & fallback to LocalStorage
  public async fetchROsAsync(): Promise<CapaianRO[]> {
    try {
      const { data, error } = await supabase
        .from('monitoring_capaian_ro')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        this.hasSupabaseTable = true;
        if (data.length > 0) {
          const localROs = this.getROs();
          const localMap = new Map(localROs.map(l => [this.getROKey(l.satkerNama, l.kodeKegiatan, l.kodeRo), l]));
          const initialMap = new Map(INITIAL_RO_DATA.map(init => [this.getROKey(init.satkerNama, init.kodeKegiatan, init.kodeRo), init]));

          const dedupedMap = new Map<string, CapaianRO>();
          data
            .filter((r: any) => !DUMMY_IDS.has(r.id))
            .forEach(r => {
              const ro = this.mapRowToRO(r);
              const key = this.getROKey(ro.satkerNama, ro.kodeKegiatan, ro.kodeRo);
              const local = localMap.get(key);
              const init = initialMap.get(key);

              if (!ro.komponen || ro.komponen.length === 0) {
                if (local && local.komponen && local.komponen.length > 0) {
                  ro.komponen = local.komponen;
                } else if (init && init.komponen && init.komponen.length > 0) {
                  ro.komponen = init.komponen;
                }
              }
              if (!dedupedMap.has(key)) {
                dedupedMap.set(key, ro);
              }
            });

          const mapped = Array.from(dedupedMap.values());
          this.saveAllROs(mapped); // cache in localStorage
          return mapped;
        } else {
          // If table exists but empty, seed initial data
          await this.seedInitialToSupabase();
          return this.getROs();
        }
      } else {
        this.hasSupabaseTable = false;
      }
    } catch (err) {
      this.hasSupabaseTable = false;
    }

    return this.getROs();
  }

  // Seed initial data to Supabase if table exists
  public async seedInitialToSupabase(): Promise<void> {
    try {
      const rows = INITIAL_RO_DATA.map(ro => this.mapROToRow(ro));
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        await supabase.from('monitoring_capaian_ro').upsert(batch, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Supabase table seeding skipped or unavailable:', err);
    }
  }

  // Get all ROs from LocalStorage or fallback to INITIAL_RO_DATA (synchronous)
  public getROs(): CapaianRO[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge missing komponen / jadwal from INITIAL_RO_DATA if missing in cache
          const initialMap = new Map(INITIAL_RO_DATA.map(init => [this.getROKey(init.satkerNama, init.kodeKegiatan, init.kodeRo), init]));
          let modified = false;
          const merged = parsed
            .filter((ro: any) => !DUMMY_IDS.has(ro.id))
            .map((ro: CapaianRO) => {
              const key = this.getROKey(ro.satkerNama, ro.kodeKegiatan, ro.kodeRo);
              const init = initialMap.get(key);
              if (init) {
                let updated = { ...ro };
                if ((!ro.komponen || ro.komponen.length === 0) && init.komponen && init.komponen.length > 0) {
                  updated.komponen = init.komponen;
                  modified = true;
                }
                if ((!ro.jadwal || Object.keys(ro.jadwal).length === 0) && init.jadwal && Object.keys(init.jadwal).length > 0) {
                  updated.jadwal = init.jadwal;
                  modified = true;
                }
                if (!ro.totalKebutuhan && init.totalKebutuhan) {
                  updated.totalKebutuhan = init.totalKebutuhan;
                  modified = true;
                }
                if (ro.danaTidakTerserap === undefined && init.danaTidakTerserap !== undefined) {
                  updated.danaTidakTerserap = init.danaTidakTerserap;
                  modified = true;
                }
                return updated;
              }
              return ro;
            });

          if (modified) {
            this.saveAllROs(merged);
          }
          return merged;
        }
      }
    } catch (err) {
      console.warn('Gagal membaca data monitoring capaian dari localStorage:', err);
    }
    return INITIAL_RO_DATA;
  }

  // Save all ROs to storage
  public saveAllROs(ros: CapaianRO[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ros));
    } catch (err) {
      console.error('Gagal menyimpan data monitoring capaian ke localStorage:', err);
    }
  }

  // Add or update a single RO
  public upsertRO(item: Partial<CapaianRO> & { kodeRo: string; namaRo: string; satkerNama: string; unitKerjaNama: string }): CapaianRO {
    const ros = this.getROs();
    const pagu = Number(item.pagu || 0);
    const realisasi = Number(item.realisasi || 0);
    const sisa = Number(item.sisa !== undefined ? item.sisa : Math.max(0, pagu - realisasi));
    const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;
    const status = this.calculateStatus(persentase);

    const now = new Date().toISOString();
    let updatedRO: CapaianRO;

    const existingIndex = ros.findIndex(r => r.id === item.id || (r.kodeRo === item.kodeRo && r.unitKerjaNama === item.unitKerjaNama));

    if (existingIndex >= 0) {
      const current = ros[existingIndex];
      updatedRO = {
        ...current,
        ...item,
        pagu,
        realisasi,
        sisa,
        persentase,
        status,
        jadwal: item.jadwal || current.jadwal || {},
        updatedAt: now
      };
      ros[existingIndex] = updatedRO;
    } else {
      updatedRO = {
        id: item.id || `ro-custom-${Date.now()}`,
        satkerId: item.satkerId || 'satker-custom',
        satkerNama: item.satkerNama,
        unitKerjaId: item.unitKerjaId || 'unit-custom',
        unitKerjaNama: item.unitKerjaNama,
        kodeKegiatan: item.kodeKegiatan || '',
        namaKegiatan: item.namaKegiatan || '',
        kodeKro: item.kodeKro || '',
        namaKro: item.namaKro || '',
        kodeRo: item.kodeRo,
        namaRo: item.namaRo,
        pagu,
        realisasi,
        sisa,
        persentase,
        status,
        jadwal: item.jadwal || {},
        totalKebutuhan: item.totalKebutuhan || sisa,
        danaTidakTerserap: item.danaTidakTerserap || 0,
        keterangan: item.keterangan || '',
        updatedAt: now,
        updatedBy: item.updatedBy || 'Pengguna'
      };
      ros.unshift(updatedRO);
    }

    this.saveAllROs(ros);

    // Save to Supabase in background
    try {
      supabase
        .from('monitoring_capaian_ro')
        .upsert(this.mapROToRow(updatedRO), { onConflict: 'id' })
        .then(({ error }: any) => {
          if (error) console.warn('Supabase upsert error:', error);
        });
    } catch (e) {
      // Ignore if offline
    }

    return updatedRO;
  }

  // Update only schedule (AJK) for an RO
  public updateJadwalRO(
    roId: string,
    jadwal: JadwalMingguan,
    keterangan?: string,
    danaTidakTerserap?: number,
    updatedBy?: string
  ): CapaianRO | null {
    const ros = this.getROs();
    const index = ros.findIndex(r => r.id === roId);
    if (index === -1) return null;

    const current = ros[index];
    const totalSched = Object.values(jadwal).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    const silpa = danaTidakTerserap !== undefined ? danaTidakTerserap : (current.danaTidakTerserap || 0);
    const rawKeb = totalSched > 0 ? totalSched : Math.max(0, current.sisa - silpa);
    const totalKebutuhan = Math.min(current.sisa, Math.max(0, rawKeb));

    const updated: CapaianRO = {
      ...current,
      jadwal: { ...jadwal },
      totalKebutuhan,
      danaTidakTerserap: silpa,
      keterangan: keterangan !== undefined ? keterangan : (current.keterangan || ''),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || current.updatedBy || 'Pengguna'
    };

    ros[index] = updated;
    this.saveAllROs(ros);

    // Update in Supabase in background
    try {
      supabase
        .from('monitoring_capaian_ro')
        .update({
          jadwal: updated.jadwal,
          total_kebutuhan: updated.totalKebutuhan,
          dana_tidak_terserap: updated.danaTidakTerserap,
          keterangan: updated.keterangan,
          updated_at: updated.updatedAt,
          updated_by: updated.updatedBy
        })
        .eq('id', roId)
        .then(({ error }: any) => {
          if (error) console.warn('Supabase update schedule error:', error);
        });
    } catch (e) {
      // Ignore if offline
    }

    return updated;
  }

  // Save entire komponen list for an RO (Add / Edit / Delete)
  public async saveKomponenRO(
    roId: string,
    komponenList: KomponenRO[],
    updatedBy?: string
  ): Promise<CapaianRO | null> {
    const ros = this.getROs();
    const index = ros.findIndex(r => r.id === roId);
    if (index === -1) return null;

    const current = ros[index];
    const now = new Date().toISOString();

    const updated: CapaianRO = {
      ...current,
      komponen: [...komponenList],
      updatedAt: now,
      updatedBy: updatedBy || current.updatedBy || 'Pengguna'
    };

    ros[index] = updated;
    this.saveAllROs(ros);

    // Save to Supabase
    try {
      const payload: any = {
        komponen: updated.komponen,
        updated_at: updated.updatedAt,
        updated_by: updated.updatedBy
      };

      const { error } = await supabase
        .from('monitoring_capaian_ro')
        .update(payload)
        .eq('id', roId);

      if (error) {
        console.warn('Gagal menyimpan komponen ke Supabase:', error);
      }
    } catch (err) {
      console.warn('Supabase update komponen error:', err);
    }

    return updated;
  }

  // Add a new component to an RO
  public async addKomponenRO(
    roId: string,
    item: KomponenRO,
    updatedBy?: string
  ): Promise<CapaianRO | null> {
    const ros = this.getROs();
    const target = ros.find(r => r.id === roId);
    if (!target) return null;

    const currentList = target.komponen || [];
    const updatedList = [
      ...currentList,
      {
        ...item,
        id: item.id || `komp-${Date.now()}`
      }
    ];

    return this.saveKomponenRO(roId, updatedList, updatedBy);
  }

  // Update an existing component by index
  public async updateKomponenRO(
    roId: string,
    index: number,
    item: KomponenRO,
    updatedBy?: string
  ): Promise<CapaianRO | null> {
    const ros = this.getROs();
    const target = ros.find(r => r.id === roId);
    if (!target) return null;

    const currentList = [...(target.komponen || [])];
    if (index < 0 || index >= currentList.length) return null;

    currentList[index] = {
      ...currentList[index],
      ...item
    };

    return this.saveKomponenRO(roId, currentList, updatedBy);
  }

  // Delete a component by index
  public async deleteKomponenRO(
    roId: string,
    index: number,
    updatedBy?: string
  ): Promise<CapaianRO | null> {
    const ros = this.getROs();
    const target = ros.find(r => r.id === roId);
    if (!target) return null;

    const currentList = (target.komponen || []).filter((_, idx) => idx !== index);
    return this.saveKomponenRO(roId, currentList, updatedBy);
  }

  // Delete an RO
  public deleteRO(roId: string): void {
    const ros = this.getROs().filter(r => r.id !== roId);
    this.saveAllROs(ros);

    try {
      supabase
        .from('monitoring_capaian_ro')
        .delete()
        .eq('id', roId)
        .then(({ error }: any) => {
          if (error) console.warn('Supabase delete error:', error);
        });
    } catch (e) {
      // Ignore if offline
    }
  }

  // Reset data to initial rkkl baseline
  public resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Compute ministry summary KPIs
  public getSummary(ros?: CapaianRO[]): CapaianKementerianSummary {
    const list = ros || this.getROs();

    let totalPagu = 0;
    let totalRealisasi = 0;
    let countSesuai = 0;
    let countPerhatian = 0;
    let countIntervensi = 0;

    const satkerSet = new Set<string>();
    const unitSet = new Set<string>();

    list.forEach(r => {
      totalPagu += Number(r.pagu || 0);
      totalRealisasi += Number(r.realisasi || 0);
      satkerSet.add(r.satkerNama);
      unitSet.add(r.unitKerjaNama);

      if (r.status === 'Sesuai Target') countSesuai++;
      else if (r.status === 'Perlu Perhatian') countPerhatian++;
      else countIntervensi++;
    });

    const totalSisa = Math.max(0, totalPagu - totalRealisasi);
    const persentaseNasional = totalPagu > 0 ? Number(((totalRealisasi / totalPagu) * 100).toFixed(2)) : 0;

    return {
      totalPagu,
      totalRealisasi,
      totalSisa,
      persentaseNasional,
      countSesuaiTarget: countSesuai,
      countPerluPerhatian: countPerhatian,
      countPerluIntervensi: countIntervensi,
      totalSatker: satkerSet.size,
      totalUnitKerja: unitSet.size,
      totalRO: list.length
    };
  }

  // Get aggregated Satker list (Eselon I), sorted in official ministry order
  public getSatkerAggregates(ros?: CapaianRO[]): CapaianSatker[] {
    const list = ros || this.getROs();
    const map = new Map<string, {
      id: string;
      kode: string;
      nama: string;
      pagu: number;
      realisasi: number;
      unitKerjaSet: Set<string>;
      roCount: number;
    }>();

    list.forEach(r => {
      const key = r.satkerNama || 'Lainnya';
      if (!map.has(key)) {
        map.set(key, {
          id: r.satkerId || `satker-${map.size + 1}`,
          kode: String(map.size + 1).padStart(2, '0'),
          nama: key,
          pagu: 0,
          realisasi: 0,
          unitKerjaSet: new Set(),
          roCount: 0
        });
      }
      const item = map.get(key)!;
      item.pagu += Number(r.pagu || 0);
      item.realisasi += Number(r.realisasi || 0);
      item.unitKerjaSet.add(r.unitKerjaNama);
      item.roCount += 1;
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      const idxA = getSatkerOrderIndex(a.nama);
      const idxB = getSatkerOrderIndex(b.nama);
      if (idxA !== idxB) return idxA - idxB;
      return a.nama.localeCompare(b.nama);
    });

    return sorted.map((s, idx) => {
      const sisa = Math.max(0, s.pagu - s.realisasi);
      const persentase = s.pagu > 0 ? Number(((s.realisasi / s.pagu) * 100).toFixed(2)) : 0;
      return {
        id: s.id,
        kode: String(idx + 1).padStart(2, '0'),
        nama: s.nama,
        pagu: s.pagu,
        realisasi: s.realisasi,
        sisa,
        persentase,
        status: this.calculateStatus(persentase),
        unitKerjaCount: s.unitKerjaSet.size,
        roCount: s.roCount
      };
    });
  }

  // Get aggregated Unit Kerja list (Eselon II)
  public getUnitKerjaAggregates(satkerNamaFilter?: string, ros?: CapaianRO[]): CapaianUnitKerja[] {
    let list = ros || this.getROs();
    if (satkerNamaFilter && satkerNamaFilter !== 'All') {
      list = list.filter(r => r.satkerNama === satkerNamaFilter);
    }

    const map = new Map<string, {
      id: string;
      satkerId: string;
      satkerNama: string;
      kode: string;
      nama: string;
      pagu: number;
      realisasi: number;
      roCount: number;
    }>();

    list.forEach(r => {
      const key = `${r.satkerNama}_${r.unitKerjaNama}`;
      if (!map.has(key)) {
        map.set(key, {
          id: r.unitKerjaId || `unit-${map.size + 1}`,
          satkerId: r.satkerId || 'satker-1',
          satkerNama: r.satkerNama,
          kode: r.kodeKegiatan || '',
          nama: r.unitKerjaNama,
          pagu: 0,
          realisasi: 0,
          roCount: 0
        });
      }
      const item = map.get(key)!;
      item.pagu += Number(r.pagu || 0);
      item.realisasi += Number(r.realisasi || 0);
      item.roCount += 1;
    });

    return Array.from(map.values()).map(u => {
      const sisa = Math.max(0, u.pagu - u.realisasi);
      const persentase = u.pagu > 0 ? Number(((u.realisasi / u.pagu) * 100).toFixed(2)) : 0;
      return {
        id: u.id,
        satkerId: u.satkerId,
        satkerNama: u.satkerNama,
        kode: u.kode,
        nama: u.nama,
        pagu: u.pagu,
        realisasi: u.realisasi,
        sisa,
        persentase,
        status: this.calculateStatus(persentase),
        roCount: u.roCount
      };
    });
  }

  // Parse uploaded Excel file (support GLP039 SAKTI or AJK format) without writing to storage/database
  public async parseExcelFile(
    file: File,
    overrideSatkerNama?: string
  ): Promise<{ success: boolean; data: CapaianRO[]; detectedSatker: string; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            resolve({ success: false, data: [], detectedSatker: '', message: 'File kosong atau tidak dapat dibaca.' });
            return;
          }

          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

          if (!rows || rows.length < 5) {
            resolve({ success: false, data: [], detectedSatker: '', message: 'Struktur file Excel tidak sesuai atau baris terlalu sedikit.' });
            return;
          }

          // Inspect first 15 rows to determine file type by actual content, not file name
          const sampleText = rows.slice(0, 15).map(r => (r || []).join(' ')).join(' ').toUpperCase();
          const isSaktiReport = sampleText.includes('KETERSEDIAAN DANA') || 
                                sampleText.includes('PER PROGRAM;') || 
                                sampleText.includes('PAGU REVISI') || 
                                sampleText.includes('LOCK PAGU');

          if (isSaktiReport) {
            const result = this.parseSaktiRows(rows, file.name, overrideSatkerNama);
            resolve(result);
          } else {
            const result = this.parseAjkRows(rows, wb, file.name, overrideSatkerNama);
            resolve(result);
          }
        } catch (err: any) {
          console.error('Error parsing excel:', err);
          resolve({
            success: false,
            data: [],
            detectedSatker: '',
            message: `Gagal membaca file: ${err.message || 'Format tidak valid'}`
          });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, data: [], detectedSatker: '', message: 'Terjadi kesalahan saat membaca berkas.' });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Parse multiple Excel files (e.g. all Satkers uploaded at once)
  public async parseMultipleExcelFiles(
    files: File[],
    overrideSatker?: string
  ): Promise<{
    success: boolean;
    data: CapaianRO[];
    fileSummaries: Array<{
      fileName: string;
      satker: string;
      count: number;
      pagu: number;
      realisasi: number;
      success: boolean;
      error?: string;
    }>;
    message: string;
  }> {
    const allROs: CapaianRO[] = [];
    const fileSummaries = [];
    let successCount = 0;

    for (const file of files) {
      const res = await this.parseExcelFile(file, overrideSatker);
      if (res.success && res.data.length > 0) {
        const pagu = res.data.reduce((a, b) => a + b.pagu, 0);
        const realisasi = res.data.reduce((a, b) => a + b.realisasi, 0);
        allROs.push(...res.data);
        fileSummaries.push({
          fileName: file.name,
          satker: res.detectedSatker,
          count: res.data.length,
          pagu,
          realisasi,
          success: true
        });
        successCount++;
      } else {
        fileSummaries.push({
          fileName: file.name,
          satker: res.detectedSatker || 'Tidak diketahui',
          count: 0,
          pagu: 0,
          realisasi: 0,
          success: false,
          error: res.message
        });
      }
    }

    return {
      success: allROs.length > 0,
      data: allROs,
      fileSummaries,
      message: `Berhasil menganalisis ${successCount} dari ${files.length} file (${allROs.length} total Rincian Output).`
    };
  }

  // Parse SAKTI FA Detail (GLP039) rows
  private parseSaktiRows(
    rows: any[][],
    fileName: string,
    overrideSatkerNama?: string
  ): { success: boolean; data: CapaianRO[]; detectedSatker: string; message: string } {
    let detectedSatkerInfo: { id: string; kode: string; nama: string } | null = null;

    if (overrideSatkerNama && overrideSatkerNama !== 'auto') {
      for (const info of Object.values(SAKTI_SATKER_MAP)) {
        if (info.nama.toLowerCase() === overrideSatkerNama.toLowerCase()) {
          detectedSatkerInfo = info;
          break;
        }
      }
      if (!detectedSatkerInfo) {
        detectedSatkerInfo = {
          id: `satker-custom-${Date.now()}`,
          kode: '99',
          nama: overrideSatkerNama
        };
      }
    } else {
      // Priority 1: Check any cell in the first 35 rows for the 6-digit SAKTI Satker Code
      // (e.g. 427944, 664941, 664958, 664962, 664979, 664983) regardless of column offset or filename
      for (let r = 0; r < Math.min(35, rows.length); r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (SAKTI_SATKER_MAP[val]) {
            detectedSatkerInfo = SAKTI_SATKER_MAP[val];
            break;
          }
        }
        if (detectedSatkerInfo) break;
      }

      // Priority 2: Check any cell containing Satker name keywords
      if (!detectedSatkerInfo) {
        for (let r = 0; r < Math.min(35, rows.length); r++) {
          const row = rows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim().toUpperCase();
            if (val.includes('KESETARAAN GENDER')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['664941'];
              break;
            } else if (val.includes('PERLINDUNGAN HAK PEREMPUAN')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['664958'];
              break;
            } else if (val.includes('PERLINDUNGAN KHUSUS ANAK')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['664962'];
              break;
            } else if (val.includes('PEMENUHAN HAK ANAK')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['664979'];
              break;
            } else if (val.includes('KOMISI PERLINDUNGAN ANAK') || val.includes('KPAI')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['664983'];
              break;
            } else if (val.includes('SEKRETARIAT KEMENTERIAN')) {
              detectedSatkerInfo = SAKTI_SATKER_MAP['427944'];
              break;
            }
          }
          if (detectedSatkerInfo) break;
        }
      }
    }

    if (!detectedSatkerInfo) {
      detectedSatkerInfo = {
        id: 'satker-427944',
        kode: '01',
        nama: 'Sekretariat Kementerian'
      };
    }

    let currentKegiatan = { code: '', name: '' };
    let currentKro = { code: '', name: '' };
    let currentRo: CapaianRO | null = null;
    const roMap = new Map<string, CapaianRO>();

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const c1 = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
      const c2 = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';
      const c4 = row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : '';

      const c0 = String(row[0] || '');
      if (
        c0.includes('JUMLAH SELURUHNYA') ||
        c0.includes('LAPORAN') ||
        c0.includes('Per Program') ||
        c0.includes('*Lock Pagu')
      ) {
        continue;
      }

      // Match Kegiatan e.g. WA.2783 or DE.2790
      if (/^[A-Z]{2}\.\d{4}$/.test(c1)) {
        currentKegiatan = {
          code: c1,
          name: String(row[8] || row[3] || '').trim().replace(/\s+/g, ' ')
        };
        continue;
      }

      // Match KRO e.g. AEC or PEA
      if (/^[A-Z0-9]{3}$/.test(c2)) {
        currentKro = {
          code: c2,
          name: String(row[6] || '').trim().replace(/\s+/g, ' ')
        };
        continue;
      }

      // Match RO e.g. AEC.001 or PEA.001
      if (/^[A-Z0-9]{3}\.[A-Z0-9]{3}$/.test(c2)) {
        const kegNum = currentKegiatan.code.includes('.')
          ? currentKegiatan.code.split('.')[1]
          : currentKegiatan.code;
        const roCode = kegNum ? `${kegNum}.${c2}` : c2;
        const roKey = this.getROKey(detectedSatkerInfo.nama, currentKegiatan.code, roCode);

        const roName = String(row[10] || row[6] || row[8] || c2).trim().replace(/\s+/g, ' ');
        const pagu = Number(row[16] || 0);
        const lockPagu = Number(row[18] || 0);
        const realisasi = Number(row[25] !== undefined && row[25] !== null ? row[25] : (row[24] || 0));
        const sisa = Math.max(0, pagu - realisasi);
        const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;

        let unitKerja = SAKTI_KEGIATAN_UNIT_MAP[currentKegiatan.code];
        if (!unitKerja) {
          unitKerja = currentKegiatan.name || detectedSatkerInfo.nama;
        }

        const satkerNum = detectedSatkerInfo.id.replace('satker-', '');

        if (!roMap.has(roKey)) {
          currentRo = {
            id: `ro-${satkerNum}-${kegNum}-${c2.replace('.', '-')}`,
            satkerId: detectedSatkerInfo.id,
            satkerNama: detectedSatkerInfo.nama,
            unitKerjaId: `unit-${satkerNum}-${kegNum || 'gen'}`,
            unitKerjaNama: unitKerja,
            kodeKegiatan: currentKegiatan.code,
            namaKegiatan: currentKegiatan.name,
            kodeKro: currentKro.code,
            namaKro: currentKro.name,
            kodeRo: roCode,
            namaRo: roName,
            pagu,
            realisasi,
            sisa,
            persentase,
            status: this.calculateStatus(persentase),
            jadwal: {},
            komponen: [],
            totalKebutuhan: Math.max(0, sisa - lockPagu),
            danaTidakTerserap: lockPagu,
            keterangan: lockPagu > 0 ? `Lock Pagu (Blokir Anggaran SAKTI): Rp ${lockPagu.toLocaleString('id-ID')}` : '',
            updatedAt: new Date().toISOString(),
            updatedBy: fileName
          };
          roMap.set(roKey, currentRo);
        } else {
          currentRo = roMap.get(roKey)!;
          if (roName && roName !== c2 && !currentRo.namaRo.includes(roName)) {
            currentRo.namaRo = `${currentRo.namaRo} ${roName}`.replace(/\s+/g, ' ').trim();
          }
        }
        continue;
      }

      // Match Komponen e.g. 051
      if (/^\d{3}$/.test(c4) && currentRo) {
        const kompKode = c4;
        const kompNamaRaw = String(row[9] || '').trim().replace(/\s+/g, ' ');
        const kompNama = kompNamaRaw.startsWith(`${kompKode} -`) ? kompNamaRaw : `${kompKode} - ${kompNamaRaw}`;
        const pagu = Number(row[16] || 0);
        const lockKomp = Number(row[18] || 0);
        const realisasi = Number(row[25] !== undefined && row[25] !== null ? row[25] : (row[24] || 0));
        const sisa = Math.max(0, pagu - realisasi);
        const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;

        const existingKomp = currentRo.komponen.find(k => k.kode === kompKode || k.nama.startsWith(`${kompKode} -`));
        if (!existingKomp) {
          currentRo.komponen.push({
            id: `komp-${currentRo.kodeRo.replace(/\./g, '-')}-${kompKode}`,
            kode: kompKode,
            nama: kompNama,
            pagu,
            realisasi,
            sisa,
            persentase,
            status: this.calculateStatus(persentase),
            keterangan: lockKomp > 0
              ? `Komponen SAKTI ${kompKode} (Lock Pagu: Rp ${lockKomp.toLocaleString('id-ID')})`
              : `Komponen SAKTI ${kompKode}`
          });
        }
      }
    }

    const data = Array.from(roMap.values());
    if (data.length === 0) {
      return {
        success: false,
        data: [],
        detectedSatker: detectedSatkerInfo.nama,
        message: 'Tidak ditemukan data baris RO yang valid dalam file SAKTI tersebut.'
      };
    }

    return {
      success: true,
      data,
      detectedSatker: detectedSatkerInfo.nama,
      message: `Berhasil menganalisis ${data.length} Rincian Output (RO) untuk Satker "${detectedSatkerInfo.nama}".`
    };
  }

  // Parse Matrix AJK Rows
  private parseAjkRows(
    rows: any[][],
    wb: XLSX.WorkBook,
    fileName: string,
    overrideSatkerNama?: string
  ): { success: boolean; data: CapaianRO[]; detectedSatker: string; message: string } {
    // Pick the best AJK sheet (with the most valid numeric RO rows, skipping sample/XXX sheets)
    const candidateSheets = wb.SheetNames.filter(s => s.toLowerCase().includes('ajk'));
    const sheetsToCheck = candidateSheets.length > 0 ? candidateSheets : wb.SheetNames;
    let ajkSheetName = sheetsToCheck[0];
    let maxValidRoCount = -1;

    for (const sName of sheetsToCheck) {
      const sRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sName], { header: 1, defval: null });
      let validCount = 0;
      for (const r of sRows) {
        if (!r) continue;
        const c1 = String(r[1] || '').trim();
        const c3 = String(r[3] || '').trim();
        if (
          (/^(\d{4}\.)?[A-Z0-9]{3}\.[A-Z0-9]{3}$/i.test(c1) && typeof r[3] === 'number') ||
          (/^(\d{4}\.)?[A-Z0-9]{3}\.[A-Z0-9]{3}$/i.test(c3) && typeof r[5] === 'number')
        ) {
          validCount++;
        }
      }
      if (validCount > maxValidRoCount) {
        maxValidRoCount = validCount;
        ajkSheetName = sName;
      }
    }

    const ajkWs = wb.Sheets[ajkSheetName];
    const ajkRows: any[][] = XLSX.utils.sheet_to_json(ajkWs, { header: 1, defval: null });

    // Check if workbook has a 'Log Realisasi' sheet with a cutoff date serial (cell C2)
    let logCutoffSerial = 0;
    const logSheetName = wb.SheetNames.find(s => s.toLowerCase().includes('log realisasi'));
    if (logSheetName) {
      const logRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[logSheetName], { header: 1, defval: null });
      for (let i = 0; i < Math.min(5, logRows.length); i++) {
        const lr = logRows[i] || [];
        for (const cell of lr) {
          if (typeof cell === 'number' && cell > 45000 && cell < 50000) {
            logCutoffSerial = cell;
            break;
          }
        }
        if (logCutoffSerial > 0) break;
      }
    }

    let detectedSatker = overrideSatkerNama && overrideSatkerNama !== 'auto' ? overrideSatkerNama : 'Sekretariat Kementerian';
    let detectedUnit = 'Unit Kerja Terkait';

    const headerSlice = ajkRows.slice(0, 10).map(r => (r || []).join(' ').toLowerCase()).join(' ');
    const fullTextCheck = (fileName + ' ' + ajkSheetName + ' ' + headerSlice).toLowerCase();

    if (!overrideSatkerNama || overrideSatkerNama === 'auto') {
      if (fullTextCheck.includes('kesetaraan gender')) {
        detectedSatker = 'Deputi Bidang Kesetaraan Gender';
      } else if (fullTextCheck.includes('pemenuhan hak anak')) {
        detectedSatker = 'Deputi Bidang Pemenuhan Hak Anak';
      } else if (fullTextCheck.includes('perlindungan hak perempuan')) {
        detectedSatker = 'Deputi Bidang Perlindungan Hak Perempuan';
      } else if (fullTextCheck.includes('perlindungan khusus anak')) {
        detectedSatker = 'Deputi Bidang Perlindungan Khusus Anak';
      } else if (fullTextCheck.includes('komisi perlindungan anak') || fullTextCheck.includes('kpai')) {
        detectedSatker = 'Komisi Perlindungan Anak Indonesia (KPAI)';
      } else if (fullTextCheck.includes('sekretariat') || fullTextCheck.includes('biro')) {
        detectedSatker = 'Sekretariat Kementerian';
      }
    }

    for (let i = 0; i < Math.min(6, ajkRows.length); i++) {
      const rowText = (ajkRows[i] || []).join(' ').toLowerCase();
      if (rowText.includes('biro data')) detectedUnit = 'Biro Data dan Informasi';
      else if (rowText.includes('biro perencanaan')) detectedUnit = 'Biro Perencanaan dan Keuangan';
      else if (rowText.includes('biro hukum')) detectedUnit = 'Biro Hukum dan Kerja Sama';
      else if (rowText.includes('biro sdm')) detectedUnit = 'Biro Sumber Daya Manusia dan Organisasi';
      else if (rowText.includes('biro umum') || rowText.includes('hubungan masyarakat')) detectedUnit = 'Biro Hubungan Masyarakat dan Umum';
      else if (rowText.includes('inspektorat')) detectedUnit = 'Inspektorat';
      else if (rowText.includes('asdep') || rowText.includes('asisten deputi') || rowText.includes('sekretariat deputi')) {
        const found = (ajkRows[i] || []).find((c: any) => c && (String(c).toLowerCase().includes('asdep') || String(c).toLowerCase().includes('asisten deputi') || String(c).toLowerCase().includes('sekretariat deputi')));
        if (found) detectedUnit = String(found).trim();
      }
    }

    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(10, ajkRows.length); r++) {
      const row = ajkRows[r] || [];
      const strRow = row.join(' ').toLowerCase();
      if (strRow.includes('pagu') && (strRow.includes('kegiatan') || strRow.includes('uraian') || strRow.includes('rincian output'))) {
        headerRowIndex = r;
        break;
      }
    }

    const headerRow = headerRowIndex !== -1 ? (ajkRows[headerRowIndex] || []) : [];
    const isTemplateOrExportLayout = String(headerRow[3] || '').toLowerCase().includes('kode');
    const isExportLayout = isTemplateOrExportLayout && String(headerRow[10] || '').toLowerCase().includes('oktober');
    const oktBase = isExportLayout ? 10 : 7;

    // Check if the row above headerRow has Excel serial dates for weeks (e.g. 46310..46387)
    const weekSerialRow = headerRowIndex > 0 ? (ajkRows[headerRowIndex - 1] || []) : [];
    const weekSerials: number[] = [];
    for (let w = 0; w < 11; w++) {
      const val = Number(weekSerialRow[oktBase + w]);
      weekSerials.push(val > 45000 && val < 50000 ? val : 0);
    }

    let startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 5;
    // Skip Roman numeral sub-header row (II, III, IV, I, II...)
    if (startIdx < ajkRows.length) {
      const firstDataRow = ajkRows[startIdx] || [];
      if (!firstDataRow[1] && !firstDataRow[2] && String(firstDataRow[oktBase] || '').trim() === 'II') {
        startIdx++;
      }
    }

    const parsedROs: CapaianRO[] = [];
    let currentRoObj: CapaianRO | null = null;
    let currentKegPrefix = '';
    let isTitipanSection = false;
    let parentHasExplicitTotals = false;

    // Build lookup map of 4-digit kegiatan number -> { kodeKegiatan, unitKerjaNama }
    const kegNumLookup: Record<string, { kodeKegiatan: string; unitKerjaNama: string }> = {};
    Object.entries(SAKTI_KEGIATAN_UNIT_MAP).forEach(([kCode, uName]) => {
      const num = kCode.split('.')[1];
      if (num) kegNumLookup[num] = { kodeKegiatan: kCode, unitKerjaNama: uName };
    });

    for (let r = startIdx; r < ajkRows.length; r++) {
      const row = ajkRows[r] || [];
      const rowSatker = isTemplateOrExportLayout && row[1] ? String(row[1]).trim() : '';
      const rowUnit = isTemplateOrExportLayout && row[2] ? String(row[2]).trim() : '';
      const colCodeRaw = isTemplateOrExportLayout ? row[3] : row[1];
      const colUraianRaw = isTemplateOrExportLayout ? row[4] : row[2];
      const colPagu = isTemplateOrExportLayout ? row[5] : row[3];
      const colReal = isTemplateOrExportLayout ? row[6] : row[4];
      const colSisa = isExportLayout ? row[8] : isTemplateOrExportLayout ? undefined : row[6];

      const colCode = colCodeRaw !== undefined && colCodeRaw !== null ? String(colCodeRaw).trim() : '';
      const colUraian = colUraianRaw !== undefined && colUraianRaw !== null ? String(colUraianRaw).trim().replace(/\s+/g, ' ') : '';

      // Skip footer / summary rows (e.g. "Total Sisa Anggaran", "Prosentase Sisa Anggaran", "dst..")
      const rowJoinedLower = row.map(c => String(c || '')).join(' ').toLowerCase();
      if (
        rowJoinedLower.includes('total sisa anggaran') ||
        rowJoinedLower.includes('prosentase sisa anggaran') ||
        colUraian.toLowerCase() === 'dst..' ||
        String(colPagu || '').toUpperCase() === 'XXX'
      ) {
        continue;
      }

      // Detect 4-digit Kegiatan header row (e.g. 6380 or 2785 "Anggaran Datin yang dititip di RUMGA")
      if (/^\d{4}$/.test(colCode)) {
        currentKegPrefix = colCode;
        isTitipanSection = colUraian.toLowerCase().includes('dititip') || colUraian.toLowerCase().includes('titipan');
        currentRoObj = null;
        continue;
      }

      // Skip KRO header row (e.g. "2783.AEC" - 4 digits + 3 chars, only 1 dot)
      if (/^\d{4}\.[A-Z0-9]{3}$/i.test(colCode)) {
        currentRoObj = null;
        continue;
      }

      // Extract weekly values (filtering out weeks already realized before logCutoffSerial if present)
      const getWeekVal = (wIdx: number): number => {
        if (logCutoffSerial > 0 && weekSerials[wIdx] > 0 && weekSerials[wIdx] <= logCutoffSerial) {
          return 0;
        }
        return Number(row[oktBase + wIdx]) || 0;
      };

      const okt2 = getWeekVal(0);
      const okt3 = getWeekVal(1);
      const okt4 = getWeekVal(2);
      const nov1 = getWeekVal(3);
      const nov2 = getWeekVal(4);
      const nov3 = getWeekVal(5);
      const nov4 = getWeekVal(6);
      const des1 = getWeekVal(7);
      const des2 = getWeekVal(8);
      const des3 = getWeekVal(9);
      const des4 = getWeekVal(10);

      const totKeb = isExportLayout
        ? Number(row[21]) || 0
        : isTemplateOrExportLayout
        ? 0
        : Number(row[18]) || 0;
      const sisaDana = isExportLayout
        ? Number(row[22]) || 0
        : isTemplateOrExportLayout
        ? Number(row[18]) || 0
        : Number(row[19]) || 0;
      const ketRaw = isExportLayout
        ? row[23]
        : isTemplateOrExportLayout
        ? row[19]
        : row[20];
      const alasanRaw = !isTemplateOrExportLayout ? row[21] : null;
      const ketParts = [
        ketRaw ? String(ketRaw).trim() : '',
        alasanRaw ? String(alasanRaw).trim() : ''
      ].filter(Boolean);
      const ket = ketParts.join(' — ');

      // Match valid RO row: e.g. "6380.AAG.001" or "AAG.001"
      if (colCode && /^(\d{4}\.)?[A-Z0-9]{3}\.[A-Z0-9]{3}$/i.test(colCode)) {
        const normalizedCode = /^\d{4}\./.test(colCode)
          ? colCode
          : currentKegPrefix
          ? `${currentKegPrefix}.${colCode}`
          : colCode;
        const firstPart = normalizedCode.split('.')[0] || '';
        const kegInfo = /^\d{4}$/.test(firstPart) ? kegNumLookup[firstPart] : undefined;

        const paguVal = Number(colPagu) || 0;
        const realVal = Number(colReal) || 0;
        const pctVal = paguVal > 0 ? Number(((realVal / paguVal) * 100).toFixed(2)) : 0;
        const sisaVal =
          colSisa !== undefined && colSisa !== null && !Number.isNaN(Number(colSisa))
            ? Number(colSisa)
            : Math.max(0, paguVal - realVal);
        const schedSum = okt2 + okt3 + okt4 + nov1 + nov2 + nov3 + nov4 + des1 + des2 + des3 + des4;

        parentHasExplicitTotals =
          (row[18] !== undefined && row[18] !== null && row[18] !== '') ||
          (row[19] !== undefined && row[19] !== null && row[19] !== '');

        const effectiveDanaTidakTerserap = Math.max(0, sisaDana);
        const effectiveTotalKebutuhan =
          totKeb > 0
            ? Math.min(sisaVal, totKeb)
            : schedSum > 0
            ? Math.min(sisaVal, schedSum)
            : Math.max(0, sisaVal - effectiveDanaTidakTerserap);

        currentRoObj = {
          id: `ro-ajk-${Date.now()}-${parsedROs.length + 1}`,
          satkerId: 'satker-ajk',
          satkerNama: rowSatker || detectedSatker,
          unitKerjaId: 'unit-ajk',
          unitKerjaNama: rowUnit || (kegInfo ? kegInfo.unitKerjaNama : detectedUnit),
          kodeKegiatan: kegInfo ? kegInfo.kodeKegiatan : undefined,
          kodeRo: normalizedCode,
          namaRo: colUraian || normalizedCode,
          pagu: paguVal,
          realisasi: realVal,
          sisa: sisaVal,
          persentase: pctVal,
          status: this.calculateStatus(pctVal),
          jadwal: { okt2, okt3, okt4, nov1, nov2, nov3, nov4, des1, des2, des3, des4 },
          komponen: [],
          totalKebutuhan: effectiveTotalKebutuhan,
          danaTidakTerserap: effectiveDanaTidakTerserap,
          keterangan: isTitipanSection
            ? [ket, `Titipan AJK ${detectedUnit}`].filter(Boolean).join(' • ')
            : ket,
          updatedAt: new Date().toISOString(),
          updatedBy: isTitipanSection ? `${fileName} (Titipan)` : fileName
        };
        parsedROs.push(currentRoObj);
      } else if (currentRoObj && colUraian) {
        const subSchedSum = okt2 + okt3 + okt4 + nov1 + nov2 + nov3 + nov4 + des1 + des2 + des3 + des4;
        const hasSubSisa = colSisa !== undefined && colSisa !== null && colSisa !== '' && !Number.isNaN(Number(colSisa));
        const nextRow = ajkRows[r + 1] || [];
        const nextRowCode = isTemplateOrExportLayout ? nextRow[3] : nextRow[1];
        const nextRowUraian = isTemplateOrExportLayout ? nextRow[4] : nextRow[2];
        const isAccountGroupHeader =
          /^belanja (bahan|jasa profesi|perjalanan dinas|modal peralatan dan mesin|modal lainnya)$/i.test(colUraian) &&
          !nextRowCode &&
          Boolean(nextRowUraian);

        // Skip intermediate account group header rows (e.g. "Belanja Bahan", "Belanja Jasa Profesi", "Belanja Modal Lainnya")
        if ((!hasSubSisa && subSchedSum === 0) || isAccountGroupHeader) {
          continue;
        }

        // Accumulate weekly schedule onto parent RO
        currentRoObj.jadwal.okt2 = (currentRoObj.jadwal.okt2 || 0) + okt2;
        currentRoObj.jadwal.okt3 = (currentRoObj.jadwal.okt3 || 0) + okt3;
        currentRoObj.jadwal.okt4 = (currentRoObj.jadwal.okt4 || 0) + okt4;
        currentRoObj.jadwal.nov1 = (currentRoObj.jadwal.nov1 || 0) + nov1;
        currentRoObj.jadwal.nov2 = (currentRoObj.jadwal.nov2 || 0) + nov2;
        currentRoObj.jadwal.nov3 = (currentRoObj.jadwal.nov3 || 0) + nov3;
        currentRoObj.jadwal.nov4 = (currentRoObj.jadwal.nov4 || 0) + nov4;
        currentRoObj.jadwal.des1 = (currentRoObj.jadwal.des1 || 0) + des1;
        currentRoObj.jadwal.des2 = (currentRoObj.jadwal.des2 || 0) + des2;
        currentRoObj.jadwal.des3 = (currentRoObj.jadwal.des3 || 0) + des3;
        currentRoObj.jadwal.des4 = (currentRoObj.jadwal.des4 || 0) + des4;

        // Only add child totKeb/sisaDana if the parent RO row didn't already contain the sum
        if (!parentHasExplicitTotals) {
          if (totKeb > 0) currentRoObj.totalKebutuhan = (currentRoObj.totalKebutuhan || 0) + totKeb;
          if (sisaDana > 0) currentRoObj.danaTidakTerserap = (currentRoObj.danaTidakTerserap || 0) + sisaDana;
        }

        // Add sub-row as a KomponenRO item
        const kPagu = Number(colPagu) || 0;
        const kReal = Number(colReal) || 0;
        const kSisa = hasSubSisa ? Number(colSisa) : Math.max(0, kPagu - kReal);
        const kJadwal: JadwalMingguan = {};
        if (okt2 > 0) kJadwal.okt2 = okt2;
        if (okt3 > 0) kJadwal.okt3 = okt3;
        if (okt4 > 0) kJadwal.okt4 = okt4;
        if (nov1 > 0) kJadwal.nov1 = nov1;
        if (nov2 > 0) kJadwal.nov2 = nov2;
        if (nov3 > 0) kJadwal.nov3 = nov3;
        if (nov4 > 0) kJadwal.nov4 = nov4;
        if (des1 > 0) kJadwal.des1 = des1;
        if (des2 > 0) kJadwal.des2 = des2;
        if (des3 > 0) kJadwal.des3 = des3;
        if (des4 > 0) kJadwal.des4 = des4;

        if (!currentRoObj.komponen) currentRoObj.komponen = [];
        currentRoObj.komponen.push({
          id: `komp-${currentRoObj.kodeRo.replace(/\./g, '-')}-${currentRoObj.komponen.length + 1}`,
          nama: isTitipanSection ? `[Titipan ${detectedUnit}] ${colUraian}` : colUraian,
          pagu: kPagu,
          realisasi: kReal,
          sisa: kSisa,
          jadwal: kJadwal,
          keterangan: ket || undefined
        });

        if (ket && !currentRoObj.keterangan?.includes(ket)) {
          currentRoObj.keterangan = currentRoObj.keterangan
            ? `${currentRoObj.keterangan}; ${ket}`
            : ket;
        }
      }
    }

    // Reconcile parent RO totalKebutuhan & danaTidakTerserap with final accumulated schedule
    parsedROs.forEach(ro => {
      const schedSum = Object.values(ro.jadwal || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
      if (schedSum > 0) {
        ro.totalKebutuhan = schedSum;
        ro.danaTidakTerserap = Math.max(0, ro.sisa - ro.totalKebutuhan);
      } else {
        ro.danaTidakTerserap = Math.min(ro.sisa, Math.max(0, ro.danaTidakTerserap || 0));
        ro.totalKebutuhan = Math.max(0, ro.sisa - ro.danaTidakTerserap);
      }
    });

    if (parsedROs.length === 0) {
      return {
        success: false,
        data: [],
        detectedSatker,
        message: 'Tidak ditemukan data baris RO yang valid dalam berkas AJK tersebut.'
      };
    }

    return {
      success: true,
      data: parsedROs,
      detectedSatker,
      message: `Berhasil membaca ${parsedROs.length} RO beserta rincian komponen & jadwal mingguan dari matriks AJK (${ajkSheetName}).`
    };
  }

  // Apply imported ROs (Smart Upsert into storage and Supabase with progress callback)
  public async applyImportedROs(
    newROs: CapaianRO[],
    onProgress?: (pct: number, message: string) => void
  ): Promise<number> {
    if (!newROs || newROs.length === 0) return 0;

    if (onProgress) onProgress(10, 'Menyiapkan dan menggabungkan data...');

    // Ambil data terbaru dari Supabase terlebih dahulu agar tidak menimpa unggahan pengguna lain
    try {
      await this.fetchROsAsync();
    } catch (e) {
      // fallback ke local jika offline
    }

    const existing = this.getROs();
    const existingMap = new Map<string, CapaianRO>();
    existing.forEach(ex => {
      const key = this.getROKey(ex.satkerNama, ex.kodeKegiatan, ex.kodeRo);
      existingMap.set(key, ex);
    });

    const now = new Date().toISOString();
    const updatedOrNewROs: CapaianRO[] = [];

    newROs.forEach(n => {
      const key = this.getROKey(n.satkerNama, n.kodeKegiatan, n.kodeRo);
      const prev = existingMap.get(key);
      if (prev) {
        // Detect if imported row is a partial/titipan slice of a larger shared RO (e.g. 2785.EBA.994 or 2785.CAN.001)
        const isPartialTitipan =
          String(n.updatedBy || '').includes('(Titipan)') ||
          (prev.pagu > 0 && (n.pagu || 0) > 0 && (n.pagu || 0) < prev.pagu * 0.7 && (n.jadwal && Object.values(n.jadwal).some(v => Number(v) > 0 || (n.komponen && n.komponen.length > 0))));

        const effectivePagu = isPartialTitipan ? prev.pagu : (n.pagu !== undefined ? n.pagu : prev.pagu);
        const effectiveReal = isPartialTitipan ? prev.realisasi : (n.realisasi !== undefined ? n.realisasi : prev.realisasi);
        const effectiveSisa = Math.max(0, effectivePagu - effectiveReal);
        const effectivePct = effectivePagu > 0 ? Number(((effectiveReal / effectivePagu) * 100).toFixed(2)) : 0;
        const effectiveStatus = this.calculateStatus(effectivePct);

        // Schedule: if new upload has schedule (e.g. AJK file), use it; otherwise preserve existing schedule
        const nSchedSum = Object.values(n.jadwal || {}).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
        const activeJadwal = (n.jadwal && (nSchedSum > 0 || (n.komponen && n.komponen.length > 0)))
          ? n.jadwal
          : (prev.jadwal || {});
        const schedSum = Object.values(activeJadwal).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

        // SiLPA / Dana tidak terserap
        const danaTidakTerserap = isPartialTitipan
          ? (prev.danaTidakTerserap || 0)
          : schedSum > 0
          ? Math.max(0, effectiveSisa - Math.min(effectiveSisa, schedSum))
          : (n.danaTidakTerserap !== undefined && n.danaTidakTerserap >= 0)
          ? n.danaTidakTerserap
          : (prev.danaTidakTerserap || 0);

        // Total Kebutuhan
        let totalKebutuhan = effectiveSisa;
        if (schedSum > 0 && !isPartialTitipan) {
          totalKebutuhan = Math.min(effectiveSisa, schedSum);
        } else if (danaTidakTerserap > 0) {
          totalKebutuhan = Math.max(0, effectiveSisa - danaTidakTerserap);
        }

        const prevHasScheduledKomponen = (prev.komponen || []).some(
          k => k.jadwal && Object.values(k.jadwal).some(v => Number(v) > 0)
        );
        const newHasKomponen = n.komponen && n.komponen.length > 0;
        const newHasScheduledKomponen = (n.komponen || []).some(
          k => k.jadwal && Object.values(k.jadwal).some(v => Number(v) > 0)
        );

        let mergedKomponen = prev.komponen || [];
        if (isPartialTitipan && newHasKomponen) {
          // Keep existing non-titipan SAKTI components and append/update titipan components
          const nonTitipan = (prev.komponen || []).filter(k => !k.nama.startsWith('[Titipan '));
          mergedKomponen = [...nonTitipan, ...(n.komponen || [])];
        } else if (newHasScheduledKomponen || (newHasKomponen && !prevHasScheduledKomponen)) {
          mergedKomponen = n.komponen!;
        }

        const merged: CapaianRO = {
          ...prev,
          ...n,
          id: prev.id, // preserve existing database ID
          satkerId: prev.satkerId,
          satkerNama: prev.satkerNama,
          unitKerjaId: prev.unitKerjaId,
          unitKerjaNama: prev.unitKerjaNama,
          kodeKegiatan: prev.kodeKegiatan || n.kodeKegiatan,
          namaKegiatan: prev.namaKegiatan || n.namaKegiatan,
          kodeKro: prev.kodeKro || n.kodeKro,
          namaKro: prev.namaKro || n.namaKro,
          kodeRo: prev.kodeRo || n.kodeRo,
          namaRo: isPartialTitipan ? prev.namaRo : (n.namaRo || prev.namaRo),
          pagu: effectivePagu,
          realisasi: effectiveReal,
          sisa: effectiveSisa,
          persentase: effectivePct,
          status: effectiveStatus,
          jadwal: activeJadwal,
          totalKebutuhan,
          danaTidakTerserap,
          keterangan: n.keterangan || prev.keterangan || '',
          komponen: mergedKomponen,
          updatedAt: now,
          updatedBy: n.updatedBy || prev.updatedBy || 'Upload Data'
        };
        existingMap.set(key, merged);
        updatedOrNewROs.push(merged);
      } else {
        const item: CapaianRO = {
          ...n,
          id: n.id || `ro-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          updatedAt: now
        };
        existingMap.set(key, item);
        updatedOrNewROs.push(item);
      }
    });

    const finalROs = Array.from(existingMap.values());
    this.saveAllROs(finalROs);

    if (onProgress) onProgress(30, 'Menyimpan perubahan ke cache lokal...');

    // Upsert to Supabase in batches with progress reports
    try {
      const rows = updatedOrNewROs.map(ro => this.mapROToRow(ro));
      const batchSize = 50;
      const totalBatches = Math.ceil(rows.length / batchSize);

      for (let i = 0; i < rows.length; i += batchSize) {
        const batchNum = Math.floor(i / batchSize) + 1;
        const batch = rows.slice(i, i + batchSize);

        const currentPct = 30 + Math.floor((batchNum / totalBatches) * 65);
        if (onProgress) {
          onProgress(currentPct, `Mengunggah ke database Supabase (Batch ${batchNum}/${totalBatches})...`);
        }

        await supabase
          .from('monitoring_capaian_ro')
          .upsert(batch, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data import ke Supabase:', err);
    }

    if (onProgress) onProgress(100, 'Sinkronisasi berhasil diselesaikan!');

    return updatedOrNewROs.length;
  }

  // Export RO and AJK Matrix to Excel
  public exportToExcel(ros?: CapaianRO[], fileName?: string): void {
    const list = ros || this.getROs();

    const data = list.map((r, index) => ({
      No: index + 1,
      'Satuan Kerja (Eselon I)': r.satkerNama,
      'Unit Kerja (Eselon II)': r.unitKerjaNama,
      'Kode RO': r.kodeRo,
      'Uraian Rincian Output': r.namaRo,
      'Pagu (Rp)': r.pagu,
      'Realisasi SP2D (Rp)': r.realisasi,
      'Persentase (%)': `${r.persentase}%`,
      'Sisa Anggaran (Rp)': r.sisa,
      'Status Target': r.status,
      'Oktober II': r.jadwal.okt2 || 0,
      'Oktober III': r.jadwal.okt3 || 0,
      'Oktober IV': r.jadwal.okt4 || 0,
      'November I': r.jadwal.nov1 || 0,
      'November II': r.jadwal.nov2 || 0,
      'November III': r.jadwal.nov3 || 0,
      'November IV': r.jadwal.nov4 || 0,
      'Desember I': r.jadwal.des1 || 0,
      'Desember II': r.jadwal.des2 || 0,
      'Desember III': r.jadwal.des3 || 0,
      'Desember IV': r.jadwal.des4 || 0,
      'Total Kebutuhan Okt-Des': r.totalKebutuhan || 0,
      'Perkiraan Dana Tidak Terserap': r.danaTidakTerserap || 0,
      'Keterangan / Mitigasi': r.keterangan || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Capaian & AJK');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const name = fileName || `Monitoring_Capaian_Anggaran_KemenPPPA_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, name);
  }

  // Download blank AJK template
  public downloadTemplate(): void {
    const templateData = [
      {
        No: 1,
        'Satuan Kerja (Eselon I)': 'Sekretariat Kementerian',
        'Unit Kerja (Eselon II)': 'Biro Data dan Informasi',
        'Kode RO': '6380.AAG.001',
        'Uraian Rincian Output': 'Peraturan Menteri tentang SIMFONI PPA',
        'Pagu (Rp)': 2800000,
        'Realisasi (Rp)': 2217500,
        'Oktober II': 0,
        'Oktober III': 0,
        'Oktober IV': 0,
        'November I': 0,
        'November II': 576000,
        'November III': 0,
        'November IV': 0,
        'Desember I': 0,
        'Desember II': 0,
        'Desember III': 0,
        'Desember IV': 0,
        'Perkiraan Dana Tidak Terserap': 6500,
        Keterangan: 'Rencana konsinyering penyusunan draf Permen'
      },
      {
        No: 2,
        'Satuan Kerja (Eselon I)': 'Contoh: Deputi Kesetaraan Gender',
        'Unit Kerja (Eselon II)': 'Contoh: Asdep PUG Bidang Ekonomi',
        'Kode RO': '2790.AEA.001',
        'Uraian Rincian Output': 'Contoh Uraian Rincian Output',
        'Pagu (Rp)': 50000000,
        'Realisasi (Rp)': 35000000,
        'Oktober II': 5000000,
        'Oktober III': 5000000,
        'Oktober IV': 5000000,
        'November I': 0,
        'November II': 0,
        'November III': 0,
        'November IV': 0,
        'Desember I': 0,
        'Desember II': 0,
        'Desember III': 0,
        'Desember IV': 0,
        'Perkiraan Dana Tidak Terserap': 0,
        Keterangan: 'Pelaksanaan workshop'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template AJK Capaian');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'Template_Upload_Capaian_AJK_KemenPPPA.xlsx');
  }
}

export const monitoringCapaianService = MonitoringCapaianService.getInstance();
