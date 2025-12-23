// src/contexts/MasterDataContext.tsx
// Domain context for Master Data (Categories, SubCategories, Jabatan, Relations)
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

interface MasterDataContextType {
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
    fetchMasterData: () => Promise<void>;
    clearMasterData: () => void;
    isMasterDataLoading: boolean;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};

interface MasterDataProviderProps {
    children: ReactNode;
    session: any;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children, session }) => {
    const [isMasterDataLoading, setIsMasterDataLoading] = useState(false);
    const [jabatanList, setJabatanList] = useState<string[]>([]);
    const [subCategories, setSubCategories] = useState<string[]>([]);
    const [masterCategories, setMasterCategories] = useState<any[]>([]);
    const [masterSubCategories, setMasterSubCategories] = useState<any[]>([]);
    const [categorySubcategoryRelations, setCategorySubcategoryRelations] = useState<any[]>([]);

    const fetchMasterData = useCallback(async () => {
        setIsMasterDataLoading(true);
        try {
            const [jabatanRes, subCatRes, categoriesRes, subCategoriesRes, relationsRes] = await Promise.all([
                supabase.from('master_jabatan').select('name'),
                supabase.from('master_sub_categories').select('name'),
                supabase.from('master_categories').select('*').order('display_order'),
                supabase.from('master_sub_categories').select('*').order('display_order'),
                supabase.from('category_subcategory_relations').select('*')
            ]);

            if (jabatanRes.data) setJabatanList(jabatanRes.data.map((j: any) => j.name));
            if (subCatRes.data) setSubCategories(subCatRes.data.map((s: any) => s.name));
            if (categoriesRes.data) setMasterCategories(categoriesRes.data);
            if (subCategoriesRes.data) setMasterSubCategories(subCategoriesRes.data);
            if (relationsRes.data) setCategorySubcategoryRelations(relationsRes.data);
        } finally {
            setIsMasterDataLoading(false);
        }
    }, []);

    const clearMasterData = useCallback(() => {
        setJabatanList([]);
        setSubCategories([]);
        setMasterCategories([]);
        setMasterSubCategories([]);
        setCategorySubcategoryRelations([]);
    }, []);

    useEffect(() => {
        if (session) {
            fetchMasterData();
        } else {
            clearMasterData();
        }
    }, [session, fetchMasterData, clearMasterData]);

    const value: MasterDataContextType = {
        jabatanList,
        setJabatanList,
        subCategories,
        setSubCategories,
        masterCategories,
        setMasterCategories,
        masterSubCategories,
        setMasterSubCategories,
        categorySubcategoryRelations,
        setCategorySubcategoryRelations,
        fetchMasterData,
        clearMasterData,
        isMasterDataLoading
    };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
};

export default MasterDataContext;
