// src/components/RichTextEditor.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Highlighter, AtSign } from 'lucide-react';

interface User {
    name: string;
    id?: string;
}

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    users?: User[];
    className?: string;
    id?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Tulis sesuatu...',
    disabled = false,
    rows = 4,
    users = [],
    className = '',
    id
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Mention state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    // Filter users based on mention search
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowMentionDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset selected index when filtered users change
    useEffect(() => {
        setSelectedMentionIndex(0);
    }, [mentionSearch]);

    // Insert formatting at cursor position
    const insertFormatting = useCallback((prefix: string, suffix: string) => {
        if (disabled || !textareaRef.current) return;

        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);

        const newValue = beforeText + prefix + selectedText + suffix + afterText;
        onChange(newValue);

        // Set cursor position after formatting
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + selectedText.length;
            textarea.setSelectionRange(
                selectedText ? newCursorPos + suffix.length : start + prefix.length,
                selectedText ? newCursorPos + suffix.length : start + prefix.length
            );
        }, 0);
    }, [value, onChange, disabled]);

    // Handle text input for mention detection
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        onChange(newValue);

        // Detect @ symbol for mentions
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // Check if there's a space between @ and cursor (means mention is complete)
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            const hasSpaceAfterAt = textAfterAt.includes(' ');

            if (!hasSpaceAfterAt) {
                // We're in a mention context
                setMentionSearch(textAfterAt);
                setMentionStartPos(lastAtIndex);
                setShowMentionDropdown(true);
            } else {
                setShowMentionDropdown(false);
            }
        } else {
            setShowMentionDropdown(false);
        }
    };

    // Handle keyboard navigation in mention dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentionDropdown || filteredUsers.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedMentionIndex(prev =>
                prev < filteredUsers.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedMentionIndex(prev =>
                prev > 0 ? prev - 1 : filteredUsers.length - 1
            );
        } else if (e.key === 'Enter' && showMentionDropdown) {
            e.preventDefault();
            selectMention(filteredUsers[selectedMentionIndex]);
        } else if (e.key === 'Escape') {
            setShowMentionDropdown(false);
        }
    };

    // Select a user from mention dropdown
    const selectMention = (user: User) => {
        if (mentionStartPos === null || !textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;

        const beforeMention = value.substring(0, mentionStartPos);
        const afterCursor = value.substring(cursorPos);

        const mentionText = `@${user.name} `;
        const newValue = beforeMention + mentionText + afterCursor;

        onChange(newValue);
        setShowMentionDropdown(false);
        setMentionSearch('');
        setMentionStartPos(null);

        // Set cursor after mention
        setTimeout(() => {
            textarea.focus();
            const newPos = mentionStartPos + mentionText.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Toolbar button component
    const ToolbarButton: React.FC<{
        icon: React.ReactNode;
        title: string;
        onClick: () => void;
    }> = ({ icon, title, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="p-1.5 text-slate-500 hover:text-gov-600 hover:bg-gov-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {icon}
        </button>
    );

    return (
        <div className={`relative ${className}`} id={id}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 border-b-0 rounded-t-lg">
                <ToolbarButton
                    icon={<Bold size={14} />}
                    title="Tebal (Bold)"
                    onClick={() => insertFormatting('**', '**')}
                />
                <ToolbarButton
                    icon={<Italic size={14} />}
                    title="Miring (Italic)"
                    onClick={() => insertFormatting('*', '*')}
                />
                <ToolbarButton
                    icon={<Highlighter size={14} />}
                    title="Sorot (Highlight)"
                    onClick={() => insertFormatting('==', '==')}
                />
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <ToolbarButton
                    icon={<AtSign size={14} />}
                    title="Mention User (@)"
                    onClick={() => {
                        if (!textareaRef.current) return;
                        const textarea = textareaRef.current;
                        const cursorPos = textarea.selectionStart;
                        const newValue = value.substring(0, cursorPos) + '@' + value.substring(cursorPos);
                        onChange(newValue);
                        setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                            // Trigger mention dropdown
                            setMentionSearch('');
                            setMentionStartPos(cursorPos);
                            setShowMentionDropdown(true);
                        }, 0);
                    }}
                />

                {/* Formatting hints */}
                <div className="ml-auto text-[10px] text-slate-400 hidden sm:flex items-center gap-2">
                    <span><kbd className="px-1 py-0.5 bg-white rounded border border-slate-200 text-[9px]">**tebal**</kbd></span>
                    <span><kbd className="px-1 py-0.5 bg-white rounded border border-slate-200 text-[9px]">*miring*</kbd></span>
                    <span><kbd className="px-1 py-0.5 bg-white rounded border border-slate-200 text-[9px]">@mention</kbd></span>
                </div>
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className="w-full px-3 py-2 border border-slate-200 rounded-b-lg focus:ring-2 focus:ring-gov-300 focus:border-gov-400 outline-none text-sm resize-y min-h-[80px] disabled:bg-slate-50 disabled:text-slate-500"
            />

            {/* Mention Dropdown */}
            {showMentionDropdown && filteredUsers.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-64 max-h-48 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto"
                >
                    <div className="p-1.5 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs text-slate-500">Pilih user untuk mention</span>
                    </div>
                    {filteredUsers.map((user, index) => (
                        <button
                            key={user.id || user.name}
                            type="button"
                            onClick={() => selectMention(user)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gov-50 flex items-center gap-2 ${index === selectedMentionIndex ? 'bg-gov-50 text-gov-700' : 'text-slate-700'
                                }`}
                        >
                            <div className="w-6 h-6 rounded-full bg-gov-100 text-gov-600 flex items-center justify-center text-xs font-medium">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {showMentionDropdown && filteredUsers.length === 0 && mentionSearch && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3"
                >
                    <div className="text-xs text-slate-400 text-center">
                        Tidak ditemukan user "{mentionSearch}"
                    </div>
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
