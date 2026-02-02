// useMasterDataCRUD.ts
// Hook untuk handle CRUD operations pada master data tables
import { supabase } from '../lib/supabaseClient';
import { useMasterData } from '../contexts/MasterDataContext';

export const useMasterDataCRUD = () => {
    const { fetchMasterData } = useMasterData();

    // Generic add function
    const addMasterData = async (tableName: string, name: string) => {
        // Check if already exists
        const { data: existing, error: checkError } = await supabase
            .from(tableName)
            .select('name')
            .eq('name', name)
            .maybeSingle();

        if (existing) {
            throw new Error('Data sudah ada');
        }

        // Get max display_order
        const { data: maxOrder } = await supabase
            .from(tableName)
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1)
            .single();

        const newOrder = (maxOrder?.display_order || 0) + 1;

        // Insert
        const { error } = await supabase
            .from(tableName)
            .insert([{ name, display_order: newOrder }]);

        if (error) throw error;

        // Refresh data
        await fetchMasterData();
    };

    // Generic edit function
    const editMasterData = async (tableName: string, oldName: string, newName: string) => {
        if (oldName === newName) return;

        // Check if new name already exists
        const { data: existing } = await supabase
            .from(tableName)
            .select('name')
            .eq('name', newName)
            .maybeSingle();

        if (existing) {
            throw new Error('Nama baru sudah digunakan');
        }

        // Update
        const { data: updateData, error: updateError } = await supabase
            .from(tableName)
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('name', oldName)
            .select();

        if (updateError) {
            throw updateError;
        }

        if (!updateData || updateData.length === 0) {
            throw new Error('Data tidak ditemukan atau tidak bisa diubah');
        }

        // Update references in surats table
        if (tableName === 'master_unit_internal' || tableName === 'master_unit_eksternal') {
            await supabase
                .from('surats')
                .update({ asal_surat: newName })
                .eq('asal_surat', oldName);

            await supabase
                .from('surats')
                .update({ tujuan_surat: newName })
                .eq('tujuan_surat', oldName);
        } else if (tableName === 'master_sifat_surat') {
            await supabase
                .from('surats')
                .update({ sifat_surat: newName })
                .eq('sifat_surat', oldName);
        } else if (tableName === 'master_jenis_naskah') {
            await supabase
                .from('surats')
                .update({ jenis_naskah: newName })
                .eq('jenis_naskah', oldName);
        } else if (tableName === 'master_klasifikasi_surat') {
            await supabase
                .from('surats')
                .update({ klasifikasi_surat: newName })
                .eq('klasifikasi_surat', oldName);
        } else if (tableName === 'master_bidang_tugas') {
            await supabase
                .from('surats')
                .update({ bidang_tugas: newName })
                .eq('bidang_tugas', oldName);
        }

        // Refresh data
        await fetchMasterData();
    };

    // Generic delete function
    const deleteMasterData = async (tableName: string, name: string) => {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('name', name);

        if (error) throw error;

        // Refresh data
        await fetchMasterData();
    };

    // Check if can delete (check if used in surats)
    const canDeleteMasterData = async (tableName: string, name: string): Promise<boolean> => {
        let query;
        
        if (tableName === 'master_unit_internal' || tableName === 'master_unit_eksternal') {
            const { data: asalCount } = await supabase
                .from('surats')
                .select('id', { count: 'exact', head: true })
                .eq('asal_surat', name);

            const { data: tujuanCount } = await supabase
                .from('surats')
                .select('id', { count: 'exact', head: true })
                .eq('tujuan_surat', name);

            return (asalCount || 0) === 0 && (tujuanCount || 0) === 0;
        } else if (tableName === 'master_sifat_surat') {
            query = supabase.from('surats').select('id', { count: 'exact', head: true }).eq('sifat_surat', name);
        } else if (tableName === 'master_jenis_naskah') {
            query = supabase.from('surats').select('id', { count: 'exact', head: true }).eq('jenis_naskah', name);
        } else if (tableName === 'master_klasifikasi_surat') {
            query = supabase.from('surats').select('id', { count: 'exact', head: true }).eq('klasifikasi_surat', name);
        } else if (tableName === 'master_bidang_tugas') {
            query = supabase.from('surats').select('id', { count: 'exact', head: true }).eq('bidang_tugas', name);
        } else {
            return true; // Unknown table, allow delete
        }

        const { count } = await query;
        return (count || 0) === 0;
    };

    return {
        addMasterData,
        editMasterData,
        deleteMasterData,
        canDeleteMasterData
    };
};
