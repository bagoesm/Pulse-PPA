// src/components/ProjectDocumentsSection.tsx
// Documents table section for project detail view

import React from 'react';
import { FileText, Download, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ProjectLink } from '../../types';

interface Document {
    id: string;
    name: string;
    type?: string;
    url?: string;
    path?: string;
    source: string; // Task title or Meeting title
    sourceType: 'task' | 'meeting';
}

interface CombinedDocument {
    id: string;
    name: string;
    type?: string;
    url?: string;
    path?: string;
    source: string;
    sourceType: 'task' | 'meeting' | 'project';
    isProjectDoc?: boolean;
}

interface ProjectDocumentsSectionProps {
    documents: Document[];
    projectDocuments?: ProjectLink[];  // Standalone project documents
    onAddDocument?: () => void;
    onDeleteProjectDocument?: (docId: string) => Promise<void>;
    canManage?: boolean;
}

const ProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({
    documents,
    projectDocuments = [],
    onAddDocument,
    onDeleteProjectDocument,
    canManage = false
}) => {
    // Combine task documents and project documents
    const combinedDocuments: CombinedDocument[] = [
        ...documents.map(d => ({ ...d, isProjectDoc: false })),
        ...projectDocuments.filter(d => d.type === 'document').map(d => ({
            id: d.id,
            name: d.fileName || d.title,
            type: d.fileName?.split('.').pop()?.toUpperCase() || 'FILE',
            url: undefined,
            path: d.filePath,
            source: 'Project',
            sourceType: 'project' as const,
            isProjectDoc: true
        }))
    ];

    const handleDownload = async (doc: CombinedDocument) => {
        try {
            if (doc.url) {
                window.open(doc.url, "_blank");
                return;
            }
            if (doc.path) {
                const { data, error } = await supabase
                    .storage
                    .from('attachment')
                    .createSignedUrl(doc.path, 60 * 60);
                if (error || !data?.signedUrl) {
                    alert('Gagal membuat URL download.');
                    return;
                }
                window.open(data.signedUrl, '_blank');
                return;
            }
            alert('File belum tersedia untuk di-download.');
        } catch (err) {
            alert('Terjadi kesalahan saat mencoba download file.');
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} /> Dokumen Project ({combinedDocuments.length})
                </h3>
                {canManage && onAddDocument && (
                    <button
                        onClick={onAddDocument}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600 text-white rounded-lg text-xs font-medium hover:bg-gov-700 transition-colors"
                    >
                        <Plus size={14} />
                        Upload Dokumen
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {combinedDocuments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Nama File</th>
                                    <th className="px-4 py-3">Tipe</th>
                                    <th className="px-4 py-3">Sumber</th>
                                    <th className="px-4 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {combinedDocuments.map((d, i) => (
                                    <tr key={`${d.id}-${i}`} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 flex items-center gap-2 text-slate-700">
                                            <FileText size={16} className="text-gov-500" />
                                            {d.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{d.type || 'FILE'}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${d.sourceType === 'meeting' ? 'bg-purple-100 text-purple-700' :
                                                    d.sourceType === 'project' ? 'bg-green-100 text-green-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {d.sourceType === 'meeting' ? '📅' : d.sourceType === 'project' ? '📌' : '📋'} {d.source}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDownload(d)}
                                                    className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded transition-colors"
                                                    aria-label={`Download ${d.name}`}
                                                >
                                                    <Download size={16} />
                                                </button>
                                                {d.isProjectDoc && canManage && onDeleteProjectDocument && (
                                                    <button
                                                        onClick={() => onDeleteProjectDocument(d.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Hapus dokumen"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        Belum ada dokumen yang diunggah.
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProjectDocumentsSection;
