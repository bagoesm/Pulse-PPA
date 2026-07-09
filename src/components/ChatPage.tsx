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
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { User, ProjectDefinition, Task, Meeting, ChatRoom, ChatMessage } from '../../types';
import UserAvatar from './UserAvatar';

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
  showNotification: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

interface TypingState {
  [userId: string]: {
    name: string;
    timestamp: number;
  };
}

export const ChatPage: React.FC<ChatPageProps> = ({
  currentUser,
  allUsers,
  projects,
  tasks,
  meetings,
  onTaskClick,
  onViewMeeting,
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const lastTypingTimeRef = useRef<number>(0);
  // Ref to always have latest activeRoomId inside async callbacks
  const activeRoomIdRef = useRef<string | null>(null);
  // Keep ref in sync so async callbacks can see the latest value
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);

  // Local state for all system users (unfiltered to allow cross-division chats)
  const [systemUsers, setSystemUsers] = useState<User[]>([]);

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
              lastMessage = m.message;
            } else if (m.type === 'file') {
              lastMessage = `📁 File dilampirkan`;
            } else if (m.type === 'task') {
              lastMessage = `📋 Penugasan dilampirkan`;
            } else if (m.type === 'meeting') {
              lastMessage = `📅 Jadwal dilampirkan`;
            } else if (m.type === 'project') {
              lastMessage = `💼 Proyek dilampirkan`;
            }
          }

          // Fetch unread count for current user
          const { count, error: countErr } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .neq('sender_id', currentUser.id)
            .eq('is_read', false);

          const unreadCount = (!countErr && count) ? count : 0;

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
            groupPhoto: room.group_photo_path ? supabase.storage.from('attachment').getPublicUrl(room.group_photo_path).data.publicUrl : null,
            lastMessage,
            lastMessageTime,
            lastMessageSenderId,
            lastMessageIsRead,
            unreadCount
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
      });

    // 3. Reset unread count locally immediately (optimistic)
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } as any : r));

    try {
      // 4. Fetch messages from DB
      const { data: dbMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedMessages: ChatMessage[] = (dbMessages || []).map((msg) => {
        const sender = userMap[msg.sender_id];
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
  }, [userMap, addToast, scrollToBottom, currentUser.id]);

  // Handle active room change & subscribe to Realtime
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    fetchMessages(activeRoomId);

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
          const sender = userMap[newMsg.sender_id];
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

          // If the message is from someone else and this room is active, mark it as read in the database
          if (newMsg.sender_id !== currentUser.id) {
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
            mappedMsg.isRead = true;
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
          } else if (mappedMsg.type === 'file') {
            displayMsg = `📁 File dilampirkan`;
          } else if (mappedMsg.type === 'task') {
            displayMsg = `📋 Penugasan dilampirkan`;
          } else if (mappedMsg.type === 'meeting') {
            displayMsg = `📅 Jadwal dilampirkan`;
          } else if (mappedMsg.type === 'project') {
            displayMsg = `💼 Proyek dilampirkan`;
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
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, isRead: updatedMsg.is_read } : m));
          
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
  }, [activeRoomId, currentUser.id, currentUser.name, userMap, scrollToBottom, fetchMessages]);

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
    setMessageInput(e.target.value);
    
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
  };

  // Send Message (Text)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeRoomId || isSending) return;

    setIsSending(true);
    const content = messageInput;
    setMessageInput('');

    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        sender_id: currentUser.id,
        message: content,
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

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeRoomId || isUploading) return;

    const file = files[0];
    
    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('Maksimal ukuran file adalah 10MB', 'error');
      return;
    }

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

      // Insert message reference
      const { error: msgError } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        sender_id: currentUser.id,
        message: file.name,
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
    } catch (error: any) {
      console.error('Error uploading file:', error);
      addToast('Gagal mengunggah berkas: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Share Task or Meeting as message
  const handleShareItem = async (itemId: string) => {
    if (!activeRoomId) return;

    setIsShareModalOpen(false);
    
    try {
      const payload: any = {
        room_id: activeRoomId,
        sender_id: currentUser.id,
        type: shareType
      };

      if (shareType === 'task') {
        const task = tasks.find(t => t.id === itemId);
        payload.message = JSON.stringify({
          title: task?.title || '',
          category: task?.category || '',
          priority: task?.priority || 'Medium',
        });
        payload.linked_task_id = itemId;
      } else if (shareType === 'meeting') {
        const meeting = meetings.find(m => m.id === itemId);
        payload.message = JSON.stringify({
          title: meeting?.title || '',
          date: meeting?.date || '',
          location: meeting?.location || '',
        });
        payload.linked_meeting_id = itemId;
      } else {
        // shareType === 'project'
        const project = projects.find(p => p.id === itemId);
        payload.message = JSON.stringify({
          name: project?.name || '',
          description: project?.description || '',
        });
        payload.linked_project_id = itemId;
      }

      const { error } = await supabase.from('chat_messages').insert(payload);
      if (error) throw error;

      await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', activeRoomId);
    } catch (error: any) {
      console.error('Error sharing item:', error);
      addToast('Gagal membagikan: ' + error.message, 'error');
    }
  };

  // Delete Individual Message
  const handleDeleteMessage = (messageId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Hapus Pesan',
      message: 'Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId);
          if (error) throw error;
          setMessages(prev => prev.filter(m => m.id !== messageId));
          addToast('Pesan berhasil dihapus', 'success');
        } catch (error: any) {
          console.error('Error deleting message:', error);
          addToast('Gagal menghapus pesan: ' + error.message, 'error');
        }
      }
    });
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

  // Fetch group members for the active room
  const fetchGroupMembers = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId);
      if (error) throw error;
      const memberIds = (data || []).map((d: any) => d.user_id);
      const members = memberIds.map((id: string) => systemUsers.find(u => u.id === id)).filter(Boolean) as User[];
      setGroupMembers(members);
    } catch (err: any) {
      console.error('Error fetching group members:', err);
    }
  };

  // Open group settings panel
  const openGroupSettings = () => {
    if (!activeRoom?.isGroup) return;
    setEditGroupName(activeRoom.name || '');
    fetchGroupMembers(activeRoom.id);
    setIsGroupSettingsOpen(true);
  };

  // Update group name
  const handleUpdateGroupName = async () => {
    if (!activeRoomId || !editGroupName.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ name: editGroupName.trim(), updated_at: new Date().toISOString() })
        .eq('id', activeRoomId);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, name: editGroupName.trim() } : r));
      addToast('Nama grup berhasil diubah', 'success');
    } catch (err: any) {
      addToast('Gagal mengubah nama grup: ' + err.message, 'error');
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

  // Create Group Chat
  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length < 2) {
      addToast('Isi nama grup dan pilih minimal 1 anggota lainnya', 'info');
      return;
    }

    setIsGroupModalOpen(false);

    try {
      // 1. Create group room
      const { data: newRoom, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({
          name: groupName,
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

  // Filtered Rooms list based on search query
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Group messages by Date
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: ChatMessage[] } = {};
    messages.forEach((msg) => {
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
  }, [messages]);

  return (
    <div className="flex-1 flex bg-slate-50 h-[calc(100vh-64px)] overflow-hidden" style={{ minHeight: '500px' }}>
      
      {/* LEFT COLUMN: Sidebar Chat */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full select-none shrink-0">
        
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
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => setIsGroupModalOpen(true)}
                title="Buat Group Chat"
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
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
                    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unreadCount: 0 } as any : r));
                    setActiveRoomId(room.id);
                  }}
                  className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors relative ${
                    isActive ? 'bg-slate-100/70 border-l-4 border-gov-600 pl-2' : ''
                  }`}
                >
                  {/* Avatar / Icon */}
                  <div className="shrink-0">
                    {room.isGroup ? (
                      <div className="w-10 h-10 rounded-full bg-gov-50 text-gov-700 flex items-center justify-center font-bold text-sm border border-gov-100">
                        <Users size={18} className="text-gov-600" />
                      </div>
                    ) : (
                      <UserAvatar
                        name={room.name || 'P'}
                        profilePhoto={room.otherUserId ? userMap[room.otherUserId]?.profilePhoto : undefined}
                        size="md"
                      />
                    )}
                  </div>

                  {/* Room Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800 truncate block">
                        {room.name}
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
                      {room.unreadCount && room.unreadCount > 0 ? (
                        <span className="shrink-0 min-w-4 h-4 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center font-bold px-1 select-none leading-none">
                          {room.unreadCount}
                        </span>
                      ) : room.projectName ? (
                        <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-100 rounded px-1 flex items-center gap-0.5 max-w-[85px] truncate shrink-0 font-medium leading-none py-0.5">
                          <Briefcase size={8} className="shrink-0" />
                          {room.projectName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {activeRoomId && activeRoom ? (
          <>
            {/* Active Room Header */}
            <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between select-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  {activeRoom.isGroup ? (
                    activeRoom.groupPhoto ? (
                      <img src={activeRoom.groupPhoto} alt={activeRoom.name || 'Grup'} className="w-9 h-9 rounded-full object-cover border border-gov-100" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gov-50 text-gov-700 flex items-center justify-center font-bold text-xs border border-gov-100">
                        <Users size={16} className="text-gov-600" />
                      </div>
                    )
                  ) : (
                    <UserAvatar
                      name={activeRoom.name || 'P'}
                      profilePhoto={activeRoom.otherUserId ? userMap[activeRoom.otherUserId]?.profilePhoto : undefined}
                      size="sm"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{activeRoom.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {activeRoom.isGroup ? (
                      <span className="text-[10px] text-slate-500 font-medium">Group Chat</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          onlineUsers.includes(activeRoomId) ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-[10px] text-slate-400">
                          {onlineUsers.includes(activeRoomId) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions (Badges + Delete Obrolan) */}
              <div className="flex items-center gap-3">
                {activeRoom.projectName && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 rounded-full text-xs font-semibold max-w-[200px] truncate">
                    <Briefcase size={14} className="text-slate-500" />
                    <span className="truncate">{activeRoom.projectName}</span>
                  </div>
                )}

                {/* Group Settings Button - only for groups */}
                {activeRoom.isGroup && (
                  <button
                    onClick={openGroupSettings}
                    title="Pengaturan Grup"
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                  >
                    <Info size={18} />
                  </button>
                )}
                
                <button
                  onClick={handleDeleteRoom}
                  title={activeRoom.isGroup ? "Keluar Grup" : "Hapus Obrolan"}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                >
                  {activeRoom.isGroup ? <LogOut size={18} /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>

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
                    {groupedMessages[dateStr].map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={msg.id}
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
                              
                              <div className={`p-3 rounded-2xl shadow-sm text-sm ${
                                isMe 
                                  ? 'bg-gov-600 text-white rounded-tr-none' 
                                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                              }`}>
                              
                              {/* RENDER MESSAGE CONTENT BASED ON TYPE */}
                              {msg.type === 'text' && (
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              )}

                              {msg.type === 'file' && msg.attachmentPath && (
                                <div className="space-y-2">
                                  {msg.attachmentType?.startsWith('image/') ? (
                                    <div className="rounded-lg overflow-hidden border border-slate-100 max-w-sm max-h-60 bg-slate-50">
                                      {signedUrls[msg.id] ? (
                                        <a href={signedUrls[msg.id]} target="_blank" rel="noopener noreferrer">
                                          <img 
                                            src={signedUrls[msg.id]} 
                                            alt={msg.attachmentName || 'Image'} 
                                            className="w-full h-full object-contain hover:opacity-90 transition-opacity"
                                          />
                                        </a>
                                      ) : (
                                        <div className="p-8 flex justify-center">
                                          <Loader2 className="animate-spin text-slate-400" />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 p-2 bg-slate-100/10 border border-white/20 rounded-lg text-xs max-w-sm">
                                      <FileText size={28} className={isMe ? 'text-white' : 'text-slate-500'} />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold truncate">{msg.attachmentName}</p>
                                        <p className="text-[10px] opacity-75">Dokumen berkas</p>
                                      </div>
                                      {signedUrls[msg.id] && (
                                        <a 
                                          href={signedUrls[msg.id]} 
                                          download={msg.attachmentName}
                                          className={`p-1.5 rounded-full transition-colors ${
                                            isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-600'
                                          }`}
                                        >
                                          <Download size={16} />
                                        </a>
                                      )}
                                    </div>
                                  )}
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
                                      <div className="flex items-center gap-1.5 text-xs text-gov-600 font-bold select-none">
                                        <FileText size={14} />
                                        Penugasan Shared
                                      </div>
                                      {localTask && (
                                        <button 
                                          onClick={() => onTaskClick(localTask)}
                                          className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-gov-600 transition-colors"
                                          title="Buka Task"
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
                                        Jadwal Kegiatan Shared
                                      </div>
                                      {localMeeting && (
                                        <button 
                                          onClick={() => onViewMeeting(localMeeting)}
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
                                        Proyek Shared
                                      </div>
                                    </div>
                                    <h4 className="font-bold text-sm line-clamp-2 leading-snug mb-1">{name}</h4>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
                                  </div>
                                );
                              })()}

                              {/* Timestamp & Read Status */}
                              <div className="flex items-center justify-end gap-1 mt-1 select-none">
                                <span className={`text-[9px] leading-none ${
                                  isMe ? 'text-white/70' : 'text-slate-400'
                                }`}>
                                  {timeStr}
                                </span>
                                {isMe && (
                                  <span className={`text-[10px] font-bold leading-none ${
                                    msg.isRead ? 'text-sky-300' : 'text-white/60'
                                  }`} title={msg.isRead ? 'Dibaca' : 'Terkirim'}>
                                    ✓
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Hover Delete Button for Sender */}
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Hapus pesan"
                              className="opacity-0 group-hover/msg:opacity-100 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all shrink-0 select-none self-end mb-4"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
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

            {/* Input Bar Panel */}
            <div className="p-4 border-t border-slate-200 bg-white select-none">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* File attachment triggers */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Lampirkan File"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0 disabled:opacity-50"
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
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0"
                >
                  <Plus size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500/20 focus:border-gov-500"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="p-2.5 bg-gov-600 hover:bg-gov-700 rounded-full text-white transition-colors shrink-0 disabled:opacity-50 disabled:hover:bg-gov-600"
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
                  className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'task' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Penugasan (Task)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareType('meeting');
                    setShareSearch('');
                  }}
                  className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'meeting' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Kegiatan / Jadwal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareType('project');
                    setShareSearch('');
                  }}
                  className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${
                    shareType === 'project' 
                      ? 'border-gov-600 text-gov-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Proyek (Project)
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
                        onClick={() => handleShareItem(item.id)}
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
      {isGroupSettingsOpen && activeRoom?.isGroup && (
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
              <h2 className="font-bold text-slate-800 text-sm">Info Grup</h2>
              <button
                onClick={() => setIsGroupSettingsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
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
                  {activeRoom.createdBy === currentUser.id && (
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
                {activeRoom.createdBy === currentUser.id ? (
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
                      disabled={!editGroupName.trim() || editGroupName.trim() === activeRoom.name}
                      className="px-3 py-2 bg-gov-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-gov-700 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <p className="font-bold text-slate-800 text-base text-center">{activeRoom.name}</p>
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
                    const isAdmin = member.id === activeRoom.createdBy;
                    const isCurrentUser = member.id === currentUser.id;
                    const canRemove = activeRoom.createdBy === currentUser.id && !isCurrentUser;
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
              {activeRoom.createdBy === currentUser.id && (() => {
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

            </div>

            {/* Panel Footer - Leave Group */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => { setIsGroupSettingsOpen(false); handleDeleteRoom(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-red-100 transition-colors"
              >
                <LogOut size={16} />
                Keluar dari Grup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatPage;
