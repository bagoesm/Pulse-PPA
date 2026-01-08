// src/components/AddProjectLinkModal.tsx
// Modal for adding links or uploading documents to a project

import React, { useState, useRef } from 'react';
import { X, Link2, Upload, FileText, Loader2 } from 'lucide-react';

interface AddProjectLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddLink: (title: string, url: string, description: string) => Promise<boolean>;
    onUploadDocument: (file: File, title: string, description: string) => Promise<boolean>;
    projectName?: string;
}

const AddProjectLinkModal: React.FC<AddProjectLinkModalProps> = ({
    isOpen,
    onClose,
    onAddLink,
    onUploadDocument,
    projectName
}) => {
    const [mode, setMode] = useState<'link' | 'document'>('link');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setTitle('');
        setUrl('');
        setDescription('');
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetForm();
        setMode('link');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let success = false;

            if (mode === 'link') {
                if (!title.trim() || !url.trim()) {
                    setIsSubmitting(false);
                    return;
                }
                success = await onAddLink(title.trim(), url.trim(), description.trim());
            } else {
                if (!file) {
                    setIsSubmitting(false);
                    return;
                }
                success = await onUploadDocument(file, title.trim() || file.name, description.trim());
            }

            if (success) {
                handleClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {mode === 'link' ? 'Tambah Link' : 'Upload Dokumen'}
                        </h2>
                        {projectName && (
                            <p className="text-xs text-slate-500">ke project: {projectName}</p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="px-6 pt-4">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setMode('link')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'link'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Link2 size={16} />
                            Link
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('document')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'document'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <FileText size={16} />
                            Dokumen
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {mode === 'link' ? (
                        <>
                            {/* URL */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none text-sm"
                                    required
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Judul <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nama link"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none text-sm"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    File <span className="text-red-500">*</span>
                                </label>
                                <div
                                    className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${file
                                            ? 'border-gov-400 bg-gov-50'
                                            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <FileText size={20} className="text-gov-600" />
                                            <span className="text-sm font-medium text-gov-700">{file.name}</span>
                                            <span className="text-xs text-slate-500">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-600">
                                                Klik atau drag file ke sini
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                PDF, DOCX, XLSX, dll (max 10MB)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title for document */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Judul Dokumen
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Kosongkan untuk gunakan nama file"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none text-sm"
                                />
                            </div>
                        </>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Deskripsi
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi singkat (opsional)"
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-transparent outline-none text-sm resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (mode === 'link' ? !url || !title : !file)}
                            className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg font-medium hover:bg-gov-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {mode === 'document' ? 'Mengupload...' : 'Menyimpan...'}
                                </>
                            ) : (
                                <>
                                    {mode === 'link' ? <Link2 size={16} /> : <Upload size={16} />}
                                    {mode === 'link' ? 'Tambah Link' : 'Upload'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectLinkModal;
