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

const STORAGE_KEY = 'pulse_rkkl_monitoring_capaian_v3';
const DUMMY_IDS = new Set(['ro-39', 'ro-40', 'ro-41', 'ro-42', 'ro-43', 'ro-44']);

export const SAKTI_SATKER_MAP: Record<string, { id: string; kode: string; nama: string }> = {
  '427944': { id: 'satker-427944', kode: '01', nama: 'Sekretariat Kementerian' },
  '664941': { id: 'satker-664941', kode: '02', nama: 'Deputi Bidang Kesetaraan Gender' },
  '664958': { id: 'satker-664958', kode: '03', nama: 'Deputi Bidang Perlindungan Hak Perempuan' },
  '664962': { id: 'satker-664962', kode: '04', nama: 'Deputi Bidang Perlindungan Khusus Anak' },
  '664979': { id: 'satker-664979', kode: '05', nama: 'Deputi Bidang Pemenuhan Hak Anak' },
  '664983': { id: 'satker-664983', kode: '06', nama: 'Komisi Perlindungan Anak Indonesia (KPAI)' }
};

export const SAKTI_KEGIATAN_UNIT_MAP: Record<string, string> = {
  'WA.2780': 'Biro Perencanaan dan Keuangan',
  'WA.2781': 'Biro Hubungan Masyarakat dan Umum',
  'WA.2782': 'Biro Sumber Daya Manusia dan Organisasi',
  'WA.2783': 'Biro Hukum dan Kerja Sama',
  'WA.2784': 'Inspektorat',
  'WA.2785': 'Biro Data dan Informasi',
  'WA.2789': 'Sekretariat Kementerian',

  'DE.2790': 'Asdep PUG Bidang Politik, Hukum, dan Hankam',
  'DE.2791': 'Asdep PUG Bidang Sosial dan Budaya',
  'DE.2792': 'Asdep PUG Bidang Ekonomi',
  'DE.2793': 'Asdep Partisipasi Lembaga Profesi dan Dunia Usaha',
  'DE.2794': 'Asdep Partisipasi Masyarakat',
  'DE.2795': 'Sekretariat Deputi Kesetaraan Gender',

  'DE.2796': 'Asdep Perlindungan Hak Perempuan Pekerja dan TPPO',
  'DE.2801': 'Asdep Perlindungan Hak Perempuan Rumah Tangga dan Rentan',
  'DE.2802': 'Asdep Perlindungan Hak Perempuan dalam Situasi Darurat dan Kondisi Khusus',
  'DE.2803': 'Sekretariat Deputi Perlindungan Hak Perempuan',

  'DE.2797': 'Asdep Perlindungan Khusus Anak dari Kekerasan',
  'DE.2798': 'Asdep Perlindungan Anak Kondisi Khusus',
  'DE.2799': 'Asdep Perlindungan Khusus Anak Memerlukan Perlindungan Khusus',
  'DE.2800': 'Sekretariat Deputi Perlindungan Khusus Anak',

  'DE.2807': 'Asdep Pemenuhan Hak Sipil, Informasi, dan Partisipasi Anak',
  'DE.2808': 'Asdep Pemenuhan Hak Anak atas Pengasuhan dan Lingkungan',
  'DE.2809': 'Asdep Pemenuhan Hak Anak atas Kesehatan dan Pendidikan',
  'DE.2810': 'Sekretariat Deputi Pemenuhan Hak Anak',

  'DE.2818': 'Sekretariat Komisi Perlindungan Anak Indonesia'
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
    return `${satkerNama}_${kodeKegiatan || ''}_${kodeRo}`;
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
      totalKebutuhan: Number(row.total_kebutuhan || 0),
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

          const mapped = data
            .filter((r: any) => !DUMMY_IDS.has(r.id))
            .map(r => {
              const ro = this.mapRowToRO(r);
              const key = this.getROKey(ro.satkerNama, ro.kodeKegiatan, ro.kodeRo);
              const local = localMap.get(key);
              const init = initialMap.get(key);

              if (local && local.komponen && local.komponen.length > 0) {
                ro.komponen = local.komponen;
              } else if (init && init.komponen && init.komponen.length > 0) {
                ro.komponen = init.komponen;
              }
              return ro;
            });

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
        await supabase.from('monitoring_capaian_ro').upsert(batch, { onConflict: 'kode_ro,unit_kerja_nama' });
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
        .upsert(this.mapROToRow(updatedRO), { onConflict: 'kode_ro,unit_kerja_nama' })
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

    const updated: CapaianRO = {
      ...current,
      jadwal: { ...jadwal },
      totalKebutuhan: totalSched > 0 ? totalSched : (current.totalKebutuhan || current.sisa),
      danaTidakTerserap: danaTidakTerserap !== undefined ? danaTidakTerserap : (current.danaTidakTerserap || 0),
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

  // Get aggregated Satker list (Eselon I)
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

    return Array.from(map.values()).map(s => {
      const sisa = Math.max(0, s.pagu - s.realisasi);
      const persentase = s.pagu > 0 ? Number(((s.realisasi / s.pagu) * 100).toFixed(2)) : 0;
      return {
        id: s.id,
        kode: s.kode,
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

          const fileName = file.name.toLowerCase();
          const isAjk = fileName.includes('ajk') || wb.SheetNames.some(s => s.toLowerCase().includes('ajk'));

          if (isAjk) {
            const result = this.parseAjkRows(rows, wb, file.name, overrideSatkerNama);
            resolve(result);
          } else {
            const result = this.parseSaktiRows(rows, file.name, overrideSatkerNama);
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
      // Auto-detect Satker from first 30 rows
      for (let r = 0; r < Math.min(30, rows.length); r++) {
        const row = rows[r] || [];
        const rStr = row.join(' ');
        if (rStr.includes('Satuan Kerja')) {
          const satkerCode = String(row[14] || '').trim();
          const satkerNameRaw = String(row[15] || '').trim();
          if (SAKTI_SATKER_MAP[satkerCode]) {
            detectedSatkerInfo = SAKTI_SATKER_MAP[satkerCode];
            break;
          }
          for (const [code, info] of Object.entries(SAKTI_SATKER_MAP)) {
            if (
              satkerNameRaw.toUpperCase().includes(code) ||
              satkerNameRaw.toUpperCase().includes(info.nama.toUpperCase()) ||
              info.nama.toUpperCase().includes(satkerNameRaw.toUpperCase())
            ) {
              detectedSatkerInfo = info;
              break;
            }
          }
          if (detectedSatkerInfo) break;
        }
      }
    }

    if (!detectedSatkerInfo) {
      // Fallback check full text
      const fullText = rows.slice(0, 20).map(r => (r || []).join(' ')).join(' ').toUpperCase();
      for (const info of Object.values(SAKTI_SATKER_MAP)) {
        if (fullText.includes(info.nama.toUpperCase())) {
          detectedSatkerInfo = info;
          break;
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
          name: String(row[8] || row[3] || '').trim()
        };
        continue;
      }

      // Match KRO e.g. AEC or PEA
      if (/^[A-Z0-9]{3}$/.test(c2)) {
        currentKro = {
          code: c2,
          name: String(row[6] || '').trim()
        };
        continue;
      }

      // Match RO e.g. AEC.001 or PEA.001
      if (/^[A-Z0-9]{3}\.[A-Z0-9]{3}$/.test(c2)) {
        const roCode = c2;
        const roKey = this.getROKey(detectedSatkerInfo.nama, currentKegiatan.code, roCode);

        const roName = String(row[10] || row[6] || row[8] || roCode).trim();
        const pagu = Number(row[16] || 0);
        const realisasi = Number(row[25] !== undefined && row[25] !== null ? row[25] : (row[24] || 0));
        const sisa = Math.max(0, pagu - realisasi);
        const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;

        let unitKerja = SAKTI_KEGIATAN_UNIT_MAP[currentKegiatan.code];
        if (!unitKerja) {
          unitKerja = currentKegiatan.name || detectedSatkerInfo.nama;
        }

        if (!roMap.has(roKey)) {
          currentRo = {
            id: `ro-${detectedSatkerInfo.kode}-${roMap.size + 1}`,
            satkerId: detectedSatkerInfo.id,
            satkerNama: detectedSatkerInfo.nama,
            unitKerjaId: `unit-${currentKegiatan.code || 'gen'}`,
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
            totalKebutuhan: sisa,
            danaTidakTerserap: 0,
            keterangan: '',
            updatedAt: new Date().toISOString(),
            updatedBy: fileName
          };
          roMap.set(roKey, currentRo);
        } else {
          currentRo = roMap.get(roKey)!;
        }
        continue;
      }

      // Match Komponen e.g. 051
      if (/^\d{3}$/.test(c4) && currentRo) {
        const kompKode = c4;
        const kompNama = String(row[9] || '').trim();
        const pagu = Number(row[16] || 0);
        const realisasi = Number(row[25] !== undefined && row[25] !== null ? row[25] : (row[24] || 0));
        const sisa = Math.max(0, pagu - realisasi);
        const persentase = pagu > 0 ? Number(((realisasi / pagu) * 100).toFixed(2)) : 0;

        const existingKomp = currentRo.komponen.find(k => k.kode === kompKode);
        if (!existingKomp) {
          currentRo.komponen.push({
            id: `komp-${currentRo.kodeRo}-${kompKode}`,
            kode: kompKode,
            nama: kompNama,
            pagu,
            realisasi,
            sisa,
            persentase,
            status: this.calculateStatus(persentase)
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
    const ajkSheetName = wb.SheetNames.find(s => s.toLowerCase().includes('ajk')) || wb.SheetNames[0];
    const ajkWs = wb.Sheets[ajkSheetName];
    const ajkRows: any[][] = XLSX.utils.sheet_to_json(ajkWs, { header: 1, defval: null });

    let detectedSatker = overrideSatkerNama && overrideSatkerNama !== 'auto' ? overrideSatkerNama : 'Sekretariat Kementerian';
    let detectedUnit = 'Unit Kerja Terkait';

    const headerSlice = ajkRows.slice(0, 10).map(r => (r || []).join(' ').toLowerCase()).join(' ');
    const fullTextCheck = (fileName + ' ' + headerSlice).toLowerCase();

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
      } else if (fullTextCheck.includes('sekretariat')) {
        detectedSatker = 'Sekretariat Kementerian';
      }
    }

    for (let i = 0; i < Math.min(6, ajkRows.length); i++) {
      const rowText = (ajkRows[i] || []).join(' ').toLowerCase();
      if (rowText.includes('biro data')) detectedUnit = 'Biro Data dan Informasi';
      else if (rowText.includes('biro perencanaan')) detectedUnit = 'Biro Perencanaan dan Keuangan';
      else if (rowText.includes('biro hukum')) detectedUnit = 'Biro Hukum dan Kerja Sama';
      else if (rowText.includes('biro sdm')) detectedUnit = 'Biro Sumber Daya Manusia dan Organisasi';
      else if (rowText.includes('biro umum')) detectedUnit = 'Biro Hubungan Masyarakat dan Umum';
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
      if (strRow.includes('pagu') && (strRow.includes('kegiatan') || strRow.includes('uraian'))) {
        headerRowIndex = r;
        break;
      }
    }

    const startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 5;
    const parsedROs: CapaianRO[] = [];
    let currentRoObj: CapaianRO | null = null;

    for (let r = startIdx; r < ajkRows.length; r++) {
      const row = ajkRows[r] || [];
      const colCode = row[1];
      const colUraian = row[2];
      const colPagu = row[3];
      const colReal = row[4];
      const colSisa = row[6];

      const okt2 = Number(row[7]) || 0;
      const okt3 = Number(row[8]) || 0;
      const okt4 = Number(row[9]) || 0;
      const nov1 = Number(row[10]) || 0;
      const nov2 = Number(row[11]) || 0;
      const nov3 = Number(row[12]) || 0;
      const nov4 = Number(row[13]) || 0;
      const des1 = Number(row[14]) || 0;
      const des2 = Number(row[15]) || 0;
      const des3 = Number(row[16]) || 0;
      const des4 = Number(row[17]) || 0;
      const totKeb = Number(row[18]) || 0;
      const sisaDana = Number(row[19]) || 0;
      const ket = row[20] ? String(row[20]).trim() : '';

      if (colCode && String(colCode).includes('.')) {
        const paguVal = Number(colPagu) || 0;
        const realVal = Number(colReal) || 0;
        const pctVal = paguVal > 0 ? Number(((realVal / paguVal) * 100).toFixed(2)) : 0;
        const sisaVal = Number(colSisa) || Math.max(0, paguVal - realVal);

        currentRoObj = {
          id: `ro-ajk-${Date.now()}-${parsedROs.length + 1}`,
          satkerId: 'satker-ajk',
          satkerNama: detectedSatker,
          unitKerjaId: 'unit-ajk',
          unitKerjaNama: detectedUnit,
          kodeRo: String(colCode).trim(),
          namaRo: colUraian ? String(colUraian).trim() : String(colCode).trim(),
          pagu: paguVal,
          realisasi: realVal,
          sisa: sisaVal,
          persentase: pctVal,
          status: this.calculateStatus(pctVal),
          jadwal: { okt2, okt3, okt4, nov1, nov2, nov3, nov4, des1, des2, des3, des4 },
          komponen: [],
          totalKebutuhan: totKeb || sisaVal,
          danaTidakTerserap: sisaDana,
          keterangan: ket,
          updatedAt: new Date().toISOString(),
          updatedBy: fileName
        };
        parsedROs.push(currentRoObj);
      } else if (currentRoObj && colUraian) {
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
        if (totKeb) currentRoObj.totalKebutuhan = (currentRoObj.totalKebutuhan || 0) + totKeb;
        if (sisaDana) currentRoObj.danaTidakTerserap = (currentRoObj.danaTidakTerserap || 0) + sisaDana;
        if (ket) {
          currentRoObj.keterangan = currentRoObj.keterangan
            ? `${currentRoObj.keterangan}; ${ket}`
            : ket;
        }
      }
    }

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
      message: `Berhasil membaca ${parsedROs.length} RO dari matriks AJK.`
    };
  }

  // Apply imported ROs (Smart Upsert into storage and Supabase)
  public async applyImportedROs(newROs: CapaianRO[]): Promise<number> {
    if (!newROs || newROs.length === 0) return 0;

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
        // Merge: keep custom schedule/keterangan if not present in newRO
        const merged: CapaianRO = {
          ...prev,
          ...n,
          id: prev.id, // preserve existing database ID
          jadwal: n.jadwal && Object.keys(n.jadwal).length > 0 ? n.jadwal : (prev.jadwal || {}),
          totalKebutuhan: n.totalKebutuhan || prev.totalKebutuhan || n.sisa,
          danaTidakTerserap: n.danaTidakTerserap !== undefined ? n.danaTidakTerserap : (prev.danaTidakTerserap || 0),
          keterangan: n.keterangan || prev.keterangan || '',
          komponen: n.komponen && n.komponen.length > 0 ? n.komponen : (prev.komponen || []),
          updatedAt: now
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

    // Upsert to Supabase in batches
    try {
      const rows = updatedOrNewROs.map(ro => this.mapROToRow(ro));
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        await supabase
          .from('monitoring_capaian_ro')
          .upsert(batch, { onConflict: 'kode_ro,unit_kerja_nama' });
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data import ke Supabase:', err);
    }

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
        'Pagu (Rp)': 10000000,
        'Realisasi (Rp)': 2217500,
        'Oktober II': 0,
        'Oktober III': 0,
        'Oktober IV': 3600000,
        'November I': 3600000,
        'November II': 576000,
        'November III': 0,
        'November IV': 0,
        'Desember I': 0,
        'Desember II': 0,
        'Desember III': 0,
        'Desember IV': 0,
        'Perkiraan Dana Tidak Terserap': 0,
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
