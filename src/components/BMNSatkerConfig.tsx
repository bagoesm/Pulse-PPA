import React, { useState, useEffect, useMemo } from 'react';
import { BMNDevicesService } from '../services/BMNDevicesService';
import { Satker } from '../../types';
import { useDivision } from '../contexts/DivisionContext';
import { 
  Plus, Edit2, Trash2, Folder, ChevronRight, 
  Settings, Save, X, Info, AlertCircle, Check 
} from 'lucide-react';

interface BMNSatkerConfigProps {
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const BMNSatkerConfig: React.FC<BMNSatkerConfigProps> = ({ showNotification }) => {
  const { fetchDivisiList } = useDivision();
  const [satkers, setSatkers] = useState<Satker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSatker, setEditingSatker] = useState<Satker | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all Satkers
  const fetchSatkers = async () => {
    try {
      setIsLoading(true);
      const list = await BMNDevicesService.getAllSatkers();
      setSatkers(list);
    } catch (err) {
      console.error(err);
      showNotification('Error', 'Gagal mengambil data Satker.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSatkers();
  }, []);

  // Filter potential parent Satkers (only top-level Satkers, which have parent_id == null)
  // Exclude current editing Satker to prevent self-referencing loops
  const parentOptions = useMemo(() => {
    return satkers.filter(s => !s.parentId && (!editingSatker || s.id !== editingSatker.id));
  }, [satkers, editingSatker]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingSatker(null);
    setName('');
    setParentId('');
    setCode('');
    setFloor('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (satker: Satker) => {
    setEditingSatker(satker);
    setName(satker.name);
    setParentId(satker.parentId || '');
    setCode(satker.code || '');
    setFloor(satker.floor || '');
    setIsModalOpen(true);
  };

  // Submit Handler (Save or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama Satker harus diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Satker> & { name: string } = {
        name: name.trim(),
        parentId: parentId || null,
        code: code.trim() || null,
        floor: floor.trim() || null
      };

      if (editingSatker) {
        // Edit Mode
        await BMNDevicesService.updateSatker(editingSatker.id, payload);
        showNotification('Berhasil', `Satker "${name}" berhasil diperbarui.`, 'success');
      } else {
        // Add Mode
        await BMNDevicesService.createSatker(payload);
        showNotification('Berhasil', `Satker "${name}" berhasil ditambahkan.`, 'success');
      }
      
      // Update global context division list
      try {
        await fetchDivisiList();
      } catch (e) {
        console.error('Failed to reload division list:', e);
      }
      
      setIsModalOpen(false);
      fetchSatkers();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (satker: Satker) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Satker "${satker.name}"?`)) {
      return;
    }

    try {
      await BMNDevicesService.deleteSatker(satker.id);
      showNotification('Berhasil', `Satker "${satker.name}" berhasil dihapus.`, 'success');
      
      // Update global context division list
      try {
        await fetchDivisiList();
      } catch (e) {
        console.error('Failed to reload division list:', e);
      }

      fetchSatkers();
    } catch (err: any) {
      console.error(err);
      showNotification('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus.', 'error');
    }
  };

  // Organize Satkers Hierarchically for display
  const structuredSatkers = useMemo(() => {
    const parents = satkers.filter(s => !s.parentId);
    const children = satkers.filter(s => s.parentId);

    return parents.map(parent => {
      const subUnits = children.filter(child => child.parentId === parent.id);
      return {
        ...parent,
        subUnits
      };
    });
  }, [satkers]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-gov-600 animate-spin-slow" size={22} />
            Pengaturan Master Data Satker
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Atur hubungan Induk-Anak (parent-child), nomor kode penyeragaman, dan lantai untuk setiap Satker.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium text-sm flex items-center gap-1.5 self-start sm:self-center shadow-sm"
        >
          <Plus size={16} />
          <span>Tambah Satker</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3 text-sm text-blue-800">
        <Info className="shrink-0 text-blue-600 mt-0.5" size={18} />
        <div>
          <p className="font-semibold mb-0.5">Aturan Penyeragaman Nama Laptop:</p>
          <p className="text-slate-600">
            Nama laptop otomatis dibentuk dengan format: <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono font-bold">[Kode Induk]-[Kode Anak]-[Lantai]-[NamaPegawai]</code>. 
            Contoh: <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono font-bold">01-01-01-Bagoes</code>.
          </p>
        </div>
      </div>

      {/* Satkers List Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-600"></div>
        </div>
      ) : structuredSatkers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <Folder className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-sm text-slate-500 font-medium">Belum ada data Satker.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Nama Satuan Kerja / Divisi</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Kode Nomor</th>
                <th className="px-6 py-4">Lantai</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structuredSatkers.map(parent => (
                <React.Fragment key={parent.id}>
                  {/* Parent Row */}
                  <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <Folder className="text-gov-600" size={16} />
                      {parent.name}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-blue-700">
                      <span className="bg-blue-100 px-2.5 py-1 rounded-full uppercase">Induk</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-sm text-slate-700">
                      {parent.code || '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                      {parent.floor || '-'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(parent)}
                        className="p-2 text-slate-600 hover:text-gov-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit Satker"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(parent)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus Satker"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>

                  {/* Children Rows */}
                  {parent.subUnits.map(child => (
                    <tr key={child.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 pl-12 text-slate-700 flex items-center gap-2 font-medium">
                        <ChevronRight className="text-slate-400" size={14} />
                        {child.name}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-indigo-700">
                        <span className="bg-indigo-100 px-2.5 py-1 rounded-full uppercase">Anak</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-sm text-slate-700">
                        {child.code || '-'}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600">
                        {child.floor || '-'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(child)}
                          className="p-2 text-slate-600 hover:text-gov-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit Satker"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(child)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Satker"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {editingSatker ? 'Edit Satuan Kerja' : 'Tambah Satuan Kerja'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nama Satuan Kerja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth: Biro Data dan Informasi"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Induk Satker (Parent)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm bg-white"
                  >
                    <option value="">-- Tanpa Induk (Merupakan Induk) --</option>
                    {parentOptions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    * Hanya Satker level teratas yang bisa dijadikan Induk.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Kode Nomor
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="cth: 01"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Lantai Default
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="cth: 01"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none text-sm font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BMNSatkerConfig;
