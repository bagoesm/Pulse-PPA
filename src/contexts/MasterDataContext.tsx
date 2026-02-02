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
    // Surat master data
    unitInternalList: string[];
    setUnitInternalList: React.Dispatch<React.SetStateAction<string[]>>;
    unitEksternalList: string[];
    setUnitEksternalList: React.Dispatch<React.SetStateAction<string[]>>;
    sifatSuratList: string[];
    setSifatSuratList: React.Dispatch<React.SetStateAction<string[]>>;
    jenisNaskahList: string[];
    setJenisNaskahList: React.Dispatch<React.SetStateAction<string[]>>;
    klasifikasiSuratList: string[];
    setKlasifikasiSuratList: React.Dispatch<React.SetStateAction<string[]>>;
    bidangTugasList: string[];
    setBidangTugasList: React.Dispatch<React.SetStateAction<string[]>>;
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
    // Surat master data
    const [unitInternalList, setUnitInternalList] = useState<string[]>([]);
    const [unitEksternalList, setUnitEksternalList] = useState<string[]>([]);
    const [sifatSuratList, setSifatSuratList] = useState<string[]>([]);
    const [jenisNaskahList, setJenisNaskahList] = useState<string[]>([]);
    const [klasifikasiSuratList, setKlasifikasiSuratList] = useState<string[]>([]);
    const [bidangTugasList, setBidangTugasList] = useState<string[]>([]);

    const fetchMasterData = useCallback(async () => {
        setIsMasterDataLoading(true);
        try {
            const [
                jabatanRes, 
                subCatRes, 
                categoriesRes, 
                subCategoriesRes, 
                relationsRes,
                unitInternalRes,
                unitEksternalRes,
                sifatSuratRes,
                jenisNaskahRes,
                klasifikasiSuratRes,
                bidangTugasRes
            ] = await Promise.all([
                supabase.from('master_jabatan').select('name'),
                supabase.from('master_sub_categories').select('name'),
                supabase.from('master_categories').select('*').order('display_order'),
                supabase.from('master_sub_categories').select('*').order('display_order'),
                supabase.from('category_subcategory_relations').select('*'),
                supabase.from('master_unit_internal').select('name').eq('is_active', true).order('display_order'),
                supabase.from('master_unit_eksternal').select('name').eq('is_active', true).order('display_order'),
                supabase.from('master_sifat_surat').select('name').eq('is_active', true).order('display_order'),
                supabase.from('master_jenis_naskah').select('name').eq('is_active', true).order('display_order'),
                supabase.from('master_klasifikasi_surat').select('name').eq('is_active', true).order('display_order'),
                supabase.from('master_bidang_tugas').select('name').eq('is_active', true).order('display_order')
            ]);

            if (jabatanRes.data) setJabatanList(jabatanRes.data.map((j: any) => j.name));
            if (subCatRes.data) setSubCategories(subCatRes.data.map((s: any) => s.name));
            if (categoriesRes.data) setMasterCategories(categoriesRes.data);
            if (subCategoriesRes.data) setMasterSubCategories(subCategoriesRes.data);
            if (relationsRes.data) setCategorySubcategoryRelations(relationsRes.data);
            if (unitInternalRes.data) setUnitInternalList(unitInternalRes.data.map((u: any) => u.name));
            if (unitEksternalRes.data) setUnitEksternalList(unitEksternalRes.data.map((u: any) => u.name));
            if (sifatSuratRes.data) setSifatSuratList(sifatSuratRes.data.map((s: any) => s.name));
            if (jenisNaskahRes.data) setJenisNaskahList(jenisNaskahRes.data.map((j: any) => j.name));
            if (klasifikasiSuratRes.data) setKlasifikasiSuratList(klasifikasiSuratRes.data.map((k: any) => k.name));
            if (bidangTugasRes.data) setBidangTugasList(bidangTugasRes.data.map((b: any) => b.name));
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
        setUnitInternalList([]);
        setUnitEksternalList([]);
        setSifatSuratList([]);
        setJenisNaskahList([]);
        setKlasifikasiSuratList([]);
        setBidangTugasList([]);
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
        unitInternalList,
        setUnitInternalList,
        unitEksternalList,
        setUnitEksternalList,
        sifatSuratList,
        setSifatSuratList,
        jenisNaskahList,
        setJenisNaskahList,
        klasifikasiSuratList,
        setKlasifikasiSuratList,
        bidangTugasList,
        setBidangTugasList,
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
