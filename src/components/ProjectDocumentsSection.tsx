// src/components/ProjectDocumentsSection.tsx
// Documents table section for project detail view

import React from 'react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Document {
    id: string;
    name: string;
    type?: string;
    url?: string;
    path?: string;
    source: string; // Task title or Meeting title
    sourceType: 'task' | 'meeting';
}

interface ProjectDocumentsSectionProps {
    documents: Document[];
}

const ProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({ documents }) => {
    const handleDownload = async (doc: Document) => {
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
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} /> Dokumen Project ({documents.length})
            </h3>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {documents.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Nama File</th>
                                    <th className="px-4 py-3">Tipe</th>
                                    <th className="px-4 py-3">Sumber</th>
                                    <th className="px-4 py-3 text-right">Download</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {documents.map((d, i) => (
                                    <tr key={`${d.id}-${i}`} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 flex items-center gap-2 text-slate-700">
                                            <FileText size={16} className="text-gov-500" />
                                            {d.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{d.type || 'FILE'}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${d.sourceType === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {d.sourceType === 'meeting' ? '📅' : '📋'} {d.source}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDownload(d)}
                                                className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded transition-colors"
                                                aria-label={`Download ${d.name}`}
                                            >
                                                <Download size={16} />
                                            </button>
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
