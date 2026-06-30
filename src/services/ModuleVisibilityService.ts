// src/services/ModuleVisibilityService.ts
// Service layer for Module Visibility Control per Satker (Division)
import { supabase as defaultSupabase } from '../lib/supabaseClient';
import { handleDatabaseOperation } from '../utils/errorHandling';

export interface SatkerModuleVisibility {
  divisiId: string;
  divisiName: string;
  visibility: Record<string, boolean>; // e.g., { 'Pelayanan Zoom': true, 'Inventori BMN': false }
}

export class ModuleVisibilityService {
  private supabase: any;

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || defaultSupabase;
  }

  /**
   * Get visibility matrix settings (for admin grid)
   */
  async getVisibilitySettings(modules: string[]): Promise<SatkerModuleVisibility[]> {
    try {
      // 1. Get all active divisions
      const { data: divisions, error: divError } = await this.supabase
        .from('master_divisi')
        .select('id, name')
        .order('name', { ascending: true });

      if (divError) throw divError;

      // 2. Get all module visibility settings
      const { data: visibilityRows, error: visError } = await this.supabase
        .from('module_visibility')
        .select('*');

      if (visError) throw visError;

      // Create a map for easy lookup
      const visibilityMap = new Map<string, Record<string, boolean>>();
      (visibilityRows || []).forEach((row: any) => {
        if (!visibilityMap.has(row.divisi_id)) {
          visibilityMap.set(row.divisi_id, {});
        }
        visibilityMap.get(row.divisi_id)![row.module_name] = row.is_visible;
      });

      // 3. Build matrix
      return (divisions || []).map((div: any) => {
        const divVis = visibilityMap.get(div.id) || {};
        const visibility: Record<string, boolean> = {};
        
        modules.forEach((modName) => {
          // Default behavior: Pelayanan Zoom is false by default for everyone (except Biro Data dan Informasi),
          // while other modules are true by default if not set.
          if (divVis[modName] !== undefined) {
            visibility[modName] = divVis[modName];
          } else {
            if (modName === 'Pelayanan Zoom') {
              visibility[modName] = div.name === 'Biro Data dan Informasi';
            } else {
              visibility[modName] = true; // Other modules visible by default
            }
          }
        });

        return {
          divisiId: div.id,
          divisiName: div.name,
          visibility
        };
      });
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      throw error;
    }
  }

  /**
   * Update visibility for a specific module and division
   */
  async updateModuleVisibility(moduleName: string, divisiId: string, isVisible: boolean): Promise<void> {
    try {
      await handleDatabaseOperation(
        async () => {
          const { error } = await this.supabase
            .from('module_visibility')
            .upsert(
              {
                module_name: moduleName,
                divisi_id: divisiId,
                is_visible: isVisible,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'module_name,divisi_id' }
            );

          if (error) throw error;
        },
        'updateModuleVisibility'
      );
    } catch (error) {
      console.error('Error updating module visibility:', error);
      throw error;
    }
  }

  /**
   * Get visible modules for a specific division name
   */
  async getVisibleModulesForDivisi(divisiName: string | undefined): Promise<string[]> {
    if (!divisiName) return [];

    try {
      // 1. Find division by name
      const { data: division, error: divError } = await this.supabase
        .from('master_divisi')
        .select('id')
        .eq('name', divisiName)
        .maybeSingle();

      if (divError || !division) {
        // Fallback: If division not found in database, return all default modules
        return [];
      }

      // 2. Find explicit settings for this division
      const { data: visibilityRows, error: visError } = await this.supabase
        .from('module_visibility')
        .select('module_name, is_visible')
        .eq('divisi_id', division.id);

      if (visError) throw visError;

      // Let's build a map of settings
      const settingsMap = new Map<string, boolean>();
      (visibilityRows || []).forEach((row: any) => {
        settingsMap.set(row.module_name, row.is_visible);
      });

      // Modules we want to manage
      const allModules = [
        'Semua Task',
        'Project',
        'Surat & Kegiatan',
        'Realisasi Anggaran',
        'Inventori Data',
        'Inventori BMN',
        'Pelayanan Zoom',
        'Penilaian Arsip'
      ];

      // Filter visible modules
      return allModules.filter((modName) => {
        const explicitSetting = settingsMap.get(modName);
        if (explicitSetting !== undefined) {
          return explicitSetting;
        }
        
        // Default behavior
        if (modName === 'Pelayanan Zoom') {
          return divisiName === 'Biro Data dan Informasi';
        }
        return true; // All other modules are visible by default
      });
    } catch (error) {
      console.error('Error fetching visible modules for division:', error);
      // Fallback: return default modules in case of DB errors
      return [
        'Semua Task',
        'Project',
        'Surat & Kegiatan',
        'Realisasi Anggaran',
        'Inventori Data',
        'Inventori BMN'
      ];
    }
  }
}

export const moduleVisibilityService = new ModuleVisibilityService();
