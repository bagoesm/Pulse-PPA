// src/utils/storageUtils.ts
import { supabase } from '../lib/supabaseClient';
import { Attachment } from '../../types';

/**
 * Generate signed URL for attachment
 * If attachment already has a valid URL, return it
 * Otherwise, generate a new signed URL from the path
 */
export const getAttachmentUrl = async (
  attachment: Attachment | undefined,
  bucketName: string = 'attachment'
): Promise<string> => {
  if (!attachment) return '';

  // If it's a link (not a file), return the URL directly
  if (attachment.isLink) {
    return attachment.url || '';
  }

  // If no path, return existing URL (might be expired but better than nothing)
  if (!attachment.path) {
    return attachment.url || '';
  }

  try {
    // Try to get public URL first (this doesn't make a request)
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(attachment.path);

    // If we have a public URL, try to create signed URL
    // But wrap in try-catch to handle 404 silently
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(attachment.path, 60 * 60);

      if (error) {
        // Return public URL or fallback
        return publicData.publicUrl || attachment.url || '';
      }

      return data.signedUrl || publicData.publicUrl || attachment.url || '';
    } catch {
      // If signed URL fails, return public URL or fallback
      return publicData.publicUrl || attachment.url || '';
    }
  } catch (err: any) {
    // Return fallback without logging
    return attachment.url || '';
  }
};

/**
 * Refresh attachment with new signed URL
 */
export const refreshAttachment = async (
  attachment: Attachment,
  bucketName: string = 'attachment'
): Promise<Attachment> => {
  const newUrl = await getAttachmentUrl(attachment, bucketName);
  return {
    ...attachment,
    url: newUrl
  };
};

/**
 * Refresh multiple attachments with new signed URLs
 */
export const refreshAttachments = async (
  attachments: Attachment[],
  bucketName: string = 'attachment'
): Promise<Attachment[]> => {
  return Promise.all(
    attachments.map(att => refreshAttachment(att, bucketName))
  );
};
