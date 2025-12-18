import React, { useState } from 'react';
import { Plus, Search, Link2, ExternalLink, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { DataInventoryItem, DataInventoryLink, User } from '../../types';

interface DataInventoryProps {
  items: DataInventoryItem[];
  currentUser: User | null;
  onAddItem: (item: Omit<DataInventoryItem, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateItem: (item: DataInventoryItem) => void;
  onDeleteItem: (id: string) => void;
}

const DataInventory: React.FC<DataInventoryProps> = ({
  items,
  currentUser,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DataInventoryItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLinks, setFormLinks] = useState<DataInventoryLink[]>([]);

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormLinks([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DataInventoryItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormLinks([...item.links]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormLinks([]);
  };

  const handleAddLink = () => {
    setFormLinks([...formLinks, { id: `link_${Date.now()}`, title: '', url: '' }]);
  };

  const handleRemoveLink = (linkId: string) => {
    setFormLinks(formLinks.filter(l => l.id !== linkId));
  };

  const handleLinkChange = (linkId: string, field: 'title' | 'url', value: string) => {
    setFormLinks(formLinks.map(l => l.id === linkId ? { ...l, [field]: value } : l));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    // Filter out empty links
    const validLinks = formLinks.filter(l => l.title.trim() && l.url.trim());

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        title: formTitle.trim(),
        description: formDescription.trim(),
        links: validLinks,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddItem({
        title: formTitle.trim(),
        description: formDescription.trim(),
        links: validLinks
      });
    }
    closeModal();
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const canEdit = (item: DataInventoryItem) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Atasan') return true;
    return item.createdBy === currentUser.name;
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventori Data</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kumpulan informasi umum seperti link pelaporan, akun Zoom, dan lainnya
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Tambah Data
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Cari data..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none"
        />
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link2 className="text-slate-400" size={24} />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">Belum ada data</h3>
          <p className="text-sm text-slate-500">Klik "Tambah Data" untuk menambahkan informasi baru</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800 line-clamp-2">{item.title}</h3>
                  {canEdit(item) && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-gov-600 hover:bg-gov-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-3">{item.description}</p>
                
                {/* Links */}
                {item.links.length > 0 && (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1 text-xs font-medium text-gov-600 hover:text-gov-700"
                    >
                      <Link2 size={12} />
                      {item.links.length} tautan
                      {expandedItems.has(item.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedItems.has(item.id) && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-gov-100">
                        {item.links.map(link => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gov-600 hover:text-gov-700 hover:underline"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                Dibuat oleh {item.createdBy} • {new Date(item.createdAt).toLocaleDateString('id-ID')}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingItem ? 'Edit Data' : 'Tambah Data Baru'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Link Pelaporan Kinerja"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan informasi ini..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none resize-none"
                  required
                />
              </div>

              {/* Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Tautan (Opsional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="flex items-center gap-1 text-xs font-medium text-gov-600 hover:text-gov-700"
                  >
                    <Plus size={14} />
                    Tambah Tautan
                  </button>
                </div>
                
                {formLinks.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Belum ada tautan</p>
                ) : (
                  <div className="space-y-3">
                    {formLinks.map((link) => (
                      <div key={link.id} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => handleLinkChange(link.id, 'title', e.target.value)}
                            placeholder="Judul tautan"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => handleLinkChange(link.id, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-gov-400 focus:ring-1 focus:ring-gov-400 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(link.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formDescription.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gov-600 hover:bg-gov-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataInventory;
