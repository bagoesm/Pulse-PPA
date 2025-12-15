import React, { useState } from 'react';
import { DocumentTemplate, User } from '../../types';
import { 
    FileText, Download, Trash2, Search, Plus, X, Upload, 
    FileSpreadsheet, File as FileIcon, Clock
} from 'lucide-react';

interface DocumentTemplatesProps {
    templates: DocumentTemplate[];
    currentUser: User;
    onAddTemplate: (name: string, description: string, fileType: string, fileSize: number, file: File) => void;
    onDeleteTemplate: (id: string) => void;
    onDownloadTemplate: (id: string, fileName: string) => void;
}

const DocumentTemplates: React.FC<DocumentTemplatesProps> = ({ 
    templates, currentUser, onAddTemplate, onDeleteTemplate, onDownloadTemplate 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [newTemplate, setNewTemplate] = useState<{name: string, description: string, file: File | null}>({
        name: '', description: '', file: null
    });

    const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Atasan';

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.includes('word') || type === 'docx' || type === 'doc') return <FileText className="text-blue-600" size={20} />;
        if (type.includes('sheet') || type === 'xlsx' || type === 'xls') return <FileSpreadsheet className="text-green-600" size={20} />;
        if (type.includes('pdf')) return <FileText className="text-red-600" size={20} />;
        return <FileIcon className="text-slate-500" size={20} />;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setNewTemplate({ ...newTemplate, file: e.target.files[0] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTemplate.name && newTemplate.description && newTemplate.file) {
            const ext = newTemplate.file.name.split('.').pop() || 'file';
            onAddTemplate(newTemplate.name, newTemplate.description, ext, newTemplate.file.size, newTemplate.file);
            setNewTemplate({ name: '', description: '', file: null });
            setIsModalOpen(false);
        }
    };

    const handleDownload = (template: DocumentTemplate) => {
        onDownloadTemplate(template.id, template.name + '.' + template.fileType);
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText className="text-gov-600" />
                        Template Dokumen
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Unduh template standar surat dan dokumen dinas.</p>
                </div>
                
                {canManage && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gov-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-gov-200 hover:bg-gov-700 hover:shadow-xl transition-all flex items-center gap-2"
                    >
                        <Upload size={18} /> Upload Template
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 max-w-2xl relative">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari nama template atau deskripsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gov-300 transition-all"
                />
            </div>

            {/* Template List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Nama Template</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Detail</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTemplates.length > 0 ? (
                            filteredTemplates.map(template => (
                                <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                                {getFileIcon(template.fileType)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm mb-0.5">{template.name}</p>
                                                <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                    {template.fileType} • {formatFileSize(template.fileSize)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-600 line-clamp-2">{template.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5" title="Diupdate">
                                                <Clock size={12} /> {template.updatedAt}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Upload size={12} /> {template.uploadedBy}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleDownload(template)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gov-50 text-gov-700 hover:bg-gov-100 rounded-lg text-xs font-bold transition-colors"
                                                title={`Didownload ${template.downloadCount} kali`}
                                            >
                                                <Download size={14} /> Download
                                            </button>
                                            
                                            {canManage && (
                                                <button 
                                                    onClick={() => { if(window.confirm('Hapus template ini?')) onDeleteTemplate(template.id); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                    Tidak ada template dokumen yang ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Upload Template Baru</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Template</label>
                                <input 
                                    type="text"
                                    required 
                                    value={newTemplate.name}
                                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm"
                                    placeholder="Contoh: Format Nota Dinas 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Deskripsi & Kegunaan</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={newTemplate.description}
                                    onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 outline-none text-sm resize-none"
                                    placeholder="Jelaskan kegunaan dokumen ini..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">File Dokumen</label>
                                <div className="border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                                    <input 
                                        type="file" 
                                        required
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {newTemplate.file ? (
                                        <div className="text-center">
                                            <FileText size={32} className="mx-auto text-gov-600 mb-2" />
                                            <p className="text-sm font-bold text-slate-800">{newTemplate.file.name}</p>
                                            <p className="text-xs text-slate-500">{formatFileSize(newTemplate.file.size)}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                                            <p className="text-sm font-medium text-slate-600">Klik untuk upload file</p>
                                            <p className="text-xs text-slate-400">DOCX, PDF, XLSX (Max 10MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-gov-600 text-white font-bold text-sm rounded-lg hover:bg-gov-700 flex items-center gap-2">
                                    <Upload size={16} /> Upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentTemplates;