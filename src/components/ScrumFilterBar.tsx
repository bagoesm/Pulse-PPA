import React from 'react';
import { Search } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { User as UserType } from '../../types';

interface ScrumFilterBarProps {
  searchVal: string;
  onSearchChange: (val: string) => void;
  categoryVal: string;
  onCategoryChange: (val: string) => void;
  priorityVal: string;
  onPriorityChange: (val: string) => void;
  picVal: string;
  onPicChange: (val: string) => void;
  uniqueCategories: string[];
  allUsers: UserType[];
  onReset: () => void;
  searchPlaceholder?: string;
}

const ScrumFilterBar: React.FC<ScrumFilterBarProps> = ({
  searchVal,
  onSearchChange,
  categoryVal,
  onCategoryChange,
  priorityVal,
  onPriorityChange,
  picVal,
  onPicChange,
  uniqueCategories,
  allUsers,
  onReset,
  searchPlaceholder = "Cari tugas..."
}) => {
  const showReset = searchVal !== '' || categoryVal !== 'All' || priorityVal !== 'All' || picVal !== 'All';

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchVal}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gov-400/20 focus:border-gov-400 transition-all font-medium text-slate-800 placeholder-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0">
        <SearchableSelect
          options={[
            { value: 'All', label: 'Semua Kategori' },
            ...uniqueCategories.map(cat => ({ value: cat, label: cat }))
          ]}
          value={categoryVal}
          onChange={onCategoryChange}
          className="w-full md:w-44"
          placeholder="Pilih Kategori"
        />

        <SearchableSelect
          options={[
            { value: 'All', label: 'Semua Prioritas' },
            { value: 'Low', label: 'Low' },
            { value: 'Medium', label: 'Medium' },
            { value: 'High', label: 'High' },
            { value: 'Urgent', label: 'Urgent' }
          ]}
          value={priorityVal}
          onChange={onPriorityChange}
          className="w-full md:w-44"
          placeholder="Pilih Prioritas"
        />

        <SearchableSelect
          options={[
            { value: 'All', label: 'Semua PIC' },
            ...allUsers.map(u => ({ value: u.name, label: u.name }))
          ]}
          value={picVal}
          onChange={onPicChange}
          className="w-full md:w-44"
          placeholder="Pilih PIC"
        />
      </div>

      {showReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-2 rounded-xl transition-all hover:bg-rose-50 cursor-pointer flex-shrink-0 border border-transparent hover:border-rose-100 flex items-center justify-center self-center"
        >
          Reset
        </button>
      )}
    </div>
  );
};

export default ScrumFilterBar;
