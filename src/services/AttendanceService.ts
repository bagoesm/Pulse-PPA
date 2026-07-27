// src/services/AttendanceService.ts
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { User, EmployeeFace, Attendance, Geofence, AttendanceEditor } from '../../types';
import { handleDatabaseOperation } from '../utils/errorHandling';

const STORAGE_KEY_FACES = 'pulse_employee_faces';
const STORAGE_KEY_ATTENDANCES = 'pulse_attendances';
const STORAGE_KEY_GEOFENCES = 'pulse_geofences';
const STORAGE_KEY_EDITORS = 'pulse_attendance_editors';

export class AttendanceService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  // --- Mappings ---
  private mapFromFaceDB(row: any): EmployeeFace {
    return {
      id: row.id,
      employeeId: row.employee_id,
      embedding: row.embedding || [],
      profilePhotoUrl: row.profile_photo_url || '',
      status: row.status || 'Belum Registrasi',
      registeredAt: row.registered_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  private mapFromAttendanceDB(row: any): Attendance {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.profiles?.name || '',
      employeeNip: row.profiles?.nip || '',
      employeeDivisi: row.profiles?.divisi || '',
      checkIn: row.check_in,
      checkOut: row.check_out || undefined,
      status: row.status || 'Hadir',
      locationId: row.location_id || undefined,
      latitude: row.latitude || 0,
      longitude: row.longitude || 0,
      accuracy: row.accuracy || 0,
      faceConfidence: row.face_confidence || 0,
      livenessScore: row.liveness_score || undefined,
      browser: row.browser || undefined,
      device: row.device || undefined,
      ipAddress: row.ip_address || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private mapFromGeofenceDB(row: any): Geofence {
    return {
      id: row.id,
      name: row.name || '',
      latitude: row.latitude || 0,
      longitude: row.longitude || 0,
      radius: row.radius || 50,
      isActive: row.is_active !== undefined ? row.is_active : true,
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  private mapFromEditorDB(row: any): AttendanceEditor {
    return {
      id: row.id,
      userId: row.user_id,
      divisi: row.divisi || '',
      createdAt: row.created_at || new Date().toISOString(),
    };
  }

  // --- Local Storage Helpers (Fallbacks) ---
  private getLocalFaces(): EmployeeFace[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FACES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalFaces(faces: EmployeeFace[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_FACES, JSON.stringify(faces));
    } catch (e) {
      console.error('Failed to save local faces', e);
    }
  }

  private getLocalAttendances(): Attendance[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ATTENDANCES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAttendances(atts: Attendance[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCES, JSON.stringify(atts));
    } catch (e) {
      console.error('Failed to save local attendances', e);
    }
  }

  private getLocalGeofences(): Geofence[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_GEOFENCES);
      const list = data ? JSON.parse(data) : [];
      
      // Update or add the default test coordinate
      const defaultGeo: Geofence = {
        id: 'default-geo-1',
        name: 'Kantor Pusat KPPPA (Test)',
        latitude: 4.165842,
        longitude: 96.127096,
        radius: 100.0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      const existingIdx = list.findIndex((g: any) => g.id === 'default-geo-1');
      if (existingIdx >= 0) {
        list[existingIdx] = defaultGeo;
      } else {
        list.push(defaultGeo);
      }
      
      localStorage.setItem(STORAGE_KEY_GEOFENCES, JSON.stringify(list));
      return list;
    } catch {
      return [];
    }
  }

  private saveLocalGeofences(geos: Geofence[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_GEOFENCES, JSON.stringify(geos));
    } catch (e) {
      console.error('Failed to save local geofences', e);
    }
  }

  private getLocalEditors(): AttendanceEditor[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_EDITORS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalEditors(editors: AttendanceEditor[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_EDITORS, JSON.stringify(editors));
    } catch (e) {
      console.error('Failed to save local editors', e);
    }
  }

  // --- Public APIs (Search & Kiosk Check-In) ---

  /**
   * Search user profiles by Name or NIP (for public /hadir page)
   */
  async searchProfiles(queryStr: string): Promise<User[]> {
    try {
      if (!queryStr || queryStr.trim().length === 0) return [];
      const cleanQuery = queryStr.trim();
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${cleanQuery}%,nip.ilike.%${cleanQuery}%`)
        .order('name', { ascending: true })
        .limit(15);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || '',
        role: row.role || 'Staff',
        divisi: row.divisi || '',
        jabatan: row.jabatan || 'Pegawai',
        nip: row.nip || '',
        profilePhoto: row.profilePhoto || '',
      }));
    } catch (error) {
      console.warn('AttendanceService searchProfiles fallback to local search:', error);
      // Fallback search using mock profiles or empty array
      return [];
    }
  }

  /**
   * Get employee face registration data (Public)
   */
  async getEmployeeFacePublic(employeeId: string): Promise<EmployeeFace | null> {
    try {
      const { data, error } = await this.supabase
        .from('employee_faces')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return this.mapFromFaceDB(data);
    } catch (error) {
      console.warn('AttendanceService getEmployeeFacePublic fallback to local:', error);
      const local = this.getLocalFaces();
      const face = local.find((f) => f.employeeId === employeeId);
      return face || null;
    }
  }

  /**
   * Register employee face profile (Public/Kiosk mode)
   */
  async registerEmployeeFacePublic(employeeId: string, embedding: number[], photoFile: File): Promise<EmployeeFace> {
    try {
      // 1. Upload photo to 'employee-faces' bucket
      const fileExt = photoFile.name.split('.').pop() || 'jpg';
      const filePath = `${employeeId}/face_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await this.supabase.storage
        .from('employee-faces')
        .upload(filePath, photoFile, {
          upsert: true,
          contentType: photoFile.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('employee-faces')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl || filePath;

      // 2. Insert/Upsert into employee_faces table
      const payload = {
        employee_id: employeeId,
        embedding: embedding,
        profile_photo_url: publicUrl,
        status: 'Aktif',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('employee_faces')
        .upsert(payload, { onConflict: 'employee_id' })
        .select()
        .single();

      if (error) throw error;
      return this.mapFromFaceDB(data);
    } catch (error) {
      console.warn('AttendanceService registerEmployeeFacePublic fallback to local storage:', error);
      const local = this.getLocalFaces();
      const existingIdx = local.findIndex((f) => f.employeeId === employeeId);

      const mockUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${employeeId}`;

      const item: EmployeeFace = {
        id: 'face-' + Date.now(),
        employeeId: employeeId,
        embedding: embedding,
        profilePhotoUrl: mockUrl,
        status: 'Aktif',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        local[existingIdx] = item;
      } else {
        local.push(item);
      }
      this.saveLocalFaces(local);
      return item;
    }
  }

  /**
   * Get active geofence locations (Public)
   */
  async getActiveGeofencesPublic(): Promise<Geofence[]> {
    try {
      const { data, error } = await this.supabase
        .from('geofences')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => this.mapFromGeofenceDB(row));
    } catch (error) {
      console.warn('AttendanceService getActiveGeofencesPublic fallback to local:', error);
      return this.getLocalGeofences().filter((g) => g.isActive);
    }
  }

  /**
   * Check if employee has checked in today (returns attendance record if yes)
   */
  async getTodayAttendancePublic(employeeId: string): Promise<Attendance | null> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await this.supabase
        .from('attendances')
        .select(`
          *,
          profiles:employee_id (
            name,
            nip,
            divisi
          )
        `)
        .eq('employee_id', employeeId)
        .gte('check_in', todayStart.toISOString())
        .lte('check_in', todayEnd.toISOString())
        .order('check_in', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;
      return this.mapFromAttendanceDB(data[0]);
    } catch (error) {
      console.warn('AttendanceService getTodayAttendancePublic fallback to local:', error);
      const local = this.getLocalAttendances();
      const todayStr = new Date().toISOString().slice(0, 10);
      const attendance = local.find(
        (a) => a.employeeId === employeeId && a.checkIn.startsWith(todayStr)
      );
      return attendance || null;
    }
  }

  /**
   * Public Check-In Absensi
   */
  async checkInPublic(attendance: Omit<Attendance, 'id' | 'createdAt'>): Promise<Attendance> {
    try {
      return await handleDatabaseOperation(async () => {
        const payload = {
          employee_id: attendance.employeeId,
          status: attendance.status,
          location_id: attendance.locationId,
          latitude: attendance.latitude,
          longitude: attendance.longitude,
          accuracy: attendance.accuracy,
          face_confidence: attendance.faceConfidence,
          liveness_score: attendance.livenessScore,
          browser: attendance.browser,
          device: attendance.device,
          ip_address: attendance.ipAddress
        };

        const { data, error } = await this.supabase
          .from('attendances')
          .insert([payload])
          .select(`
            *,
            profiles:employee_id (
              name,
              nip,
              divisi
            )
          `)
          .single();

        if (error) throw error;
        return this.mapFromAttendanceDB(data);
      }, 'checkInPublic');
    } catch (error) {
      console.warn('AttendanceService checkInPublic fallback to local storage:', error);
      const local = this.getLocalAttendances();
      const newItem: Attendance = {
        ...attendance,
        id: 'att-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      local.unshift(newItem);
      this.saveLocalAttendances(local);
      return newItem;
    }
  }

  /**
   * Update existing Check-In Absensi
   */
  async updateCheckInPublic(attendanceId: string, updates: Partial<Attendance>): Promise<Attendance> {
    try {
      return await handleDatabaseOperation(async () => {
        const payload = {
          check_in: updates.checkIn || new Date().toISOString(),
          status: updates.status,
          location_id: updates.locationId,
          latitude: updates.latitude,
          longitude: updates.longitude,
          accuracy: updates.accuracy,
          face_confidence: updates.faceConfidence,
          liveness_score: updates.livenessScore,
          browser: updates.browser,
          device: updates.device,
          ip_address: updates.ipAddress
        };

        const { data, error } = await this.supabase
          .from('attendances')
          .update(payload)
          .eq('id', attendanceId)
          .select(`
            *,
            profiles:employee_id (
              name,
              nip,
              divisi
            )
          `)
          .single();

        if (error) throw error;
        return this.mapFromAttendanceDB(data);
      }, 'updateCheckInPublic');
    } catch (error) {
      console.warn('AttendanceService updateCheckInPublic fallback to local storage:', error);
      const local = this.getLocalAttendances();
      const idx = local.findIndex((a) => a.id === attendanceId);
      if (idx !== -1) {
        local[idx] = {
          ...local[idx],
          checkIn: updates.checkIn || new Date().toISOString(),
          status: updates.status || local[idx].status,
          locationId: updates.locationId !== undefined ? updates.locationId : local[idx].locationId,
          latitude: updates.latitude !== undefined ? updates.latitude : local[idx].latitude,
          longitude: updates.longitude !== undefined ? updates.longitude : local[idx].longitude,
          accuracy: updates.accuracy !== undefined ? updates.accuracy : local[idx].accuracy,
          faceConfidence: updates.faceConfidence !== undefined ? updates.faceConfidence : local[idx].faceConfidence,
          livenessScore: updates.livenessScore !== undefined ? updates.livenessScore : local[idx].livenessScore,
          browser: updates.browser !== undefined ? updates.browser : local[idx].browser,
          device: updates.device !== undefined ? updates.device : local[idx].device,
          ipAddress: updates.ipAddress !== undefined ? updates.ipAddress : local[idx].ipAddress
        };
        this.saveLocalAttendances(local);
        return local[idx];
      }
      throw error;
    }
  }

  /**
   * Public Check-Out Absensi
   */
  async checkOutPublic(attendanceId: string, updates: Partial<Attendance>): Promise<Attendance> {
    try {
      return await handleDatabaseOperation(async () => {
        const payload = {
          check_out: updates.checkOut || new Date().toISOString(),
          latitude: updates.latitude,
          longitude: updates.longitude,
          accuracy: updates.accuracy
        };

        const { data, error } = await this.supabase
          .from('attendances')
          .update(payload)
          .eq('id', attendanceId)
          .select(`
            *,
            profiles:employee_id (
              name,
              nip,
              divisi
            )
          `)
          .single();

        if (error) throw error;
        return this.mapFromAttendanceDB(data);
      }, 'checkOutPublic');
    } catch (error) {
      console.warn('AttendanceService checkOutPublic fallback to local storage:', error);
      const local = this.getLocalAttendances();
      const idx = local.findIndex((a) => a.id === attendanceId);
      if (idx !== -1) {
        local[idx] = {
          ...local[idx],
          checkOut: updates.checkOut || new Date().toISOString(),
          latitude: updates.latitude !== undefined ? updates.latitude : local[idx].latitude,
          longitude: updates.longitude !== undefined ? updates.longitude : local[idx].longitude,
          accuracy: updates.accuracy !== undefined ? updates.accuracy : local[idx].accuracy
        };
        this.saveLocalAttendances(local);
        return local[idx];
      }
      throw error;
    }
  }


  // --- Protected APIs (Authenticated Admins / Editors only) ---

  /**
   * Check if a user is designated as an Attendance Editor for a specific division/global
   */
  async checkIsAttendanceEditor(userId: string, _divisi?: string): Promise<boolean> {
    try {
      // Super admin is always editor
      const { data: userProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!profileError && userProfile?.role === 'Super Admin') {
        return true;
      }

      // Check attendance_editors table for ANY assignment
      const { count, error } = await this.supabase
        .from('attendance_editors')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
        
      if (error) throw error;
      return (count || 0) > 0;
    } catch {
      // Fallback local check
      const local = this.getLocalEditors();
      return local.some((e) => e.userId === userId);
    }
  }

  /**
   * Appoint an Attendance Editor
   */
  async saveAttendanceEditor(userId: string, divisi: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('attendance_editors')
          .upsert({ user_id: userId, divisi: divisi }, { onConflict: 'user_id,divisi' });
        if (error) throw error;
      }, 'saveAttendanceEditor');
    } catch (error) {
      console.warn('AttendanceService saveAttendanceEditor fallback:', error);
      const local = this.getLocalEditors();
      const existing = local.find((e) => e.userId === userId && e.divisi === divisi);
      if (!existing) {
        local.push({
          id: 'ed-' + Date.now(),
          userId: userId,
          divisi: divisi,
          createdAt: new Date().toISOString()
        });
        this.saveLocalEditors(local);
      }
    }
  }

  /**
   * Remove an appointed Attendance Editor
   */
  async removeAttendanceEditor(userId: string, divisi: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('attendance_editors')
          .delete()
          .eq('user_id', userId)
          .eq('divisi', divisi);
        if (error) throw error;
      }, 'removeAttendanceEditor');
    } catch (error) {
      console.warn('AttendanceService removeAttendanceEditor fallback:', error);
      let local = this.getLocalEditors();
      local = local.filter((e) => !(e.userId === userId && e.divisi === divisi));
      this.saveLocalEditors(local);
    }
  }

  /**
   * Reset face registration profile for an employee
   */
  async resetEmployeeFace(employeeId: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('employee_faces')
          .delete()
          .eq('employee_id', employeeId);
        if (error) throw error;
      }, 'resetEmployeeFace');
    } catch (error) {
      console.warn('AttendanceService resetEmployeeFace fallback:', error);
      let local = this.getLocalFaces();
      local = local.filter((f) => f.employeeId !== employeeId);
      this.saveLocalFaces(local);
    }
  }

  /**
   * Reset/clear all attendance logs
   */
  async resetAllAttendances(): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('attendances')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }, 'resetAllAttendances');
    } catch (error) {
      console.warn('AttendanceService resetAllAttendances fallback:', error);
      localStorage.removeItem(STORAGE_KEY_ATTENDANCES);
    }
  }

  /**
   * Get attendance logs based on filters (Admin dashboard & reports)
   */
  async getAttendanceLogs(filters: { startDate?: string; endDate?: string; divisi?: string; employeeId?: string }): Promise<Attendance[]> {
    try {
      let query = this.supabase
        .from('attendances')
        .select(`
          *,
          profiles:employee_id (
            name,
            nip,
            divisi
          )
        `);

      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters.startDate) {
        const startISO = filters.startDate.includes('T') ? filters.startDate : `${filters.startDate}T00:00:00.000Z`;
        query = query.gte('check_in', startISO);
      }
      if (filters.endDate) {
        const endISO = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59.999Z`;
        query = query.lte('check_in', endISO);
      }

      const { data, error } = await query.order('check_in', { ascending: false });
      if (error) throw error;

      let mapped = (data || []).map((row: any) => this.mapFromAttendanceDB(row));

      // Filter by division locally if database join filter is complex
      if (filters.divisi && filters.divisi !== 'Semua') {
        const divNorm = filters.divisi.toLowerCase().trim();
        mapped = mapped.filter((item) => (item.employeeDivisi || '').toLowerCase().trim() === divNorm);
      }

      return mapped;
    } catch (error) {
      console.warn('AttendanceService getAttendanceLogs fallback to local:', error);
      let local = this.getLocalAttendances();

      if (filters.employeeId) {
        local = local.filter((a) => a.employeeId === filters.employeeId);
      }
      if (filters.startDate) {
        const startISO = filters.startDate.includes('T') ? filters.startDate : `${filters.startDate}T00:00:00.000Z`;
        local = local.filter((a) => a.checkIn >= startISO);
      }
      if (filters.endDate) {
        const endISO = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59.999Z`;
        local = local.filter((a) => a.checkIn <= endISO);
      }
      if (filters.divisi && filters.divisi !== 'Semua') {
        local = local.filter((a) => a.employeeDivisi === filters.divisi);
      }

      return local.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    }
  }

  /**
   * Get Geofence Locations (Admin)
   */
  async getGeofences(): Promise<Geofence[]> {
    try {
      const { data, error } = await this.supabase
        .from('geofences')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => this.mapFromGeofenceDB(row));
    } catch (error) {
      console.warn('AttendanceService getGeofences fallback to local:', error);
      return this.getLocalGeofences();
    }
  }

  /**
   * Add or update geofence coordinates
   */
  async saveGeofence(geofence: Partial<Geofence>): Promise<Geofence> {
    try {
      return await handleDatabaseOperation(async () => {
        const payload: any = {
          name: geofence.name,
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          radius: geofence.radius,
          is_active: geofence.isActive !== undefined ? geofence.isActive : true
        };

        if (geofence.id) {
          payload.id = geofence.id;
        }

        const { data, error } = await this.supabase
          .from('geofences')
          .upsert(payload, { onConflict: 'name' })
          .select()
          .single();

        if (error) throw error;
        return this.mapFromGeofenceDB(data);
      }, 'saveGeofence');
    } catch (error) {
      console.warn('AttendanceService saveGeofence fallback to local storage:', error);
      const local = this.getLocalGeofences();
      const existingIdx = local.findIndex((g) => g.name === geofence.name || (geofence.id && g.id === geofence.id));

      const item: Geofence = {
        id: geofence.id || 'geo-' + Date.now(),
        name: geofence.name || 'Lokasi Baru',
        latitude: geofence.latitude || 0,
        longitude: geofence.longitude || 0,
        radius: geofence.radius || 50,
        isActive: geofence.isActive !== undefined ? geofence.isActive : true,
        createdAt: geofence.createdAt || new Date().toISOString()
      };

      if (existingIdx !== -1) {
        local[existingIdx] = item;
      } else {
        local.push(item);
      }
      this.saveLocalGeofences(local);
      return item;
    }
  }

  /**
   * Delete a geofence location
   */
  async deleteGeofence(id: string): Promise<void> {
    try {
      await handleDatabaseOperation(async () => {
        const { error } = await this.supabase
          .from('geofences')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }, 'deleteGeofence');
    } catch (error) {
      console.warn('AttendanceService deleteGeofence fallback:', error);
      let local = this.getLocalGeofences();
      local = local.filter((g) => g.id !== id);
      this.saveLocalGeofences(local);
    }
  }

  /**
   * Helper to fetch all profiles (used by Admin UI to designate editors or list users)
   */
  async getAllProfiles(): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || '',
        role: row.role || 'Staff',
        divisi: row.divisi || '',
        jabatan: row.jabatan || 'Pegawai',
        nip: row.nip || '',
        profilePhoto: row.profilePhoto || '',
      }));
    } catch (error) {
      console.warn('AttendanceService getAllProfiles fallback:', error);
      return [];
    }
  }
}

export const attendanceService = new AttendanceService();
