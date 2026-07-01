// src/services/ZoomService.ts
// Service layer for Zoom Services business logic
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { ZoomMeeting, ZoomAccount, ZoomRoom, ZoomMeetingType, ZoomEditor } from '../../types';
import { handleDatabaseOperation } from '../utils/errorHandling';

export class ZoomService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  // ============================================================================
  // 1. Zoom Meetings
  // ============================================================================

  async getMeetings(): Promise<ZoomMeeting[]> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meetings')
            .select(`
              *,
              zoom_accounts (id, name, email)
            `)
            .order('tanggal', { ascending: false })
            .order('waktu_mulai', { ascending: false });

          if (result.error) throw result.error;
          return result;
        },
        'getMeetings'
      );

      return (data || []).map((row: any) => this.mapMeetingFromDB(row));
    } catch (error) {
      console.error('Error fetching zoom meetings:', error);
      throw error;
    }
  }

  async createMeeting(meeting: Omit<ZoomMeeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoomMeeting> {
    try {
      const dbRow = this.mapMeetingToDB(meeting);
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meetings')
            .insert(dbRow)
            .select(`
              *,
              zoom_accounts (id, name, email)
            `)
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'createMeeting'
      );

      return this.mapMeetingFromDB(data);
    } catch (error) {
      console.error('Error creating zoom meeting:', error);
      throw error;
    }
  }

  async updateMeeting(id: string, meeting: Partial<ZoomMeeting>): Promise<ZoomMeeting> {
    try {
      const dbRow = this.mapMeetingToDB(meeting);
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meetings')
            .update(dbRow)
            .eq('id', id)
            .select(`
              *,
              zoom_accounts (id, name, email)
            `)
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'updateMeeting'
      );

      return this.mapMeetingFromDB(data);
    } catch (error) {
      console.error('Error updating zoom meeting:', error);
      throw error;
    }
  }

  async deleteMeeting(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meetings')
            .delete()
            .eq('id', id);

          if (result.error) throw result.error;
          return result;
        },
        'deleteMeeting'
      );
    } catch (error) {
      console.error('Error deleting zoom meeting:', error);
      throw error;
    }
  }

  // ============================================================================
  // 2. Zoom Accounts
  // ============================================================================

  async getAccounts(): Promise<ZoomAccount[]> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_accounts')
            .select('*')
            .order('name', { ascending: true });

          if (result.error) throw result.error;
          return result;
        },
        'getAccounts'
      );

      return (data || []).map((row: any) => this.mapAccountFromDB(row));
    } catch (error) {
      console.error('Error fetching zoom accounts:', error);
      throw error;
    }
  }

  async createAccount(account: Omit<ZoomAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ZoomAccount> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_accounts')
            .insert({
              name: account.name,
              email: account.email || null,
              password: account.password || null,
              kapasitas: account.kapasitas,
              is_active: account.isActive,
              divisi: account.divisi
            })
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'createAccount'
      );

      return this.mapAccountFromDB(data);
    } catch (error) {
      console.error('Error creating zoom account:', error);
      throw error;
    }
  }

  async updateAccount(id: string, account: Partial<ZoomAccount>): Promise<ZoomAccount> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const updateObj: any = {
            updated_at: new Date().toISOString()
          };
          if (account.name !== undefined) updateObj.name = account.name;
          if (account.email !== undefined) updateObj.email = account.email;
          if (account.password !== undefined) updateObj.password = account.password;
          if (account.kapasitas !== undefined) updateObj.kapasitas = account.kapasitas;
          if (account.isActive !== undefined) updateObj.is_active = account.isActive;
          if (account.divisi !== undefined) updateObj.divisi = account.divisi;

          const result = await this.supabase
            .from('zoom_accounts')
            .update(updateObj)
            .eq('id', id)
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'updateAccount'
      );

      return this.mapAccountFromDB(data);
    } catch (error) {
      console.error('Error updating zoom account:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_accounts')
            .delete()
            .eq('id', id);

          if (result.error) throw result.error;
          return result;
        },
        'deleteAccount'
      );
    } catch (error) {
      console.error('Error deleting zoom account:', error);
      throw error;
    }
  }

  // ============================================================================
  // 3. Zoom Rooms (Physical Meeting Rooms)
  // ============================================================================

  async getRooms(): Promise<ZoomRoom[]> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_rooms')
            .select('*')
            .order('name', { ascending: true });

          if (result.error) throw result.error;
          return result;
        },
        'getRooms'
      );

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching zoom rooms:', error);
      throw error;
    }
  }

  async createRoom(name: string): Promise<ZoomRoom> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_rooms')
            .insert({ name })
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'createRoom'
      );

      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error creating zoom room:', error);
      throw error;
    }
  }

  async deleteRoom(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_rooms')
            .delete()
            .eq('id', id);

          if (result.error) throw result.error;
          return result;
        },
        'deleteRoom'
      );
    } catch (error) {
      console.error('Error deleting zoom room:', error);
      throw error;
    }
  }

  // ============================================================================
  // 4. Meeting Types
  // ============================================================================

  async getMeetingTypes(): Promise<ZoomMeetingType[]> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meeting_types')
            .select('*')
            .order('name', { ascending: true });

          if (result.error) throw result.error;
          return result;
        },
        'getMeetingTypes'
      );

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching zoom meeting types:', error);
      throw error;
    }
  }

  async createMeetingType(name: string): Promise<ZoomMeetingType> {
    try {
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await this.supabase
            .from('zoom_meeting_types')
            .insert({ name })
            .select()
            .single();

          if (result.error) throw result.error;
          return result;
        },
        'createMeetingType'
      );

      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error creating zoom meeting type:', error);
      throw error;
    }
  }

  // ============================================================================
  // Mappers (Internal Helpers)
  // ============================================================================

  private mapMeetingFromDB(row: any): ZoomMeeting {
    return {
      id: row.id,
      zoomAccountId: row.zoom_account_id,
      tanggal: row.tanggal,
      waktuMulai: row.waktu_mulai?.substring(0, 5) || '', // Keep HH:MM format
      waktuSelesai: row.waktu_selesai?.substring(0, 5) || '', // Keep HH:MM format
      kegiatan: row.kegiatan,
      operatorId: row.operator_id,
      operatorIds: row.operator_ids || (row.operator_id ? [row.operator_id] : []),
      lokasi: row.lokasi,
      unitKerja: row.unit_kerja,
      jenisRapat: row.jenis_rapat,
      status: row.status,
      zoomLink: row.zoom_link || undefined,
      meetingId: row.meeting_id || undefined,
      passcode: row.passcode || undefined,
      undanganText: row.undangan_text || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      zoomAccount: row.zoom_accounts ? {
        id: row.zoom_accounts.id,
        name: row.zoom_accounts.name,
        email: row.zoom_accounts.email || undefined,
        kapasitas: row.zoom_accounts.kapasitas,
        isActive: row.zoom_accounts.is_active,
        divisi: row.zoom_accounts.divisi,
        createdAt: row.zoom_accounts.created_at,
        updatedAt: row.zoom_accounts.updated_at
      } : undefined
    };
  }

  private mapMeetingToDB(meeting: Partial<ZoomMeeting>): any {
    const row: any = {};
    if (meeting.zoomAccountId !== undefined) row.zoom_account_id = meeting.zoomAccountId;
    if (meeting.tanggal !== undefined) row.tanggal = meeting.tanggal;
    if (meeting.waktuMulai !== undefined) row.waktu_mulai = meeting.waktuMulai;
    if (meeting.waktuSelesai !== undefined) row.waktu_selesai = meeting.waktuSelesai;
    if (meeting.kegiatan !== undefined) row.kegiatan = meeting.kegiatan;
    if (meeting.operatorId !== undefined) row.operator_id = meeting.operatorId;
    if (meeting.operatorIds !== undefined) {
      row.operator_ids = meeting.operatorIds;
      row.operator_id = meeting.operatorIds.length > 0 ? meeting.operatorIds[0] : null;
    }
    if (meeting.lokasi !== undefined) row.lokasi = meeting.lokasi;
    if (meeting.unitKerja !== undefined) row.unit_kerja = meeting.unitKerja;
    if (meeting.jenisRapat !== undefined) row.jenis_rapat = meeting.jenisRapat;
    if (meeting.status !== undefined) row.status = meeting.status;
    if (meeting.zoomLink !== undefined) row.zoom_link = meeting.zoomLink;
    if (meeting.meetingId !== undefined) row.meeting_id = meeting.meetingId;
    if (meeting.passcode !== undefined) row.passcode = meeting.passcode;
    if (meeting.undanganText !== undefined) row.undangan_text = meeting.undanganText;
    
    row.updated_at = new Date().toISOString();
    return row;
  }

  private mapAccountFromDB(row: any): ZoomAccount {
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      password: row.password || undefined,
      kapasitas: row.kapasitas ?? 100,
      isActive: row.is_active ?? true,
      divisi: row.divisi || 'Biro Data dan Informasi',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // ============================================================================
  // 5. Zoom Editors
  // ============================================================================

  async getZoomEditors(divisi?: string): Promise<ZoomEditor[]> {
    try {
      let query = this.supabase.from('zoom_editors').select('*');
      if (divisi) {
        query = query.eq('divisi', divisi);
      }
      
      const { data, error } = await handleDatabaseOperation(
        async () => {
          const result = await query.order('created_at', { ascending: false });
          if (result.error) throw result.error;
          return result;
        },
        'getZoomEditors'
      );

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        divisi: row.divisi,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching zoom editors:', error);
      throw error;
    }
  }

  async addZoomEditor(userId: string, divisi: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const { error } = await this.supabase
            .from('zoom_editors')
            .insert({ user_id: userId, divisi });
          if (error) throw error;
        },
        'addZoomEditor'
      );
    } catch (error) {
      console.error('Error adding zoom editor:', error);
      throw error;
    }
  }

  async removeZoomEditor(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const { error } = await this.supabase
            .from('zoom_editors')
            .delete()
            .eq('id', id);
          if (error) throw error;
        },
        'removeZoomEditor'
      );
    } catch (error) {
      console.error('Error removing zoom editor:', error);
      throw error;
    }
  }
}

export const zoomService = new ZoomService();
