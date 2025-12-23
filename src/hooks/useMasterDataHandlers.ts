// src/hooks/useMasterDataHandlers.ts
// Master data CRUD - jabatan, categories, subcategories
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UseMasterDataHandlersProps {
    jabatanList: string[];
    setJabatanList: React.Dispatch<React.SetStateAction<string[]>>;
    subCategories: string[];
    setSubCategories: React.Dispatch<React.SetStateAction<string[]>>;
    masterCategories: any[];
    setMasterCategories: React.Dispatch<React.SetStateAction<any[]>>;
    masterSubCategories: any[];
    setMasterSubCategories: React.Dispatch<React.SetStateAction<any[]>>;
    categorySubcategoryRelations: any[];
    setCategorySubcategoryRelations: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useMasterDataHandlers = ({
    jabatanList,
    setJabatanList,
    subCategories,
    setSubCategories,
    masterCategories,
    setMasterCategories,
    masterSubCategories,
    setMasterSubCategories,
    categorySubcategoryRelations,
    setCategorySubcategoryRelations
}: UseMasterDataHandlersProps) => {

    // Jabatan handlers
    const handleAddJabatan = useCallback(async (newItem: string) => {
        const { error } = await supabase.from('master_jabatan').insert([{ name: newItem }]);
        if (!error) setJabatanList(prev => [...prev, newItem]);
    }, [setJabatanList]);

    const handleDeleteJabatan = useCallback(async (item: string) => {
        const { error } = await supabase.from('master_jabatan').delete().eq('name', item);
        if (!error) setJabatanList(prev => prev.filter(j => j !== item));
    }, [setJabatanList]);

    // SubCategory basic handlers
    const handleAddSubCategory = useCallback(async (newItem: string) => {
        const { error } = await supabase.from('master_sub_categories').insert([{ name: newItem }]);
        if (!error) setSubCategories(prev => [...prev, newItem]);
    }, [setSubCategories]);

    const handleDeleteSubCategory = useCallback(async (item: string) => {
        const { error } = await supabase.from('master_sub_categories').delete().eq('name', item);
        if (!error) setSubCategories(prev => prev.filter(s => s !== item));
    }, [setSubCategories]);

    // Master Category handlers
    const handleAddMasterCategory = useCallback(async (name: string, icon: string, color: string, selectedSubCategories?: string[]) => {
        const { data, error } = await supabase.from('master_categories').insert([{
            name, icon, color, display_order: masterCategories.length + 1
        }]).select().single();

        if (data && !error) {
            setMasterCategories(prev => [...prev, data]);

            if (selectedSubCategories && selectedSubCategories.length > 0) {
                const relations = selectedSubCategories.map(subId => ({
                    category_id: data.id,
                    subcategory_id: subId
                }));

                const { data: relationData, error: relationError } = await supabase
                    .from('category_subcategory_relations')
                    .insert(relations)
                    .select();

                if (relationData && !relationError) {
                    setCategorySubcategoryRelations(prev => [...prev, ...relationData]);
                }
            }
        }
    }, [masterCategories, setMasterCategories, setCategorySubcategoryRelations]);

    const handleUpdateMasterCategory = useCallback(async (id: string, name: string, icon: string, color: string, selectedSubCategories?: string[]) => {
        const { error } = await supabase.from('master_categories')
            .update({ name, icon, color })
            .eq('id', id);

        if (!error) {
            setMasterCategories(prev => prev.map(cat =>
                cat.id === id ? { ...cat, name, icon, color } : cat
            ));

            if (selectedSubCategories !== undefined) {
                await supabase.from('category_subcategory_relations')
                    .delete()
                    .eq('category_id', id);

                setCategorySubcategoryRelations(prev =>
                    prev.filter(rel => rel.category_id !== id)
                );

                if (selectedSubCategories.length > 0) {
                    const relations = selectedSubCategories.map(subId => ({
                        category_id: id,
                        subcategory_id: subId
                    }));

                    const { data: relationData, error: relationError } = await supabase
                        .from('category_subcategory_relations')
                        .insert(relations)
                        .select();

                    if (relationData && !relationError) {
                        setCategorySubcategoryRelations(prev => [...prev, ...relationData]);
                    }
                }
            }
        }
    }, [setMasterCategories, setCategorySubcategoryRelations]);

    const handleDeleteMasterCategory = useCallback(async (id: string) => {
        const { error } = await supabase.from('master_categories').delete().eq('id', id);
        if (!error) {
            setMasterCategories(prev => prev.filter(cat => cat.id !== id));
            setCategorySubcategoryRelations(prev =>
                prev.filter(rel => rel.category_id !== id)
            );
        }
    }, [setMasterCategories, setCategorySubcategoryRelations]);

    // Master SubCategory handlers
    const handleAddMasterSubCategory = useCallback(async (name: string, categoryId: string) => {
        const { data, error } = await supabase.from('master_sub_categories').insert([{
            name,
            category_id: null,
            display_order: masterSubCategories.length + 1
        }]).select().single();

        if (data && !error) {
            setMasterSubCategories(prev => [...prev, data]);
        }
    }, [masterSubCategories, setMasterSubCategories]);

    const handleUpdateMasterSubCategory = useCallback(async (id: string, name: string, categoryId: string) => {
        const { error } = await supabase.from('master_sub_categories')
            .update({ name })
            .eq('id', id);

        if (!error) {
            setMasterSubCategories(prev => prev.map(sub =>
                sub.id === id ? { ...sub, name } : sub
            ));
        }
    }, [setMasterSubCategories]);

    const handleDeleteMasterSubCategory = useCallback(async (id: string) => {
        const { error } = await supabase.from('master_sub_categories').delete().eq('id', id);
        if (!error) {
            setMasterSubCategories(prev => prev.filter(sub => sub.id !== id));
            setCategorySubcategoryRelations(prev =>
                prev.filter(rel => rel.subcategory_id !== id)
            );
        }
    }, [setMasterSubCategories, setCategorySubcategoryRelations]);

    return {
        handleAddJabatan,
        handleDeleteJabatan,
        handleAddSubCategory,
        handleDeleteSubCategory,
        handleAddMasterCategory,
        handleUpdateMasterCategory,
        handleDeleteMasterCategory,
        handleAddMasterSubCategory,
        handleUpdateMasterSubCategory,
        handleDeleteMasterSubCategory
    };
};

export default useMasterDataHandlers;
