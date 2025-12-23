// src/hooks/useTemplateHandlers.ts
// Document template CRUD operations
import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DocumentTemplate, User } from '../../types';

interface UseTemplateHandlersProps {
    currentUser: User | null;
    documentTemplates: DocumentTemplate[];
    setDocumentTemplates: React.Dispatch<React.SetStateAction<DocumentTemplate[]>>;
    templateFilePaths: { [key: string]: string };
    setTemplateFilePaths: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export const useTemplateHandlers = ({
    currentUser,
    documentTemplates,
    setDocumentTemplates,
    templateFilePaths,
    setTemplateFilePaths
}: UseTemplateHandlersProps) => {

    // Add template
    const handleAddTemplate = useCallback(async (name: string, description: string, fileType: string, fileSize: number, file: File) => {
        if (!currentUser) return;

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('document-templates')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                return;
            }

            const { data: urlData, error: urlError } = await supabase.storage
                .from('document-templates')
                .createSignedUrl(fileName, 60 * 60 * 24 * 365);

            if (urlError) {
                console.error('Error creating signed URL:', urlError);
                return;
            }

            const { data, error } = await supabase.from('document_templates').insert([{
                name,
                description,
                file_type: fileType,
                file_size: fileSize,
                uploaded_by: currentUser.name,
                file_path: fileName,
                file_url: urlData.signedUrl
            }]).select().single();

            if (data && !error) {
                const newTmpl = {
                    ...data,
                    fileType: data.file_type,
                    fileSize: data.file_size,
                    uploadedBy: data.uploaded_by,
                    updatedAt: data.updated_at,
                    filePath: fileName,
                    fileUrl: urlData.signedUrl,
                    downloadCount: 0
                };
                setDocumentTemplates(prev => [newTmpl, ...prev]);
                setTemplateFilePaths(prev => ({ ...prev, [data.id]: fileName }));
            }
        } catch (error) {
            console.error('Error adding template:', error);
        }
    }, [currentUser, setDocumentTemplates, setTemplateFilePaths]);

    // Delete template
    const handleDeleteTemplate = useCallback(async (id: string) => {
        try {
            const template = documentTemplates.find(t => t.id === id);
            const filePath = template?.filePath || templateFilePaths[id];

            if (filePath) {
                await supabase.storage.from('document-templates').remove([filePath]);
            }

            const { error } = await supabase.from('document_templates').delete().eq('id', id);
            if (!error) {
                setDocumentTemplates(prev => prev.filter(t => t.id !== id));
                setTemplateFilePaths(prev => {
                    const newPaths = { ...prev };
                    delete newPaths[id];
                    return newPaths;
                });
            }
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    }, [documentTemplates, templateFilePaths, setDocumentTemplates, setTemplateFilePaths]);

    // Download template
    const handleDownloadTemplate = useCallback(async (id: string, fileName: string) => {
        try {
            const template = documentTemplates.find(t => t.id === id);
            let filePath = template?.filePath || templateFilePaths[id];

            if (!filePath) {
                const { data: fileList, error: listError } = await supabase.storage
                    .from('document-templates')
                    .list();

                if (listError) {
                    alert('Gagal mengakses storage.');
                    return;
                }

                const templateName = template?.name || '';
                const baseFileName = fileName.split('.')[0];

                const matchingFile = fileList?.find(file => {
                    const fn = file.name.toLowerCase();
                    return fn.includes(templateName.toLowerCase()) ||
                        fn.includes(baseFileName.toLowerCase());
                });

                if (matchingFile) {
                    filePath = matchingFile.name;
                    await supabase.from('document_templates')
                        .update({ file_path: filePath })
                        .eq('id', id);
                    setDocumentTemplates(prev =>
                        prev.map(t => t.id === id ? { ...t, filePath } : t)
                    );
                } else {
                    alert('File tidak ditemukan.');
                    return;
                }
            }

            const { data: signedData, error: signedError } = await supabase.storage
                .from('document-templates')
                .createSignedUrl(filePath, 60 * 5);

            if (signedError || !signedData?.signedUrl) {
                alert('Gagal membuat link download.');
                return;
            }

            const response = await fetch(signedData.signedUrl);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Update download count
            const newCount = (template?.downloadCount || 0) + 1;
            await supabase.from('document_templates')
                .update({ download_count: newCount })
                .eq('id', id);
            setDocumentTemplates(prev =>
                prev.map(t => t.id === id ? { ...t, downloadCount: newCount } : t)
            );
        } catch (error) {
            console.error('Error downloading template:', error);
            alert('Gagal mengunduh file.');
        }
    }, [documentTemplates, templateFilePaths, setDocumentTemplates]);

    return {
        handleAddTemplate,
        handleDeleteTemplate,
        handleDownloadTemplate
    };
};

export default useTemplateHandlers;
