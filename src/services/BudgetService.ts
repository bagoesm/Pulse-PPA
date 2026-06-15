// src/services/BudgetService.ts
// Service layer for APBN & Hibah Budget Realization business logic
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { BudgetMaster, BudgetTransaction, BudgetEditor, MasterSumberDana } from '../../types';
import { handleDatabaseOperation } from '../utils/errorHandling';

export class BudgetService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  // --- Master Sumber Dana CRUD ---
  async fetchMasterSumberDana(): Promise<MasterSumberDana[]> {
    return handleDatabaseOperation(async () => {
      const { data, error } = await this.supabase
        .from('master_sumber_dana')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at
      }));
    }, 'fetchMasterSumberDana');
  }

  async createMasterSumberDana(name: string): Promise<MasterSumberDana> {
    return handleDatabaseOperation(async () => {
      const { data, error } = await this.supabase
        .from('master_sumber_dana')
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
      };
    }, 'createMasterSumberDana');
  }

  async updateMasterSumberDana(id: string, name: string): Promise<MasterSumberDana> {
    return handleDatabaseOperation(async () => {
      const { data, error } = await this.supabase
        .from('master_sumber_dana')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
      };
    }, 'updateMasterSumberDana');
  }

  async deleteMasterSumberDana(id: string): Promise<void> {
    return handleDatabaseOperation(async () => {
      const { error } = await this.supabase
        .from('master_sumber_dana')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }, 'deleteMasterSumberDana');
  }

  // --- Budget Editors CRUD ---
  async fetchBudgetEditors(divisi?: string): Promise<BudgetEditor[]> {
    return handleDatabaseOperation(async () => {
      let query = this.supabase
        .from('budget_editors')
        .select(`
          id,
          user_id,
          divisi,
          created_at
        `);
      
      if (divisi && divisi !== 'All') {
        query = query.eq('divisi', divisi);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles to join and show display name/email
      const { data: profiles, error: pError } = await this.supabase
        .from('profiles')
        .select('id, name, email');
      
      const profileMap = new Map();
      if (!pError && profiles) {
        profiles.forEach((p: any) => profileMap.set(p.id, p));
      }

      return (data || []).map((row: any) => {
        const profile = profileMap.get(row.user_id);
        return {
          id: row.id,
          userId: row.user_id,
          divisi: row.divisi,
          createdAt: row.created_at,
          userName: profile?.name || 'Staff',
          userEmail: profile?.email || ''
        };
      });
    }, 'fetchBudgetEditors');
  }

  async addBudgetEditor(userId: string, divisi: string): Promise<BudgetEditor> {
    return handleDatabaseOperation(async () => {
      const { data, error } = await this.supabase
        .from('budget_editors')
        .insert([{ user_id: userId, divisi }])
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        divisi: data.divisi,
        createdAt: data.created_at
      };
    }, 'addBudgetEditor');
  }

  async removeBudgetEditor(id: string): Promise<void> {
    return handleDatabaseOperation(async () => {
      const { error } = await this.supabase
        .from('budget_editors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }, 'removeBudgetEditor');
  }

  async checkIsBudgetEditor(userId: string, divisi: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('budget_editors')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('divisi', divisi);
      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }

  // --- Budget Masters CRUD ---
  async fetchBudgetMasters(divisi: string, sumberDanaId?: string): Promise<BudgetMaster[]> {
    return handleDatabaseOperation(async () => {
      let query = this.supabase
        .from('budget_masters')
        .select(`
          id,
          divisi,
          sumber_dana_id,
          kegiatan,
          nama_kegiatan,
          kro,
          nama_kro,
          ro,
          nama_ro,
          komponen,
          nama_komponen,
          subkomponen,
          nama_subkomponen,
          akun,
          nama_akun,
          detail,
          pagu,
          created_by,
          created_at,
          updated_at,
          master_sumber_dana (
            id,
            name,
            created_at
          )
        `);

      if (divisi && divisi !== 'All') {
        query = query.eq('divisi', divisi);
      }
      if (sumberDanaId && sumberDanaId !== 'All') {
        query = query.eq('sumber_dana_id', sumberDanaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => this.mapBudgetMasterFromDB(row));
    }, 'fetchBudgetMasters');
  }

  async createBudgetMaster(data: Omit<BudgetMaster, 'id' | 'createdAt'>): Promise<BudgetMaster> {
    return handleDatabaseOperation(async () => {
      const dbPayload = {
        divisi: data.divisi,
        sumber_dana_id: data.sumberDanaId,
        kegiatan: data.kegiatan,
        nama_kegiatan: data.namaKegiatan,
        kro: data.kro,
        nama_kro: data.namaKro,
        ro: data.ro,
        nama_ro: data.namaRo,
        komponen: data.komponen,
        nama_komponen: data.namaKomponen,
        subkomponen: data.subkomponen,
        nama_subkomponen: data.namaSubkomponen,
        akun: data.akun,
        nama_akun: data.namaAkun,
        detail: data.detail,
        pagu: data.pagu,
        created_by: data.createdBy
      };

      const { data: inserted, error } = await this.supabase
        .from('budget_masters')
        .insert([dbPayload])
        .select()
        .single();
      
      if (error) throw error;
      return this.mapBudgetMasterFromDB(inserted);
    }, 'createBudgetMaster');
  }

  async updateBudgetMaster(id: string, data: Partial<BudgetMaster>): Promise<BudgetMaster> {
    return handleDatabaseOperation(async () => {
      const dbPayload: any = {};
      if (data.divisi !== undefined) dbPayload.divisi = data.divisi;
      if (data.sumberDanaId !== undefined) dbPayload.sumber_dana_id = data.sumberDanaId;
      if (data.kegiatan !== undefined) dbPayload.kegiatan = data.kegiatan;
      if (data.namaKegiatan !== undefined) dbPayload.nama_kegiatan = data.namaKegiatan;
      if (data.kro !== undefined) dbPayload.kro = data.kro;
      if (data.namaKro !== undefined) dbPayload.nama_kro = data.namaKro;
      if (data.ro !== undefined) dbPayload.ro = data.ro;
      if (data.namaRo !== undefined) dbPayload.nama_ro = data.namaRo;
      if (data.komponen !== undefined) dbPayload.komponen = data.komponen;
      if (data.namaKomponen !== undefined) dbPayload.nama_komponen = data.namaKomponen;
      if (data.subkomponen !== undefined) dbPayload.subkomponen = data.subkomponen;
      if (data.namaSubkomponen !== undefined) dbPayload.nama_subkomponen = data.namaSubkomponen;
      if (data.akun !== undefined) dbPayload.akun = data.akun;
      if (data.namaAkun !== undefined) dbPayload.nama_akun = data.namaAkun;
      if (data.detail !== undefined) dbPayload.detail = data.detail;
      if (data.pagu !== undefined) dbPayload.pagu = data.pagu;
      
      dbPayload.updated_at = new Date().toISOString();

      const { data: updated, error } = await this.supabase
        .from('budget_masters')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return this.mapBudgetMasterFromDB(updated);
    }, 'updateBudgetMaster');
  }

  async deleteBudgetMaster(id: string): Promise<void> {
    return handleDatabaseOperation(async () => {
      const { error } = await this.supabase
        .from('budget_masters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }, 'deleteBudgetMaster');
  }

  // --- Budget Transactions CRUD ---
  async fetchTransactions(divisi: string): Promise<BudgetTransaction[]> {
    return handleDatabaseOperation(async () => {
      // First get masters in division to load transactions
      let masterQuery = this.supabase.from('budget_masters').select('id');
      if (divisi && divisi !== 'All') {
        masterQuery = masterQuery.eq('divisi', divisi);
      }
      const { data: masters, error: mError } = await masterQuery;
      if (mError) throw mError;

      if (!masters || masters.length === 0) return [];
      const masterIds = masters.map((m: any) => m.id);

      const { data, error } = await this.supabase
        .from('budget_transactions')
        .select(`
          id,
          master_id,
          tanggal,
          uraian,
          nominal,
          bukti,
          keterangan,
          status,
          created_by,
          created_at,
          updated_at,
          budget_masters (
            id,
            divisi,
            sumber_dana_id,
            kegiatan,
            nama_kegiatan,
            kro,
            nama_kro,
            ro,
            nama_ro,
            komponen,
            nama_komponen,
            subkomponen,
            nama_subkomponen,
            akun,
            nama_akun,
            detail,
            pagu,
            master_sumber_dana (
              id,
              name,
              created_at
            )
          )
        `)
        .in('master_id', masterIds)
        .order('tanggal', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        masterId: row.master_id,
        tanggal: row.tanggal,
        uraian: row.uraian,
        nominal: Number(row.nominal),
        bukti: row.bukti || '',
        keterangan: row.keterangan || '',
        status: row.status || 'Realisasi',
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        master: row.budget_masters ? this.mapBudgetMasterFromDB(row.budget_masters) : undefined
      }));
    }, 'fetchTransactions');
  }

  async createTransaction(data: Omit<BudgetTransaction, 'id' | 'createdAt'>): Promise<BudgetTransaction> {
    return handleDatabaseOperation(async () => {
      const dbPayload = {
        master_id: data.masterId,
        tanggal: data.tanggal,
        uraian: data.uraian,
        nominal: data.nominal,
        bukti: data.bukti || null,
        keterangan: data.keterangan || null,
        status: data.status || 'Realisasi',
        created_by: data.createdBy
      };

      const { data: inserted, error } = await this.supabase
        .from('budget_transactions')
        .insert([dbPayload])
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: inserted.id,
        masterId: inserted.master_id,
        tanggal: inserted.tanggal,
        uraian: inserted.uraian,
        nominal: Number(inserted.nominal),
        bukti: inserted.bukti || '',
        keterangan: inserted.keterangan || '',
        status: inserted.status || 'Realisasi',
        createdBy: inserted.created_by,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at
      };
    }, 'createTransaction');
  }

  async updateTransaction(id: string, data: Partial<BudgetTransaction>): Promise<BudgetTransaction> {
    return handleDatabaseOperation(async () => {
      const dbPayload: any = {};
      if (data.tanggal !== undefined) dbPayload.tanggal = data.tanggal;
      if (data.uraian !== undefined) dbPayload.uraian = data.uraian;
      if (data.nominal !== undefined) dbPayload.nominal = data.nominal;
      if (data.bukti !== undefined) dbPayload.bukti = data.bukti || null;
      if (data.keterangan !== undefined) dbPayload.keterangan = data.keterangan || null;
      if (data.status !== undefined) dbPayload.status = data.status;
      
      dbPayload.updated_at = new Date().toISOString();

      const { data: updated, error } = await this.supabase
        .from('budget_transactions')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: updated.id,
        masterId: updated.master_id,
        tanggal: updated.tanggal,
        uraian: updated.uraian,
        nominal: Number(updated.nominal),
        bukti: updated.bukti || '',
        keterangan: updated.keterangan || '',
        status: updated.status || 'Realisasi',
        createdBy: updated.created_by,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    }, 'updateTransaction');
  }

  async deleteTransaction(id: string): Promise<void> {
    return handleDatabaseOperation(async () => {
      const { error } = await this.supabase
        .from('budget_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }, 'deleteTransaction');
  }

  // --- Helper mapping method ---
  private mapBudgetMasterFromDB(row: any): BudgetMaster {
    const rawSumberDana = row.master_sumber_dana || row.sumber_dana;
    return {
      id: row.id,
      divisi: row.divisi,
      sumberDanaId: row.sumber_dana_id,
      kegiatan: row.kegiatan || '',
      namaKegiatan: row.nama_kegiatan || '',
      kro: row.kro,
      namaKro: row.nama_kro || '',
      ro: row.ro,
      namaRo: row.nama_ro || '',
      komponen: row.komponen,
      namaKomponen: row.nama_komponen || '',
      subkomponen: row.subkomponen || '',
      namaSubkomponen: row.nama_subkomponen || '',
      akun: row.akun,
      namaAkun: row.nama_akun || '',
      detail: row.detail || '',
      pagu: Number(row.pagu),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sumberDana: rawSumberDana ? {
        id: rawSumberDana.id,
        name: rawSumberDana.name,
        createdAt: rawSumberDana.created_at
      } : undefined
    };
  }
}

export const budgetService = new BudgetService();
