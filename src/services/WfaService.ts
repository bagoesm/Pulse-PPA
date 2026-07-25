// src/services/WfaService.ts
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { User, WfaLaporan, WfaSchedule } from '../../types';
import { handleDatabaseOperation } from '../utils/errorHandling';

// Fallback in-memory / localStorage storage key
const STORAGE_KEY_REPORTS = 'pulse_wfa_laporan_data';
const STORAGE_KEY_SCHEDULES = 'pulse_wfa_schedules_data';

export class WfaService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  /**
   * Helper to map DB row to WfaLaporan model
   */
  private mapFromDB(row: any): WfaLaporan {
    return {
      id: row.id,
      userId: row.user_id,
      nama: row.nama,
      nip: row.nip || '',
      unitKerja: row.unit_kerja || '',
      jabatan: row.jabatan || '',
      rencanaHasilKinerja: row.rencana_hasil_kinerja || '',
      rencanaKinerja: row.rencana_kinerja || '',
      outputKinerja: row.output_kinerja || '',
      linkDataDukung: row.link_data_dukung || '',
      statusPelaksanaan: row.status_pelaksanaan || 'Selesai',
      tanggalWfa: row.tanggal_wfa || '',
      penilaian: row.penilaian || null,
      evaluatedBy: row.evaluated_by || null,
      evaluatedAt: row.evaluated_at || null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Helper to map WfaLaporan model to DB row
   */
  private mapToDB(data: Partial<WfaLaporan>): any {
    const row: any = {};
    if (data.id) row.id = data.id;
    if (data.userId) row.user_id = data.userId;
    if (data.nama !== undefined) row.nama = data.nama;
    if (data.nip !== undefined) row.nip = data.nip;
    if (data.unitKerja !== undefined) row.unit_kerja = data.unitKerja;
    if (data.jabatan !== undefined) row.jabatan = data.jabatan;
    if (data.rencanaHasilKinerja !== undefined) row.rencana_hasil_kinerja = data.rencanaHasilKinerja;
    if (data.rencanaKinerja !== undefined) row.rencana_kinerja = data.rencanaKinerja;
    if (data.outputKinerja !== undefined) row.output_kinerja = data.outputKinerja;
    if (data.linkDataDukung !== undefined) row.link_data_dukung = data.linkDataDukung;
    if (data.statusPelaksanaan !== undefined) row.status_pelaksanaan = data.statusPelaksanaan;
    if (data.tanggalWfa !== undefined) row.tanggal_wfa = data.tanggalWfa;
    if (data.penilaian !== undefined) row.penilaian = data.penilaian;
    if (data.evaluatedBy !== undefined) row.evaluated_by = data.evaluatedBy;
    if (data.evaluatedAt !== undefined) row.evaluated_at = data.evaluatedAt;
    row.updated_at = new Date().toISOString();
    return row;
  }

  // --- Local Storage Fallbacks ---
  private getLocalReports(): WfaLaporan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalReports(reports: WfaLaporan[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to save WFA local reports', e);
    }
  }

  private getLocalSchedules(): WfaSchedule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalSchedules(schedules: WfaSchedule[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch (e) {
      console.error('Failed to save WFA local schedules', e);
    }
  }

  /**
   * Get WFA Reports based on user role and filters
   */
  async getWfaLaporan(
    user: User,
    startDate?: string,
    endDate?: string,
    unitKerjaFilter?: string
  ): Promise<WfaLaporan[]> {
    try {
      let query = this.supabase.from('wfa_laporan').select('*');

      // Role-based visibility scoping
      if (user.role === 'Staff') {
        // Staff can ONLY view their own reports
        query = query.eq('user_id', user.id);
      } else if (user.role === 'Atasan') {
        // Atasan can view reports of their unit kerja / divisi
        const targetUnit = unitKerjaFilter || user.divisi;
        if (targetUnit) {
          query = query.eq('unit_kerja', targetUnit);
        }
      } else if (user.role === 'Super Admin') {
        // Super Admin can see all, or filter by specific unit if requested
        if (unitKerjaFilter && unitKerjaFilter !== 'Semua') {
          query = query.eq('unit_kerja', unitKerjaFilter);
        }
      }

      if (startDate) {
        query = query.gte('tanggal_wfa', startDate);
      }
      if (endDate) {
        query = query.lte('tanggal_wfa', endDate);
      }

      const { data, error } = await query.order('tanggal_wfa', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => this.mapFromDB(row));
    } catch (error) {
      console.warn('WFA Service fallback to local storage for getWfaLaporan:', error);
      let local = this.getLocalReports();

      // Apply role filters to local fallback
      if (user.role === 'Staff') {
        local = local.filter((r) => r.userId === user.id);
      } else if (user.role === 'Atasan') {
        const targetUnit = unitKerjaFilter || user.divisi;
        if (targetUnit) {
          local = local.filter((r) => r.unitKerja === targetUnit);
        }
      } else if (user.role === 'Super Admin') {
        if (unitKerjaFilter && unitKerjaFilter !== 'Semua') {
          local = local.filter((r) => r.unitKerja === unitKerjaFilter);
        }
      }

      if (startDate) {
        local = local.filter((r) => r.tanggalWfa >= startDate);
      }
      if (endDate) {
        local = local.filter((r) => r.tanggalWfa <= endDate);
      }

      return local.sort((a, b) => b.tanggalWfa.localeCompare(a.tanggalWfa));
    }
  }

  /**
   * Create a new WFA Laporan
   */
  async createWfaLaporan(laporan: Omit<WfaLaporan, 'id'>): Promise<WfaLaporan> {
    try {
      return await handleDatabaseOperation(async () => {
        const row = this.mapToDB(laporan);
        const { data, error } = await this.supabase
          .from('wfa_laporan')
          .insert([row])
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      }, 'createWfaLaporan');
    } catch (error) {
      console.warn('WFA Service fallback to local storage for createWfaLaporan:', error);
      const local = this.getLocalReports();
      const newLaporan: WfaLaporan = {
        ...laporan,
        id: 'wfa-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      local.unshift(newLaporan);
      this.saveLocalReports(local);
      return newLaporan;
    }
  }

  /**
   * Update an existing WFA Laporan
   */
  async updateWfaLaporan(id: string, updates: Partial<WfaLaporan>): Promise<WfaLaporan> {
    try {
      return await handleDatabaseOperation(async () => {
        const row = this.mapToDB(updates);
        const { data, error } = await this.supabase
          .from('wfa_laporan')
          .update(row)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return this.mapFromDB(data);
      }, 'updateWfaLaporan');
    } catch (error) {
      console.warn('WFA Service fallback to local storage for updateWfaLaporan:', error);
      const local = this.getLocalReports();
      const index = local.findIndex((r) => r.id === id);
      if (index !== -1) {
        local[index] = {
          ...local[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        this.saveLocalReports(local);
        return local[index];
      }
      throw error;
    }
  }

  /**
   * Delete a WFA Laporan
   */
  async deleteWfaLaporan(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('wfa_laporan')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }, 'deleteWfaLaporan');
    } catch (error) {
      console.warn('WFA Service fallback to local storage for deleteWfaLaporan:', error);
      let local = this.getLocalReports();
      local = local.filter((r) => r.id !== id);
      this.saveLocalReports(local);
    }
  }

  /**
   * Toggle / Evaluate thumbs up (👍) rating for a WFA report by Atasan or Super Admin
   */
  async evaluateWfaLaporan(id: string, penilaian: string | null, evaluator: User): Promise<WfaLaporan> {
    const updates: Partial<WfaLaporan> = {
      penilaian: penilaian,
      evaluatedBy: evaluator.name,
      evaluatedAt: new Date().toISOString(),
    };
    return this.updateWfaLaporan(id, updates);
  }

  /**
   * Get WFA Admin Schedules (custom added dates or disabled Fridays)
   */
  async getWfaSchedules(): Promise<WfaSchedule[]> {
    try {
      const { data, error } = await this.supabase
        .from('wfa_schedules')
        .select('*')
        .order('tanggal', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        tanggal: row.tanggal,
        isWfa: row.is_wfa,
        keterangan: row.keterangan || '',
        createdBy: row.created_by || '',
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.warn('WFA Service fallback to local storage for getWfaSchedules:', error);
      return this.getLocalSchedules();
    }
  }

  /**
   * Save (Insert/Update) a WFA Schedule date rule
   */
  async saveWfaSchedule(schedule: Omit<WfaSchedule, 'id'> & { id?: string }): Promise<WfaSchedule> {
    try {
      return await handleDatabaseOperation(async () => {
        const payload: any = {
          tanggal: schedule.tanggal,
          is_wfa: schedule.isWfa,
          keterangan: schedule.keterangan,
          created_by: schedule.createdBy,
        };
        if (schedule.id) payload.id = schedule.id;

        const { data, error } = await this.supabase
          .from('wfa_schedules')
          .upsert(payload, { onConflict: 'tanggal' })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          tanggal: data.tanggal,
          isWfa: data.is_wfa,
          keterangan: data.keterangan || '',
          createdBy: data.created_by || '',
          createdAt: data.created_at,
        };
      }, 'saveWfaSchedule');
    } catch (error) {
      console.warn('WFA Service fallback to local storage for saveWfaSchedule:', error);
      const local = this.getLocalSchedules();
      const existingIdx = local.findIndex((s) => s.tanggal === schedule.tanggal);
      const item: WfaSchedule = {
        id: schedule.id || 'sch-' + Date.now(),
        tanggal: schedule.tanggal,
        isWfa: schedule.isWfa,
        keterangan: schedule.keterangan || '',
        createdBy: schedule.createdBy || '',
        createdAt: new Date().toISOString(),
      };
      if (existingIdx !== -1) {
        local[existingIdx] = item;
      } else {
        local.push(item);
      }
      this.saveLocalSchedules(local);
      return item;
    }
  }

  /**
   * Delete a custom WFA schedule
   */
  async deleteWfaSchedule(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('wfa_schedules')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }, 'deleteWfaSchedule');
    } catch (error) {
      console.warn('WFA Service fallback for deleteWfaSchedule:', error);
      let local = this.getLocalSchedules();
      local = local.filter((s) => s.id !== id);
      this.saveLocalSchedules(local);
    }
  }

  /**
   * Helper to compute list of allowed WFA dates for the input modal
   * Combines default Fridays (for current year) with custom admin schedules.
   * If onlyActiveWindow = true, returns ONLY dates within current week's active WFA schedule window.
   */
  async getAllowedWfaDates(onlyActiveWindow: boolean = true): Promise<{ date: string; keterangan?: string; isCustom?: boolean }[]> {
    const schedules = await this.getWfaSchedules();
    const disabledMap = new Map<string, string>(); // date -> keterangan
    const customActiveMap = new Map<string, string>(); // date -> keterangan

    schedules.forEach((s) => {
      if (!s.isWfa) {
        disabledMap.set(s.tanggal, s.keterangan || 'Libur / Non-WFA');
      } else {
        customActiveMap.set(s.tanggal, s.keterangan || 'Tanggal WFA Khusus');
      }
    });

    const allowedDates: { date: string; keterangan?: string; isCustom?: boolean }[] = [];
    const dateSet = new Set<string>();

    // Generate standard Fridays for current year and surrounding months
    const today = new Date();
    const startDate = new Date(today.getFullYear(), 0, 1);
    const endDate = new Date(today.getFullYear(), 11, 31);

    let curr = new Date(startDate);
    while (curr <= endDate) {
      if (curr.getDay() === 5) {
        // Friday
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (!disabledMap.has(dateStr)) {
          allowedDates.push({ date: dateStr, keterangan: 'Jumat Regular' });
          dateSet.add(dateStr);
        }
      }
      curr.setDate(curr.getDate() + 1);
    }

    // Add custom active dates that might not be Fridays
    customActiveMap.forEach((ket, dStr) => {
      if (!dateSet.has(dStr)) {
        allowedDates.push({ date: dStr, keterangan: ket, isCustom: true });
      }
    });

    const sorted = allowedDates.sort((a, b) => b.date.localeCompare(a.date));

    if (!onlyActiveWindow) {
      return sorted;
    }

    // Filter to ONLY dates within current active submission window
    // (From Monday 00:00 of current week until Monday 09:00 AM of following week)
    const now = new Date();
    const activeDates = sorted.filter((item) => {
      const parts = item.date.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      // Calculate Monday 00:00 of that week
      const day = d.getDay();
      const daysToMon = day === 0 ? 6 : day - 1;
      const startOfWindow = new Date(d);
      startOfWindow.setDate(startOfWindow.getDate() - daysToMon);
      startOfWindow.setHours(0, 0, 0, 0);

      // Calculate Monday 09:00 AM of next week (deadline)
      let daysToNextMon = 0;
      if (day === 5) daysToNextMon = 3;
      else if (day === 6) daysToNextMon = 2;
      else if (day === 0) daysToNextMon = 1;
      else daysToNextMon = 8 - day;

      const deadline = new Date(d);
      deadline.setDate(deadline.getDate() + daysToNextMon);
      deadline.setHours(9, 0, 0, 0);

      return now >= startOfWindow && now <= deadline;
    });

    if (activeDates.length > 0) {
      return activeDates;
    }

    // Fallback if current day is between cycles: return closest upcoming WFA date
    const futureDates = sorted.filter((item) => item.date >= today.toISOString().slice(0, 10));
    return futureDates.length > 0 ? futureDates.slice(-1) : sorted.slice(0, 1);
  }
}

export const wfaService = new WfaService();
