import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User } from '../../types';
import UserAvatar from './UserAvatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  users: User[];
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  dropdownPosition?: 'top' | 'bottom';
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSubmit,
  users,
  placeholder = 'Tulis komentar... Gunakan @ untuk mention',
  disabled = false,
  rows = 3,
  className = '',
  dropdownPosition = 'bottom'
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter users based on mention query
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  // Find mention trigger position
  const findMentionTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) return null;

    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
    // Check if there's a space after @ (means mention is complete)
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) return null;

    // Check if @ is at start or after whitespace
    if (lastAtIndex > 0 && !/\s/.test(text[lastAtIndex - 1])) return null;

    return {
      start: lastAtIndex,
      query: textAfterAt
    };
  }, []);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(newCursorPos);

    const mention = findMentionTrigger(newValue, newCursorPos);
    if (mention) {
      setMentionQuery(mention.query);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectUser(filteredUsers[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Select user from suggestions
  const selectUser = (user: User) => {
    const mention = findMentionTrigger(value, cursorPosition);
    if (!mention) return;

    const beforeMention = value.slice(0, mention.start);
    const afterCursor = value.slice(cursorPosition);
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mention.start + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-[60] max-h-48 overflow-y-auto ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'
            }`}
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${index === suggestionIndex ? 'bg-blue-50' : ''
                }`}
            >
              <UserAvatar
                name={user.name}
                profilePhoto={user.profilePhoto}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </div>
                {user.jabatan && (
                  <div className="text-xs text-gray-500 truncate">
                    {user.jabatan}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showSuggestions && mentionQuery && filteredUsers.length === 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-[60] px-3 py-2 ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'
            }`}
        >
          <p className="text-sm text-gray-500">
            Tidak ada user "{mentionQuery}"
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to parse mentions from text
export const parseMentions = (text: string, users: User[]): string[] => {
  const mentions: string[] = [];

  // Check each user if their name is mentioned with @
  for (const user of users) {
    const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionPattern = new RegExp(`@${escapedName}(?:\\s|$|[.,!?])`, 'i');

    if (mentionPattern.test(text) && !mentions.includes(user.name)) {
      mentions.push(user.name);
    }
  }

  return mentions;
};

// Helper function to render text with highlighted mentions
export const renderMentionText = (text: string, users: User[]): React.ReactNode => {
  // Sort users by name length (longest first) to match longer names first
  const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);

  let result: React.ReactNode[] = [];
  let remainingText = text;
  let keyIndex = 0;

  while (remainingText.length > 0) {
    let foundMatch = false;

    for (const user of sortedUsers) {
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionPattern = new RegExp(`@${escapedName}`, 'i');
      const match = remainingText.match(mentionPattern);

      if (match && match.index !== undefined) {
        // Add text before mention
        if (match.index > 0) {
          result.push(remainingText.slice(0, match.index));
        }

        // Add highlighted mention
        result.push(
          <span
            key={keyIndex++}
            className="text-blue-600 font-medium bg-blue-50 px-1 rounded cursor-pointer hover:bg-blue-100"
            title={user.jabatan || user.name}
          >
            @{user.name}
          </span>
        );

        remainingText = remainingText.slice(match.index + match[0].length);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      // No more mentions found, add remaining text
      result.push(remainingText);
      break;
    }
  }

  return result.length > 0 ? result : text;
};

// Helper function to render rich text with bold, italic, highlight, and mentions
export const renderRichText = (text: string, users: User[]): React.ReactNode => {
  if (!text) return null;

  // First, process markdown formatting
  // We'll split by formatting patterns and create styled spans

  let keyIndex = 0;
  const result: React.ReactNode[] = [];

  // Split text into lines first to preserve line breaks
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      result.push(<br key={`br-${keyIndex++}`} />);
    }

    // Process formatting patterns in order
    // Pattern: **bold**, *italic*, ==highlight==, @mention

    // Regex patterns for each format
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, style: 'font-bold', type: 'bold' },
      { regex: /(?<!\*)\*([^*]+)\*(?!\*)/g, style: 'italic', type: 'italic' },
      { regex: /==([^=]+)==/g, style: 'bg-yellow-200 px-0.5 rounded', type: 'highlight' },
    ];

    let processedLine = line;
    let segments: { text: string; style?: string; type: string; start: number; end: number }[] = [];

    // Find all matches for all patterns
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex);
      while ((match = regex.exec(line)) !== null) {
        segments.push({
          text: match[1],
          style: pattern.style,
          type: pattern.type,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Also find @mentions
    const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);
    for (const user of sortedUsers) {
      const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionRegex = new RegExp(`@${escapedName}`, 'gi');
      let match;
      while ((match = mentionRegex.exec(line)) !== null) {
        segments.push({
          text: user.name,
          style: 'mention',
          type: 'mention',
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Sort segments by start position
    segments.sort((a, b) => a.start - b.start);

    // Remove overlapping segments (keep first found)
    const filteredSegments: typeof segments = [];
    for (const seg of segments) {
      const overlaps = filteredSegments.some(
        existing => seg.start < existing.end && seg.end > existing.start
      );
      if (!overlaps) {
        filteredSegments.push(seg);
      }
    }

    // Build result from segments
    let lastEnd = 0;
    for (const seg of filteredSegments) {
      // Add plain text before this segment
      if (seg.start > lastEnd) {
        result.push(line.slice(lastEnd, seg.start));
      }

      // Add formatted segment
      if (seg.type === 'mention') {
        result.push(
          <span
            key={`mention-${keyIndex++}`}
            className="text-blue-600 font-medium bg-blue-50 px-1 rounded"
          >
            @{seg.text}
          </span>
        );
      } else {
        result.push(
          <span key={`format-${keyIndex++}`} className={seg.style}>
            {seg.text}
          </span>
        );
      }

      lastEnd = seg.end;
    }

    // Add remaining text after last segment
    if (lastEnd < line.length) {
      result.push(line.slice(lastEnd));
    }
  });

  return result.length > 0 ? <>{result}</> : text;
};

export default MentionInput;
