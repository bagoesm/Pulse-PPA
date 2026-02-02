// src/components/MasterDataModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  title: string;
  label: string;
  initialValue?: string;
  mode: 'add' | 'edit';
}

const MasterDataModal: React.FC<MasterDataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  initialValue = '',
  mode
}) => {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  const handleSubmit = async () => {
    if (value.trim()) {
      setIsSaving(true);
      try {
        await onSave(value.trim());
        setValue('');
        onClose();
      } catch (error) {
        // Error handled by parent
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-600 to-gov-700 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Masukkan ${label.toLowerCase()}...`}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-400 focus:border-gov-400 outline-none"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isSaving}
            className="flex-1 px-4 py-2.5 bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSaving ? 'Menyimpan...' : (mode === 'add' ? 'Tambah' : 'Simpan')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterDataModal;
