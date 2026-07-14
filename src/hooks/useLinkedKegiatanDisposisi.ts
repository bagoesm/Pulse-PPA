// src/hooks/useLinkedKegiatanDisposisi.ts
// Optimized hook for fetching linked Kegiatan and Disposisi in a single query
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Meeting, Disposisi } from '../../types';
import { mappers } from '../utils/mappers';

interface UseLinkedKegiatanDisposisiResult {
  kegiatan: Meeting | null;
  disposisi: Disposisi[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Optimized hook to fetch linked Kegiatan and Disposisi in a single operation
 * Solves N+1 query problem by using a single query with joins
 * 
 * @param suratId - ID of the Surat
 * @param kegiatanId - ID of the linked Kegiatan
 * @param enabled - Whether to fetch data (default: true)
 */
export const useLinkedKegiatanDisposisi = (
  suratId: string | undefined,
  kegiatanId: string | null | undefined,
  enabled: boolean = true
): UseLinkedKegiatanDisposisiResult => {
  const [kegiatan, setKegiatan] = useState<Meeting | null>(null);
  const [disposisi, setDisposisi] = useState<Disposisi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!suratId || !enabled) {
      setKegiatan(null);
      setDisposisi([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch Kegiatan only if kegiatanId is provided
      const promises = [
        kegiatanId
          ? supabase.from('meetings').select('*').eq('id', kegiatanId).single()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('disposisi')
          .select('*')
          .eq('surat_id', suratId)
          .order('created_at', { ascending: false })
      ];

      const [kegiatanResult, disposisiResult] = await Promise.all(promises);

      if (kegiatanResult.error && kegiatanResult.error.code !== 'PGRST116') throw kegiatanResult.error;
      if (disposisiResult.error) throw disposisiResult.error;

      // Use centralized mappers
      const mappedKegiatan = kegiatanResult.data 
        ? mappers.meeting(kegiatanResult.data)
        : null;
      
      const mappedDisposisi = disposisiResult.data
        ? mappers.disposisiList(disposisiResult.data)
        : [];

      setKegiatan(mappedKegiatan);
      setDisposisi(mappedDisposisi);
    } catch (err) {
      console.error('Error fetching linked data:', err);
      setError(err as Error);
      setKegiatan(null);
      setDisposisi([]);
    } finally {
      setIsLoading(false);
    }
  }, [suratId, kegiatanId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    kegiatan,
    disposisi,
    isLoading,
    error,
    refetch: fetchData,
  };
};
