import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { Search, UserPlus, ChevronDown, CheckCircle2 } from 'lucide-react';
import PICDisplay from './PICDisplay';

interface CompactPICSelectorProps {
    users: User[];
    selected: string[];
    onChange: (selected: string[]) => void;
    disabled?: boolean;
}

const CompactPICSelector: React.FC<CompactPICSelectorProps> = ({ users, selected, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropUp, setDropUp] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Smart positioning: check if dropdown should open upwards
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If space below is less than dropdown height (~250px), open upwards
            if (spaceBelow < 250) {
                setDropUp(true);
            } else {
                setDropUp(false);
            }
        }
    }, [isOpen]);

    // Smart positioning: check if dropdown should open upwards
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // If space below is less than 200px AND there's more space above, open upwards
            if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                setDropUp(true);
            } else {
                setDropUp(false);
            }
        }
    }, [isOpen]);

    const toggleUser = (userName: string) => {
        if (selected.includes(userName)) {
            onChange(selected.filter(s => s !== userName));
        } else {
            onChange([...selected, userName]);
        }
    };

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 w-full px-3 py-2 border rounded-xl transition-all duration-200 bg-white text-left ${
                    isOpen 
                        ? 'border-blue-400 ring-2 ring-blue-50 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Pilih PIC"
            >
                {selected.length > 0 ? (
                    <div className="flex items-center gap-2 w-full overflow-hidden">
                        <PICDisplay pic={selected} users={users} maxVisible={2} size="sm" className="flex-shrink-0" />
                        <span className="text-xs text-slate-700 font-semibold truncate flex-1">
                            {selected.length === 1 ? selected[0] : `${selected.length} Orang dipilih`}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full text-slate-400">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                            <UserPlus size={10} />
                        </div>
                        <span className="text-xs truncate flex-1 font-medium">Tambah PIC...</span>
                    </div>
                )}
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div 
                    className={`absolute right-0 ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} z-[100] w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-300`}
                >
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari nama anggota..."
                                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                        {filteredUsers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1">
                                {filteredUsers.map(u => {
                                    const isSelected = selected.includes(u.name);
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => toggleUser(u.name)}
                                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                                                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="relative">
                                                <PICDisplay pic={u.name} users={users} maxVisible={1} size="sm" />
                                                {isSelected && (
                                                    <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <span className={`text-xs flex-1 truncate font-medium`}>
                                                {u.name}
                                            </span>
                                            {isSelected && (
                                                <CheckCircle2 size={14} className="text-blue-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 px-4 text-center">
                                <Search size={24} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400">Tidak ada anggota ditemukan</p>
                            </div>
                        )}
                    </div>
                    {selected.length > 0 && (
                        <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 px-1 font-medium">{selected.length} dipilih</span>
                            <button 
                                onClick={() => onChange([])}
                                className="text-[10px] text-red-500 hover:text-red-600 font-bold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompactPICSelector;
