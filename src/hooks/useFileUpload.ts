import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Attachment } from '../../types';

interface UseFileUploadReturn {
    isUploading: boolean;
    error: string | null;
    uploadFile: (file: File, pathPrefix?: string) => Promise<Attachment | null>;
    resetUploadState: () => void;
}

export const useFileUpload = (bucketName: string = 'attachment'): UseFileUploadReturn => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetUploadState = useCallback(() => {
        setIsUploading(false);
        setError(null);
    }, []);

    const uploadFile = useCallback(async (file: File, pathPrefix: string = 'files') => {
        setIsUploading(true);
        setError(null);

        try {
            const ext = file.name.split('.').pop();
            // Clean filename to avoid issues with special characters, preserve original name
            const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            const cleanBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
            // Add timestamp for uniqueness
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const storagePath = `${pathPrefix}/${cleanBaseName}_${timestamp}.${ext}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(storagePath, file);

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // Create signed URL (valid for 1 hour)
            const { data: signedData, error: signedError } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(storagePath, 60 * 60);

            // Silent error for signed URL creation (optional feature)
            if (signedError) {
                console.warn('Failed to create signed URL:', signedError);
            }

            const attachment: Attachment = {
                id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                path: storagePath,
                url: signedData?.signedUrl || undefined
            };

            setIsUploading(false);
            return attachment;
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Terjadi kesalahan saat upload file.');
            setIsUploading(false);
            return null;
        }
    }, [bucketName]);

    return {
        isUploading,
        error,
        uploadFile,
        resetUploadState
    };
};
