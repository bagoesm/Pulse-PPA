// src/services/BMNDevicesService.ts
import { supabase } from '../lib/supabaseClient';
import { BMNDevice, Satker } from '../../types';

// Helper to map DB row to BMNDevice interface
const mapRowToDevice = (row: any): BMNDevice => ({
  id: row.id,
  namaPegawai: row.nama_pegawai,
  nomorTelepon: row.nomor_telepon || '',
  unitKerja: row.unit_kerja || '',
  satkerId: row.satker_id,
  namaPerangkat: row.nama_perangkat,
  penyeragamanNamaLaptop: row.penyeragaman_nama_laptop || '',
  dataTambahanAdmin: row.data_tambahan_admin || '',
  jenisKepemilikan: row.jenis_kepemilikan || 'Kantor',
  kodeBMN: row.kode_bmn || '',
  tahunPerolehan: row.tahun_perolehan || undefined,
  merkType: row.merk_type || '',
  processor: row.processor || '',
  ram: row.ram || '',
  vga: row.vga || '',
  hddSsd: row.hdd_ssd || '',
  macWifi: row.mac_wifi || '',
  macLan: row.mac_lan || '',
  antivirusSebelumnya: row.antivirus_sebelumnya || '',
  os: row.os || '',
  osLicenseStatus: row.os_license_status || '',
  msOffice: row.ms_office || '',
  msOfficeLicenseStatus: row.ms_office_license_status || '',
  pdfReader: row.pdf_reader || '',
  pdfReaderLicenseStatus: row.pdf_reader_license_status || '',
  performaPerangkat: row.performa_perangkat || 'Baik',
  keterangan: row.keterangan || '',
  createdBy: row.created_by || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  satker: row.satker ? {
    id: row.satker.id,
    name: row.satker.name,
    code: row.satker.code,
    floor: row.satker.floor,
    parentId: row.satker.parent_id
  } : null
});

// Helper to map BMNDevice interface to DB row
const mapDeviceToRow = (device: Partial<BMNDevice>): any => {
  const row: any = {};
  if (device.namaPegawai !== undefined) row.nama_pegawai = device.namaPegawai;
  if (device.nomorTelepon !== undefined) row.nomor_telepon = device.nomorTelepon;
  if (device.unitKerja !== undefined) row.unit_kerja = device.unitKerja;
  if (device.satkerId !== undefined) row.satker_id = device.satkerId;
  if (device.namaPerangkat !== undefined) row.nama_perangkat = device.namaPerangkat;
  if (device.penyeragamanNamaLaptop !== undefined) row.penyeragaman_nama_laptop = device.penyeragamanNamaLaptop;
  if (device.dataTambahanAdmin !== undefined) row.data_tambahan_admin = device.dataTambahanAdmin;
  if (device.jenisKepemilikan !== undefined) row.jenis_kepemilikan = device.jenisKepemilikan;
  if (device.kodeBMN !== undefined) row.kode_bmn = device.kodeBMN;
  if (device.tahunPerolehan !== undefined) row.tahun_perolehan = device.tahunPerolehan;
  if (device.merkType !== undefined) row.merk_type = device.merkType;
  if (device.processor !== undefined) row.processor = device.processor;
  if (device.ram !== undefined) row.ram = device.ram;
  if (device.vga !== undefined) row.vga = device.vga;
  if (device.hddSsd !== undefined) row.hdd_ssd = device.hddSsd;
  if (device.macWifi !== undefined) row.mac_wifi = device.macWifi;
  if (device.macLan !== undefined) row.mac_lan = device.macLan;
  if (device.antivirusSebelumnya !== undefined) row.antivirus_sebelumnya = device.antivirusSebelumnya;
  if (device.os !== undefined) row.os = device.os;
  if (device.osLicenseStatus !== undefined) row.os_license_status = device.osLicenseStatus;
  if (device.msOffice !== undefined) row.ms_office = device.msOffice;
  if (device.msOfficeLicenseStatus !== undefined) row.ms_office_license_status = device.msOfficeLicenseStatus;
  if (device.pdfReader !== undefined) row.pdf_reader = device.pdfReader;
  if (device.pdfReaderLicenseStatus !== undefined) row.pdf_reader_license_status = device.pdfReaderLicenseStatus;
  if (device.performaPerangkat !== undefined) row.performa_perangkat = device.performaPerangkat;
  if (device.keterangan !== undefined) row.keterangan = device.keterangan;
  if (device.createdBy !== undefined) row.created_by = device.createdBy;
  return row;
};

// Helper to map DB row to Satker interface
const mapRowToSatker = (row: any): Satker => ({
  id: row.id,
  name: row.name,
  isLocked: row.is_locked || false,
  lockedAt: row.locked_at ? new Date(row.locked_at) : null,
  lockedBy: row.locked_by || null,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  updatedAt: row.created_at ? new Date(row.created_at) : new Date(),
  parentId: row.parent_id || null,
  code: row.code || '',
  floor: row.floor || ''
});

export const BMNDevicesService = {
  // === DEVICE MANAGEMENT ===

  async getAllDevices(): Promise<BMNDevice[]> {
    const { data, error } = await supabase
      .from('bmn_devices')
      .select('*, satker:master_divisi(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching BMN devices:', error);
      throw error;
    }

    return (data || []).map(mapRowToDevice);
  },

  async createDevice(device: Omit<BMNDevice, 'id' | 'createdAt' | 'updatedAt'>): Promise<BMNDevice> {
    const dbRow = mapDeviceToRow(device);
    const { data, error } = await supabase
      .from('bmn_devices')
      .insert([dbRow])
      .select('*, satker:master_divisi(*)')
      .single();

    if (error) {
      console.error('Error creating BMN device:', error);
      throw error;
    }

    return mapRowToDevice(data);
  },

  async updateDevice(id: string, updates: Partial<BMNDevice>): Promise<BMNDevice> {
    const dbRow = mapDeviceToRow(updates);
    dbRow.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('bmn_devices')
      .update(dbRow)
      .eq('id', id)
      .select('*, satker:master_divisi(*)')
      .single();

    if (error) {
      console.error('Error updating BMN device:', error);
      throw error;
    }

    return mapRowToDevice(data);
  },

  async deleteDevice(id: string): Promise<void> {
    const { error } = await supabase
      .from('bmn_devices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting BMN device:', error);
      throw error;
    }
  },

  // === SATKER CONFIGURATION ===

  async getAllSatkers(): Promise<Satker[]> {
    const { data, error } = await supabase
      .from('master_divisi')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching Satkers:', error);
      throw error;
    }

    return (data || []).map(mapRowToSatker);
  },

  async createSatker(satker: Partial<Satker> & { name: string }): Promise<Satker> {
    // Get max display order first
    const { data: maxOrderData } = await supabase
      .from('master_divisi')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].display_order || 0) + 1 : 1;

    const dbRow = {
      name: satker.name,
      parent_id: satker.parentId || null,
      code: satker.code || '',
      floor: satker.floor || '',
      is_active: true,
      display_order: nextOrder
    };

    const { data, error } = await supabase
      .from('master_divisi')
      .insert([dbRow])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating Satker:', error);
      throw error;
    }

    return mapRowToSatker(data);
  },

  async updateSatker(id: string, updates: Partial<Satker>): Promise<Satker> {
    const dbRow: any = {};
    if (updates.name !== undefined) dbRow.name = updates.name;
    if (updates.parentId !== undefined) dbRow.parent_id = updates.parentId;
    if (updates.code !== undefined) dbRow.code = updates.code;
    if (updates.floor !== undefined) dbRow.floor = updates.floor;

    const { data, error } = await supabase
      .from('master_divisi')
      .update(dbRow)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating Satker:', error);
      throw error;
    }

    return mapRowToSatker(data);
  },

  async deleteSatker(id: string): Promise<void> {
    // First check if there are sub-satkers linking to this as parent
    const { data: children, error: checkError } = await supabase
      .from('master_divisi')
      .select('id')
      .eq('parent_id', id);

    if (checkError) throw checkError;
    if (children && children.length > 0) {
      throw new Error('Tidak bisa menghapus Satker ini karena memiliki Satker anak. Hapus atau pindahkan anak terlebih dahulu.');
    }

    const { error } = await supabase
      .from('master_divisi')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting Satker:', error);
      throw error;
    }
  }
};
