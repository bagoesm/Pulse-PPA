import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Send, 
  Paperclip, 
  Plus, 
  Search, 
  Users, 
  FileText, 
  X, 
  Image as ImageIcon, 
  Download, 
  CalendarRange, 
  MessageSquare, 
  PlusCircle, 
  Loader2, 
  Check,
  ChevronRight,
  Briefcase,
  ExternalLink,
  Trash2,
  LogOut,
  AlertCircle,
  Info,
  ArrowLeft,
  Eye,
  CornerUpLeft,
  CheckSquare,
  Smile
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { User, ProjectDefinition, Task, Meeting, ChatRoom, ChatMessage } from '../../types';
import UserAvatar from './UserAvatar';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys & People',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🫡', '🤥', '😶', '😶‍🌫️', '😐', '😑', '😬', '🫨', '🫵', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '✍️', '👏', '🙌', '👐', '🤲', '🙏', '🤝', '🎈', '🎉', '🔥', '✨', '💖', '❤️', '💔']
  },
  {
    name: 'Animals & Nature',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷️', '🐢', '🐍', '🦎', '🐙', '🦑', '🦞', '🦀', '🦐', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐆', '🐅', '🐘', '🦣', '🦍', '🦧', '🐪', '🦒', '🦘', '🦬', '🐑', '🐐', '🦌', '🐕', '🐈', '🐇', '🐾', '🌲', '🌳', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🐚', '🪨']
  },
  {
    name: 'Food & Drink',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍣', '🍱', '🥟', '🍤', '🍙', '🍘', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧉', '🥤', '🍺', '🍻', '🥂', '🍷', '🥃', '🍹']
  },
  {
    name: 'Activities & Travel',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🥍', '🏹', '🧗', '🧘', '🚶', '🚴', '🛹', '🛼', '🥊', '🥋', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🚲', '🛴', '🚂', '🚇', '✈️', '🚁', '🚀', '🛸', '⛵', '🚢', '⚓', '🏕️', '⛺', '🗼', '🗽', '🎡', '🎢', '🌋', '🗻', '🏝️', '🏜️', '🏟️']
  }
];

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gov-500/20 text-left transition-colors min-h-[38px]"
      >
        <span className="truncate whitespace-normal break-words leading-tight pr-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRight size={16} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 space-y-0.5 select-none">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">Tidak ada pilihan</div>
          ) : (
            options.map(opt => {
              const isActive = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 rounded-md text-xs cursor-pointer transition-colors leading-relaxed whitespace-normal break-words ${
                    isActive 
                      ? 'bg-gov-50 text-gov-700 font-bold' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isDanger = true
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scaleIn p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg text-xs font-medium transition-colors ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-gov-600 hover:bg-gov-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChatPageProps {
  currentUser: User;
  allUsers: User[];
  projects: ProjectDefinition[];
  tasks: Task[];
  meetings: Meeting[];
  onTaskClick: (task: Task) => void;
  onViewMeeting: (meeting: Meeting) => void;
  onViewProject?: (project: ProjectDefinition) => void;
  showNotification: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

interface TypingState {
  [userId: string]: {
    name: string;
    timestamp: number;
  };
}

const getLastSeenText = (user: User | null | undefined): string => {
  if (!user) return 'Offline';
  if (!user.last_seen) return 'Offline';

  try {
    const date = new Date(user.last_seen);
    const now = new Date();
    
    // Format hours and minutes
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Check if today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Terakhir dilihat ${timeStr}`;
    } else if (isYesterday) {
      return `Terakhir dilihat Kemarin ${timeStr}`;
    } else {
      // Format as dd/mm/yyyy
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `Terakhir dilihat ${day}/${month}/${year} ${timeStr}`;
    }
  } catch (e) {
    console.error('Error formatting last_seen time:', e);
    return 'Offline';
  }
};

// Web Audio API Synthesizer for premium UI sounds
const playSound = (type: 'send' | 'receive') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      // AudioContext starts suspended in some browsers due to autoplay restrictions.
      // Resume it if it is suspended.
      ctx.resume();
    }

    if (type === 'send') {
      // Ascending short clean blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      // Warm double-tone ding (C5 and then E5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06);
      gain2.gain.setValueAtTime(0.01, ctx.currentTime);
      gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.08);
      
      osc2.start(ctx.currentTime + 0.06);
      osc2.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn('Audio play blocked or unsupported:', e);
  }
};

export const parseRoomName = (room: ChatRoom | null | undefined) => {
  if (!room) return { name: '', admins: [] };
  let displayName = room.name || '';
  let admins: string[] = room.createdBy ? [room.createdBy] : [];

  if (room.name && room.name.startsWith('{"name":')) {
    try {
      const parsed = JSON.parse(room.name);
      displayName = parsed.name || '';
      if (Array.isArray(parsed.admins)) {
        admins = parsed.admins;
      }
    } catch {}
  }
  return { name: displayName, admins };
};

export const ChatPage: React.FC<ChatPageProps> = ({
  currentUser,
  allUsers,
  projects,
  tasks,
  meetings,
  onTaskClick,
  onViewMeeting,
  onViewProject,
  showNotification
}) => {
  // Navigation & UI States
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Modals & Panels
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isPersonalChatModalOpen, setIsPersonalChatModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [shareType, setShareType] = useState<'task' | 'meeting' | 'project'>('task');
  const [shareSearch, setShareSearch] = useState('');
  const [shareProjectFilter, setShareProjectFilter] = useState('All');
  
  // Search & Filter for starting chat/group members
  const [personalSearch, setPersonalSearch] = useState('');
  const [personalDivisiFilter, setPersonalDivisiFilter] = useState('All');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupDivisiFilter, setGroupDivisiFilter] = useState('All');
  
  // Form States for creating group
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [linkedProjectId, setLinkedProjectId] = useState<string>('');
  
  // Loading States
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Pending Files & Preview States
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageName, setPreviewImageName] = useState<string>('');
  const [pendingShareItem, setPendingShareItem] = useState<{ id: string; type: 'task' | 'meeting' | 'project'; title: string } | null>(null);

  // Reply / Quote Message State
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  // Emoji & GIF Picker states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'gif'>('emoji');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isGifsLoading, setIsGifsLoading] = useState(false);

  // Mentions Suggestion States
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  // Realtime Cache & References
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]); // User IDs online
  // Per-room message cache to show instantly on revisit
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({});
  // Group settings
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [isUploadingGroupPhoto, setIsUploadingGroupPhoto] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  // Local state for aesthetic toasts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // States for deleting messages
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_deleted_for_me') || '[]');
    } catch {
      return [];
    }
  });
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<ChatMessage | null>(null);
  const [isDeleteOptionsOpen, setIsDeleteOptionsOpen] = useState(false);

  // States for active room message searching
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

  // States for group read receipts detail modal
  const [groupReadReceipts, setGroupReadReceipts] = useState<{
    isOpen: boolean;
    readUsers: User[];
    deliveredUsers: User[];
    messageText: string;
  }>({
    isOpen: false,
    readUsers: [],
    deliveredUsers: [],
    messageText: ''
  });

  // States for sidebar Info panel tabs & media gallery
  const [settingsTab, setSettingsTab] = useState<'info' | 'media'>('info');
  const [mediaSubTab, setMediaSubTab] = useState<'media' | 'files' | 'links'>('media');

  const getCleanMessageText = useCallback((rawMsg: string | undefined | null) => {
    if (!rawMsg) return '';
    if (rawMsg.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawMsg);
        return parsed.text !== undefined ? parsed.text : rawMsg;
      } catch {}
    }
    return rawMsg;
  }, []);

  const isGifUrl = useCallback((text: string | undefined | null) => {
    if (!text) return false;
    return (
      (text.startsWith('http://') || text.startsWith('https://')) &&
      (text.includes('giphy.com') || text.includes('tenor.com') || text.endsWith('.gif'))
    );
  }, []);

  // Click outside listener to close Emoji/GIF picker
  useEffect(() => {
    if (!showPicker) return;
    
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showPicker]);

  // Fetch GIFs from Giphy
  useEffect(() => {
    if (!showPicker || pickerTab !== 'gif') return;

    const fetchGifs = async () => {
      const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
      if (!apiKey) {
        setGifs([]);
        setIsGifsLoading(false);
        return;
      }

      setIsGifsLoading(true);
      try {
        const limit = 15;
        const query = gifSearchQuery.trim();
        const url = query
          ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&limit=${limit}`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}`;

        const res = await fetch(url);
        const json = await res.json();
        if (json && json.data) {
          setGifs(json.data.map((item: any) => ({
            id: item.id,
            url: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url || item.images?.original?.url,
            title: item.title
          })));
        } else if (json && json.meta && json.meta.status === 403) {
          setGifs([]);
        }
      } catch (err) {
        console.error('Error fetching GIFs:', err);
      } finally {
        setIsGifsLoading(false);
      }
    };

    const timer = setTimeout(fetchGifs, gifSearchQuery.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [showPicker, pickerTab, gifSearchQuery]);

  const handleEmojiClick = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleGifClick = async (gifUrl: string) => {
    if (!activeRoomId || isSending) return;
    
    setIsSending(true);
    setShowPicker(false);
    
    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        sender_id: currentUser.id,
        message: gifUrl,
        type: 'text'
      });
      if (error) throw error;
      
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', activeRoomId);
    } catch (err: any) {
      console.error('Error sending GIF message:', err);
      addToast('Gagal mengirim GIF: ' + err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Autocomplete suggestion users
  const suggestedUsers = useMemo(() => {
    if (!showMentionSuggestions) return [];
    return groupMembers.filter(m => 
      m.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [groupMembers, showMentionSuggestions, mentionSearchQuery]);

  // Helper to clear pending file
  const handleClearPendingFile = useCallback(() => {
    setPendingFilePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Helper to select file for preview
  const handleSelectFileForPreview = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      addToast('Maksimal ukuran file adalah 10MB', 'error');
      return;
    }
    
    // Clear pending share item to avoid conflicts
    setPendingShareItem(null);

    setPendingFilePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    setPendingFile(file);
  }, [addToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleSelectFileForPreview(files[0]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      e.preventDefault();
      handleSelectFileForPreview(files[0]);
    }
  };

  const handleSelectMention = (user: User) => {
    if (mentionTriggerIndex === -1) return;
    
    const beforeMention = messageInput.slice(0, mentionTriggerIndex);
    const afterCursor = messageInput.slice(mentionTriggerIndex + mentionSearchQuery.length + 1);
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
    
    setMessageInput(newValue);
    setShowMentionSuggestions(false);
    setMentionTriggerIndex(-1);
    setMentionSearchQuery('');

    // Focus back to chat input field
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && suggestedUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestedUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestedUsers.length) % suggestedUsers.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectMention(suggestedUsers[activeSuggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const lastTypingTimeRef = useRef<number>(0);
  // Ref to always have latest activeRoomId inside async callbacks
  const activeRoomIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  // Keep ref in sync so async callbacks can see the latest value
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  // Local state for all system users (unfiltered to allow cross-division chats)
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

  // Refs for stable dependencies in hooks
  const systemUsersRef = useRef<User[]>([]);
  useEffect(() => {
    systemUsersRef.current = systemUsers;
  }, [systemUsers]);

  // Fetch all profiles on mount to allow cross-division chats
  useEffect(() => {
    const fetchAllSystemUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (data) {
          setSystemUsers(data.map((user: any) => ({
            ...user,
            profilePhoto: user.profile_photo || undefined,
            profilePhotoPath: user.profile_photo_path || undefined,
            divisi: user.divisi || undefined,
            nip: user.nip || undefined
          })) as User[]);
        }
      } catch (err) {
        console.error('Error fetching system users:', err);
      }
    };
    fetchAllSystemUsers();
  }, []);

  // Filter out current user for list selection
  const otherUsers = useMemo(() => {
    return systemUsers.filter(u => u.id !== currentUser.id);
  }, [systemUsers, currentUser.id]);

  // Get all unique divisions
  const divisions = useMemo(() => {
    const divs = new Set(systemUsers.map(u => u.divisi).filter(Boolean));
    return Array.from(divs) as string[];
  }, [systemUsers]);

  // Filtered users for starting personal chat
  const filteredPersonalUsers = useMemo(() => {
    return otherUsers.filter(user => {
      const name = user.name || '';
      const matchesSearch = name.toLowerCase().includes(personalSearch.toLowerCase()) || 
                            (user.email && user.email.toLowerCase().includes(personalSearch.toLowerCase())) ||
                            (user.nip && user.nip.includes(personalSearch));
      const matchesDivisi = personalDivisiFilter === 'All' || user.divisi === personalDivisiFilter;
      return matchesSearch && matchesDivisi;
    });
  }, [otherUsers, personalSearch, personalDivisiFilter]);

  // Filtered users for group chat creation
  const filteredGroupUsers = useMemo(() => {
    return otherUsers.filter(user => {
      const name = user.name || '';
      const matchesSearch = name.toLowerCase().includes(groupSearch.toLowerCase()) || 
                            (user.email && user.email.toLowerCase().includes(groupSearch.toLowerCase())) ||
                            (user.nip && user.nip.includes(groupSearch));
      const matchesDivisi = groupDivisiFilter === 'All' || user.divisi === groupDivisiFilter;
      return matchesSearch && matchesDivisi;
    });
  }, [otherUsers, groupSearch, groupDivisiFilter]);

  // Dropdown Options
  const divisiOptions = useMemo(() => {
    const opts = divisions.map(div => ({ value: div, label: div }));
    return [{ value: 'All', label: 'Semua Satker' }, ...opts];
  }, [divisions]);

  const projectOptions = useMemo(() => {
    const opts = projects.map(p => ({ value: p.id, label: p.name }));
    return [{ value: '', label: '-- Tidak Ada --' }, ...opts];
  }, [projects]);

  // Map users list into an object for fast lookups
  const userMap = useMemo(() => {
    return systemUsers.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, User>);
  }, [systemUsers]);

  const userMapRef = useRef<Record<string, User>>({});
  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  // Project map for fast lookups
  const projectMap = useMemo(() => {
    return projects.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, ProjectDefinition>);
  }, [projects]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch Chat Rooms
  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      // 1. Get all rooms where current user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', currentUser.id);

      if (membershipError) throw membershipError;

      const roomIds = memberships?.map(m => m.room_id) || [];

      if (roomIds.length === 0) {
        setRooms([]);
        setIsLoadingRooms(false);
        return;
      }

      // 2. Fetch details for these rooms
      const { data: chatRooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      // 3. Process rooms (populate project details and display names for 1-on-1s)
      const populatedRooms = await Promise.all(
        (chatRooms || []).map(async (room) => {
          let name = room.name;
          let projectName = room.project_id ? projectMap[room.project_id]?.name : undefined;

          let otherUserId: string | undefined = undefined;

          if (!room.is_group) {
            // Find the other member in the room
            const { data: otherMembers, error: membersError } = await supabase
              .from('chat_room_members')
              .select('user_id')
              .eq('room_id', room.id)
              .neq('user_id', currentUser.id)
              .limit(1);

            if (!membersError && otherMembers && otherMembers.length > 0) {
              otherUserId = otherMembers[0].user_id;
              const otherUser = userMap[otherUserId];
              name = otherUser ? otherUser.name : 'Unknown User';
            } else {
              name = 'Personal Chat';
            }
          }

          // Fetch last message for this room
          const { data: lastMsgs, error: lastMsgsError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          let lastMessage: string | undefined = undefined;
          let lastMessageTime: string | undefined = undefined;
          let lastMessageSenderId: string | undefined = undefined;
          let lastMessageIsRead = true;

          if (!lastMsgsError && lastMsgs && lastMsgs.length > 0) {
            const m = lastMsgs[0];
            lastMessageSenderId = m.sender_id;
            lastMessageIsRead = m.is_read;
            lastMessageTime = m.created_at;

            if (m.type === 'text') {
              let msgText = m.message;
              if (msgText && msgText.startsWith('{"isDeletedForEveryone":')) {
                lastMessage = 'Pesan telah dihapus';
              } else if (msgText && msgText.startsWith('{')) {
                try {
                  msgText = JSON.parse(msgText).text || msgText;
                } catch {}
                lastMessage = msgText;
              } else {
                lastMessage = msgText;
              }
            } else if (m.type === 'file') {
              let capText = '';
              if (m.message && m.message.startsWith('{"text":')) {
                try {
                  capText = JSON.parse(m.message).text || '';
                } catch {}
              }
              lastMessage = capText ? `📁 File: ${capText}` : `📁 File dilampirkan`;
            } else if (m.type === 'task') {
              let capText = '';
              try {
                const parsed = JSON.parse(m.message || '{}');
                capText = parsed.text || '';
              } catch {}
              lastMessage = capText ? `📋 Penugasan: ${capText}` : `📋 Penugasan dilampirkan`;
            } else if (m.type === 'meeting') {
              let capText = '';
              try {
                const parsed = JSON.parse(m.message || '{}');
                capText = parsed.text || '';
              } catch {}
              lastMessage = capText ? `📅 Jadwal: ${capText}` : `📅 Jadwal dilampirkan`;
            } else if (m.type === 'project') {
              let capText = '';
              try {
                const parsed = JSON.parse(m.message || '{}');
                capText = parsed.text || '';
              } catch {}
              lastMessage = capText ? `💼 Proyek: ${capText}` : `💼 Proyek dilampirkan`;
            }
          }

          // Fetch unread count and messages for current user
          const { data: unreadMsgs, count, error: countErr } = await supabase
            .from('chat_messages')
            .select('message, type', { count: 'exact' })
            .eq('room_id', room.id)
            .neq('sender_id', currentUser.id)
            .eq('is_read', false);

          const unreadCount = (!countErr && count) ? count : 0;
          
          let hasMention = false;
          if (!countErr && unreadMsgs) {
            hasMention = unreadMsgs.some(m => {
              if (m.type === 'text' && m.message) {
                let textToCheck = m.message;
                if (m.message.startsWith('{"text":')) {
                  try {
                    textToCheck = JSON.parse(m.message).text;
                  } catch {}
                }
                return textToCheck.includes(`@${currentUser.name}`);
              }
              return false;
            });
          }

          return {
            id: room.id,
            name,
            isGroup: room.is_group,
            projectId: room.project_id,
            createdBy: room.created_by,
            createdAt: room.created_at,
            updatedAt: room.updated_at,
            projectName,
            otherUserId,
            groupPhoto: room.group_photo_path ? `${supabase.storage.from('attachment').getPublicUrl(room.group_photo_path).data.publicUrl}?t=${new Date(room.updated_at).getTime()}` : null,
            lastMessage,
            lastMessageTime,
            lastMessageSenderId,
            lastMessageIsRead,
            unreadCount,
            hasMention
          } as ChatRoom;
        })
      );

      // Force unreadCount=0 for the currently active room (may have been read already)
      const finalRooms = populatedRooms.map(r =>
        r.id === activeRoomIdRef.current ? { ...r, unreadCount: 0 } : r
      );
      setRooms(finalRooms);
    } catch (error: any) {
      console.error('Error fetching chat rooms:', error);
      addToast('Gagal memuat ruang obrolan: ' + error.message, 'error');
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser.id, projectMap, userMap, addToast]);

  // Load rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Helper to extract read and delivered users lists for read receipts details
  const getReadAndDeliveredLists = useCallback((msg: ChatMessage) => {
    let readByIds: string[] = [];
    const raw = msg.message || '';
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.readBy)) {
          readByIds = parsed.readBy;
        }
      } catch {}
    }

    const readUsers = readByIds
      .map(id => systemUsersRef.current.find(u => u.id === id))
      .filter(Boolean) as User[];

    const deliveredUsers = groupMembers.filter(member => 
      member.id !== currentUser.id && 
      !readByIds.includes(member.id)
    );

    return { readUsers, deliveredUsers };
  }, [groupMembers, currentUser.id]);

  // Update read status payload for unread messages received from others
  const markMessagesAsRead = useCallback(async (roomId: string, msgs: ChatMessage[]) => {
    const unreadMsgs = msgs.filter(m => m.senderId !== currentUser.id);
    if (unreadMsgs.length === 0) return;

    for (const msg of unreadMsgs) {
      let readBy: string[] = [];
      let parsedPayload: any = {};
      let textVal = msg.message || '';

      if (textVal.startsWith('{')) {
        try {
          parsedPayload = JSON.parse(textVal);
          if (Array.isArray(parsedPayload.readBy)) {
            readBy = parsedPayload.readBy;
          }
        } catch {}
      } else {
        parsedPayload = { text: textVal };
      }

      if (!readBy.includes(currentUser.id)) {
        readBy.push(currentUser.id);
        parsedPayload.readBy = readBy;
        const updatedMsgText = JSON.stringify(parsedPayload);

        try {
          await supabase
            .from('chat_messages')
            .update({ 
              message: updatedMsgText,
              is_read: true 
            })
            .eq('id', msg.id);
        } catch (err) {
          console.error('Error updating read receipt:', err);
        }
      }
    }
  }, [currentUser.id]);

  // Fetch Messages for active room
  const fetchMessages = useCallback(async (roomId: string) => {
    // 1. Show cached messages instantly if available (no loading flicker)
    const cached = messagesCacheRef.current[roomId];
    if (cached && cached.length > 0) {
      setMessages(cached);
      setIsLoadingMessages(false);
      setTimeout(() => scrollToBottom('auto'), 50);
    } else {
      setIsLoadingMessages(true);
    }

    // 2. Fire-and-forget: mark unread messages as read in DB (don't await)
    supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', currentUser.id)
      .eq('is_read', false)
      .then(() => {
        // Update local rooms unread count after DB confirms
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } as any : r));
        // Sync global unread count
        window.dispatchEvent(new Event('unread-chats-updated'));
      });

    // 3. Reset unread count locally immediately (optimistic)
    setRooms(prev => {
      const activeRoom = prev.find(r => r.id === roomId);
      const unreadInRoom = activeRoom?.unreadCount || 0;
      if (unreadInRoom > 0) {
        window.dispatchEvent(new CustomEvent('unread-chats-read', { detail: { count: unreadInRoom } }));
      }
      return prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } as any : r);
    });

    try {
      // 4. Fetch messages from DB
      const { data: dbMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedMessages: ChatMessage[] = (dbMessages || []).map((msg) => {
        const sender = userMapRef.current[msg.sender_id];
        return {
          id: msg.id,
          roomId: msg.room_id,
          senderId: msg.sender_id,
          message: msg.message,
          type: msg.type as any,
          linkedTaskId: msg.linked_task_id,
          linkedMeetingId: msg.linked_meeting_id,
          linkedProjectId: msg.linked_project_id,
          attachmentPath: msg.attachment_path,
          attachmentName: msg.attachment_name,
          attachmentType: msg.attachment_type,
          isRead: msg.is_read,
          createdAt: msg.created_at,
          senderName: sender ? sender.name : 'Unknown',
          senderAvatar: sender?.profilePhoto || undefined
        };
      });

      // Save to cache & update state
      messagesCacheRef.current[roomId] = mappedMessages;
      setMessages(mappedMessages);
      setIsLoadingMessages(false);

      // Mark unread messages as read in DB and log read status metadata
      markMessagesAsRead(roomId, mappedMessages);

      // 5. Generate signed URLs in background (parallel, non-blocking)
      const fileMsgs = mappedMessages.filter(m => m.type === 'file' && m.attachmentPath);
      if (fileMsgs.length > 0) {
        // Fire and don't await - URLs will appear progressively
        Promise.all(
          fileMsgs.map(async (msg) => {
            if (msg.attachmentPath) {
              try {
                const { data } = await supabase.storage
                  .from('attachment')
                  .createSignedUrl(msg.attachmentPath, 60 * 60);
                if (data?.signedUrl) {
                  setSignedUrls(prev => ({ ...prev, [msg.id]: data.signedUrl }));
                }
              } catch {
                const { data } = supabase.storage
                  .from('attachment')
                  .getPublicUrl(msg.attachmentPath as string);
                if (data?.publicUrl) {
                  setSignedUrls(prev => ({ ...prev, [msg.id]: data.publicUrl }));
                }
              }
            }
          })
        );
      }

      setTimeout(() => scrollToBottom('auto'), 100);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      addToast('Gagal memuat pesan: ' + error.message, 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [addToast, scrollToBottom, currentUser.id]);

  // Fetch group members for the active room
  const fetchGroupMembers = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId);
      if (error) throw error;
      const memberIds = (data || []).map((d: any) => d.user_id);
      const members = memberIds.map((id: string) => systemUsersRef.current.find(u => u.id === id)).filter(Boolean) as User[];
      setGroupMembers(members);
    } catch (err: any) {
      console.error('Error fetching group members:', err);
    }
  }, []);

  // Handle active room change & subscribe to Realtime
  useEffect(() => {
    // Inline state updates to clear previews when switching rooms
    setPendingFile(null);
    setPendingFilePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingShareItem(null);
    setReplyToMessage(null);
    setShowMentionSuggestions(false);

    if (!activeRoomId) {
      setMessages([]);
      setGroupMembers([]);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    fetchMessages(activeRoomId);
    fetchGroupMembers(activeRoomId);

    // Setup channel for active room
    const channel = supabase.channel(`room:${activeRoomId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    // 1. Listen to changes on chat_messages table
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoomId}`
      },
      async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new;
          
          // Play notification sounds
          if (newMsg.sender_id === currentUser.id) {
            playSound('send');
          } else {
            playSound('receive');
          }

          const sender = userMapRef.current[newMsg.sender_id];
          const mappedMsg: ChatMessage = {
            id: newMsg.id,
            roomId: newMsg.room_id,
            senderId: newMsg.sender_id,
            message: newMsg.message,
            type: newMsg.type as any,
            linkedTaskId: newMsg.linked_task_id,
            linkedMeetingId: newMsg.linked_meeting_id,
            linkedProjectId: newMsg.linked_project_id,
            attachmentPath: newMsg.attachment_path,
            attachmentName: newMsg.attachment_name,
            attachmentType: newMsg.attachment_type,
            isRead: newMsg.is_read,
            createdAt: newMsg.created_at,
            senderName: sender ? sender.name : 'Unknown',
            senderAvatar: sender?.profilePhoto || undefined
          };

          // Get signed url if it's a file
          if (mappedMsg.type === 'file' && mappedMsg.attachmentPath) {
            try {
              const { data } = await supabase.storage
                .from('attachment')
                .createSignedUrl(mappedMsg.attachmentPath, 60 * 60);
              if (data?.signedUrl) {
                setSignedUrls(prev => ({ ...prev, [mappedMsg.id]: data.signedUrl }));
              }
            } catch {
              const { data } = supabase.storage
                .from('attachment')
                .getPublicUrl(mappedMsg.attachmentPath as string);
              if (data?.publicUrl) {
                setSignedUrls(prev => ({ ...prev, [mappedMsg.id]: data.publicUrl }));
              }
            }
          }

          // If the message is from someone else and this room is active, mark it as read in the database and log read receipt metadata
          if (newMsg.sender_id !== currentUser.id) {
            await markMessagesAsRead(activeRoomId, [mappedMsg]);
            mappedMsg.isRead = true;
            window.dispatchEvent(new Event('unread-chats-updated'));
          }

          setMessages(prev => {
            if (prev.some(m => m.id === mappedMsg.id)) return prev;
            const updated = [...prev, mappedMsg];
            // Keep cache in sync for instant revisit
            messagesCacheRef.current[activeRoomId] = updated;
            return updated;
          });
          
          // Update last message in the sidebar room list
          let displayMsg = '';
          if (mappedMsg.type === 'text') {
            displayMsg = mappedMsg.message || '';
            if (displayMsg.startsWith('{')) {
              try {
                displayMsg = JSON.parse(displayMsg).text || '';
              } catch {}
            }
          } else if (mappedMsg.type === 'file') {
            let capText = '';
            if (mappedMsg.message && mappedMsg.message.startsWith('{"text":')) {
              try {
                capText = JSON.parse(mappedMsg.message).text || '';
              } catch {}
            }
            displayMsg = capText ? `📁 File: ${capText}` : `📁 File dilampirkan`;
          } else if (mappedMsg.type === 'task') {
            let capText = '';
            try {
              const parsed = JSON.parse(mappedMsg.message || '{}');
              capText = parsed.text || '';
            } catch {}
            displayMsg = capText ? `📋 Penugasan: ${capText}` : `📋 Penugasan dilampirkan`;
          } else if (mappedMsg.type === 'meeting') {
            let capText = '';
            try {
              const parsed = JSON.parse(mappedMsg.message || '{}');
              capText = parsed.text || '';
            } catch {}
            displayMsg = capText ? `📅 Jadwal: ${capText}` : `📅 Jadwal dilampirkan`;
          } else if (mappedMsg.type === 'project') {
            let capText = '';
            try {
              const parsed = JSON.parse(mappedMsg.message || '{}');
              capText = parsed.text || '';
            } catch {}
            displayMsg = capText ? `💼 Proyek: ${capText}` : `💼 Proyek dilampirkan`;
          }

          setRooms(prevRooms => {
            const isUnread = mappedMsg.senderId !== currentUser.id;
            return prevRooms
              .map(r => {
                if (r.id !== activeRoomId) return r;
                return {
                  ...r,
                  lastMessage: displayMsg,
                  lastMessageTime: mappedMsg.createdAt,
                  lastMessageSenderId: mappedMsg.senderId,
                  lastMessageIsRead: mappedMsg.isRead,
                  unreadCount: isUnread ? 0 : r.unreadCount, // Active is immediately read
                  updatedAt: mappedMsg.createdAt
                } as ChatRoom;
              })
              .sort((a, b) => new Date(b.lastMessageTime || b.updatedAt).getTime() - new Date(a.lastMessageTime || a.updatedAt).getTime());
          });

          setTimeout(() => scrollToBottom('smooth'), 100);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? {
            ...m,
            message: updatedMsg.message,
            type: updatedMsg.type,
            attachmentPath: updatedMsg.attachment_path,
            attachmentName: updatedMsg.attachment_name,
            attachmentType: updatedMsg.attachment_type,
            linkedTaskId: updatedMsg.linked_task_id,
            linkedMeetingId: updatedMsg.linked_meeting_id,
            linkedProjectId: updatedMsg.linked_project_id,
            isRead: updatedMsg.is_read
          } : m));
          
          setRooms(prevRooms => {
            return prevRooms.map(r => {
              if (r.id === activeRoomId && r.lastMessageTime === updatedMsg.created_at) {
                return {
                  ...r,
                  lastMessageIsRead: updatedMsg.is_read
                };
              }
              return r;
            });
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      }
    );

    // 2. Listen to typing broadcast
    channel.on(
      'broadcast',
      { event: 'typing' },
      ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setTypingUsers(prev => ({
            ...prev,
            [payload.userId]: {
              name: payload.userName,
              timestamp: Date.now()
            }
          }));
        }
      }
    );

    // 3. Listen to Presence (tracking active users)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineUsers(ids);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => prev.includes(key) ? prev : [...prev, key]);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => prev.filter(id => id !== key));
      });

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track current user presence
        await channel.track({
          user_id: currentUser.id,
          name: currentUser.name,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeRoomId, currentUser.id, currentUser.name, scrollToBottom, fetchMessages, fetchGroupMembers]);

  // Listen to global chat messages and room updates to refresh in realtime
  useEffect(() => {
    const channel = supabase
      .channel('global-rooms-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_rooms' },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  // Clean up typing indicator timers
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const cleanTyping = { ...typingUsers };
      
      Object.keys(cleanTyping).forEach((userId) => {
        if (now - cleanTyping[userId].timestamp > 3000) {
          delete cleanTyping[userId];
          changed = true;
        }
      });
      
      if (changed) {
        setTypingUsers(cleanTyping);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [typingUsers]);

  // Handle typing event broadcast
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessageInput(val);
    
    if (!activeRoomId || !channelRef.current) return;
    
    const now = Date.now();
    if (now - lastTypingTimeRef.current > 1500) {
      lastTypingTimeRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, userName: currentUser.name }
      });
    }

    // Mention trigger checking
    const selectionStart = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const isStartOrSpace = lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]);
      const hasSpacesAfterAt = textAfterAt.includes(' ');
      
      if (isStartOrSpace && !hasSpacesAfterAt) {
        setShowMentionSuggestions(true);
        setMentionSearchQuery(textAfterAt);
        setMentionTriggerIndex(lastAtIndex);
        setActiveSuggestionIndex(0);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
  };

  // Send Message (Text)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (pendingFile) {
      await handleUploadPendingFile();
      return;
    }

    if (pendingShareItem) {
      await handleSharePendingItem();
      return;
    }

    if (!messageInput.trim() || !activeRoomId || isSending) return;

    setIsSending(true);
    const content = messageInput;
    setMessageInput('');

    try {
      let finalMessage = content;
      if (replyToMessage) {
        finalMessage = JSON.stringify({
          text: content,
          replyTo: {
            id: replyToMessage.id,
            senderName: replyToMessage.senderName,
            message: replyToMessage.type === 'file' ? `📁 ${replyToMessage.attachmentName}` : getCleanMessageText(replyToMessage.message)
          }
        });
        setReplyToMessage(null); // Clear reply state
      }

      const { error } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        sender_id: currentUser.id,
        message: finalMessage,
        type: 'text'
      });

      if (error) throw error;
      
      // Update room updated_at locally in dashboard db as well
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', activeRoomId);

    } catch (error: any) {
      console.error('Error sending message:', error);
      addToast('Gagal mengirim pesan: ' + error.message, 'error');
      setMessageInput(content); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  // Handle File Upload from Pending Preview
  const handleUploadPendingFile = async () => {
    if (!pendingFile || !activeRoomId || isUploading) return;

    const file = pendingFile;
    const caption = messageInput;
    
    setIsUploading(true);
    setUploadProgress(10); // Simulated start

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat_attachments/${activeRoomId}/${fileName}`;

      setUploadProgress(40);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachment')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      let finalMsg = file.name;
      if (caption.trim() || replyToMessage) {
        finalMsg = JSON.stringify({
          text: caption.trim(),
          replyTo: replyToMessage ? {
            id: replyToMessage.id,
            senderName: replyToMessage.senderName,
            message: replyToMessage.type === 'file' ? `📁 ${replyToMessage.attachmentName}` : getCleanMessageText(replyToMessage.message)
          } : null
        });
      }

      // Insert message reference
      const { error: msgError } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        sender_id: currentUser.id,
        message: finalMsg,
        type: 'file',
        attachment_path: filePath,
        attachment_name: file.name,
        attachment_type: file.type
      });

      if (msgError) throw msgError;

      // Update room updated_at
      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', activeRoomId);

      setUploadProgress(100);
      addToast('File berhasil diunggah', 'success');

      // Clear pending file and input/reply states after successful upload
      handleClearPendingFile();
      setMessageInput('');
      setReplyToMessage(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      addToast('Gagal mengunggah berkas: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Share Task, Meeting or Project from pending state
  const handleSharePendingItem = async () => {
    if (!pendingShareItem || !activeRoomId) return;

    const itemId = pendingShareItem.id;
    const type = pendingShareItem.type;
    const caption = messageInput;
    const reply = replyToMessage;

    setIsSending(true);

    try {
      const payload: any = {
        room_id: activeRoomId,
        sender_id: currentUser.id,
        type: type
      };

      if (type === 'task') {
        const task = tasks.find(t => t.id === itemId);
        const taskData: any = {
          title: task?.title || '',
          category: task?.category || '',
          priority: task?.priority || 'Medium',
        };
        if (caption.trim()) taskData.text = caption.trim();
        if (reply) {
          taskData.replyTo = {
            id: reply.id,
            senderName: reply.senderName,
            message: reply.type === 'file' ? `📁 ${reply.attachmentName}` : getCleanMessageText(reply.message)
          };
        }
        payload.message = JSON.stringify(taskData);
        payload.linked_task_id = itemId;
      } else if (type === 'meeting') {
        const meeting = meetings.find(m => m.id === itemId);
        const meetingData: any = {
          title: meeting?.title || '',
          date: meeting?.date || '',
          location: meeting?.location || '',
        };
        if (caption.trim()) meetingData.text = caption.trim();
        if (reply) {
          meetingData.replyTo = {
            id: reply.id,
            senderName: reply.senderName,
            message: reply.type === 'file' ? `📁 ${reply.attachmentName}` : getCleanMessageText(reply.message)
          };
        }
        payload.message = JSON.stringify(meetingData);
        payload.linked_meeting_id = itemId;
      } else {
        // type === 'project'
        const project = projects.find(p => p.id === itemId);
        const projectData: any = {
          name: project?.name || '',
          description: project?.description || '',
        };
        if (caption.trim()) projectData.text = caption.trim();
        if (reply) {
          projectData.replyTo = {
            id: reply.id,
            senderName: reply.senderName,
            message: reply.type === 'file' ? `📁 ${reply.attachmentName}` : getCleanMessageText(reply.message)
          };
        }
        payload.message = JSON.stringify(projectData);
        payload.linked_project_id = itemId;
      }

      const { error } = await supabase.from('chat_messages').insert(payload);
      if (error) throw error;

      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', activeRoomId);

      // Clear pending share item and input states
      setPendingShareItem(null);
      setMessageInput('');
      setReplyToMessage(null);
    } catch (error: any) {
      console.error('Error sharing item:', error);
      addToast('Gagal membagikan: ' + error.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Selecting Task, Meeting, or Project to share
  const handleSelectShareItem = (itemId: string) => {
    setIsShareModalOpen(false);

    // Clear pending file to avoid conflict
    handleClearPendingFile();

    if (shareType === 'task') {
      const task = tasks.find(t => t.id === itemId);
      setPendingShareItem({ id: itemId, type: 'task', title: task?.title || 'Penugasan' });
    } else if (shareType === 'meeting') {
      const meeting = meetings.find(m => m.id === itemId);
      setPendingShareItem({ id: itemId, type: 'meeting', title: meeting?.title || 'Jadwal' });
    } else {
      const project = projects.find(p => p.id === itemId);
      setPendingShareItem({ id: itemId, type: 'project', title: project?.name || 'Proyek' });
    }

    // Auto-focus on input field
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
  };

  // Helper to clear pending shared item preview
  const handleClearPendingShareItem = useCallback(() => {
    setPendingShareItem(null);
  }, []);

  // Helper to save "Delete for Me" locally
  const handleDeleteForMe = (messageId: string) => {
    setDeletedForMeIds(prev => {
      const next = [...prev, messageId];
      localStorage.setItem('chat_deleted_for_me', JSON.stringify(next));
      return next;
    });
    addToast('Pesan dihapus untuk Anda', 'success');
  };

  // Delete message for everyone in database
  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      // Find the message from state
      const msgToDelete = messages.find(m => m.id === messageId);
      
      // If it is a file message, delete the storage object
      if (msgToDelete?.type === 'file' && msgToDelete.attachmentPath) {
        const { error: storageError } = await supabase.storage
          .from('attachment')
          .remove([msgToDelete.attachmentPath]);
        if (storageError) {
          console.warn('Storage delete warning:', storageError);
        }
      }

      // Instead of deleting the row, we update it to a deleted state
      const { error } = await supabase
        .from('chat_messages')
        .update({
          message: JSON.stringify({ isDeletedForEveryone: true }),
          type: 'text',
          attachment_path: null,
          attachment_name: null,
          attachment_type: null,
          linked_task_id: null,
          linked_meeting_id: null,
          linked_project_id: null
        })
        .eq('id', messageId);

      if (error) throw error;

      // Update local message list state instantly
      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        message: JSON.stringify({ isDeletedForEveryone: true }),
        type: 'text',
        attachmentPath: null,
        attachmentName: null,
        attachmentType: null,
        linkedTaskId: null,
        linkedMeetingId: null,
        linkedProjectId: null
      } as ChatMessage : m));

      addToast('Pesan telah dihapus untuk semua orang', 'success');
    } catch (err: any) {
      console.error('Error deleting message for everyone:', err);
      addToast('Gagal menghapus pesan: ' + err.message, 'error');
    }
  };

  // Delete Individual Message (Opens Options Modal)
  const handleDeleteMessage = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      setDeleteTargetMessage(msg);
      setIsDeleteOptionsOpen(true);
    }
  };

  // Delete Room / Leave Group
  const handleDeleteRoom = () => {
    if (!activeRoomId || !activeRoom) return;

    const confirmTitle = activeRoom.isGroup ? 'Keluar Grup' : 'Hapus Obrolan';
    const confirmMsg = activeRoom.isGroup 
      ? 'Apakah Anda yakin ingin keluar dari grup chat ini?' 
      : 'Apakah Anda yakin ingin menghapus obrolan personal ini?';

    setConfirmConfig({
      isOpen: true,
      title: confirmTitle,
      message: confirmMsg,
      confirmText: activeRoom.isGroup ? 'Keluar' : 'Hapus',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          if (activeRoom.isGroup) {
            // Delete membership row
            const { error } = await supabase
              .from('chat_room_members')
              .delete()
              .eq('room_id', activeRoomId)
              .eq('user_id', currentUser.id);
            if (error) throw error;
          } else {
            // Delete room itself (cascades to members and messages)
            const { error } = await supabase
              .from('chat_rooms')
              .delete()
              .eq('id', activeRoomId);
            if (error) throw error;
          }

          addToast('Obrolan berhasil dihapus/ditinggalkan', 'success');
          setActiveRoomId(null);
          fetchRooms();
        } catch (error: any) {
          console.error('Error deleting room:', error);
          addToast('Gagal menghapus obrolan: ' + error.message, 'error');
        }
      }
    });
  };

  // === GROUP SETTINGS HANDLERS ===

  // Open group settings panel
  const openGroupSettings = () => {
    if (!activeRoom) return;
    setSettingsTab('info');
    setEditGroupName(groupDisplayName);
    if (activeRoom.isGroup) {
      fetchGroupMembers(activeRoom.id);
    }
    setIsGroupSettingsOpen(true);
  };

  // Update group name
  const handleUpdateGroupName = async () => {
    if (!activeRoomId || !activeRoom || !editGroupName.trim()) return;
    const { admins: currentAdmins } = parseRoomName(activeRoom);
    const payloadName = JSON.stringify({
      name: editGroupName.trim(),
      admins: currentAdmins
    });

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ name: payloadName, updated_at: new Date().toISOString() })
        .eq('id', activeRoomId);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, name: payloadName } : r));
      addToast('Nama grup berhasil diubah', 'success');
    } catch (err: any) {
      addToast('Gagal mengubah nama grup: ' + err.message, 'error');
    }
  };

  // Toggle admin status of a user
  const handleToggleAdminStatus = async (userId: string, currentAdminStatus: boolean) => {
    if (!activeRoom) return;

    const { name: currentName, admins: currentAdmins } = parseRoomName(activeRoom);
    let newAdmins = [...currentAdmins];

    if (currentAdminStatus) {
      // Remove admin status
      newAdmins = newAdmins.filter(id => id !== userId);
    } else {
      // Add admin status
      if (!newAdmins.includes(userId)) {
        newAdmins.push(userId);
      }
    }

    const payloadName = JSON.stringify({
      name: currentName,
      admins: newAdmins
    });

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({
          name: payloadName,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeRoom.id);

      if (error) throw error;

      addToast(currentAdminStatus ? 'Admin berhasil dicabut' : 'Admin berhasil ditambahkan', 'success');
      
      setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, name: payloadName } : r));
    } catch (err: any) {
      console.error('Error toggling admin status:', err);
      addToast('Gagal mengubah status admin: ' + err.message, 'error');
    }
  };

  // Upload group photo
  const handleUploadGroupPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeRoomId || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) { addToast('Hanya file gambar yang diizinkan', 'error'); return; }
    setIsUploadingGroupPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `group_photos/${activeRoomId}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('attachment').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase
        .from('chat_rooms')
        .update({ group_photo_path: path, updated_at: new Date().toISOString() })
        .eq('id', activeRoomId);
      if (updateErr) throw updateErr;
      const { data: { publicUrl } } = supabase.storage.from('attachment').getPublicUrl(path);
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, groupPhoto: publicUrl + '?t=' + Date.now() } : r));
      addToast('Foto grup berhasil diubah', 'success');
    } catch (err: any) {
      addToast('Gagal upload foto grup: ' + err.message, 'error');
    } finally {
      setIsUploadingGroupPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove a member from group (admin only)
  const handleRemoveMember = (userId: string, userName: string) => {
    if (!activeRoomId) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Hapus Anggota',
      message: `Hapus ${userName} dari grup ini?`,
      confirmText: 'Hapus',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase
            .from('chat_room_members')
            .delete()
            .eq('room_id', activeRoomId)
            .eq('user_id', userId);
          if (error) throw error;
          setGroupMembers(prev => prev.filter(m => m.id !== userId));
          addToast(`${userName} berhasil dihapus dari grup`, 'success');
        } catch (err: any) {
          addToast('Gagal menghapus anggota: ' + err.message, 'error');
        }
      }
    });
  };

  // Add a member to group (admin only)
  const handleAddMember = async (user: User) => {
    if (!activeRoomId) return;
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .insert({ room_id: activeRoomId, user_id: user.id });
      if (error) throw error;
      setGroupMembers(prev => [...prev, user]);
      setAddMemberSearch('');
      addToast(`${user.name} berhasil ditambahkan ke grup`, 'success');
    } catch (err: any) {
      addToast('Gagal menambahkan anggota: ' + err.message, 'error');
    }
  };

  // Start 1-on-1 Personal Chat
  const handleStartPersonalChat = async (otherUserId: string) => {
    setIsPersonalChatModalOpen(false);
    
    try {
      // 1. Check if a 1-on-1 room already exists between current user and this user
      const { data: myMemberships, error: myErr } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', currentUser.id);

      if (myErr) throw myErr;

      const myRoomIds = myMemberships?.map(m => m.room_id) || [];

      if (myRoomIds.length > 0) {
        const { data: commonMemberships, error: commonErr } = await supabase
          .from('chat_room_members')
          .select('room_id, chat_rooms(is_group)')
          .in('room_id', myRoomIds)
          .eq('user_id', otherUserId);

        if (commonErr) throw commonErr;

        const existingRoom = commonMemberships?.find(
          (m: any) => m.chat_rooms && !m.chat_rooms.is_group
        );

        if (existingRoom) {
          setActiveRoomId(existingRoom.room_id);
          return;
        }
      }

      // 2. If no room exists, create a new one
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({
          is_group: false,
          name: null,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // 3. Add members
      const { error: membersErr } = await supabase
        .from('chat_room_members')
        .insert([
          { room_id: newRoom.id, user_id: currentUser.id },
          { room_id: newRoom.id, user_id: otherUserId }
        ]);

      if (membersErr) throw membersErr;

      // 4. Reload rooms and select the new one
      await fetchRooms();
      setActiveRoomId(newRoom.id);
    } catch (error: any) {
      console.error('Error starting personal chat:', error);
      addToast('Gagal memulai obrolan personal: ' + error.message, 'error');
    }
  };

  // Render message text body, parsing and highlighting @mentions & search terms
  const renderParsedMessageText = (text: string, isMeBubble: boolean) => {
    if (!text) return null;

    // Retrieve all system users sorted by name length descending
    const sortedUsers = [...systemUsers].filter(u => u.name).sort((a, b) => b.name.length - a.name.length);

    // Build regex to match mentions
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const mentionPatterns = sortedUsers.map(u => `@${escapeRegExp(u.name)}`);
    
    // Combine patterns with capture parentheses
    let combinedPatterns = [...mentionPatterns];
    
    // Add search highlight pattern if active
    const cleanSearch = messageSearchQuery.trim();
    if (cleanSearch) {
      combinedPatterns.push(escapeRegExp(cleanSearch));
    }

    if (combinedPatterns.length === 0) {
      return text;
    }

    const regex = new RegExp(`(${combinedPatterns.join('|')})`, 'gi'); // Case-insensitive matching

    // Split text by regex
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      const lowerPart = part.toLowerCase();

      // Check if it's a mention
      if (part.startsWith('@')) {
        const nameWithoutAt = part.substring(1);
        const matchedUser = sortedUsers.find(u => u.name.toLowerCase() === nameWithoutAt.toLowerCase());
        if (matchedUser) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleStartPersonalChat(matchedUser.id)}
              className={`font-semibold transition-all hover:underline inline border-none bg-transparent p-0 m-0 cursor-pointer ${
                isMeBubble 
                  ? 'text-sky-200 hover:text-white' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {part}
            </button>
          );
        }
      }

      // Check if it matches search query
      if (cleanSearch && lowerPart === cleanSearch.toLowerCase()) {
        return (
          <mark key={idx} className="bg-yellow-200 text-slate-800 rounded px-0.5 py-px select-none font-semibold shadow-sm">
            {part}
          </mark>
        );
      }

      return part;
    });
  };

  // Create Group Chat
  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length < 2) {
      addToast('Isi nama grup dan pilih minimal 1 anggota lainnya', 'info');
      return;
    }

    setIsGroupModalOpen(false);

    try {
      const initialName = JSON.stringify({
        name: groupName.trim(),
        admins: [currentUser.id]
      });

      // 1. Create group room
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({
          name: initialName,
          is_group: true,
          project_id: linkedProjectId ? linkedProjectId : null,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // 2. Prepare member rows
      const memberRows = selectedMembers.map(userId => ({
        room_id: newRoom.id,
        user_id: userId
      }));

      // Make sure current user is in the member list
      if (!selectedMembers.includes(currentUser.id)) {
        memberRows.push({
          room_id: newRoom.id,
          user_id: currentUser.id
        });
      }

      // 3. Insert members
      const { error: membersErr } = await supabase
        .from('chat_room_members')
        .insert(memberRows);

      if (membersErr) throw membersErr;

      // Reset form states
      setGroupName('');
      setSelectedMembers([currentUser.id]);
      setLinkedProjectId('');

      addToast('Grup chat berhasil dibuat', 'success');

      // 4. Reload and active
      await fetchRooms();
      setActiveRoomId(newRoom.id);
    } catch (error: any) {
      console.error('Error creating group chat:', error);
      addToast('Gagal membuat grup chat: ' + error.message, 'error');
    }
  };

  // Find active room info
  const activeRoom = useMemo(() => {
    return rooms.find(r => r.id === activeRoomId) || null;
  }, [rooms, activeRoomId]);

  const { name: groupDisplayName, admins: groupAdmins } = useMemo(() => {
    return parseRoomName(activeRoom);
  }, [activeRoom]);

  const isCurrentUserAdmin = useMemo(() => {
    return activeRoom ? groupAdmins.includes(currentUser.id) : false;
  }, [activeRoom, groupAdmins, currentUser.id]);

  // Filtered Rooms list based on search query
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => 
      parseRoomName(r).name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  // Search items to share
  const filteredShareItems = useMemo(() => {
    if (shareType === 'task') {
      return tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(shareSearch.toLowerCase()) || 
                              t.category.toLowerCase().includes(shareSearch.toLowerCase());
        const matchesProject = shareProjectFilter === 'All' || t.projectId === shareProjectFilter;
        return matchesSearch && matchesProject;
      });
    } else if (shareType === 'meeting') {
      return meetings.filter(m => 
        m.title.toLowerCase().includes(shareSearch.toLowerCase()) ||
        m.location.toLowerCase().includes(shareSearch.toLowerCase())
      );
    } else {
      // shareType === 'project'
      return projects.filter(p => 
        p.name.toLowerCase().includes(shareSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(shareSearch.toLowerCase()))
      );
    }
  }, [tasks, meetings, projects, shareType, shareSearch, shareProjectFilter]);

  // Group messages by Date & Search filter
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: ChatMessage[] } = {};
    
    const filtered = messages.filter(msg => {
      if (!messageSearchQuery.trim()) return true;

      // Extract text content of the message
      let text = '';
      if (msg.message) {
        if (msg.message.startsWith('{')) {
          try {
            const parsed = JSON.parse(msg.message);
            text = parsed.text || parsed.title || parsed.name || '';
          } catch {}
        } else {
          text = msg.message;
        }
      }
      return text.toLowerCase().includes(messageSearchQuery.toLowerCase());
    });

    filtered.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(msg);
    });
    return groups;
  }, [messages, messageSearchQuery]);

  // Shared Media, Files, and Links selectors for Side Panel Gallery
  const sharedMedia = useMemo(() => {
    return messages.filter(m => m.type === 'file' && m.attachmentPath && m.attachmentType?.startsWith('image/'));
  }, [messages]);

  const sharedFiles = useMemo(() => {
    return messages.filter(m => m.type === 'file' && m.attachmentPath && !m.attachmentType?.startsWith('image/'));
  }, [messages]);

  const sharedLinks = useMemo(() => {
    const list: { id: string; url: string; title: string; senderName?: string }[] = [];
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    messages.forEach(m => {
      let text = '';
      if (m.type === 'text' && m.message) {
        text = m.message;
        if (m.message.startsWith('{"text":')) {
          try { text = JSON.parse(m.message).text || ''; } catch {}
        }
      } else {
        if (m.message && m.message.startsWith('{')) {
          try { text = JSON.parse(m.message).text || ''; } catch {}
        }
      }

      if (text) {
        const matches = text.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            list.push({
              id: m.id + '-' + url,
              url: url.startsWith('www.') ? `https://${url}` : url,
              title: url,
              senderName: m.senderName
            });
          });
        }
      }
    });
    return list;
  }, [messages]);

  return (
    <div className="flex-1 flex bg-slate-50 h-full overflow-hidden" style={{ minHeight: '500px' }}>
      
      {/* LEFT COLUMN: Sidebar Chat */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-white flex flex-col h-full select-none shrink-0 ${activeRoomId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Search & Actions Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={20} className="text-gov-600" />
              Diskusi & Chat
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => setIsPersonalChatModalOpen(true)}
                title="Mulai Chat Baru"
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors min-h-0"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => setIsGroupModalOpen(true)}
                title="Buat Group Chat"
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors min-h-0"
              >
                <Users size={18} />
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari obrolan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
              <Loader2 className="animate-spin text-gov-600" size={24} />
              <span className="text-xs">Memuat obrolan...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Tidak ada obrolan ditemukan
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const formattedTime = new Date(room.updatedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    // Immediately reset badge on click (before DB update completes)
                    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unreadCount: 0, hasMention: false } as any : r));
                    setActiveRoomId(room.id);
                  }}
                  className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors relative ${
                    isActive ? 'bg-slate-100/70 border-l-4 border-gov-600 pl-2' : ''
                  }`}
                >
                  {/* Avatar / Icon */}
                  <div className="shrink-0">
                    {room.isGroup ? (
                      room.groupPhoto ? (
                        <img 
                          src={room.groupPhoto} 
                          alt={parseRoomName(room).name || 'Grup'} 
                          className="w-10 h-10 rounded-full object-cover border border-gov-100" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gov-50 text-gov-700 flex items-center justify-center font-bold text-sm border border-gov-100">
                          <Users size={18} className="text-gov-600" />
                        </div>
                      )
                    ) : (
                      <UserAvatar
                        name={parseRoomName(room).name || 'P'}
                        profilePhoto={room.otherUserId ? userMap[room.otherUserId]?.profilePhoto : undefined}
                        size="md"
                      />
                    )}
                  </div>

                  {/* Room Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800 truncate block">
                        {parseRoomName(room).name}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formattedTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5 select-none">
                      {/* Last Message Preview */}
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        {/* Checkmarks if last message is from me */}
                        {room.lastMessageSenderId === currentUser.id && (
                          <span className={`text-[10px] select-none shrink-0 leading-none ${
                            room.lastMessageIsRead ? 'text-blue-500' : 'text-slate-400'
                          }`} title={room.lastMessageIsRead ? 'Dibaca' : 'Terkirim'}>
                            ✓
                          </span>
                        )}
                        <p className={`text-xs truncate leading-relaxed ${
                          room.unreadCount && room.unreadCount > 0
                            ? 'text-slate-900 font-bold'
                            : 'text-slate-400'
                        }`}>
                          {room.lastMessage || 'Belum ada pesan'}
                        </p>
                      </div>

                      {/* Unread badge or Project tag */}
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {room.hasMention && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-[9px] text-white flex items-center justify-center font-bold animate-pulse" title="Anda di-mention">
                            @
                          </span>
                        )}
                        {room.unreadCount && room.unreadCount > 0 ? (
                          <span className="min-w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center font-bold px-1 leading-none">
                            {room.unreadCount}
                          </span>
                        ) : room.projectName ? (
                          <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-100 rounded px-1 flex items-center gap-0.5 max-w-[85px] truncate font-medium leading-none py-0.5">
                            <Briefcase size={8} className="shrink-0" />
                            {room.projectName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 ${activeRoomId ? 'flex' : 'hidden md:flex'}`}>
        {activeRoomId && activeRoom ? (
          <>
            {/* Active Room Header */}
            <div className="h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between select-none shrink-0 pt-3 md:pt-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Back Button for mobile */}
                <button
                  type="button"
                  onClick={() => setActiveRoomId(null)}
                  className="md:hidden w-9 h-9 flex items-center justify-center min-h-0 hover:bg-slate-100 rounded-full text-slate-600 transition-colors shrink-0"
                  title="Kembali ke Daftar Obrolan"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="shrink-0">
                  {activeRoom.isGroup ? (
                    activeRoom.groupPhoto ? (
                      <img src={activeRoom.groupPhoto} alt={groupDisplayName || 'Grup'} className="w-9 h-9 rounded-full object-cover border border-gov-100" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gov-50 text-gov-700 flex items-center justify-center font-bold text-xs border border-gov-100">
                        <Users size={16} className="text-gov-600" />
                      </div>
                    )
                  ) : (
                    <UserAvatar
                      name={groupDisplayName || 'P'}
                      profilePhoto={activeRoom.otherUserId ? userMap[activeRoom.otherUserId]?.profilePhoto : undefined}
                      size="sm"
                    />
                  )}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <h3 className="font-bold text-slate-800 text-sm truncate leading-tight">{groupDisplayName}</h3>
                  <div className="flex items-center gap-1.5 leading-none mt-0.5">
                    {activeRoom.isGroup ? (
                      <span className="text-[10px] text-slate-500 font-medium">Group Chat</span>
                    ) : (() => {
                      const otherUser = activeRoom.otherUserId ? userMap[activeRoom.otherUserId] : null;
                      const isOnline = otherUser 
                        ? (onlineUsers.includes(otherUser.id) || (otherUser.last_seen && (Date.now() - new Date(otherUser.last_seen).getTime() < 120000)))
                        : false;
                      return (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                          <span className="text-[10px] text-slate-400 truncate">
                            {isOnline ? 'Online' : getLastSeenText(otherUser)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Header Actions (Badges + Delete Obrolan) */}
              <div className="flex items-center gap-1 sm:gap-3">
                {activeRoom.projectName && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 rounded-full text-xs font-semibold max-w-[200px] truncate">
                    <Briefcase size={14} className="text-slate-500" />
                    <span className="truncate">{activeRoom.projectName}</span>
                  </div>
                )}

                {/* Message Search Button */}
                <button
                  onClick={() => {
                    setIsSearchPanelOpen(prev => !prev);
                    setMessageSearchQuery('');
                  }}
                  title="Cari Pesan"
                  className={`p-1.5 rounded-lg transition-all min-h-0 ${
                    isSearchPanelOpen ? 'bg-slate-100 text-gov-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Search size={18} />
                </button>

                {/* Info Detail Button - for both personal and group rooms */}
                <button
                  onClick={openGroupSettings}
                  title={activeRoom.isGroup ? "Pengaturan Grup" : "Detail Obrolan"}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all min-h-0"
                >
                  <Info size={18} />
                </button>
                
                <button
                  onClick={handleDeleteRoom}
                  title={activeRoom.isGroup ? "Keluar Grup" : "Hapus Obrolan"}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all min-h-0"
                >
                  {activeRoom.isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>

            {/* Dropdown Message Search Input Area */}
            {isSearchPanelOpen && (
              <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 animate-slideIn select-none shrink-0">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={messageSearchQuery}
                    onChange={e => setMessageSearchQuery(e.target.value)}
                    placeholder="Cari kata kunci dalam percakapan ini..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchPanelOpen(false);
                    setMessageSearchQuery('');
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Messages Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-gov-600" size={32} />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <MessageSquare size={32} className="stroke-1" />
                  <span className="text-sm">Belum ada obrolan. Mulai percakapan sekarang!</span>
                </div>
              ) : (
                Object.keys(groupedMessages).map((dateStr) => (
                  <div key={dateStr} className="space-y-4">
                    {/* Date Separator */}
                    <div className="flex justify-center">
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium shadow-sm">
                        {dateStr}
                      </span>
                    </div>

                    {/* Messages in Date Group */}
                    {groupedMessages[dateStr]
                      .filter(m => !deletedForMeIds.includes(m.id))
                      .map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        let isDeleted = false;
                        if (msg.message && msg.message.startsWith('{"isDeletedForEveryone":')) {
                          try {
                            isDeleted = JSON.parse(msg.message).isDeletedForEveryone;
                          } catch {}
                        }

                        return (
                        <div
                          key={msg.id}
                          id={`msg-${msg.id}`}
                          className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          {/* Sender Initials / Photo */}
                          {!isMe && (
                            <div className="shrink-0 mt-1 select-none">
                              <UserAvatar
                                name={msg.senderName || 'U'}
                                profilePhoto={msg.senderAvatar}
                                size="sm"
                              />
                            </div>
                          )}

                          {/* Message Bubble wrapper */}
                          <div className={`space-y-1 relative group/msg flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 max-w-[90%]`}>
                            <div className="flex-1 min-w-0">
                              {!isMe && (
                                <span className="text-[10px] text-slate-500 font-semibold pl-1 select-none block mb-0.5">
                                  {msg.senderName}
                                </span>
                              )}
                              
                              <div className={`p-3 rounded-2xl shadow-sm text-sm break-words ${
                                isMe 
                                  ? 'bg-gov-600 text-white rounded-tr-none' 
                                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                              }`}>
                                {(() => {
                                  if (isDeleted) {
                                    return (
                                      <p className="text-slate-400 italic flex items-center gap-1.5 select-none py-0.5">
                                        <AlertCircle size={14} className="stroke-[1.5]" />
                                        Pesan telah dihapus
                                      </p>
                                    );
                                  }

                                  const parsedMsg = (() => {
                                    let text = '';
                                    let isReply = false;
                                    let replyQuote: any = null;
                                    const rawMsg = msg.message || '';

                                    if (msg.type === 'text') {
                                      text = rawMsg;
                                      if (rawMsg.startsWith('{')) {
                                        try {
                                          const parsed = JSON.parse(rawMsg);
                                          text = parsed.text !== undefined ? parsed.text : rawMsg;
                                          if (parsed.replyTo) {
                                            isReply = true;
                                            replyQuote = parsed.replyTo;
                                          }
                                        } catch {}
                                      }
                                    } else if (msg.type === 'file') {
                                      if (rawMsg && rawMsg !== msg.attachmentName) {
                                        if (rawMsg.startsWith('{')) {
                                          try {
                                            const parsed = JSON.parse(rawMsg);
                                            text = parsed.text || '';
                                            replyQuote = parsed.replyTo || null;
                                            isReply = !!replyQuote;
                                          } catch {
                                            text = rawMsg;
                                          }
                                        } else {
                                          text = rawMsg;
                                        }
                                      } else if (rawMsg && rawMsg.startsWith('{')) {
                                        try {
                                          const parsed = JSON.parse(rawMsg);
                                          text = parsed.text || '';
                                          replyQuote = parsed.replyTo || null;
                                          isReply = !!replyQuote;
                                        } catch {}
                                      }
                                    } else {
                                      // task, meeting, project
                                      try {
                                        const parsed = JSON.parse(rawMsg);
                                        text = parsed.text || '';
                                        replyQuote = parsed.replyTo || null;
                                        isReply = !!replyQuote;
                                      } catch {}
                                    }

                                    return { text, isReply, replyQuote };
                                  })();

                                  return (
                                    <>
                                      {/* 1. Render Reply Quote if present */}
                                      {parsedMsg.isReply && parsedMsg.replyQuote && (
                                        <div 
                                          className={`p-2 border-l-2 rounded text-xs select-none max-w-sm mb-2 cursor-pointer transition-colors ${
                                            isMe 
                                              ? 'bg-gov-700/60 border-gov-300 text-slate-100 hover:bg-gov-700' 
                                              : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'
                                          }`}
                                          onClick={() => {
                                            const element = document.getElementById(`msg-${parsedMsg.replyQuote.id}`);
                                            if (element) {
                                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              element.classList.add('bg-amber-100/50', 'rounded-xl', 'transition-all', 'duration-500');
                                              setTimeout(() => {
                                                element.classList.remove('bg-amber-100/50');
                                              }, 1500);
                                            }
                                          }}
                                        >
                                          <p className="font-bold text-[9px] opacity-90">{parsedMsg.replyQuote.senderName}</p>
                                          <p className="truncate opacity-80">{getCleanMessageText(parsedMsg.replyQuote.message)}</p>
                                        </div>
                                      )}

                                      {/* 2. Render Main Content based on msg.type */}
                                      {msg.type === 'text' && !isGifUrl(parsedMsg.text) && (
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{renderParsedMessageText(parsedMsg.text, isMe)}</p>
                                      )}

                                      {msg.type === 'text' && isGifUrl(parsedMsg.text) && (
                                        <div className="rounded-lg overflow-hidden border border-slate-100 max-w-[240px] max-h-60 bg-slate-50 mt-1 select-none">
                                          <img 
                                            src={parsedMsg.text} 
                                            alt="GIF" 
                                            className="w-full h-auto object-cover max-h-60"
                                            loading="lazy"
                                          />
                                        </div>
                                      )}

                                      {msg.type === 'file' && msg.attachmentPath && (
                                        <div className="space-y-2">
                                          {msg.attachmentType?.startsWith('image/') ? (
                                            <div className="rounded-lg overflow-hidden border border-slate-100 max-w-sm max-h-60 bg-slate-50">
                                              {signedUrls[msg.id] ? (
                                                <div 
                                                  onClick={() => {
                                                    setPreviewImageUrl(signedUrls[msg.id]);
                                                    setPreviewImageName(msg.attachmentName || 'Pratinjau Gambar');
                                                  }}
                                                  className="cursor-zoom-in"
                                                >
                                                  <img 
                                                    src={signedUrls[msg.id]} 
                                                    alt={msg.attachmentName || 'Image'} 
                                                    className="w-full h-full object-contain hover:opacity-90 transition-opacity"
                                                  />
                                                </div>
                                              ) : (
                                                <div className="p-8 flex justify-center">
                                                  <Loader2 className="animate-spin text-slate-400" />
                                                </div>
                                              )}
                                            </div>
                                          ) : (() => {
                                            const isPdf = msg.attachmentName?.toLowerCase().endsWith('.pdf') || msg.attachmentType === 'application/pdf';
                                            return (
                                              <div className="flex items-center gap-3 p-2 bg-slate-100/10 border border-white/20 rounded-lg text-xs max-w-sm">
                                                <FileText size={28} className={isMe ? 'text-white' : 'text-slate-500'} />
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-semibold truncate">{msg.attachmentName}</p>
                                                  <p className="text-[10px] opacity-75">Dokumen berkas</p>
                                                </div>
                                                {signedUrls[msg.id] && (
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    {isPdf && (
                                                      <button 
                                                        type="button"
                                                        onClick={() => {
                                                          setPreviewPdfUrl(signedUrls[msg.id]);
                                                          setPreviewPdfName(msg.attachmentName || 'PDF Preview');
                                                        }}
                                                        className={`p-1.5 rounded-full transition-colors ${
                                                          isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-600'
                                                        }`}
                                                        title="Preview PDF"
                                                      >
                                                        <Eye size={16} />
                                                      </button>
                                                    )}
                                                    <a 
                                                      href={signedUrls[msg.id]} 
                                                      download={msg.attachmentName}
                                                      className={`p-1.5 rounded-full transition-colors ${
                                                        isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-600'
                                                      }`}
                                                    >
                                                      <Download size={16} />
                                                    </a>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}

                                      {msg.type === 'task' && msg.linkedTaskId && (() => {
                                        let parsed: any = {};
                                        try { parsed = JSON.parse(msg.message || '{}'); } catch {}
                                        const localTask = tasks.find(t => t.id === msg.linkedTaskId);
                                        const title = localTask?.title || parsed.title || 'Task tidak ditemukan / dihapus';
                                        const category = localTask?.category || parsed.category || '-';
                                        const priority = localTask?.priority || parsed.priority || 'Medium';
                                        return (
                                          <div className={`p-3 rounded-xl border max-w-md ${
                                            isMe ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-50 border-slate-200'
                                          }`}>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                              <div className="flex items-center gap-1.5 text-xs text-gov-700 font-bold select-none">
                                                <FileText size={14} />
                                                Penugasan Dibagikan
                                              </div>
                                              {msg.linkedTaskId && (
                                                <button 
                                                  onClick={() => {
                                                    if (localTask) {
                                                      onTaskClick(localTask);
                                                    } else {
                                                      showNotification(
                                                        'Akses Ditolak / Tidak Ditemukan',
                                                        'Penugasan ini tidak ditemukan di daftar Anda, atau Anda tidak memiliki akses untuk melihatnya.',
                                                        'info'
                                                      );
                                                    }
                                                  }}
                                                  className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-gov-600 transition-colors"
                                                  title="Buka Penugasan"
                                                >
                                                  <ExternalLink size={14} />
                                                </button>
                                              )}
                                            </div>
                                            <h4 className="font-bold text-sm line-clamp-2 leading-snug mb-1">{title}</h4>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">{category}</span>
                                              <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded font-semibold">{priority}</span>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {msg.type === 'meeting' && msg.linkedMeetingId && (() => {
                                        let parsed: any = {};
                                        try { parsed = JSON.parse(msg.message || '{}'); } catch {}
                                        const localMeeting = meetings.find(m => m.id === msg.linkedMeetingId);
                                        const title = localMeeting?.title || parsed.title || 'Jadwal tidak ditemukan / dihapus';
                                        const date = localMeeting?.date || parsed.date || '-';
                                        const location = localMeeting?.location || parsed.location || '-';
                                        return (
                                          <div className={`p-3 rounded-xl border max-w-md ${
                                            isMe ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-50 border-slate-200'
                                          }`}>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                              <div className="flex items-center gap-1.5 text-xs text-sky-700 font-bold select-none">
                                                <CalendarRange size={14} />
                                                Jadwal Kegiatan Dibagikan
                                              </div>
                                              {msg.linkedMeetingId && (
                                                <button 
                                                  onClick={() => {
                                                    if (localMeeting) {
                                                      onViewMeeting(localMeeting);
                                                    } else {
                                                      showNotification(
                                                        'Akses Ditolak / Tidak Ditemukan',
                                                        'Jadwal kegiatan ini tidak ditemukan di daftar Anda, atau Anda tidak memiliki akses untuk melihatnya.',
                                                        'info'
                                                      );
                                                    }
                                                  }}
                                                  className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
                                                  title="Buka Jadwal"
                                                >
                                                  <ExternalLink size={14} />
                                                </button>
                                              )}
                                            </div>
                                            <h4 className="font-bold text-sm line-clamp-2 leading-snug mb-1">{title}</h4>
                                            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                              <p>📅 {date}</p>
                                              <p>📍 {location}</p>
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {msg.type === 'project' && msg.linkedProjectId && (() => {
                                        let parsed: any = {};
                                        try { parsed = JSON.parse(msg.message || '{}'); } catch {}
                                        const localProject = projects.find(p => p.id === msg.linkedProjectId);
                                        const name = localProject?.name || parsed.name || 'Proyek tidak ditemukan / dihapus';
                                        const description = localProject?.description || parsed.description || 'Tidak ada deskripsi';
                                        return (
                                          <div className={`p-3 rounded-xl border max-w-md ${
                                            isMe ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-50 border-slate-200'
                                          }`}>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold select-none">
                                                <Briefcase size={14} />
                                                Proyek Dibagikan
                                              </div>
                                              {msg.linkedProjectId && (
                                                <button 
                                                  onClick={() => {
                                                    if (localProject && onViewProject) {
                                                      onViewProject(localProject);
                                                    } else {
                                                      showNotification(
                                                        'Akses Ditolak / Tidak Ditemukan',
                                                        'Proyek ini tidak ditemukan di daftar Anda, atau Anda tidak memiliki akses untuk melihatnya.',
                                                        'info'
                                                      );
                                                    }
                                                  }}
                                                  className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors"
                                                  title="Buka Proyek"
                                                >
                                                  <ExternalLink size={14} />
                                                </button>
                                              )}
                                            </div>
                                            <h4 className="font-bold text-sm line-clamp-2 leading-snug mb-1">{name}</h4>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
                                          </div>
                                        );
                                      })()}

                                      {/* 3. Render Caption Text if present (only for non-text messages) */}
                                      {msg.type !== 'text' && parsedMsg.text && (
                                        <p className="mt-2 leading-relaxed whitespace-pre-wrap break-words">{renderParsedMessageText(parsedMsg.text, isMe)}</p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Timestamp & Read Status */}
                              <div className="flex items-center justify-end gap-1 mt-1 select-none">
                                <span className={`text-[9px] leading-none ${
                                  isMe ? 'text-white/70' : 'text-slate-400'
                                }`}>
                                  {timeStr}
                                </span>
                                {isMe && (
                                  <span 
                                    className={`text-[10px] font-bold leading-none select-none ${
                                      msg.isRead ? 'text-sky-200' : 'text-white/50'
                                    }`}
                                    title={msg.isRead ? 'Dibaca' : 'Terkirim'}
                                  >
                                    {msg.isRead ? '✓✓' : '✓'}
                                  </span>
                                )}
                                {isMe && activeRoom?.isGroup && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const { readUsers, deliveredUsers } = getReadAndDeliveredLists(msg);
                                      let textVal = msg.message || '';
                                      if (textVal.startsWith('{')) {
                                        try {
                                          const parsed = JSON.parse(textVal);
                                          textVal = parsed.text || 'Pesan Lampiran';
                                        } catch {}
                                      }
                                      setGroupReadReceipts({
                                        isOpen: true,
                                        readUsers,
                                        deliveredUsers,
                                        messageText: textVal
                                      });
                                    }}
                                    className="p-0.5 hover:bg-white/20 rounded text-sky-200 hover:text-white transition-colors flex items-center justify-center shrink-0 min-h-0 cursor-pointer ml-0.5"
                                    title="Detail Info Pembaca"
                                  >
                                    <Info size={10} className="stroke-[2.5]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Hover Action Buttons */}
                          {!isDeleted && (
                            <div className="opacity-40 group-hover/msg:opacity-100 flex items-center gap-0.5 shrink-0 select-none self-end mb-4 transition-opacity duration-200">
                              <button
                                type="button"
                                onClick={() => setReplyToMessage(msg)}
                                title="Balas pesan"
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-gov-600 rounded-full transition-all"
                              >
                                <CornerUpLeft size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Hapus pesan"
                                className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-full transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Typing indicators */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
                  <Loader2 className="animate-spin text-slate-300" size={14} />
                  <span>
                    {Object.values(typingUsers).map(u => u.name).join(', ')} sedang mengetik...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 relative">
              {/* Mentions Autocomplete Suggestion */}
              {showMentionSuggestions && suggestedUsers.length > 0 && (
                <div className="absolute bottom-full left-4 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto w-64 mb-2 p-1 divide-y divide-slate-50">
                  {suggestedUsers.map((user, idx) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectMention(user)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        idx === activeSuggestionIndex ? 'bg-gov-50 text-gov-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserAvatar name={user.name} profilePhoto={user.profilePhoto} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-700">{user.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Reply Quote Preview */}
              {replyToMessage && (
                <div className="mb-3 p-3 bg-slate-50 border-l-4 border-gov-500 border-y border-r border-slate-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-gov-600">Membalas {replyToMessage.senderName}</p>
                    <p className="text-xs text-slate-500 truncate leading-relaxed">
                      {replyToMessage.type === 'file' ? `📁 File: ${replyToMessage.attachmentName}` : replyToMessage.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Pending File Preview Drawer */}
              {pendingFile && (
                <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    {pendingFilePreview ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                        <img src={pendingFilePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-300 shrink-0">
                        <FileText size={24} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{pendingFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB • Siap kirim</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPendingFile}
                    className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Pending Share Item Preview Drawer */}
              {pendingShareItem && (
                <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-gov-50 flex items-center justify-center border border-gov-100 shrink-0">
                      {pendingShareItem.type === 'task' ? <CheckSquare size={24} className="text-gov-500" /> :
                       pendingShareItem.type === 'meeting' ? <CalendarRange size={24} className="text-sky-500" /> :
                       <Briefcase size={24} className="text-emerald-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{pendingShareItem.title}</p>
                      <p className="text-[10px] text-slate-400 capitalize">Shared {pendingShareItem.type} • Siap kirim</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPendingShareItem}
                    className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* File attachment triggers */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Lampirkan File"
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0 disabled:opacity-50 min-h-0"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Paperclip size={18} />
                  )}
                </button>

                {/* Task/Event sharing trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShareType('task');
                    setIsShareModalOpen(true);
                  }}
                  title="Bagi Penugasan / Kegiatan"
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0 min-h-0"
                >
                  <Plus size={18} />
                </button>

                {/* Emoji & GIF Trigger */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPicker(!showPicker)}
                    title="Pilih Emoji & GIF"
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 min-h-0 ${
                      showPicker ? 'bg-gov-100 text-gov-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Smile size={18} />
                  </button>

                  {/* Popover Picker */}
                  {showPicker && (
                    <div className="absolute bottom-12 left-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 w-80 h-96 flex flex-col">
                      {/* Tabs Header */}
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 mb-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPickerTab('emoji')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            pickerTab === 'emoji' ? 'bg-white text-gov-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          😊 Emoji
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerTab('gif')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            pickerTab === 'gif' ? 'bg-white text-gov-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🎬 GIF
                        </button>
                      </div>

                      {/* Content Panel */}
                      {pickerTab === 'emoji' ? (
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
                          {EMOJI_CATEGORIES.map((cat, idx) => (
                            <div key={idx}>
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1 text-left">
                                {cat.name}
                              </h5>
                              <div className="grid grid-cols-8 gap-1.5">
                                {cat.emojis.map((emoji, eIdx) => (
                                  <button
                                    key={eIdx}
                                    type="button"
                                    onClick={() => handleEmojiClick(emoji)}
                                    className="w-8 h-8 text-xl flex items-center justify-center hover:bg-slate-100 rounded-lg transition-all hover:scale-110 active:scale-95"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                          {!import.meta.env.VITE_GIPHY_API_KEY ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-slate-500 gap-3 select-none animate-fade-in">
                              <span className="text-3xl">🔑</span>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-700">Kunci API GIPHY Belum Diatur</p>
                                <p className="text-[10px] text-slate-400 leading-relaxed max-w-[220px]">
                                  GIPHY melarang penggunaan kunci publik lama. Silakan tambahkan <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px] text-pink-600 font-mono font-semibold">VITE_GIPHY_API_KEY</code> pada file <code className="bg-slate-100 px-1 py-0.5 rounded text-[9px] text-pink-600 font-mono font-semibold">.env</code> Anda.
                                </p>
                              </div>
                              <a
                                href="https://developers.giphy.com/dashboard/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-gov-600 hover:text-gov-700 hover:underline flex items-center gap-1 mt-1"
                              >
                                Dapatkan Kunci API Gratis <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <>
                              {/* Search Input */}
                              <div className="relative mb-2 shrink-0">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input
                                  type="text"
                                  placeholder="Cari GIF di Giphy..."
                                  value={gifSearchQuery}
                                  onChange={(e) => setGifSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gov-500 focus:border-gov-500 bg-slate-50 text-slate-700"
                                />
                              </div>

                              {/* GIF Grid list */}
                              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 scrollbar-thin">
                                {isGifsLoading ? (
                                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 gap-1.5">
                                    <Loader2 className="animate-spin text-gov-600" size={18} />
                                    <span className="text-[10px] font-medium">Memuat GIF...</span>
                                  </div>
                                ) : gifs.length === 0 ? (
                                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-slate-400 gap-1.5 text-center">
                                    <span className="text-lg">⚠️</span>
                                    <span className="text-[10px] font-medium max-w-[200px] text-slate-400 leading-normal">
                                      Tidak ada GIF atau Kunci API GIPHY Anda tidak valid/diblokir.
                                    </span>
                                  </div>
                                ) : (
                                  gifs.map((gif) => (
                                    <button
                                      key={gif.id}
                                      type="button"
                                      onClick={() => handleGifClick(gif.url)}
                                      className="aspect-video rounded-lg overflow-hidden border border-slate-100 hover:border-gov-400 transition-all hover:scale-[1.02] focus:outline-none relative group bg-slate-50"
                                    >
                                      <img
                                        src={gif.url}
                                        alt={gif.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </button>
                                  ))
                                )}
                              </div>

                              {/* Giphy Attribution Watermark */}
                              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 py-1 border-t border-slate-100 mt-2 shrink-0 select-none bg-slate-50 rounded-b-xl">
                                <span className="font-medium">Powered by</span>
                                <span className="font-extrabold tracking-widest text-slate-800 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent uppercase text-[10px]">GIPHY</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Ketik pesan..."
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  onPaste={handlePaste}
                  onKeyDown={handleInputKeyDown}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500"
                />

                <button
                  type="submit"
                  disabled={(!messageInput.trim() && !pendingFile && !pendingShareItem) || isSending || isUploading}
                  className="w-10 h-10 flex items-center justify-center bg-gov-600 hover:bg-gov-700 rounded-full text-white transition-colors shrink-0 disabled:opacity-50 disabled:hover:bg-gov-600 min-h-0"
                >
                  <Send size={18} />
                </button>
              </form>
              
              {/* Upload Progress Bar */}
              {isUploading && uploadProgress !== null && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-gov-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6 select-none">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
              <MessageSquare size={32} className="stroke-1" />
            </div>
            <h3 className="font-bold text-slate-700 text-base">Mulai Diskusi & Kolaborasi</h3>
            <p className="text-xs max-w-sm text-center text-slate-400 leading-relaxed">
              Pilih salah satu obrolan di sebelah kiri, atau buat grup baru untuk berkoordinasi langsung dengan tim proyek Anda.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: Buat Group Chat
          ======================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Buat Group Chat Baru</h3>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupChat} className="p-6 space-y-4">
              {/* Group Name input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Nama Group Chat</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Tim Sosialisasi PPA"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500"
                />
              </div>

              {/* Connect to Project select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Hubungkan ke Project (Opsional)</label>
                <CustomSelect
                  value={linkedProjectId}
                  onChange={setLinkedProjectId}
                  options={projectOptions}
                  placeholder="-- Pilih Project --"
                  className="w-full"
                />
              </div>

              {/* Members checkboxes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Pilih Anggota</label>
                
                {/* Search & Filter Bar */}
                <div className="flex gap-2 mb-2 select-none">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Cari user..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20"
                    />
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>
                  <CustomSelect
                    value={groupDivisiFilter}
                    onChange={setGroupDivisiFilter}
                    options={divisiOptions}
                    className="w-[150px]"
                  />
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto p-1.5 space-y-1">
                  {filteredGroupUsers.map(user => {
                    const isChecked = selectedMembers.includes(user.id);
                    return (
                      <div 
                        key={user.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedMembers(prev => prev.filter(id => id !== user.id));
                          } else {
                            setSelectedMembers(prev => [...prev, user.id]);
                          }
                        }}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            name={user.name}
                            profilePhoto={user.profilePhoto}
                            size="xs"
                          />
                          <span className="font-medium text-slate-700 truncate">{user.name}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-gov-600 border-gov-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Buat Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Mulai Chat Personal Baru
          ======================================================== */}
      {isPersonalChatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
              <h3 className="font-bold text-slate-800 text-base">Pilih Teman Diskusi</h3>
              <button 
                onClick={() => setIsPersonalChatModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex gap-2 select-none">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Cari user..."
                    value={personalSearch}
                    onChange={(e) => setPersonalSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20"
                  />
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
                <CustomSelect
                  value={personalDivisiFilter}
                  onChange={setPersonalDivisiFilter}
                  options={divisiOptions}
                  className="w-[150px]"
                />
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {filteredPersonalUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => handleStartPersonalChat(user.id)}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={user.name}
                        profilePhoto={user.profilePhoto}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-slate-700">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.divisi || 'Satuan Kerja'}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Pilih Item untuk Dibagikan (Task / Meeting / Project)
          ======================================================== */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
              <h3 className="font-bold text-slate-800 text-base">Bagikan ke Obrolan</h3>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Switch tabs: Task vs Meeting vs Project */}
              <div className="flex border-b border-slate-100 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShareType('task');
                    setShareSearch('');
                    setShareProjectFilter('All');
                  }}
                  className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'task' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tugas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareType('meeting');
                    setShareSearch('');
                  }}
                  className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'meeting' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Kegiatan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareType('project');
                    setShareSearch('');
                  }}
                  className={`flex-1 py-2 text-center text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'project' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Proyek
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    shareType === 'task' 
                      ? "Cari task..." 
                      : shareType === 'meeting' 
                        ? "Cari kegiatan..." 
                        : "Cari proyek..."
                  }
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20"
                />
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>

              {/* Project Filter for Tasks */}
              {shareType === 'task' && (
                <div className="space-y-1.5 select-none">
                  <label className="text-xs font-semibold text-slate-500 block">Filter Berdasarkan Proyek</label>
                  <CustomSelect
                    value={shareProjectFilter}
                    onChange={setShareProjectFilter}
                    options={[
                      { value: 'All', label: 'Semua Proyek' },
                      ...projects.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    className="w-full"
                  />
                </div>
              )}

              {/* Items List */}
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {filteredShareItems.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs p-8">Item tidak ditemukan</p>
                ) : (
                  filteredShareItems.map(item => {
                    const isTask = shareType === 'task';
                    const isMeeting = shareType === 'meeting';
                    const isProject = shareType === 'project';
                    
                    let title = '';
                    let badgeLabel = '';
                    let priority = '';
                    let description = '';

                    if (isTask) {
                      const t = item as Task;
                      title = t.title;
                      badgeLabel = t.category;
                      priority = t.priority;
                    } else if (isMeeting) {
                      const m = item as Meeting;
                      title = m.title;
                      badgeLabel = m.date;
                    } else if (isProject) {
                      const p = item as ProjectDefinition;
                      title = p.name;
                      badgeLabel = 'Proyek';
                      description = p.description || '';
                    }

                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleSelectShareItem(item.id)}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-sm"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-semibold text-slate-700 truncate">{title}</p>
                          {description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-medium">
                              {badgeLabel}
                            </span>
                            {isTask && (
                              <span className="text-[9px] bg-red-50 text-red-700 px-1 py-0.5 rounded font-medium">
                                {priority}
                              </span>
                            )}
                          </div>
                        </div>
                        <PlusCircle size={18} className="text-gov-600 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ========================================================
          MODAL: Opsi Hapus Pesan (Delete Options)
          ======================================================== */}
      {isDeleteOptionsOpen && deleteTargetMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Hapus Pesan?</h3>
              <button 
                onClick={() => {
                  setIsDeleteOptionsOpen(false);
                  setDeleteTargetMessage(null);
                }}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih opsi penghapusan untuk pesan ini.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleDeleteForMe(deleteTargetMessage.id);
                    setIsDeleteOptionsOpen(false);
                    setDeleteTargetMessage(null);
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Hapus untuk Saya
                </button>
                
                {/* Only the sender of the message can delete for everyone */}
                {deleteTargetMessage.senderId === currentUser.id && (
                  <button
                    onClick={async () => {
                      await handleDeleteForEveryone(deleteTargetMessage.id);
                      setIsDeleteOptionsOpen(false);
                      setDeleteTargetMessage(null);
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Hapus untuk Semua Orang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Detail Dibaca Grup (Group Read Receipts)
          ======================================================== */}
      {groupReadReceipts.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-800 text-sm">Info Pesan</h3>
              <button 
                onClick={() => setGroupReadReceipts(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-20 overflow-hidden shrink-0">
                <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">
                  "{groupReadReceipts.messageText}"
                </p>
              </div>

              <div className="space-y-4 pr-1">
                {/* 1. Dibaca oleh */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                    <span>✓✓ Dibaca oleh ({groupReadReceipts.readUsers.length})</span>
                  </h4>
                  <div className="space-y-1.5 divide-y divide-slate-100/50 pl-1">
                    {groupReadReceipts.readUsers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-1 italic">Belum ada yang membaca</p>
                    ) : (
                      groupReadReceipts.readUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-2.5 py-1.5">
                          <UserAvatar
                            name={user.name}
                            profilePhoto={user.profilePhoto}
                            size="xs"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{user.name}</p>
                            <p className="text-[9px] text-slate-400">{user.divisi || 'Anggota Tim'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Tersampaikan ke */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                    <span>✓ Tersampaikan ke ({groupReadReceipts.deliveredUsers.length})</span>
                  </h4>
                  <div className="space-y-1.5 divide-y divide-slate-100/50 pl-1">
                    {groupReadReceipts.deliveredUsers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-1 italic">Semua sudah membaca</p>
                    ) : (
                      groupReadReceipts.deliveredUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-2.5 py-1.5">
                          <UserAvatar
                            name={user.name}
                            profilePhoto={user.profilePhoto}
                            size="xs"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{user.name}</p>
                            <p className="text-[9px] text-slate-400">{user.divisi || 'Anggota Tim'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Preview PDF
          ======================================================== */}
      {previewPdfUrl && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-xl overflow-hidden flex flex-col animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <FileText className="text-gov-600" size={20} />
                <h3 className="font-bold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-[400px]" title={previewPdfName}>
                  Preview: {previewPdfName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={previewPdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Buka Tab Baru</span>
                </a>
                <button 
                  onClick={() => {
                    setPreviewPdfUrl(null);
                    setPreviewPdfName('');
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-hidden">
              <iframe 
                src={`${previewPdfUrl}#toolbar=0`} 
                className="w-full h-full border-0 rounded-xl bg-white shadow-sm"
                title={previewPdfName}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Preview Gambar (Lightbox)
          ======================================================== */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-4 animate-scaleIn">
            {/* Header controls inside modal */}
            <div className="absolute top-0 right-0 p-4 flex items-center gap-3 z-10 select-none">
              <a 
                href={previewImageUrl} 
                download={previewImageName}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
                title="Download Gambar"
              >
                <Download size={18} />
              </a>
              <button 
                onClick={() => {
                  setPreviewImageUrl(null);
                  setPreviewImageName('');
                }}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image display */}
            <div className="w-full flex justify-center items-center overflow-hidden p-6 mt-10">
              <img 
                src={previewImageUrl} 
                alt={previewImageName} 
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/5"
              />
            </div>
            
            {/* Caption or filename title at bottom */}
            {previewImageName && (
              <p className="text-white/80 text-xs text-center px-4 bg-slate-900/60 py-1.5 rounded-full select-none max-w-sm truncate">
                {previewImageName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Aesthetic Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full sm:w-auto">
        {toasts.map(toast => {
          const bgColor = {
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            error: 'bg-rose-50 border-rose-200 text-rose-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800'
          }[toast.type];

          const Icon = {
            success: Check,
            error: AlertCircle,
            info: Info
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-2.5 px-3 py-2 border rounded-xl shadow-lg text-xs font-semibold animate-slideIn ${bgColor} pointer-events-auto w-full sm:w-auto`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="leading-tight flex-1 whitespace-normal break-words">{toast.message}</span>
              <button 
                type="button"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      {/* Toast notifications area */}
      </div>

      {/* GROUP SETTINGS PANEL */}
      {isGroupSettingsOpen && activeRoom && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setIsGroupSettingsOpen(false)}
          />
          {/* Panel */}
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slideIn overflow-hidden">
            {/* Panel Header */}
            <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 shrink-0">
              <h2 className="font-bold text-slate-800 text-sm">
                {activeRoom.isGroup ? 'Info Grup' : 'Info Obrolan'}
              </h2>
              <button
                onClick={() => setIsGroupSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab bar switcher */}
            <div className="flex border-b border-slate-100 select-none px-5 shrink-0">
              <button
                type="button"
                onClick={() => setSettingsTab('info')}
                className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-all ${
                  settingsTab === 'info' 
                    ? 'border-gov-600 text-gov-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {activeRoom.isGroup ? 'Anggota' : 'Profil'}
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('media')}
                className={`flex-1 py-2.5 text-center text-xs font-semibold border-b-2 transition-all ${
                  settingsTab === 'media' 
                    ? 'border-gov-600 text-gov-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Media & Berkas
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {settingsTab === 'info' ? (
                activeRoom.isGroup ? (
                  <>
                    {/* Group Photo & Name */}
                    <div className="p-5 flex flex-col items-center gap-3 border-b border-slate-100">
                      {/* Group Photo */}
                      <div className="relative group">
                        {activeRoom.groupPhoto ? (
                          <img
                            src={activeRoom.groupPhoto}
                            alt={activeRoom.name || 'Grup'}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gov-100 shadow"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gov-50 flex items-center justify-center border-2 border-gov-100 shadow">
                            <Users size={28} className="text-gov-400" />
                          </div>
                        )}
                        {/* Upload overlay */}
                        {isCurrentUserAdmin && (
                          <button
                            onClick={() => groupPhotoInputRef.current?.click()}
                            disabled={isUploadingGroupPhoto}
                            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          >
                            {isUploadingGroupPhoto
                              ? <Loader2 size={20} className="text-white animate-spin" />
                              : <ImageIcon size={20} className="text-white" />
                            }
                          </button>
                        )}
                        <input
                          ref={groupPhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadGroupPhoto}
                        />
                      </div>

                      {/* Edit Group Name */}
                      {isCurrentUserAdmin ? (
                        <div className="w-full flex gap-2">
                          <input
                            value={editGroupName}
                            onChange={e => setEditGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateGroupName()}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-400 text-center"
                            placeholder="Nama grup..."
                          />
                          <button
                            onClick={handleUpdateGroupName}
                            disabled={!editGroupName.trim() || editGroupName.trim() === groupDisplayName}
                            className="px-3 py-2 bg-gov-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-gov-700 transition-colors"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-800 text-base text-center">{groupDisplayName}</p>
                      )}

                      {activeRoom.projectName && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                          <Briefcase size={12} />
                          <span>{activeRoom.projectName}</span>
                        </div>
                      )}
                    </div>

                    {/* Members List */}
                    <div className="p-5">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Anggota ({groupMembers.length})
                      </h3>
                      <div className="space-y-2">
                        {groupMembers.map(member => {
                          const isAdmin = groupAdmins.includes(member.id);
                          const isCurrentUser = member.id === currentUser.id;
                          const canRemove = isCurrentUserAdmin && !isCurrentUser && member.id !== activeRoom.createdBy;
                          return (
                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                              <UserAvatar
                                name={member.name || 'U'}
                                profilePhoto={member.profilePhoto}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {member.name || 'Unknown'}
                                    {isCurrentUser && <span className="text-slate-400 font-normal"> (Anda)</span>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isAdmin && (
                                    <span className="text-[10px] bg-gov-50 text-gov-700 border border-gov-100 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                                  )}
                                  {member.divisi && (
                                    <span className="text-[10px] text-slate-400 truncate">{member.divisi}</span>
                                  )}
                                </div>
                              </div>

                              {/* Toggle admin status button */}
                              {isCurrentUserAdmin && !isCurrentUser && member.id !== activeRoom.createdBy && (
                                <button
                                  onClick={() => handleToggleAdminStatus(member.id, isAdmin)}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-all shrink-0 ${
                                    isAdmin 
                                      ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                                      : 'bg-gov-50 text-gov-700 hover:bg-gov-100'
                                  }`}
                                >
                                  {isAdmin ? 'Cabut Admin' : 'Jadikan Admin'}
                                </button>
                              )}

                              {canRemove && (
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.name || 'Anggota')}
                                  title="Hapus dari grup"
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Member Section - admin only */}
                    {isCurrentUserAdmin && (() => {
                      const memberIds = new Set(groupMembers.map(m => m.id));
                      const candidates = systemUsers.filter(u =>
                        !memberIds.has(u.id) &&
                        u.id !== currentUser.id &&
                        (addMemberSearch === '' ||
                          (u.name || '').toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                          (u.divisi || '').toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                          (u.nip || '').includes(addMemberSearch)
                        )
                      );
                      return (
                        <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tambah Anggota</h3>
                          <div className="relative mb-3">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              value={addMemberSearch}
                              onChange={e => setAddMemberSearch(e.target.value)}
                              placeholder="Cari nama atau satker..."
                              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-400"
                            />
                          </div>
                          {addMemberSearch !== '' && (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {candidates.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-3">Tidak ada pengguna yang ditemukan</p>
                              ) : (
                                candidates.slice(0, 8).map(user => (
                                  <div key={user.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <UserAvatar name={user.name || 'U'} profilePhoto={user.profilePhoto} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                                      {user.divisi && <p className="text-[10px] text-slate-400 truncate">{user.divisi}</p>}
                                    </div>
                                    <button
                                      onClick={() => handleAddMember(user)}
                                      className="shrink-0 px-2.5 py-1 bg-gov-600 text-white rounded-lg text-[10px] font-semibold hover:bg-gov-700 transition-colors"
                                    >
                                      + Tambah
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (() => {
                  const otherUser = activeRoom.otherUserId ? userMap[activeRoom.otherUserId] : null;
                  return otherUser ? (
                    <div className="p-6 flex flex-col items-center gap-4 text-center">
                      <UserAvatar
                        name={otherUser.name || 'U'}
                        profilePhoto={otherUser.profilePhoto}
                        size="lg"
                      />
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{otherUser.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{otherUser.divisi || 'Satuan Kerja'}</p>
                      </div>
                      <div className="w-full border-t border-slate-100 pt-5 text-left space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                          <span className="text-xs text-slate-700 font-medium">{otherUser.email || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIP</span>
                          <span className="text-xs text-slate-700 font-medium">{otherUser.nip || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Satuan Kerja / Divisi</span>
                          <span className="text-xs text-slate-700 font-medium">{otherUser.divisi || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 text-xs py-8">Profil tidak ditemukan</p>
                  );
                })()
              ) : (
                <div className="p-5 flex flex-col h-full overflow-hidden">
                  {/* Sub-tab Switcher */}
                  <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] sm:text-xs select-none mb-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMediaSubTab('media')}
                      className={`flex-1 py-1.5 text-center font-medium rounded-md transition-all ${
                        mediaSubTab === 'media' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Gambar ({sharedMedia.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSubTab('files')}
                      className={`flex-1 py-1.5 text-center font-medium rounded-md transition-all ${
                        mediaSubTab === 'files' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Berkas ({sharedFiles.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSubTab('links')}
                      className={`flex-1 py-1.5 text-center font-medium rounded-md transition-all ${
                        mediaSubTab === 'links' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tautan ({sharedLinks.length})
                    </button>
                  </div>

                  {/* Content list (Scrollable) */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2 pb-8 scrollbar-thin max-h-[60vh]">
                    {mediaSubTab === 'media' && (
                      sharedMedia.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-8 select-none">Belum ada gambar dibagikan</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {sharedMedia.map(m => {
                            const url = signedUrls[m.id];
                            return (
                              <div 
                                key={m.id}
                                onClick={() => url && setPreviewImageUrl(url)}
                                className="aspect-square bg-slate-50 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in group relative"
                              >
                                {url ? (
                                  <img src={url} alt="Shared" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 size={12} className="animate-spin text-slate-400" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}

                    {mediaSubTab === 'files' && (
                      sharedFiles.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-8 select-none">Belum ada berkas dibagikan</p>
                      ) : (
                        <div className="space-y-1 pt-1.5">
                          {sharedFiles.map(m => {
                            const isPdf = m.attachmentName?.toLowerCase().endsWith('.pdf') || m.attachmentType === 'application/pdf';
                            const url = signedUrls[m.id];
                            return (
                              <div key={m.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-xs gap-3">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <FileText size={18} className="text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-700 truncate" title={m.attachmentName || ''}>
                                      {m.attachmentName}
                                    </p>
                                    <p className="text-[9px] text-slate-400 capitalize">Terkirim oleh {m.senderName}</p>
                                  </div>
                                </div>
                                {url && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isPdf && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewPdfUrl(url);
                                          setPreviewPdfName(m.attachmentName || 'PDF Preview');
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-gov-600 transition-colors"
                                        title="Preview"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    )}
                                    <a
                                      href={url}
                                      download={m.attachmentName}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-gov-600 transition-colors"
                                      title="Unduh"
                                    >
                                      <Download size={14} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}

                    {mediaSubTab === 'links' && (
                      sharedLinks.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-8 select-none">Belum ada tautan dibagikan</p>
                      ) : (
                        <div className="space-y-2 pt-1.5">
                          {sharedLinks.map((link, idx) => (
                            <div key={link.id + idx} className="p-2 hover:bg-slate-50 rounded-lg text-xs space-y-1">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 hover:underline break-all block"
                              >
                                {link.title}
                              </a>
                              <p className="text-[9px] text-slate-400">Terkirim oleh {link.senderName}</p>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer - Leave Group (only for group chats) */}
            {activeRoom.isGroup && (
              <div className="p-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => { setIsGroupSettingsOpen(false); handleDeleteRoom(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <LogOut size={16} />
                  Keluar dari Grup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatPage;
