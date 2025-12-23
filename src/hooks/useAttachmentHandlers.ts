import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Attachment } from '../../types';

interface UseAttachmentHandlersReturn {
    handleDownload: (attachment: Attachment) => Promise<void>;
    handleRemoveFromStorage: (attachment: Attachment) => Promise<boolean>;
}

export const useAttachmentHandlers = (
    bucketName: string = 'attachment',
    onError?: (title: string, message: string) => void
): UseAttachmentHandlersReturn => {

    const handleDownload = useCallback(async (attachment: Attachment) => {
        try {
            // If valid URL already exists, use it
            if (attachment.url) {
                window.open(attachment.url, '_blank');
                return;
            }

            // Generate signed URL if missing
            if (attachment.path) {
                const { data, error } = await supabase.storage
                    .from(bucketName)
                    .createSignedUrl(attachment.path, 60 * 60); // 1 hour

                if (error) {
                    if (onError) onError('Download Gagal', 'Gagal membuat URL download. File mungkin sudah tidak tersedia.');
                    else console.error('Download error:', error);
                    return;
                }

                if (data?.signedUrl) {
                    window.open(data.signedUrl, '_blank');
                } else {
                    if (onError) onError('Download Gagal', 'Gagal mendapatkan URL download.');
                }
            } else {
                if (onError) onError('File Tidak Tersedia', 'File path tidak tersedia.');
            }
        } catch (err) {
            if (onError) onError('Terjadi Kesalahan', 'Terjadi kesalahan saat mencoba download file.');
            else console.error('Download exception:', err);
        }
    }, [bucketName, onError]);

    const handleRemoveFromStorage = useCallback(async (attachment: Attachment): Promise<boolean> => {
        if (!attachment.path) return true; // Treat as success if no path (nothing to delete)

        try {
            const { error } = await supabase.storage
                .from(bucketName)
                .remove([attachment.path]);

            if (error) {
                console.error('Error removing file from storage:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Exception removing file from storage:', err);
            return false;
        }
    }, [bucketName]);

    return {
        handleDownload,
        handleRemoveFromStorage
    };
};
