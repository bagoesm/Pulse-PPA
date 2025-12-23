// src/components/ProjectLinksSection.tsx
// Links table section with pinning functionality for project detail view

import React from 'react';
import { Link2, Pin, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectLink {
    id: string;
    title: string;
    url: string;
    sourceId: string;
    sourceTitle: string;
    sourceType: 'task' | 'meeting';
    uniqueId: string;
}

interface ProjectLinksSectionProps {
    links: ProjectLink[];
    pinnedLinkIds: Set<string>;
    togglePinLink: (linkId: string) => void;
    linksPage: number;
    setLinksPage: (value: number | ((prev: number) => number)) => void;
}

const LINKS_PER_PAGE = 10;

const ProjectLinksSection: React.FC<ProjectLinksSectionProps> = ({
    links, pinnedLinkIds, togglePinLink, linksPage, setLinksPage
}) => {
    // Sort: pinned first, then by title
    const sortedLinks = [...links].sort((a, b) => {
        const aPinned = pinnedLinkIds.has(a.uniqueId);
        const bPinned = pinnedLinkIds.has(b.uniqueId);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return a.title.localeCompare(b.title);
    });

    // Pagination
    const totalLinksPages = Math.ceil(sortedLinks.length / LINKS_PER_PAGE);
    const paginatedLinks = sortedLinks.slice(
        (linksPage - 1) * LINKS_PER_PAGE,
        linksPage * LINKS_PER_PAGE
    );

    return (
        <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Link2 size={16} /> Link Project ({links.length})
            </h3>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {sortedLinks.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 w-8"></th>
                                        <th className="px-4 py-3">Judul Link</th>
                                        <th className="px-4 py-3">Sumber</th>
                                        <th className="px-4 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedLinks.map((link) => {
                                        const isPinned = pinnedLinkIds.has(link.uniqueId);
                                        return (
                                            <tr
                                                key={link.uniqueId}
                                                className={`hover:bg-slate-50 transition ${isPinned ? 'bg-amber-50/50' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => togglePinLink(link.uniqueId)}
                                                        className={`p-1 rounded transition-colors ${isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-slate-500'
                                                            }`}
                                                        title={isPinned ? 'Unpin' : 'Pin to top'}
                                                    >
                                                        <Pin size={14} className={isPinned ? 'fill-current' : ''} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <Link2 size={14} className="text-gov-500 flex-shrink-0" />
                                                        <span className="truncate max-w-[200px]" title={link.title}>
                                                            {link.title}
                                                        </span>
                                                        {isPinned && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">
                                                                PINNED
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${link.sourceType === 'meeting' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {link.sourceType === 'meeting' ? '📅' : '📋'} {link.sourceTitle}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gov-600 hover:text-gov-700 hover:bg-gov-50 rounded transition-colors"
                                                    >
                                                        <ExternalLink size={12} />
                                                        Buka
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalLinksPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                                <span className="text-xs text-slate-500">
                                    Halaman <b>{linksPage}</b> dari {totalLinksPages}
                                    <span className="ml-2 text-slate-400">({paginatedLinks.length} dari {sortedLinks.length} link)</span>
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={linksPage === 1}
                                        onClick={() => setLinksPage(p => p - 1)}
                                        className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        disabled={linksPage === totalLinksPages}
                                        onClick={() => setLinksPage(p => p + 1)}
                                        className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-slate-100"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        Belum ada link yang ditambahkan.
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProjectLinksSection;
