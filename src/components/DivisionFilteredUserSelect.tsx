// DivisionFilteredUserSelect.tsx
// Dropdown user dengan filter divisi - default hanya tampilkan user dari divisi yang sama
import React, { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import SearchableSelectWithActions from './SearchableSelectWithActions';
import { User } from '../../types';

interface DivisionFilteredUserSelectProps {
  users: User[];
  currentUserDivisi?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyOption?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  multiple?: boolean; // For future multi-select support
}

const DivisionFilteredUserSelect: React.FC<DivisionFilteredUserSelectProps> = ({
  users,
  currentUserDivisi,
  value,
  onChange,
  placeholder = 'Cari user...',
  emptyOption = '-- Pilih User --',
  className = '',
  disabled = false,
  label,
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Filter users berdasarkan divisi
  const filteredUsers = useMemo(() => {
    if (showAllUsers || !currentUserDivisi) {
      return users;
    }
    return users.filter(user => user.divisi === currentUserDivisi);
  }, [users, currentUserDivisi, showAllUsers]);

  // Count users dari divisi lain
  const otherDivisionCount = useMemo(() => {
    if (!currentUserDivisi) return 0;
    return users.filter(user => user.divisi !== currentUserDivisi).length;
  }, [users, currentUserDivisi]);

  // Convert to options format
  const options = useMemo(() => {
    return filteredUsers.map(user => ({
      value: user.name,
      label: user.divisi 
        ? `${user.name} (${user.divisi})`
        : user.name
    }));
  }, [filteredUsers]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
      )}
      
      <SearchableSelectWithActions
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        emptyOption={emptyOption}
        className={className}
        disabled={disabled}
      />

      {/* Toggle untuk menampilkan semua user */}
      {currentUserDivisi && otherDivisionCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllUsers(!showAllUsers)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showAllUsers
                ? 'bg-gov-100 text-gov-700 hover:bg-gov-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {showAllUsers 
                ? `Menampilkan semua user (${users.length})`
                : `Hanya divisi saya (${filteredUsers.length})`
              }
            </span>
          </button>
          
          {!showAllUsers && (
            <span className="text-xs text-slate-500">
              +{otherDivisionCount} user dari divisi lain
            </span>
          )}
        </div>
      )}

      {/* Info jika tidak ada user di divisi */}
      {!showAllUsers && currentUserDivisi && filteredUsers.length === 0 && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          Tidak ada user di divisi Anda. Klik tombol di atas untuk melihat semua user.
        </div>
      )}
    </div>
  );
};

export default DivisionFilteredUserSelect;
