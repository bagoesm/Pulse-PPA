// src/services/ArchiveEvaluationService.ts
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { PenilaianArsip } from '../../types';
import { handleDatabaseOperation } from '../utils/errorHandling';

export class ArchiveEvaluationService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  /**
   * Fetch all evaluations, optionally filtered by division name and year
   */
  async getEvaluations(divisiName?: string, tahun?: number): Promise<PenilaianArsip[]> {
    try {
      let query = this.supabase
        .from('penilaian_arsip')
        .select(`
          *,
          divisi:master_divisi(id, name)
        `);

      if (divisiName) {
        // Resolve division name to UUID first
        const { data: divData, error: divError } = await this.supabase
          .from('master_divisi')
          .select('id')
          .eq('name', divisiName)
          .maybeSingle();

        if (divError) throw divError;

        if (divData) {
          query = query.eq('divisi_id', divData.id);
        } else {
          // If no division matches the name, return empty list
          return [];
        }
      }

      if (tahun) {
        query = query.eq('tahun', tahun);
      }

      const { data, error } = await query.order('tahun', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => this.mapFromDB(row));
    } catch (error) {
      console.error('Error fetching archive evaluations:', error);
      throw error;
    }
  }

  /**
   * Save or update an archive evaluation
   */
  async saveEvaluation(evaluation: PenilaianArsip): Promise<PenilaianArsip> {
    try {
      return await handleDatabaseOperation(
        async () => {
          // Resolve division name to UUID
          const { data: divData, error: divError } = await this.supabase
            .from('master_divisi')
            .select('id')
            .eq('name', evaluation.divisiId)
            .maybeSingle();

          if (divError) throw divError;

          if (!divData) {
            throw new Error(`Divisi dengan nama "${evaluation.divisiId}" tidak ditemukan.`);
          }

          const dbData = this.mapToDB(evaluation);
          dbData.divisi_id = divData.id; // Set the resolved UUID
          
          const { data, error } = await this.supabase
            .from('penilaian_arsip')
            .upsert(dbData, { onConflict: 'divisi_id,tahun' })
            .select(`
              *,
              divisi:master_divisi(id, name)
            `)
            .single();

          if (error) throw error;
          return this.mapFromDB(data);
        },
        'saveEvaluation'
      );
    } catch (error) {
      console.error('Error saving archive evaluation:', error);
      throw error;
    }
  }

  /**
   * Delete an evaluation record
   */
  async deleteEvaluation(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const { error } = await this.supabase
            .from('penilaian_arsip')
            .delete()
            .eq('id', id);

          if (error) throw error;
        },
        'deleteEvaluation'
      );
    } catch (error) {
      console.error('Error deleting archive evaluation:', error);
      throw error;
    }
  }

  /**
   * Map database row to PenilaianArsip object
   */
  private mapFromDB(row: any): PenilaianArsip {
    return {
      id: row.id,
      divisiId: row.divisi?.name || row.divisi_id,
      divisiName: row.divisi?.name,
      tahun: row.tahun,
      nilai_1_1: Number(row.nilai_1_1),
      nilai_1_2: Number(row.nilai_1_2),
      nilai_1_3: Number(row.nilai_1_3),
      nilai_1_4: Number(row.nilai_1_4),
      nilai_2_1: Number(row.nilai_2_1),
      nilai_2_2: Number(row.nilai_2_2),
      
      standar_1_1: Number(row.standar_1_1 || 700.00),
      standar_1_2: Number(row.standar_1_2 || 200.00),
      standar_1_3: Number(row.standar_1_3 || 1100.00),
      standar_1_4: Number(row.standar_1_4 || 200.00),
      standar_2_1: Number(row.standar_2_1 || 300.00),
      standar_2_2: Number(row.standar_2_2 || 100.00),

      bobot_1_1: Number(row.bobot_1_1 || 25.00),
      bobot_1_2: Number(row.bobot_1_2 || 25.00),
      bobot_1_3: Number(row.bobot_1_3 || 25.00),
      bobot_1_4: Number(row.bobot_1_4 || 25.00),
      bobot_2_1: Number(row.bobot_2_1 || 50.00),
      bobot_2_2: Number(row.bobot_2_2 || 50.00),

      bobot_aspek_1: Number(row.bobot_aspek_1 || 50.00),
      bobot_aspek_2: Number(row.bobot_aspek_2 || 50.00),
      
      lakiLink: row.laki_link,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map PenilaianArsip object to database row
   */
  private mapToDB(obj: PenilaianArsip): any {
    const row: any = {
      tahun: obj.tahun,
      nilai_1_1: obj.nilai_1_1,
      nilai_1_2: obj.nilai_1_2,
      nilai_1_3: obj.nilai_1_3,
      nilai_1_4: obj.nilai_1_4,
      nilai_2_1: obj.nilai_2_1,
      nilai_2_2: obj.nilai_2_2,
      
      standar_1_1: obj.standar_1_1,
      standar_1_2: obj.standar_1_2,
      standar_1_3: obj.standar_1_3,
      standar_1_4: obj.standar_1_4,
      standar_2_1: obj.standar_2_1,
      standar_2_2: obj.standar_2_2,

      bobot_1_1: obj.bobot_1_1,
      bobot_1_2: obj.bobot_1_2,
      bobot_1_3: obj.bobot_1_3,
      bobot_1_4: obj.bobot_1_4,
      bobot_2_1: obj.bobot_2_1,
      bobot_2_2: obj.bobot_2_2,

      bobot_aspek_1: obj.bobot_aspek_1,
      bobot_aspek_2: obj.bobot_aspek_2,
      
      updated_at: new Date().toISOString()
    };

    if (obj.id) row.id = obj.id;
    if (obj.lakiLink) row.laki_link = obj.lakiLink;
    if (obj.createdBy) row.created_by = obj.createdBy;
    if (obj.createdAt) row.created_at = obj.createdAt;

    return row;
  }

  /**
   * Fetch editors, optionally filtered by division name
   */
  async getEditors(divisiName?: string): Promise<any[]> {
    try {
      let query = this.supabase
        .from('archive_editors')
        .select(`
          *,
          divisi:master_divisi(id, name)
        `);

      if (divisiName) {
        const { data: divData, error: divError } = await this.supabase
          .from('master_divisi')
          .select('id')
          .eq('name', divisiName)
          .maybeSingle();

        if (divError) throw divError;
        if (divData) {
          query = query.eq('divisi_id', divData.id);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        divisiId: row.divisi_id,
        createdAt: row.created_at,
        namaDivisi: row.divisi?.name || ''
      }));
    } catch (error) {
      console.error('Error fetching archive editors:', error);
      throw error;
    }
  }

  /**
   * Add an editor for a division
   */
  async addEditor(userId: string, divisiName: string): Promise<void> {
    try {
      const { data: divData, error: divError } = await this.supabase
        .from('master_divisi')
        .select('id')
        .eq('name', divisiName)
        .maybeSingle();

      if (divError) throw divError;
      if (!divData) {
        throw new Error(`Divisi dengan nama "${divisiName}" tidak ditemukan.`);
      }

      const { error } = await this.supabase
        .from('archive_editors')
        .insert({
          user_id: userId,
          divisi_id: divData.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding archive editor:', error);
      throw error;
    }
  }

  /**
   * Remove an editor by id
   */
  async removeEditor(editorId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('archive_editors')
        .delete()
        .eq('id', editorId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing archive editor:', error);
      throw error;
    }
  }

  /**
   * Check if a user is an editor for a division
   */
  async isEditor(userId: string, divisiName: string): Promise<boolean> {
    try {
      const { data: divData, error: divError } = await this.supabase
        .from('master_divisi')
        .select('id')
        .eq('name', divisiName)
        .maybeSingle();

      if (divError) throw divError;
      if (!divData) return false;

      const { data, error } = await this.supabase
        .from('archive_editors')
        .select('id')
        .eq('user_id', userId)
        .eq('divisi_id', divData.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch (error) {
      console.error('Error checking archive editor status:', error);
      return false;
    }
  }
}

export const archiveEvaluationService = new ArchiveEvaluationService();
